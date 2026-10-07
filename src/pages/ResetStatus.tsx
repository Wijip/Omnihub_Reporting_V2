import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Search, ArrowLeft, Loader2, KeyRound, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ResetStatusPage() {
  const [ticketId, setTicketId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const checkStatus = async (e: any) => {
    e.preventDefault();
    if (!ticketId) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // In case they paste OMNI- prefix or not
      const tid = ticketId.toUpperCase().startsWith('OMNI-') ? ticketId.toUpperCase() : `OMNI-${ticketId.toUpperCase()}`;
      const res = await api.get(`/auth/reset-status/${tid}`);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch ticket status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative"
      >
        <div className="glass rounded-[3rem] p-8 md:p-12 border border-neutral-100 dark:border-neutral-800 shadow-2xl relative overflow-hidden">
          <Link to="/auth" className="inline-flex items-center gap-2 text-neutral-500 hover:text-brand-600 mb-8 font-bold transition-colors">
            <ArrowLeft size={16} /> Back to Login
          </Link>

          <div className="mb-10 text-center">
            <div className="w-20 h-20 bg-brand-50 dark:bg-brand-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-brand-600">
              <Search size={32} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black font-display tracking-tight text-neutral-900 dark:text-white mb-2">Ticket Status</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Enter your Ticket ID to check the progress of your password reset request.</p>
          </div>

          <form onSubmit={checkStatus} className="space-y-6">
            <div className="relative group">
              <input
                type="text"
                placeholder="OMNI-XXXXXX"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl py-5 px-6 font-bold text-center text-2xl tracking-widest uppercase focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white dark:focus:bg-neutral-900 focus:border-brand-200 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !ticketId}
              className="w-full bg-brand-600 text-white py-5 rounded-[2xl] font-black flex items-center justify-center gap-2 hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Check Status'}
            </button>
          </form>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center gap-3 font-bold border border-red-100 dark:border-red-900/30"
              >
                <AlertCircle size={20} /> {error}
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-8 overflow-hidden"
              >
                {result.status === 'pending' ? (
                  <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-[2rem] text-center">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                    <h3 className="font-black text-amber-800 dark:text-amber-500 text-lg mb-1">Under Review</h3>
                    <p className="text-amber-700/80 dark:text-amber-400/80 text-sm">Your ticket is currently in the queue. Please check back later.</p>
                  </div>
                ) : result.status === 'resolved' ? (
                  <div className="p-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-[2.5rem] text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[50px] -mr-10 -mt-10 rounded-full" />
                    
                    <div className="w-16 h-16 bg-white dark:bg-green-900/50 text-green-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-100 dark:border-green-800/50">
                      <KeyRound size={32} />
                    </div>
                    
                    <h3 className="font-black font-display text-green-800 dark:text-green-400 text-2xl mb-2">Request Resolved!</h3>
                    <p className="text-green-700 dark:text-green-300 mb-6 font-medium">Your password has been reset by the admin to the following new password:</p>
                    
                    <div className="bg-white dark:bg-green-950/80 rounded-2xl py-4 px-6 border border-green-100 dark:border-green-900/50 shadow-inner flex items-center justify-center gap-3">
                      <span className="text-2xl font-mono font-bold text-neutral-900 dark:text-white tracking-widest">{result.new_password}</span>
                    </div>

                    <p className="text-xs text-green-600 dark:text-green-400/80 mt-6 font-bold uppercase tracking-widest">
                      Please sign in and change this immediately.
                    </p>
                  </div>
                ) : (
                  <div className="p-6 bg-neutral-100 dark:bg-neutral-800 rounded-3xl text-center">
                    <h3 className="font-bold text-neutral-900 dark:text-white mb-1">Status: {result.status}</h3>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </div>
  );
}
