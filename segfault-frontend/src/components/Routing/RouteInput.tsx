import { useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  IconButton,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import DirectionsIcon from "@mui/icons-material/Directions";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import CloseIcon from "@mui/icons-material/Close";
import SwapVertIcon from "@mui/icons-material/SwapVert";

interface Coordinates {
  lat: number;
  lng: number;
}

interface RouteInputProps {
  onFindRoute: (start: Coordinates, end: Coordinates) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  selectingPoint: "start" | "end" | null;
  onSelectPoint: (point: "start" | "end") => void;
}

const RouteInput = ({
  onFindRoute,
  onClose,
  isLoading,
  selectingPoint,
  onSelectPoint,
}: RouteInputProps) => {
  const [start, setStart] = useState<Coordinates | null>(null);
  const [end, setEnd] = useState<Coordinates | null>(null);
  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");

  const handleUseMyLocation = (field: "start" | "end") => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        if (field === "start") {
          setStart(coords);
          setStartText(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        } else {
          setEnd(coords);
          setEndText(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        }
      },
      (error) => {
        console.error("Location error:", error);
      }
    );
  };

  const handleSwapLocations = () => {
    const tempStart = start;
    const tempStartText = startText;
    setStart(end);
    setStartText(endText);
    setEnd(tempStart);
    setEndText(tempStartText);
  };

  const handleSubmit = async () => {
    if (start && end) {
      await onFindRoute(start, end);
    }
  };

  // Update coordinates when map selection happens
  const updateFromSelection = (coords: Coordinates) => {
    if (selectingPoint === "start") {
      setStart(coords);
      setStartText(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
    } else if (selectingPoint === "end") {
      setEnd(coords);
      setEndText(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
    }
  };

  // Expose update method via component key pattern (parent calls this)
  (RouteInput as any).updateFromSelection = updateFromSelection;

  return (
    <Paper
      elevation={4}
      sx={{
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 1000,
        width: 320,
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          backgroundColor: "primary.main",
          color: "white",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DirectionsIcon />
          <Typography variant="subtitle1" fontWeight={600}>
            Find Route
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Inputs */}
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <Box sx={{ flex: 1 }}>
            <TextField
              size="small"
              fullWidth
              label="Start"
              value={startText}
              placeholder="Select on map or use location"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => handleUseMyLocation("start")}
                      title="Use my location"
                    >
                      <MyLocationIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: selectingPoint === "start" ? "action.selected" : undefined,
                },
              }}
            />
            <Button
              size="small"
              onClick={() => onSelectPoint("start")}
              sx={{ mt: 0.5, textTransform: "none" }}
              variant={selectingPoint === "start" ? "contained" : "text"}
            >
              {selectingPoint === "start" ? "Click map..." : "Select on map"}
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <IconButton size="small" onClick={handleSwapLocations} title="Swap locations">
            <SwapVertIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <Box sx={{ flex: 1 }}>
            <TextField
              size="small"
              fullWidth
              label="Destination"
              value={endText}
              placeholder="Select on map or use location"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => handleUseMyLocation("end")}
                      title="Use my location"
                    >
                      <MyLocationIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: selectingPoint === "end" ? "action.selected" : undefined,
                },
              }}
            />
            <Button
              size="small"
              onClick={() => onSelectPoint("end")}
              sx={{ mt: 0.5, textTransform: "none" }}
              variant={selectingPoint === "end" ? "contained" : "text"}
            >
              {selectingPoint === "end" ? "Click map..." : "Select on map"}
            </Button>
          </Box>
        </Box>

        <Button
          variant="contained"
          fullWidth
          onClick={handleSubmit}
          disabled={!start || !end || isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <DirectionsIcon />}
          sx={{ mt: 1, py: 1.2 }}
        >
          {isLoading ? "Finding Route..." : "Find Route"}
        </Button>
      </Box>
    </Paper>
  );
};

export default RouteInput;
