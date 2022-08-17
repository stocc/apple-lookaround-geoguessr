import "/static/layers.js";
import { LookaroundAdapter } from "/static/adapter.js";
import { parseAnchorParams } from "/static/util.js";
import { Authenticator } from "/static/auth.js";

function initMap() {
  let map = L.map("map", {
    center: [params.center[1], params.center[2]],
    minZoom: 3,
    maxZoom: 19,
    zoom: params.center[0],
    preferCanvas: true,
    zoomControl: true,
  });

  const appleRoadLightTiles = L.tileLayer.appleMapsTiles(auth, {
    maxZoom: 19,
    type: "road",
    tint: "light",
    keepBuffer: 6,
    attribution: '© Apple',
  }).addTo(map);
  const appleRoadDarkTiles = L.tileLayer.appleMapsTiles(auth, {
    maxZoom: 19,
    type: "road",
    tint: "dark",
    keepBuffer: 6,
    attribution: "© Apple",
  });
  const appleSatelliteTiles = L.layerGroup([
    L.tileLayer.appleMapsTiles(auth, {
      maxZoom: 19,
      type: "satellite",
      keepBuffer: 6,
      attribution: "© Apple",
    }),
    L.tileLayer.appleMapsTiles(auth, {
      maxZoom: 19,
      type: "satellite-overlay",
      keepBuffer: 6,
      attribution: "© Apple",
    }),
  ]);

  const googleRoadTiles = L.tileLayer(
    "https://maps.googleapis.com/maps/vt?pb=!1m5!1m4!1i{z}!2i{x}!3i{y}!4i256!2m8!1e0!2ssvv!4m2!1scb_client!2sapiv3!4m2!1scc!2s*211m3*211e2*212b1*213e2!3m3!3sUS!12m1!1e1!4e0",
    {
      maxZoom: 19,
      keepBuffer: 6,
      attribution: "© Google",
    }
  );
  const osmTiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    keepBuffer: 6,
    attribution: "© OpenStreetMap"
  });

  const debugCoords = L.gridLayer.debugCoords();

  const coverageLayerNormal = L.gridLayer.coverage({
    minZoom: 17,
    maxZoom: 17,
    tileSize: 256,
  });
  const coverageLayer18 = L.gridLayer.coverage({
    minZoom: 18,
    maxZoom: 18,
    tileSize: 512,
  });
  const coverageLayer19 = L.gridLayer.coverage({
    minZoom: 19,
    maxZoom: 19,
    tileSize: 1024,
  });
  const coverageLayer16 = L.gridLayer.coverage({
    minZoom: 16,
    maxZoom: 16,
    tileSize: 128,
  });
  /* too slow
  const coverageLayer15 = L.gridLayer.coverage({
    minZoom: 15,
    maxZoom: 15,
    tileSize: 64,
  }); */
  const coverageGroup = L.layerGroup([
    coverageLayerNormal,
    coverageLayer16,
    coverageLayer18,
    coverageLayer19,
  ]).addTo(map);
  const baseLayers = {
    "Apple Maps Road (Light)": appleRoadLightTiles,
    "Apple Maps Road (Dark)": appleRoadDarkTiles,
    "Apple Maps Satellite": appleSatelliteTiles,
    "Google Maps Road": googleRoadTiles,
    "OpenStreetMap": osmTiles,
  };
  const overlays = {
    '<div class="multiline-checkbox-label">Look Around coverage<br>(requires z=16 or higher)</div>': coverageGroup,
    "Tile boundaries": debugCoords,
  };
  L.control.layers(baseLayers, overlays).addTo(map);

  map.on("moveend", (e) => {
    updateUrlParameters();
  });
  map.on("zoomend", (e) => {
    updateUrlParameters();
  });
  
  map.on("click", async (e) => {
    await fetchAndDisplayPanoAt(e.latlng.lat, e.latlng.lng);
  });

  return map;
}

