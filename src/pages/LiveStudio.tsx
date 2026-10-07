import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const LiveStudio: React.FC = () => {
  // Kunci Fallback Dinamis Tahap 43.3: Mencegah kolom kosong saat pertama kali dimuat
  const currentIp = typeof window !== 'undefined' ? window.location.hostname : '192.168.0.120';
  
  const [liveData, setLiveData] = useState({
    isLive: false,
    rtmpUrl: `rtmp://${currentIp}:1935/live`,
    streamKey: 'stream_key_wiji_hub',
    title: 'Live Stream Wiji Prabowo',
    viewerCount: 0
  });
  const [showKey, setShowKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Polling Otomatis Status Live Setiap 3 Detik (Tahap 44.4)
  useEffect(() => {
    const checkLiveStatus = () => {
      axios.get('/api/live/status')
        .then(res => {
          if (res.data && typeof res.data.isLive !== 'undefined') {
            setLiveData(res.data);
          }
        })
        .catch(err => console.error("Error polling live status:", err));
    };

    checkLiveStatus(); // Panggil langsung saat mount
    const interval = setInterval(checkLiveStatus, 3000); // Polling berkala per 3 detik

    return () => clearInterval(interval);
  }, []);

  // Engine HLS.js Decoder untuk Browser Desktop Chrome/Edge (Tahap 44.4)
  useEffect(() => {
    if (liveData.isLive && videoRef.current) {
      const hlsUrl = `http://${window.location.hostname}:8005/live/${liveData.streamKey}/index.m3u8`;
      
      // Jika browser mendukung HLS secara native (Safari)
      if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = hlsUrl;
      } else {
        // Muat Hls.js secara dinamis untuk Chrome/Edge
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        script.onload = () => {
          if ((window as any).Hls && (window as any).Hls.isSupported()) {
            const hls = new (window as any).Hls({
              manifestLoadingTimeOut: 10000,
              manifestLoadingMaxRetry: 5,
            });
            hls.loadSource(hlsUrl);
            hls.attachMedia(videoRef.current);
          }
        };
        document.body.appendChild(script);
      }
    }
  }, [liveData.isLive, liveData.streamKey]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-6">
      {/* Header Halaman */}
      <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          📡 <span className="text-red-500 font-black">🔴</span> Ruang Kontrol Siaran Langsung
        </h1>
        <div className={`px-4 py-1.5 rounded-full font-bold text-sm uppercase ${liveData.isLive ? 'bg-red-600/20 text-red-500 border border-red-500/30 animate-pulse' : 'bg-neutral-800 text-neutral-400'}`}>
          {liveData.isLive ? `🔴 LIVE ON AIR • ${liveData.viewerCount} Penonton` : 'OFFLINE'}
        </div>
      </div>

      {/* Grid Konten Utama */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri & Tengah: Player Preview & Settings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Layar Preview HLS Live Player (Tahap 44.4) */}
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center">
            {liveData.isLive ? (
              <video 
                ref={videoRef}
                controls 
                autoPlay 
                muted 
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="text-center p-6">
                <p className="text-xl font-bold text-neutral-500 mb-2">Hubungkan encoder untuk memulai live streaming</p>
                <p className="text-sm text-neutral-400 max-w-md mx-auto">
                  Salin dan tempel kunci streaming serta URL RTMP di bawah ini ke aplikasi OBS Studio atau Streamlabs di HP Anda.
                </p>
              </div>
            )}
          </div>

          {/* Panel Setelan Streaming (YouTube-Style) */}
          <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700">
            <h3 className="text-lg font-bold mb-4 border-b border-neutral-700 pb-2">⚙️ Setelan Streaming</h3>
            
            <div className="space-y-4">
              {/* URL Streaming */}
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">URL STREAMING (RTMP SERVER)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={liveData.rtmpUrl} 
                    className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm flex-1 font-mono focus:outline-none"
                  />
                  <button 
                    onClick={() => handleCopy(liveData.rtmpUrl, 'url')}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    {copiedField === 'url' ? 'Tersalin!' : 'Salin'}
                  </button>
                </div>
              </div>

              {/* Kunci Streaming / Stream Key */}
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">KUNCI STREAMING (STREAM KEY)</label>
                <div className="flex gap-2">
                  <input 
                    type={showKey ? 'text' : 'password'} 
                    readOnly 
                    value={liveData.streamKey} 
                    className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm flex-1 font-mono focus:outline-none tracking-widest"
                  />
                  <button 
                    onClick={() => setShowKey(!showKey)}
                    className="bg-neutral-700 hover:bg-neutral-600 px-3 py-2 rounded text-sm transition-colors"
                  >
                    {showKey ? 'Sembunyikan' : 'Lihat'}
                  </button>
                  <button 
                    onClick={() => handleCopy(liveData.streamKey, 'key')}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    {copiedField === 'key' ? 'Tersalin!' : 'Salin'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Metadata & Informasi Siaran */}
        <div className="space-y-6">
          <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 h-full">
            <h3 className="text-lg font-bold mb-4 border-b border-neutral-700 pb-2">📋 Informasi Siaran</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">JUDUL UTAMA</label>
                <p className="text-base bg-neutral-900 p-3 rounded border border-neutral-700 font-medium">
                  {liveData.title}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">KATEGORI</label>
                <span className="inline-block bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full font-bold">
                  GAMING / ENTERTAINMENT
                </span>
              </div>

              <div className="pt-4 border-t border-neutral-700 text-xs text-neutral-400 space-y-2">
                <p>💡 **Tips OBS Setup:**</p>
                <p>1. Buka Settings -&gt; Stream di OBS Studio.</p>
                <p>2. Pilih Service: **Custom...**</p>
                <p>3. Masukkan Server URL dan Stream Key sesuai data di samping kanan.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LiveStudio;
