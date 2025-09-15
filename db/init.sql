CREATE EXTENSION IF NOT EXISTS postgis;

-- demo table
CREATE TABLE IF NOT EXISTS hospitals (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  geom GEOMETRY(Point, 4326) NOT NULL
);

-- seed a few rows if empty
INSERT INTO hospitals (name, geom)
SELECT * FROM (VALUES
  ('AKH Hospital',       ST_SetSRID(ST_Point(16.345,48.221),4326)),
  ('Ottakring Hospital', ST_SetSRID(ST_Point(16.306,48.210),4326)),
  ('SMZ Ost Hospital',   ST_SetSRID(ST_Point(16.45,48.25),4326))
) AS t(name, geom)
WHERE NOT EXISTS (SELECT 1 FROM hospitals);
