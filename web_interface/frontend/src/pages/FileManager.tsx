import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Breadcrumbs,
  Link,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Folder as FolderIcon,
  AudioFile as AudioFileIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Home as HomeIcon,
  PlayArrow as PlayIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Info as InfoIcon,
  FolderOpen as FolderOpenIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Types
interface FileItem {
  name: string;
  type: 'folder' | 'audio' | 'image' | 'file';
  size?: number;
  modified: string;
  path: string;
}

// Mock file system data
const mockFileSystem: Record<string, FileItem[]> = {
  '/': [
    { name: 'Queen', type: 'folder', modified: '2024-01-15T10:30:00Z', path: '/Queen' },
    { name: 'Eagles', type: 'folder', modified: '2024-01-14T15:45:00Z', path: '/Eagles' },
    { name: 'Pink Floyd', type: 'folder', modified: '2024-01-13T09:20:00Z', path: '/Pink Floyd' },
  ],
  '/Queen': [
    { name: 'A Night at the Opera', type: 'folder', modified: '2024-01-15T10:30:00Z', path: '/Queen/A Night at the Opera' },
    { name: 'Bohemian Rhapsody', type: 'folder', modified: '2024-01-15T10:25:00Z', path: '/Queen/Bohemian Rhapsody' },
  ],
  '/Queen/A Night at the Opera': [
    { name: '01. Death on Two Legs.flac', type: 'audio', size: 42567890, modified: '2024-01-15T10:30:00Z', path: '/Queen/A Night at the Opera/01. Death on Two Legs.flac' },
    { name: '02. Lazing on a Sunday Afternoon.flac', type: 'audio', size: 23456789, modified: '2024-01-15T10:30:00Z', path: '/Queen/A Night at the Opera/02. Lazing on a Sunday Afternoon.flac' },
    { name: '03. I\'m in Love with My Car.flac', type: 'audio', size: 34567890, modified: '2024-01-15T10:30:00Z', path: '/Queen/A Night at the Opera/03. I\'m in Love with My Car.flac' },
    { name: '04. You\'re My Best Friend.flac', type: 'audio', size: 32145678, modified: '2024-01-15T10:30:00Z', path: '/Queen/A Night at the Opera/04. You\'re My Best Friend.flac' },
    { name: '05. \'39.flac', type: 'audio', size: 28901234, modified: '2024-01-15T10:30:00Z', path: '/Queen/A Night at the Opera/05. \'39.flac' },
    { name: '06. Sweet Lady.flac', type: 'audio', size: 35678901, modified: '2024-01-15T10:30:00Z', path: '/Queen/A Night at the Opera/06. Sweet Lady.flac' },
    { name: '07. Seaside Rendezvous.flac', type: 'audio', size: 26789012, modified: '2024-01-15T10:30:00Z', path: '/Queen/A Night at the Opera/07. Seaside Rendezvous.flac' },
    { name: '08. The Prophet\'s Song.flac', type: 'audio', size: 67890123, modified: '2024-01-15T10:30:00Z', path: '/Queen/A Night at the Opera/08. The Prophet\'s Song.flac' },
    { name: '09. Love of My Life.flac', type: 'audio', size: 29012345, modified: '2024-01-15T10:30:00Z', path: '/Queen/A Night at the Opera/09. Love of My Life.flac' },
    { name: '10. Good Company.flac', type: 'audio', size: 27890123, modified: '2024-01-15T10:30:00Z', path: '/Queen/A Night at the Opera/10. Good Company.flac' },
    { name: '11. Bohemian Rhapsody.flac', type: 'audio', size: 45678901, modified: '2024-01-15T10:30:00Z', path: '/Queen/A Night at the Opera/11. Bohemian Rhapsody.flac' },
    { name: '12. God Save the Queen.flac', type: 'audio', size: 12345678, modified: '2024-01-15T10:30:00Z', path: '/Queen/A Night at the Opera/12. God Save the Queen.flac' },
    { name: 'cover.jpg', type: 'image', size: 1234567, modified: '2024-01-15T10:30:00Z', path: '/Queen/A Night at the Opera/cover.jpg' },
  ],
};

