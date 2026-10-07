import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { io } from 'socket.io-client';
import { 
  Play, ThumbsUp, ThumbsDown, Share2, MessageSquare, 
  User, Clock, Eye, List, Plus, Send, Loader2, 
  Flag, Download, AlertTriangle, Settings, ChevronDown, 
  ChevronUp, ChevronRight, Check, PlayCircle, Heart,
  Bookmark, MoreVertical, Volume2, Maximize2, FileText,
  Copy, CheckCircle2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RelatedVideoSkeleton } from '../components/Skeleton';
import { cn } from '../lib/utils';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL?.replace(/\/api\/?$/, '') || '';

const getThumbnailUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  const pathPart = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${pathPart}`;
};

export default function VideoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [currentResolution, setCurrentResolution] = useState<string | number | undefined>(undefined);
  const [video, setVideo] = useState<any>(null);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [likes, setLikes] = useState<{ likes: number, dislikes: number, userAction?: 'like' | 'dislike' | null }>({ likes: 0, dislikes: 0, userAction: null });
  const [newComment, setNewComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentRes, setCurrentRes] = useState('Original');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [resolutionsWithSizes, setResolutionsWithSizes] = useState<any[]>([]);
  const [channel, setChannel] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showWeeklyReportModal, setShowWeeklyReportModal] = useState(false);
  const [reportFields, setReportFields] = useState({
    pertemuan: '',
    program: '',
    materi: '',
    pembelajaran: ''
  });
  const [reportCopied, setReportCopied] = useState(false);
  const [detectedIsPortrait, setDetectedIsPortrait] = useState<boolean | null>(null);

  const storedUser = localStorage.getItem('user');
  const currentUser = (storedUser && storedUser !== "undefined") ? JSON.parse(storedUser) : null;
  
  const hasIncremented = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingTimeRef = useRef<number | null>(null);
  const pendingPlayStateRef = useRef<boolean>(false);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const target = e.currentTarget;
    if (target.videoWidth && target.videoHeight) {
      setDetectedIsPortrait(target.videoWidth < target.videoHeight);
    }

    if (videoRef.current) {
      if (pendingTimeRef.current !== null) {
        videoRef.current.currentTime = pendingTimeRef.current;
        if (pendingPlayStateRef.current) {
          videoRef.current.play().catch(console.error);
        }
        pendingTimeRef.current = null;
        pendingPlayStateRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (id && hasIncremented.current !== id) {
      api.post(`/videos/${id}/view`).catch(console.error);
      hasIncremented.current = id;
    }
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const videoElement = videoRef.current;
    
    const startHeartbeat = () => {
      interval = setInterval(() => {
         api.post(`/videos/${id}/heartbeat`).catch(console.error);
      }, 10000); // 10 seconds
    };

    const stopHeartbeat = () => {
      if (interval) clearInterval(interval);
    };

    if (videoElement) {
      videoElement.addEventListener('play', startHeartbeat);
      videoElement.addEventListener('pause', stopHeartbeat);
      videoElement.addEventListener('ended', stopHeartbeat);
      // in case it's currently playing when this runs
      if (!videoElement.paused) startHeartbeat();
    }

    return () => {
      stopHeartbeat();
      if (videoElement) {
        videoElement.removeEventListener('play', startHeartbeat);
        videoElement.removeEventListener('pause', stopHeartbeat);
        videoElement.removeEventListener('ended', stopHeartbeat);
      }
    };
  }, [id, currentUrl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.menu-container')) {
        setShowQualityMenu(false);
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (!videoRef.current) return;
      
      const key = e.key.toLowerCase();
      if (key === 'k') {
        if (videoRef.current.paused) {
          videoRef.current.play().catch(console.error);
        } else {
          videoRef.current.pause();
        }
      } else if (key === 'j') {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      } else if (key === 'l') {
         videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- INTEGRASI PLAYER HLS LIVE PUBLIK (TAHAP 45) ---
  useEffect(() => {
    // Jika video adalah Siaran Langsung (status 'live' atau format .m3u8)
    if (video && (video.status === 'live' || video.url?.endsWith('.m3u8'))) {
        const hlsUrl = video.url.startsWith('http') 
            ? video.url 
            : `http://${window.location.hostname}:8005${video.url}`;

        if (videoRef.current) {
            if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
                videoRef.current.src = hlsUrl;
            } else {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
                script.onload = () => {
                    if ((window as any).Hls && (window as any).Hls.isSupported()) {
                        const hls = new (window as any).Hls();
                        hls.loadSource(hlsUrl);
                        hls.attachMedia(videoRef.current);
                    }
                };
                document.body.appendChild(script);
            }
        }
    }
  }, [video]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [videoRes, commentsRes, likesRes, relatedRes] = await Promise.all([
          api.get(`/videos/${id}`),
          api.get(`/videos/${id}/comments`),
          api.get(`/videos/${id}/likes`),
          api.get(`/videos/${id}/related?limit=10`)
        ]);
        const videoData = videoRes.data;
        setVideo(videoData);
        setCurrentUrl(videoData.url);
        setComments(commentsRes.data);
        setLikes(likesRes.data);
        setRelatedVideos(relatedRes.data);

        const [channelResult, resolutionsResult] = await Promise.allSettled([
          api.get(`/channels/${videoData.user_id}`),
          api.get(`/videos/${id}/resolutions`)
        ]);

        if (channelResult.status === 'fulfilled') {
          setChannel(channelResult.value.data);
        } else {
          console.warn("Gagal memuat profil kreator, menggunakan fallback.", channelResult.reason);
          setChannel({
            id: videoData.user_id,
            firstName: 'Creator',
            lastName: '',
            subscriberCount: 0
          });
        }

        if (resolutionsResult.status === 'fulfilled') {
          const resData = resolutionsResult.value.data;
          setResolutions(resData);
          if (resData && resData.length > 0) {
            setCurrentResolution(resData[0].res || resData[0]);
          }
          setResolutionsWithSizes(resData);
        }

        const token = localStorage.getItem('token');
        if (token) {
          const playlistsRes = await api.get('/playlists');
          setPlaylists(playlistsRes.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load video');
      } finally {
        setLoading(false);
        setLoadingRelated(false);
      }
    };

    fetchData();

    const socket = io(API_BASE_URL);
    const handleProgress = async (data: any) => {
      if (data.status === 'ready') {
        const resWithSizes = await api.get(`/videos/${id}/resolutions`);
        setResolutionsWithSizes(resWithSizes.data);
        const videoRes = await api.get(`/videos/${id}`);
        setVideo(videoRes.data);
      }
    };
    
    socket.on(`video-progress-${id}`, handleProgress);

    return () => {
      socket.off(`video-progress-${id}`, handleProgress);
      socket.disconnect();
    };
  }, [id]);

  const handleToggleSubscribe = async () => {
    if (!currentUser) return alert('Please login to subscribe');
    setSubmitting(true);
    try {
      await api.post('/subscriptions/toggle', { leaderId: video.user_id });
      const channelRes = await api.get(`/channels/${video.user_id}`);
      setChannel(channelRes.data);
    } catch (err) {
      console.error('Failed to toggle subscription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (type: 'like' | 'dislike') => {
    const token = localStorage.getItem('token');
    if (!token) return alert('Please login to like/dislike');
    try {
      await api.post(`/videos/${id}/like`, { type });
      const likesRes = await api.get(`/videos/${id}/likes`);
      setLikes(likesRes.data);
    } catch (err) {
      console.error('Failed to update like status');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isPosting) return;
    const token = localStorage.getItem('token');
    if (!token) return alert('Please login to comment');

    setIsPosting(true);
    try {
      const res = await api.post(`/videos/${id}/comments`, { content: newComment });
      setComments([res.data, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment', err);
    } finally {
      setIsPosting(false);
    }
  };

  const changeQuality = (res: string) => {
    const videoElement = videoRef.current;
    
    if (videoElement) {
      pendingTimeRef.current = videoElement.currentTime;
      pendingPlayStateRef.current = !videoElement.paused;
    }

    if (res === 'Original') {
      setCurrentUrl(video.url);
    } else {
      const resObj = resolutionsWithSizes.find(r => r.resolution === res);
      if (resObj && resObj.url) {
        setCurrentUrl(resObj.url);
      } else {
        setCurrentUrl(`/processed/processed-${video.id}-${res}.mp4`);
      }
    }
    setCurrentRes(res);
    setShowQualityMenu(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-brand-100 dark:border-brand-900/30 border-t-brand-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Play size={24} className="text-brand-600" />
        </div>
      </div>
      <p className="text-neutral-500 dark:text-neutral-400 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Loading Experience...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-6">
      <div className="p-6 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-[2rem] mb-6">
        <AlertTriangle size={48} />
      </div>
      <h2 className="text-3xl font-black font-display text-neutral-900 dark:text-white mb-2">Something went wrong</h2>
      <p className="text-neutral-500 dark:text-neutral-400 font-medium max-w-xs">{error}</p>
      <button onClick={() => navigate('/')} className="mt-8 bg-brand-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-brand-500/20 active:scale-95">
        Back to Home
      </button>
    </div>
  );

  const isPortrait = detectedIsPortrait !== null 
    ? detectedIsPortrait 
    : (video?.width && video?.height ? video.width < video.height : false);
  const aspectRatio = video?.width && video?.height ? video.width / video.height : (isPortrait ? 9 / 16 : 16 / 9);

  return (
    <div className="flex flex-col gap-0 lg:gap-10 pb-24 transition-all duration-700 ease-in-out lg:grid lg:grid-cols-12">
      {/* Main Content Area */}
      <div className="space-y-8 transition-all duration-700 lg:col-span-8">
        {/* Modern Adaptive Video Player Container */}
        <motion.div 
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="relative group/player overflow-hidden shadow-2xl bg-black transition-all duration-500 flex items-center justify-center w-full aspect-video xs:rounded-[3rem] border border-neutral-100 dark:border-neutral-800"
          style={{ maxHeight: 'min(85vh, 900px)' }}
        >
          {/* Background Ambient Glow for Portrait Videos */}
          {isPortrait && (
            <div className="absolute inset-0 z-0 opacity-40 blur-[100px] scale-150 pointer-events-none overflow-hidden">
              <img 
                src={getThumbnailUrl(video.thumbnail_url)} 
                className="w-full h-full object-cover" 
                alt="" 
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <video
            ref={videoRef}
            src={video?.status === 'live' ? undefined : (video?.id && currentResolution ? `${API_BASE_URL}/api/videos/stream/${video.id}?res=${currentResolution}` : undefined)}
            controls
            autoPlay
            onLoadedMetadata={handleLoadedMetadata}
            controlsList="nodownload"
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full object-contain bg-black relative z-10 transition-all duration-500"
            poster={getThumbnailUrl(video.thumbnail_url)}
          />

          {/* Keyboard Shortcut Hints Overlay - Subtle */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover/player:opacity-100 transition-opacity pointer-events-none">
            <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[9px] font-black text-white/60 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><kbd className="bg-white/20 px-1.5 py-0.5 rounded">K</kbd> Play</span>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <span className="flex items-center gap-1.5"><kbd className="bg-white/20 px-1.5 py-0.5 rounded">J</kbd> -10s</span>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <span className="flex items-center gap-1.5"><kbd className="bg-white/20 px-1.5 py-0.5 rounded">L</kbd> +10s</span>
            </div>
          </div>
          
          {/* STAGE 76.0: MOBILE RESPONSIVE QUALITY OVERLAY */}
          <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-20 menu-container">
            <div className="relative">
              <button 
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="bg-black/60 backdrop-blur-xl text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 sm:gap-3 hover:bg-black/80 transition-all border border-white/10 shadow-2xl"
              >
                <Settings size={13} className={showQualityMenu ? 'animate-spin' : ''} />
                {currentResolution || 'Quality'}
              </button>
              
              <AnimatePresence>
                {showQualityMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-36 sm:w-40 max-h-[50vh] overflow-y-auto bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 custom-scrollbar"
                  >
                    <div className="px-3 py-2 text-[9px] font-black text-white/40 uppercase tracking-widest border-b border-white/5 mb-1.5">Quality</div>
                    {resolutions.map((item: any) => (
                      <button 
                        key={item.res}
                        onClick={() => setCurrentResolution(item.res)}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                          currentResolution === item.res ? 'bg-brand-600 text-white shadow-lg' : 'text-white/60 hover:bg-white/10'
                        )}
                      >
                        {item.res}p
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Video Info Section - Hidden on Desktop for Portrait (moved to sidebar) */}
        <div className="px-4 xs:px-6 lg:px-0 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 my-2">
              <h1 className="text-2xl md:text-4xl font-black text-neutral-900 dark:text-white font-display tracking-tight leading-tight">
                {video.title}
              </h1>
              {video?.status === 'live' && (
                  <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-md animate-pulse tracking-wider uppercase flex items-center gap-1">
                      <span>🔴</span> LIVE
                  </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-6 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
              <span className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 rounded-lg"><Eye size={14} className="text-brand-600" /> {video.views?.toLocaleString()} Views</span>
              <span className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 rounded-lg"><Clock size={14} className="text-brand-600" /> {new Date(video.created_at).toLocaleDateString()}</span>
            </div>
          </div>

            {/* Action Bar - Horizontally Scrollable on Mobile for Native App feel */}
            <div className="flex sm:items-center justify-between gap-6 py-5 border-y border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3 md:gap-4 shrink-0">
                <Link to={`/channel/${video.user_id}`} className="w-10 h-10 md:w-14 md:h-14 bg-brand-600 rounded-full md:rounded-[1.5rem] flex items-center justify-center text-white font-black text-sm md:text-xl shadow-xl shadow-brand-500/20 group-hover/author:scale-105 transition-transform overflow-hidden">
                  {video.first_name?.[0]}{video.last_name?.[0]}
                </Link>
                <div className="flex-1 min-w-0 pr-4">
                  <Link to={`/channel/${video.user_id}`} className="font-bold md:font-black text-sm md:text-xl text-neutral-900 dark:text-white hover:text-brand-600 transition-colors block truncate font-display">
                    {video.first_name} {video.last_name}
                  </Link>
                  <span className="text-[10px] md:text-xs text-neutral-400 font-bold md:font-black uppercase tracking-widest">{channel?.subscriberCount || 0} Subscribers</span>
                </div>
                <button 
                  onClick={handleToggleSubscribe}
                  disabled={submitting}
                  className={cn(
                    "px-4 md:px-8 py-2 md:py-3 rounded-full md:rounded-2xl font-bold md:font-black text-[10px] md:text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md",
                    channel?.isSubscribed 
                      ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800' 
                      : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-500/20'
                  )}
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : (channel?.isSubscribed ? 'Subscribed' : 'Subscribe')}
                </button>
              </div>
            </div>

            {/* STAGE 77.4: UNCLIPPED DROPDOWN ACTION CONTAINER */}
            <div className="flex items-center gap-2 pb-2 -mt-2 overflow-visible max-w-full relative z-30">
              <div className="flex items-center flex-shrink-0 bg-neutral-100 dark:bg-neutral-900 rounded-full md:rounded-2xl p-1 shadow-inner">
                <button 
                  onClick={() => handleLike('like')}
                  className="flex items-center gap-2 hover:bg-white dark:hover:bg-neutral-800 px-4 md:px-5 py-2 md:py-2.5 rounded-full md:rounded-xl font-bold md:font-black text-[10px] md:text-xs tracking-widest transition-all active:scale-95"
                >
                  <ThumbsUp size={16} className={cn("transition-colors", likes.userAction === 'like' ? "text-brand-600" : "text-neutral-400")} /> 
                  <span>{likes.likes}</span>
                </button>
                <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />
                <button 
                  onClick={() => handleLike('dislike')}
                  className="flex items-center gap-2 hover:bg-white dark:hover:bg-neutral-800 px-4 md:px-5 py-2 md:py-2.5 rounded-full md:rounded-xl font-bold md:font-black text-[10px] md:text-xs tracking-widest transition-all active:scale-95"
                >
                  <ThumbsDown size={16} className={cn("transition-colors", likes.userAction === 'dislike' ? "text-brand-600" : "text-neutral-400")} />
                </button>
              </div>
              
              <button className="flex items-center gap-2 flex-shrink-0 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 px-4 md:px-5 py-2.5 md:py-3 rounded-full md:rounded-2xl font-bold md:font-black text-[10px] md:text-xs tracking-widest transition-all active:scale-95">
                <Share2 size={16} className="text-brand-600" /> Share
              </button>
              
              <div className="relative menu-container flex-shrink-0 z-50">
                <button 
                  onClick={() => setShowDownloadMenu((prev) => !prev)}
                  className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 px-4 md:px-5 py-2.5 md:py-3 rounded-full md:rounded-2xl font-bold md:font-black text-[10px] md:text-xs tracking-widest transition-all"
                >
                  <Download size={16} className="text-brand-600" /> Download
                </button>
                <AnimatePresence>
                  {showDownloadMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-2 w-52 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden z-[100]"
                    >
                      <div className="p-2">
                        <div className="px-3 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                          Select Quality
                        </div>
                        {video.allow_download ? (
                          <>
                            <a 
                              href={`/api/videos/${video.id}/download?token=${localStorage.getItem('token')}`}
                              className="flex items-center justify-between px-3 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-sm font-medium"
                            >
                              <span>Original</span>
                              <span className="text-xs text-neutral-400">
                                {(() => {
                                  const originalSizeBytes = video.size || video.file_size || video.sizeBytes || video.fileSize;
                                  return originalSizeBytes && !isNaN(Number(originalSizeBytes)) 
                                    ? `${(Number(originalSizeBytes) / (1024 * 1024)).toFixed(1)} MB` 
                                    : 'Size Unavailable';
                                })()}
                              </span>
                            </a>
                            {resolutions.map((item: any) => (
                              <div key={item.res}>
                                <a 
                                  href={`${API_BASE_URL}/api/videos/download/${video?.id}?res=${item.res}`}
                                  className="flex items-center justify-between px-3 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-sm font-medium"
                                >
                                  <span>Download {item.res}p <span className="text-sm opacity-75">({item.size})</span></span>
                                </a>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="px-3 py-4 text-center text-sm text-neutral-500">
                            Downloads disabled by creator
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => setShowWeeklyReportModal(true)}
                className="flex items-center gap-2 flex-shrink-0 bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 px-4 md:px-5 py-2.5 md:py-3 rounded-full md:rounded-2xl font-bold md:font-black text-[10px] md:text-xs tracking-widest text-brand-600 transition-all active:scale-95 shadow-sm"
              >
                <FileText size={16} /> Report
              </button>
            </div>

          {/* --- TAHAP 66.0: DESCRIPTION & SINGLE-CLICK COPY CODE BLOCK --- */}
          <div className="space-y-4">
            {video.description && (video.description.includes('WEEKLY REPORT') || video.description.includes('```')) ? (
              <div className="bg-neutral-900 text-neutral-100 rounded-[2.5rem] p-6 border border-neutral-800 shadow-2xl relative overflow-hidden group/code">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-400 flex items-center gap-2">
                    <FileText size={14}/> Weekly Report (Auto-Generated by Gemini)
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const cleanText = video.description.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
                      navigator.clipboard.writeText(cleanText);
                      setReportCopied(true);
                      setTimeout(() => setReportCopied(false), 2000);
                    }}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-brand-500/20"
                  >
                    {reportCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    {reportCopied ? 'Copied!' : 'Copy Report'}
                  </button>
                </div>
                <pre className="font-mono text-xs md:text-sm leading-relaxed whitespace-pre-wrap overflow-x-auto text-neutral-300 custom-scrollbar p-2">
                  {video.description.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()}
                </pre>
              </div>
            ) : (
              <div 
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="glass rounded-[2.5rem] p-8 border border-neutral-100 dark:border-neutral-800 cursor-pointer group/desc relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover/desc:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600">
                    {showFullDescription ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
                <p className={cn(
                  "text-sm md:text-base text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed font-medium",
                  !showFullDescription && "line-clamp-3"
                )}>
                  {video.description || 'No description provided.'}
                </p>
                {!showFullDescription && (
                  <div className="mt-4 text-[10px] font-black text-brand-600 uppercase tracking-widest">Show More</div>
                )}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="space-y-10">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black font-display text-neutral-900 dark:text-white flex items-center gap-4">
                <MessageSquare size={28} className="text-brand-600" /> {comments.length} Comments
              </h3>
            </div>

            <form onSubmit={handlePostComment} className="flex gap-5">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-xl shadow-brand-500/20">
                {currentUser ? currentUser.firstName[0] : <User size={24} />}
              </div>
              <div className="flex-1 space-y-4">
                <textarea
                  rows={1}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a public comment..."
                  className="w-full bg-transparent border-b-2 border-neutral-100 dark:border-neutral-800 py-3 focus:outline-none focus:border-brand-600 transition-all text-base font-medium resize-none overflow-hidden"
                  onInput={(e: any) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                />
                <div className="flex justify-end gap-4">
                  <button 
                    type="button"
                    onClick={() => setNewComment('')}
                    className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!newComment.trim() || isPosting}
                    className="bg-brand-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 shadow-xl shadow-brand-500/20 hover:bg-brand-700 active:scale-95 transition-all"
                  >
                    {isPosting ? <Loader2 className="animate-spin" size={18} /> : 'Post Comment'}
                  </button>
                </div>
              </div>
            </form>
            
            <div className="space-y-10">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-5 group">
                  <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded-2xl flex items-center justify-center font-black text-neutral-400 flex-shrink-0 border border-neutral-200 dark:border-neutral-800">
                    {comment.first_name[0]}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-4">
                      <span className="font-black text-sm text-neutral-900 dark:text-white font-display">{comment.first_name} {comment.last_name}</span>
                      <span className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-neutral-700 dark:text-neutral-300 text-sm md:text-base leading-relaxed font-medium">{comment.content}</p>
                    <div className="flex items-center gap-6 pt-2">
                      <button className="flex items-center gap-2 text-[10px] font-black text-neutral-400 hover:text-brand-600 transition-colors uppercase tracking-widest">
                        <ThumbsUp size={14} /> 24
                      </button>
                      <button className="flex items-center gap-2 text-[10px] font-black text-neutral-400 hover:text-red-600 transition-colors uppercase tracking-widest">
                        <ThumbsDown size={14} />
                      </button>
                      <button className="text-[10px] font-black text-neutral-500 uppercase tracking-widest hover:text-brand-600">Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 xs:px-6 lg:px-0 py-10 lg:py-0 space-y-10 transition-all duration-700 lg:col-span-4">
        {/* For Portrait: Move Info here on Desktop */}
        {false && (
          <div className="hidden lg:block space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 my-2">
                <h1 className="text-3xl font-black text-neutral-900 dark:text-white font-display tracking-tight leading-tight">
                  {video.title}
                </h1>
                {video?.status === 'live' && (
                    <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-md animate-pulse tracking-wider uppercase flex items-center gap-1">
                        <span>🔴</span> LIVE
                    </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-6 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                <span className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 rounded-lg"><Eye size={14} className="text-brand-600" /> {video.views?.toLocaleString()} Views</span>
                <span className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 rounded-lg"><Clock size={14} className="text-brand-600" /> {new Date(video.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-6 border-y border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-4">
                <Link to={`/channel/${video.user_id}`} className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-brand-500/20">
                  {video.first_name?.[0]}{video.last_name?.[0]}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/channel/${video.user_id}`} className="font-black text-lg text-neutral-900 dark:text-white hover:text-brand-600 transition-colors block truncate font-display">
                    {video.first_name} {video.last_name}
                  </Link>
                  <span className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">{channel?.subscriberCount || 0} Subscribers</span>
                </div>
              </div>
              <button 
                onClick={handleToggleSubscribe}
                disabled={submitting}
                className={cn(
                  "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg",
                  channel?.isSubscribed 
                    ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500' 
                    : 'bg-brand-600 text-white hover:bg-brand-700'
                )}
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : (channel?.isSubscribed ? 'Subscribed' : 'Subscribe')}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xl text-neutral-900 dark:text-white font-display tracking-tight">Up Next</h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Autoplay</span>
              <div className="w-10 h-5 bg-brand-600 rounded-full relative">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {loadingRelated ? (
              [...Array(6)].map((_, i) => <RelatedVideoSkeleton key={i} />)
            ) : (
              relatedVideos.map((rv) => (
                <Link 
                  key={rv.id} 
                  to={`/video/${rv.id}`}
                  className="flex gap-4 group"
                >
                  <div className="w-32 xs:w-40 aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl overflow-hidden flex-shrink-0 relative shadow-sm group-hover:shadow-xl transition-all duration-500 border border-neutral-100 dark:border-neutral-800">
                    <img 
                      src={rv.thumbnail_url ? getThumbnailUrl(rv.thumbnail_url) : `https://picsum.photos/seed/${rv.id}/320/180`} 
                      alt={rv.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">
                      {rv.status === 'processing' ? '...' : '10:00'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 py-1 space-y-1">
                    <h4 className="font-black text-sm text-neutral-900 dark:text-white line-clamp-2 leading-tight group-hover:text-brand-600 transition-colors font-display">
                      {rv.title}
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bold truncate">
                      {rv.first_name} {rv.last_name}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* For Portrait: Move Comments here on Desktop */}
        {false && (
          <div className="hidden lg:block pt-10 border-t border-neutral-100 dark:border-neutral-800">
            <h3 className="text-xl font-black font-display text-neutral-900 dark:text-white flex items-center gap-4 mb-8">
              <MessageSquare size={24} className="text-brand-600" /> {comments.length} Comments
            </h3>
            {/* Simplified Comment List for Portrait Sidebar */}
            <div className="space-y-8">
              {comments.slice(0, 5).map((comment) => (
                <div key={comment.id} className="flex gap-4">
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-900 rounded-xl flex items-center justify-center font-black text-neutral-400 flex-shrink-0 text-xs">
                    {comment.first_name[0]}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-xs text-neutral-900 dark:text-white">{comment.first_name}</span>
                      <span className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-neutral-700 dark:text-neutral-300 text-xs leading-relaxed font-medium">{comment.content}</p>
                  </div>
                </div>
              ))}
              {comments.length > 5 && (
                <button className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline">View all comments</button>
              )}
            </div>
          </div>
        )}
        {/* Weekly Report Modal */}
        <AnimatePresence>
          {showWeeklyReportModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowWeeklyReportModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-neutral-100 dark:border-neutral-800"
              >
                <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-brand-50/30 dark:bg-brand-500/5">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-neutral-900 dark:text-white font-display flex items-center gap-3">
                      <FileText className="text-brand-600" /> Weekly Report Template
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Automated learning documentation</p>
                  </div>
                  <button onClick={() => setShowWeeklyReportModal(false)} className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-colors text-neutral-400">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Tanggal (Auto-filled)</label>
                      <div className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl py-3 px-5 text-sm font-bold text-neutral-500">
                        {new Date(video.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Nama (Auto-filled)</label>
                      <div className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl py-3 px-5 text-sm font-bold text-neutral-500">
                        {currentUser?.firstName} {currentUser?.lastName}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Pertemuan</label>
                      <input 
                        type="text"
                        placeholder="e.g. Pertemuan 1"
                        value={reportFields.pertemuan}
                        onChange={(e) => setReportFields({...reportFields, pertemuan: e.target.value})}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-3 px-5 focus:outline-none focus:border-brand-600 transition-all text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Program</label>
                      <input 
                        type="text"
                        placeholder="e.g. Web Development"
                        value={reportFields.program}
                        onChange={(e) => setReportFields({...reportFields, program: e.target.value})}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-3 px-5 focus:outline-none focus:border-brand-600 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Materi</label>
                    <input 
                      type="text"
                      placeholder="e.g. React Hooks & State Management"
                      value={reportFields.materi}
                      onChange={(e) => setReportFields({...reportFields, materi: e.target.value})}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-3 px-5 focus:outline-none focus:border-brand-600 transition-all text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Pembelajaran Hari Ini</label>
                    <textarea 
                      rows={3}
                      placeholder="What did you learn today?"
                      value={reportFields.pembelajaran}
                      onChange={(e) => setReportFields({...reportFields, pembelajaran: e.target.value})}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-3 px-5 focus:outline-none focus:border-brand-600 transition-all text-sm font-medium resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Preview Output</label>
                    <div className="w-full bg-neutral-50 dark:bg-black/40 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-6 font-mono text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                      {`WEEKLY REPORT\n`}
                      {`Tanggal: ${new Date(video.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}\n`}
                      {`Nama: ${currentUser?.firstName} ${currentUser?.lastName}\n`}
                      {`Pertemuan: ${reportFields.pertemuan || '...'}\n`}
                      {`Program: ${reportFields.program || '...'}\n`}
                      {`Materi: ${reportFields.materi || '...'}\n`}
                      {`Pembelajaran hari ini: ${reportFields.pembelajaran || '...'}\n`}
                      {`Note: Good Job`}
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-4">
                  <button 
                    onClick={() => {
                      const text = `WEEKLY REPORT\nTanggal: ${new Date(video.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}\nNama: ${currentUser?.firstName} ${currentUser?.lastName}\nPertemuan: ${reportFields.pertemuan}\nProgram: ${reportFields.program}\nMateri: ${reportFields.materi}\nPembelajaran hari ini: ${reportFields.pembelajaran}\nNote: Good Job`;
                      navigator.clipboard.writeText(text);
                      setReportCopied(true);
                      setTimeout(() => setReportCopied(false), 2000);
                    }}
                    className="flex-1 bg-brand-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-3 active:scale-95"
                  >
                    {reportCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                    {reportCopied ? 'Copied to Clipboard' : 'Copy Report Template'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
