import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

interface DistanceControlProps {
  distance: number;
  setDistance: (val: number) => void;
}

export default function DistanceControl({ distance, setDistance }: DistanceControlProps) {
  const map = useMap();

  useEffect(() => {
    const DistanceControl = L.Control.extend({
      onAdd: () => {
        const div = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        div.style.background = "white";
        div.style.padding = "8px";
        div.style.marginTop = "8px"; // pushes it below LayerControl
        div.style.fontSize = "12px";
        div.style.lineHeight = "1.2";

        // prevent map from dragging when using slider
        L.DomEvent.disableClickPropagation(div);

        div.innerHTML = `
          <label style="font-weight:bold; display:block; margin-bottom:4px;">
            Distance: ${(distance / 1000).toFixed(1)} km
          </label>
          <input type="range" min="1000" max="20000" step="1000" value="${distance}" style="width: 120px;" />
        `;

        const input = div.querySelector("input") as HTMLInputElement;
        input.addEventListener("input", (e) => {
          const val = Number((e.target as HTMLInputElement).value);
          setDistance(val);
        });

        return div;
      },
    });

    const control = new DistanceControl({ position: "topright" });
    map.addControl(control);

    return () => {
      map.removeControl(control);
    };
  }, [map, distance, setDistance]);

  return null;
}
