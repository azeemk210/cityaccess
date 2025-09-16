from fastapi import FastAPI, HTTPException
import os
import asyncpg
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import ssl
from dotenv import load_dotenv
from typing import Optional

# 🔹 Load .env file
load_dotenv()

# 🔹 Database config from Supabase
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_HOST = os.getenv("DB_HOST", "")
DB_PORT = int(os.getenv("DB_PORT", "5432"))

pool: Optional[asyncpg.Pool] = None

# 🔹 Create SSL context for Supabase
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    pool = await asyncpg.create_pool(
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        host=DB_HOST,
        port=DB_PORT,
        ssl=ssl_context,
        min_size=1,
        max_size=10,
        command_timeout=60,
    )
    try:
        yield
    finally:
        if pool:
            await pool.close()

# ✅ FastAPI app
app = FastAPI(title="CityAccess API", lifespan=lifespan)

# ✅ CORS (React frontend at :5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # better: ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "CityAccess API is running 🚀"}

@app.get("/health")
async def health():
    return {"ok": True}

# ========================================================
# 🏥 HOSPITALS ENDPOINTS
# ========================================================

@app.get("/hospitals")
async def get_all_hospitals():
    """Fetch all hospitals from `hospitals` table"""
    try:
        assert pool is not None
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, name, ST_X(geom) AS lon, ST_Y(geom) AS lat,
                       address, city, postcode, phone, website, operator,
                       emergency, capacity
                FROM hospitals
                ORDER BY name;
            """)
        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(500, f"Error fetching hospitals: {e}")

@app.get("/hospitals/nearest")
async def nearest_hospitals(lon: float, lat: float, dist: int = 2000):
    """Find nearest hospitals"""
    try:
        assert pool is not None
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, name, ST_X(geom) AS lon, ST_Y(geom) AS lat,
                       address, city, postcode, phone, website, operator,
                       emergency, capacity,
                       ST_Distance(
                         geom::geography,
                         ST_SetSRID(ST_Point($1,$2),4326)::geography
                       ) AS distance_m
                FROM hospitals
                WHERE ST_DWithin(
                  geom::geography,
                  ST_SetSRID(ST_Point($1,$2),4326)::geography,
                  $3
                )
                ORDER BY distance_m
                LIMIT 10;
            """, lon, lat, dist)
        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(500, f"Error fetching nearest hospitals: {e}")

# ========================================================
# 🏥 HEALTH FACILITIES ENDPOINTS
# ========================================================

@app.get("/facilities")
async def get_facilities():
    """Fetch all facilities from `health_facilities` table"""
    try:
        assert pool is not None
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, name, facility_type, address, city, postcode,
                       phone, website, operator, emergency, capacity,
                       ST_X(geom) AS lon, ST_Y(geom) AS lat
                FROM health_facilities
                ORDER BY name;
            """)
        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(500, f"Error fetching facilities: {e}")

@app.get("/facilities/nearest")
async def nearest_facilities(
    lon: float,
    lat: float,
    dist: int = 2000,
    facility_type: str = None  # optional filter
):
    """Find nearest facilities (optionally filter by facility_type)"""
    try:
        assert pool is not None
        async with pool.acquire() as conn:
            if facility_type:
                query = """
                    SELECT id, name, facility_type, address, city, postcode,
                           phone, website, operator, emergency, capacity,
                           ST_X(geom) AS lon, ST_Y(geom) AS lat,
                           ST_Distance(
                             geom::geography,
                             ST_SetSRID(ST_Point($1,$2),4326)::geography
                           ) AS distance_m
                    FROM health_facilities
                    WHERE facility_type = $4
                      AND ST_DWithin(
                          geom::geography,
                          ST_SetSRID(ST_Point($1,$2),4326)::geography,
                          $3
                      )
                    ORDER BY distance_m
                    LIMIT 20;
                """
                rows = await conn.fetch(query, lon, lat, dist, facility_type)
            else:
                query = """
                    SELECT id, name, facility_type, address, city, postcode,
                           phone, website, operator, emergency, capacity,
                           ST_X(geom) AS lon, ST_Y(geom) AS lat,
                           ST_Distance(
                             geom::geography,
                             ST_SetSRID(ST_Point($1,$2),4326)::geography
                           ) AS distance_m
                    FROM health_facilities
                    WHERE ST_DWithin(
                          geom::geography,
                          ST_SetSRID(ST_Point($1,$2),4326)::geography,
                          $3
                      )
                    ORDER BY distance_m
                    LIMIT 20;
                """
                rows = await conn.fetch(query, lon, lat, dist)

        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(500, f"Error fetching nearest facilities: {e}")
