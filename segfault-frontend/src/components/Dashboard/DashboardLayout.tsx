import { useState } from 'react';
import {
    Box,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Drawer,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import CategoryFilterPanel from './CategoryFilterPanel';

const DRAWER_WIDTH = 280;

// Move FilterState to a shared location or export it
export interface FilterState {
    issueType: string;
    statusOpen: boolean;
    statusInProgress: boolean;
    urgency: string;
    showResolved: boolean;
}

interface DashboardLayoutProps {
    children: React.ReactNode;
    onIssueClick?: (issueId: string) => void;
    filters: FilterState;
    onFilterChange: (newFilters: Partial<FilterState>) => void;
}

const DashboardLayout = ({ children, onIssueClick, filters, onFilterChange }: DashboardLayoutProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [drawerOpen, setDrawerOpen] = useState(!isMobile);

    const handleDrawerToggle = () => {
        setDrawerOpen(!drawerOpen);
    };

    const toggleResolvedVisibility = () => {
        onFilterChange({ showResolved: !filters.showResolved });
    };

    const drawerContent = (
        <CategoryFilterPanel
            filters={filters}
            onFilterChange={onFilterChange}
            onToggleResolved={toggleResolvedVisibility}
        />
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#020617', color: '#f8fafc', fontFamily: '"Geist Mono", "Inter", sans-serif' }}>
            {/* Grid Background Pattern */}
            <Box sx={{
                position: 'fixed',
                inset: 0,
                backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
                backgroundSize: '32px 32px',
                maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                zIndex: 0,
                pointerEvents: 'none'
            }} />

            {/* Ambient Glows */}
            <Box sx={{
                position: 'fixed',
                top: '-15%',
                right: '-5%',
                width: '40vw',
                height: '40vw',
                background: 'radial-gradient(circle, rgba(124, 58, 237, 0.05) 0%, rgba(0,0,0,0) 70%)',
                filter: 'blur(80px)',
                zIndex: 0,
                pointerEvents: 'none'
            }} />

            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    zIndex: theme.zIndex.drawer + 1,
                    background: 'rgba(2, 6, 23, 0.7)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="toggle drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, color: '#94a3b8' }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{
                            flexGrow: 1,
                            fontWeight: 600,
                            letterSpacing: '-0.5px',
                            fontFamily: '"Geist Mono", "Inter", sans-serif',
                            color: '#f1f5f9'
                        }}
                    >
                        segfault<Box component="span" sx={{ color: '#64748b', fontWeight: 400 }}>tracker</Box>
                    </Typography>
                    <NotificationBell />
                    <UserMenu onIssueClick={onIssueClick} />
                </Toolbar>
            </AppBar>

            <Drawer
                variant={isMobile ? 'temporary' : 'persistent'}
                open={drawerOpen}
                onClose={handleDrawerToggle}
                sx={{
                    width: drawerOpen ? DRAWER_WIDTH : 0,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                        background: 'rgba(2, 6, 23, 0.8)',
                        backdropFilter: 'blur(12px)',
                        color: '#cbd5e1',
                    },
                }}
                ModalProps={{
                    keepMounted: true,
                }}
            >
                <Toolbar />
                <Box sx={{ p: 2 }}>
                    {drawerContent}
                </Box>
            </Drawer>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: '100%',
                    minHeight: '100vh',
                    backgroundColor: 'transparent',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                <Toolbar />
                {children}
            </Box>
        </Box>
    );
};

export default DashboardLayout;
