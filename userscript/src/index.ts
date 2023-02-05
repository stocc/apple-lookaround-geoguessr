// ==UserScript==
// @name         AppleGuessr
// @namespace    https://greasyfork.org/en/users/946023-mistystar
// @version      2.1
// @description  Adds Apple Look Around to GeoGuessr
// @author       Mistystar (Mistystar#2205, https://github.com/kittenz) & stocc (stocc#2919, https://github.com/stocc)
// @match        https://www.geoguessr.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geoguessr.com
// @grant        none
// @license      MIT
// @run-at       document-start
// @require 	 https://cdn.jsdelivr.net/gh/chebum/heic2any@master/dist/heic2any.min.js
// @require 	 https://cdn.jsdelivr.net/npm/protobufjs@7.0.0/dist/protobuf.js
// @require		 https://cdn.jsdelivr.net/npm/long@5/umd/index.js

// ==/UserScript==
/*
CREDITS

Massive thank you to the following people:
	- skzk#8049 - Without https://github.com/sk-zk/lookaround-map this script would not have been possible to make
	- Jupaoqq#7742 - I learned a lot from looking at Unity Script's source code
	- mattisinthesky#1294 or kowalski - For hosting the lookaround-map in Heroku and helping with issues
	- efefury#0519 and Apfeloxid#1368 - For making the Take A Look Around Germany map
*/


// Based on: https://github.com/sk-zk/lookaround-map/
/*
MIT License

Copyright (c) 2022 skzk

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/


// BEGIN CODE SECTION
import * as Options from "./options";
import * as Lookaround from "./lookaround";
import { PanoInfo } from "./lookaround";
import GeoUtils from "./geoutils";

protobuf.util.Long = Long;
protobuf.configure();

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


const isGamePage = () => location.pathname.startsWith("/challenge/") || location.pathname.startsWith("/results/") ||
						location.pathname.startsWith("/game/")|| location.pathname.startsWith("/battle-royale/") ||
						location.pathname.startsWith("/duels/") || location.pathname.startsWith("/team-duels/") ||
						location.pathname.startsWith("/bullseye/") ||
location.pathname.startsWith("/live-challenge/");

// ----------------------------------------------------------------------------
// Script injection, extracted from extenssr:
// https://gitlab.com/nonreviad/extenssr/-/blob/main/src/injected_scripts/maps_api_injecter.ts
export type GoogleOverrider = (g: typeof window.google) => void;

function overrideOnLoad(googleScript: HTMLScriptElement, observer: MutationObserver, overrider: GoogleOverrider): void {
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

function grabGoogleScript(mutations: MutationRecord[]): HTMLScriptElement | null {
	for (const mutation of mutations) {
		for (const newNode of (mutation.addedNodes as any /* Please shut up, it works in JS so it must work here as well */)) {
			const asScript = newNode;
			if (asScript && asScript.src && asScript.src.startsWith("https://maps.googleapis.com/")) {
				return asScript;
			}
		}
	}
	return null;
}

function injecter(overrider: GoogleOverrider) {
	if (document.documentElement) {
		injecterCallback(overrider);
	} else {
		alert("Script didn't load, refresh to try loading the script");
	}
}


