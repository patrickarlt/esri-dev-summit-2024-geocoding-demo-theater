import Map from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import esriConfig from "@arcgis/core/config.js";
import Search from "@arcgis/core/widgets/Search.js";
import { locationToAddress } from "@arcgis/core/rest/locator.js";
import Graphic from "@arcgis/core/Graphic.js";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js";

// setup API key
esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;

// setup map and map view
const map = new Map({
  basemap: {
    style: {
      id: "arcgis/navigation-night",
    },
  },
});

const view = new MapView({
  container: "viewDiv",
  map: map,
  zoom: 15,
  center: [-116.545296, 33.830296],
});

// setup the search widget
const searchWidget = new Search({
  view: view,
});

view.ui.add(searchWidget, {
  position: "top-right",
});

// find the address of the point when the map is clicked
view.on("click", async (event) => {
  try {
    const response = await locationToAddress(
      "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
      {
        location: event.mapPoint,
        locationType: "street",
      }
    );
    searchWidget.searchTerm = response.attributes.LongLabel;
    showPopup(response);
  } catch (err) {
    showPopup("No address found.", event.mapPoint);
  }
});

// helper methods for showing the popup and adding a graphic
view.popup.actions = [] as any;

function showPopup(
  response: __esri.AddressCandidate | string,
  location?: __esri.Point
) {
  if (!response) {
    return;
  }

  if (typeof response === "string") {
    view.openPopup({
      title: response,
      content: "",
      location,
    });
    return;
  }

  view.openPopup({
    title: response.attributes.PlaceName || "Address",
    content:
      response.attributes.LongLabel +
      "<br><br>Longitude:" +
      response.location.longitude.toFixed(5) +
      ", Latitude" +
      response.location.latitude.toFixed(5),
    location: response.location || location,
  });
  addGraphic(response);
}

function addGraphic(
  response: __esri.AddressCandidate | string,
  location?: __esri.Point
) {
  let point = typeof response === "string" ? location : response.location;

  if (!point) {
    return;
  }

  view.graphics.removeAll();
  view.graphics.add(
    new Graphic({
      symbol: new SimpleMarkerSymbol({
        outline: {
          color: "white",
          width: 1.5,
        },
        color: "black",
        size: 6,
      }),
      geometry: point,
    })
  );
}
