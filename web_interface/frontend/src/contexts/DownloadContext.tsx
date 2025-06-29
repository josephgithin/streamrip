import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

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

interface QueueStatus {
  queued: number;
  active: number;
  completed: number;
  failed: number;
  queue: DownloadTask[];
  active_downloads: DownloadTask[];
  recent_completed: DownloadTask[];
  recent_failed: DownloadTask[];
}

interface DownloadContextType {
  // Queue status
  queueStatus: QueueStatus | null;
  isLoading: boolean;
  
  // Actions
  downloadUrl: (url: string, quality?: number) => Promise<void>;
  downloadUrls: (urls: string[], quality?: number) => Promise<void>;
  downloadById: (source: string, mediaType: string, mediaId: string, quality?: number) => Promise<void>;
  uploadFile: (file: File, quality?: number) => Promise<void>;
  pauseDownload: (downloadId: string) => Promise<void>;
  cancelDownload: (downloadId: string) => Promise<void>;
  
  // Refresh
  refreshQueue: () => void;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const useDownloadContext = () => {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error('useDownloadContext must be used within a DownloadProvider');
  }
  return context;
};

interface DownloadProviderProps {
  children: React.ReactNode;
}

export const DownloadProvider: React.FC<DownloadProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  
  // Fetch queue status
  const {
    data: queueStatus,
    isLoading,
    refetch: refreshQueue,
  } = useQuery<QueueStatus>(
    'queueStatus',
    async () => {
      const response = await axios.get('/api/v1/downloads/queue');
      return response.data;
    },
    {
      refetchInterval: 2000, // Refresh every 2 seconds
      refetchIntervalInBackground: true,
    }
  );

  // Download URL mutation
  const downloadUrlMutation = useMutation(
    async ({ url, quality }: { url: string; quality?: number }) => {
      const response = await axios.post('/api/v1/downloads/url', {
        url,
        quality,
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Download added to queue');
        queryClient.invalidateQueries('queueStatus');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to add download';
        toast.error(message);
      },
    }
  );

  // Download URLs mutation
  const downloadUrlsMutation = useMutation(
    async ({ urls, quality }: { urls: string[]; quality?: number }) => {
      const response = await axios.post('/api/v1/downloads/urls', {
        urls,
        quality,
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success(`Added ${data.download_ids?.length || 0} downloads to queue`);
        queryClient.invalidateQueries('queueStatus');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to add downloads';
        toast.error(message);
      },
    }
  );

  // Download by ID mutation
  const downloadByIdMutation = useMutation(
    async ({ source, media_type, media_id, quality }: {
      source: string;
      media_type: string;
      media_id: string;
      quality?: number;
    }) => {
      const response = await axios.post('/api/v1/downloads/id', {
        source,
        media_type,
        media_id,
        quality,
      });
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Download added to queue');
        queryClient.invalidateQueries('queueStatus');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to add download';
        toast.error(message);
      },
    }
  );

  // Upload file mutation
  const uploadFileMutation = useMutation(
    async ({ file, quality }: { file: File; quality?: number }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (quality !== undefined) {
        formData.append('quality', quality.toString());
      }

      const response = await axios.post('/api/v1/downloads/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success(`Added ${data.download_ids?.length || 0} downloads from file`);
        queryClient.invalidateQueries('queueStatus');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to upload file';
        toast.error(message);
      },
    }
  );

  // Pause download mutation
  const pauseDownloadMutation = useMutation(
    async (downloadId: string) => {
      const response = await axios.post(`/api/v1/downloads/${downloadId}/pause`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Download paused');
        queryClient.invalidateQueries('queueStatus');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to pause download';
        toast.error(message);
      },
    }
  );

  // Cancel download mutation
  const cancelDownloadMutation = useMutation(
    async (downloadId: string) => {
      const response = await axios.delete(`/api/v1/downloads/${downloadId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Download cancelled');
        queryClient.invalidateQueries('queueStatus');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to cancel download';
        toast.error(message);
      },
    }
  );

  // Context methods
  const downloadUrl = async (url: string, quality?: number) => {
    await downloadUrlMutation.mutateAsync({ url, quality });
  };

  const downloadUrls = async (urls: string[], quality?: number) => {
    await downloadUrlsMutation.mutateAsync({ urls, quality });
  };

  const downloadById = async (source: string, mediaType: string, mediaId: string, quality?: number) => {
    await downloadByIdMutation.mutateAsync({
      source,
      media_type: mediaType,
      media_id: mediaId,
      quality,
    });
  };

  const uploadFile = async (file: File, quality?: number) => {
    await uploadFileMutation.mutateAsync({ file, quality });
  };

  const pauseDownload = async (downloadId: string) => {
    await pauseDownloadMutation.mutateAsync(downloadId);
  };

  const cancelDownload = async (downloadId: string) => {
    await cancelDownloadMutation.mutateAsync(downloadId);
  };

  const contextValue: DownloadContextType = {
    // Queue status
    queueStatus: queueStatus || null,
    isLoading,
    
    // Actions
    downloadUrl,
    downloadUrls,
    downloadById,
    uploadFile,
    pauseDownload,
    cancelDownload,
    
    // Refresh
    refreshQueue,
  };

  return (
    <DownloadContext.Provider value={contextValue}>
      {children}
    </DownloadContext.Provider>
  );
};