const FileManager: React.FC = () => {
  const theme = useTheme();

  const [currentPath, setCurrentPath] = useState('/');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; file: FileItem } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<FileItem | null>(null);
  const [renameDialog, setRenameDialog] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState('');

  const currentFiles = mockFileSystem[currentPath] || [];

  const filteredFiles = currentFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'folder': return <FolderIcon />;
      case 'audio': return <AudioFileIcon />;
      case 'image': return <ImageIcon />;
      default: return <FileIcon />;
    }
  };

  const getFileColor = (type: string) => {
    switch (type) {
      case 'folder': return theme.palette.warning.main;
      case 'audio': return theme.palette.primary.main;
      case 'image': return theme.palette.success.main;
      default: return theme.palette.text.secondary;
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'folder') {
      setCurrentPath(file.path);
    } else {
      setSelectedFile(file);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, file: FileItem) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      file,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
  };

  const getPathSegments = () => {
    if (currentPath === '/') return [{ name: 'Home', path: '/' }];

    const segments = currentPath.split('/').filter(Boolean);
    const pathSegments = [{ name: 'Home', path: '/' }];

    let currentSegmentPath = '';
    segments.forEach(segment => {
      currentSegmentPath += `/${segment}`;
      pathSegments.push({ name: segment, path: currentSegmentPath });
    });

    return pathSegments;
  };

  const handleDelete = (file: FileItem) => {
    // Delete logic would go here
    toast.success(`Deleted: ${file.name}`);
    setDeleteDialog(null);
    handleCloseContextMenu();
  };

  const handleRename = (file: FileItem) => {
    // Rename logic would go here
    toast.success(`Renamed: ${file.name} to ${newName}`);
    setRenameDialog(null);
    setNewName('');
    handleCloseContextMenu();
  };

  const handlePlay = (file: FileItem) => {
    if (file.type === 'audio') {
      toast.success(`Playing: ${file.name}`);
    }
    handleCloseContextMenu();
  };

  const handleDownload = (file: FileItem) => {
    toast.success(`Downloading: ${file.name}`);
    handleCloseContextMenu();
  };

  const totalFiles = filteredFiles.filter(f => f.type !== 'folder').length;
  const totalFolders = filteredFiles.filter(f => f.type === 'folder').length;
  const totalSize = filteredFiles
    .filter(f => f.size)
    .reduce((sum, f) => sum + (f.size || 0), 0);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        📁 File Manager
      </Typography>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {totalFiles}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Files
                  </Typography>
                </Box>
                <AudioFileIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {totalFolders}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Folders
                  </Typography>
                </Box>
                <FolderIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {formatFileSize(totalSize)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Total Size
                  </Typography>
                </Box>
                <FolderOpenIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Card>
        <CardContent>
          {/* Navigation */}
          <Box sx={{ mb: 3 }}>
            <Breadcrumbs>
              {getPathSegments().map((segment, index) => (
                <Link
                  key={segment.path}
                  component="button"
                  variant="body1"
                  onClick={() => navigateToPath(segment.path)}
                  sx={{
                    textDecoration: 'none',
                    color: index === getPathSegments().length - 1 ? 'text.primary' : 'primary.main',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {index === 0 ? <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} /> : null}
                  {segment.name}
                </Link>
              ))}
            </Breadcrumbs>
          </Box>

          {/* Search */}
          <TextField
            fullWidth
            placeholder="Search files and folders..."
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

          {/* File List */}
          <List>
            {filteredFiles.map((file, index) => (
              <ListItem
                key={file.path}
                button
                onClick={() => handleFileClick(file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
                sx={{
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  borderRadius: 2,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              >
                <ListItemIcon>
                  <Box sx={{ color: getFileColor(file.type) }}>
                    {getFileIcon(file.type)}
                  </Box>
                </ListItemIcon>

                <ListItemText
                  primary={
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {file.name}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Chip
                        label={file.type}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: 'capitalize' }}
                      />
                      {file.size && (
                        <Typography variant="caption">
                          {formatFileSize(file.size)}
                        </Typography>
                      )}
                      <Typography variant="caption">
                        {format(new Date(file.modified), 'MMM dd, yyyy HH:mm')}
                      </Typography>
                    </Box>
                  }
                />

                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={(e) => handleContextMenu(e, file)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          {filteredFiles.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <FolderOpenIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
                {searchQuery ? 'No files found' : 'Empty folder'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'This folder doesn\'t contain any files yet'
                }
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {contextMenu?.file.type === 'audio' && (
          <MenuItem onClick={() => contextMenu && handlePlay(contextMenu.file)}>
            <PlayIcon sx={{ mr: 1 }} />
            Play
          </MenuItem>
        )}

        <MenuItem onClick={() => contextMenu && handleDownload(contextMenu.file)}>
          <DownloadIcon sx={{ mr: 1 }} />
          Download
        </MenuItem>

        <MenuItem onClick={() => {
          if (contextMenu) {
            setRenameDialog(contextMenu.file);
            setNewName(contextMenu.file.name);
          }
        }}>
          <EditIcon sx={{ mr: 1 }} />
          Rename
        </MenuItem>

        <MenuItem onClick={() => contextMenu && setDeleteDialog(contextMenu.file)}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>

        <MenuItem onClick={() => contextMenu && setSelectedFile(contextMenu.file)}>
          <InfoIcon sx={{ mr: 1 }} />
          Properties
        </MenuItem>
      </Menu>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Delete File</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
          <Button
            onClick={() => deleteDialog && handleDelete(deleteDialog)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameDialog} onClose={() => setRenameDialog(null)}>
        <DialogTitle>Rename File</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="New name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialog(null)}>Cancel</Button>
          <Button
            onClick={() => renameDialog && handleRename(renameDialog)}
            variant="contained"
            disabled={!newName.trim()}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Properties Dialog */}
      <Dialog
        open={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>File Properties</DialogTitle>
        <DialogContent>
          {selectedFile && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{selectedFile.name}</Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                <Typography variant="body1" sx={{ mb: 2, textTransform: 'capitalize' }}>
                  {selectedFile.type}
                </Typography>
              </Grid>

              {selectedFile.size && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Size</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {formatFileSize(selectedFile.size)}
                  </Typography>
                </Grid>
              )}

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Path</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                  {selectedFile.path}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Modified</Typography>
                <Typography variant="body1">
                  {format(new Date(selectedFile.modified), 'MMMM dd, yyyy at HH:mm')}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedFile(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileManager;
