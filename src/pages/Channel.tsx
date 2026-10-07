import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Video, ListVideo } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileData {
  firstName: string;
  lastName: string;
  avatar_url: string | null;
}

export default function Channel() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Video');
  const [videos, setVideos] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }
        const res = await axios.get('/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(res.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'Video') {
      const fetchVideos = async () => {
        try {
          setVideosLoading(true);
          const token = localStorage.getItem('token');
          if (!token) return;
          const res = await axios.get('/api/studio/videos', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setVideos(res.data);
        } catch (error) {
          console.error('Error fetching videos:', error);
        } finally {
          setVideosLoading(false);
        }
      };
      fetchVideos();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 h-screen bg-white dark:bg-neutral-900">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getInitials = () => {
    if (!profile) return 'U';
    return `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="w-full bg-white dark:bg-neutral-900 min-h-screen">
      {/* HEADER CHANNEL */}
      {/* Banner kosong */}
      <div className="w-full h-48 md:h-64 bg-neutral-200 dark:bg-neutral-800 object-cover" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-end -mt-12 md:-mt-20 sm:space-x-6 pb-6 mt-4">
          <div className="relative">
            {/* Avatar pengguna */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white dark:border-neutral-900 bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shadow-md">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-4xl md:text-5xl font-bold text-neutral-500 dark:text-neutral-400">
                  {getInitials()}
                </span>
              )}
            </div>
          </div>
          <div className="pt-1 pb-2 sm:pt-4 sm:pb-4 flex-1 min-w-0">
            {/* Nama pengguna */}
            <h1 className="text-2xl md:text-4xl font-bold text-neutral-900 dark:text-white truncate">
              {profile ? `${profile.firstName} ${profile.lastName}` : 'Nama Pengguna'}
            </h1>
          </div>
        </div>

        {/* TAB NAVIGASI BOHONGAN */}
        <div className="mt-2 border-b border-neutral-200 dark:border-neutral-800">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {['Beranda', 'Video', 'Playlist', 'Tentang'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* AREA KONTEN */}
        <div className="py-8">
          {activeTab === 'Video' && (
            videosLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : videos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <Link to={`/watch/${video.id}`} key={video.id} className="group flex flex-col gap-3">
                    <div className="w-full aspect-video bg-neutral-200 dark:bg-neutral-800 rounded-xl overflow-hidden relative">
                      <img 
                        src={video.thumbnail_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80'} 
                        alt={video.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-2 py-0.5 rounded">
                        {video.duration ? Math.floor(video.duration / 60) + ':' + ('0' + Math.floor(video.duration % 60)).slice(-2) : '0:00'}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-neutral-900 dark:text-white line-clamp-2 leading-tight group-hover:text-blue-500 transition-colors">
                        {video.title}
                      </h3>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        <span>{video.views} x ditonton</span>
                        <span className="mx-1">•</span>
                        <span>{formatDate(video.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                  <Video className="w-10 h-10 text-neutral-400 dark:text-neutral-500" />
                </div>
                <p className="text-neutral-500 dark:text-neutral-400 text-lg font-medium">Belum ada video yang diunggah.</p>
              </div>
            )
          )}
          {activeTab === 'Beranda' && (
            videosLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-neutral-500 dark:text-neutral-400 text-lg font-medium">Selamat datang di channel Anda! Konten unggulan Anda akan muncul di sini setelah Anda mengunggah video.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                {/* BAGIAN VIDEO UNGGULAN */}
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="w-full md:w-1/2 lg:w-2/3 aspect-video bg-neutral-200 dark:bg-neutral-800 rounded-xl overflow-hidden relative group">
                    <Link to={`/watch/${videos[0].id}`}>
                      <img 
                        src={videos[0].thumbnail_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80'} 
                        alt={videos[0].title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-2 py-0.5 rounded">
                        {videos[0].duration ? Math.floor(videos[0].duration / 60) + ':' + ('0' + Math.floor(videos[0].duration % 60)).slice(-2) : '0:00'}
                      </div>
                    </Link>
                  </div>
                  <div className="w-full md:w-1/2 lg:w-1/3 flex flex-col pt-2">
                    <Link to={`/watch/${videos[0].id}`}>
                      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white line-clamp-3 hover:text-blue-500 transition-colors">
                        {videos[0].title}
                      </h2>
                    </Link>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                      <span>{videos[0].views} x ditonton</span>
                      <span className="mx-2">•</span>
                      <span>{formatDate(videos[0].created_at)}</span>
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-300 mt-4 line-clamp-4">
                      {videos[0].description || 'Tidak ada deskripsi.'}
                    </p>
                  </div>
                </div>

                {/* BAGIAN UPLOAD TERBARU */}
                {videos.length > 1 && (
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Upload Terbaru</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {videos.slice(1, 5).map((video) => (
                        <Link to={`/watch/${video.id}`} key={video.id} className="group flex flex-col gap-3">
                          <div className="w-full aspect-video bg-neutral-200 dark:bg-neutral-800 rounded-xl overflow-hidden relative">
                            <img 
                              src={video.thumbnail_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80'} 
                              alt={video.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-2 py-0.5 rounded">
                              {video.duration ? Math.floor(video.duration / 60) + ':' + ('0' + Math.floor(video.duration % 60)).slice(-2) : '0:00'}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-neutral-900 dark:text-white line-clamp-2 leading-tight group-hover:text-blue-500 transition-colors">
                              {video.title}
                            </h3>
                            <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                              <span>{video.views} x ditonton</span>
                              <span className="mx-1">•</span>
                              <span>{formatDate(video.created_at)}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
          {activeTab === 'Playlist' && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                <ListVideo className="w-10 h-10 text-neutral-400 dark:text-neutral-500" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Belum ada playlist</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Koleksi video dan playlist yang Anda buat akan muncul di halaman ini.</p>
            </div>
          )}
          {activeTab !== 'Video' && activeTab !== 'Beranda' && activeTab !== 'Playlist' && (
             <div className="flex flex-col items-center justify-center py-20 text-center">
               <p className="text-neutral-500 dark:text-neutral-400 text-lg font-medium">Tab {activeTab} saat ini belum tersedia.</p>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}
