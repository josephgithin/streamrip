import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Mock data
const mockDatabaseEntries = [
  {
    id: 1,
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    source: 'qobuz',
    quality: 'FLAC 24-bit',
    file_path: '/music/Queen/A Night at the Opera/01. Bohemian Rhapsody.flac',
    download_date: '2024-01-15T10:30:00Z',
    file_size: 45678901,
  },
  {
    id: 2,
    title: 'Hotel California',
    artist: 'Eagles',
    album: 'Hotel California',
    source: 'tidal',
    quality: 'FLAC 16-bit',
    file_path: '/music/Eagles/Hotel California/01. Hotel California.flac',
    download_date: '2024-01-14T15:45:00Z',
    file_size: 32145678,
  },
];

const Database: React.FC = () => {
  const theme = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [clearDialog, setClearDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredEntries = mockDatabaseEntries.filter(entry =>
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.album.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportDatabase = () => {
    const dataStr = JSON.stringify(mockDatabaseEntries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `streamrip-database-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Database exported successfully');
  };

  const handleClearDatabase = () => {
    // Clear database logic would go here
    toast.success('Database cleared successfully');
    setClearDialog(false);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        🗄️ Database
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {mockDatabaseEntries.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Total Tracks
                  </Typography>
                </Box>
                <StorageIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
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
                    {formatFileSize(mockDatabaseEntries.reduce((sum, entry) => sum + entry.file_size, 0))}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Total Size
                  </Typography>
                </Box>
                <StorageIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
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
                    {new Set(mockDatabaseEntries.map(e => e.artist)).size}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Artists
                  </Typography>
                </Box>
                <StorageIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                    {new Set(mockDatabaseEntries.map(e => e.album)).size}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Albums
                  </Typography>
                </Box>
                <StorageIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Card>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Download History
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<ExportIcon />}
                onClick={handleExportDatabase}
                variant="outlined"
                size="small"
              >
                Export
              </Button>

              <Button
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
                variant="outlined"
                size="small"
              >
                Refresh
              </Button>

              <Button
                startIcon={<ClearIcon />}
                onClick={() => setClearDialog(true)}
                color="error"
                variant="outlined"
                size="small"
              >
                Clear Database
              </Button>
            </Box>
          </Box>

          {/* Search */}
          <TextField
            fullWidth
            placeholder="Search tracks, artists, or albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Track</TableCell>
                  <TableCell>Artist</TableCell>
                  <TableCell>Album</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Quality</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Downloaded</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEntries
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((entry) => (
                    <TableRow key={entry.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {entry.title}
                        </Typography>
                      </TableCell>
                      <TableCell>{entry.artist}</TableCell>
                      <TableCell>{entry.album}</TableCell>
                      <TableCell>
                        <Chip
                          label={entry.source}
                          size="small"
                          variant="outlined"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={entry.quality}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{formatFileSize(entry.file_size)}</TableCell>
                      <TableCell>
                        {format(new Date(entry.download_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <InfoIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => toast.success('Entry removed')}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredEntries.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>

      {/* Clear Database Dialog */}
      <Dialog open={clearDialog} onClose={() => setClearDialog(false)}>
        <DialogTitle>Clear Database</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will permanently delete all download history from the database.
          </Alert>
          <Typography>
            Are you sure you want to clear the entire database? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialog(false)}>Cancel</Button>
          <Button
            onClick={handleClearDatabase}
            color="error"
            variant="contained"
          >
            Clear Database
          </Button>
        </DialogActions>
      </Dialog>

      {/* Entry Details Dialog */}
      <Dialog
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Track Details</DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Title</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{selectedEntry.title}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Artist</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{selectedEntry.artist}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Album</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{selectedEntry.album}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Source</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{selectedEntry.source}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">File Path</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                  {selectedEntry.file_path}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Quality</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{selectedEntry.quality}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">File Size</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{formatFileSize(selectedEntry.file_size)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Downloaded</Typography>
                <Typography variant="body1">
                  {format(new Date(selectedEntry.download_date), 'MMMM dd, yyyy at HH:mm')}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEntry(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Database;
