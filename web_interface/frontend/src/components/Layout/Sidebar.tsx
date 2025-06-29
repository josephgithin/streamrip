import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Storage as DatabaseIcon,
  Folder as FolderIcon,
  MusicNote as MusicIcon,
  Queue as QueueIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// Hooks
import { useDownloadContext } from '../../contexts/DownloadContext';

const DRAWER_WIDTH = 280;

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  color?: string;
}

const Sidebar: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { queueStatus } = useDownloadContext();

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/',
      icon: <DashboardIcon />,
      color: theme.palette.primary.main,
    },
    {
      id: 'downloads',
      label: 'Downloads',
      path: '/downloads',
      icon: <DownloadIcon />,
      badge: queueStatus?.active || 0,
      color: theme.palette.secondary.main,
    },
    {
      id: 'search',
      label: 'Search',
      path: '/search',
      icon: <SearchIcon />,
      color: theme.palette.success.main,
    },
    {
      id: 'files',
      label: 'File Manager',
      path: '/files',
      icon: <FolderIcon />,
      color: theme.palette.warning.main,
    },
    {
      id: 'database',
      label: 'Database',
      path: '/database',
      icon: <DatabaseIcon />,
      color: theme.palette.info.main,
    },
    {
      id: 'configuration',
      label: 'Configuration',
      path: '/configuration',
      icon: <SettingsIcon />,
      color: theme.palette.text.secondary,
    },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: 'background.paper',
          borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          backgroundImage: 'none',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MusicIcon sx={{ color: 'white', fontSize: 24 }} />
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Streamrip
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
            }}
          >
            Web Interface
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mx: 2, opacity: 0.1 }} />

      {/* Navigation */}
      <List sx={{ px: 2, py: 1 }}>
        {navigationItems.map((item, index) => {
          const active = isActive(item.path);
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    backgroundColor: active
                      ? alpha(item.color || theme.palette.primary.main, 0.1)
                      : 'transparent',
                    border: active
                      ? `1px solid ${alpha(item.color || theme.palette.primary.main, 0.2)}`
                      : '1px solid transparent',
                    '&:hover': {
                      backgroundColor: alpha(item.color || theme.palette.primary.main, 0.05),
                      border: `1px solid ${alpha(item.color || theme.palette.primary.main, 0.1)}`,
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: active
                        ? item.color || theme.palette.primary.main
                        : theme.palette.text.secondary,
                      transition: 'color 0.2s ease-in-out',
                    }}
                  >
                    {item.badge && item.badge > 0 ? (
                      <Badge
                        badgeContent={item.badge}
                        color="error"
                        sx={{
                          '& .MuiBadge-badge': {
                            fontSize: '0.75rem',
                            minWidth: 18,
                            height: 18,
                          },
                        }}
                      >
                        {item.icon}
                      </Badge>
                    ) : (
                      item.icon
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontSize: '0.875rem',
                        fontWeight: active ? 600 : 500,
                        color: active
                          ? theme.palette.text.primary
                          : theme.palette.text.secondary,
                        transition: 'all 0.2s ease-in-out',
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </motion.div>
          );
        })}
      </List>

      {/* Queue Status */}
      {queueStatus && (
        <>
          <Divider sx={{ mx: 2, opacity: 0.1, mt: 2 }} />
          <Box sx={{ p: 2 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                mb: 1,
                display: 'block',
              }}
            >
              Queue Status
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QueueIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Queued
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {queueStatus.queued}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DownloadIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Active
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                  {queueStatus.active}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Completed
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {queueStatus.completed}
                </Typography>
              </Box>
            </Box>
          </Box>
        </>
      )}
    </Drawer>
  );
};

export default Sidebar;
