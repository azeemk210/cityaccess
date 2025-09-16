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

# 🔹 Overpass query → all health facilities in Austria
OVERPASS_QUERY = """
[out:json][timeout:180];
area["ISO3166-1"="AT"][admin_level=2];
node["amenity"~"hospital|clinic|pharmacy|doctors|dentist|laboratory"](area);
out body;
"""

async def fetch_facilities():
    """Fetch data from Overpass API."""
    print("🌍 Fetching health facilities from OpenStreetMap...")
    data = None
    for url in OVERPASS_URLS:
        try:
            print(f"→ Trying {url} ...")
            response = requests.post(url, data={"data": OVERPASS_QUERY}, timeout=180)
            response.raise_for_status()
            data = response.json()
            print(f"✅ Success: {len(data['elements'])} facilities fetched")
            break
        except Exception as e:
            print(f"❌ Failed at {url}: {e}")

    if not data:
        raise RuntimeError("🚨 All Overpass servers failed. Try again later.")

    # Convert to GeoJSON features
    features = []
    for element in data["elements"]:
        if "lat" in element and "lon" in element:
            tags = element.get("tags", {})
            properties = {
                "name": tags.get("name", "Unknown facility"),
                "street": tags.get("addr:street"),
                "housenumber": tags.get("addr:housenumber"),
                "postcode": tags.get("addr:postcode"),
                "city": tags.get("addr:city"),
                "phone": tags.get("phone"),
                "website": tags.get("website"),
                "operator": tags.get("operator"),
                "emergency": tags.get("emergency"),
                "capacity": tags.get("capacity"),
                "facility_type": tags.get("amenity"),  # hospital, clinic, pharmacy...
                "source": "OSM",
                "lon": element["lon"],
                "lat": element["lat"],
            }
            features.append(properties)

    print(f"🗂️ Prepared {len(features)} facilities for DB upsert")
    return features

async def upsert_facilities(pool, features):
    """Upsert facilities into Supabase Postgres."""
    inserted = 0
    async with pool.acquire() as conn:
        for props in features:
            await conn.execute(
                """
                INSERT INTO health_facilities 
                    (name, address, city, postcode, phone, website, operator, emergency,
                     capacity, facility_type, source, geom)
                VALUES 
                    ($1, $2, $3, $4, $5, $6, $7, $8,
                     NULLIF($9, '')::int, $10, $11,
                     ST_SetSRID(ST_Point($12, $13), 4326))
                ON CONFLICT (name, city, facility_type) DO UPDATE SET
                    address   = EXCLUDED.address,
                    postcode  = EXCLUDED.postcode,
                    phone     = EXCLUDED.phone,
                    website   = EXCLUDED.website,
                    operator  = EXCLUDED.operator,
                    emergency = EXCLUDED.emergency,
                    capacity  = EXCLUDED.capacity,
                    geom      = EXCLUDED.geom;
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
                props.get("facility_type"),
                props.get("source"),
                props.get("lon"),
                props.get("lat"),
            )
            inserted += 1

    print(f"✅ Done! Upserted {inserted} facilities into Supabase 🚀")

async def main():
    features = await fetch_facilities()

    # SSL config for Supabase
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    # Create asyncpg pool with statement cache disabled (fix PgBouncer issue)
    pool = await asyncpg.create_pool(
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        host=DB_HOST,
        port=DB_PORT,
        ssl=ssl_context,
        statement_cache_size=0,  # 🔑 Fix DuplicatePreparedStatementError
        min_size=1,
        max_size=5,
    )

    try:
        await upsert_facilities(pool, features)
    finally:
        await pool.close()

if __name__ == "__main__":
    asyncio.run(main())
