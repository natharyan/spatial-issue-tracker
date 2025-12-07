import { useState } from "react";
import { Button, Menu, MenuItem, CircularProgress } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { analyticsRoutes } from "../../api/routes";

const ExportButton = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [loading, setLoading] = useState(false);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleExport = async (format: "csv" | "json") => {
        handleClose();
        setLoading(true);
        try {
            await analyticsRoutes.exportData(format);
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                variant="outlined"
                startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={handleClick}
                disabled={loading}
                sx={{ textTransform: "none" }}
            >
                Export Data
            </Button>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >
                <MenuItem onClick={() => handleExport("csv")}>Download CSV</MenuItem>
                <MenuItem onClick={() => handleExport("json")}>Download JSON</MenuItem>
            </Menu>
        </>
    );
};

export default ExportButton;
