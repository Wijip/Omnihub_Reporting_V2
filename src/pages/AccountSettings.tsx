import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Camera, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  avatar_url: string | null;
}

export default function AccountSettings() {
  const [profile, setProfile] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    avatar_url: null,
  });
  
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage({ type: 'error', text: 'Gagal memuat profil' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'currentPassword' || name === 'newPassword') {
      setPasswords(prev => ({ ...prev, [name]: value }));
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAvatarIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/user/avatar', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setProfile(prev => ({ ...prev, avatar_url: res.data.avatar_url }));
      setMessage({ type: 'success', text: 'Foto profil berhasil diperbarui' });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setMessage({ type: 'error', text: 'Gagal mengunggah foto profil' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
      };

      if (passwords.newPassword && passwords.currentPassword) {
        payload.currentPassword = passwords.currentPassword;
        payload.newPassword = passwords.newPassword;
      }

      await axios.put('/api/user/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'Profil berhasil diperbarui' });
      setPasswords({ currentPassword: '', newPassword: '' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Gagal memperbarui profil' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getInitials = () => {
    return `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Pengaturan Akun</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-2">Kelola informasi profil dan pengaturan keamanan akun Anda.</p>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20' 
              : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{message.text}</span>
        </motion.div>
      )}

      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center border-4 border-white dark:border-neutral-800 shadow-sm">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-neutral-500 dark:text-neutral-400">{getInitials()}</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleAvatarIconClick}
                className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
              >
                <Camera className="text-white w-8 h-8" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white">Foto Profil</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Klik gambar untuk mengubah foto profil (maks. 2MB)</p>
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-700" />

          {/* Profile Info Section */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Informasi Pribadi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Nama Depan</label>
                <input
                  type="text"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Nama Belakang</label>
                <input
                  type="text"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Email Utama</label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-700" />

          {/* Security Section */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Ganti Password <span className="text-sm font-normal text-neutral-500">(Opsional)</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Password Saat Ini</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwords.currentPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-neutral-400"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Password Baru</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwords.newPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-neutral-400"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
