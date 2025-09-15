from fastapi import FastAPI, HTTPException
import os
import asyncpg
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_NAME = os.getenv("DB_NAME", "cityaccess")
DB_HOST = os.getenv("DB_HOST", "db")  # docker-compose service name
DB_PORT = int(os.getenv("DB_PORT", "5432"))

pool: asyncpg.Pool | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    pool = await asyncpg.create_pool(
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        host=DB_HOST,
        port=DB_PORT,
        min_size=1,
        max_size=10,
        command_timeout=60
    )
    try:
        yield
    finally:
        if pool:
            await pool.close()

app = FastAPI(title="CityAccess API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # for dev; later restrict to ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"ok": True}

@app.get("/hospitals")
async def get_all_hospitals():
    try:
        assert pool is not None
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT name,
                       ST_X(geom) AS lon,
                       ST_Y(geom) AS lat,
                       address,
                       city,
                       postcode,
                       phone,
                       website,
                       operator,
                       emergency,
                       capacity,
                       source
                FROM hospitals
                ORDER BY name;
            """)
        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(500, f"Error fetching hospitals: {e}")

@app.get("/hospitals/nearest")
async def nearest_hospitals(lon: float, lat: float, dist: int = 2000):
    try:
        assert pool is not None
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT name,
                       ST_X(geom) AS lon,
                       ST_Y(geom) AS lat,
                       address,
                       city,
                       postcode,
                       phone,
                       website,
                       operator,
                       emergency,
                       capacity,
                       source,
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

@app.get("/")
def root():
    return {"message": "CityAccess API is running 🚀"}
