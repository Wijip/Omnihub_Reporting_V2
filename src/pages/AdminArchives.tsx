import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { History, Trash2, Calendar, FileVideo, HardDrive, User, AlertCircle } from 'lucide-react';
import api from '../lib/api';

interface ArchiveLog {
  archive_id: number;
  original_video_id: number;
  uploader_id: number;
  title: string;
  archive_path: string;
  deleted_at: string;
  expires_at: string;
}

export default function AdminArchives() {
  const [archives, setArchives] = useState<ArchiveLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArchives();
  }, []);

  const fetchArchives = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/archives');
      setArchives(res.data);
    } catch (err: any) {
      console.error('Failed to fetch archives:', err);
      setError(err.response?.data?.error || 'Gagal memuat data arsip');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8 max-w-7xl mx-auto space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
            <History className="text-brand-500" size={32} />
            Arsip Video Terhapus
          </h1>
          <p className="text-neutral-500 mt-2 font-medium">
            Riwayat video yang telah dihapus dalam masa retensi 14 hari sebelum dimusnahkan permanen.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl flex items-center gap-3 font-medium">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {archives.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="text-neutral-400" size={32} />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Arsip Bersih</h3>
              <p className="text-neutral-500">Tidak ada riwayat video yang dihapus saat ini.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/80">
                  <th className="px-6 py-5 text-xs font-black text-neutral-400 uppercase tracking-widest whitespace-nowrap">ID Asli</th>
                  <th className="px-6 py-5 text-xs font-black text-neutral-400 uppercase tracking-widest whitespace-nowrap">Judul Video</th>
                  <th className="px-6 py-5 text-xs font-black text-neutral-400 uppercase tracking-widest whitespace-nowrap">Uploader ID</th>
                  <th className="px-6 py-5 text-xs font-black text-neutral-400 uppercase tracking-widest whitespace-nowrap">Path Folder Arsip</th>
                  <th className="px-6 py-5 text-xs font-black text-neutral-400 uppercase tracking-widest whitespace-nowrap">Tanggal Dihapus</th>
                  <th className="px-6 py-5 text-xs font-black text-neutral-400 uppercase tracking-widest whitespace-nowrap">Jatuh Tempo (Expires)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {archives.map((archive) => (
                  <motion.tr 
                    key={archive.archive_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white">
                        <FileVideo size={16} className="text-neutral-400" />
                        #{archive.original_video_id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-neutral-900 dark:text-white max-w-[200px] truncate" title={archive.title || 'Untitled'}>
                        {archive.title || 'Untitled'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        <User size={14} />
                        #{archive.uploader_id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 max-w-[250px] truncate" title={archive.archive_path}>
                        <HardDrive size={14} className="flex-shrink-0" />
                        {archive.archive_path}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        <Calendar size={14} />
                        {formatDate(archive.deleted_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                        <Calendar size={14} />
                        {formatDate(archive.expires_at)}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}
