import * as Options from "./options";
import { Authenticator } from "./auth";
import GeoUtils from "./geoutils";

const auth = new Authenticator();

class PanoInfo {
	date: String;
	panoId: String;
	regionId: String;
	heading: number;
	lat: number;
	lon: number;

	constructor(date: String, panoId: String, regionId: String, heading: number, lat: number, lon: number) {
		this.date = date;
		this.panoId = panoId;
		this.regionId = regionId;
		this.heading = heading;
		this.lat = lat;
		this.lon = lon;
	}

}





async function getCoverageInMapTile(x:number, y:number): Promise<Array<PanoInfo>> {
	try {
		let response = await fetch(Options.BASE_URL+"tiles/coverage/" + x + "/" + y + "/");
		let data = await response.text();
		let panos = JSON.parse(data);
		let coverage = panos.map(pano => new PanoInfo(pano.date, pano.panoid, pano.region_id, pano.heading, pano.lat, pano.lon));
		return coverage;
	} catch (error) {
		console.log(error);
	}
}

/*
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


*/

async function getClosestPanoAtCoords(lat:number, lon:number): Promise<PanoInfo> {
	try {
		let tile = GeoUtils.wgs84_to_tile_coord(lat, lon, 17);
		let coverage = await getCoverageInMapTile(tile[0], tile[1]);
		if (coverage.length == 0) {
			return null;
		}
		let smallestDistance = 9999999;
		let closest = null;
		for (let pano of coverage) {
			let distance = GeoUtils.haversineDistance([lat, lon], [pano.lat, pano.lon]);
			if (distance < smallestDistance) {
				smallestDistance = distance;
				closest = pano;
			}
		}
	
	
		let old = await getClosestPanoAtCoords_old(lat, lon);
		if (old.panoId != closest.panoId) {
			console.log("old: " + old.panoId + " new: " + closest.panoId);
		} else {
			console.log("old: " + old.panoId + " new: " + closest.panoId + " same");
		}
	
		return closest;
	} catch (error) {
		console.log(error);
		return null;
	}
}


async function getClosestPanoAtCoords_old(lat:number, lon:number): Promise<PanoInfo> {
	let response = await fetch(Options.BASE_URL+"closest/" + lat + "/" + lon + "/");
	let data = await response.text();
	let closest = JSON.parse(data);
	return new PanoInfo(closest.date, closest.panoid, closest.region_id, closest.heading, closest.lat, closest.lon);
}



async function getUrlForTile(panoFullId: String, x: number, resolution: number) {
    try {
        //if (!auth.hasSession()) {
            await auth.init();
        //}
        let segments = panoFullId.split("/");
        let panoId = segments[0];
        let regionId = segments[1];
        let panoid_padded = panoId.padStart(20, "0");
        let region_id_padded = regionId.padStart(10, "0");
        let panoid_split = panoid_padded.slice(0, 4) + "/" + panoid_padded.slice(4, 8) + "/" + panoid_padded.slice(8, 12) + "/" + panoid_padded.slice(12, 16) + "/" + panoid_padded.slice(16, 20);

        return auth.authenticateUrl(Options.APPLE_MAPS_TILE_ENDPOINT + panoid_split + "/" + region_id_padded + "/t/" + x + "/" + resolution);
    } catch (error) {
        console.log(error);
    }
}

// param panoFullId is "panoId/regionId"
async function loadTileForPano(panoFullId, x) {
	try {

		// Step 1: Get the URL of the tile to load
		// New endpoint /panourl in the python server returns just the Apple URL for the pano

        var appleMapsPanoURL = await getUrlForTile(panoFullId, x, Options.RESOLUTION_SETTING);
        appleMapsPanoURL = Options.CORS_PROXY+appleMapsPanoURL;
		// Step 2: Load the tile

		console.log("Requesting tile " + [appleMapsPanoURL])

        var blobres = await fetch(appleMapsPanoURL);
        var blob = await blobres.blob();

		// Step 3: Convert from HEIC to JPEG with heic2any
		console.log("Fetched tile, converting and resizing... " + [appleMapsPanoURL])
        var jpegblob = heic2any({"blob": blob, "type": "image/jpeg"});


		// Step 4: Process image
		 
		// Cut off the overlap from the right of the tile using canvas
		// and add black bars on top and bottom because we don't have sky/ground tiles
		
		let rp = Options.RESOLUTION_PROFILES[Options.RESOLUTION_SETTING];

		// Putting the jpeg blob into a canvas to remove 256 px from the right (removes overlap)
		var w = rp.big.width;
		if(x == 1 || x == 3){
			w = rp.small.width;
		}
		w = w - rp.overlap;
		var canvas = document.createElement('canvas');
		canvas.height = Math.round(Options.EXTENSION_FACTOR * rp.big.height);
		canvas.width = w;

		var ctx = canvas.getContext('2d');
		var img = new Image();

		var result = ""
		img.onload = function(){
		  ctx.drawImage(img, 0, (canvas.height-rp.big.height)/2);

		  // This is a big data:image/jpeg;base64, URL
		  result = canvas.toDataURL("image/jpeg");
		}

		img.src = URL.createObjectURL(await jpegblob);

		// Wait for context to finish loading
		// TODO: Is there a better way?
		const delay = ms => new Promise(res => setTimeout(res, ms));
		await delay(100);


		return result;

	} catch (error) {
		console.log(error);
	}
}


export {
    loadTileForPano,
    getClosestPanoAtCoords
}