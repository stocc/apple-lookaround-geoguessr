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

