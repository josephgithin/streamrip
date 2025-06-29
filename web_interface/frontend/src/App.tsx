import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Components
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import Dashboard from './pages/Dashboard';
import Downloads from './pages/Downloads';
import Search from './pages/Search';
import Configuration from './pages/Configuration';
import Database from './pages/Database';
import FileManager from './pages/FileManager';

// Contexts
import { WebSocketProvider } from './contexts/WebSocketContext';
import { DownloadProvider } from './contexts/DownloadContext';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Modern dark theme with music-focused colors
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1', // Indigo
      light: '#818cf8',
      dark: '#4f46e5',
    },
    secondary: {
      main: '#ec4899', // Pink
      light: '#f472b6',
      dark: '#db2777',
    },
    background: {
      default: '#0f172a', // Slate 900
      paper: '#1e293b', // Slate 800
    },
    surface: {
      main: '#334155', // Slate 700
    },
    text: {
      primary: '#f1f5f9', // Slate 100
      secondary: '#cbd5e1', // Slate 300
    },
    success: {
      main: '#10b981', // Emerald 500
    },
    warning: {
      main: '#f59e0b', // Amber 500
    },
    error: {
      main: '#ef4444', // Red 500
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          '&:hover': {
            border: '1px solid rgba(148, 163, 184, 0.2)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
});

// Extend theme type for custom colors
declare module '@mui/material/styles' {
  interface Palette {
    surface: Palette['primary'];
  }
  interface PaletteOptions {
    surface?: PaletteOptions['primary'];
  }
}

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <WebSocketProvider>
          <DownloadProvider>
            <Router>
              <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                {/* Sidebar */}
                <Sidebar />
                
                {/* Main Content */}
                <Box
                  component="main"
                  sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                  }}
                >
                  {/* Top Bar */}
                  <TopBar />
                  
                  {/* Page Content */}
                  <Box
                    sx={{
                      flexGrow: 1,
                      p: 3,
                      backgroundColor: 'background.default',
                    }}
                  >
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/downloads" element={<Downloads />} />
                      <Route path="/search" element={<Search />} />
                      <Route path="/configuration" element={<Configuration />} />
                      <Route path="/database" element={<Database />} />
                      <Route path="/files" element={<FileManager />} />
                    </Routes>
                  </Box>
                </Box>
              </Box>
            </Router>
            
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.divider}`,
                },
                success: {
                  iconTheme: {
                    primary: theme.palette.success.main,
                    secondary: theme.palette.background.paper,
                  },
                },
                error: {
                  iconTheme: {
                    primary: theme.palette.error.main,
                    secondary: theme.palette.background.paper,
                  },
                },
              }}
            />
          </DownloadProvider>
        </WebSocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
