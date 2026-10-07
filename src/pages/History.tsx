import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'motion/react';
import { History, PlayCircle } from 'lucide-react';

interface Video {
  id: number;
  title: string;
  thumbnail_url: string;
  views: number;
  watched_at: string;
  firstName: string;
  lastName: string;
}

export default function HistoryPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/user/history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVideos(res.data);
      } catch (err) {
        console.error('Failed to fetch watch history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  return (
    <div className="max-w-[1800px] mx-auto pt-4 pb-20">
      <div className="sticky top-[72px] z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 py-4 mb-8 -mx-4 px-4 md:-mx-8 md:px-8">
        <h1 className="text-2xl md:text-3xl font-black text-white font-display flex items-center gap-3">
          <History className="text-brand-500" size={32} />
          Watch History
        </h1>
        <p className="text-neutral-400 mt-2 text-sm">Videos you have watched in the past.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
          <History size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-bold text-white">Your history is empty</p>
          <p className="text-sm">Videos you watch will appear here.</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
        >
          {videos.map((video, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={`${video.id}-${idx}`}
            >
              <Link to={`/video/${video.id}`} className="block group">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-neutral-900 border border-white/5 mb-3">
                  <img 
                    src={video.thumbnail_url || '/thumbnails/default.jpg'} 
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 bg-brand-600 rounded-full flex items-center justify-center shadow-xl shadow-brand-500/50 scale-75 group-hover:scale-100 transition-transform duration-300">
                      <PlayCircle className="text-white ml-1" size={24} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 px-1">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-base leading-tight line-clamp-2 mb-1 group-hover:text-brand-400 transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-neutral-400 text-sm font-medium truncate">
                      {video.firstName} {video.lastName}
                    </p>
                    <p className="text-neutral-500 text-xs mt-0.5">
                      Watched {formatTimeAgo(video.watched_at)}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
