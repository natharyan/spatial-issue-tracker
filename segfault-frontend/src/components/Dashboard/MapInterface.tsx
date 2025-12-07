import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  Box,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Fab,
  CircularProgress,
  Typography,
  Tooltip,
} from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import DirectionsIcon from "@mui/icons-material/Directions";
import MapEvents, { type Bounds } from "../Map/MapEvents";
import IssueMarker, { type VisualizationMode } from "../Map/IssueMarker";
import { createClusterIcon } from "../Map/markerIcons";
import RouteRenderer from "../Routing/RouteRenderer";
import { issueRoutes, routeRoutes, type MapIssue, type RouteResult } from "../../api/routes";

// Leaflet CSS imports
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

import type { FilterState } from "./DashboardLayout";

interface MapInterfaceProps {
  onPinClick: (issueId: string) => void;
  filters?: FilterState;
}

// Default center (Delhi, India - can be changed to any default location)
const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];
const DEFAULT_ZOOM = 13;

// Component to handle map click for route selection
const RoutePointSelector = ({
  onPointSelect,
  isActive,
}: {
  onPointSelect: (lat: number, lng: number) => void;
  isActive: boolean;
}) => {
  useMapEvents({
    click: (e) => {
      if (isActive) {
        onPointSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

const MapInterface = ({ onPinClick, filters }: MapInterfaceProps) => {
  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [viewMode, setViewMode] = useState<VisualizationMode>("status");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const boundsRef = useRef<Bounds | null>(null);

  // Routing state
  const [showRouting, setShowRouting] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [selectingPoint, setSelectingPoint] = useState<"start" | "end" | null>(null);
  const [routeStart, setRouteStart] = useState<{ lat: number; lng: number } | null>(null);
  const [routeEnd, setRouteEnd] = useState<{ lat: number; lng: number } | null>(null);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("Geolocation error:", error.message);
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
      const issuesFilters = filters ? {
          issueType: filters.issueType || undefined,
          statusOpen: filters.statusOpen,
          statusInProgress: filters.statusInProgress,
          urgency: filters.urgency || undefined,
          showResolved: filters.showResolved
      } : undefined;

      const data = await issueRoutes.getMapIssues(bounds, issuesFilters);
      setIssues(data);
    } catch (error) {
      console.error("Failed to fetch map issues:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleBoundsChange = useCallback(
    (bounds: Bounds) => {
      fetchIssues(bounds);
    },
    [fetchIssues]
  );
  
  // Refetch when filters change (using current bounds)
  useEffect(() => {
    if (boundsRef.current) {
        fetchIssues(boundsRef.current);
    }
  }, [filters, fetchIssues]);

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: VisualizationMode | null
  ) => {
    if (newMode) {
      setViewMode(newMode);
    }
  };

  const handleRecenter = () => {
    const targetLocation = userLocation || DEFAULT_CENTER;
    if (mapRef.current) {
      mapRef.current.setView(targetLocation, DEFAULT_ZOOM);
    }
  };

  // Routing handlers
  const handleFindRoute = async (
    start: { lat: number; lng: number },
    end: { lat: number; lng: number }
  ) => {
    setRouteLoading(true);
    setRouteResult(null);
    try {
      const result = await routeRoutes.findRoute(start, end);
      setRouteResult(result);
    } catch (error) {
      console.error("Failed to find route:", error);
      alert("Could not find a route. Make sure the graph data is loaded for this area.");
    } finally {
      setRouteLoading(false);
    }
  };

  const handleCloseRouting = () => {
    setShowRouting(false);
    setRouteResult(null);
    setSelectingPoint(null);
    setRouteStart(null);
    setRouteEnd(null);
  };

  const handlePointSelect = (lat: number, lng: number) => {
    if (selectingPoint === "start") {
      setRouteStart({ lat, lng });
    } else if (selectingPoint === "end") {
      setRouteEnd({ lat, lng });
    }
    setSelectingPoint(null);
  };

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
        style={{ height: "100%", width: "100%", cursor: selectingPoint ? "crosshair" : undefined }}
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
        <RoutePointSelector onPointSelect={handlePointSelect} isActive={selectingPoint !== null} />

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

        {/* Render route if available */}
        {routeResult && <RouteRenderer path={routeResult.path} />}
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

      {/* Routing Panel */}
      {showRouting && (
        <RouteInputWrapper
          onFindRoute={handleFindRoute}
          onClose={handleCloseRouting}
          isLoading={routeLoading}
          selectingPoint={selectingPoint}
          onSelectPoint={setSelectingPoint}
          start={routeStart}
          end={routeEnd}
        />
      )}

      {/* Route Info */}
      {routeResult && (
        <Box
          sx={{
            position: "absolute",
            bottom: 80,
            left: 16,
            zIndex: 1000,
            backgroundColor: "rgba(255,255,255,0.95)",
            borderRadius: 2,
            px: 2,
            py: 1.5,
            boxShadow: 3,
          }}
        >
          <Typography variant="subtitle2" fontWeight={600}>
            Route Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Distance: {(routeResult.totalDistance / 1000).toFixed(1)} km
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Est. Time: {routeResult.estimatedTime} min
          </Typography>
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

      {/* Issue count badge - only show when routing is not active */}
      {!showRouting && (
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
      )}

      {/* Directions FAB - Bottom Left */}
      <Tooltip title="Find Route">
        <Fab
          color={showRouting ? "secondary" : "default"}
          size="medium"
          onClick={() => setShowRouting(!showRouting)}
          sx={{
            position: "absolute",
            bottom: 24,
            left: 16,
            zIndex: 1000,
          }}
        >
          <DirectionsIcon />
        </Fab>
      </Tooltip>

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

      {/* Map styles */}
      <style>{`
        .custom-marker-icon {
          background: transparent;
          border: none;
        }
        .custom-cluster-container {
          background: transparent;
          border: none;
        }
        .route-marker-icon {
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

// Wrapper for RouteInput to handle the controlled state
const RouteInputWrapper = ({
  onFindRoute,
  onClose,
  isLoading,
  selectingPoint,
  onSelectPoint,
  start,
  end,
}: {
  onFindRoute: (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  selectingPoint: "start" | "end" | null;
  onSelectPoint: (point: "start" | "end") => void;
  start: { lat: number; lng: number } | null;
  end: { lat: number; lng: number } | null;
}) => {
  const [startCoords, setStartCoords] = useState(start);
  const [endCoords, setEndCoords] = useState(end);

  // Sync with parent state
  useEffect(() => {
    if (start) setStartCoords(start);
  }, [start]);

  useEffect(() => {
    if (end) setEndCoords(end);
  }, [end]);

  const handleSubmit = async () => {
    if (startCoords && endCoords) {
      await onFindRoute(startCoords, endCoords);
    }
  };

  return (
    <Box
      sx={{
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 1000,
        width: 300,
      }}
    >
      <Paper elevation={4} sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DirectionsIcon fontSize="small" /> Find Route
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Start</Typography>
            <Typography variant="body2">
              {startCoords ? `${startCoords.lat.toFixed(5)}, ${startCoords.lng.toFixed(5)}` : "Click 'Select' then click map"}
            </Typography>
            <Box
              component="button"
              onClick={() => onSelectPoint("start")}
              sx={{
                mt: 0.5,
                px: 1,
                py: 0.5,
                fontSize: "0.75rem",
                border: "1px solid",
                borderColor: selectingPoint === "start" ? "primary.main" : "divider",
                borderRadius: 1,
                backgroundColor: selectingPoint === "start" ? "primary.light" : "transparent",
                cursor: "pointer",
              }}
            >
              {selectingPoint === "start" ? "Click on map..." : "Select on map"}
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Destination</Typography>
            <Typography variant="body2">
              {endCoords ? `${endCoords.lat.toFixed(5)}, ${endCoords.lng.toFixed(5)}` : "Click 'Select' then click map"}
            </Typography>
            <Box
              component="button"
              onClick={() => onSelectPoint("end")}
              sx={{
                mt: 0.5,
                px: 1,
                py: 0.5,
                fontSize: "0.75rem",
                border: "1px solid",
                borderColor: selectingPoint === "end" ? "primary.main" : "divider",
                borderRadius: 1,
                backgroundColor: selectingPoint === "end" ? "primary.light" : "transparent",
                cursor: "pointer",
              }}
            >
              {selectingPoint === "end" ? "Click on map..." : "Select on map"}
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Box
              component="button"
              onClick={handleSubmit}
              disabled={!startCoords || !endCoords || isLoading}
              sx={{
                flex: 1,
                py: 1,
                backgroundColor: "primary.main",
                color: "white",
                border: "none",
                borderRadius: 1,
                cursor: startCoords && endCoords && !isLoading ? "pointer" : "not-allowed",
                opacity: startCoords && endCoords && !isLoading ? 1 : 0.5,
              }}
            >
              {isLoading ? "Finding..." : "Find Route"}
            </Box>
            <Box
              component="button"
              onClick={onClose}
              sx={{
                px: 2,
                py: 1,
                backgroundColor: "transparent",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                cursor: "pointer",
              }}
            >
              Close
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default MapInterface;
