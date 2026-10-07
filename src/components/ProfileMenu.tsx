import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AnimatePresence, motion } from 'motion/react';
import { User, PlaySquare, Settings, LogOut } from 'lucide-react';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  avatar_url: string | null;
}

export default function ProfileMenu() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get('/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(res.data);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleLogout = () => {
    // Bersihkan semua token otentikasi
    localStorage.removeItem('token');
    localStorage.removeItem('user'); 
    
    // Bersihkan memori sesi internal
    sessionStorage.clear();
    
    // HARD REDIRECT untuk membunuh Zombie State React
    window.location.href = '/login'; 
  };

  const getInitials = () => {
    if (!profile) return '';
    return `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  const avatarSrc = profile?.avatar_url || '';

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-transform active:scale-95"
      >
        {avatarSrc ? (
          <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            {getInitials()}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-72 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden z-50 text-neutral-800 dark:text-neutral-100"
          >
            {/* HEADER */}
            <div className="p-4 flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0 flex items-center justify-center">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-medium text-neutral-600 dark:text-neutral-300">
                    {getInitials()}
                  </span>
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-base font-semibold truncate">
                  {profile ? `${profile.firstName} ${profile.lastName}` : 'Loading...'}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                  {profile?.email || ''}
                </p>
              </div>
            </div>

            <div className="border-b border-neutral-200 dark:border-neutral-700" />

            {/* ITEMS */}
            <div className="py-2 flex flex-col">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/channel');
                }}
                className="flex items-center px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left"
              >
                <User className="w-5 h-5 mr-3 text-neutral-500 dark:text-neutral-400" />
                <span className="text-sm font-medium">Channel Anda</span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/studio');
                }}
                className="flex items-center px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left"
              >
                <PlaySquare className="w-5 h-5 mr-3 text-neutral-500 dark:text-neutral-400" />
                <span className="text-sm font-medium">Creator Studio</span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/settings');
                }}
                className="flex items-center px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left"
              >
                <Settings className="w-5 h-5 mr-3 text-neutral-500 dark:text-neutral-400" />
                <span className="text-sm font-medium">Pengaturan Akun</span>
              </button>
            </div>

            <div className="border-b border-neutral-200 dark:border-neutral-700" />

            {/* LOGOUT */}
            <div className="py-2">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left"
              >
                <LogOut className="w-5 h-5 mr-3 text-neutral-500 dark:text-neutral-400" />
                <span className="text-sm font-medium">Keluar</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
