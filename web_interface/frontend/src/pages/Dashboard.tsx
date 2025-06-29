import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  LinearProgress,
  Chip,
  IconButton,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Search as SearchIcon,
  Queue as QueueIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Close as CloseIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

// Hooks
import { useDownloadContext } from '../contexts/DownloadContext';
import { useWebSocket } from '../contexts/WebSocketContext';

// Components
import StatsCard from '../components/Dashboard/StatsCard';
import QuickDownload from '../components/Dashboard/QuickDownload';
import RecentActivity from '../components/Dashboard/RecentActivity';
import ProgressChart from '../components/Dashboard/ProgressChart';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const { queueStatus, downloadUrl, uploadFile } = useDownloadContext();
  const { connected, progressUpdates } = useWebSocket();
  
  const [quickUrl, setQuickUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File drop zone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/plain': ['.txt'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        try {
          await uploadFile(acceptedFiles[0]);
        } catch (error) {
          console.error('Upload failed:', error);
        }
      }
    },
  });

  // Quick download handler
  const handleQuickDownload = async () => {
    if (!quickUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setIsSubmitting(true);
    try {
      await downloadUrl(quickUrl.trim());
      setQuickUrl('');
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats data
  const stats = [
    {
      title: 'Queued Downloads',
      value: queueStatus?.queued || 0,
      icon: <QueueIcon />,
      color: theme.palette.primary.main,
      trend: '+12%',
    },
    {
      title: 'Active Downloads',
      value: queueStatus?.active || 0,
      icon: <DownloadIcon />,
      color: theme.palette.secondary.main,
      trend: 'Live',
    },
    {
      title: 'Completed Today',
      value: queueStatus?.completed || 0,
      icon: <CheckCircleIcon />,
      color: theme.palette.success.main,
      trend: '+8%',
    },
    {
      title: 'Failed Downloads',
      value: queueStatus?.failed || 0,
      icon: <ErrorIcon />,
      color: theme.palette.error.main,
      trend: '-2%',
    },
  ];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
          }}
        >
          Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Monitor your downloads and manage your music collection
        </Typography>
        
        {/* Connection Status */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={connected ? 'Connected' : 'Disconnected'}
            color={connected ? 'success' : 'error'}
            size="small"
            variant="outlined"
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Real-time updates {connected ? 'enabled' : 'disabled'}
          </Typography>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.title}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StatsCard {...stat} />
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Quick Download */}
        <Grid item xs={12} md={8}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Quick Download
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  placeholder="Paste music URL here (Qobuz, Tidal, Deezer, SoundCloud...)"
                  value={quickUrl}
                  onChange={(e) => setQuickUrl(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleQuickDownload();
                    }
                  }}
                  disabled={isSubmitting}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleQuickDownload}
                  disabled={isSubmitting || !quickUrl.trim()}
                  sx={{
                    minWidth: 120,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  }}
                >
                  {isSubmitting ? 'Adding...' : 'Download'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* File Upload */}
        <Grid item xs={12} md={4}>
          <Card
            {...getRootProps()}
            sx={{
              height: '100%',
              cursor: 'pointer',
              border: `2px dashed ${isDragActive ? theme.palette.primary.main : alpha(theme.palette.divider, 0.3)}`,
              backgroundColor: isDragActive ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                border: `2px dashed ${theme.palette.primary.main}`,
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
              },
            }}
          >
            <input {...getInputProps()} />
            <CardContent
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                p: 3,
              }}
            >
              <UploadIcon
                sx={{
                  fontSize: 48,
                  color: isDragActive ? 'primary.main' : 'text.secondary',
                  mb: 2,
                }}
              />
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                Upload File
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {isDragActive ? 'Drop file here' : 'Drop URLs file or click to browse'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1 }}>
                Supports .txt and .json files
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Active Downloads */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Active Downloads
                </Typography>
                <Chip
                  label={`${queueStatus?.active || 0} active`}
                  color="secondary"
                  size="small"
                />
              </Box>

              {queueStatus?.active_downloads && queueStatus.active_downloads.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {queueStatus.active_downloads.map((download) => (
                    <Box
                      key={download.id}
                      sx={{
                        p: 2,
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.background.paper, 0.5),
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {download.title}
                          </Typography>
                          {download.artist && (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {download.artist} {download.album && `• ${download.album}`}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton size="small" color="primary">
                            <PauseIcon />
                          </IconButton>
                          <IconButton size="small" color="error">
                            <CloseIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      
                      <LinearProgress
                        variant="determinate"
                        value={download.progress * 100}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                          },
                        }}
                      />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {Math.round(download.progress * 100)}% complete
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {download.speed} {download.eta && `• ${download.eta} remaining`}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 4,
                    color: 'text.secondary',
                  }}
                >
                  <DownloadIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="body1">No active downloads</Typography>
                  <Typography variant="body2">Start a download to see progress here</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} lg={4}>
          <RecentActivity />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
