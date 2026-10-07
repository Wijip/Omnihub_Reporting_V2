import React, { useState, useRef } from 'react';

interface CameraRecorderProps {
  onRecordingComplete: (file: File) => void;
}

const CameraRecorder: React.FC<CameraRecorderProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user'); // 'user' = depan, 'environment' = belakang
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Hotfix Tahap 40.1: Mengikat stream secara aman setelah elemen <video> lahir di DOM
  React.useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Efek otomatis: Restart kamera jika user mengubah pengaturan saat kamera menyala (dan tidak sedang merekam)
  React.useEffect(() => {
    if (stream && !isRecording) {
      stopCamera();
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, resolution]);

  const startCamera = async () => {
    try {
      // Konfigurasi batasan resolusi dan arah kamera sesuai input user
      const videoConstraints = {
        facingMode: facingMode,
        width: resolution === '1080p' ? { ideal: 1920 } : { ideal: 1280 },
        height: resolution === '1080p' ? { ideal: 1080 } : { ideal: 720 }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: videoConstraints, 
        audio: true 
      });
      setStream(mediaStream);
    } catch (err) {
      console.error("Gagal mengakses kamera/mikrofon dengan opsi ini:", err);
      alert("Gagal memuat kamera. Perangkat mungkin tidak mendukung resolusi atau mode kamera ini.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    // Booster Bitrate (Tahap 40.3): Mengunci kualitas video agar tidak pecah/kabur sebelum dikirim
    const targetBitrate = resolution === '1080p' ? 8000000 : 4000000; // 8 Mbps atau 4 Mbps
    
    const mediaRecorder = new MediaRecorder(stream, { 
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: targetBitrate
    });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
      const file = new File([blob], `Camera_Record_${Date.now()}.mp4`, { type: 'video/mp4' });
      onRecordingComplete(file);
      stopCamera();
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 mb-6">
      <h3 className="text-xl font-bold text-white mb-4">📹 Perekam Kamera Studio Langsung</h3>
      
      {!stream ? (
        <button 
          onClick={startCamera}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
        >
          Aktifkan Kamera Device
        </button>
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-md bg-black rounded-lg overflow-hidden border border-neutral-600">
            {/* Fix Tahap 40.4: Mengunci efek cermin hanya untuk kamera depan secara inline absolute style */}
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }}
              className="w-full h-full object-contain bg-black" 
            />
            {isRecording && (
              <div className="absolute top-3 left-3 flex items-center space-x-2 bg-red-600/80 px-3 py-1 rounded-full text-xs text-white font-bold animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                <span>REC</span>
              </div>
            )}
          </div>
          {/* Menu Pengaturan Kamera (Tahap 40.2) - Terkunci saat merekam */}
          <div className="flex flex-wrap gap-4 bg-neutral-900 p-3 rounded-lg border border-neutral-700 max-w-md">
            <div className="flex flex-col flex-1 min-w-[120px]">
              <label className="text-xs text-gray-400 font-bold mb-1">PILIH KAMERA</label>
              <select 
                disabled={isRecording}
                value={facingMode} 
                onChange={(e) => setFacingMode(e.target.value as any)}
                className="bg-neutral-800 border border-neutral-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="user">📷 Kamera Depan (Selfie)</option>
                <option value="environment">🌍 Kamera Belakang</option>
              </select>
            </div>
            
            <div className="flex flex-col flex-1 min-w-[120px]">
              <label className="text-xs text-gray-400 font-bold mb-1">RESOLUSI</label>
              <select 
                disabled={isRecording}
                value={resolution} 
                onChange={(e) => setResolution(e.target.value as any)}
                className="bg-neutral-800 border border-neutral-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="720p">HD (720p)</option>
                <option value="1080p">Full HD (1080p)</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-3">
            {!isRecording ? (
              <button 
                onClick={startRecording}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
              >
                Mulai Rekam
              </button>
            ) : (
              <button 
                onClick={stopRecording}
                className="bg-neutral-600 hover:bg-neutral-500 text-white px-5 py-2 rounded-lg font-medium transition-colors"
              >
                Berhenti & Simpan Ke Antrean
              </button>
            )}
            <button 
              onClick={stopCamera}
              className="bg-transparent text-gray-400 hover:text-white px-4 py-2 transition-colors"
            >
              Matikan Kamera
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraRecorder;
