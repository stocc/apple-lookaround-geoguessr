from flask import Flask, jsonify, render_template, send_file, request, make_response
import io
import math
import mimetypes
from PIL import Image
import pillow_heif
import requests
import sys
import gc
import time, threading

from flask_cors import CORS

from lookaround.lookaround.auth import Authenticator
from lookaround.lookaround.geo import wgs84_to_tile_coord
from lookaround.lookaround import _get_coverage_tile_raw_json, get_coverage_tile, fetch_pano_segment, get_pano_segment_url

from util import CustomJSONEncoder
from geo import haversine_distance

def _build_cors_preflight_response():
    response = make_response()
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response

def _corsify_actual_response(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    return response

def thread_function():
    while True:
        gc.collect()
        time.sleep(1)

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False
    app.json_encoder = CustomJSONEncoder
    
    mimetypes.add_type('text/javascript', '.js')
    pillow_heif.register_heif_opener()
    auth = Authenticator()

    janitor_thread = threading.Thread(target=thread_function)
    janitor_thread.start()

    @app.route("/")
    def index():
        return render_template('index.html')

    # Coverage tiles are passed through this server because of CORS
    @app.route("/tiles/coverage/<int:x>/<int:y>/")
    def relay_coverage_tile(x, y):
        panos = get_coverage_tile(x, y)
        return jsonify(panos)

    # TODO: Port the auth code to JS so the client can request tiles directly
    @app.route("/tiles/road/<tint>/<int:z>/<int:x>/<int:y>/")
    def relay_road_tile(tint, z, x, y):
        if tint == "l":
            tint_param = "light"
        elif tint == "d":
            tint_param = "dark"
        else:
            tint_param = "light"
        url = auth.authenticate_url(
            f"https://cdn3.apple-mapkit.com/ti/tile?style=0&size=1&x={x}&y={y}&z={z}&scale=1&lang=en"
            f"&poi=1&tint={tint_param}&emphasis=standard")
        print(url)
        response = requests.get(url)
        return send_file(
            io.BytesIO(response.content),
            mimetype='image/png'
        )
    
    @app.route("/closest/<float(signed=True):lat>/<float(signed=True):lon>/")
    def closest_pano_to_coord(lat, lon):
        x, y = wgs84_to_tile_coord(lat, lon, 17)
        panos = get_coverage_tile(x, y)
        if len(panos) == 0:
            return jsonify(None)

        smallest_distance = 9999999
        closest = None
        for pano in panos:
            distance = haversine_distance(lat, lon, pano.lat, pano.lon)
            if distance < smallest_distance:
                smallest_distance = distance
                closest = pano
                print(x,y)
        return jsonify(date="asdf",lat = closest.lat, lon = closest.lon, panoid = str(closest.panoid), region_id = str(closest.region_id), unknown10 = closest.unknown10, unknown11 = closest.unknown11)



    @app.route("/tile/<float(signed=True):lat>/<float(signed=True):lon>/")
    def tile_of_coord(lat, lon):
        x, y = wgs84_to_tile_coord(lat, lon, 17)
        
        return jsonify(x=x,y=y)

    @app.route("/rawtile/<int:x>/<int:y>/")
    def rawtile(x, y):
        panos = _get_coverage_tile_raw_json(x, y)
        
        return panos

    @app.route("/fullTileInfo/<int:x>/<int:y>/")
    def full_tile_coverage_incl_neighbors(x, y):
        panos = get_coverage_tile(x, y)
        #print(panos)
        if len(panos) == 0:
            return jsonify(None)

        return jsonify(panos)


    @app.route("/pano/<int:panoid>/<int:region_id>/<int:zoom>/")
    def relay_full_pano(panoid, region_id, zoom):
        heic_array = []
        for i in range(4):
            heic_bytes = fetch_pano_segment(panoid, region_id, i, zoom, auth)
            with Image.open(io.BytesIO(heic_bytes)) as image:
                heic_array.append(image)
                heic_bytes = None
                image = None

        TILE_SIZE = round(heic_array[0].width * (256 / 5632))
        print("TILE_SIZE:", TILE_SIZE)
        WIDTH_SIZE = round(heic_array[0].width * (1024 / 5632))
        widths, heights = zip(*(i.size for i in heic_array))
        total_width, max_height = (sum(widths)-WIDTH_SIZE), max(heights)
        heic_pano = Image.new('RGB', (total_width, 8192))
        heic_pano.paste(heic_array[0], (0,round((8192-max_height)/2)))
        heic_pano.paste(heic_array[1], (heic_array[0].width-TILE_SIZE, round((8192-max_height)/2)))
        heic_pano.paste(heic_array[2], ((heic_array[0].width+heic_array[1].width)-(TILE_SIZE*2), round((8192-max_height)/2)))
        heic_pano.paste(heic_array[3], ((heic_array[0].width+heic_array[1].width+heic_array[2].width)-(TILE_SIZE*3), round((8192-max_height)/2)))
        heic_array = None
        
        with io.BytesIO() as output:
            heic_pano.save(output, format="jpeg")
            heic_pano = None
            jpeg_bytes = output.getvalue()
            output = None
        return send_file(
            io.BytesIO(jpeg_bytes),
            mimetype='image/jpeg'
        )


    @app.route("/panodbg/<int:panoid>/<int:region_id>/<int:zoom>/")
    def relay_pano_dbg(panoid, region_id, zoom):
        print("Starting")
        heic_array = []
        for i in range(4):
            heic_bytes = fetch_pano_segment(panoid, region_id, i, zoom, auth)
            with Image.open(io.BytesIO(heic_bytes)) as image:
                heic_array.append(image)
                heic_bytes = None
                image = None

        TILE_SIZE = round(heic_array[0].width * (256 / 5632))
        WIDTH_SIZE = round(heic_array[0].width * (1024 / 5632))
        widths, heights = zip(*(i.size for i in heic_array))
        total_width, max_height = (sum(widths)-WIDTH_SIZE), max(heights)
        heic_pano = Image.new('RGB', (total_width, 8192))
        heic_pano.paste(heic_array[0], (0,round((8192-max_height)/2)))
        heic_pano.paste(heic_array[1], (heic_array[0].width-TILE_SIZE, round((8192-max_height)/2)))
        heic_pano.paste(heic_array[2], ((heic_array[0].width+heic_array[1].width)-(TILE_SIZE*2), round((8192-max_height)/2)))
        heic_pano.paste(heic_array[3], ((heic_array[0].width+heic_array[1].width+heic_array[2].width)-(TILE_SIZE*3), round((8192-max_height)/2)))
        heic_array = None
        
        with io.BytesIO() as output:
            heic_pano.save(output, format="jpeg")
            heic_pano = None
            jpeg_bytes = output.getvalue()
            output = None
        return send_file(
            io.BytesIO(jpeg_bytes),
            mimetype='image/jpeg'
        )
    @app.route("/pano/<int:panoid>/<int:region_id>/<int:segment>/<int:zoom>/")
    def relay_pano_segment(panoid, region_id, segment, zoom):
        heic_bytes = fetch_pano_segment(panoid, region_id, segment, zoom, auth)
        with Image.open(io.BytesIO(heic_bytes)) as image:
            heic_bytes = None
            with io.BytesIO() as output:
                image.save(output, format='jpeg')
                image = None
                jpeg_bytes = output.getvalue()
                output = None
        return send_file(
            io.BytesIO(jpeg_bytes),
            mimetype='image/jpeg'
        )

    @app.route("/panourl/<int:panoid>/<int:region_id>/<int:segment>/<int:zoom>/")
    def relay_pano_segment_url(panoid, region_id, segment, zoom):
        url = get_pano_segment_url(panoid, region_id, segment, zoom, auth)
        return jsonify(url=url)



    @app.route("/panodbg/<int:panoid>/<int:region_id>/<int:segment>/<int:zoom>/")
    def relay_pano_segment_dbg(panoid, region_id, segment, zoom):
        #print("Starting")
        heic_bytes = fetch_pano_segment(panoid, region_id, segment, zoom, auth)
        with Image.open(io.BytesIO(heic_bytes)) as image:
            newimage = image.copy().convert("RGBA")
            o = image.copy().convert("RGBA")
            pixels = o.load()
            for i in range(image.size[0]):    # for every col:
                for j in range(image.size[1]):    # For every row

                    
                    pixels[i,j] = (255, 64*segment, 0,65) # set the colour accordingly
            heic_bytes = None
            with io.BytesIO() as output:
                r = Image.alpha_composite(newimage, o)
                r.save(output, format='png')
                image = None
                jpeg_bytes = output.getvalue()
                output = None
        return send_file(
            io.BytesIO(jpeg_bytes),
            mimetype='image/png'
        )
    
    @app.route("/gc")
    def gc_collect():
        gc.collect()
        resp = jsonify(success=True)
        resp.status_code = 200
        return resp

    return app
