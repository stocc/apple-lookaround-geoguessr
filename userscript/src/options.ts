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


// Determines the resolution of images requested from Apple
// Setting a higher resolution will make rounds load WAY slower, until browsers start to support HEIC
// 0 = highest resolution available, 4 = lowest resolution available.
// Default: 2
const RESOLUTION_SETTING = 2;

// Constant value added to calculated heading to calibrate the GeoGuessr compass
const HEADING_CALIBRATION = 40;


const EXTENSION_FACTOR = 2; // TODO Play around with this value for best results with image stretching

// Python Backend API URL
const BASE_URL = "https://lookaround-alpha.herokuapp.com/"
const CORS_PROXY = "https://nameless-bastion-28139.herokuapp.com/"


const RESOLUTION_PROFILES = {
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


export {
	RESOLUTION_SETTING,
	HEADING_CALIBRATION,
	EXTENSION_FACTOR,
	BASE_URL,
	CORS_PROXY,
	RESOLUTION_PROFILES
};
