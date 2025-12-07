import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  Box,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Fab,
  CircularProgress,
  Typography,
} from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import MapEvents, { type Bounds } from "../Map/MapEvents";
import IssueMarker, { type VisualizationMode } from "../Map/IssueMarker";
import { createClusterIcon } from "../Map/markerIcons";
import { issueRoutes, type MapIssue } from "../../api/routes";

// Leaflet CSS imports
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

interface MapInterfaceProps {
  onPinClick: (issueId: string) => void;
}

// Default center (Delhi, India - can be changed to any default location)
const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];
const DEFAULT_ZOOM = 13;

const MapInterface = ({ onPinClick }: MapInterfaceProps) => {
  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [viewMode, setViewMode] = useState<VisualizationMode>("status");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const boundsRef = useRef<Bounds | null>(null);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("Geolocation error:", error.message);
          // Keep using default location
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Fetch issues when bounds change
  const fetchIssues = useCallback(async (bounds: Bounds) => {
    boundsRef.current = bounds;
    setLoading(true);
    try {
      const data = await issueRoutes.getMapIssues(bounds);
      setIssues(data);
    } catch (error) {
      console.error("Failed to fetch map issues:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle bounds change from map events
  const handleBoundsChange = useCallback(
    (bounds: Bounds) => {
      fetchIssues(bounds);
    },
    [fetchIssues]
  );

  // Handle visualization mode change
  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: VisualizationMode | null
  ) => {
    if (newMode) {
      setViewMode(newMode);
    }
  };

  // Recenter map to user location
  const handleRecenter = () => {
    const targetLocation = userLocation || DEFAULT_CENTER;
    if (mapRef.current) {
      mapRef.current.setView(targetLocation, DEFAULT_ZOOM);
    }
  };

  // Initial center: user location or default
  const initialCenter = userLocation || DEFAULT_CENTER;

  return (
    <Paper
      elevation={0}
      sx={{
        height: "calc(100vh - 200px)",
        minHeight: 400,
        position: "relative",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={initialCenter}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        ref={(map) => {
          if (map) {
            mapRef.current = map;
            if (!mapReady) {
              setMapReady(true);
            }
          }
        }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEvents onBoundsChange={handleBoundsChange} />

        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
        >
          {issues.map((issue) => (
            <IssueMarker
              key={issue.id}
              issue={issue}
              visualizationMode={viewMode}
              onClick={onPinClick}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Loading indicator */}
      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            backgroundColor: "rgba(255,255,255,0.9)",
            borderRadius: 2,
            px: 2,
            py: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
            boxShadow: 2,
          }}
        >
          <CircularProgress size={16} />
          <Typography variant="body2">Loading issues...</Typography>
        </Box>
      )}

      {/* Visualization Mode Toggle - Top Right */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <Paper elevation={3} sx={{ borderRadius: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                px: 2,
                py: 1,
                textTransform: "none",
              },
            }}
          >
            <ToggleButton value="status">Status</ToggleButton>
            <ToggleButton value="urgency">Urgency</ToggleButton>
          </ToggleButtonGroup>
        </Paper>
      </Box>

      {/* Issue count badge */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 1000,
          backgroundColor: "rgba(255,255,255,0.95)",
          borderRadius: 2,
          px: 2,
          py: 1,
          boxShadow: 2,
        }}
      >
        <Typography variant="body2" fontWeight={600}>
          {issues.length} issue{issues.length !== 1 ? "s" : ""} in view
        </Typography>
      </Box>

      {/* Recenter FAB - Bottom Right */}
      <Fab
        color="primary"
        size="medium"
        onClick={handleRecenter}
        sx={{
          position: "absolute",
          bottom: 24,
          right: 16,
          zIndex: 1000,
        }}
        title="Center on my location"
      >
        <MyLocationIcon />
      </Fab>

      {/* Map styles for cluster icons */}
      <style>{`
        .custom-marker-icon {
          background: transparent;
          border: none;
        }
        .custom-cluster-container {
          background: transparent;
          border: none;
        }
        .cluster-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: white;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .cluster-small {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          font-size: 14px;
        }
        .cluster-medium {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          font-size: 16px;
        }
        .cluster-large {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          font-size: 18px;
        }
      `}</style>
    </Paper>
  );
};

export default MapInterface;
