import { Polyline, Marker } from "react-leaflet";
import L from "leaflet";

interface PathPoint {
  lat: number;
  lng: number;
}

interface RouteRendererProps {
  path: PathPoint[];
  totalDistance?: number;
  estimatedTime?: number;
}

// Custom icons for start/end markers
const startIcon = L.divIcon({
  html: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#22c55e" stroke="white" stroke-width="3"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>
  `,
  className: "route-marker-icon",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const endIcon = L.divIcon({
  html: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#ef4444" stroke="white" stroke-width="3"/>
      <rect x="10" y="10" width="12" height="12" fill="white" rx="2"/>
    </svg>
  `,
  className: "route-marker-icon",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

/**
 * Renders a route polyline on the map with start/end markers
 */
const RouteRenderer = ({ path }: RouteRendererProps) => {
  if (!path || path.length < 2) return null;

  const positions: [number, number][] = path.map((p) => [p.lat, p.lng]);
  const startPoint = path[0];
  const endPoint = path[path.length - 1];

  return (
    <>
      {/* Route polyline */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: "#3b82f6",
          weight: 5,
          opacity: 0.8,
          lineCap: "round",
          lineJoin: "round",
        }}
      />

      {/* Shadow line for depth effect */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: "#1e40af",
          weight: 8,
          opacity: 0.3,
          lineCap: "round",
          lineJoin: "round",
        }}
      />

      {/* Start marker */}
      <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon} />

      {/* End marker */}
      <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon} />
    </>
  );
};

export default RouteRenderer;
