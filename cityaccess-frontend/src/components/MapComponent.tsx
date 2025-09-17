import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

// Fix for Leaflet default marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => void })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom hospital icon
const hospitalIcon = L.divIcon({
  html: `<div style="
    background: red;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid white;
  "></div>`,
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Nearest hospital icon
const nearestIcon = L.divIcon({
  html: `<div style="
    background: blue;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid yellow;
  "></div>`,
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Cluster icon
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let color = "green";

  if (count >= 10 && count < 50) color = "orange";
  else if (count >= 50) color = "red";

  return L.divIcon({
    html: `<div style="
      background: ${color};
      color: white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${count}</div>`,
    className: "",
    iconSize: L.point(40, 40, true),
  });
};

interface Hospital {
  name: string;
  lon: number;
  lat: number;
  distance_m?: number;
}

function MapClickHandler({ onMapClick }: { onMapClick: (e: any) => void }) {
  useMapEvents({ click: onMapClick });
  return null;
}

export default function MapComponent() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [search, setSearch] = useState("");
  const [nearest, setNearest] = useState<Hospital[]>([]);
  const [circle, setCircle] = useState<{ lat: number; lon: number; dist: number } | null>(null);
  const [distance, setDistance] = useState(5000);

  useEffect(() => {
    fetch("http://localhost:8000/hospitals")
      .then((res) => res.json())
      .then(setHospitals)
      .catch((err) => console.error("Error fetching hospitals:", err));
  }, []);

  const handleMapClick = (e: any) => {
    const { lat, lng } = e.latlng;
    fetch(`http://localhost:8000/hospitals/nearest?lon=${lng}&lat=${lat}&dist=${distance}`)
      .then((res) => res.json())
      .then((data) => {
        setNearest(data);
        setCircle({ lat, lon: lng, dist: distance });
      })
      .catch((err) => console.error("Error fetching nearest:", err));
  };

  // Apply search filter
  const filteredHospitals = hospitals.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      {/* Control Panel */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1000,
          background: "white",
          padding: 12,
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          minWidth: "200px",
        }}
      >
        <input
          type="text"
          placeholder="Search hospitals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginBottom: "8px",
            width: "100%",
            padding: "6px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <div style={{ marginBottom: "8px" }}>
          Distance: {distance / 1000} km
          <input
            type="range"
            min={1000}
            max={20000}
            step={1000}
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
        <button
          onClick={() => {
            setNearest([]);
            setCircle(null);
          }}
          style={{
            width: "100%",
            padding: "6px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Clear Nearest ({nearest.length} selected)
        </button>
        <div style={{ marginTop: 10, fontSize: "12px" }}>
          <b>Legend:</b>
          <div>🟢 Small (&lt;10)</div>
          <div>🟠 Medium (10–50)</div>
          <div>🔴 Large (&gt;50)</div>
          <div style={{ marginTop: 5 }}>🔵 Nearest hospital</div>
          <div>🔴 Regular hospital</div>
        </div>
      </div>

      {/* Map */}
      <MapContainer center={[47.5162, 14.55]} zoom={7} style={{ height: "100%", width: "100%" }}>
        <MapClickHandler onMapClick={handleMapClick} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Clustered Hospitals */}
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
        >
          {filteredHospitals.map((h, i) => {
            const isNearest = nearest.some((n) => n.name === h.name);
            return (
              <Marker
                key={i}
                position={[h.lat, h.lon]}
                icon={isNearest ? nearestIcon : hospitalIcon}
              >
                <Popup>
                  <b>{h.name}</b>
                  {isNearest && h.distance_m && (
                    <div>Distance: {(h.distance_m / 1000).toFixed(2)} km</div>
                  )}
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>

        {/* Circle */}
        {circle && (
          <Circle
            center={[circle.lat, circle.lon]}
            radius={circle.dist}
            pathOptions={{ color: "blue", fillOpacity: 0.1 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
