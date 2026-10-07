import { Link, useLocation } from 'react-router-dom';
import { Home, Video, Upload, Settings, Compass, List, History, ThumbsUp, Clock, BarChart2, LayoutDashboard } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar({ user }: { user: any }) {
  return (
    <aside className="w-64 h-full glass border-r border-white/10 flex flex-col transition-all duration-300 overflow-y-auto no-scrollbar">
      <div className="p-6 border-b border-white/10">
        <Link to="/" className="flex items-center gap-3 text-brand-500 font-black text-2xl tracking-tighter">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Video fill="currentColor" size={18} />
          </div>
          <span className="text-white font-display">OmniHub</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-2">
        <SidebarItem to="/" icon={<Home size={20} />} label="Home" />
        <SidebarItem to="/explore" icon={<Compass size={20} />} label="Explore" />
        <SidebarItem to="/playlists" icon={<List size={20} />} label="Playlists" />
        
        {user && (
          <>
            <div className="h-px bg-white/10 my-2 mx-2" />
            <SidebarItem to="/upload" icon={<Upload size={20} />} label="Upload Video" />
            <SidebarItem to="/studio/live" icon={<span className="text-lg leading-none">🔴</span>} label="Go Live" />
            <SidebarItem to="/creator-studio" icon={<LayoutDashboard size={20} />} label="Creator Dashboard" />
            <SidebarItem to="/studio" icon={<Video size={20} />} label="Video Manager" />
            <SidebarItem to="/history" icon={<History size={20} />} label="History" />
            <SidebarItem to="/liked" icon={<ThumbsUp size={20} />} label="Liked Videos" />
            <SidebarItem to="/watch-later" icon={<Clock size={20} />} label="Watch Later" />
          </>
        )}

        {user?.role === 'admin' && (
          <>
            <div className="h-px bg-white/10 my-2 mx-2" />
            <SidebarItem to="/admin" icon={<BarChart2 size={20} />} label="Admin Dashboard" />
            <SidebarItem to="/admin/logs" icon={<Settings size={20} />} label="System Health" />
          </>
        )}
      </nav>
    </aside>
  );
}

function SidebarItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      className={cn(
        "flex items-center gap-4 p-3 rounded-xl transition-all font-bold text-sm group",
        isActive 
          ? "bg-brand-600 text-white shadow-md shadow-brand-500/20" 
          : "text-neutral-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <div className={cn("transition-transform duration-300 group-hover:scale-110", isActive && "scale-110")}>
        {icon}
      </div>
      <span>{label}</span>
    </Link>
  );
}
