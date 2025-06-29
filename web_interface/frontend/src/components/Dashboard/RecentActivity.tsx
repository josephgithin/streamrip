import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  MusicNote as MusicIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

// Hooks
import { useDownloadContext } from '../../contexts/DownloadContext';
import { useWebSocket } from '../../contexts/WebSocketContext';

const RecentActivity: React.FC = () => {
  const theme = useTheme();
  const { queueStatus } = useDownloadContext();
  const { logMessages } = useWebSocket();

  // Combine recent completed and failed downloads
  const recentActivity = [
    ...(queueStatus?.recent_completed || []).map(item => ({ ...item, type: 'completed' })),
    ...(queueStatus?.recent_failed || []).map(item => ({ ...item, type: 'failed' })),
  ].sort((a, b) => {
    const dateA = new Date(a.completed_at || a.created_at);
    const dateB = new Date(b.completed_at || b.created_at);
    return dateB.getTime() - dateA.getTime();
  }).slice(0, 10);

  const getActivityIcon = (type: string, status: string) => {
    if (type === 'completed' || status === 'completed') {
      return <CheckCircleIcon sx={{ color: 'success.main' }} />;
    }
    if (type === 'failed' || status === 'failed') {
      return <ErrorIcon sx={{ color: 'error.main' }} />;
    }
    return <DownloadIcon sx={{ color: 'primary.main' }} />;
  };

  const getActivityColor = (type: string, status: string) => {
    if (type === 'completed' || status === 'completed') {
      return theme.palette.success.main;
    }
    if (type === 'failed' || status === 'failed') {
      return theme.palette.error.main;
    }
    return theme.palette.primary.main;
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Recent Activity
          </Typography>
          <Chip
            label={`${recentActivity.length} items`}
            size="small"
            variant="outlined"
          />
        </Box>

        {recentActivity.length > 0 ? (
          <List sx={{ flex: 1, overflow: 'auto' }}>
            {recentActivity.map((item, index) => {
              const activityColor = getActivityColor(item.type, item.status);
              const timestamp = item.completed_at || item.created_at;
              
              return (
                <ListItem
                  key={`${item.id}-${index}`}
                  sx={{
                    px: 0,
                    py: 1,
                    borderBottom: index < recentActivity.length - 1 
                      ? `1px solid ${alpha(theme.palette.divider, 0.1)}` 
                      : 'none',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getActivityIcon(item.type, item.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          color: 'text.primary',
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.title || 'Unknown'}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        {item.artist && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.artist}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip
                            label={item.type === 'completed' ? 'Completed' : 'Failed'}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              backgroundColor: alpha(activityColor, 0.1),
                              color: activityColor,
                              border: `1px solid ${alpha(activityColor, 0.2)}`,
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary' }}
                          >
                            {timestamp && formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'text.secondary',
            }}
          >
            <MusicIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body1" sx={{ mb: 1 }}>
              No recent activity
            </Typography>
            <Typography variant="body2">
              Download history will appear here
            </Typography>
          </Box>
        )}

        {/* Recent Logs */}
        {logMessages.length > 0 && (
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, display: 'block' }}>
              Recent Logs
            </Typography>
            <Box sx={{ maxHeight: 100, overflow: 'auto' }}>
              {logMessages.slice(-3).map((log, index) => (
                <Typography
                  key={index}
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: log.level === 'ERROR' ? 'error.main' : 'text.secondary',
                    mb: 0.5,
                    fontSize: '0.7rem',
                  }}
                >
                  {log.message}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
