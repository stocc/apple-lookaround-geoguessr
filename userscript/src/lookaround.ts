import * as Options from "./options";

// param panoFullId is "panoId/regionId"
async function loadTileForPano(panoFullId, x) {
	try {

		// Step 1: Get the URL of the tile to load
		// New endpoint /panourl in the python server returns just the Apple URL for the pano
		//TODO This step can be moved to client side

		var panoUrlReq = Options.BASE_URL+"panourl/" + panoFullId.toString() + "/"+x.toString()+"/"+Options.RESOLUTION_SETTING.toString()+"/"
		var panoUrlResp = await fetch(panoUrlReq);
		var panoUrlRespParsed = await panoUrlResp.json();

		var appleMapsPanoURL = Options.CORS_PROXY+panoUrlRespParsed.url;

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

async function getClosestPano(lat:Number, lon:Number) {
    let response = await fetch(Options.BASE_URL+"closest/" + lat + "/" + lon + "/");
    let data = await response.text();
    return JSON.parse(data);
}

async function getNeighborsPrimitive(lat,lng) {
	try {
		let step = 0.001;
		let dirs = [
			[lat + step, lng], // north
			[lat, lng + step], // east
			[lat - step, lng], // south
			[lat, lng - step], // west
		]
		var res = [{"heading":0, "pano":"", "description": "adf", "lat": 0, "lng": 0},{"heading":90, "pano":"", "lat": 0, "lng": 0},{"heading":180, "pano":"", "lat": 0, "lng": 0},{"heading":270, "pano":"", "lat": 0, "lng": 0}];
		var i = 0;
		for (const dir of dirs) {
			let response = await fetch(Options.BASE_URL+"closest/" + dir[0] + "/" + dir[1] + "/");
			let closestObject = await response.json();
			
			if (lat.toString() == closestObject.lat.toString() && lng.toString() == closestObject.lon.toString()){
				console.log("Found same pano " + closestObject.panoid)
				continue;
			}

			console.log("Found closest pano " + [closestObject.panoid, lat, lng, closestObject.lat, closestObject.lon])
			res[i].pano = "r"+closestObject.panoid + "/" + closestObject.region_id;
			res[i].lat = closestObject.lat;
			res[i].lng = closestObject.lon;

			i++;
		}

		console.log(res);
		return res;
	} catch (error) {
		console.log(error);
	}

}


export {
    loadTileForPano,
    getClosestPano
}