# 🏥 CityAccess

CityAccess is a web application to help users find the nearest hospitals in Austria.  
It uses **FastAPI + PostGIS** for the backend and **React + Leaflet** for the frontend.

---

## 🚀 Features
- Fetches hospital data from **OpenStreetMap (Overpass API)**.
- Stores hospital details in **PostgreSQL + PostGIS**.
- Backend API built with **FastAPI**.
- Interactive frontend map built with **React + Vite + Leaflet**.
- Shows **nearest hospitals** with search radius (circle).
- Multiple basemaps (OSM, Carto Light, Satellite).
- Popup with hospital details + Google Maps link.

---

## 🛠️ Tech Stack
- **Backend:** FastAPI, asyncpg, PostGIS
- **Frontend:** React, Vite, Leaflet
- **Database:** PostgreSQL + PostGIS
- **Deployment:** Render (backend), Vercel (frontend), Supabase (database)

---

## 📂 Project Structure
```
CITYACCESS/
├── api/              # FastAPI backend
├── cityaccess-frontend/  # React frontend
├── db/               # DB init scripts
├── docker-compose.yml
```

---

## ⚡ Running Locally

### 1. Start Database + Backend
```bash
docker-compose up --build
```

### 2. Start Frontend
```bash
cd cityaccess-frontend
npm install
npm run dev
```

App runs at:  
Frontend → http://localhost:5173  
Backend → http://localhost:8000  
API Docs → http://localhost:8000/docs

---

## 🌍 Deployment
- Backend → [Render](https://render.com/)  
- Frontend → [Vercel](https://vercel.com/)  
- Database → [Supabase](https://supabase.com/)  
