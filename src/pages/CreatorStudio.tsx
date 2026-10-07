import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { PlayCircle, Eye, Clock, Video, BarChart2, Calendar, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatWatchTime } from '../lib/utils';
import { Skeleton } from '../components/Skeleton';

export default function CreatorStudio() {
  const [overview, setOverview] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/creator/analytics');
        setOverview(res.data.global);
        setVideos(res.data.videos);
      } catch (err) {
        console.error("Failed to fetch creator analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const getThumbnailUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `http://localhost:3000${url}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 dark:text-white font-display tracking-tight flex items-center gap-3">
            <LayoutDashboard className="text-brand-600" />
            Creator Dashboard
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium mt-2">
            Overview of your channel's performance
          </p>
        </div>
        <Link 
          to="/upload" 
          className="bg-brand-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
        >
          Upload Video
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Eye size={120} />
          </div>
          <div className="relative">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
              <Eye size={24} />
            </div>
            <div className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-2">Total Views</div>
            <div className="text-4xl font-black text-neutral-900 dark:text-white font-display">
              {(overview?.totalViews || 0).toLocaleString()}
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock size={120} />
          </div>
          <div className="relative">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center mb-6">
              <Clock size={24} />
            </div>
            <div className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-2">Total Watch Time</div>
            <div className="text-4xl font-black text-neutral-900 dark:text-white font-display">
              {formatWatchTime(overview?.totalWatchTime || 0)}
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Video size={120} />
          </div>
          <div className="relative">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-6">
              <Video size={24} />
            </div>
            <div className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-2">Total Videos</div>
            <div className="text-4xl font-black text-neutral-900 dark:text-white font-display">
              {(overview?.totalVideos || 0).toLocaleString()}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
          <BarChart2 className="text-brand-600" />
          <h2 className="text-xl font-black text-neutral-900 dark:text-white font-display tracking-tight">
            Video Performance
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left py-4 px-6 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Video</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Date</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Views</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Watch Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {videos.map((video: any) => (
                <tr key={video.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-14 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden shrink-0 relative">
                        {video.thumbnail_url ? (
                          <img 
                            src={getThumbnailUrl(video.thumbnail_url)} 
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-400">
                            <PlayCircle size={20} />
                          </div>
                        )}
                        <Link to={`/video/${video.id}`} className="absolute inset-0 z-10 block" />
                      </div>
                      <div className="font-semibold text-neutral-900 dark:text-white line-clamp-2 max-w-sm group-hover:text-brand-600 transition-colors">
                        <Link to={`/video/${video.id}`}>
                          {video.title}
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-neutral-500 font-medium">
                    <div className="flex items-center gap-2">
                       <Calendar size={14} className="text-neutral-400 shadow-sm" />
                       {new Date(video.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right font-black text-neutral-900 dark:text-white">
                    {Number(video.views || 0).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-right font-black text-neutral-900 dark:text-white">
                    {formatWatchTime(video.watch_time)}
                  </td>
                </tr>
              ))}
              {videos.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-neutral-500 font-medium">
                    No videos found. Upload your first video to see analytics.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
