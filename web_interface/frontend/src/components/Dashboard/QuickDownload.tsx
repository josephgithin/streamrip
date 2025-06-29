import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Add as AddIcon,
  Clear as ClearIcon,
  QueueMusic as QueueIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Hooks
import { useDownloadContext } from '../../contexts/DownloadContext';

interface QuickDownloadProps {
  className?: string;
}

const QuickDownload: React.FC<QuickDownloadProps> = ({ className }) => {
  const theme = useTheme();
  const { downloadUrl, downloadUrls } = useDownloadContext();
  
  const [urls, setUrls] = useState<string[]>(['']);
  const [quality, setQuality] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const qualityOptions = [
    { value: 1, label: 'MP3 320kbps', description: 'High Quality' },
    { value: 2, label: 'FLAC 16-bit', description: 'Lossless' },
    { value: 3, label: 'FLAC 24-bit', description: 'Hi-Res' },
    { value: 4, label: 'Master Quality', description: 'Studio Master' },
  ];

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const removeUrlField = (index: number) => {
    if (urls.length > 1) {
      const newUrls = urls.filter((_, i) => i !== index);
      setUrls(newUrls);
    }
  };

  const handleSubmit = async () => {
    const validUrls = urls.filter(url => url.trim() !== '');
    
    if (validUrls.length === 0) {
      toast.error('Please enter at least one URL');
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (validUrls.length === 1) {
        await downloadUrl(validUrls[0], quality);
        toast.success('Download started!');
      } else {
        await downloadUrls(validUrls, quality);
        toast.success(`${validUrls.length} downloads started!`);
      }
      
      // Reset form
      setUrls(['']);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start download');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasteMultiple = (event: React.ClipboardEvent) => {
    const pastedText = event.clipboardData.getData('text');
    const pastedUrls = pastedText.split('\n').filter(url => url.trim() !== '');
    
    if (pastedUrls.length > 1) {
      event.preventDefault();
      setUrls(pastedUrls);
      toast.success(`${pastedUrls.length} URLs pasted`);
    }
  };

  return (
    <Card 
      className={className}
      sx={{
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <QueueIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Quick Download
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <AnimatePresence>
            {urls.map((url, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TextField
                    fullWidth
                    placeholder={`Enter music URL ${index + 1}...`}
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    onPaste={index === 0 ? handlePasteMultiple : undefined}
                    variant="outlined"
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: alpha(theme.palette.background.paper, 0.5),
                      },
                    }}
                  />
                  
                  {urls.length > 1 && (
                    <Tooltip title="Remove URL">
                      <IconButton
                        onClick={() => removeUrlField(index)}
                        sx={{ ml: 1 }}
                        size="small"
                      >
                        <ClearIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>

          <Button
            startIcon={<AddIcon />}
            onClick={addUrlField}
            variant="text"
            size="small"
            sx={{ mb: 2 }}
          >
            Add Another URL
          </Button>
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Quality</InputLabel>
            <Select
              value={quality}
              onChange={(e) => setQuality(e.target.value as number)}
              label="Quality"
            >
              {qualityOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {option.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {option.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="Spotify"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
            <Chip
              label="Qobuz"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
            <Chip
              label="Tidal"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
            <Chip
              label="Deezer"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          </Box>

          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleSubmit}
            disabled={isSubmitting || urls.every(url => url.trim() === '')}
            sx={{
              minWidth: 120,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              '&:hover': {
                background: `linear-gradient(45deg, ${theme.palette.primary.dark} 30%, ${theme.palette.secondary.dark} 90%)`,
              },
            }}
          >
            {isSubmitting ? 'Starting...' : 'Download'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default QuickDownload;
