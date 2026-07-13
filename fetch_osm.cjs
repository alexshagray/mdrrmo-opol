const fs = require("fs");
const fetch = require("node-fetch");

async function run() {
  const query = `
    [out:json][timeout:25];
    area["name"="Opol"]->.searchArea;
    (
      node["amenity"](area.searchArea);
      way["amenity"](area.searchArea);
      rel["amenity"](area.searchArea);
      node["shop"](area.searchArea);
      way["shop"](area.searchArea);
      rel["shop"](area.searchArea);
      node["building"="school"](area.searchArea);
      way["building"="school"](area.searchArea);
      rel["building"="school"](area.searchArea);
    );
    out center;
  `;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query
    });
    const data = await res.json();
    const namedElements = data.elements.filter(e => e.tags && e.tags.name);
    console.log("Found", namedElements.length, "landmarks in Opol!");
    if(namedElements.length > 0) {
        console.log("Examples:", namedElements.slice(0, 10).map(e => e.tags.name).join(", "));
    }
  } catch (e) {
    console.log("Failed:", e.message);
  }
}
run();
