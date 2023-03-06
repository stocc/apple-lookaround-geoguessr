// Determines the resolution of images requested from Apple
// Setting a higher resolution will make rounds load WAY slower, until browsers start to support HEIC
// 0 = highest resolution available, 4 = lowest resolution available.
// Default: 2
const RESOLUTION_SETTING = 2;

// Constant value added to calculated heading to calibrate the GeoGuessr compass
const HEADING_CALIBRATION = 45;

const EXTENSION_FACTOR = 2.12; // TODO Play around with this value for best results with image stretching

const BASE_URL = "https://alrgg.stocc.dev/api/proxyConvertedImg?code=EIT_VhF-gEuQ6848xFM3y8S-lflGGD6Q2rIZJ2EIZ9LHAzFuh6mLAQ==";
const CONVERT_LOCALLY = false;

const CORS_PROXY = "https://cors-proxy.ac4.stocc.dev/"

const APPLE_MAPS_TILE_ENDPOINT = "https://gspe72-ssl.ls.apple.com/mnn_us/"

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
	CORS_PROXY,
	APPLE_MAPS_TILE_ENDPOINT,
	RESOLUTION_PROFILES,
	BASE_URL,
	CONVERT_LOCALLY
};
