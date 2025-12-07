import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import { authAPI } from '../../api/axios';
import { useAuth } from '../../state/authContext';
import ChangePasswordModal from './ChangePasswordModal';
import ProfileModal from './ProfileModal';

interface UserMenuProps {
  onIssueClick?: (issueId: string) => void;
}

const UserMenu = ({ onIssueClick }: UserMenuProps) => {
  const navigate = useNavigate();
  const { user, logout, isGuest } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    try {
      await authAPI.logout();
    } catch {
    }
    logout();
    navigate('/login');
  };

  const handleProfileClick = () => {
    handleClose();
    setProfileOpen(true);
  };

  const handleSettingsClick = () => {
    handleClose();
    setPasswordOpen(true);
  };

  const getUserInitial = (): string => {
    if (!user) return 'U';
    if (user.name) return user.name.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const getDisplayName = (): string => {
    if (!user) return 'User';
    if (isGuest) return 'Guest User';
    return user.name || user.email?.split('@')[0] || 'User';
  };

  const getDisplayEmail = (): string => {
    if (!user) return '';
    if (isGuest) return 'Anonymous session';
    return user.email || '';
  };

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{
          p: 0.5,
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.1)',
          },
        }}
      >
        <Avatar
          src={user?.picture || undefined}
          sx={{
            width: 36,
            height: 36,
            bgcolor: isGuest ? 'grey.500' : 'secondary.main',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          {getUserInitial()}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 220,
            mt: 1,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            borderRadius: 2,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {getDisplayName()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {getDisplayEmail()}
          </Typography>
        </Box>
        <Divider />
        {!isGuest && (
            <MenuItem onClick={handleProfileClick} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Profile</ListItemText>
            </MenuItem>
        )}
        {!isGuest && (
            <MenuItem onClick={handleSettingsClick} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Settings</ListItemText>
            </MenuItem>
        )}
        {!isGuest && <Divider />}
        <MenuItem
          onClick={handleLogout}
          sx={{
            py: 1.5,
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'error.contrastText',
            },
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" sx={{ color: 'inherit' }} />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onIssueClick={onIssueClick}
      />
    </>
  );
};

export default UserMenu;
