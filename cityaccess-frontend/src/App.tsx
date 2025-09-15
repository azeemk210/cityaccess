import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  Circle,
  LayersControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const { BaseLayer } = LayersControl;

interface Hospital {
  name: string;
  lon: number;
  lat: number;
  address?: string;
  city?: string;
  type?: string;
  capacity?: number;
  distance_m?: number;
  postcode?: string;
  operator?: string;
  emergency?: string;
  phone?: string;
  website?: string;
}

const hospitalIcon = L.icon({
  iconUrl: "/icons/hospital.png",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const nearestIcon = L.icon({
  iconUrl: "/icons/hospital-blue.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function LocationClick({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

export default function App() {
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [nearestHospitals, setNearestHospitals] = useState<Hospital[]>([]);
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(2000);

  // 👇 Pick API URL dynamically
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetch(`${API_URL}/hospitals`)
      .then((res) => res.json())
      .then(setAllHospitals)
      .catch((err) => console.error("Error fetching hospitals:", err));
  }, [API_URL]);

  const handleMapClick = async (lat: number, lng: number) => {
    setCircleCenter([lat, lng]);

    try {
      const res = await fetch(
        `${API_URL}/hospitals/nearest?lon=${lng}&lat=${lat}&dist=${radius}`
      );
      const data = await res.json();
      setNearestHospitals(data);
    } catch (err) {
      console.error("Error fetching nearest:", err);
      setNearestHospitals([]);
    }
  };

  const clearSelection = () => {
    setCircleCenter(null);
    setNearestHospitals([]);
  };

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      <MapContainer center={[48.21, 16.37]} zoom={12} style={{ height: "100%", width: "100%" }}>
        <LayersControl position="topright">
          <BaseLayer checked name="OpenStreetMap">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
          </BaseLayer>
          <BaseLayer name="Carto Light">
            <TileLayer
              url="https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png"
              attribution="&copy; OpenStreetMap, © Carto"
            />
          </BaseLayer>
          <BaseLayer name="Satellite (ESRI)">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles © Esri"
            />
          </BaseLayer>
        </LayersControl>

        <LocationClick onClick={handleMapClick} />

        {/* Hospitals */}
        {allHospitals.map((h, i) => {
          const isNearest = nearestHospitals.some((n) => n.name === h.name);
          const icon = isNearest ? nearestIcon : hospitalIcon;

          return (
            <Marker key={i} position={[h.lat, h.lon]} icon={icon}>
              <Popup>
                <div style={{ minWidth: "220px" }}>
                  <b style={{ fontSize: "16px", color: isNearest ? "blue" : "black" }}>
                    {h.name}
                  </b>
                  <br />
                  📍 {h.address || "No address"} {h.postcode ? `(${h.postcode})` : ""}
                  <br />
                  🏙️ {h.city || "Unknown City"}
                  <br />
                  🏥 Operator: {h.operator || "N/A"}
                  <br />
                  🚑 Emergency: {h.emergency === "yes" ? "✅ Yes" : h.emergency === "no" ? "❌ No" : "Unknown"}
                  <br />
                  👥 Capacity: {h.capacity ? `${h.capacity} beds` : "N/A"}
                  <br />
                  ☎️ {h.phone || "N/A"}
                  <br />
                  🌐{" "}
                  {h.website ? (
                    <a href={h.website} target="_blank" rel="noreferrer">
                      Visit Website
                    </a>
                  ) : (
                    "N/A"
                  )}
                  <br />
                  Lat: {h.lat.toFixed(4)}, Lon: {h.lon.toFixed(4)}
                  {h.distance_m && (
                    <>
                      <br />🚑 Distance: {(h.distance_m / 1000).toFixed(2)} km
                    </>
                  )}
                  <hr />
                  <button
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lon}`,
                        "_blank"
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "6px",
                      border: "none",
                      borderRadius: "4px",
                      background: "#007bff",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    Open in Google Maps
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Circle */}
        {circleCenter && (
          <Circle
            center={circleCenter}
            radius={radius}
            pathOptions={{ color: "blue", fillOpacity: 0.1 }}
          />
        )}
      </MapContainer>

      {/* Distance slider */}
      <div
        style={{
          position: "absolute",
          top: 120,
          right: 10,
          zIndex: 1000,
          background: "white",
          padding: "10px",
          borderRadius: 6,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        }}
      >
        <div>
          Distance: {radius / 1000} km
          <input
            type="range"
            min={1000}
            max={20000}
            step={1000}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          />
        </div>
        <button onClick={clearSelection} style={{ marginTop: "5px" }}>
          Clear Nearest
        </button>
      </div>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          background: "white",
          padding: "6px",
          borderRadius: 6,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          fontSize: "14px",
        }}
      >
        <div>
          <img src="/icons/hospital.png" width={18} /> Hospital
        </div>
        <div>
          <img src="/icons/hospital-blue.png" width={18} /> Nearest Hospital
        </div>
      </div>
    </div>
  );
}
