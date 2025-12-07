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
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            Public Issues Tracker
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
            borderRight: '1px solid',
            borderColor: 'divider',
            background: 'linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)',
          },
        }}
        ModalProps={{
          keepMounted: true,
        }}
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default DashboardLayout;
