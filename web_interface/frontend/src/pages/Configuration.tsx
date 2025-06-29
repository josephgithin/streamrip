import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Switch,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

// Types
interface ConfigSection {
  [key: string]: any;
}

interface ConfigData {
  downloads: ConfigSection;
  qobuz: ConfigSection;
  tidal: ConfigSection;
  deezer: ConfigSection;
  soundcloud: ConfigSection;
  youtube: ConfigSection;
  lastfm: ConfigSection;
  filepaths: ConfigSection;
  artwork: ConfigSection;
  metadata: ConfigSection;
}

const Configuration: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [backupDialog, setBackupDialog] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { control, handleSubmit, reset, watch, formState: { isDirty } } = useForm();

  // Fetch configuration
  const { data: config, isLoading, error } = useQuery<ConfigData>(
    'configuration',
    async () => {
      const response = await axios.get('/api/config');
      return response.data;
    },
    {
      onSuccess: (data) => {
        reset(data);
      },
    }
  );

  // Save configuration
  const saveConfigMutation = useMutation(
    async (configData: ConfigData) => {
      const response = await axios.put('/api/config', configData);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Configuration saved successfully');
        queryClient.invalidateQueries('configuration');
        setHasUnsavedChanges(false);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Failed to save configuration');
      },
    }
  );

  // Backup configuration
  const backupConfigMutation = useMutation(
    async () => {
      const response = await axios.post('/api/config/backup');
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Configuration backed up successfully');
        // Download backup file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `streamrip-config-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setBackupDialog(false);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Failed to backup configuration');
      },
    }
  );

  // Watch for changes
  useEffect(() => {
    const subscription = watch(() => {
      setHasUnsavedChanges(isDirty);
    });
    return () => subscription.unsubscribe();
  }, [watch, isDirty]);

  const tabLabels = [
    'Downloads',
    'Streaming Services',
    'File Paths',
    'Metadata',
    'Advanced',
  ];

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const onSubmit = (data: any) => {
    saveConfigMutation.mutate(data as ConfigData);
  };

  const handleReset = () => {
    if (config) {
      reset(config);
      setHasUnsavedChanges(false);
      toast.success('Configuration reset to saved values');
    }
  };

  const renderDownloadsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <DownloadIcon sx={{ mr: 1 }} />
              Download Settings
            </Typography>

            <Controller
              name="downloads.folder"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Download Folder"
                  placeholder="/path/to/downloads"
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="downloads.max_concurrent_downloads"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="number"
                  label="Max Concurrent Downloads"
                  inputProps={{ min: 1, max: 10 }}
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="downloads.chunk_size"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Chunk Size</InputLabel>
                  <Select {...field} label="Chunk Size">
                    <MenuItem value={1024}>1 KB</MenuItem>
                    <MenuItem value={8192}>8 KB</MenuItem>
                    <MenuItem value={16384}>16 KB</MenuItem>
                    <MenuItem value={32768}>32 KB</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Quality Settings
            </Typography>

            <Controller
              name="downloads.default_quality"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Default Quality</InputLabel>
                  <Select {...field} label="Default Quality">
                    <MenuItem value={1}>MP3 320kbps</MenuItem>
                    <MenuItem value={2}>FLAC 16-bit</MenuItem>
                    <MenuItem value={3}>FLAC 24-bit</MenuItem>
                    <MenuItem value={4}>Master Quality</MenuItem>
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="downloads.keep_cover"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Keep Album Cover"
                  sx={{ mb: 1 }}
                />
              )}
            />

            <Controller
              name="downloads.keep_playlist_order"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Keep Playlist Order"
                  sx={{ mb: 1 }}
                />
              )}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderStreamingServicesTab = () => (
    <Grid container spacing={3}>
      {/* Qobuz */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#1DB954',
                  mr: 1,
                }}
              />
              Qobuz
            </Typography>

            <Controller
              name="qobuz.email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Email"
                  type="email"
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="qobuz.password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Password"
                  type={showPasswords.qobuz ? 'text' : 'password'}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => togglePasswordVisibility('qobuz')}
                        edge="end"
                      >
                        {showPasswords.qobuz ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="qobuz.quality"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Quality</InputLabel>
                  <Select {...field} label="Quality">
                    <MenuItem value={1}>MP3 320kbps</MenuItem>
                    <MenuItem value={2}>FLAC 16-bit</MenuItem>
                    <MenuItem value={3}>FLAC 24-bit</MenuItem>
                    <MenuItem value={4}>Hi-Res</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Tidal */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#000000',
                  mr: 1,
                }}
              />
              Tidal
            </Typography>

            <Controller
              name="tidal.username"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Username"
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="tidal.password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Password"
                  type={showPasswords.tidal ? 'text' : 'password'}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => togglePasswordVisibility('tidal')}
                        edge="end"
                      >
                        {showPasswords.tidal ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="tidal.quality"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Quality</InputLabel>
                  <Select {...field} label="Quality">
                    <MenuItem value="LOW">Low</MenuItem>
                    <MenuItem value="HIGH">High</MenuItem>
                    <MenuItem value="LOSSLESS">Lossless</MenuItem>
                    <MenuItem value="HI_RES">Hi-Res</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Deezer */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#FF5500',
                  mr: 1,
                }}
              />
              Deezer
            </Typography>

            <Controller
              name="deezer.arl"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="ARL Token"
                  type={showPasswords.deezer ? 'text' : 'password'}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => togglePasswordVisibility('deezer')}
                        edge="end"
                      >
                        {showPasswords.deezer ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="deezer.quality"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Quality</InputLabel>
                  <Select {...field} label="Quality">
                    <MenuItem value={1}>MP3 128kbps</MenuItem>
                    <MenuItem value={2}>MP3 320kbps</MenuItem>
                    <MenuItem value={3}>FLAC</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* SoundCloud */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#FF5500',
                  mr: 1,
                }}
              />
              SoundCloud
            </Typography>

            <Controller
              name="soundcloud.client_id"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Client ID"
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="soundcloud.app_version"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="App Version"
                />
              )}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderFilePathsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              File Organization
            </Typography>

            <Controller
              name="filepaths.folder"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Base Download Folder"
                  placeholder="/path/to/music"
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="filepaths.folder_format"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Folder Format"
                  placeholder="{artist}/{album}"
                  helperText="Available variables: {artist}, {album}, {year}, {genre}"
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="filepaths.track_format"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Track Format"
                  placeholder="{tracknumber}. {title}"
                  helperText="Available variables: {tracknumber}, {title}, {artist}, {album}"
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="filepaths.restrict_characters"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Restrict Special Characters"
                  sx={{ mb: 1 }}
                />
              )}
            />

            <Controller
              name="filepaths.truncate_to"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="number"
                  label="Truncate Filenames To (characters)"
                  inputProps={{ min: 50, max: 255 }}
                />
              )}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderMetadataTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Metadata Settings
            </Typography>

            <Controller
              name="metadata.set_playlist_to_album"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Set Playlist Name as Album"
                  sx={{ mb: 1 }}
                />
              )}
            />

            <Controller
              name="metadata.renumber_playlist_tracks"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Renumber Playlist Tracks"
                  sx={{ mb: 1 }}
                />
              )}
            />

            <Controller
              name="metadata.embed_cover"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Embed Album Cover"
                  sx={{ mb: 1 }}
                />
              )}
            />

            <Controller
              name="metadata.save_cover"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Save Cover as Separate File"
                  sx={{ mb: 1 }}
                />
              )}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Artwork Settings
            </Typography>

            <Controller
              name="artwork.embed"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Embed Artwork"
                  sx={{ mb: 1 }}
                />
              )}
            />

            <Controller
              name="artwork.size"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Artwork Size</InputLabel>
                  <Select {...field} label="Artwork Size">
                    <MenuItem value={300}>300x300</MenuItem>
                    <MenuItem value={600}>600x600</MenuItem>
                    <MenuItem value={1200}>1200x1200</MenuItem>
                    <MenuItem value={1400}>1400x1400 (Original)</MenuItem>
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="artwork.save_artwork"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Save Artwork File"
                  sx={{ mb: 1 }}
                />
              )}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderAdvancedTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Advanced settings can affect performance and stability. Only modify these if you know what you're doing.
          </Typography>
        </Alert>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Performance
            </Typography>

            <Controller
              name="downloads.max_retries"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="number"
                  label="Max Retries"
                  inputProps={{ min: 0, max: 10 }}
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="downloads.timeout"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="number"
                  label="Request Timeout (seconds)"
                  inputProps={{ min: 5, max: 300 }}
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="downloads.use_proxy"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Use Proxy"
                  sx={{ mb: 1 }}
                />
              )}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Logging & Debug
            </Typography>

            <Controller
              name="misc.log_level"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Log Level</InputLabel>
                  <Select {...field} label="Log Level">
                    <MenuItem value="DEBUG">Debug</MenuItem>
                    <MenuItem value="INFO">Info</MenuItem>
                    <MenuItem value="WARNING">Warning</MenuItem>
                    <MenuItem value="ERROR">Error</MenuItem>
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="misc.progress_bars"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Show Progress Bars"
                  sx={{ mb: 1 }}
                />
              )}
            />

            <Controller
              name="misc.check_for_updates"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Check for Updates"
                  sx={{ mb: 1 }}
                />
              )}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Typography>Loading configuration...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load configuration. Please try refreshing the page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        ⚙️ Configuration
      </Typography>

      {/* Header Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Streamrip Settings
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Configure your music download preferences and streaming service credentials
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<BackupIcon />}
                onClick={() => setBackupDialog(true)}
                variant="outlined"
                size="small"
              >
                Backup
              </Button>

              <Button
                startIcon={<RestoreIcon />}
                onClick={() => setRestoreDialog(true)}
                variant="outlined"
                size="small"
              >
                Restore
              </Button>

              <Button
                startIcon={<RefreshIcon />}
                onClick={handleReset}
                variant="outlined"
                size="small"
                disabled={!hasUnsavedChanges}
              >
                Reset
              </Button>

              <Button
                startIcon={<SaveIcon />}
                onClick={handleSubmit(onSubmit)}
                variant="contained"
                size="small"
                disabled={!hasUnsavedChanges || saveConfigMutation.isLoading}
              >
                {saveConfigMutation.isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Box>

          {hasUnsavedChanges && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                You have unsaved changes. Don't forget to save your configuration.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Card>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {tabLabels.map((label, index) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
          </Box>

          <form onSubmit={handleSubmit(onSubmit)}>
            {activeTab === 0 && renderDownloadsTab()}
            {activeTab === 1 && renderStreamingServicesTab()}
            {activeTab === 2 && renderFilePathsTab()}
            {activeTab === 3 && renderMetadataTab()}
            {activeTab === 4 && renderAdvancedTab()}
          </form>
        </CardContent>
      </Card>

      {/* Backup Dialog */}
      <Dialog open={backupDialog} onClose={() => setBackupDialog(false)}>
        <DialogTitle>Backup Configuration</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will create a backup of your current configuration that you can restore later.
          </Typography>
          <Alert severity="info">
            The backup file will be downloaded to your computer and will contain all your settings including credentials.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialog(false)}>Cancel</Button>
          <Button
            onClick={() => backupConfigMutation.mutate()}
            variant="contained"
            disabled={backupConfigMutation.isLoading}
          >
            {backupConfigMutation.isLoading ? 'Creating Backup...' : 'Create Backup'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialog} onClose={() => setRestoreDialog(false)}>
        <DialogTitle>Restore Configuration</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Upload a configuration backup file to restore your settings.
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will overwrite your current configuration. Make sure to backup your current settings first.
          </Alert>
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadIcon />}
            fullWidth
          >
            Choose Backup File
            <input
              type="file"
              accept=".json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const config = JSON.parse(event.target?.result as string);
                      reset(config);
                      toast.success('Configuration restored successfully');
                      setRestoreDialog(false);
                    } catch (error) {
                      toast.error('Invalid backup file');
                    }
                  };
                  reader.readAsText(file);
                }
              }}
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Configuration;
