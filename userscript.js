// ==UserScript==
// @name         AppleGuessr
// @namespace    https://greasyfork.org/en/users/946023-mistystar
// @version      1.0
// @description  Adds Apple Look Around to GeoGuessr
// @author       Mistystar (Mistystar#2205 on Discord, https://www.youtube.com/channel/UC4IHxYw9Aoz8cf9BIdHKd3A on YT)
// @match        https://www.geoguessr.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geoguessr.com
// @grant        none
// @license      MIT
// @run-at       document-start
// @require 	 https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.3/heic2any.min.js

// ==/UserScript==

/*
CREDITS

Massive thank you to the following people:
	- skzk#8049 - Without https://github.com/sk-zk/lookaround-map this script would not have been possible to make
	- Jupaoqq#7742 - I learned a lot from looking at Unity Script's source code
	- mattisinthesky#1294 or kowalski - For hosting the lookaround-map in Heroku and helping with issues
	- efefury#0519 and Apfeloxid#1368 - For making the Take A Look Around Germany map
*/

// BEGIN CODE SECTION

// 0 best, 4 worst
const resolutionSetting = 2;
const headingCalibration = 40;


const extensionFactor = 2; // TODO Play around with this value for best results with image stretching

async function blobToBase64(blob) {
	return new Promise((resolve, _) => {
	  const reader = new FileReader();
	  reader.onloadend = () => resolve(reader.result);
	  reader.readAsDataURL(blob);
	});
  }

const BASE_URL = "http://127.0.0.1:5001/"

const MENU_HTML = `
<div class="start-standard-game_settings__x94PU">
	<div class="game-settings_default__DIBgs">
		<div class="game-settings_toggleLabel__nipwm">
			<div class="label_sizeXSmall__mFnrR">Apple Look Around</div>
			<span></span>
		</div>
		<div>
			<input type="checkbox" class="apple-look-around-toggle" checked>
		</div>
	</div>
</div>
`;


let resoultionProfiles = {
	0: {
		"overlap": 256,
		"big": {
			"width": 5632,
			"height": 4352,
		},
		"small": {
			"width": 3072,
			"height": 4352,
		}
	},
	1: {
		"overlap": 188,
		"big": {
			"width": 4128,
			"height": 3088,
		},
		"small": {
			"width": 2256,
			"height": 3088,
		},
	},
	2: {
		"overlap": 100,
		"big": {
			"width": 2208,
			"height": 1648,
		},
		"small": {
			"width": 1200,
			"height": 1648,
		}
	},
	3: {
		"overlap": 71,
		"big": {
			"width": 1568,
			"height": 1168,
		},
		"small": {
			"width": 848,
			"height": 1168,
		}
	},
	4: {
		"overlap": 50,
		"big": {
			"width": 1104,
			"height": 832,
		},
		"small": {
			"width": 608,
			"height": 832,
		}
	}

}



const isGamePage = () => location.pathname.startsWith("/challenge/") || location.pathname.startsWith("/results/") ||
						location.pathname.startsWith("/game/")|| location.pathname.startsWith("/battle-royale/") ||
						location.pathname.startsWith("/duels/") || location.pathname.startsWith("/team-duels/") ||
						location.pathname.startsWith("/bullseye/") ||
location.pathname.startsWith("/live-challenge/");

// ----------------------------------------------------------------------------
// Script injection, extracted from extenssr:
// https://gitlab.com/nonreviad/extenssr/-/blob/main/src/injected_scripts/maps_api_injecter.ts
function overrideOnLoad(googleScript, observer, overrider) {
	const oldOnload = googleScript.onload;
	googleScript.onload = (event) => {
		const google = window.google;
		if (google) {
			observer.disconnect();
			overrider(google);
		}
		if (oldOnload) {
			oldOnload.call(googleScript, event);
		}
	};
}

function grabGoogleScript(mutations) {
	for (const mutation of mutations) {
		for (const newNode of mutation.addedNodes) {
			const asScript = newNode;
			if (asScript && asScript.src && asScript.src.startsWith("https://maps.googleapis.com/")) {
				return asScript;
			}
		}
	}
	return null;
}

function injecter(overrider) {
	if (document.documentElement) {
		injecterCallback(overrider);
	} else {
		alert("Script didn't load, refresh to try loading the script");
	}
}


function injecterCallback(overrider) {
	new MutationObserver((mutations, observer) => {
		const googleScript = grabGoogleScript(mutations);
		if (googleScript) {
			overrideOnLoad(googleScript, observer, overrider);
		}
	}).observe(document.documentElement, { childList: true, subtree: true });
}
// End Script injection --------------------------------------------------------------s

