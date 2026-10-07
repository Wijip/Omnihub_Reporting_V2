import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { Mail, Lock, Play, ChevronRight, AlertCircle, Loader2, User, Calendar, ArrowLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function AuthPage({ setUser }: { setUser: (user: any) => void }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [forgotTicketId, setForgotTicketId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    password: '',
    birthDate: '',
    complaint: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token === 'undefined' || token === 'null' || !token) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isForgot) {
      try {
        const res = await api.post('/auth/reset-request', {
          fullName: formData.fullName,
          email: formData.email,
          complaint: formData.complaint
        });
        setForgotTicketId(res.data.ticketId);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to submit reset request');
      } finally {
        setLoading(false);
      }
      return;
    }

    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    try {
      const res = await api.post(endpoint, formData);
      
      // Deteksi letak token dari response backend secara aman
      const token = res.data?.token || res.data?.accessToken || res.data?.data?.token;
      const userData = res.data?.user || res.data?.data;

      if (!isLogin && !token) {
        setIsLogin(true);
        setLoading(false);
        return;
      }

      if (!token) {
        setError("Sistem gagal menerima Token dari server.");
        setLoading(false);
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-neutral-950 flex flex-col justify-center items-center px-4 pt-6 pb-32 md:pb-12 overflow-y-auto custom-scrollbar relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-600/10 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl relative"
      >
        <div className="glass rounded-[3rem] p-8 md:p-16 border border-neutral-100 dark:border-neutral-800 shadow-2xl shadow-black/5 relative overflow-hidden">
          {/* Logo & Back Button */}
          <div className="flex items-center justify-between mb-12">
            <Link to="/" className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-2xl text-neutral-400 hover:text-brand-600 transition-all hover:scale-110 active:scale-95">
              <ArrowLeft size={20} />
            </Link>
            <Link to="/" className="flex items-center gap-2 text-brand-600 font-black text-2xl tracking-tighter hover:scale-105 transition-transform font-display">
              <Play fill="currentColor" size={28} />
              <span>OmniHub</span>
            </Link>
            <div className="w-10" /> {/* Spacer */}
          </div>

          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-neutral-900 dark:text-white leading-tight font-display tracking-tight">
              {isForgot ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Join the Hub'}
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 font-medium max-w-sm mx-auto text-sm md:text-base leading-relaxed">
              {isForgot 
                ? 'Submit a ticket to reset your password and check its status later.'
                : isLogin 
                  ? 'Sign in to your creator account and start managing your vision' 
                  : 'Create your creative identity and share your unique stories with the world'}
            </p>
          </div>

          {forgotTicketId ? (
            <div className="text-center space-y-6">
              <div className="p-6 bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 rounded-3xl">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Ticket Submitted!</h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">Your reset request has been sent to the admins. Here is your Ticket ID:</p>
                <div className="text-3xl font-black text-brand-600 tracking-widest">{forgotTicketId}</div>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Please save this ID. You can check the status of your reset request anytime.
              </p>
              <Link to="/reset-status" className="inline-block mt-4 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-4 px-8 rounded-2xl font-bold">
                Check Status Now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <AnimatePresence mode="wait">
                {isForgot ? (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 dark:text-neutral-700 group-focus-within:text-brand-600 transition-colors" size={20} />
                        <input
                          type="text"
                          placeholder="John Doe"
                          required
                          className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl py-4 pl-14 pr-6 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white dark:focus:bg-neutral-900 focus:border-brand-200 dark:focus:border-brand-900 transition-all text-neutral-900 dark:text-white"
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 dark:text-neutral-700 group-focus-within:text-brand-600 transition-colors" size={20} />
                        <input
                          type="email"
                          placeholder="name@example.com"
                          required
                          className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl py-4 pl-14 pr-6 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white dark:focus:bg-neutral-900 focus:border-brand-200 dark:focus:border-brand-900 transition-all text-neutral-900 dark:text-white"
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Complaint Details</label>
                      <textarea
                        required
                        placeholder="Please describe your issue..."
                        className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl py-4 px-6 font-medium focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white dark:focus:bg-neutral-900 focus:border-brand-200 dark:focus:border-brand-900 transition-all text-neutral-900 dark:text-white min-h-[120px] resize-y"
                        onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
                      />
                    </div>
                  </motion.div>
                ) : !isLogin ? (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">First Name</label>
                      <div className="relative group">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 dark:text-neutral-700 group-focus-within:text-brand-600 transition-colors" size={20} />
                        <input
                          type="text"
                          placeholder="John"
                          required
                          className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl py-4 pl-14 pr-6 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white dark:focus:bg-neutral-900 focus:border-brand-200 dark:focus:border-brand-900 transition-all text-neutral-900 dark:text-white"
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Last Name</label>
                      <div className="relative group">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 dark:text-neutral-700 group-focus-within:text-brand-600 transition-colors" size={20} />
                        <input
                          type="text"
                          placeholder="Doe"
                          required
                          className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl py-4 pl-14 pr-6 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white dark:focus:bg-neutral-900 focus:border-brand-200 dark:focus:border-brand-900 transition-all text-neutral-900 dark:text-white"
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {!isForgot && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 dark:text-neutral-700 group-focus-within:text-brand-600 transition-colors" size={20} />
                      <input
                        type="email"
                        placeholder="name@example.com"
                        required
                        className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl py-4 pl-14 pr-6 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white dark:focus:bg-neutral-900 focus:border-brand-200 dark:focus:border-brand-900 transition-all text-neutral-900 dark:text-white"
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 dark:text-neutral-700 group-focus-within:text-brand-600 transition-colors" size={20} />
                      <input
                        type="password"
                        placeholder="••••••••"
                        required
                        className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl py-4 pl-14 pr-6 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white dark:focus:bg-neutral-900 focus:border-brand-200 dark:focus:border-brand-900 transition-all text-neutral-900 dark:text-white"
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              <AnimatePresence mode="wait">
                {!isLogin && !isForgot && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Birth Date</label>
                    <div className="relative group">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 dark:text-neutral-700 group-focus-within:text-brand-600 transition-colors" size={20} />
                      <input
                        type="date"
                        required
                        className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl py-4 pl-14 pr-6 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white dark:focus:bg-neutral-900 focus:border-brand-200 dark:focus:border-brand-900 transition-all text-neutral-900 dark:text-white"
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 text-sm rounded-2xl flex items-center gap-4 font-bold shadow-xl shadow-red-500/5"
                >
                  <AlertCircle size={24} /> {error}
                </motion.div>
              )}

              {isLogin && !isForgot && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsForgot(true)}
                    className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white py-6 rounded-[2rem] font-black flex items-center justify-center gap-4 transition-all shadow-2xl shadow-brand-500/30 disabled:opacity-50 active:scale-95 uppercase text-sm tracking-[0.2em] relative group"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    <span>{isForgot ? 'Submit Request' : isLogin ? 'Sign In' : 'Create Account'}</span>
                    <ChevronRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 mb-4 text-center">
            {isForgot ? (
              <button
                onClick={() => { setIsForgot(false); setForgotTicketId(null); }}
                className="text-neutral-400 font-bold hover:text-white transition-colors"
              >
                Back to Sign In
              </button>
            ) : (
              <p className="text-xs text-neutral-400 font-semibold tracking-wider">
                {isLogin ? "NEW TO OMNIHUB? " : "ALREADY A CREATOR? "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-brand-400 hover:text-brand-300 font-extrabold underline ml-1"
                >
                  {isLogin ? "CREATE ACCOUNT" : "SIGN IN"}
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