function updateUrlParameters() {
  const center = map.getCenter();
  const zoom = map.getZoom();
  window.location.hash =
    `#c=${zoom}/${center.lat.toFixed(5)}/${center.lng.toFixed(5)}`;
  if (selectedPano) {
    // there's no API call known to me which will return metadata for a 
    // specific panoid like there is with streetview. this means that to fetch 
    // pano metadata, its location must also be known, so I've decided to use
    // that for permalinks rather than panoids until I have a better solution
    window.location.hash += `&p=${selectedPano.lat.toFixed(5)}/${selectedPano.lon.toFixed(5)}`;
  }
}

async function fetchAndDisplayPanoAt(lat, lon) {
  const response = await fetch(`/closest/${lat}/${lon}/`);
  const pano = await response.json();
  if (pano) {
    if (selectedPanoMarker) {
      map.removeLayer(selectedPanoMarker);
    }
    selectedPano = pano;
    selectedPanoMarker = L.marker(L.latLng(pano.lat, pano.lon)).addTo(map);
    //destroyExistingPanoViewer();
    displayPano(pano);
  }
}

function displayPano(pano) {
  document.querySelector("#pano").style.display = "block";
  document.querySelector("#pano").style.width = "100vw";
  if (panoViewer) {
    panoViewer.setPanorama(`/pano/${pano.panoid}/${pano.region_id}/`, {
      showLoader: false,
    });
  } else {
    panoViewer = new PhotoSphereViewer.Viewer({
      container: document.querySelector("#pano"),
      adapter: LookaroundAdapter,
      panorama: `/pano/${pano.panoid}/${pano.region_id}/`,
      minFov: 10,
      maxFov: 70,
      defaultLat: 0,
      defaultLong: -0.523598776, // 60° (the center of the first face) minus 90°
      defaultZoomLvl: 10,
      navbar: null,
    });
  }

  switchMapToPanoLayout(pano);
  hideMapControls();

  document.querySelector("#close-pano").style.display = "flex";
  const panoInfo = document.querySelector("#pano-info");
  panoInfo.style.display = "block";
  panoInfo.innerHTML = `
    <strong>${pano.panoid}</strong>/${pano.region_id}<br>
    <small>${pano.lat.toFixed(5)}, ${pano.lon.toFixed(5)}, ${pano.heading.toFixed(0)} |
    ${pano.date}</small> <br> <a href="http://maps.apple.com/?q=${pano.lat},${pano.lon}" target="_blank">Open in Apple Maps</a>
  `;
}

function switchMapToPanoLayout(pano) {
  document.querySelector("#map").classList.add("pano-overlay");
  if (map) {
    map.invalidateSize();
    map.setView(L.latLng(pano.lat, pano.lon));
  }
}

function hideMapControls() {
  document.querySelector(".leaflet-control-zoom").style.display = "none";
  document.querySelector(".leaflet-control-layers").style.display = "none";
}

function destroyViewer() {
  if (panoViewer) {
    panoViewer.destroy();
    /*const panoContainer = document.querySelector("#pano");
    if (panoContainer.photoSphereViewer) {
      panoContainer.photoSphereViewer.destroy();
      panoContainer.style.display = "none";*/
    panoViewer = null;
  }
}

function closePano() {
  selectedPano = null;
  destroyViewer();

  document.querySelector("#map").classList.remove("pano-overlay");
  map.invalidateSize();  
  if (selectedPanoMarker) {
    map.removeLayer(selectedPanoMarker);
  }
  document.querySelector(".leaflet-control-zoom").style.display = "block";
  document.querySelector(".leaflet-control-layers").style.display = "block";

  document.querySelector("#close-pano").style.display = "none";
  document.querySelector("#pano-info").style.display = "none";
}


const auth = new Authenticator();
await auth.init();

let panoViewer = null;
let selectedPano = null;
let selectedPanoMarker = null;
document.querySelector("#close-pano").addEventListener("click", (e) => { closePano(); });

const params = parseAnchorParams();

let map = null;
if (params.startPano) {
  switchMapToPanoLayout();
  map = initMap();
  await fetchAndDisplayPanoAt(params.startPano[0], params.startPano[1]);
}
else {
  map = initMap();
}
