import { useMapEvents } from "react-leaflet";

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface MapEventsProps {
  onBoundsChange: (bounds: Bounds) => void;
}

/**
 * A helper component that listens for map events (pan/zoom) and
 * notifies the parent when bounds change.
 */
const MapEvents = ({ onBoundsChange }: MapEventsProps) => {
  useMapEvents({
    moveend: (e) => {
      const map = e.target;
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      onBoundsChange({
        minLat: sw.lat,
        maxLat: ne.lat,
        minLng: sw.lng,
        maxLng: ne.lng,
      });
    },
    // Also trigger on initial load
    load: (e) => {
      const map = e.target;
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      onBoundsChange({
        minLat: sw.lat,
        maxLat: ne.lat,
        minLng: sw.lng,
        maxLng: ne.lng,
      });
    },
  });

  return null;
};

export default MapEvents;
