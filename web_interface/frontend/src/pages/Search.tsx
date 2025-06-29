import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  PlayArrow as PlayIcon,
  Album as AlbumIcon,
  Person as ArtistIcon,
  QueueMusic as PlaylistIcon,
  MusicNote as TrackIcon,
  MusicNote as MusicNoteIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

// Hooks
import { useDownloadContext } from '../contexts/DownloadContext';

// Types
interface SearchResult {
  id: string;
  type: 'track' | 'album' | 'artist' | 'playlist';
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  cover_url?: string;
  url: string;
  source: string;
  quality?: string;
  release_date?: string;
  track_count?: number;
}

interface SearchFilters {
  source: string;
  type: string;
  quality: number;
}

const Search: React.FC = () => {
  const theme = useTheme();
  const { downloadUrl, downloadById } = useDownloadContext();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState<SearchFilters>({
    source: 'all',
    type: 'all',
    quality: 3,
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set());

  const sources = [
    { value: 'all', label: 'All Sources' },
    { value: 'qobuz', label: 'Qobuz' },
    { value: 'tidal', label: 'Tidal' },
    { value: 'deezer', label: 'Deezer' },
    { value: 'soundcloud', label: 'SoundCloud' },
  ];

  const types = [
    { value: 'all', label: 'All Types' },
    { value: 'track', label: 'Tracks' },
    { value: 'album', label: 'Albums' },
    { value: 'artist', label: 'Artists' },
    { value: 'playlist', label: 'Playlists' },
  ];

  const qualityOptions = [
    { value: 1, label: 'MP3 320kbps' },
    { value: 2, label: 'FLAC 16-bit' },
    { value: 3, label: 'FLAC 24-bit' },
    { value: 4, label: 'Master Quality' },
  ];

  const tabLabels = ['All', 'Tracks', 'Albums', 'Artists', 'Playlists'];

  // Mock search function - replace with actual API call
  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters) => {
    setIsSearching(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock results
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'track',
          title: 'Bohemian Rhapsody',
          artist: 'Queen',
          album: 'A Night at the Opera',
          duration: 355,
          cover_url: 'https://via.placeholder.com/300x300?text=Album+Cover',
          url: 'https://example.com/track/1',
          source: 'qobuz',
          quality: 'FLAC 24-bit',
          release_date: '1975',
        },
        {
          id: '2',
          type: 'album',
          title: 'A Night at the Opera',
          artist: 'Queen',
          track_count: 12,
          cover_url: 'https://via.placeholder.com/300x300?text=Album+Cover',
          url: 'https://example.com/album/2',
          source: 'qobuz',
          quality: 'FLAC 24-bit',
          release_date: '1975',
        },
        {
          id: '3',
          type: 'artist',
          title: 'Queen',
          cover_url: 'https://via.placeholder.com/300x300?text=Artist+Photo',
          url: 'https://example.com/artist/3',
          source: 'qobuz',
        },
        {
          id: '4',
          type: 'playlist',
          title: 'Classic Rock Hits',
          artist: 'Various Artists',
          track_count: 50,
          cover_url: 'https://via.placeholder.com/300x300?text=Playlist+Cover',
          url: 'https://example.com/playlist/4',
          source: 'qobuz',
        },
      ];

      setSearchResults(mockResults);
    } catch (error) {
      toast.error('Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    performSearch(query, filters);
  }, [query, filters, performSearch]);

  const handleDownload = async (result: SearchResult) => {
    setDownloadingItems(prev => new Set(prev).add(result.id));

    try {
      if (result.url.startsWith('http')) {
        await downloadUrl(result.url, filters.quality);
      } else {
        await downloadById(result.source, result.type, result.id, filters.quality);
      }

      toast.success(`Started downloading: ${result.title}`);
    } catch (error: any) {
      toast.error(error.message || 'Download failed');
    } finally {
      setDownloadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(result.id);
        return newSet;
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'track': return <TrackIcon />;
      case 'album': return <AlbumIcon />;
      case 'artist': return <ArtistIcon />;
      case 'playlist': return <PlaylistIcon />;
      default: return <MusicNoteIcon />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'track': return theme.palette.primary.main;
      case 'album': return theme.palette.secondary.main;
      case 'artist': return theme.palette.success.main;
      case 'playlist': return theme.palette.warning.main;
      default: return theme.palette.text.secondary;
    }
  };

  const filteredResults = searchResults.filter(result => {
    if (activeTab === 0) return true; // All
    const tabType = tabLabels[activeTab].toLowerCase().slice(0, -1); // Remove 's'
    return result.type === tabType;
  });

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        🔍 Music Search
      </Typography>

      {/* Search Bar and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              fullWidth
              placeholder="Search for music, albums, artists, or playlists..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: query && (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setQuery('')} size="small">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />

            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              startIcon={isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
              sx={{ minWidth: 120 }}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Source</InputLabel>
              <Select
                value={filters.source}
                onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
                label="Source"
              >
                {sources.map(source => (
                  <MenuItem key={source.value} value={source.value}>
                    {source.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                label="Type"
              >
                {types.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Quality</InputLabel>
              <Select
                value={filters.quality}
                onChange={(e) => setFilters(prev => ({ ...prev, quality: e.target.value as number }))}
                label="Quality"
              >
                {qualityOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardContent>
            {/* Results Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {tabLabels.map((label, index) => (
                  <Tab
                    key={label}
                    label={`${label} (${index === 0 ? searchResults.length : searchResults.filter(r => r.type === label.toLowerCase().slice(0, -1)).length})`}
                  />
                ))}
              </Tabs>
            </Box>

            {/* Results Grid */}
            <AnimatePresence>
              <Grid container spacing={2}>
                {filteredResults.map((result, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={result.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: theme.shadows[8],
                          },
                        }}
                      >
                        {/* Cover Image */}
                        <Box sx={{ position: 'relative' }}>
                          <CardMedia
                            component="img"
                            height="200"
                            image={result.cover_url}
                            alt={result.title}
                            sx={{
                              objectFit: 'cover',
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            }}
                          />

                          {/* Type Badge */}
                          <Chip
                            icon={getTypeIcon(result.type)}
                            label={result.type}
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              backgroundColor: alpha(getTypeColor(result.type), 0.9),
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />

                          {/* Source Badge */}
                          <Chip
                            label={result.source}
                            size="small"
                            variant="outlined"
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              backgroundColor: alpha(theme.palette.background.paper, 0.9),
                              textTransform: 'capitalize',
                            }}
                          />
                        </Box>

                        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                          {/* Title */}
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              mb: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {result.title}
                          </Typography>

                          {/* Artist/Album Info */}
                          {result.artist && (
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.secondary',
                                mb: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {result.artist}
                            </Typography>
                          )}

                          {result.album && result.type === 'track' && (
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.secondary',
                                mb: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {result.album}
                            </Typography>
                          )}

                          {/* Additional Info */}
                          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                            {result.duration && (
                              <Chip
                                label={formatDuration(result.duration)}
                                size="small"
                                variant="outlined"
                              />
                            )}

                            {result.track_count && (
                              <Chip
                                label={`${result.track_count} tracks`}
                                size="small"
                                variant="outlined"
                              />
                            )}

                            {result.quality && (
                              <Chip
                                label={result.quality}
                                size="small"
                                variant="outlined"
                                sx={{ color: 'success.main' }}
                              />
                            )}

                            {result.release_date && (
                              <Chip
                                label={result.release_date}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>

                          {/* Actions */}
                          <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
                            <Button
                              variant="contained"
                              startIcon={
                                downloadingItems.has(result.id) ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <DownloadIcon />
                                )
                              }
                              onClick={() => handleDownload(result)}
                              disabled={downloadingItems.has(result.id)}
                              fullWidth
                              sx={{
                                background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                                '&:hover': {
                                  background: `linear-gradient(45deg, ${theme.palette.primary.dark} 30%, ${theme.palette.secondary.dark} 90%)`,
                                },
                              }}
                            >
                              {downloadingItems.has(result.id) ? 'Downloading...' : 'Download'}
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </AnimatePresence>

            {filteredResults.length === 0 && searchResults.length > 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                  No results found for this filter
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Try selecting a different tab or adjusting your filters
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {searchResults.length === 0 && !isSearching && (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" sx={{ mb: 2, color: 'text.secondary' }}>
                Search for Music
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                Enter a song, album, artist, or playlist name to get started
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Chip label="Try: Bohemian Rhapsody" variant="outlined" />
                <Chip label="Try: Pink Floyd" variant="outlined" />
                <Chip label="Try: Dark Side of the Moon" variant="outlined" />
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Search;
