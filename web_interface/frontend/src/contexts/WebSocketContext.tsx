import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

// Types
interface ProgressUpdate {
  download_id: string;
  type: string;
  title: string;
  artist?: string;
  album?: string;
  progress: number;
  speed?: string;
  eta?: string;
  status: string;
  timestamp: string;
}

interface LogMessage {
  level: string;
  message: string;
  timestamp: string;
  source: string;
}

interface StatusUpdate {
  type: string;
  [key: string]: any;
}

interface WebSocketContextType {
  // Connection status
  connected: boolean;
  progressConnected: boolean;
  logsConnected: boolean;
  
  // Data
  progressUpdates: ProgressUpdate[];
  logMessages: LogMessage[];
  
  // Methods
  clearProgress: () => void;
  clearLogs: () => void;
  
  // Event handlers
  onProgressUpdate: (callback: (update: ProgressUpdate) => void) => () => void;
  onLogMessage: (callback: (log: LogMessage) => void) => () => void;
  onStatusUpdate: (callback: (status: StatusUpdate) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  // Connection states
  const [connected, setConnected] = useState(false);
  const [progressConnected, setProgressConnected] = useState(false);
  const [logsConnected, setLogsConnected] = useState(false);
  
  // Data states
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [logMessages, setLogMessages] = useState<LogMessage[]>([]);
  
  // WebSocket connections
  const [progressSocket, setProgressSocket] = useState<Socket | null>(null);
  const [logsSocket, setLogsSocket] = useState<Socket | null>(null);
  
  // Event callbacks
  const [progressCallbacks, setProgressCallbacks] = useState<Set<(update: ProgressUpdate) => void>>(new Set());
  const [logCallbacks, setLogCallbacks] = useState<Set<(log: LogMessage) => void>>(new Set());
  const [statusCallbacks, setStatusCallbacks] = useState<Set<(status: StatusUpdate) => void>>(new Set());

  // Initialize WebSocket connections
  useEffect(() => {
    const initializeConnections = () => {
      // Progress WebSocket
      const progressWs = io('/ws/progress', {
        transports: ['websocket'],
        upgrade: true,
      });

      progressWs.on('connect', () => {
        console.log('📊 Progress WebSocket connected');
        setProgressConnected(true);
        setConnected(true);
        toast.success('Real-time progress connected');
      });

      progressWs.on('disconnect', () => {
        console.log('📊 Progress WebSocket disconnected');
        setProgressConnected(false);
        setConnected(false);
        toast.error('Progress connection lost');
      });

      progressWs.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          
          if (message.type === 'progress_update') {
            const update: ProgressUpdate = message.data;
            setProgressUpdates(prev => {
              const newUpdates = [...prev, update];
              // Keep only last 100 updates
              return newUpdates.slice(-100);
            });
            
            // Notify callbacks
            progressCallbacks.forEach(callback => callback(update));
          } else if (message.type === 'status_update') {
            statusCallbacks.forEach(callback => callback(message.data));
          }
        } catch (error) {
          console.error('Failed to parse progress message:', error);
        }
      });

      // Logs WebSocket
      const logsWs = io('/ws/logs', {
        transports: ['websocket'],
        upgrade: true,
      });

      logsWs.on('connect', () => {
        console.log('📝 Logs WebSocket connected');
        setLogsConnected(true);
      });

      logsWs.on('disconnect', () => {
        console.log('📝 Logs WebSocket disconnected');
        setLogsConnected(false);
      });

      logsWs.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          
          if (message.type === 'log_message') {
            const log: LogMessage = message.data;
            setLogMessages(prev => {
              const newLogs = [...prev, log];
              // Keep only last 500 logs
              return newLogs.slice(-500);
            });
            
            // Notify callbacks
            logCallbacks.forEach(callback => callback(log));
            
            // Show toast for important logs
            if (log.level === 'ERROR') {
              toast.error(log.message);
            } else if (log.level === 'WARNING') {
              toast(log.message, { icon: '⚠️' });
            }
          }
        } catch (error) {
          console.error('Failed to parse log message:', error);
        }
      });

      setProgressSocket(progressWs);
      setLogsSocket(logsWs);
    };

    initializeConnections();

    // Cleanup on unmount
    return () => {
      if (progressSocket) {
        progressSocket.disconnect();
      }
      if (logsSocket) {
        logsSocket.disconnect();
      }
    };
  }, []);

  // Keep alive mechanism
  useEffect(() => {
    const keepAlive = setInterval(() => {
      if (progressSocket?.connected) {
        progressSocket.emit('ping');
      }
      if (logsSocket?.connected) {
        logsSocket.emit('ping');
      }
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(keepAlive);
  }, [progressSocket, logsSocket]);

  // Methods
  const clearProgress = useCallback(() => {
    setProgressUpdates([]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogMessages([]);
  }, []);

  const onProgressUpdate = useCallback((callback: (update: ProgressUpdate) => void) => {
    setProgressCallbacks(prev => {
      const newSet = new Set(prev);
      newSet.add(callback);
      return newSet;
    });

    // Return cleanup function
    return () => {
      setProgressCallbacks(prev => {
        const newSet = new Set(prev);
        newSet.delete(callback);
        return newSet;
      });
    };
  }, []);

  const onLogMessage = useCallback((callback: (log: LogMessage) => void) => {
    setLogCallbacks(prev => {
      const newSet = new Set(prev);
      newSet.add(callback);
      return newSet;
    });

    return () => {
      setLogCallbacks(prev => {
        const newSet = new Set(prev);
        newSet.delete(callback);
        return newSet;
      });
    };
  }, []);

  const onStatusUpdate = useCallback((callback: (status: StatusUpdate) => void) => {
    setStatusCallbacks(prev => {
      const newSet = new Set(prev);
      newSet.add(callback);
      return newSet;
    });

    return () => {
      setStatusCallbacks(prev => {
        const newSet = new Set(prev);
        newSet.delete(callback);
        return newSet;
      });
    };
  }, []);

  const contextValue: WebSocketContextType = {
    // Connection status
    connected,
    progressConnected,
    logsConnected,
    
    // Data
    progressUpdates,
    logMessages,
    
    // Methods
    clearProgress,
    clearLogs,
    
    // Event handlers
    onProgressUpdate,
    onLogMessage,
    onStatusUpdate,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
