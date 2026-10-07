import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Play, List, Eye, Loader2, User, Clock, ChevronLeft, MoreVertical, Share2, Trash2, Edit3, AlertCircle, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function PlaylistDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaylist = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/playlists/${id}`);
        setPlaylist(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load playlist');
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylist();
  }, [id]);

  if (error) return (
    <div className="flex flex-col items-center justify-center py-32 glass rounded-[3rem] border border-neutral-100 dark:border-neutral-800 text-center px-6">
      <div className="p-6 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-[2rem] mb-6">
        <AlertCircle size={48} />
      </div>
      <h2 className="text-3xl font-black font-display text-neutral-900 dark:text-white mb-2">Playlist Not Found</h2>
      <p className="text-neutral-500 dark:text-neutral-400 font-medium max-w-xs">{error}</p>
      <Link to="/playlists" className="mt-8 bg-brand-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition-all active:scale-95">
        Back to Playlists
      </Link>
    </div>
  );

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12 pb-24">
      {/* Playlist Sidebar / Info */}
      <div className="lg:col-span-4">
        {loading ? (
          <div className="glass rounded-[3rem] p-8 md:p-10 border border-neutral-100 dark:border-neutral-800 animate-pulse space-y-8">
            <div className="aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-3xl" />
            <div className="space-y-4">
              <div className="h-10 bg-neutral-100 dark:bg-neutral-900 rounded-2xl w-3/4" />
              <div className="h-4 bg-neutral-100 dark:bg-neutral-900 rounded-xl w-1/2" />
            </div>
            <div className="h-32 bg-neutral-100 dark:bg-neutral-900 rounded-3xl" />
            <div className="flex gap-4">
              <div className="h-16 bg-neutral-100 dark:bg-neutral-900 rounded-2xl flex-1" />
              <div className="h-16 w-16 bg-neutral-100 dark:bg-neutral-900 rounded-2xl" />
            </div>
          </div>
        ) : !playlist ? (
          <div className="text-center py-20 font-black text-neutral-400 uppercase tracking-widest">Playlist not found</div>
        ) : (
          <div className="glass rounded-[3rem] p-8 md:p-10 border border-neutral-100 dark:border-neutral-800 lg:sticky lg:top-28 shadow-2xl shadow-black/5">
            <button 
              onClick={() => navigate('/playlists')}
              className="flex items-center gap-2 text-[10px] font-black text-neutral-400 hover:text-brand-600 transition-colors uppercase tracking-[0.2em] mb-8"
            >
              <ChevronLeft size={14} /> Back to Library
            </button>

            <div className="aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-[2rem] mb-8 flex items-center justify-center text-neutral-400 relative overflow-hidden group shadow-2xl border border-neutral-100 dark:border-neutral-800">
              {playlist.videos.length > 0 && playlist.videos[0].thumbnail_url ? (
                <img 
                  src={playlist.videos[0].thumbnail_url} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <PlayCircle size={64} fill="currentColor" className="opacity-10" />
              )}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                  <Play fill="black" className="text-black ml-1" size={32} />
                </div>
              </div>
              <div className="absolute top-4 left-4 bg-brand-600 text-white text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-widest shadow-xl z-20">
                Collection
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-neutral-900 dark:text-white leading-tight font-display">
                  {playlist.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-neutral-400 font-black uppercase tracking-widest">
                  <span className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 rounded-lg text-neutral-600 dark:text-neutral-400">
                    <User size={12} /> {playlist.user_id === JSON.parse(localStorage.getItem('user') || '{}').id ? 'You' : 'Creator'}
                  </span>
                  <span className="bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 rounded-lg">{playlist.videos.length} videos</span>
                  <span className="bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 rounded-lg">{new Date(playlist.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed font-medium">
                {playlist.description || 'No description provided for this collection.'}
              </p>

              <div className="flex gap-4 pt-4">
                <button className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-black py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-xl active:scale-95 uppercase text-xs tracking-widest">
                  <Play fill="currentColor" size={18} /> Play All
                </button>
                <button className="p-5 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all active:scale-95">
                  <Share2 size={22} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video List */}
      <div className="lg:col-span-8">
        <div className="space-y-6">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-6 glass rounded-[2.5rem] p-6 animate-pulse border border-neutral-100 dark:border-neutral-800">
                <div className="w-full sm:w-64 aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl flex-shrink-0" />
                <div className="flex-1 space-y-4 py-2">
                  <div className="h-8 bg-neutral-100 dark:bg-neutral-900 rounded-xl w-3/4" />
                  <div className="h-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg w-1/2" />
                  <div className="h-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg w-1/4" />
                </div>
              </div>
            ))
          ) : playlist.videos.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-32 glass rounded-[3rem] border border-neutral-100 dark:border-neutral-800"
            >
              <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-8">
                <List size={40} className="text-neutral-300 dark:text-neutral-700" />
              </div>
              <h2 className="text-3xl font-black mb-3 text-neutral-900 dark:text-white font-display">Empty Playlist</h2>
              <p className="max-w-xs mx-auto text-neutral-500 dark:text-neutral-400 font-medium mb-10">This collection doesn't have any videos yet.</p>
              <Link to="/" className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 active:scale-95">
                Explore Videos
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {playlist.videos.map((video: any, idx: number) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative"
                >
                  <div className="absolute -left-4 top-1/2 -translate-y-1/2 hidden xl:flex items-center justify-center w-10 h-10 font-black text-xs text-neutral-300 group-hover:text-brand-600 transition-colors">
                    {idx + 1}
                  </div>
                  
                  <Link 
                    to={`/video/${video.id}`} 
                    className="flex flex-col sm:flex-row gap-6 bg-white dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-[2.5rem] p-5 md:p-6 hover:border-brand-200 dark:hover:border-brand-800 hover:shadow-2xl hover:shadow-black/5 transition-all duration-500"
                  >
                    <div className="w-full sm:w-72 aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl overflow-hidden flex-shrink-0 relative shadow-lg group-hover:shadow-brand-500/10 transition-all duration-500 border border-neutral-100 dark:border-neutral-800">
                      {video.thumbnail_url ? (
                        <img 
                          src={video.thumbnail_url} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-200 dark:text-neutral-800">
                          <PlayCircle size={48} fill="currentColor" className="opacity-10" />
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-xl text-white text-[10px] px-3 py-1.5 rounded-xl font-black uppercase tracking-widest shadow-2xl border border-white/10">
                        10:00
                      </div>
                      <div className="absolute inset-0 bg-brand-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    
                    <div className="flex-1 min-w-0 py-2 space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-black text-xl md:text-2xl line-clamp-2 group-hover:text-brand-600 transition-colors leading-tight text-neutral-900 dark:text-white font-display tracking-tight">
                          {video.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-[10px] text-neutral-400 font-black uppercase tracking-widest">
                          <span className="text-neutral-900 dark:text-white font-bold">{video.first_name} {video.last_name}</span>
                          <span className="w-1 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
                          <span className="flex items-center gap-1.5"><Eye size={14} /> {video.views.toLocaleString()} views</span>
                          <span className="w-1 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
                          <span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(video.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 font-medium leading-relaxed">
                        {video.description || 'No description provided for this video.'}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
