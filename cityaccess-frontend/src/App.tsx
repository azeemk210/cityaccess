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

interface Facility {
  id: number;
  name: string;
  lon: number;
  lat: number;
  facility_type?: string;
  address?: string;
  city?: string;
  postcode?: string;
  operator?: string;
  emergency?: string;
  capacity?: number;
  phone?: string;
  website?: string;
  distance_m?: number;
}

// 🔹 Icons for each facility type
const iconMap: Record<string, L.Icon> = {
  hospital: L.icon({
    iconUrl: "/icons/hospital.png",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  }),
  pharmacy: L.icon({
    iconUrl: "/icons/pharmacy.png",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  }),
  clinic: L.icon({
    iconUrl: "/icons/clinic.png",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  }),
  doctor: L.icon({
    iconUrl: "/icons/doctor.png",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  }),
  dentist: L.icon({
    iconUrl: "/icons/dentist.png",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  }),
  laboratory: L.icon({
    iconUrl: "/icons/laboratory.png",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  }),
  nearest: L.icon({
    iconUrl: "/icons/hospital-blue.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  }),
  default: L.icon({
    iconUrl: "/icons/facility.png",
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22],
  }),
};

// 🔹 Handle map clicks
function LocationClick({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

export default function App() {
  const [allFacilities, setAllFacilities] = useState<Facility[]>([]);
  const [nearestFacilities, setNearestFacilities] = useState<Facility[]>([]);
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(2000);

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  // Fetch all facilities
  useEffect(() => {
    fetch(`${API_URL}/facilities`)
      .then((res) => res.json())
      .then(setAllFacilities)
      .catch((err) => console.error("Error fetching facilities:", err));
  }, [API_URL]);

  // Handle nearest facility fetch
  const handleMapClick = async (lat: number, lng: number) => {
    setCircleCenter([lat, lng]);
    try {
      const res = await fetch(
        `${API_URL}/facilities/nearest?lon=${lng}&lat=${lat}&dist=${radius}`
      );
      const data = await res.json();
      setNearestFacilities(data);
    } catch (err) {
      console.error("Error fetching nearest facilities:", err);
      setNearestFacilities([]);
    }
  };

  const clearSelection = () => {
    setCircleCenter(null);
    setNearestFacilities([]);
  };

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      {/* ✅ Facility counter */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1000,
          background: "white",
          padding: "6px 10px",
          borderRadius: 6,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          fontSize: "14px",
          fontWeight: "bold",
        }}
      >
        🏥 Facilities Loaded: {allFacilities.length}
      </div>

      {/* ✅ Map */}
      <MapContainer
        center={[48.21, 16.37]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
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

        {/* ✅ Facilities Markers */}
        {allFacilities.map((f, i) => {
          const isNearest = nearestFacilities.some((n) => n.id === f.id);
          const type = f.facility_type?.toLowerCase() || "default";
          const icon = isNearest ? iconMap["nearest"] : iconMap[type] || iconMap["default"];

          return (
            <Marker key={i} position={[f.lat, f.lon]} icon={icon}>
              <Popup>
                <div style={{ minWidth: "220px" }}>
                  <b style={{ fontSize: "16px", color: isNearest ? "blue" : "black" }}>
                    {f.name}
                  </b>
                  <br />
                  📍 {f.address || "No address"} {f.postcode ? `(${f.postcode})` : ""}
                  <br />
                  🏙️ {f.city || "Unknown City"}
                  <br />
                  🏥 Type: {f.facility_type || "N/A"}
                  <br />
                  🏥 Operator: {f.operator || "N/A"}
                  <br />
                  🚑 Emergency:{" "}
                  {f.emergency === "yes"
                    ? "✅ Yes"
                    : f.emergency === "no"
                    ? "❌ No"
                    : "Unknown"}
                  <br />
                  👥 Capacity: {f.capacity ? `${f.capacity} beds` : "N/A"}
                  <br />
                  ☎️ {f.phone || "N/A"}
                  <br />
                  🌐{" "}
                  {f.website ? (
                    <a href={f.website} target="_blank" rel="noreferrer">
                      Visit Website
                    </a>
                  ) : (
                    "N/A"
                  )}
                  <br />
                  Lat: {f.lat.toFixed(4)}, Lon: {f.lon.toFixed(4)}
                  {f.distance_m && (
                    <>
                      <br />🚑 Distance: {(f.distance_m / 1000).toFixed(2)} km
                    </>
                  )}
                  <hr />
                  <button
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lon}`,
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

        {/* ✅ Circle */}
        {circleCenter && (
          <Circle
            center={circleCenter}
            radius={radius}
            pathOptions={{ color: "blue", fillOpacity: 0.1 }}
          />
        )}
      </MapContainer>

      {/* ✅ Distance Slider */}
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

      {/* ✅ Static Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          zIndex: 2000,
          background: "white",
          padding: "8px 12px",
          borderRadius: 6,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          fontSize: "14px",
        }}
      >
        <div><img src="/icons/hospital.png" width={18} style={{ marginRight: 6 }} /> Hospital</div>
        <div><img src="/icons/pharmacy.png" width={18} style={{ marginRight: 6 }} /> Pharmacy</div>
        <div><img src="/icons/clinic.png" width={18} style={{ marginRight: 6 }} /> Clinic</div>
        <div><img src="/icons/doctor.png" width={18} style={{ marginRight: 6 }} /> Doctor</div>
        <div><img src="/icons/dentist.png" width={18} style={{ marginRight: 6 }} /> Dentist</div>
        <div><img src="/icons/laboratory.png" width={18} style={{ marginRight: 6 }} /> Laboratory</div>
        <div><img src="/icons/facility.png" width={18} style={{ marginRight: 6 }} /> Other Facility</div>
        <div><img src="/icons/hospital-blue.png" width={18} style={{ marginRight: 6 }} /> Nearest Selection</div>
      </div>
    </div>
  );
}
