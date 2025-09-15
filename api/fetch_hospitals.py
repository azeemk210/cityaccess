import requests
import geojson

OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
]

query = """
[out:json][timeout:180];
area["ISO3166-1"="AT"][admin_level=2];
node["amenity"="hospital"](area);
out body;
"""

for url in OVERPASS_URLS:
    try:
        print(f"Trying {url}...")
        response = requests.post(url, data={"data": query}, timeout=180)
        response.raise_for_status()
        data = response.json()
        print(f"✅ Success at {url}, fetched {len(data['elements'])} hospitals")

        # Convert to GeoJSON with extended properties
        features = []
        for element in data["elements"]:
            if "lat" in element and "lon" in element:
                tags = element.get("tags", {})
                properties = {
                    "name": tags.get("name", "Unknown hospital"),
                    "street": tags.get("addr:street"),
                    "housenumber": tags.get("addr:housenumber"),
                    "postcode": tags.get("addr:postcode"),
                    "city": tags.get("addr:city"),
                    "phone": tags.get("phone"),
                    "website": tags.get("website"),
                    "operator": tags.get("operator"),
                    "emergency": tags.get("emergency"),
                    "capacity": tags.get("capacity"),  # may not always exist
                    "source": "OSM",
                }

                feature = geojson.Feature(
                    geometry=geojson.Point((element["lon"], element["lat"])),
                    properties=properties,
                )
                features.append(feature)

        fc = geojson.FeatureCollection(features)
        with open("hospitals_at.geojson", "w", encoding="utf-8") as f:
            geojson.dump(fc, f, ensure_ascii=False, indent=2)

        print("💾 Saved hospitals_at.geojson with extended properties")
        break

    except Exception as e:
        print(f"❌ Failed at {url}: {e}")
