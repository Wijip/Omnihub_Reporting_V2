import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import api from '../lib/api';
import { 
  BarChart2, Users, Play, Eye, TrendingUp, TrendingDown, 
  Loader2, ChevronRight, Settings, Save, PieChart, 
  Cpu, HardDrive, Activity, Clock, AlertCircle, CheckCircle2,
  MessageSquare, EyeOff, Trash2, X, Lock, Database, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TableRowSkeleton } from '../components/Skeleton';
import { cn } from '../lib/utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function AdminPage() {
  const { data: stats, error: statsError, mutate: mutateStats } = useSWR('/admin/stats', fetcher, {
    refreshInterval: 5000, // Faster refresh for real-time feel
    revalidateOnFocus: true
  });

  const { data: queueData } = useSWR('/admin/queue', fetcher, {
    refreshInterval: 2000 // Very fast refresh for queue
  });

  const { data: settingsData, mutate: mutateSettings } = useSWR('/admin/settings', fetcher);
  const { data: usersData, mutate: mutateUsers } = useSWR('/admin/users', fetcher);
  const { data: reportsData, mutate: mutateReports } = useSWR('/admin/reports', fetcher);
  const { data: commentsData, mutate: mutateComments } = useSWR('/admin/comments', fetcher);

  const [settings, setSettings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'settings' | 'users' | 'reports' | 'comments' | 'programs'>('stats');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  
  const [programsList, setProgramsList] = useState<any[]>([]);
  const [studentProgressList, setStudentProgressList] = useState<any[]>([]);
  const [newProgName, setNewProgName] = useState('');
  const [newProgType, setNewProgType] = useState<'reset_monthly' | 'continuous'>('reset_monthly');
  const [newProgQuota, setNewProgQuota] = useState<number | ''>(10);

  const fetchProgramsAndProgress = () => {
    api.get('/programs').then(res => setProgramsList(res.data)).catch(console.error);
    api.get('/admin/student-progress').then(res => setStudentProgressList(res.data)).catch(console.error);
  };

  useEffect(() => {
    if (activeTab === 'programs') {
      fetchProgramsAndProgress();
    }
  }, [activeTab]);

  const handleAddProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgName) return;
    try {
      await api.post('/admin/programs', {
        program_name: newProgName,
        type: newProgType,
        max_quota: newProgQuota
      });
      setNewProgName('');
      fetchProgramsAndProgress();
    } catch (err) {
      alert('Gagal menambah program.');
    }
  };

  const handleDeleteProgram = async (id: number) => {
    if (!confirm('Yakin ingin menghapus program ini?')) return;
    try {
      await api.delete(`/admin/programs/${id}`);
      fetchProgramsAndProgress();
    } catch (err) {
      alert('Gagal menghapus program.');
    }
  };

  const [passwordModalUser, setPasswordModalUser] = useState<any>(null);
  const [drawerUser, setDrawerUser] = useState<any>(null);

  useEffect(() => {
    if (settingsData) setSettings(Array.isArray(settingsData) ? settingsData : []);
  }, [settingsData]);

  const handleUpdateUser = async (userId: number, data: any) => {
    try {
      await api.post(`/admin/users/${userId}`, data);
      mutateUsers();
    } catch (err) {
      console.error('Failed to update user');
    }
  };

  const handleUpdateReport = async (reportId: number, status: string) => {
    try {
      await api.post(`/admin/reports/${reportId}/status`, { status });
      mutateReports();
    } catch (err) {
      console.error('Failed to update report');
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) return;
    try {
      await api.delete(`/videos/${videoId}`);
      mutateStats();
    } catch (err) {
      console.error('Failed to delete video');
      alert('Failed to delete video');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.delete(`/admin/comments/${commentId}`);
      mutateComments();
    } catch (err) {
      console.error('Failed to delete comment');
      alert('Failed to delete comment');
    }
  };

  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    try {
      const payload = settings.map(s => ({ key: s.setting_key, value: s.setting_value }));
      await api.post('/admin/settings', { settings: payload });
      setSaveStatus('success');
      mutateSettings();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(settings.map(s => s.setting_key === key ? { ...s, setting_value: value } : s));
  };

  if (statsError) return (
    <div className="flex flex-col items-center justify-center py-32 glass rounded-[2.5rem] border border-red-100 dark:border-red-900/30">
      <div className="p-6 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-3xl mb-6">
        <AlertCircle size={48} />
      </div>
      <h2 className="text-2xl font-black mb-2 font-display">Access Denied</h2>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-xs text-center font-medium">
        {statsError.response?.data?.error || 'You do not have permission to view this page.'}
      </p>
      <Link to="/" className="mt-8 bg-brand-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition-all active:scale-95">
        Return to Home
      </Link>
    </div>
  );

  const loading = !stats || !settingsData;

  return (
    <div className="space-y-8 md:space-y-12 pb-24">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest">
            <Activity size={12} /> System Overview
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-neutral-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium max-w-md">
            Monitor infrastructure health, manage users, and track platform growth in real-time.
          </p>
        </div>

        <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1.5 rounded-2xl overflow-x-auto no-scrollbar glass shadow-inner border border-neutral-200 dark:border-neutral-800">
          {(['stats', 'settings', 'users', 'comments', 'reports', 'programs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 md:px-8 py-3 rounded-xl text-xs md:text-sm font-black transition-all capitalize whitespace-nowrap relative ${
                activeTab === tab 
                  ? 'bg-white dark:bg-neutral-800 text-brand-600 dark:text-brand-400 shadow-xl shadow-black/5 scale-[1.02] z-10' 
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700/50'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white dark:bg-neutral-800 rounded-xl -z-10 shadow-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'stats' && (
        <div className="space-y-8 md:space-y-12">
          {/* Resource Usage & Queue Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Resource Stats */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ResourceCard 
                icon={<Cpu size={24} />} 
                label="CPU Load" 
                value={stats?.resources?.cpu || 0} 
                unit="%" 
                color="blue"
              />
              <ResourceCard 
                icon={<HardDrive size={24} />} 
                label="Memory Usage" 
                value={stats?.resources?.memory || 0} 
                unit="%" 
                color="purple"
              />
              <div className="sm:col-span-2 glass rounded-[2.5rem] p-8 border border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-black text-lg font-display">Traffic Analytics</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                      <div className="w-2 h-2 rounded-full bg-brand-500" /> Views
                    </div>
                  </div>
                </div>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[...(stats?.viewsByDay || [])].reverse()}>
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#888' }}
                        dy={10}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#000', 
                          border: 'none', 
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#3b82f6" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorViews)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Encoding Queue */}
            <div className="glass rounded-[2.5rem] p-8 border border-neutral-100 dark:border-neutral-800 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-lg font-display flex items-center gap-2">
                  <Clock size={20} className="text-brand-500" /> Encoding Queue
                </h3>
                <span className="px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest">
                  {queueData?.pending || 0} Active
                </span>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar max-h-[400px]">
                {queueData?.processing?.map((video: any) => (
                  <QueueItem key={video.id} video={video} status="processing" />
                ))}
                {queueData?.waiting?.map((video: any) => (
                  <QueueItem key={video.id} video={video} status="waiting" />
                ))}
                {(!queueData?.processing?.length && !queueData?.waiting?.length) && (
                  <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                    <CheckCircle2 size={32} className="mb-2 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">Queue is empty</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                  <span>Hardware Acceleration</span>
                  <span className={stats?.resources?.hasNVENC ? 'text-green-500' : 'text-red-500'}>
                    {stats?.resources?.hasNVENC ? 'NVENC ACTIVE' : 'CPU ONLY'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <StatCard 
              icon={<Users size={24} />} 
              label="Total Users" 
              value={stats?.totalUsers?.count || 0} 
              trend={stats?.totalUsers?.trend || 0}
              color="blue"
            />
            <StatCard 
              icon={<Play size={24} />} 
              label="Total Videos" 
              value={stats?.totalVideos?.count || 0} 
              trend={stats?.totalVideos?.trend || 0}
              color="red"
            />
            <StatCard 
              icon={<Eye size={24} />} 
              label="Total Views" 
              value={stats?.totalViews?.count || 0} 
              trend={stats?.totalViews?.trend || 0}
              color="orange"
            />
          </div>

          {/* Top Videos Table */}
          <div className="glass border border-neutral-100 dark:border-neutral-800 rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-neutral-50 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white font-display">Top Performing Videos</h2>
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Most viewed content this month</p>
              </div>
              <button className="bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white font-black text-xs px-6 py-3 rounded-xl transition-all flex items-center gap-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 active:scale-95">
                Full Report <ChevronRight size={16} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-6">Video Details</th>
                    <th className="px-8 py-6">Views</th>
                    <th className="px-8 py-6 hidden md:table-cell">Engine</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                  {loading ? (
                    [...Array(5)].map((_, i) => <TableRowSkeleton key={i} />)
                  ) : (
                    (stats?.topVideos || []).map((video: any) => (
                      <tr key={video.id} className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-all duration-300">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4 min-w-[240px]">
                            <div className="w-24 aspect-video bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-hidden flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-500">
                              {video.thumbnail_url && <img src={video.thumbnail_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                            </div>
                            <div className="min-w-0">
                              <span className="block font-black text-sm text-neutral-800 dark:text-neutral-200 truncate group-hover:text-brand-600 transition-colors">{video.title}</span>
                              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{(video.size / (1024 * 1024)).toFixed(1)} MB</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="font-black text-sm text-neutral-900 dark:text-white">{video.views.toLocaleString()}</span>
                        </td>
                        <td className="px-8 py-6 hidden md:table-cell">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            video.encoding_engine === 'gpu' ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                          }`}>
                            {video.encoding_engine || 'CPU'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            video.status === 'ready' ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                          }`}>
                            {video.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link 
                              to={`/analytics/${video.id}`}
                              className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-black text-[10px] uppercase tracking-widest hover:bg-brand-600 hover:text-white px-5 py-2.5 rounded-xl transition-all active:scale-95"
                            >
                              <PieChart size={14} /> Analytics
                            </Link>
                            <button
                              onClick={() => handleDeleteVideo(video.id)}
                              className="inline-flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white px-5 py-2.5 rounded-xl transition-all active:scale-95"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Other tabs remain similar but with updated styling */}
      {activeTab === 'settings' && (
        <div className="glass border border-neutral-100 dark:border-neutral-800 rounded-[2.5rem] overflow-hidden">
          <div className="p-8 border-b border-neutral-50 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white font-display flex items-center gap-3">
                <Settings size={28} className="text-brand-600" /> System Settings
              </h2>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Global platform configuration</p>
            </div>
            <button 
              onClick={handleSaveSettings}
              disabled={saveStatus === 'saving'}
              className="flex items-center justify-center gap-3 bg-brand-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 disabled:opacity-50 active:scale-95"
            >
              {saveStatus === 'saving' ? <Loader2 className="animate-spin" size={22} /> : <Save size={22} />}
              {saveStatus === 'success' ? 'Settings Saved!' : 'Save Changes'}
            </button>
          </div>
          <div className="p-8 md:p-12 space-y-12">
            <div className="max-w-md">
              <label className="block text-[10px] font-black text-neutral-400 mb-3 uppercase tracking-[0.2em]">Max Upload Size (MB)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={settings.find(s => s.setting_key === 'max_upload_size_mb')?.setting_value || '2048'}
                  onChange={(e) => updateSetting('max_upload_size_mb', e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-4 px-6 font-black text-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white dark:focus:bg-black focus:border-brand-500 transition-all"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-400 font-black text-sm">MB</div>
              </div>
            </div>

            <div className="space-y-6">
              <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-[0.2em]">Encoding Engine</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EngineOption 
                  title="CPU (libx264)"
                  description="Standard software encoding. High compatibility, slower speed. Best for systems without NVIDIA GPUs."
                  isActive={settings.find(s => s.setting_key === 'encoding_engine')?.setting_value === 'cpu'}
                  onClick={() => updateSetting('encoding_engine', 'cpu')}
                  color="blue"
                />
                <EngineOption 
                  title="GPU (NVIDIA NVENC)"
                  description="Hardware acceleration for RTX 3050. Ultra fast, low CPU usage. Recommended for production."
                  isActive={settings.find(s => s.setting_key === 'encoding_engine')?.setting_value === 'gpu'}
                  onClick={() => updateSetting('encoding_engine', 'gpu')}
                  color="purple"
                  badge={stats?.resources?.hasNVENC ? 'DETECTED' : 'NOT FOUND'}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass border border-neutral-100 dark:border-neutral-800 rounded-[2.5rem] overflow-hidden">
          <div className="p-8 border-b border-neutral-50 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white font-display flex items-center gap-3">
                <Users size={28} className="text-brand-600" /> User Management
              </h2>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Manage platform users and permissions</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-6">User Details</th>
                  <th className="px-8 py-6">Role</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                {!usersData ? (
                  [...Array(5)].map((_, i) => <TableRowSkeleton key={i} />)
                ) : (
                  usersData.map((user: any) => (
                    <tr key={user.id} className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 font-black">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-black text-sm text-neutral-900 dark:text-white">{user.first_name} {user.last_name}</div>
                            <div className="text-[10px] text-neutral-400 font-bold">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateUser(user.id, { role: e.target.value })}
                          className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-brand-600"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-8 py-6">
                        <button
                          onClick={() => handleUpdateUser(user.id, { isBlocked: !user.is_blocked })}
                          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            user.is_blocked ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                          }`}
                        >
                          {user.is_blocked ? 'Blocked' : 'Active'}
                        </button>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const res = await api.get(`/admin/users/${user.id}/details`);
                                setDrawerUser(res.data);
                              } catch (err) {
                                alert('Failed to fetch user details');
                              }
                            }}
                            className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400 font-black text-[10px] uppercase tracking-widest hover:bg-neutral-200 dark:hover:bg-neutral-800 px-5 py-2.5 rounded-xl transition-all active:scale-95"
                          >
                            <Eye size={14} /> Details
                          </button>
                          <button
                            onClick={() => setPasswordModalUser(user)}
                            className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-black text-[10px] uppercase tracking-widest hover:bg-brand-600 hover:text-white px-5 py-2.5 rounded-xl transition-all active:scale-95"
                          >
                            <Lock size={14} /> Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="glass border border-neutral-100 dark:border-neutral-800 rounded-[2.5rem] overflow-hidden">
          <div className="p-8 border-b border-neutral-50 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white font-display flex items-center gap-3">
                <MessageSquare size={28} className="text-brand-600" /> Comment Moderation
              </h2>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Review and manage user comments</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-6">Commenter</th>
                  <th className="px-8 py-6">Content</th>
                  <th className="px-8 py-6">Video</th>
                  <th className="px-8 py-6">Date</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                {!commentsData ? (
                  [...Array(5)].map((_, i) => <TableRowSkeleton key={i} />)
                ) : (
                  commentsData.map((comment: any) => (
                    <tr key={comment.id} className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-all duration-300">
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="font-black text-sm text-neutral-900 dark:text-white">{comment.first_name} {comment.last_name}</div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">{comment.content}</p>
                      </td>
                      <td className="px-8 py-6">
                        <Link to={`/video/${comment.video_id}`} className="text-sm font-bold text-brand-600 hover:underline line-clamp-1">
                          {comment.video_title}
                        </Link>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <span className="text-xs text-neutral-500 font-medium">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="inline-flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white px-5 py-2.5 rounded-xl transition-all active:scale-95"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports tab would follow same glassmorphism pattern */}

      {activeTab === 'programs' && (
          <div className="space-y-8 mt-6">
            {/* Form Tambah Program */}
            <div className="bg-neutral-900/80 rounded-3xl p-6 border border-neutral-800 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Tambah Program Pembelajaran</h3>
              <form onSubmit={handleAddProgram} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Nama Program (mis: Basic Python 1)"
                  value={newProgName}
                  onChange={(e) => setNewProgName(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-brand-500"
                  required
                />
                <select
                  value={newProgType}
                  onChange={(e: any) => setNewProgType(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="reset_monthly">Reset Bulanan (4x / bln)</option>
                  <option value="continuous">Kontinu (Berkelanjutan)</option>
                </select>
                {newProgType === 'continuous' && (
                  <input
                    type="number"
                    placeholder="Kuota Maksimal"
                    value={newProgQuota}
                    onChange={(e) => setNewProgQuota(parseInt(e.target.value, 10) || '')}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-brand-500"
                  />
                )}
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-500 text-white font-black text-xs uppercase tracking-widest rounded-xl p-3 transition-all"
                >
                  + Tambah Program
                </button>
              </form>
            </div>

            {/* Tabel Daftar Program */}
            <div className="bg-neutral-900/80 rounded-3xl p-6 border border-neutral-800 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Daftar Master Program</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-medium">
                  <thead>
                    <tr className="border-b border-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                      <th className="pb-3">Nama Program</th>
                      <th className="pb-3">Siklus</th>
                      <th className="pb-3">Kuota Pertemuan</th>
                      <th className="pb-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {programsList.map((prog) => (
                      <tr key={prog.id} className="hover:bg-neutral-800/30">
                        <td className="py-3 font-bold text-white">{prog.program_name}</td>
                        <td className="py-3">
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${prog.type === 'reset_monthly' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                            {prog.type === 'reset_monthly' ? 'Reset Bulanan' : 'Kontinu'}
                          </span>
                        </td>
                        <td className="py-3 text-neutral-300 font-bold">{prog.max_quota ? `${prog.max_quota} Pertemuan` : 'Tanpa Batas (4/bln)'}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDeleteProgram(prog.id)}
                            className="text-red-400 hover:text-red-300 font-bold text-xs"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {/* Modals and Drawers */}
      <AnimatePresence>
        {passwordModalUser && (
          <PasswordModal 
            user={passwordModalUser} 
            onClose={() => setPasswordModalUser(null)} 
          />
        )}
        {drawerUser && (
          <UserDrawer 
            user={drawerUser} 
            onClose={() => setDrawerUser(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PasswordModal({ user, onClose }: { user: any, onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/admin/users/${user.id}/password`, { newPassword: password });
      alert('Password updated successfully');
      onClose();
    } catch (err) {
      setError('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md glass border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] p-8 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 rounded-full transition-colors">
          <X size={20} />
        </button>
        <div className="mb-8">
          <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 text-brand-600 rounded-2xl flex items-center justify-center mb-6">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white font-display mb-2">Change Password</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
            Set a new password for <span className="font-bold text-neutral-900 dark:text-white">{user.first_name} {user.last_name}</span>.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-[0.2em]">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-4 px-6 font-medium focus:outline-none focus:border-brand-500 transition-colors pr-12"
                placeholder="Enter new password"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {error && <p className="text-red-500 text-xs font-bold mt-2">{error}</p>}
          </div>
          
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Confirm
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function UserDrawer({ user, onClose }: { user: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col"
      >
        <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="text-xl font-black font-display text-neutral-900 dark:text-white">User Details</h2>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 font-black text-3xl mb-4 shadow-xl shadow-brand-500/10">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white font-display">{user.first_name} {user.last_name}</h3>
            <p className="text-neutral-500 dark:text-neutral-400 font-medium mt-1">{user.email}</p>
            <div className="mt-4 flex gap-2">
              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-600' : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600'}`}>
                {user.role}
              </span>
              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${user.is_blocked ? 'bg-red-100 dark:bg-red-500/10 text-red-600' : 'bg-green-100 dark:bg-green-500/10 text-green-600'}`}>
                {user.is_blocked ? 'Blocked' : 'Active'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800">
              <div className="text-brand-500 mb-3"><Play size={24} /></div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Videos</p>
              <p className="text-2xl font-black text-neutral-900 dark:text-white font-display">{user.total_videos}</p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800">
              <div className="text-orange-500 mb-3"><Database size={24} /></div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Storage Used</p>
              <p className="text-2xl font-black text-neutral-900 dark:text-white font-display">{(user.total_storage / (1024 * 1024)).toFixed(1)} <span className="text-sm">MB</span></p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-800 pb-2">Account Info</h4>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-400">
                <Calendar size={18} />
                <span className="text-sm font-bold">Joined Date</span>
              </div>
              <span className="text-sm font-black text-neutral-900 dark:text-white">
                {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-400">
                <Activity size={18} />
                <span className="text-sm font-bold">User ID</span>
              </div>
              <span className="text-sm font-black text-neutral-900 dark:text-white">#{user.id}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ResourceCard({ icon, label, value, unit, color }: { icon: React.ReactNode, label: string, value: number, unit: string, color: 'blue' | 'purple' }) {
  return (
    <div className="glass rounded-[2rem] p-6 border border-neutral-100 dark:border-neutral-800 hover:border-brand-500/30 transition-all group/resource">
      <div className="flex items-center gap-4 mb-4">
        <div className={cn(
          "p-3 rounded-2xl transition-transform group-hover/resource:scale-110",
          color === 'blue' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400'
        )}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-black font-display group-hover/resource:text-brand-600 transition-colors">{value}{unit}</p>
        </div>
      </div>
      <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden shadow-inner">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className={cn(
            "h-full rounded-full relative",
            color === 'blue' ? 'bg-blue-500' : 'bg-purple-500',
            value > 80 && "animate-pulse"
          )}
        >
          {value > 80 && (
            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
          )}
        </motion.div>
      </div>
    </div>
  );
}

function QueueItem({ video, status }: { video: any, status: 'processing' | 'waiting' }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 group">
      <div className="w-12 h-12 rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
        {status === 'processing' ? (
          <Loader2 size={20} className="text-brand-500 animate-spin" />
        ) : (
          <Clock size={20} className="text-neutral-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black truncate text-neutral-900 dark:text-white">{video.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[9px] font-black uppercase tracking-widest ${status === 'processing' ? 'text-brand-500' : 'text-neutral-400'}`}>
            {status === 'processing' ? `Encoding ${video.progress || 0}%` : 'Waiting in Queue'}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color }: { icon: React.ReactNode, label: string, value: number, trend: number, color: 'blue' | 'red' | 'orange' }) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    red: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
    orange: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 modern-shadow"
    >
      <div className="flex items-center justify-between mb-6">
        <div className={`p-4 rounded-2xl ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black ${trend >= 0 ? 'bg-green-50 dark:bg-green-500/10 text-green-600' : 'bg-red-50 dark:bg-red-500/10 text-red-600'}`}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}%
        </div>
      </div>
      <h3 className="text-neutral-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">{label}</h3>
      <p className="text-4xl font-black font-display text-neutral-900 dark:text-white">{value.toLocaleString()}</p>
    </motion.div>
  );
}

function EngineOption({ title, description, isActive, onClick, color, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`group p-8 rounded-[2rem] border-2 transition-all text-left relative overflow-hidden ${
        isActive 
          ? color === 'blue' ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-500/5' : 'border-purple-600 bg-purple-50/50 dark:bg-purple-500/5'
          : 'border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-200 dark:hover:border-neutral-700'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="font-black text-xl font-display text-neutral-900 dark:text-white">{title}</div>
        {badge && (
          <span className={`text-[9px] px-3 py-1 rounded-lg font-black tracking-widest ${badge === 'DETECTED' ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="text-sm text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">{description}</div>
      {isActive && (
        <div className={`absolute top-0 right-0 w-12 h-12 rounded-bl-3xl flex items-center justify-center text-white ${color === 'blue' ? 'bg-blue-600' : 'bg-purple-600'}`}>
          <Save size={18} />
        </div>
      )}
    </button>
  );
}
