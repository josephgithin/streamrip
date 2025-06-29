import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Button,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Divider,
  useTheme,
  alpha,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Queue as QueueIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  GetApp as GetAppIcon,
  Folder as FolderIcon,
  MusicNote as MusicNoteIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Hooks
import { useDownloadContext } from '../contexts/DownloadContext';
import { useWebSocket } from '../contexts/WebSocketContext';

// Types
interface DownloadTask {
  id: string;
  url?: string;
  source: string;
  media_type: string;
  media_id?: string;
  title: string;
  artist?: string;
  album?: string;
  status: string;
  progress: number;
  speed?: string;
  eta?: string;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  file_path?: string;
}

const Downloads: React.FC = () => {
  const theme = useTheme();
  const { queueStatus, pauseDownload, cancelDownload, isLoading } = useDownloadContext();
  const { progressUpdates, connected } = useWebSocket();

  const [activeTab, setActiveTab] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [clearHistoryDialog, setClearHistoryDialog] = useState(false);
  const [retryDialog, setRetryDialog] = useState<{ open: boolean; task?: DownloadTask }>({ open: false });

  const tabLabels = ['Active', 'Queue', 'Completed', 'Failed'];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'downloading':
      case 'active':
        return theme.palette.primary.main;
      case 'completed':
      case 'success':
        return theme.palette.success.main;
      case 'failed':
      case 'error':
        return theme.palette.error.main;
      case 'paused':
        return theme.palette.warning.main;
      case 'queued':
      case 'pending':
        return theme.palette.info.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'downloading':
      case 'active':
        return <DownloadIcon />;
      case 'completed':
      case 'success':
        return <CheckCircleIcon />;
      case 'failed':
      case 'error':
        return <ErrorIcon />;
      case 'paused':
        return <PauseIcon />;
      case 'queued':
      case 'pending':
        return <QueueIcon />;
      default:
        return <MusicNoteIcon />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePauseResume = async (task: DownloadTask) => {
    try {
      if (task.status === 'paused') {
        // Resume logic would go here
        toast.success(`Resumed: ${task.title}`);
      } else {
        await pauseDownload(task.id);
        toast.success(`Paused: ${task.title}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    }
  };

  const handleCancel = async (task: DownloadTask) => {
    try {
      await cancelDownload(task.id);
      toast.success(`Cancelled: ${task.title}`);
    } catch (error: any) {
      toast.error(error.message || 'Cancel failed');
    }
  };

  const handleRetry = async (task: DownloadTask) => {
    try {
      // Retry logic would go here
      toast.success(`Retrying: ${task.title}`);
      setRetryDialog({ open: false });
    } catch (error: any) {
      toast.error(error.message || 'Retry failed');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }

    try {
      // Bulk action logic would go here
      toast.success(`${action} applied to ${selectedItems.size} items`);
      setSelectedItems(new Set());
    } catch (error: any) {
      toast.error(error.message || 'Bulk action failed');
    }
  };

  const renderDownloadItem = (task: DownloadTask, index: number) => (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <ListItem
        sx={{
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 2,
          mb: 1,
          backgroundColor: selectedItems.has(task.id)
            ? alpha(theme.palette.primary.main, 0.1)
            : 'background.paper',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          },
        }}
      >
        <ListItemAvatar>
          <Avatar
            sx={{
              backgroundColor: alpha(getStatusColor(task.status), 0.1),
              color: getStatusColor(task.status),
            }}
          >
            {getStatusIcon(task.status)}
          </Avatar>
        </ListItemAvatar>

        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {task.title}
              </Typography>
              <Chip
                label={task.status}
                size="small"
                sx={{
                  backgroundColor: alpha(getStatusColor(task.status), 0.1),
                  color: getStatusColor(task.status),
                  fontWeight: 600,
                }}
              />
            </Box>
          }
          secondary={
            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                {task.artist && `${task.artist} • `}
                {task.album && `${task.album} • `}
                {task.source}
              </Typography>

              {task.status === 'downloading' && (
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption">
                      {task.progress}% • {task.speed} • ETA: {task.eta}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={task.progress}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                      },
                    }}
                  />
                </Box>
              )}

              {task.error_message && (
                <Typography variant="caption" sx={{ color: 'error.main' }}>
                  Error: {task.error_message}
                </Typography>
              )}

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {task.completed_at
                  ? `Completed: ${format(new Date(task.completed_at), 'MMM dd, HH:mm')}`
                  : `Created: ${format(new Date(task.created_at), 'MMM dd, HH:mm')}`
                }
              </Typography>
            </Box>
          }
        />

        <ListItemSecondaryAction>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {task.status === 'downloading' && (
              <>
                <Tooltip title="Pause">
                  <IconButton
                    size="small"
                    onClick={() => handlePauseResume(task)}
                  >
                    <PauseIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cancel">
                  <IconButton
                    size="small"
                    onClick={() => handleCancel(task)}
                    color="error"
                  >
                    <StopIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}

            {task.status === 'paused' && (
              <>
                <Tooltip title="Resume">
                  <IconButton
                    size="small"
                    onClick={() => handlePauseResume(task)}
                    color="primary"
                  >
                    <PlayIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cancel">
                  <IconButton
                    size="small"
                    onClick={() => handleCancel(task)}
                    color="error"
                  >
                    <StopIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}

            {task.status === 'failed' && (
              <Tooltip title="Retry">
                <IconButton
                  size="small"
                  onClick={() => setRetryDialog({ open: true, task })}
                  color="primary"
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}

            {task.status === 'completed' && task.file_path && (
              <Tooltip title="Open Folder">
                <IconButton
                  size="small"
                  onClick={() => {
                    // Open folder logic would go here
                    toast.success('Opening folder...');
                  }}
                >
                  <FolderIcon />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Remove">
              <IconButton
                size="small"
                onClick={() => handleCancel(task)}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </ListItemSecondaryAction>
      </ListItem>
    </motion.div>
  );

  const getCurrentTabData = () => {
    if (!queueStatus) return [];

    switch (activeTab) {
      case 0: // Active
        return queueStatus.active_downloads || [];
      case 1: // Queue
        return queueStatus.queue || [];
      case 2: // Completed
        return queueStatus.recent_completed || [];
      case 3: // Failed
        return queueStatus.recent_failed || [];
      default:
        return [];
    }
  };

  const currentTabData = getCurrentTabData();

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        📥 Downloads
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {queueStatus?.active || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Active Downloads
                  </Typography>
                </Box>
                <DownloadIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {queueStatus?.queued || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    In Queue
                  </Typography>
                </Box>
                <QueueIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {queueStatus?.completed || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Completed
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                    {queueStatus?.failed || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Failed
                  </Typography>
                </Box>
                <ErrorIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Card>
        <CardContent>
          {/* Header with Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Download Manager
              </Typography>
              {!connected && (
                <Chip
                  label="Disconnected"
                  color="error"
                  size="small"
                  icon={<ErrorIcon />}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {selectedItems.size > 0 && (
                <>
                  <Button
                    size="small"
                    startIcon={<PauseIcon />}
                    onClick={() => handleBulkAction('pause')}
                  >
                    Pause Selected
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleBulkAction('cancel')}
                    color="error"
                  >
                    Cancel Selected
                  </Button>
                </>
              )}

              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
              >
                Refresh
              </Button>

              {activeTab === 2 && (
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={() => setClearHistoryDialog(true)}
                  color="error"
                >
                  Clear History
                </Button>
              )}
            </Box>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="fullWidth"
            >
              {tabLabels.map((label, index) => {
                const count = (() => {
                  switch (index) {
                    case 0: return queueStatus?.active || 0;
                    case 1: return queueStatus?.queued || 0;
                    case 2: return queueStatus?.completed || 0;
                    case 3: return queueStatus?.failed || 0;
                    default: return 0;
                  }
                })();

                return (
                  <Tab
                    key={label}
                    label={`${label} (${count})`}
                    sx={{ fontWeight: 600 }}
                  />
                );
              })}
            </Tabs>
          </Box>

          {/* Downloads List */}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <Typography>Loading downloads...</Typography>
            </Box>
          ) : currentTabData.length > 0 ? (
            <List sx={{ width: '100%' }}>
              <AnimatePresence>
                {currentTabData.map((task, index) => renderDownloadItem(task, index))}
              </AnimatePresence>
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <GetAppIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
                No {tabLabels[activeTab].toLowerCase()} downloads
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {activeTab === 0 && 'No downloads are currently active'}
                {activeTab === 1 && 'No downloads are queued'}
                {activeTab === 2 && 'No downloads have been completed yet'}
                {activeTab === 3 && 'No downloads have failed'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Clear History Dialog */}
      <Dialog open={clearHistoryDialog} onClose={() => setClearHistoryDialog(false)}>
        <DialogTitle>Clear Download History</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to clear all completed downloads from the history?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearHistoryDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              // Clear history logic would go here
              toast.success('Download history cleared');
              setClearHistoryDialog(false);
            }}
            color="error"
            variant="contained"
          >
            Clear History
          </Button>
        </DialogActions>
      </Dialog>

      {/* Retry Dialog */}
      <Dialog open={retryDialog.open} onClose={() => setRetryDialog({ open: false })}>
        <DialogTitle>Retry Download</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Retry downloading "{retryDialog.task?.title}"?
          </Typography>
          {retryDialog.task?.error_message && (
            <Typography variant="body2" sx={{ color: 'error.main', mb: 2 }}>
              Previous error: {retryDialog.task.error_message}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetryDialog({ open: false })}>Cancel</Button>
          <Button
            onClick={() => retryDialog.task && handleRetry(retryDialog.task)}
            color="primary"
            variant="contained"
          >
            Retry Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Downloads;
