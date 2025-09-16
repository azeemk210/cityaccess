# 🌆 CityAccess Project

CityAccess is a **full-stack web application** that helps users find hospitals nearby.  
It combines **OpenStreetMap data**, **Supabase Postgres with PostGIS**, **FastAPI**, and a **React + Leaflet frontend** deployed online.

---

## 🏗️ Architecture

```
Supabase (Postgres + PostGIS)
        ⬇️
   FastAPI Backend (Render, Docker)
        ⬇️
   REST API (Hospitals, Nearest Hospitals)
        ⬇️
React + Leaflet Frontend (Render Static Site)
```

---

## 🗄️ Database (Supabase + PostGIS)
- Table: `hospitals`
- Columns: `id, name, address, city, postcode, operator, capacity, emergency, phone, website, geom (Point)`
- Imported data from OpenStreetMap using a Python script (`fetch_hospitals.py`).
- Geospatial queries powered by **PostGIS**.

---

## 🐍 Backend (FastAPI on Render)
- Written with **FastAPI** and deployed on **Render (Docker)**.
- Endpoints:
  - `/health` → Service check
  - `/hospitals` → List all hospitals
  - `/hospitals/nearest?lat=&lon=&dist=` → Nearest hospitals with distance
- Uses **asyncpg** for efficient DB pooling.
- CORS middleware enabled for frontend access.
- Environment variables (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, etc.) securely managed in Render.

🔗 Live API: [https://cityaccess.onrender.com](https://cityaccess.onrender.com)

---

## ⚛️ Frontend (React + Vite + Leaflet)
- Built with **React + Vite + TypeScript + React Leaflet**.
- Features:
  - 📍 All hospitals (red markers)
  - 🔵 Nearest hospitals on click (blue markers)
  - 📏 Distance slider (1–20 km) with circle radius
  - 🏥 Popups with hospital details (address, capacity, emergency status, website, phone, Google Maps link)
  - 🌍 Multiple basemaps: OpenStreetMap, Carto Light, ESRI Satellite
  - 🗺️ Legend for markers
  - ✅ Counter showing **Hospitals Loaded: X**
- Configured with `VITE_API_URL` for flexible backend switching (localhost vs production).

🔗 Live Frontend: [https://cityaccess-frontend.onrender.com](https://cityaccess-frontend.onrender.com)

---

## 🔄 CI/CD Pipeline
- **Connected to GitHub** (main branch).
- On every push:
  1. Render pulls latest commit.
  2. Installs dependencies (`npm install` / `pip install`).
  3. Builds (`vite build` / Docker build).
  4. Deploys live app automatically.
- Debugged dependency conflicts:
  - React 19 not supported by React-Leaflet → downgraded to React 18.
  - Used `--legacy-peer-deps` when necessary.

---

## 🚀 Tech Stack
- **Database**: Supabase (Postgres + PostGIS)
- **Backend**: FastAPI, asyncpg, Docker, Render
- **Frontend**: React, Vite, TypeScript, Leaflet, Render Static Site
- **Deployment**: Render (CI/CD pipeline via GitHub)

---

## ✅ Final Status
- Hospitals successfully imported and served from Supabase.
- Backend API live on Render.
- Frontend live on Render, consuming API.
- CI/CD pipeline working — every GitHub push auto-builds and deploys.

---

## 🌟 Live Links
- **Backend API**: [https://cityaccess.onrender.com](https://cityaccess.onrender.com)
- **Frontend App**: [https://cityaccess-frontend.onrender.com](https://cityaccess-frontend.onrender.com)
