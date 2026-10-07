import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { 
  BarChart2, Users, Play, Trash2, ShieldAlert, Cpu, Activity, Clock, Settings, Search, Edit2, Lock, Unlock, Plus, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import AdminArchives from './AdminArchives';
import { AdminControlPanel } from '../components/AdminControlPanel';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'users' | 'encoding' | 'resets' | 'archives'>('overview');
  
  const [videos, setVideos] = useState<any[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [encodingSettings, setEncodingSettings] = useState<any>({});
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [videoRes, reportRes, userRes, encRes, resetRes] = await Promise.all([
        api.get('/admin/videos'),
        api.get('/admin/reports'),
        api.get('/admin/users'),
        api.get('/admin/encoding-settings'),
        api.get('/admin/reset-requests')
      ]);
      setVideos(videoRes.data);
      setReports(reportRes.data);
      setUsers(userRes.data);
      setEncodingSettings(encRes.data);
      setResetRequests(resetRes.data);
      setLoading(false);
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 401) {
         navigate('/home');
      }
      setError('Failed to load dashboard data. Are you an admin?');
      setLoading(false);
    }
  };

  const handleTakedown = async (id: number) => {
    if (!confirm('SCORCHED EARTH POLICY: Are you sure you want to permanently delete this video and wipe its physical files? This action CANNOT be undone.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/video/${id}`);
      setVideos(videos.filter(v => v.id !== id));
    } catch (err) {
      alert('Failed to execute takedown.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateEncoding = async (key: string, field: string, value: any) => {
    const updated = { ...encodingSettings, [key]: { ...encodingSettings[key], [field]: value } };
    setEncodingSettings(updated);
    try {
      await api.put('/admin/encoding-settings', updated);
    } catch (e) {
      alert('Failed to update encoding settings');
    }
  };

  const handleToggleUserBlock = async (user: any) => {
    try {
      await api.put(`/admin/users/${user.id}`, { is_blocked: !user.is_blocked });
      setUsers(users.map(u => u.id === user.id ? { ...u, is_blocked: !u.is_blocked } : u));
    } catch (e) {
      alert('Failed to update user status');
    }
  };

  const handleUpdateUserRole = async (user: any) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await api.put(`/admin/users/${user.id}`, { role: newRole });
      setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (e) {
      alert('Failed to update user role');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('SCORCHED EARTH POLICY: Delete this user and all their videos?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
      setVideos(videos.filter(v => v.user_id !== id));
    } catch (e) {
      alert('Failed to delete user');
    }
  };

  const [resetModal, setResetModal] = useState({ isOpen: false, ticketId: null as number | null, userName: '', newPassword: '', loading: false });

  const handleResolveDefault = async (id: number) => {
    if (!confirm('Are you sure you want to reset this user\'s password to User!1234@?')) return;
    try {
      await api.post(`/admin/reset-requests/${id}/resolve`);
      // Update UI (Note: the backend for /resolve uses User!1234@, but we can assume UI reflects it as resolved)
      setResetRequests(resetRequests.map(r => r.id === id ? { ...r, status: 'resolved', new_password: 'User!1234@' } : r));
    } catch (e) {
      alert('Failed to resolve request');
    }
  };

  const handleResolveCustom = async (id: number, userName: string) => {
    setResetModal({
      isOpen: true,
      ticketId: id,
      userName: userName,
      newPassword: '',
      loading: false
    });
  };

  const executeCustomReset = async () => {
    if (!resetModal.ticketId || !resetModal.newPassword) return;
    setResetModal(prev => ({ ...prev, loading: true }));
    try {
      await api.post('/admin/reset-password-execute', { ticketId: resetModal.ticketId, newPassword: resetModal.newPassword });
      setResetRequests(resetRequests.map(r => r.id === resetModal.ticketId ? { ...r, status: 'resolved', new_password: resetModal.newPassword } : r));
      setResetModal(prev => ({ ...prev, isOpen: false, loading: false }));
    } catch (e) {
      alert('Failed to execute custom reset request');
      setResetModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSavePassword = async () => {
    if (!selectedUser || !newPassword) return;
    try {
      await api.put(`/admin/users/${selectedUser.id}/password`, { newPassword });
      alert('Password updated successfully');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (e) {
      alert('Failed to update password');
    }
  };

  const handleDownloadTemplate = () => {
     window.open(`${(import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api'}/admin/reset-requests/template`, '_blank');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     const formData = new FormData();
     formData.append('file', file);
     try {
       const res = await api.post('/admin/reset-requests/import', formData, {
         headers: { 'Content-Type': 'multipart/form-data' }
       });
       alert(res.data.message || 'Import successful');
       fetchData(); // reload
     } catch (err: any) {
       alert(err.response?.data?.details || 'Failed to import data');
       if (err.response?.data?.errors?.length) {
         alert('Terdapat kesalahan parsing pada baris berikut:\n' + err.response.data.errors.join('\n'));
       }
     }
     e.target.value = '';
  };

  const filteredUsers = users.filter(u => 

    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.firstName + ' ' + u.lastName).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div></div>;
  if (error) return <div className="p-8 text-center glass rounded-2xl border border-red-500/20"><ShieldAlert size={48} className="text-red-500 mx-auto mb-4" /><h2 className="text-2xl font-black text-white">{error}</h2></div>;

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest">
          <ShieldAlert size={12} /> Restricted Access
        </div>
        <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-white">
          Command Center
        </h1>
        <p className="text-neutral-400 font-medium max-w-md">
          Absolute control over OmniHub content. Takedown videos, monitor integrity, and govern users.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {['overview', 'videos', 'users', 'encoding', 'resets', 'archives'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-5 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${
              activeTab === tab ? 'bg-brand-500 text-white shadow-[0_0_20px_rgba(255,115,0,0.3)]' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {tab === 'resets' ? 'Reset Requests' : tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && reports && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="glass p-6 rounded-[2rem] border border-neutral-800 flex items-center gap-4">
                 <div className="p-3 bg-brand-500/10 text-brand-500 rounded-xl"><Play size={24} /></div>
                 <div>
                   <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total Videos</p>
                   <p className="text-2xl font-black">{reports.totals.totalVideos}</p>
                 </div>
               </div>
               <div className="glass p-6 rounded-[2rem] border border-neutral-800 flex items-center gap-4">
                 <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Users size={24} /></div>
                 <div>
                   <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total Users</p>
                   <p className="text-2xl font-black">{reports.totals.totalUsers}</p>
                 </div>
               </div>
               <div className="glass p-6 rounded-[2rem] border border-neutral-800 flex items-center gap-4">
                 <div className="p-3 bg-green-500/10 text-green-500 rounded-xl"><Cpu size={24} /></div>
                 <div>
                   <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">GPU Engine</p>
                   <p className="text-sm font-black">{reports.gpu}</p>
                 </div>
               </div>
               <div className="glass p-6 rounded-[2rem] border border-neutral-800 flex items-center gap-4">
                 <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><Activity size={24} /></div>
                 <div>
                   <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">System Health</p>
                   <p className="text-lg font-black text-green-500">{reports.health}</p>
                 </div>
               </div>
            </div>
          )}

          {/* VIDEOS TAB */}
          {activeTab === 'videos' && (
            <div className="space-y-6">
              {/* PANEL KENDALI REBUILD & TRANSFER ADMIN */}
              <AdminControlPanel onRefresh={() => {
                api.get('/admin/reports').then(res => setReports(res.data));
                api.get('/admin/videos').then(res => setVideos(res.data));
              }} />

              <div className="glass border border-neutral-800 rounded-[2.5rem] overflow-hidden">
                <div className="p-8 border-b border-neutral-800">
                  <h2 className="text-2xl font-black text-white font-display">System Videos</h2>
                  <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Master index of all uploaded content</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-900/50 text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em]">
                      <tr>
                        <th className="px-8 py-6">Video ID / Title</th>
                        <th className="px-8 py-6">Uploader</th>
                        <th className="px-8 py-6">Status</th>
                        <th className="px-8 py-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {videos.map((video) => (
                        <tr key={video.id} className="hover:bg-neutral-800/30 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4 min-w-[240px]">
                              <div className="min-w-0">
                                <span className="block font-black text-sm text-white truncate">{video.title}</span>
                                <span className="text-[10px] text-neutral-400 font-bold tracking-widest">ID: {video.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-sm font-bold text-white">{video.firstName} {video.lastName}</div>
                            <div className="text-[10px] text-neutral-400 font-bold">{video.email}</div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                              video.status === 'ready' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
                            }`}>
                              {video.status}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button
                              onClick={() => handleTakedown(video.id)}
                              disabled={deletingId === video.id}
                              className="inline-flex items-center gap-2 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white px-5 py-2.5 rounded-xl border border-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                              <Trash2 size={14} /> {deletingId === video.id ? 'Deleting...' : 'Takedown'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {videos.length === 0 && (
                        <tr><td colSpan={4} className="px-8 py-12 text-center text-neutral-500 font-black text-sm uppercase tracking-widest">No videos found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="glass border border-neutral-800 rounded-[2.5rem] overflow-hidden space-y-0">
              <div className="p-8 border-b border-neutral-800 flex flex-col md:flex-row gap-4 justify-between items-center bg-neutral-900/50">
                <div>
                  <h2 className="text-2xl font-black text-white font-display">User Management</h2>
                  <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Govern platform access and roles</p>
                </div>
                <div className="relative w-full md:w-64">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-sm text-white rounded-xl pl-10 pr-4 py-2.5 focus:border-brand-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-neutral-950/30 text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    <tr>
                      <th className="px-8 py-6">User</th>
                      <th className="px-8 py-6">Role</th>
                      <th className="px-8 py-6">Status</th>
                      <th className="px-8 py-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="px-8 py-6">
                          <div className="text-sm font-bold text-white">{user.firstName} {user.lastName}</div>
                          <div className="text-[10px] text-neutral-400 font-bold">{user.email}</div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            user.role === 'admin' ? 'bg-brand-500/10 text-brand-400' : 'bg-neutral-800 text-neutral-400'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            user.is_blocked ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                          }`}>
                            {user.is_blocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right space-x-2">
                           <button onClick={() => { setSelectedUser(user); setNewPassword(''); setIsEditModalOpen(true); }} className="inline-flex items-center gap-2 text-brand-500 font-black text-[10px] uppercase tracking-widest hover:bg-brand-500 hover:text-white px-3 py-2 rounded-xl border border-brand-500/20 active:scale-95 transition-all">
                             <Edit2 size={12} /> Edit
                           </button>
                           <button onClick={() => handleUpdateUserRole(user)} className="inline-flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white px-3 py-2 rounded-xl border border-blue-500/20 active:scale-95 transition-all">
                             <ShieldAlert size={12} /> {user.role === 'admin' ? '- Admin' : '+ Admin'}
                           </button>
                           <button onClick={() => handleToggleUserBlock(user)} className={`inline-flex items-center gap-2 font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl border hover:text-white active:scale-95 transition-all ${
                             user.is_blocked ? 'text-green-500 border-green-500/20 hover:bg-green-600' : 'text-orange-500 border-orange-500/20 hover:bg-orange-600'
                           }`}>
                             {user.is_blocked ? <Unlock size={12}/> : <Lock size={12}/>}
                             {user.is_blocked ? 'Unblock' : 'Block'}
                           </button>
                           <button onClick={() => handleDeleteUser(user.id)} className="inline-flex items-center gap-2 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white px-3 py-2 rounded-xl border border-red-500/20 active:scale-95 transition-all">
                             <Trash2 size={12} /> Delete
                           </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={4} className="px-8 py-12 text-center text-neutral-500 font-black text-sm uppercase tracking-widest">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ENCODING SETTINGS TAB */}
          {activeTab === 'encoding' && Object.keys(encodingSettings).length > 0 && (
            <div className="glass border border-neutral-800 rounded-[2.5rem] p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-black text-white font-display">Dynamic Encoding Engine</h2>
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Control FFmpeg pipelines and resolution generation</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(encodingSettings).map(([res, config]: any) => (
                  <div key={res} className={`p-6 rounded-3xl border transition-all ${config.active ? 'bg-brand-500/5 border-brand-500/50' : 'bg-neutral-900 border-neutral-800 opacity-60'}`}>
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <Settings size={24} className={config.active ? 'text-brand-500' : 'text-neutral-500'} />
                        <h3 className="text-2xl font-black text-white">{res}</h3>
                      </div>
                      <button
                        onClick={() => handleUpdateEncoding(res, 'active', !config.active)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${config.active ? 'bg-brand-500' : 'bg-neutral-800'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${config.active ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Video Bitrate</span>
                        <input type="text" value={config.videoBitrate} onChange={e => handleUpdateEncoding(res, 'videoBitrate', e.target.value)} className="bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg px-2 py-1 w-20 text-right focus:border-brand-500 focus:outline-none" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Audio Bitrate</span>
                        <input type="text" value={config.audioBitrate} onChange={e => handleUpdateEncoding(res, 'audioBitrate', e.target.value)} className="bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg px-2 py-1 w-20 text-right focus:border-brand-500 focus:outline-none" />
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Resolution</span>
                         <span className="text-xs font-bold text-white content-end">{config.width}x{config.height}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESETS TAB */}
          {activeTab === 'resets' && (
            <div className="glass border border-neutral-800 rounded-[2.5rem] overflow-hidden space-y-0">
              <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-white font-display">Password Reset Requests</h2>
                  <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Manage user access recovery</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={handleDownloadTemplate} className="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-black text-[10px] uppercase tracking-widest transition-all">
                    Download Template
                  </button>
                  <label className="px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer inline-flex items-center">
                    Import Excel
                    <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} />
                  </label>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-neutral-950/30 text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    <tr>
                      <th className="px-8 py-6">Ticket ID</th>
                      <th className="px-8 py-6">User Info</th>
                      <th className="px-8 py-6">Complaint</th>
                      <th className="px-8 py-6">Status</th>
                      <th className="px-8 py-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {resetRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="px-8 py-6">
                          <span className="font-mono text-brand-400 font-bold text-sm tracking-widest">{req.ticket_id}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm font-bold text-white">{req.full_name}</div>
                          <div className="text-[10px] text-neutral-400 font-bold">{req.email}</div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-xs text-neutral-300 max-w-xs">{req.complaint}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            req.status === 'resolved' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          {req.status === 'pending' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleResolveCustom(req.id, req.full_name || req.email)}
                                className="inline-flex items-center gap-2 text-brand-500 font-black text-[10px] uppercase tracking-widest bg-brand-500/10 hover:bg-brand-500 hover:text-white border border-brand-500/20 active:scale-95 px-4 py-2 rounded-xl transition-all"
                              >
                                Custom Pass
                              </button>
                              <button
                                onClick={() => handleResolveDefault(req.id)}
                                className="inline-flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest bg-brand-600 hover:bg-brand-500 border border-brand-500/20 active:scale-95 px-4 py-2 rounded-xl transition-all"
                              >
                                Default Pass
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                              Resolved
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {resetRequests.length === 0 && (
                      <tr><td colSpan={5} className="px-8 py-12 text-center text-neutral-500 font-black text-sm uppercase tracking-widest">No reset requests found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* ARCHIVES TAB */}
          {activeTab === 'archives' && (
            <AdminArchives />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Edit Password Modal (from users tab) */}
      <AnimatePresence>
        {isEditModalOpen && selectedUser && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass p-8 rounded-[2rem] border border-neutral-800 w-full max-w-md relative overflow-hidden"
            >
              <h2 className="text-2xl font-black text-white font-display mb-2">Edit Password</h2>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-6 border-b border-neutral-800 pb-4">
                User: {selectedUser.firstName} {selectedUser.lastName} ({selectedUser.email})
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">New Password</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500 transition-colors"
                    placeholder="Enter new password"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => setNewPassword('User!1234@')}
                  className="w-full bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all"
                >
                  Quick Reset (User!1234@)
                </button>

                <div className="flex gap-4 pt-4 mt-4 border-t border-neutral-800">
                  <button
                    onClick={() => { setIsEditModalOpen(false); setSelectedUser(null); setNewPassword(''); }}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePassword}
                    disabled={!newPassword}
                    className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticket Reset Password Modal (from resets tab) */}
      <AnimatePresence>
        {resetModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass p-8 rounded-3xl shadow-2xl border border-neutral-800/50 w-full max-w-md relative overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-2">
                <Lock size={24} className="text-brand-500" />
                <h2 className="text-2xl font-black text-white font-display">Reset User Password</h2>
              </div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-6 border-b border-neutral-800 pb-4">
                Target User: <span className="text-white">{resetModal.userName}</span>
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">New Password</label>
                  <input
                    type="password"
                    value={resetModal.newPassword}
                    onChange={(e) => setResetModal(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full bg-neutral-900/50 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-mono"
                    placeholder="Enter secure password"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => setResetModal(prev => ({ ...prev, newPassword: 'User!1234@' }))}
                  className="w-full bg-neutral-800/50 hover:bg-neutral-800 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all border border-neutral-700/50"
                >
                  Use Default: User!1234@
                </button>

                <div className="flex gap-4 pt-4 mt-6 border-t border-neutral-800/50">
                  <button
                    onClick={() => setResetModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeCustomReset}
                    disabled={!resetModal.newPassword || resetModal.loading}
                    className="flex-1 bg-brand-500 hover:bg-brand-400 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(255,115,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {resetModal.loading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Update Password
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
