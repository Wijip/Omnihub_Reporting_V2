import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { io } from 'socket.io-client';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL?.replace(/\/api\/?$/, '') || '';

const getThumbnailUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  
  // Combine API_BASE_URL intelligently. If url starts with '/', prepend it directly.
  const pathPart = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${pathPart}`;
};
import { 
  BarChart2, 
  Play, 
  Eye, 
  Edit3, 
  Trash2, 
  Settings, 
  Globe, 
  Lock, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Save, 
  X,
  Upload as UploadIcon,
  LayoutDashboard,
  Clock,
  PlayCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Skeleton } from '../components/Skeleton';
import { useUpload } from '../contexts/UploadContext';
import { cn, formatWatchTime } from '../lib/utils';

export default function StudioPage() {
  const { tasks, activeTaskCount } = useUpload();
  const [videos, setVideos] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'videos' | 'live'>('videos');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imgErrors, setImgErrors] = useState<{ [key: string]: boolean }>({});

  // Toggle Centang Satuan
  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Toggle Pilih Semua
  const handleSelectAll = (filteredList: any[]) => {
    if (selectedIds.length === filteredList.length && filteredList.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map(v => v.id));
    }
  };

  // Handler Hapus Massal (Bulk Delete)
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} video yang dipilih? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/videos/bulk-delete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ videoIds: selectedIds })
      });

      if (res.ok) {
        setSelectedIds([]);
        if (typeof fetchVideos === 'function') fetchVideos();
      } else {
        alert("Gagal menghapus beberapa video.");
      }
    } catch (err) {
      console.error("Bulk Delete Exception:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 10000);
    
    // --- SAME-ORIGIN AUTO-PORT SOCKET CLIENT (TAHAP 55.6) ---
    // Tanpa parameter URL agar otomatis mengarah ke window.location.origin
    const socket = io({
      transports: ['websocket', 'polling'],
      autoConnect: true
    });
    socket.onAny((event, data) => {
      if (event.startsWith('video-progress-')) {
        const videoId = parseInt(event.replace('video-progress-', ''));
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, ...data } : v));
      }
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  // --- DIRECT REACT STATE REALTIME ENGINE (TAHAP 54.3) ---
  const [activeTasks, setActiveTasks] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('active_upload_tasks') || '[]');
    } catch (e) {
      return [];
    }
  });

  // Sync balik ke localStorage secara asinkron sebagai backup saja
  useEffect(() => {
    if (activeTasks.length > 0) {
      localStorage.setItem('active_upload_tasks', JSON.stringify(activeTasks));
    }
  }, [activeTasks]);

  // --- ABSOLUTE DEADLOCK-FREE AUTO-DISMISS ENGINE (TAHAP 54.12) ---
  useEffect(() => {
    const syncTasks = () => {
      try {
        const raw = localStorage.getItem('active_upload_tasks');
        if (raw) {
          const tasks = JSON.parse(raw);
          setActiveTasks(tasks.filter((t: any) => t !== null));
        }
      } catch (e) {
        console.error("Task sync error:", e);
      }
    };

    window.addEventListener('upload_task_updated', syncTasks);

    const interval = setInterval(async () => {
      const raw = localStorage.getItem('active_upload_tasks');
      if (!raw) return;

      let tasks = JSON.parse(raw);
      if (!Array.isArray(tasks) || tasks.length === 0) return;

      let stateChanged = false;
      const now = Date.now();

      const updatedTasks = await Promise.all(tasks.map(async (task) => {
        // 1. AUTO-DISMISS ERROR (4 Detik)
        if (task.status === 'error') {
          if (!task.errorTimestamp) {
            task.errorTimestamp = now;
            stateChanged = true;
          } else if (now - task.errorTimestamp >= 4000) {
            stateChanged = true;
            return null; // Hapus dari antrean
          }
          return task;
        }

        // 2. AUTO-DISMISS READY (3 Detik setelah SELESAI)
        if (task.status === 'ready') {
          task.encodingProgress = 100;
          if (!task.finishTimestamp) {
            task.finishTimestamp = now;
            stateChanged = true;
          } else if (now - task.finishTimestamp >= 3000) {
            stateChanged = true;
            return null; // Hapus dari antrean
          }
          return task;
        }

        // STAGE 77.5: POLLING SYNC UNTUK SEMUA TASK YANG BELUM READY
        if (task.status !== 'ready' && task.status !== 'error') {
          try {
            const res = await fetch(`/api/video/encoding-status/${task.id}`);
            if (res.ok) {
              const data = await res.json();
              const serverEnc = typeof data.encodingProgress === 'number' ? data.encodingProgress : 0;

              // JIKA SERVER SUDAH READY ATAU 100% -> PINDAH STATUS KE READY
              if (data.status === 'ready' || serverEnc >= 100) {
                task.status = 'ready';
                task.uploadProgress = 100;
                task.encodingProgress = 100;
                task.finishTimestamp = now;
                stateChanged = true;
              } else if (data.status === 'processing' || serverEnc > 0) {
                task.status = 'processing';
                task.uploadProgress = 100;
                const cappedEnc = Math.min(99, Math.max(task.encodingProgress || 0, serverEnc));
                if (cappedEnc !== task.encodingProgress || task.status !== 'processing') {
                  task.encodingProgress = cappedEnc;
                  stateChanged = true;
                }
              }
            }
          } catch (err) {
            console.error("Polling error:", err);
          }
        }

        return task;
      }));

      const validTasks = updatedTasks.filter((t) => t !== null);

      if (stateChanged || validTasks.length !== tasks.length) {
        localStorage.setItem('active_upload_tasks', JSON.stringify(validTasks));
        setActiveTasks(validTasks);
        
        if (typeof fetchVideos === 'function') fetchVideos();
      }
    }, 200);

    return () => {
      window.removeEventListener('upload_task_updated', syncTasks);
      clearInterval(interval);
    };
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await api.get('/studio/videos');
      const fetchedVideos = res.data;
      setVideos(fetchedVideos);
      if (loading) setLoading(false);

      // STAGE 77.5: Cross-check active upload tasks with database status
      const rawTasks = localStorage.getItem('active_upload_tasks');
      if (rawTasks) {
        const currentTasks = JSON.parse(rawTasks);
        let taskSyncNeeded = false;
        const syncedTasks = currentTasks.map((t: any) => {
          if (!t) return null;
          const match = fetchedVideos.find((v: any) => 
            (v.title && t.title && v.title.trim() === t.title.trim()) || 
            (v.upload_id && v.upload_id === t.id)
          );
          if (match && match.status === 'ready' && t.status !== 'ready') {
            taskSyncNeeded = true;
            return {
              ...t,
              status: 'ready',
              uploadProgress: 100,
              encodingProgress: 100,
              finishTimestamp: Date.now()
            };
          }
          return t;
        }).filter((t: any) => t !== null);

        if (taskSyncNeeded) {
          localStorage.setItem('active_upload_tasks', JSON.stringify(syncedTasks));
          setActiveTasks(syncedTasks);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load studio videos');
      setLoading(false);
    }
  };

  // Fungsi Hentikan Paksa Satu Tugas (Tahap 53)
  const handleAbortTask = async (taskId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghentikan paksa proses ini?")) return;

    try {
      await fetch('/api/video/abort-processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: taskId })
      });

      // Hapus dari localStorage
      const rawTasks = localStorage.getItem('active_upload_tasks');
      if (rawTasks) {
        const tasks = JSON.parse(rawTasks);
        const updated = tasks.filter((t: any) => t.id !== taskId);
        localStorage.setItem('active_upload_tasks', JSON.stringify(updated));
      }

      if (typeof fetchVideos === 'function') fetchVideos();
    } catch (err) {
      console.error("Gagal hentikan paksa task:", err);
    }
  };

  // Fungsi Hentikan Paksa Semua Tugas (Tahap 53)
  const handleAbortAll = async () => {
    if (!window.confirm("⚠️ PERINGATAN: Hentikan PAKSA seluruh proses upload & encoding yang sedang berjalan?")) return;

    const rawTasks = localStorage.getItem('active_upload_tasks');
    if (!rawTasks) return;

    const tasks = JSON.parse(rawTasks);
    for (const task of tasks) {
      try {
        await fetch('/api/video/abort-processing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId: task.id })
        });
      } catch (e) {}
    }

    localStorage.removeItem('active_upload_tasks');
    if (typeof fetchVideos === 'function') fetchVideos();
    window.location.reload();
  };

  const handleEdit = (video: any) => {
    setEditingVideo({ ...video });
    setPreviewThumbnail(null);
  };

  const handleSave = async () => {
    if (!editingVideo) return;
    setIsSaving(true);
    try {
      await api.patch(`/videos/${editingVideo.id}`, {
        title: editingVideo.title,
        description: editingVideo.description,
        visibility: editingVideo.visibility,
        allow_download: editingVideo.allow_download
      });
      setVideos(videos.map(v => v.id === editingVideo.id ? editingVideo : v));
      setEditingVideo(null);
    } catch (err) {
      setError('Failed to update video');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/videos/${deleteId}`);
      setVideos(videos.filter(v => v.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setError('Failed to delete video');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && videos.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-12 w-64 rounded-2xl" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-12 w-40 rounded-full" />
            <Skeleton className="h-12 w-40 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass rounded-[2.5rem] p-6 space-y-6 border border-neutral-100 dark:border-neutral-800">
              <Skeleton className="aspect-video w-full rounded-[2rem]" />
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const filteredVideos = videos.filter((video: any) => {
    const isLiveContent = (video.url || '').includes('live_stream') || (video.url || '').includes('Camera_Record') || (video.title || '').toLowerCase().includes('live');
    return activeTab === 'live' ? isLiveContent : !isLiveContent;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16 pb-[calc(128px+env(safe-area-inset-bottom))] space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 text-[10px] font-black uppercase tracking-widest">
            <LayoutDashboard size={14} /> Creator Studio
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-neutral-900 dark:text-white font-display leading-tight">
            Manage Your <span className="text-brand-600">Content</span>
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium max-w-md">
            Track performance, edit metadata, and monitor your upload queue in real-time.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <Link 
            to={`/channel/${user?.id}`}
            className="flex-1 md:flex-none bg-white dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-800 text-neutral-900 dark:text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-brand-600 transition-all shadow-xl shadow-black/5 flex items-center justify-center gap-3 active:scale-95"
          >
            <Globe className="w-5 h-5 text-brand-600" />
            <span>Public Channel</span>
          </Link>
          {/* Tombol Akses Live Studio Baru (Tahap 43.2) */}
          <Link 
            to="/studio/live"
            className="flex-1 md:flex-none bg-red-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-2xl shadow-red-500/30 flex items-center justify-center gap-3 active:scale-95 hover:scale-[1.02]"
          >
            <span className="text-lg">🔴</span> 
            <span>Go Live</span>
          </Link>
          <Link 
            to="/upload" 
            className="flex-1 md:flex-none bg-brand-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-700 transition-all shadow-2xl shadow-brand-500/30 flex items-center justify-center gap-3 active:scale-95"
          >
            <UploadIcon className="w-5 h-5" /> 
            <span>New Upload</span>
          </Link>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-500/10 text-red-600 p-6 rounded-3xl border border-red-100 dark:border-red-500/20 flex items-center gap-4 font-bold"
        >
          <AlertCircle size={24} /> {error}
          <button onClick={() => setError(null)} className="ml-auto p-2 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </motion.div>
      )}

      {/* Active Tasks Section */}
      {activeTaskCount > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
              Active Tasks ({activeTaskCount})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task, idx) => (
              <motion.div 
                key={task?.id || `task-${idx}`} 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass p-6 rounded-[2rem] border border-brand-100 dark:border-brand-500/10 shadow-xl shadow-brand-500/5 space-y-4 hover:shadow-brand-500/10 transition-all group/task"
              >
                <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 relative bg-neutral-100 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                  {task?.thumbnail_url && !imgErrors[`task-${task?.id}`] ? (
                    <img 
                      src={getThumbnailUrl(task.thumbnail_url)} 
                      className="w-full h-full object-cover group-hover/task:scale-105 transition-transform duration-500" 
                      alt="Preview"
                      onError={() => setImgErrors(prev => ({ ...prev, [`task-${task?.id}`]: true }))} 
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
                      <div className="relative">
                        <Loader2 size={32} className="animate-spin opacity-50 mb-3" />
                        <div className="absolute inset-0 bg-brand-500/20 blur-xl rounded-full" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 dark:bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50">
                        Generation in Progress
                      </span>
                    </div>
                  )}
                  {task?.status === 'ready' && (
                    <div className="absolute top-2 left-2 bg-green-500/80 backdrop-blur-md text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-white/20 shadow-lg">
                      Ready
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-neutral-900 dark:text-white truncate font-display group-hover/task:text-brand-600 transition-colors">{task?.title || 'Unknown Title'}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        task?.status === 'error' ? "text-red-500" : "text-brand-600"
                      )}>
                        {task?.status === 'pending' ? 'Waiting to Upload' :
                         task?.status === 'uploading' ? 'Uploading' : 
                         task?.status === 'merging' ? 'Merging Chunks' :
                         task?.status === 'waiting' ? 'Waiting in Queue' :
                         task?.status === 'processing' ? 'Encoding' : 
                         task?.status === 'ready' ? 'Ready' : task?.status || 'Unknown State'}
                      </span>
                      <span className="text-[9px] font-black text-neutral-400">•</span>
                      <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                        {task?.status === 'uploading' ? `${task?.progress || 0}%` : 
                         task?.status === 'processing' ? `${task?.encodingProgress || 0}%` : 
                         task?.status === 'pending' ? 'Queued' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  {task?.status === 'ready' ? (
                    <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-600 shadow-sm">
                      <CheckCircle size={18} />
                    </div>
                  ) : task?.status === 'error' ? (
                    <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 shadow-sm">
                      <XCircle size={18} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 shadow-sm">
                      <Loader2 className="animate-spin" size={18} />
                    </div>
                  )}
                </div>
                
                <div className="relative w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden shadow-inner">
                  <motion.div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      task?.status === 'uploading' ? 'bg-brand-600' : 
                      task?.status === 'error' ? 'bg-red-500' : 'bg-orange-500'
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${task?.status === 'uploading' ? (task?.progress || 0) : (task?.status === 'merging' ? 100 : (task?.encodingProgress || 0))}%` }}
                  />
                </div>

                {task?.status === 'processing' && task?.currentRes && (
                  <div className="flex items-center gap-2 text-[9px] font-black text-neutral-400 uppercase tracking-widest animate-pulse">
                    <Settings size={12} /> {task?.currentRes} • {task?.engine || 'CPU'}
                  </div>
                )}
                {task?.error && (
                  <p className="text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-500/5 p-2 rounded-lg border border-red-100 dark:border-red-500/10">
                    {task.error}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Video List Section */}
      <div className="space-y-8">
        {/* PANEL BATCH UPLOAD MONITOR 50+ VIDEO (TAHAP 52) */}
        {(() => {
          const tasks = activeTasks;
          if (!Array.isArray(tasks) || tasks.length === 0) return null;

          const totalCount = tasks.length;
          const completedCount = tasks.filter((t: any) => t.status === 'ready').length;
          const activeCount = tasks.filter((t: any) => t.status === 'uploading' || t.status === 'processing').length;
          const queuedCount = tasks.filter((t: any) => t.status === 'queued').length;

          return (
            <div className="bg-neutral-900 border border-blue-500/40 rounded-2xl p-5 mb-8 shadow-2xl">
              {/* Header Ringkasan Antrean */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-spin">🔄</span>
                  <div>
                    <h3 className="font-black text-white text-base">
                      Memproses Pengunggahan Masal ({completedCount}/{totalCount} Selesai)
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {activeCount} Aktif | {queuedCount} Mengantre | {completedCount} Siap
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleAbortAll}
                    className="text-xs bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg font-bold transition-all"
                  >
                    🚨 Hentikan Paksa Semua
                  </button>
                  <button 
                    onClick={() => {
                      const remaining = tasks.filter((t: any) => t.status !== 'ready');
                      setActiveTasks(remaining);
                    }}
                    className="text-xs text-neutral-400 hover:text-white underline font-semibold"
                  >
                    Bersihkan Selesai
                  </button>
                </div>
              </div>

              {/* Scrollable List item 50+ Video dengan Dual Progress Bar (Tahap 52.1) */}
              <div className="max-h-72 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {tasks.filter((t: any) => t.status !== 'ready').map((task: any) => (
                  <div key={task.id} className="bg-neutral-950/80 p-3.5 rounded-xl border border-neutral-800 flex flex-col gap-2.5">
                    
                    {/* Baris Atas: Judul, Status Badge & Tombol Abort (Tahap 53) */}
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-white truncate">{task.title}</p>
                      
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          task.status === 'uploading' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse' :
                          task.status === 'processing' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse' :
                          task.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
                          task.status === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-bounce' :
                          'bg-neutral-800 text-neutral-400'
                        }`}>
                          {task.status === 'queued' ? '⏳ Mengantre' : 
                           task.status === 'ready' ? '✅ SELESAI' :
                           task.status === 'error' ? '❌ GAGAL' : 
                           task.status}
                        </span>
                        <button 
                          onClick={() => handleAbortTask(task.id)}
                          title="Hentikan Paksa Proses Ini"
                          className="text-xs text-red-400 hover:text-red-300 bg-neutral-900 hover:bg-red-950/50 p-1.5 rounded-lg border border-neutral-800 hover:border-red-500/40 transition-all"
                        >
                          🛑
                        </button>
                      </div>
                    </div>

                    {/* Baris Tengah: Bar 1 - Upload Progress (Biru Realtime Direct XHR) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-neutral-400 font-semibold">
                        <span>Upload File</span>
                        <span className="text-blue-400 font-mono font-bold">{Math.min(100, Math.max(0, task.uploadProgress || 0))}%</span>
                      </div>
                      <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-neutral-800/80 p-0.5">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all duration-150 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                          style={{ width: `${Math.min(100, Math.max(0, task.uploadProgress || 0))}%` }}
                        />
                      </div>
                    </div>

                    {/* Baris Bawah: Bar 2 - GPU Transcoding Progress (Ungu Realtime Direct State) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-neutral-400 font-semibold">
                        <span>GPU Transcode (NVENC)</span>
                        <span className="text-purple-400 font-mono font-bold">{Math.min(100, Math.max(0, task.encodingProgress || 0))}%</span>
                      </div>
                      <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-neutral-800/80 p-0.5">
                        <div 
                          className="bg-purple-500 h-full rounded-full transition-all duration-150 ease-linear shadow-[0_0_10px_rgba(168,85,247,0.6)]"
                          style={{ width: `${Math.min(100, Math.max(0, task.encodingProgress || 0))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* FLOATING ACTION BAR MULTI-SELECT (TAHAP 51) */}
        {selectedIds.length > 0 && (
          <div className="sticky top-4 z-50 bg-neutral-900/95 backdrop-blur-md border border-red-500/40 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-2xl animate-fade-in">
            <div className="flex items-center gap-4">
              <span className="bg-red-500/20 text-red-400 font-black text-xs px-3 py-1.5 rounded-full border border-red-500/30">
                {selectedIds.length} TERPILIH
              </span>
              <button 
                onClick={() => handleSelectAll(filteredVideos)}
                className="text-xs font-bold text-neutral-300 hover:text-white transition-colors"
              >
                {selectedIds.length === filteredVideos.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <span>🗑️</span>
                <span>{isDeleting ? 'Menghapus...' : `Hapus ${selectedIds.length} Video`}</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigasi Tab Konten Baru (Tahap 43.4) */}
        <div className="flex border-b border-neutral-800 mb-6 gap-6">
            <button 
                onClick={() => setActiveTab('videos')}
                className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'videos' ? 'border-brand-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
            >
                Video Upload
            </button>
            <button 
                onClick={() => setActiveTab('live')}
                className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'live' ? 'border-red-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
            >
                Siaran Langsung (Live)
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVideos.length === 0 ? (
            <div className="col-span-full py-32 text-center space-y-6 glass rounded-[3rem] border-2 border-dashed border-neutral-100 dark:border-neutral-800">
              <div className="w-24 h-24 bg-neutral-50 dark:bg-neutral-900 rounded-[2rem] flex items-center justify-center mx-auto text-neutral-300 dark:text-neutral-700">
                <PlayCircle size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-neutral-900 dark:text-white font-display">No videos yet</h3>
                <p className="text-neutral-500 dark:text-neutral-400 font-medium">Start your journey by uploading your first video.</p>
              </div>
              <Link 
                to="/upload" 
                className="inline-flex items-center gap-3 bg-brand-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20"
              >
                <UploadIcon size={18} /> Upload Now
              </Link>
            </div>
          ) : (
            filteredVideos.map((video, idx) => (
              <motion.div 
                key={video?.id || idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group glass rounded-[2.5rem] overflow-hidden border border-neutral-100 dark:border-neutral-800 hover:border-brand-600/30 transition-all duration-500 shadow-xl shadow-black/5 hover:shadow-brand-500/10"
              >
                <div className="aspect-video relative overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                  {/* Checkbox Multi-Select (Tahap 51) */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); handleToggleSelect(video.id); }}
                    className="absolute top-3 left-3 z-20 cursor-pointer"
                  >
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(video.id)}
                      onChange={() => {}} // dikontrol oleh parent click
                      className="w-5 h-5 accent-red-600 rounded cursor-pointer shadow-md"
                    />
                  </div>
                  {video?.thumbnail_url && !imgErrors[video?.id] ? (
                    <img 
                      src={getThumbnailUrl(video.thumbnail_url)} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      referrerPolicy="no-referrer" 
                      onError={() => setImgErrors(prev => ({ ...prev, [video?.id]: true }))}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-300 dark:text-neutral-700">
                      {video?.status === 'processing' || video?.status === 'merging' ? (
                        <>
                          <div className="relative mb-3">
                            <Loader2 size={32} className="animate-spin opacity-50" />
                            <div className="absolute inset-0 bg-brand-500/20 blur-xl rounded-full" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 dark:bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 text-neutral-600 dark:text-neutral-400">
                            Generation in Progress
                          </span>
                        </>
                      ) : (
                        <Play size={48} fill="currentColor" className="opacity-10" />
                      )}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                    <Link 
                      to={`/video/${video?.id}`}
                      className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-brand-600 shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500"
                    >
                      <Play size={24} fill="currentColor" className="ml-1" />
                    </Link>
                  </div>

                  <div className="absolute top-4 right-4 flex gap-2">
                    <span className={cn(
                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10",
                      (video?.status === 'ready' || video?.status === 'completed') ? "bg-green-500/80 text-white" : 
                      video?.status === 'error' ? "bg-red-500/80 text-white" : "bg-orange-500/80 text-white"
                    )}>
                      {video?.status ? video.status.toUpperCase() : 'UNKNOWN'}
                    </span>
                    <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest backdrop-blur-md bg-black/40 text-white border border-white/10 flex items-center gap-2">
                      {video?.visibility === 'public' ? <Globe size={10} /> : <Lock size={10} />}
                      {video?.visibility || 'private'}
                    </span>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-neutral-900 dark:text-white font-display line-clamp-1 group-hover:text-brand-600 transition-colors">
                      {video?.title || 'Untitled'}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                      <Clock size={12} /> {new Date(video?.created_at || video?.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                      <div className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Views</div>
                      <div className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                        <Eye size={16} className="text-brand-600" /> {Number(video?.views || video?.viewCount || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                      <div className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Watch Time</div>
                      <div className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                        <BarChart2 size={16} className="text-brand-600" /> {formatWatchTime(Number(video?.watch_time || video?.watchTime || 0))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button 
                      onClick={() => handleEdit(video)}
                      className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-3 rounded-xl text-neutral-600 dark:text-neutral-400 hover:border-brand-600 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/5 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-sm"
                    >
                      <Edit3 size={16} /> Edit
                    </button>
                    <Link 
                      to={`/analytics/${video?.id}`}
                      className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-3 rounded-xl text-neutral-600 dark:text-neutral-400 hover:border-orange-600 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/5 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-sm"
                    >
                      <BarChart2 size={16} /> Stats
                    </Link>
                    <button 
                      onClick={() => setDeleteId(video?.id)}
                      className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-xl hover:bg-red-100 dark:hover:bg-red-600 dark:hover:text-white transition-all active:scale-95 shadow-sm"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* STAGE 76.1: ACCESSIBLE MOBILE EDIT MODAL CONTAINER */}
      <AnimatePresence>
        {editingVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingVideo(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white dark:bg-neutral-900 w-full max-w-2xl max-h-[92vh] rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-neutral-100 dark:border-neutral-800"
            >
              <div className="p-4 sm:p-8 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-neutral-900 dark:text-white font-display flex items-center gap-3">
                    <Edit3 className="text-brand-600" /> Edit Metadata
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Update your video details</p>
                </div>
                <button onClick={() => setEditingVideo(null)} className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-colors text-neutral-400">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Thumbnail</label>
                  <div className="relative aspect-video w-full max-w-[240px] bg-neutral-100 dark:bg-neutral-900 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-[2rem] overflow-hidden group/upload cursor-pointer flex items-center justify-center transition-colors hover:border-brand-500">
                    {previewThumbnail || (editingVideo?.thumbnail_url && !imgErrors[editingVideo?.id]) ? (
                      <img 
                        src={previewThumbnail || getThumbnailUrl(editingVideo?.thumbnail_url)} 
                        className="w-full h-full object-cover group-hover/upload:opacity-50 transition-opacity" 
                        alt="Thumbnail" 
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-neutral-400">
                        <UploadIcon size={24} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-center">Upload Image<br/><span className="text-[8px]">(Max 5MB)</span></span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/upload:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest">
                        {isUploadingThumbnail ? <Loader2 className="animate-spin" size={16}/> : <UploadIcon size={16}/>}
                        {isUploadingThumbnail ? 'Uploading...' : 'Change Thumbnail'}
                      </div>
                    </div>
                    
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      title="Upload custom thumbnail"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingThumbnail(true);
                        
                        const objectUrl = URL.createObjectURL(file);
                        setPreviewThumbnail(objectUrl);
                        
                        try {
                          const formData = new FormData();
                          formData.append('thumbnail', file);
                          const res = await api.patch(`/videos/${editingVideo?.id}/thumbnail`, formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                          });
                          setEditingVideo({ ...editingVideo, thumbnail_url: res.data.url });
                          setVideos(videos.map(v => v.id === editingVideo?.id ? { ...v, thumbnail_url: res.data.url } : v));
                        } catch (err) {
                          setError('Failed to upload thumbnail');
                          setPreviewThumbnail(null);
                        } finally {
                          setIsUploadingThumbnail(false);
                          if (e.target) e.target.value = '';
                        }
                      }}
                      disabled={isUploadingThumbnail}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Title</label>
                  <input 
                    type="text" 
                    value={editingVideo?.title || ''}
                    onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-600 transition-colors text-lg font-black font-display text-neutral-900 dark:text-white"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Description</label>
                  <textarea 
                    rows={5}
                    value={editingVideo?.description || ''}
                    onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-[2rem] py-4 px-6 focus:outline-none focus:border-brand-600 transition-colors resize-none text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Visibility</label>
                    <select 
                      value={editingVideo?.visibility || 'public'}
                      onChange={(e) => setEditingVideo({ ...editingVideo, visibility: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-600 transition-colors text-xs font-black uppercase tracking-widest text-neutral-700 dark:text-neutral-300 appearance-none cursor-pointer"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="unlisted">Unlisted</option>
                    </select>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Downloads</label>
                    <button
                      onClick={() => setEditingVideo({ ...editingVideo, allow_download: !editingVideo?.allow_download })}
                      className={cn(
                        "w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2",
                        editingVideo?.allow_download 
                          ? 'bg-brand-600 border-brand-600 text-white shadow-xl shadow-brand-500/20' 
                          : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-400'
                      )}
                    >
                      {editingVideo?.allow_download ? <CheckCircle size={18} /> : <XCircle size={18} />}
                      {editingVideo?.allow_download ? 'Downloads Enabled' : 'Downloads Disabled'}
                    </button>
                  </div>
                </div>
              </div>

              {/* STAGE 76.1: STICKY FOOTER GUARANTEE FOR MOBILE */}
              <div className="p-4 sm:p-8 bg-neutral-50 dark:bg-neutral-900/90 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-3 sm:gap-4 shrink-0 sticky bottom-0 z-10 backdrop-blur-md">
                <button 
                  onClick={() => setEditingVideo(null)}
                  className="px-5 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 md:flex-none bg-brand-600 text-white px-6 sm:px-12 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 active:scale-95"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white dark:bg-neutral-900 w-full max-w-md rounded-[3rem] shadow-2xl p-10 text-center border border-neutral-100 dark:border-neutral-800"
            >
              <div className="w-24 h-24 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-red-500/10">
                <Trash2 size={48} />
              </div>
              <h2 className="text-3xl font-black mb-4 text-neutral-900 dark:text-white font-display">Delete Content?</h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-10 leading-relaxed font-medium">
                This action is permanent. All video files, analytics, and community interactions will be lost forever.
              </p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                >
                  {isDeleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                  Confirm Deletion
                </button>
                <button 
                  onClick={() => setDeleteId(null)}
                  className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
                >
                  Keep Video
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