function injectMenu() {
	const inject = () => {
		if (document.querySelector(".apple-look-around-toggle") !== null) return;
		const settingsSection = document.querySelector('.section_sectionMedium__yXgE6');
		settingsSection.insertAdjacentHTML("beforeend", MENU_HTML);

		const checkbox = document.querySelector(".apple-look-around-toggle");
		if (checkbox) {
			let isChecked = localStorage.getItem("applelookaroundchecked");
			if (isChecked === null) {
				checkbox.checked = false;
				localStorage.setItem("applelookaroundchecked", "false");
			} else if (isChecked === "true") {
				checkbox.checked = true;
			} else {
				checkbox.checked = false;
			}

			checkbox.addEventListener("change", (event) => {
				if (event.currentTarget.checked) {
					localStorage.setItem("applelookaroundchecked", "true");
				} else {
					localStorage.setItem("applelookaroundchecked", "false");
				}
			})
		}
	};

	// We want the page to be loaded before trying to inject anything
	let documentLoadedInterval = setInterval(function() {
		if(document.readyState === "complete") {
			clearInterval(documentLoadedInterval);
			inject();
		}
	}, 100);
}

// Return a pano image given the panoID.
const getCustomPanoramaTileUrl = (pano, zoom, tileX, tileY) => {

	// Currently loading first image in a round, return a blank image
	if (pano.startsWith("r")){  //&& (currentPanos.length == 0 || newRound)  ) {
		return 'data:image/jpeg;base64,'	
	}

	return currentPanos[tileX];

};

const getPano = (pano) => {
	let rp = resoultionProfiles[resolutionSetting];
	let fullWidth = 2 * rp.big.width + 2 * rp.small.width - 4 * rp.overlap;
	return {
		location: {
			pano: pano,
			description: "Apple Look Around",
			// latLng: {
			// 	lat: curlat,
			// 	lng: curlng,
			// }
		},
		links: [],
		// The text for the copyright control.
		copyright: "(C) Apple",
		// The definition of the tiles for this panorama.
		tiles: {
			tileSize: new google.maps.Size(Math.round(fullWidth / 4), Math.round(extensionFactor * rp.big.height)),
			worldSize: new google.maps.Size(fullWidth, Math.round(rp.big.height * extensionFactor)),
			// The heading in degrees at the origin of the panorama
			// tile set.
			centerHeading: curHeading,
			getTileUrl: getCustomPanoramaTileUrl,
		},
	};
};

