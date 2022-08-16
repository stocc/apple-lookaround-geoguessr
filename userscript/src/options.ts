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
