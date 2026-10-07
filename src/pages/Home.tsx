import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../lib/api';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL?.replace(/\/api\/?$/, '') || '';

const getThumbnailUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  const pathPart = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${pathPart}`;
};

export default function HomePage({ searchQuery = '', isSearching = false, setIsSearching = () => {} }: any) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setIsSearching(false);
      api.get('/videos')
        .then(res => {
          setVideos(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load videos:", err);
          setLoading(false);
        });
      return;
    }

    setIsSearching(true);
    const delayDebounce = setTimeout(() => {
      api.get(`/search?q=${searchQuery}`)
        .then(res => {
          setVideos(res.data);
        })
        .catch(err => console.error('Pencarian gagal:', err))
        .finally(() => setIsSearching(false));
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="w-full">
        {/* SKELETON GRID: Adapts seamlessly to all viewports */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-y-10 md:gap-x-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse flex flex-col gap-3">
              <div className="w-full aspect-video bg-white/5 rounded-2xl border border-white/5"></div>
              <div className="flex gap-3 px-1">
                <div className="w-11 h-11 bg-white/5 rounded-full shrink-0"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-white/5 rounded w-3/4"></div>
                  <div className="h-3 bg-white/5 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Hasil perbaikan Tahap 39.1: Search bar sekunder dihapus, hanya menyisakan judul utama */}
      <div className="mb-6 md:mb-8 flex items-center justify-between px-1">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Recommended for you</h1>
      </div>
      
      {/* VIDEO GRID: Flawless mobile & desktop scaling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
        {videos.map((video: any) => (
          <Link to={`/video/${video.id}`} key={video.id} className="group flex flex-col gap-3 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-2xl">
            {/* Thumbnail Wrapper */}
            <div className="relative w-full aspect-video rounded-2xl bg-neutral-800/80 overflow-hidden outline outline-1 outline-white/5 group-hover:outline-brand-500/50 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-300">
              {video.thumbnail_url ? (
                <img 
                  src={getThumbnailUrl(video.thumbnail_url)} 
                  alt={video.title} 
                  className="w-full h-full object-contain bg-black group-hover:scale-105 transition-transform duration-500 ease-out" 
                  loading="lazy"
                />
              ) : (
                <video 
                  src={video.url} 
                  className="w-full h-full object-contain bg-black group-hover:scale-105 transition-transform duration-500 ease-out"
                  muted
                  playsInline
                />
              )}
              {/* Quality Badge */}
              <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md shadow-lg border border-white/10">
                {video.status === 'ready' ? 'HD' : 'Processing'}
              </div>
            </div>
            
            {/* Metadata Section */}
            <div className="flex gap-3.5 px-1 items-start">
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-brand-600 flex items-center justify-center font-bold text-white shrink-0 outline outline-1 outline-white/10 shadow-inner overflow-hidden">
                {video.firstName ? video.firstName[0].toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col overflow-hidden pt-0.5">
                <h3 className="text-white font-bold text-[15px] md:text-base leading-snug group-hover:text-brand-400 transition-colors line-clamp-2" title={video.title}>
                  {video.title}
                </h3>
                <p className="text-neutral-400 font-medium text-[13px] md:text-sm mt-1.5 flex items-center gap-1.5 truncate">
                  {video.firstName} {video.lastName}
                </p>
                <p className="text-neutral-500 text-[12px] md:text-[13px] mt-0.5 font-medium truncate">
                  {video.views || 0} views • {new Date(video.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </Link>
        ))}

        {videos.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-neutral-500">
              <span className="text-3xl">📭</span>
            </div>
            <h2 className="text-white font-bold text-lg">No videos found</h2>
            <p className="text-neutral-400 text-sm mt-1">Upload the first video to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
