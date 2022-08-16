from flask import Flask, jsonify, render_template, send_file, request, make_response
import io
import math
import mimetypes
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
    auth = Authenticator()

    janitor_thread = threading.Thread(target=thread_function)
    janitor_thread.start()

    @app.route("/")
    def index():
        return jsonify({"message": "Hello World!"})

    # Coverage tiles are passed through this server because of CORS
    @app.route("/tiles/coverage/<int:x>/<int:y>/")
    def relay_coverage_tile(x, y):
        panos = get_coverage_tile(x, y)
        return jsonify(panos)

    @app.route("/rawtile/<int:x>/<int:y>/")
    def rawtile(x, y):
        panos = _get_coverage_tile_raw_json(x, y)

        return panos


    @app.route("/tokenp2/")
    def get_token_p2():
        return jsonify(auth.token_p2)




    ##### DEPRECATED ZONE 
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
                #print(x,y)
        return jsonify(date=closest.date,lat = closest.lat, lon = closest.lon, panoid = str(closest.panoid), region_id = str(closest.region_id), unknown10 = closest.unknown10, unknown11 = closest.unknown11, heading = closest.heading)

    @app.route("/panourl/<int:panoid>/<int:region_id>/<int:segment>/<int:zoom>/")
    def relay_pano_segment_url(panoid, region_id, segment, zoom):
        url = get_pano_segment_url(panoid, region_id, segment, zoom, auth)
        return jsonify(url=url)

    @app.route("/gc")
    def gc_collect():
        gc.collect()
        resp = jsonify(success=True)
        resp.status_code = 200
        return resp

    return app
