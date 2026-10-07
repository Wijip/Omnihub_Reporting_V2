// --- TRIPLE THEME SWITCHER ENGINE (TAHAP 55.1) ---
import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme, ThemeOption } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { value: 'system', label: 'System', icon: <Monitor size={16} /> },
  ];

  const CurrentIcon = options.find(o => o.value === theme)?.icon || <Sun size={16} />;
  // Display the icon of the current preference, or maybe the resolved one. Let's stick to the preference.

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-white/10 text-neutral-400 hover:text-white transition-all shadow-sm"
        title="Ubah Tema"
      >
        {resolvedTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-40 bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-[9999] py-2"
          >
            <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
              Tema Tampilan
            </div>
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                  theme === option.value
                    ? 'bg-brand-600/20 text-brand-400 font-bold'
                    : 'text-neutral-200 hover:bg-neutral-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {option.icon}
                  <span>{option.label}</span>
                </div>
                {theme === option.value && <Check size={14} className="text-brand-400" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
