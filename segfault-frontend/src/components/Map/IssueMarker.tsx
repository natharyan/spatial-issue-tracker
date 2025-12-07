import { Marker, Popup } from "react-leaflet";
import { Box, Typography, Button, Chip } from "@mui/material";
import { getStatusIcon, getUrgencyIcon } from "./markerIcons";
import type { MapIssue } from "../../api/routes";

export type VisualizationMode = "status" | "urgency";

interface IssueMarkerProps {
  issue: MapIssue;
  visualizationMode: VisualizationMode;
  onClick: (id: string) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: "error" | "warning" | "success" }> = {
  PENDING: { label: "Pending", color: "error" },
  IN_PROGRESS: { label: "In Progress", color: "warning" },
  RESOLVED: { label: "Resolved", color: "success" },
};

const IssueMarker = ({ issue, visualizationMode, onClick }: IssueMarkerProps) => {
  const icon =
    visualizationMode === "status"
      ? getStatusIcon(issue.status)
      : getUrgencyIcon(issue.urgencyScore);

  const statusInfo = STATUS_LABELS[issue.status] || STATUS_LABELS.PENDING;

  // Format issue type for display
  const formatType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <Marker position={[issue.lat, issue.lng]} icon={icon}>
      <Popup>
        <Box sx={{ minWidth: 200, p: 0.5 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {issue.title}
          </Typography>

          <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
            <Chip
              label={formatType(issue.type)}
              size="small"
              variant="outlined"
              sx={{ fontSize: "0.7rem" }}
            />
            <Chip
              label={statusInfo.label}
              size="small"
              color={statusInfo.color}
              sx={{ fontSize: "0.7rem" }}
            />
          </Box>

          {visualizationMode === "urgency" && (
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Urgency Score: {issue.urgencyScore}/100
            </Typography>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {issue.voteCount} votes · {issue.commentCount} comments
          </Typography>

          <Button
            variant="contained"
            size="small"
            fullWidth
            onClick={() => onClick(issue.id)}
            sx={{ textTransform: "none" }}
          >
            View Details
          </Button>
        </Box>
      </Popup>
    </Marker>
  );
};

export default IssueMarker;
