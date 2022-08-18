const TILE_SIZE = 256;

export default class GeoUtils {

	static haversineDistance(coords1, coords2) {
		function toRad(x) {
		  return x * Math.PI / 180;
		}
	
		var lon1 = coords1[0];
		var lat1 = coords1[1];
	
		var lon2 = coords2[0];
		var lat2 = coords2[1];
	
		var R = 6371; // km
	
		var x1 = lat2 - lat1;
		var dLat = toRad(x1);
		var x2 = lon2 - lon1;
		var dLon = toRad(x2)
		var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
		  Math.sin(dLon / 2) * Math.sin(dLon / 2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		var d = R * c;
	
	
		return d;
	}

	static radians_to_degrees(radians) {
	var pi = Math.PI;
	return radians * (180/pi);
	}
          


	static headingFromUnknowns(unknown10, unknown11) {
	    let westmin = 1
		let westmax = 2159
		let eastmin = 16383 // looking (north/south) and very slightly east
		let eastmax = 14318 // looking slightly (north/south) directly east

		let northmin = 8204 // this is likely lower
		let northmax = 6054
		let southmin = 8204 // this is likely lower
		let southmax = 10173


		var ew=0
		if (unknown10 < westmax){
			ew = -((unknown10 - westmin) / (westmax - westmin))
		} else if (unknown10 > eastmax){
			ew = ((unknown10 - eastmin) / (eastmax - eastmin))
		}

		var ns=0
		if (unknown11 <= northmin){
			ns = ((unknown11 - northmin) / (northmax - northmin))
		} else {
			ns = -((unknown11 - southmin) / (southmax - southmin))
		}

		var r =  GeoUtils.radians_to_degrees(Math.atan2(ew,ns))
		if (r < 0){
			r += 360
		}

		return r
	}
	

	static mercator_to_wgs84(x, y) {
	    let lat = (2 * Math.atan(Math.exp((y - 128) / -(256 / (2 * Math.PI)))) - Math.PI / 2) / (Math.PI / 180)
		let lon = (x - 128) / (256 / 360)
		return [lat, lon];

	}

	static tile_coord_to_wgs84(x, y, z) {
	    let scale = 1 << z
		let pixel_coord = [x * TILE_SIZE, y * TILE_SIZE];
		let world_coord = [pixel_coord[0] / scale, pixel_coord[1] / scale];
		let lat_lon = GeoUtils.mercator_to_wgs84(world_coord[0], world_coord[1])
		return [lat_lon[0], lat_lon[1]];
	}

	static protobuf_tile_offset_to_wsg84(x_offset, y_offset, tile_x, tile_y) {
		let pano_x = tile_x + (x_offset / 64.0) / (TILE_SIZE - 1)
		let pano_y = tile_y + (255 - (y_offset / 64.0)) / (TILE_SIZE - 1)
		let coords = GeoUtils.tile_coord_to_wgs84(pano_x, pano_y, 17)
		return coords
	}
	
	static wgs84_to_mercator(lat, lon) {
		var siny = Math.sin(lat * Math.PI / 180);
		siny = Math.min(Math.max(siny, -0.9999), 0.9999);
	
		return [
			TILE_SIZE * (0.5 + lon / 360),
			TILE_SIZE * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
		]
		
	}
	
	
	static wgs84_to_tile_coord(lat, lon, zoom) {
		var scale = 1 << zoom;
	
		var world_coord = this.wgs84_to_mercator(lat, lon);
		var tile_coord = [
			Math.floor((world_coord[0] * scale) / TILE_SIZE),
			Math.floor((world_coord[1] * scale) / TILE_SIZE)
		];
		return tile_coord;
	}
	

	static heading(coords1, coords2) {
		try {
			let c1 = new google.maps.LatLng(coords1[0], coords1[1]);
			let c2 = new google.maps.LatLng(coords2[0], coords2[1]);

			let result = google.maps.geometry.spherical.computeHeading(c1,c2);

			if (result < 0) {
				result += 360;
			}
			return result;
		} catch (e) {
			console.log(e);
		}
	}
}

