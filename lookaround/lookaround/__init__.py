from datetime import datetime
import requests

from .proto import MapTile_pb2
from .geo import wgs84_to_tile_coord
from .panorama import LookaroundPanorama

from google.protobuf.json_format import MessageToJson


def get_coverage_tile_by_latlon(lat, lon, tile_z = 17):
    x, y = wgs84_to_tile_coord(lat, lon, tile_z)
    return get_coverage_tile(x, y)


def get_coverage_tile(tile_x, tile_y, tile_z = 17):
    tile = _get_coverage_tile_raw(tile_x, tile_y, tile_z)
    panos = []
    for pano in tile.pano:
        lat, lon = geo.protobuf_tile_offset_to_wgs84(
            pano.unknown4.longitude_offset,
            pano.unknown4.latitude_offset,
            tile_x,
            tile_y,
            tile_z
            )
        pano_obj = LookaroundPanorama(
            pano.panoid,
            tile.unknown13[pano.region_id_idx].region_id,
            lat, lon)
        pano_obj.date = datetime.fromtimestamp(int(pano.timestamp) / 1000.0)
        panos.append(pano_obj)
    return panos


def _get_coverage_tile_raw(tile_x, tile_y, tile_z = 17):
    headers = {
        "maps-tile-style": "style=57&size=2&scale=0&v=0&preflight=2",
        "maps-tile-x": str(tile_x),
        "maps-tile-y": str(tile_y),
        "maps-tile-z": str(tile_z),
        "maps-auth-token": "w31CPGRO/n7BsFPh8X7kZnFG0LDj9pAuR8nTtH3xhH8=",
    }
    response = requests.get("https://gspe76-ssl.ls.apple.com/api/tile?", headers=headers)
    tile = MapTile_pb2.MapTile()
    tile.ParseFromString(response.content)
    json_obj = MessageToJson(tile)
    with open("tile.json", "w") as f:
        f.write(json_obj)
    return tile

def get_pano_segment_url(panoid, region_id, segment, zoom, auth):
    endpoint = "https://gspe72-ssl.ls.apple.com/mnn_us/"
    panoid = str(panoid)
    region_id = str(region_id)
    if len(panoid) > 20:
        raise ValueError("panoid must not be longer than 20 digits.")
    if len(region_id) > 10:
        raise ValueError("region_id must not be longer than 10 digits.")
    if segment > 5:
        raise ValueError("Segments range from 0 to 5 inclusive.")

    zoom = min(7, zoom)

    panoid_padded = panoid.zfill(20)
    panoid_split = [panoid_padded[i:i + 4] for i in range(0, len(panoid_padded), 4)]
    panoid_url = "/".join(panoid_split)

    region_id_padded = region_id.zfill(10)

    url = endpoint + f"{panoid_url}/{region_id_padded}/t/{segment}/{zoom}"
    url = auth.authenticate_url(url)
    print(url)
    return url


def fetch_pano_segment(panoid, region_id, segment, zoom, auth):
    url = get_pano_segment_url(panoid, region_id, segment, zoom, auth)
    response = requests.get(url)
    if response.ok:
        return response.content
    else:
        raise Exception(str(response))
