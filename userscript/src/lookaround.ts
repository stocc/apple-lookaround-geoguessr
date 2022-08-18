import * as Options from "./options";
import { Authenticator } from "./auth";
import GeoUtils from "./geoutils";
import Proto from "./proto";

const auth = new Authenticator();

export class PanoInfo {
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

	panoFullId(): String {
		return this.panoId + "/" + this.regionId;
	}

}



async function getCoverageTileRaw(tile_x:number, tile_y:number) {
	let headers = new Headers({
        "maps-tile-style": "style=57&size=2&scale=0&v=0&preflight=2",
        "maps-tile-x": tile_x.toString(),
        "maps-tile-y": tile_y.toString(),
        "maps-tile-z": "17",
        "maps-auth-token": "w31CPGRO/n7BsFPh8X7kZnFG0LDj9pAuR8nTtH3xhH8=",
    });
    let response = await (await fetch(Options.CORS_PROXY+"https://gspe76-ssl.ls.apple.com/api/tile?", {headers: headers})).arrayBuffer();
    let tile = await Proto.parseMapTile(response);
    return tile
}


async function getCoverageInMapTile(x:number, y:number): Promise<Array<PanoInfo>> {
	try {
		let response = await getCoverageTileRaw(x, y);

		var coverage = [];
		for (let pano of response.pano) {
			let coords = GeoUtils.protobuf_tile_offset_to_wsg84(pano.unknown4.longitudeOffset, pano.unknown4.latitudeOffset, x,y);

			let p =  new PanoInfo(pano.timestamp.toString(), pano.panoid.toString(), response.unknown13[pano.regionIdIdx].regionId.toString(), 
			GeoUtils.headingFromUnknowns(pano.unknown4.unknown10, pano.unknown4.unknown11), coords[0], coords[1]);

			coverage.push(p);
		}

		return coverage;
	} catch (error) {
		console.log(error);
	}
}


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
	
		return closest;
	} catch (error) {
		console.log(error);
		return null;
	}
}


async function getNeighbors(panoInfo: PanoInfo): Promise<Array<PanoInfo>> {
	try {
		let tile = GeoUtils.wgs84_to_tile_coord(panoInfo.lat, panoInfo.lon, 17);
		var coverage = await getCoverageInMapTile(tile[0], tile[1]);
		
		// TODO Only extend when needed (we're close to the edge of the tile)
		coverage = coverage.concat(await getCoverageInMapTile(tile[0] + 1, tile[1]));
		coverage = coverage.concat(await getCoverageInMapTile(tile[0] - 1, tile[1]));
		coverage = coverage.concat(await getCoverageInMapTile(tile[0], tile[1] + 1));
		coverage = coverage.concat(await getCoverageInMapTile(tile[0], tile[1] - 1));
		coverage = coverage.concat(await getCoverageInMapTile(tile[0] - 1, tile[1] - 1));
		coverage = coverage.concat(await getCoverageInMapTile(tile[0] + 1, tile[1] - 1));
		coverage = coverage.concat(await getCoverageInMapTile(tile[0] - 1, tile[1] + 1));
		coverage = coverage.concat(await getCoverageInMapTile(tile[0] + 1, tile[1] + 1));
		
		coverage = coverage.sort((a,b) => Math.abs(GeoUtils.haversineDistance([panoInfo.lat, panoInfo.lon], [a.lat, a.lon])) - Math.abs(GeoUtils.haversineDistance([panoInfo.lat, panoInfo.lon], [b.lat, b.lon])));

		coverage = coverage.filter(pano => pano.panoFullId() != panoInfo.panoFullId());


		let minDist = 0.030; // 30 meters
		let maxDist = 0.300; // 300 meters
		
		coverage = coverage.filter(n => (
			minDist < Math.abs(GeoUtils.haversineDistance([panoInfo.lat, panoInfo.lon], [n.lat, n.lon])) && 
			Math.abs(GeoUtils.haversineDistance([panoInfo.lat, panoInfo.lon], [n.lat, n.lon])) < maxDist
		));

		return coverage.slice(0,6);
	} catch (error) {
		console.log(error);
	}

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

		//console.log("Requesting tile " + [appleMapsPanoURL])

        var blobres = await fetch(appleMapsPanoURL);
        var blob = await blobres.blob();

		// Step 3: Convert from HEIC to JPEG with heic2any
		//console.log("Fetched tile, converting and resizing... " + [appleMapsPanoURL])
		//let startTime = Math.floor(Date.now() / 1000);
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
		
		//let endTime = Math.floor(Date.now() / 1000);
		//console.log("Time to convert: " + (endTime - startTime) + " seconds");
		// Wait for context to finish loading
		// TODO: Is there a better way?
		const delay = ms => new Promise(res => setTimeout(res, ms));
		await delay(100);
		//let endTime2 = Math.floor(Date.now() / 1000);
		//console.log("Full time: " + (endTime - startTime) + " seconds");


		return result;

	} catch (error) {
		console.log(error);
	}
}


export {
    loadTileForPano,
    getClosestPanoAtCoords,
	getNeighbors,
}