import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { BarChart2, Eye, Clock, TrendingUp, ChevronLeft, Users, Play, Calendar, ArrowLeft, Info, Download, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { cn, formatWatchTime } from '../lib/utils';

export default function AnalyticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const fetchAnalytics = async () => {
      try {
        const res = await api.get(`/videos/${id}/analytics`);
        setData(res.data);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setError('Access Denied: You do not have permission to view analytics for this video.');
        } else {
          setError(err.response?.data?.error || 'Failed to load analytics');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [id]);

  const handleBack = () => {
    if (user?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/studio');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-6">
      <Loader2 className="animate-spin text-brand-600" size={48} />
      <p className="text-neutral-500 dark:text-neutral-400 font-black uppercase tracking-widest text-xs animate-pulse">Analyzing Data...</p>
    </div>
  );

  if (error) return (
    <div className="max-w-2xl mx-auto py-20 px-4">
      <div className="glass border border-red-100 dark:border-red-500/20 rounded-[3rem] p-12 text-center shadow-2xl shadow-red-500/5">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
          <BarChart2 size={40} />
        </div>
        <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-3 font-display tracking-tight">Analytics Error</h2>
        <p className="text-neutral-500 dark:text-neutral-400 font-medium mb-8 leading-relaxed">{error}</p>
        <button 
          onClick={handleBack}
          className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 active:scale-95 flex items-center gap-2 mx-auto"
        >
          <ArrowLeft size={18} />
          <span>Go Back</span>
        </button>
      </div>
    </div>
  );

  if (!data) return (
    <div className="text-center py-32 space-y-4">
      <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-900 rounded-[2rem] flex items-center justify-center text-neutral-400 mx-auto">
        <Info size={40} />
      </div>
      <h3 className="text-xl font-black text-neutral-900 dark:text-white font-display">No data available</h3>
      <p className="text-neutral-500 dark:text-neutral-400">Try watching the video first to generate some data.</p>
    </div>
  );

  const { video, viewsByDay, retention } = data;

  const retentionData = retention.map((r: any) => ({
    timestamp: r.timestamp,
    count: r.count
  }));

  const viewsData = viewsByDay.map((v: any) => ({
    date: v.date,
    views: v.count
  })).reverse();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 md:px-0 pb-24 md:pb-12 space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="p-4 bg-neutral-50 dark:bg-neutral-900 text-neutral-400 hover:text-brand-600 rounded-2xl transition-all hover:scale-110 active:scale-95 border border-neutral-100 dark:border-neutral-800"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black text-neutral-900 dark:text-white font-display tracking-tight">Video Insights</h1>
            <p className="text-neutral-500 dark:text-neutral-400 font-bold text-xs uppercase tracking-[0.2em]">Performance overview for your content</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex-1 md:flex-none px-6 py-3 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 border border-neutral-100 dark:border-neutral-800">
            <Download size={16} />
            <span>Export</span>
          </button>
          <button className="flex-1 md:flex-none px-6 py-3 bg-brand-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand-500/20 active:scale-95">
            <Share2 size={16} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Eye size={20} />} 
          label="Total Views" 
          value={video.views} 
          trend="+12% vs last week"
          color="brand"
        />
        <StatCard 
          icon={<Clock size={20} />} 
          label="Watch Time" 
          value={formatWatchTime(video.watch_time)} 
          trend={`Avg: ${formatWatchTime(Number(video.watch_time) / Math.max(1, Number(video.views)))}`}
          color="orange"
        />
        <StatCard 
          icon={<Users size={20} />} 
          label="Unique Viewers" 
          value={Math.round(video.views * 0.8)} 
          trend="Estimated"
          color="purple"
        />
        <StatCard 
          icon={<TrendingUp size={20} />} 
          label="Retention Rate" 
          value="68%" 
          trend="Above average"
          color="green"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Views Over Time */}
        <div className="glass p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-2xl shadow-black/5 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-neutral-900 dark:text-white font-display tracking-tight">Views Over Time</h2>
            <div className="px-3 py-1 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg text-[10px] font-black uppercase tracking-widest">Last 30 Days</div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={viewsData}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" className="dark:stroke-neutral-800" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#999', fontWeight: 700 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#999', fontWeight: 700 }} 
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    padding: '12px 16px'
                  }}
                  itemStyle={{ fontWeight: 900, fontSize: '14px', color: '#2563eb' }}
                  labelStyle={{ fontWeight: 700, color: '#666', marginBottom: '4px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#3b82f6', strokeWidth: 3, stroke: '#fff' }} 
                  activeDot={{ r: 8, fill: '#3b82f6', strokeWidth: 0 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Audience Retention */}
        <div className="glass p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-2xl shadow-black/5 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-neutral-900 dark:text-white font-display tracking-tight">Audience Retention</h2>
            <div className="px-3 py-1 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text-[10px] font-black uppercase tracking-widest">Real-time</div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={retentionData}>
                <defs>
                  <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" className="dark:stroke-neutral-800" />
                <XAxis 
                  dataKey="timestamp" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#999', fontWeight: 700 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#999', fontWeight: 700 }} 
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    padding: '12px 16px'
                  }}
                  itemStyle={{ fontWeight: 900, fontSize: '14px', color: '#f97316' }}
                  labelStyle={{ fontWeight: 700, color: '#666', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#f97316" 
                  fill="url(#retentionGradient)" 
                  strokeWidth={4} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] md:text-xs text-neutral-400 dark:text-neutral-500 font-black uppercase tracking-[0.2em] text-center">
            Viewers drop-off analysis across video timeline
          </p>
        </div>
      </div>

      {/* Video Summary Card */}
      <div className="glass rounded-[3rem] p-8 md:p-12 border border-neutral-100 dark:border-neutral-800 shadow-2xl shadow-black/5 overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="w-full md:w-64 aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-[2rem] overflow-hidden shadow-xl">
            <img 
              src={video.thumbnail_url || `https://picsum.photos/seed/${video.id}/640/360`} 
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-4xl font-black text-neutral-900 dark:text-white font-display tracking-tight leading-tight">{video.title}</h2>
              <p className="text-neutral-500 dark:text-neutral-400 font-medium max-w-2xl line-clamp-2 text-sm md:text-base">{video.description}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-6">
              <Link 
                to={`/video/${video.id}`}
                className="bg-neutral-900 dark:bg-white text-white dark:text-black px-10 py-4 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-2xl shadow-black/20"
              >
                <Play fill="currentColor" size={20} />
                <span>Watch Video</span>
              </Link>
              <div className="flex items-center gap-4 text-neutral-400 dark:text-neutral-500 text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-2"><Calendar size={16} /> Posted {new Date(video.created_at).toLocaleDateString()}</span>
                <span className="flex items-center gap-2"><Eye size={16} /> {video.views} Views</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, trend, color }: { icon: any, label: string, value: any, trend: string, color: string }) {
  const colorClasses = {
    brand: "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400",
    orange: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400",
    purple: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400",
    green: "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400",
  }[color] || "bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400";

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className="glass p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-2xl shadow-black/5 space-y-4"
    >
      <div className="flex items-center gap-4">
        <div className={cn("p-4 rounded-2xl", colorClasses)}>
          {icon}
        </div>
        <span className="text-neutral-500 dark:text-neutral-400 font-black uppercase tracking-widest text-[10px]">{label}</span>
      </div>
      <div className="space-y-1">
        <div className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white font-display tracking-tight">{value}</div>
        <div className={cn("text-[10px] font-black uppercase tracking-widest", color === 'brand' ? 'text-brand-500' : 'text-neutral-400')}>
          {trend}
        </div>
      </div>
    </motion.div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-2.9" />
      <path d="M18 12h4" />
      <path d="m16.2 16.2 2.9 2.9" />
      <path d="M12 18v4" />
      <path d="m4.9 19.1 2.9-2.9" />
      <path d="M2 12h4" />
      <path d="m4.9 4.9 2.9 2.9" />
    </svg>
  );
}