function injecterCallback(overrider: GoogleOverrider) {
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
		if (settingsSection === null) return;
		settingsSection.insertAdjacentHTML("beforeend", MENU_HTML);

		const checkbox = document.querySelector(".apple-look-around-toggle") as HTMLInputElement;
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
				if (event.currentTarget === null) return;
				if ((event.currentTarget as any).checked) {
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

// ----------------------------------------------------------------------------
// Sate vars 
// TODO: Is there a better way to do this?

var loadingInProgress = false;
var currentPano: PanoInfo = new PanoInfo("", "", "",0,0,0);
var currentlyLoadedPanoTiles: Array<String> = [];

var curNeighbors: Array<PanoInfo> = [];


// When moving, this is used to keep the current viewport while loading the next pano
var oldHeading = 0;



// ----------------------------------------------------------------------------
// Google Maps API callbacks


// Return a pano image given the panoID.
const getCustomPanoramaTileUrl = (pano, zoom, tileX, tileY) => {

	// Currently loading first image in a round, return a blank image
	//if (pano.startsWith("r")){
	if (currentlyLoadedPanoTiles.length === 0) {
	
		return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
	}

	return currentlyLoadedPanoTiles[tileX];

};

const getPano = (pano) => {
	let rp = Options.RESOLUTION_PROFILES[Options.RESOLUTION_SETTING];
	let fullWidth = 2 * rp.big.width + 2 * rp.small.width - 4 * rp.overlap;
	return {
		location: {
			pano: pano,
			description: "Apple Look Around",
			latLng: new google.maps.LatLng(currentPano.lat, currentPano.lon),
		},
		links: [],
		// The text for the copyright control.
		copyright: "(C) Apple",
		// The definition of the tiles for this panorama.
		tiles: {
			tileSize: new google.maps.Size(Math.round(fullWidth / 4), Math.round(Options.EXTENSION_FACTOR * rp.big.height)),
			worldSize: new google.maps.Size(fullWidth, Math.round(rp.big.height * Options.EXTENSION_FACTOR)),
			// The heading in degrees at the origin of the panorama
			// tile set.
			centerHeading: function (){
				// While loading: use the old heading so that when moving, you keep the same viewport while loading the next pano
				if (loadingInProgress) {
					return oldHeading;
				} else {
					var newHeading = (currentPano.heading + Options.HEADING_CALIBRATION) % 360;
					oldHeading = newHeading;
					return newHeading;
				}
			}(),
			getTileUrl: getCustomPanoramaTileUrl,
		},
	};
};






// ----------------------------------------------------------------------------
// Init

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

						// Detect if this is a new round. Normally, currentPano is already updated if this is a move in the same round.
						if ((this.getPosition().lat() === currentPano.lat && this.getPosition().lng() === currentPano.lon)) {
						
							console.log("Position is currentPano => same round");
							return;
						}

						console.warn("Position actually changed => new round; full reload");
						currentlyLoadedPanoTiles = []; // Causes black screen again
						
						this.getFirstPanoId();
					} catch (e) {
						console.error(e);
					}
				});

				// Called after setPano(). If the pano is "r<panoId>/<regioId>", then we load the tiles for that pano.
				// If it doesn't start with "r", then loading is done.
				this.addListener("pano_changed", () => {
					console.log("Pano changed " +this.getPano());
					if (this.getPano() != null && this.getPano() != currentPano.panoFullId() && this.getPano() != "" && this.getPano().startsWith("r")) {
						console.log("New pano requested " + this.getPano());
						try {
							this.beginLoadingPanos(this, this.getPano().replace("r", ""));
						} catch {}
					}
				});
				this.addListener("links_changed", () => {
					console.log("Links changed " + this.getLinks());
					if (!this.getPano().startsWith("r") && curNeighbors != null) {


												//this.getLinks().push(curNeighbors[0])
						let neighborLinks = curNeighbors.map(neighbor => {return {
							"descripton": "", 
							"pano": "r"+neighbor.panoFullId(), 
							"heading": Math.round(GeoUtils.heading([neighbor.lat, neighbor.lon], [currentPano.lat, currentPano.lon]) + 180) % 360,
						}});
						console.log("Pushing Links " + neighborLinks.length);

						for (const neighbor of neighborLinks) {
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
				let lat = this.position.lat();
				let lon = this.position.lng();


				let lookAroundPanoId, regionId;

				let closestObject = await Lookaround.getClosestPanoAtCoords(lat, lon);

				lookAroundPanoId = closestObject.panoId;
				regionId = closestObject.regionId;
				// Request pano to load
				currentPano = closestObject;
				this.setPano("r"+lookAroundPanoId+"/"+regionId);

			} catch {}

		}
		
		getStatus() {
			return google.maps.StreetViewStatus.OK;
		}

		// param panoFullId is "panoId/regionId"
		async beginLoadingPanos(_t,panoFullId) {
			if (loadingInProgress) return;
			//console.warn("http://localhost:5000/#c=17/"+currentPano.lat+"/"+currentPano.lon+"&p="+currentPano.lat+"/"+currentPano.lon);
			// Moved. Find the selected neigbor from ID.
			if (curNeighbors.length > 0) {
				let selectedNeighbor = curNeighbors.filter(n => n.panoFullId() == panoFullId)[0];
				if (selectedNeighbor != null) {
					currentPano = selectedNeighbor;
				}
			}

			console.log("Start loading Panos");

			loadingInProgress = true;
			let pano0 =  Lookaround.loadTileForPano(panoFullId,0);
			let pano1 =  Lookaround.loadTileForPano(panoFullId,1);
			let pano2 =  Lookaround.loadTileForPano(panoFullId,2);
			let pano3 =  Lookaround.loadTileForPano(panoFullId,3);
			
			curNeighbors = await (await Lookaround.getNeighbors(currentPano));
			loadingInProgress = false;
			currentlyLoadedPanoTiles = [await pano0, await pano1, await pano2, await pano3];

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

window.onload = onLoad;
