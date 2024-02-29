import "@esri/calcite-components/dist/calcite/calcite.css";
import { defineCustomElements } from "@esri/calcite-components/dist/loader";
import { suggest, geocode } from "@esri/arcgis-rest-geocoding";
import { ApiKeyManager } from "@esri/arcgis-rest-request";

// load the calcite components
defineCustomElements(window, {
  resourcesUrl: "https://js.arcgis.com/calcite-components/2.5.1/assets",
});

// create a new authentication manager from the API key stored in the .env file
const authentication = ApiKeyManager.fromKey(
  import.meta.env.VITE_ARCGIS_API_KEY
);

// get the form and input elements
const form = document.getElementById("address-form");
const hiddenStreetAddress = document.getElementById("street-address");
const streetAddressInput = document.getElementById("street-address-input");
const cityInput = document.getElementById("city-input");
const regionInput = document.getElementById("region-input");
const postalInput = document.getElementById("postal-input");
const countryInput = document.getElementById("country-input");

// listen for the form to be submitted, converting to JSON and logging the results
form.addEventListener("submit", function (event) {
  const formData = new FormData(form);
  const results = {};

  formData.forEach((value, key) => (results[key] = value));

  console.log("Form submitted");
  console.log("Form data", results);

  event.preventDefault();
});

// listen for changes to the street address input, and make suggestions
streetAddressInput.addEventListener(
  "calciteComboboxFilterChange",
  function (event) {
    const comboBoxInput = event.target.shadowRoot.querySelectorAll("input")[0];
    const comboBoxText = comboBoxInput.value;

    // when the user accepts a suggestion the text will be empty so we set it to the saved value in the hidden input
    if (comboBoxText.length <= 0) {
      console.log("No text in combobox");

      if (hiddenStreetAddress.value !== comboBoxText) {
        comboBoxInput.value = hiddenStreetAddress.value;
      }

      return;
    }

    // get suggestions from the geocoding service and populate the combobox items
    suggest(comboBoxText, {
      authentication,
      maxSuggestions: 10,
      category: "Address",
    }).then((response) => {
      const htmlStr = response.suggestions
        .map(({ magicKey, text }) => {
          return `<calcite-combobox-item value="${magicKey}:::${text}" text-label="${text}"></calcite-combobox-item>`;
        })
        .join();

      const suggestionHTML = document
        .createRange()
        .createContextualFragment(htmlStr);

      streetAddressInput.replaceChildren(suggestionHTML);
    });
  }
);

// listen for changes to the street address input, and geocode the selected suggestion
streetAddressInput.addEventListener("calciteComboboxChange", function (event) {
  const [magicKey, suggestionText] = event.target.value.split(":::");

  console.log("Combobox selection", { magicKey, suggestionText });

  if (!suggestionText || suggestionText.length <= 0) {
    console.log("No suggestion text");
    return;
  }

  geocode({
    magicKey,
    singleLine: suggestionText,
    outFields: ["StAddr", "City", "Region", "Postal", "Country"],
    authentication,
  }).then((response) => {
    console.log("Geocode response", { magicKey, suggestionText, response });

    // update all the inputs with the geocoded values
    const streetAddress = response.candidates[0].attributes.StAddr;
    const city = response.candidates[0].attributes.City;
    const region = response.candidates[0].attributes.Region;
    const postal = response.candidates[0].attributes.Postal;
    const country = response.candidates[0].attributes.Country;

    streetAddressInput.value = streetAddress;
    hiddenStreetAddress.value = streetAddress;
    cityInput.value = city;
    regionInput.value = region;
    postalInput.value = postal;
    countryInput.value = country;

    // clear the suggestions from the combobox
    streetAddressInput.replaceChildren([]);

    console.log("Geocode response", response.candidates[0]);
  });
});
