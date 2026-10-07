import React from 'react';
import { AlertTriangle, Search, ServerCrash, RefreshCcw, Home } from 'lucide-react';

interface ErrorPageProps {
  type?: 404 | 500 | 'error';
  errorMessage?: string;
}

export default function ErrorPage({ type = 'error', errorMessage }: ErrorPageProps) {
  let renderIcon = () => <AlertTriangle className="w-12 h-12 text-red-500 dark:text-red-400" />;
  let iconBgClass = "bg-red-50 dark:bg-red-900/20";
  let title = 'Terjadi Kesalahan';
  let description = 'Maaf, terjadi kesalahan yang tidak terduga pada sistem kami.';

  if (type === 404) {
    renderIcon = () => <Search className="w-12 h-12 text-blue-500 dark:text-blue-400" />;
    iconBgClass = "bg-blue-50 dark:bg-blue-900/20";
    title = 'Halaman Tidak Ditemukan';
    description = 'Maaf, halaman yang Anda cari tidak dapat ditemukan atau telah dipindahkan.';
  } else if (type === 500) {
    renderIcon = () => <ServerCrash className="w-12 h-12 text-red-500 dark:text-red-400" />;
    title = 'Gangguan Server';
    description = 'Maaf, server kami sedang mengalami kendala. Silakan coba beberapa saat lagi.';
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-950 px-4">
      <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-3xl shadow-2xl p-8 sm:p-12 text-center transform transition-all">
        <div className={`mx-auto w-24 h-24 ${iconBgClass} rounded-full flex items-center justify-center mb-8`}>
          {renderIcon()}
        </div>
        
        <h1 className="text-3xl font-extrabold text-neutral-900 dark:text-white mb-4 tracking-tight">
          {title}
        </h1>
        
        <p className="text-neutral-500 dark:text-neutral-400 text-base mb-8 leading-relaxed">
          {description}
          {errorMessage && (
            <span className="block mt-4 text-sm bg-neutral-100 dark:bg-neutral-900 p-3 rounded-lg text-neutral-600 dark:text-neutral-300 font-mono text-left overflow-x-auto whitespace-pre-wrap">
              {errorMessage}
            </span>
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="flex flex-1 items-center justify-center gap-2 px-6 py-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white font-medium rounded-xl transition-colors duration-200"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Segarkan</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="flex flex-1 items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors duration-200 shadow-lg shadow-blue-500/30"
          >
            <Home className="w-4 h-4" />
            <span>Beranda</span>
          </button>
        </div>
      </div>
    </div>
  );
}
