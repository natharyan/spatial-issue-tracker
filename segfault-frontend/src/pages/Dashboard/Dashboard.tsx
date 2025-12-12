import { useState } from 'react';
import { Box, Tabs, Tab, Fab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MapIcon from '@mui/icons-material/Map';
import BarChartIcon from '@mui/icons-material/BarChart';
import ListAltIcon from '@mui/icons-material/ListAlt';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import type { FilterState } from '../../components/Dashboard/DashboardLayout';
import MapInterface from '../../components/Dashboard/MapInterface';
import DashboardView from '../../components/Dashboard/DashboardView';
import IssuesList from '../../components/Dashboard/IssuesList';
import IssueReportForm from '../../components/Dashboard/IssueReportForm';
import IssueDetailPage from '../../components/Dashboard/IssueDetailPage';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [reportFormOpen, setReportFormOpen] = useState(false);
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
    const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number } | null>(null);

    const [filters, setFilters] = useState<FilterState>({
        issueType: '',
        statusOpen: true,
        statusInProgress: true,
        urgency: '',
        showResolved: false,
    });

    const handleFilterChange = (newFilters: Partial<FilterState>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const handlePinClick = (issueId: string) => {
        setSelectedIssueId(issueId);
        setDetailDrawerOpen(true);
    };

    const handleDetailClose = () => {
        setDetailDrawerOpen(false);
        setSelectedIssueId(null);
    };

    const [showRouting, setShowRouting] = useState(false);

    const handleToggleRouting = () => {
        setShowRouting(!showRouting);
        // If we are opening routing, ensure we are on the map tab
        if (!showRouting && activeTab !== 0) {
            setActiveTab(0);
        }
    };

    const handleFindOnMap = (lat: number, lng: number) => {
        // Close the detail drawer
        setDetailDrawerOpen(false);
        // Switch to map tab
        setActiveTab(0);
        // Set the fly-to location (use a new object to trigger useEffect even if same coords)
        setFlyToLocation({ lat, lng });
    };

    return (
        <DashboardLayout
            onIssueClick={handlePinClick}
            filters={filters}
            onFilterChange={handleFilterChange}
            showRouting={showRouting}
            onToggleRouting={handleToggleRouting}
        >
            <Box sx={{ mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 3,
                        p: 0.5,
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        '& .MuiTabs-indicator': {
                            height: '100%',
                            borderRadius: 2,
                            zIndex: 0,
                            backgroundColor: 'rgba(124, 58, 237, 0.2)', // Violet tint
                        },
                        '& .MuiTab-root': {
                            zIndex: 1,
                            minHeight: 48,
                            textTransform: 'none',
                            fontWeight: 600,
                            color: '#94a3b8',
                            '&.Mui-selected': {
                                color: '#f8fafc',
                            },
                        },
                    }}
                >
                    <Tab
                        icon={<MapIcon sx={{ mr: 1 }} />}
                        iconPosition="start"
                        label="Map"
                    />
                    <Tab
                        icon={<ListAltIcon sx={{ mr: 1 }} />}
                        iconPosition="start"
                        label="List"
                    />
                    <Tab
                        icon={<BarChartIcon sx={{ mr: 1 }} />}
                        iconPosition="start"
                        label="Analytics"
                    />
                </Tabs>
            </Box>

            {activeTab === 0 && (
                <MapInterface
                    onPinClick={handlePinClick}
                    filters={filters}
                    showRouting={showRouting}
                    onToggleRouting={setShowRouting}
                    flyToLocation={flyToLocation}
                />
            )}
            {activeTab === 1 && <IssuesList onIssueClick={handlePinClick} />}
            {activeTab === 2 && <DashboardView />}

            <Fab
                color="primary"
                aria-label="add issue"
                onClick={() => setReportFormOpen(true)}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    width: 64,
                    height: 64,
                    boxShadow: '0 4px 20px rgba(25, 118, 210, 0.4)',
                    '&:hover': {
                        boxShadow: '0 6px 24px rgba(25, 118, 210, 0.5)',
                        transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease',
                }}
            >
                <AddIcon sx={{ fontSize: 32 }} />
            </Fab>

            <IssueReportForm
                open={reportFormOpen}
                onClose={() => setReportFormOpen(false)}
            />

            <IssueDetailPage
                open={detailDrawerOpen}
                onClose={handleDetailClose}
                issueId={selectedIssueId}
                onFindOnMap={handleFindOnMap}
            />
        </DashboardLayout>
    );
};

export default Dashboard;
