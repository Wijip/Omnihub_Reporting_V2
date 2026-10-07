import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../lib/api';
import { Terminal, AlertTriangle, ShieldAlert, Info, Search, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function SystemLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/admin/logs');
        setLogs(res.data);
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();

    const socket = io();
    socket.on('system-log', (newLog) => {
      setLogs((prev) => [newLog, ...prev].slice(0, 500));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'INFO': return <Info size={16} className="text-blue-500" />;
      case 'WARNING': return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'ERROR': return <ShieldAlert size={16} className="text-red-500" />;
      case 'CRITICAL': return <ShieldAlert size={16} className="text-purple-500" />;
      default: return <Terminal size={16} className="text-neutral-500" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'INFO': return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
      case 'WARNING': return 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400';
      case 'ERROR': return 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400';
      case 'CRITICAL': return 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400';
      default: return 'bg-neutral-50 text-neutral-600 dark:bg-neutral-500/10 dark:text-neutral-400';
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-neutral-500">Loading system logs...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Terminal className="text-brand-600" size={32} />
            System Health & Logs
          </h1>
          <p className="text-neutral-500 mt-1">Real-time monitoring of FFmpeg transcoding and system events.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-800">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input 
              type="text" 
              placeholder="Search logs by message or source..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-2xl py-3 pl-12 pr-4 font-medium focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl">
            {['ALL', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'].map((level) => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                  filterLevel === level 
                    ? "bg-white dark:bg-neutral-900 text-brand-600 shadow-sm" 
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 text-xs font-black text-neutral-400 uppercase tracking-widest">
                <th className="py-4 px-4">Timestamp</th>
                <th className="py-4 px-4">Level</th>
                <th className="py-4 px-4">Source</th>
                <th className="py-4 px-4">Message</th>
                <th className="py-4 px-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {filteredLogs.map((log, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={log.id || idx} 
                  className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <td className="py-4 px-4 text-neutral-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-4 px-4">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest", getLevelBadge(log.level))}>
                      {getLevelIcon(log.level)}
                      {log.level}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-bold text-neutral-700 dark:text-neutral-300">
                    {log.source}
                  </td>
                  <td className="py-4 px-4 text-neutral-600 dark:text-neutral-400 max-w-md truncate" title={log.message}>
                    {log.message}
                  </td>
                  <td className="py-4 px-4">
                    {log.metadata && (
                      <pre className="text-[10px] bg-neutral-100 dark:bg-neutral-800 p-2 rounded-xl overflow-x-auto max-w-xs text-neutral-500">
                        {typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </td>
                </motion.tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-500">
                    No logs found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
