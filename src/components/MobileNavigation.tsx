import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const MobileNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Beranda', path: '/', icon: '🏠' },
    { label: 'Studio', path: '/studio', icon: '🎬' },
    { label: 'Upload', path: '/upload', icon: '➕', isPrimary: true },
    { label: 'Live', path: '/studio/live', icon: '🔴' }, // changed /live to /studio/live since that's what App.tsx has
    { label: 'Profil', path: '/settings', icon: '👤' }, // changed /profile to /settings based on existing routes
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)] bg-neutral-950/80 backdrop-blur-2xl border-t border-neutral-800/80 px-4 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          if (item.isPrimary) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-xl text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] active:scale-90 transition-transform">
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold text-neutral-300 mt-1">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[48px] rounded-xl transition-all active:scale-95 ${
                isActive 
                  ? 'text-blue-400 font-extrabold' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span className={`text-xl transition-transform ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
              {isActive && (
                <div className="w-1 h-1 bg-blue-400 rounded-full mt-0.5 shadow-[0_0_6px_#60a5fa]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
