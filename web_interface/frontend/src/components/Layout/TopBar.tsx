import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Badge,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
} from '@mui/icons-material';

// Hooks
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useDownloadContext } from '../../contexts/DownloadContext';

const TopBar: React.FC = () => {
  const theme = useTheme();
  const { connected, progressUpdates } = useWebSocket();
  const { queueStatus } = useDownloadContext();

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: 'background.paper',
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
        {/* Left side - empty for now */}
        <Box />

        {/* Right side - Status and actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Download Status */}
          {queueStatus && queueStatus.active > 0 && (
            <Chip
              label={`${queueStatus.active} downloading`}
              color="secondary"
              size="small"
              sx={{
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.7 },
                  '100%': { opacity: 1 },
                },
              }}
            />
          )}

          {/* Connection Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {connected ? (
              <WifiIcon sx={{ color: 'success.main', fontSize: 20 }} />
            ) : (
              <WifiOffIcon sx={{ color: 'error.main', fontSize: 20 }} />
            )}
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {connected ? 'Connected' : 'Disconnected'}
            </Typography>
          </Box>

          {/* Notifications */}
          <IconButton color="inherit">
            <Badge badgeContent={progressUpdates.length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* Settings */}
          <IconButton color="inherit">
            <SettingsIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
