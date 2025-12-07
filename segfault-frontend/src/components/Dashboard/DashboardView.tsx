import { useState, useEffect } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, CircularProgress, Alert } from '@mui/material';
import StatsGrid from './StatsGrid';
import TrendChart from './TrendChart';
import ExportButton from './ExportButton';
import { analyticsRoutes } from '../../api/routes';
import type { AnalyticsSummary } from '../../api/routes';

type TimeRange = '7d' | '30d' | '90d';

const DashboardView = () => {
    const [timeRange, setTimeRange] = useState<TimeRange>('30d');
    const [data, setData] = useState<AnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const summary = await analyticsRoutes.getSummary(timeRange);
                setData(summary);
            } catch (err) {
                console.error('Failed to fetch analytics:', err);
                setError('Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [timeRange]);

    const handleTimeRangeChange = (_: React.MouseEvent<HTMLElement>, newRange: TimeRange | null) => {
        if (newRange) {
            setTimeRange(newRange);
        }
    };

    return (
        <Box sx={{ width: '100%', maxWidth: '100%', px: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                        Analytics Dashboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Track community health and your personal impact
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <ToggleButtonGroup
                        value={timeRange}
                        exclusive
                        onChange={handleTimeRangeChange}
                        size="small"
                    >
                        <ToggleButton value="7d">Last Week</ToggleButton>
                        <ToggleButton value="30d">Last Month</ToggleButton>
                        <ToggleButton value="90d">Last 90 Days</ToggleButton>
                    </ToggleButtonGroup>
                    <ExportButton />
                </Box>
            </Box>

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {!loading && !error && data && (
                <>
                    <StatsGrid
                        personalImpact={data.personalImpact}
                        communityHealth={data.communityHealth}
                    />
                    <Box sx={{ mt: 4 }}>
                        <TrendChart data={data.trend} />
                    </Box>
                </>
            )}
        </Box>
    );
};

export default DashboardView;
