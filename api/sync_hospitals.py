import asyncio
import asyncpg
import geojson
import requests
import os
import ssl
from dotenv import load_dotenv

# 🔹 Load .env file
load_dotenv()

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_HOST = os.getenv("DB_HOST", "")
DB_PORT = int(os.getenv("DB_PORT", "5432"))

# 🔹 Overpass API fallback URLs
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
]

# 🔹 Overpass query → all hospitals in Austria
OVERPASS_QUERY = """
[out:json][timeout:180];
area["ISO3166-1"="AT"][admin_level=2];
node["amenity"="hospital"](area);
out body;
"""

async def main():
    # 1️⃣ Fetch from Overpass API
    print("🌍 Fetching hospital data from OpenStreetMap...")
    data = None
    for url in OVERPASS_URLS:
        try:
            print(f"→ Trying {url} ...")
            response = requests.post(url, data={"data": OVERPASS_QUERY}, timeout=180)
            response.raise_for_status()
            data = response.json()
            print(f"✅ Success: {len(data['elements'])} hospitals fetched")
            break
        except Exception as e:
            print(f"❌ Failed at {url}: {e}")

    if not data:
        print("🚨 All Overpass servers failed. Try again later.")
        return

    # 2️⃣ Build GeoJSON Features
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
                "capacity": tags.get("capacity"),
                "source": "OSM",
            }
            feature = geojson.Feature(
                geometry=geojson.Point((element["lon"], element["lat"])),
                properties=properties,
            )
            features.append(feature)

    print(f"🗂️ Prepared {len(features)} hospitals for DB upsert")

    # 3️⃣ Connect to Supabase Postgres
    # Option 1: Simple SSL (skip cert validation) ✅ works out of the box
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    # Option 2: Use Supabase CA cert (if you downloaded supabase-ca.crt)
    # ssl_context = ssl.create_default_context(cafile="certs/supabase-ca.crt")

    conn = await asyncpg.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        host=DB_HOST,
        port=DB_PORT,
        ssl=ssl_context,
    )

    # 4️⃣ Upsert hospitals
    inserted = 0
    for feature in features:
        props = feature["properties"]
        lon, lat = feature["geometry"]["coordinates"]

        await conn.execute(
            """
            INSERT INTO hospitals 
                (name, address, city, postcode, phone, website, operator, emergency, capacity, geom)
            VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8, 
                 NULLIF($9, '')::int,
                 ST_SetSRID(ST_Point($10, $11), 4326))
            ON CONFLICT (name, city) DO UPDATE SET
                address = EXCLUDED.address,
                postcode = EXCLUDED.postcode,
                phone = EXCLUDED.phone,
                website = EXCLUDED.website,
                operator = EXCLUDED.operator,
                emergency = EXCLUDED.emergency,
                capacity = EXCLUDED.capacity,
                geom = EXCLUDED.geom;
            """,
            props.get("name"),
            f"{props.get('street','')} {props.get('housenumber','')}".strip(),
            props.get("city"),
            props.get("postcode"),
            props.get("phone"),
            props.get("website"),
            props.get("operator"),
            props.get("emergency"),
            props.get("capacity"),
            lon,
            lat,
        )
        inserted += 1

    print(f"✅ Done! Upserted {inserted} hospitals into Supabase 🚀")
    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
