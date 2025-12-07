import { useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Box, Typography } from "@mui/material";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

// Inner component to handle draggable marker
const DraggableMarker = ({
  position,
  onDragEnd,
}: {
  position: [number, number];
  onDragEnd: (lat: number, lng: number) => void;
}) => {
  const markerRef = React.useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const latlng = marker.getLatLng();
          onDragEnd(latlng.lat, latlng.lng);
        }
      },
    }),
    [onDragEnd]
  );

  return <Marker draggable={true} eventHandlers={eventHandlers} position={position} ref={markerRef} />;
};

// Component to handle map clicks
const MapClickHandler = ({ onClick }: { onClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Need to import React for the ref
import React from "react";

/**
 * LocationPicker - A simplified map for selecting a location by dragging a pin
 */
const LocationPicker = ({ lat, lng, onChange }: LocationPickerProps) => {
  // Default to a central location if no coordinates provided
  const defaultLat = 28.6139; // Delhi, India (example default)
  const defaultLng = 77.209;

  const [position, setPosition] = useState<[number, number]>([lat ?? defaultLat, lng ?? defaultLng]);

  const handleDragEnd = useCallback(
    (newLat: number, newLng: number) => {
      setPosition([newLat, newLng]);
      onChange(newLat, newLng);
    },
    [onChange]
  );

  const handleClick = useCallback(
    (clickLat: number, clickLng: number) => {
      setPosition([clickLat, clickLng]);
      onChange(clickLat, clickLng);
    },
    [onChange]
  );

  return (
    <Box sx={{ height: 300, width: "100%", borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
      <Typography
        variant="caption"
        sx={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 1000,
          backgroundColor: "rgba(255,255,255,0.9)",
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontWeight: 500,
        }}
      >
        Drag marker or click to set location
      </Typography>
      <MapContainer
        center={position}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onClick={handleClick} />
        <DraggableMarker position={position} onDragEnd={handleDragEnd} />
      </MapContainer>
    </Box>
  );
};

export default LocationPicker;
