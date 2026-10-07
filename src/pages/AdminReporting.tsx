import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { motion } from 'motion/react';
import { BarChart3, Clock, Download, Filter, TrendingUp } from 'lucide-react';

interface ChartData {
  label: string;
  uploaded_videos: number;
  total_duration_seconds: number;
  total_downloads: number;
}

interface TopVideo {
  id: number;
  title: string;
  downloads: number;
  duration: number;
  views: number;
  created_at: string;
}

interface ReportResponse {
  chart: ChartData[];
  topDownloaded: TopVideo[];
}

export default function AdminReporting() {
  const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/admin/reports/chart?filter=${filter}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch reporting data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [filter]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-neutral-800 border border-neutral-700 p-3 rounded-lg shadow-xl text-sm">
          <p className="font-semibold text-neutral-100 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {entry.dataKey === 'total_duration_seconds' ? formatDuration(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto text-neutral-800 dark:text-neutral-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-blue-500" />
            Reporting & Analytics
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Monitor system uploads, watch time, and download metrics.
          </p>
        </div>

        <div className="flex items-center bg-white dark:bg-neutral-800 p-1 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <Filter className="w-4 h-4 mx-3 text-neutral-400" />
          {(['daily', 'weekly', 'monthly'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                filter === f
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Main Chart */}
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm mb-8">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Upload & Download Trends
            </h2>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data?.chart || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="label" stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} tickMargin={10} />
                  <YAxis yAxisId="left" stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  
                  <Bar yAxisId="left" dataKey="uploaded_videos" name="Uploaded Videos" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Line yAxisId="left" type="monotone" dataKey="total_downloads" name="Downloads" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="total_duration_seconds" name="Duration (Seconds)" stroke="#8B5CF6" strokeWidth={3} borderDash={[5, 5]} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Download className="w-5 h-5 text-orange-500" />
                Top 10 Downloaded Videos
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900/50 text-neutral-500 dark:text-neutral-400 text-sm">
                    <th className="p-4 font-medium">Video Title</th>
                    <th className="p-4 font-medium">Upload Date</th>
                    <th className="p-4 font-medium">Views</th>
                    <th className="p-4 font-medium flex items-center gap-1"><Clock className="w-4 h-4"/> Duration</th>
                    <th className="p-4 font-medium text-right">Downloads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {data?.topDownloaded?.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-neutral-500">No download data available yet.</td>
                    </tr>
                  )}
                  {data?.topDownloaded?.map((video) => (
                    <tr key={video.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="p-4 font-medium text-neutral-900 dark:text-neutral-100 max-w-xs truncate" title={video.title}>
                        {video.title}
                      </td>
                      <td className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
                        {new Date(video.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
                        {video.views}
                      </td>
                      <td className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
                        {formatDuration(video.duration)}
                      </td>
                      <td className="p-4 text-sm font-bold text-green-500 text-right">
                        {video.downloads}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