var loadingInProgress = false;
var currentPanoID = "";
var currentPanos = [];
var newRound = true;
var curlat = 0;
var curlng = 0;
var curNeighbors = [];
var curHeading = 0;
// param panoFullId is "panoId/regionId"
async function loadTileForPano(panoFullId, x) {
	try {

		// New endpoint /panourl in the python server returns just the Apple URL for the pano
		var testURL = BASE_URL+"panourl/" + panoFullId.toString() + "/"+x.toString()+"/"+resolutionSetting.toString()+"/"



		var thing = await fetch(testURL);
		var parsed = await thing.json();


        //var panoURL = "https://cors-anywhere.herokuapp.com/"+parsed.url;

		// CORS Proxy running locally
		// docker run --publish 8080:8080 testcab/cors-anywhere
		var panoURL = "http://localhost:8080/"+parsed.url;
		//var panoURL = parsed.url;

		console.log("Requesting tile " + [x, parsed.url, panoURL])

        var blobres = await fetch(panoURL);
        var blob = await blobres.blob();

		console.log("Fetched tile, converting " + [x, parsed.url, panoURL])
		// Convert blob to jpeg using heic2any
        var jpegblob = heic2any({"blob": blob, "type": "image/jpeg"});
		//var b64 = await blobToBase64(jpegblob);

		// Tiles 0 and 2 are 3072 x 4352
		// Tiles 1 and 3 are 5632 x 4352

		console.log("Converted tile, resizing " + [x, parsed.url, panoURL])
		let rp = resoultionProfiles[resolutionSetting];

		// Putting the jpeg blob into a canvas to remove 256 px from the right (removes overlap)
		var w = rp.big.width;
		if(x == 1 || x == 3){
			w = rp.small.width;
		}
		w = w - rp.overlap;
		var canvas = document.createElement('canvas');
		canvas.height = Math.round(extensionFactor * rp.big.height);
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
		console.log("Scaling " + [x, parsed.url, panoURL])

		const delay = ms => new Promise(res => setTimeout(res, ms));

		await delay(100);


		return result;

	} catch (error) {
		console.log(error);
	}
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
		res = [{"heading":0, "pano":"", "description": "adf"},{"heading":90, "pano":""},{"heading":180, "pano":""},{"heading":270, "pano":""}]
		var i = 0;
		for (const dir of dirs) {
			let response = await fetch(BASE_URL+"closest/" + dir[0] + "/" + dir[1] + "/");
			let closestObject = await response.json();
			
			if (curlat.toString() == closestObject.lat.toString() && curlng.toString() == closestObject.lon.toString()){
				console.log("Found same pano " + closestObject.panoid)
				continue;
			}

			console.log("Found closest pano " + [closestObject.panoid, curlat, curlng, closestObject.lat, closestObject.lon])
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

function initLookAround() {
	google.maps.StreetViewPanorama = class extends google.maps.StreetViewPanorama {
		constructor(...args) {
			super(...args);

			let isChecked = localStorage.getItem("applelookaroundchecked");
			if (isChecked === "true") {
				this.registerPanoProvider(getPano);

				// Position is being changed by GeoGuessr at the beginning of each round. this.getPosition() contains lat/lng of round.
				this.addListener("position_changed", () => {
					console.log("Position changed " + this.getPosition());
					try {
						newRound = true;
						this.getFirstPanoId(this);
					} catch {}
				});

				// Called after setPano(). If the pano is "r<panoId>/<regioId>", then we load the tiles for that pano.
				// If it doesn't start with "r", then loading is done.
				this.addListener("pano_changed", () => {
					console.log("Pano changed " +this.getPano() + " " + currentPanoID);
					if (this.getPano() != null && this.getPano() != currentPanoID && this.getPano() != "" && this.getPano().startsWith("r")) {
						currentPanoID = this.getPano();
						console.log("New pano requested " + this.getPano());
						try {
							this.beginLoadingPanos(this, this.getPano().replace("r", ""));
						} catch {}
					}
				});
				this.addListener("links_changed", () => {
					console.log("Links changed " + this.getLinks());
					if (!this.getPano().startsWith("r") && curNeighbors != null) {

						// this.getLinks().push({
						// 	description: "Google Sydney",
						// 	heading: 25,
						// 	pano: "reception",
						//   });
						
						console.log(curNeighbors[0]);
						//this.getLinks().push(curNeighbors[0])
						for (const neighbor of curNeighbors) {
							if (neighbor.pano != "") {
								this.getLinks().push(neighbor);
							}
						}
					}
					
				});
			}
		}

		async getFirstPanoId(){
			let isChecked = localStorage.getItem("applelookaroundchecked");
			if (isChecked !== "true") return;

			try {
				//currentPanos = [loading,loading,loading,loading];
				//this.setPano("loading");
				let lat = this.position.lat();
				let lon = this.position.lng();
				let lookAroundPanoId, regionId;

				let response = await fetch(BASE_URL+"closest/" + lat + "/" + lon + "/");
				let data = await response.text();
				let closestObject = JSON.parse(data);

				lookAroundPanoId = closestObject.panoid;
				regionId = closestObject.region_id;
				curlat = closestObject.lat;
				curlng = closestObject.lon;
				curHeading = (closestObject.heading + headingCalibration) % 360;
				curNeighbors = await getNeighborsPrimitive(curlat, curlng);
				// Request pano to load
				this.setPano("r"+lookAroundPanoId+"/"+regionId);

			} catch {}

		}

		// param panoFullId is "panoId/regionId"
		async beginLoadingPanos(t,panoFullId) {
			if (panoFullId === currentPanoID || loadingInProgress) return;

			console.log("Start loading Panos");
			if (curNeighbors != null) {
				for (const neighbor of curNeighbors) {
					if (neighbor.pano.includes( panoFullId)) {
						curlat = neighbor.lat;
						curlng = neighbor.lng
					}
					
				}
				curNeighbors = await getNeighborsPrimitive(curlat, curlng);
			}
			loadingInProgress = true;
			let pano0 =  loadTileForPano(panoFullId,0);
			let pano1 =  loadTileForPano(panoFullId,1);
			let pano2 =  loadTileForPano(panoFullId,2);
			let pano3 =  loadTileForPano(panoFullId,3);
			loadingInProgress = false;
			currentPanos = [await pano0, await pano1, await pano2, await pano3];

			currentPanoID = panoFullId;
			newRound = false;
			// Set another panoId to refresh the view
			this.setPano(panoFullId);


		}
	}
}

function launchObserver() {
	initLookAround();
	//let observer3 = new MutationObserver((mutations) => {
	//	const PATH_NAME = window.location.pathname;

	//	if (PATH_NAME.startsWith("/maps/") && PATH_NAME.endsWith("/play")) { // Inject the options menu if the path name is /maps/XXXXXXX/play
	//		//injectMenu();
	//	}
	//});
	//observer3.observe(document.body, {childList: true, subtree: true, attributes: false, characterData: false});
}

function onLoad() {
	let isChecked = localStorage.getItem("applelookaroundchecked");
	if (isChecked === null) {
		localStorage.setItem("applelookaroundchecked", "true");
	}

	//const PATH_NAME = window.location.pathname;

	//if (PATH_NAME.startsWith("/maps/") && PATH_NAME.endsWith("/play")) { // Inject the options menu if the path name is /maps/XXXXXXX/play
	//	//injectMenu();
	//}

	injecter(() => {
		launchObserver();
	});
}

(function() {
	onLoad();
})();
