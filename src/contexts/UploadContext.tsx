import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL?.replace(/\/api\/?$/, '') || '';

interface UploadTask {
  id: string; // Local ID
  videoId?: number; // Server ID
  file: File;
  title: string;
  description: string;
  visibility: string;
  categoryId: string;
  allowDownload: boolean;
  status: 'pending' | 'uploading' | 'merging' | 'waiting' | 'processing' | 'ready' | 'error';
  progress: number;
  encodingProgress: number;
  engine?: string;
  error?: string;
  currentRes?: string;
  thumbnail_url?: string;
}

interface UploadContextType {
  tasks: UploadTask[];
  activeTaskCount: number;
  addTask: (task: Omit<UploadTask, 'status' | 'progress' | 'encodingProgress'>) => void;
  removeTask: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

let socket: Socket;

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  useEffect(() => {
    socket = io(API_BASE_URL);
    return () => {
      socket.disconnect();
    };
  }, []);

  // Priority 3: Derived State accuracy
  const uniqueTasks = useMemo(() => {
    const seen = new Set<string>();
    return tasks.filter(t => {
      const fingerprint = t.file ? `${t.file.name}-${t.file.size}` : t.id;
      if (seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    });
  }, [tasks]);

  const addTask = async (taskData: any) => {
    setTasks(prev => {
      // 1. Priority 1: Global Fingerprint Lock
      const duplicateIdx = prev.findIndex(t => 
        t.id === taskData.id || 
        (t.file?.name === taskData.file?.name && t.file?.size === taskData.file?.size)
      );
      
      if (duplicateIdx !== -1) {
        // Deep Merge implementation: Update existing placeholder with server items securely
        const updatedTasks = [...prev];
        updatedTasks[duplicateIdx] = {
          ...updatedTasks[duplicateIdx],
          ...taskData,
          // Protect running execution states from being overwritten by a late state-merge
          status: updatedTasks[duplicateIdx].status === 'pending' ? 'pending' : updatedTasks[duplicateIdx].status,
          progress: updatedTasks[duplicateIdx].progress || 0,
          encodingProgress: updatedTasks[duplicateIdx].encodingProgress || 0
        };
        return updatedTasks;
      }

      // Generate clean state for definitively new tasks
      const newTask: UploadTask = {
        ...taskData,
        status: 'pending',
        progress: 0,
        encodingProgress: 0,
      };
      return [...prev, newTask];
    });
  };

// Upload Queue Manager: Max 2 parallel uploads
  const queueCheckInProgress = React.useRef(false);
  const activeNetworkHash = React.useRef(new Set<string>());

  useEffect(() => {
    if (queueCheckInProgress.current) return;
    
    // activeUploads only tracks things actively consuming network (not backend GPU/Waiting tasks)
    const activeUploads = tasks.filter(t => ['uploading', 'merging'].includes(t.status)).length;
    
    if (activeUploads < 2) {
      const nextTask = tasks.find(t => t.status === 'pending');
      if (nextTask) {
        queueCheckInProgress.current = true;
        
        // immediately set uploading
        setTasks(prev => {
          const updated = prev.map(t => t.id === nextTask.id ? { ...t, status: 'uploading' as const } : t);
          
          setTimeout(() => {
             processTask({ ...nextTask, status: 'uploading' });
             queueCheckInProgress.current = false;
          }, 0);
          
          return updated;
        });
      }
    }
  }, [tasks]);

  const processTask = async (task: UploadTask) => {
    // Layer 1: Frontend Network Lock
    const fileHash = `${task.file?.name || 'unknown'}_${String(task.file?.size || 0)}`;
    if (activeNetworkHash.current.has(fileHash)) return;
    activeNetworkHash.current.add(fileHash);

    let videoId: number | undefined;
    let uploadId: string | undefined;

    try {
      // 1. Create Draft on Server
      const draftRes = await api.post('/videos/draft', {
        title: task.title,
        description: task.description,
        visibility: task.visibility,
        categoryId: task.categoryId,
        allowDownload: task.allowDownload,
        size: task.file?.size,
      });
      
      videoId = draftRes.data.videoId || draftRes.data.id;
      uploadId = draftRes.data.uploadId;
      
      updateTask(task.id, { videoId });

      // 2. Start Chunked Upload
      const fileSize = task.file?.size || 0;
      // --- OPTIMASI CHUNK & PARALLEL UPLOAD (TAHAP 48) ---
      const CHUNK_SIZE = 12 * 1024 * 1024; // Diperbesar ke 12MB untuk memangkas 80% overhead HTTP RTT
      const CONCURRENCY_LIMIT = 3; // Mengirim 3 chunk sekaligus secara bersamaan
      
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
      const allChunks = [];
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileSize);
        allChunks.push({
           chunk: task.file?.slice(start, end),
           index: i
        });
      }

      let currentIndex = 0;

      const worker = async () => {
        while (currentIndex < allChunks.length) {
          const i = currentIndex++;
          const chunkData = allChunks[i];
          
          const formData = new FormData();
          if (chunkData.chunk) {
            formData.append('chunk', chunkData.chunk);
          }
          formData.append('chunkIndex', String(chunkData.index || 0));
          formData.append('totalChunks', String(totalChunks || 0));
          formData.append('filename', task.file?.name || 'video.mp4');
          formData.append('uploadId', uploadId || '');
          formData.append('videoId', String(videoId || ''));
      
          // Kirim chunk via HTTP dengan keep-alive
          let retryCount = 0;
          const maxRetries = 3;
          let success = false;
          while (!success && retryCount < maxRetries) {
            try {
              const res = await api.post('/upload/chunk', formData, {
                headers: { 'Connection': 'keep-alive' },
                onUploadProgress: (progressEvent: any) => {
                  const chunkProgress = (progressEvent.loaded / progressEvent.total);
                  const overallProgress = Math.round(((chunkData.index + chunkProgress) / totalChunks) * 100);
                  updateTask(task.id, { progress: overallProgress });
                }
              });
              if (res.data.status === 'merging') {
                updateTask(task.id, { status: 'merging', progress: 100 });
              } else if (res.data.status === 'waiting') {
                updateTask(task.id, { status: 'waiting', progress: 100 });
              }
              success = true;
            } catch (err) {
              retryCount++;
              if (retryCount >= maxRetries) throw err;
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        }
      };

      const workers = Array(Math.min(CONCURRENCY_LIMIT, totalChunks)).fill(null).map(() => worker());
      await Promise.all(workers);

  // 3. Listen for Encoding Progress via Socket
      const handleProgress = (data: any) => {
        // Priority 4: Strict find mapping for sockets
        setTasks((prevTasks) => {
           // We safely just find via ID internally, context maintains references. But wait!
           // The outer updateTask uses setTask internally, we can just use updateTask!
           // Since we don't have task.id if it was dropped from state, wait...
           // Actually, we do have task.id in the scope! 
           // But just in case, we'll let updateTask handle it.
           return prevTasks;
        });

        if (data.status === 'ready') {
          updateTask(task.id, { status: 'ready', encodingProgress: 100, engine: data.engine || 'NVENC GPU' });
          socket.off(`encoding-progress-${uploadId}`, handleProgress);
          socket.off(`video-progress-${videoId}`, handleProgress);
          
          setTimeout(() => {
            removeTask(task.id);
          }, 5000);
        } else if (data.status === 'waiting') {
          updateTask(task.id, { status: 'waiting', progress: 100 });
        } else if (data.status === 'processing') {
          updateTask(task.id, (prevTask) => ({ 
            status: 'processing',
            // Lock progressing strictly forwards, preventing flickering
            encodingProgress: Math.max(prevTask.encodingProgress || 0, data.progress ?? data.percent ?? 0), 
            currentRes: data.resolution || prevTask.currentRes,
            engine: data.engine || prevTask.engine || 'NVENC GPU',
            thumbnail_url: data.thumbnail_url || prevTask.thumbnail_url
          }));
        } else if (data.status === 'error' || data.status === 'failed') {
          updateTask(task.id, { status: 'error', error: data.error || 'Processing failed' });
          socket.off(`encoding-progress-${uploadId}`, handleProgress);
          socket.off(`video-progress-${videoId}`, handleProgress);
        }
      };

      socket.on(`encoding-progress-${uploadId}`, handleProgress);
      socket.on(`video-progress-${videoId}`, handleProgress);

    } catch (err: any) {
      console.error('Upload task failed:', err);
      // Layer 1 Cleanup on error
      activeNetworkHash.current.delete(`${task.file?.name || 'unknown'}_${String(task.file?.size || 0)}`);

      updateTask(task.id, { 
        status: 'error', 
        error: err.response?.data?.error || err.message || 'Upload failed' 
      });
      if (videoId) {
        api.patch(`/videos/${videoId}/progress`, { status: 'error' }).catch(() => {});
      }
    }
  };

  const updateTask = (id: string, data: Partial<UploadTask> | ((prev: UploadTask) => Partial<UploadTask>)) => {
    setTasks(prev => {
      // 4. Strict Socket Mapping via Find
      const targetExists = prev.some(t => t.id === id);
      if (!targetExists) return prev; // Do not create an orphan task if ID doesn't exist

      return prev.map(t => {
        if (t.id === id) {
          const payload = typeof data === 'function' ? data(t) : data;
          return { ...t, ...payload };
        }
        return t;
      });
    });
  };

  const removeTask = (id: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (task) {
        activeNetworkHash.current.delete(`${task.file?.name || 'unknown'}_${String(task.file?.size || 0)}`);
      }
      return prev.filter(t => t.id !== id);
    });
  };

  return (
    <UploadContext.Provider value={{ tasks: uniqueTasks, activeTaskCount: uniqueTasks.length, addTask, removeTask }}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) throw new Error('useUpload must be used within an UploadProvider');
  return context;
};
