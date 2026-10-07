import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Plus, Trash2, Play, AlertCircle, Settings, FileVideo, CheckCircle2, ChevronRight, Info, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { useUpload } from '../contexts/UploadContext';
import { cn } from '../lib/utils';
import CameraRecorder from '../components/CameraRecorder';

export default function UploadPage() {
  const navigate = useNavigate();
  const { addTask } = useUpload();
  const [files, setFiles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Priority 2: Publish Lock State
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- TAHAP 65.0: STATE METADATA LAPORAN SISWA (PER-FILE ISOLATED) ---
  const [programsList, setProgramsList] = useState<any[]>([]);

  // Fetch daftar program dari database saat komponen dimuat
  useEffect(() => {
    api.get('/programs')
      .then(res => setProgramsList(res.data))
      .catch(err => console.error('[UPLOAD FORM 65.0] Gagal memuat daftar program:', err));
  }, []);

  useEffect(() => {
    // When component mounts, check for existing draft.
    // We only restore when processing new files.
    // We can't restore the file objects, but we can display a toast.
    const draftContent = localStorage.getItem('omnihub_upload_draft');
    if (draftContent && draftContent !== '[]') {
      try {
        const drafts = JSON.parse(draftContent);
        if (drafts && drafts.length > 0) {
          setToastMessage('Draf unggahan sebelumnya telah dipulihkan.');
          setTimeout(() => setToastMessage(null), 3000);
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    // Keep draft updated
    if (files.length > 0) {
      const drafts = files.map(f => ({
        title: f.title,
        description: f.description,
        visibility: f.visibility,
        categoryId: f.categoryId,
        allowDownload: f.allowDownload
      }));
      localStorage.setItem('omnihub_upload_draft', JSON.stringify(drafts));
    }
  }, [files]);

  // --- ENHANCED MULTI-FILE SELECTION HANDLER (STAGE 1.23 ZERO FREEZE) ---
  const handleFileSelect = (e: any) => {
    const selectedFiles = Array.from(e.target.files) as File[];
    if (selectedFiles.length === 0) return;

    const draftText = localStorage.getItem('omnihub_upload_draft');
    const drafts = draftText ? JSON.parse(draftText) : [];

    // Map synchronous object URLs to avoid blocking the main thread
    const newFiles = selectedFiles.map((file: File, index: number) => {
        const draft = drafts[index] || {};
        const localPreviewUrl = URL.createObjectURL(file);

        return {
          file: file,
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random()}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          description: draft.description || '',
          visibility: draft.visibility || 'public',
          categoryId: draft.categoryId || '1',
          allowDownload: draft.allowDownload !== undefined ? draft.allowDownload : true,
          sizeFormatted: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
          localPreviewUrl: localPreviewUrl,
          thumbnailUrl: '', // Base64 thumbnail generation removed for performance
          studentName: '',
          programId: '',
          meetingNumber: '',
          sessionDate: new Date().toISOString().split('T')[0]
        };
      });

    setFiles((prev: any[]) => [...prev, ...newFiles]);
  };

  const handleRecordingComplete = (file: File) => {
    const newFile = {
      file: file,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random()}`,
      title: file.name,
      description: '',
      visibility: 'public',
      categoryId: '1',
      allowDownload: true,
      studentName: '',
      programId: '',
      meetingNumber: '',
      sessionDate: new Date().toISOString().split('T')[0]
    };
    setFiles(prev => [...prev, newFile]);
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const updateFileData = (id: string, data: any) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== id) return f;
      const updated = { ...f, ...data };

      // Auto-fetch rekomendasi pertemuan khusus untuk kartu video ini jika metadata berubah
      if (data.studentName !== undefined || data.programId !== undefined || data.sessionDate !== undefined) {
        const sName = (updated.studentName || '').trim();
        const pId = updated.programId;
        const sDate = updated.sessionDate;

        if (sName && pId) {
          api.post('/students/next-meeting', {
            studentName: sName,
            programId: parseInt(pId.toString(), 10),
            sessionDate: sDate
          })
          .then(res => {
            if (res.data && res.data.recommendedMeeting) {
              setFiles(curr => curr.map(item => item.id === id ? { ...item, meetingNumber: res.data.recommendedMeeting } : item));
            }
          })
          .catch(err => console.error('[UPLOAD FORM] Gagal fetch rekomendasi pertemuan:', err));
        }
      }
      return updated;
    }));
  };

// --- REALTIME ACCUMULATIVE CHUNK UPLOADER (TAHAP 54.8) ---
const uploadFileInChunks = async (file: File, taskId: string, videoId: string) => {
  const CHUNK_SIZE = 5 * 1024 * 1024; // Chunk 5MB
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let totalUploadedBytes = 0;

  for (let index = 0; index < totalChunks; index++) {
    const start = index * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('uploadId', taskId);
    formData.append('videoId', String(videoId));
    formData.append('chunkIndex', index.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('fileName', file.name);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload/chunk', true);
      const token = localStorage.getItem('token');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      // Hitung persentase kumulatif byte secara real-time
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const currentChunkLoaded = e.loaded;
          const currentTotalLoaded = totalUploadedBytes + currentChunkLoaded;
          const overallProgress = Math.min(99, Math.round((currentTotalLoaded / file.size) * 100));

          // Sync langsung ke localStorage & trigger State update
          updateTaskProgress(taskId, { uploadProgress: overallProgress, status: 'uploading' });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          totalUploadedBytes += (end - start);
          resolve();
        } else {
          reject(new Error(`Chunk ${index} failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error(`Network error on chunk ${index}`));
      xhr.send(formData);
    });
  }

  // Upload Selesai 100% -> Pindah ke Fase Processing
  updateTaskProgress(taskId, { uploadProgress: 100, status: 'processing' });
};

// Helper Update Task
const updateTaskProgress = (taskId: string, patch: Partial<any>) => {
  const rawTasks = localStorage.getItem('active_upload_tasks');
  if (!rawTasks) return;
  try {
    const tasks = JSON.parse(rawTasks);
    const updated = tasks.map((t: any) => t.id === taskId ? { ...t, ...patch } : t);
    localStorage.setItem('active_upload_tasks', JSON.stringify(updated));
    
    // Broadcast Custom Event agar Studio.tsx merefresh UI secara instan
    window.dispatchEvent(new Event('upload_task_updated'));
  } catch (e) {
    console.error("Error updating task progress:", e);
  }
};

  const startBackgroundUpload = async (fileObj: any, uploadId: string) => {
    try {
      const token = localStorage.getItem('token');
      // Create draft record to get videoId
      const draftResponse = await fetch('/api/videos/draft', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: fileObj.title?.trim() || fileObj.studentName?.trim() || fileObj.file.name || 'Laporan Pembelajaran',
          description: fileObj.description || '',
          visibility: fileObj.visibility || 'public',
          categoryId: fileObj.categoryId || '1',
          allowDownload: fileObj.allowDownload,
          student_name: (fileObj.studentName || '').trim(),
          program_id: (fileObj.programId || '').toString(),
          meeting_number: (fileObj.meetingNumber || '').toString(),
          session_date: fileObj.sessionDate || new Date().toISOString().split('T')[0],
          uploadId: uploadId
        })
      });
      
      const draftData = await draftResponse.json();
      const videoId = draftData.id;
      
      // Start REALTIME accumulative chunk upload
      await uploadFileInChunks(fileObj.file, uploadId, videoId);
    } catch (err) {
      console.error('Background upload failed:', err);
    }
  };

  const handlePublish = async () => {
    if (files.length === 0 || isPublishing) return;
    setIsPublishing(true);
    
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to upload.');
      setIsPublishing(false);
      return;
    }

    try {
      // --- BATCH MULTI-FILE UPLOAD QUEUE SYSTEM (TAHAP 52) ---
      const newTasks = files.map((fileObj, idx) => ({
        id: `up_${Date.now()}_${idx}`,
        fileRef: fileObj,
        title: fileObj.title || fileObj.file.name,
        fileName: fileObj.file.name,
        fileSize: fileObj.file.size,
        uploadProgress: 0,
        encodingProgress: 0,
        status: idx < 2 ? 'uploading' : 'queued'
      }));

      const existingTasks = JSON.parse(localStorage.getItem('active_upload_tasks') || '[]');
      const combinedTasks = [...existingTasks, ...newTasks.map(({ fileRef, ...meta }) => meta)];
      localStorage.setItem('active_upload_tasks', JSON.stringify(combinedTasks));

      const startQueueWorker = async (tasks: any[]) => {
        let active = 0;
        let index = 0;

        const processNext = async () => {
          if (index >= tasks.length) return;
          const task = tasks[index++];
          active++;
          
          try {
            const allTasks = JSON.parse(localStorage.getItem('active_upload_tasks') || '[]');
            const tIdx = allTasks.findIndex((t: any) => t.id === task.id);
            if (tIdx > -1) {
               allTasks[tIdx].status = 'uploading';
               localStorage.setItem('active_upload_tasks', JSON.stringify(allTasks));
            }
            await startBackgroundUpload(task.fileRef, task.id);
          } catch(e) {
            console.error('Queue failed for', task.id);
          } finally {
            active--;
            processNext();
          }
        };

        const maxConcurrency = 2;
        for (let i = 0; i < maxConcurrency && i < tasks.length; i++) {
           processNext();
        }
      };

      startQueueWorker(newTasks);

      localStorage.removeItem('omnihub_upload_draft');
      setFiles([]);
      
      // INSTANT REDIRECT TANPA LAG (Tahap 52)
      navigate('/studio');
    } catch (e) {
      setError('An error occurred while starting upload.');
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-16 pb-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 md:mb-16">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 text-[10px] font-black uppercase tracking-widest">
            <Upload size={14} /> Content Studio
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-neutral-900 dark:text-white font-display leading-tight">
            Upload Your <span className="text-brand-600">Masterpiece</span>
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium max-w-md">
            Share your stories with millions. High-quality encoding, global delivery, and beautiful presentation.
          </p>
        </div>
        
        {files.length > 0 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-3 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border-2 border-neutral-100 dark:border-neutral-800 px-8 py-4 rounded-2xl font-black hover:border-brand-600 transition-all shadow-xl shadow-black/5 w-full md:w-auto active:scale-95 text-xs uppercase tracking-widest"
          >
            <Plus size={20} className="text-brand-600" /> Add More
          </button>
        )}
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept=".mp4,.mov,.ts,.mpeg,video/mp4,video/quicktime,video/mp2t,video/mpeg"
          className="hidden"
        />
      </div>

      <CameraRecorder onRecordingComplete={handleRecordingComplete} />

      {files.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => fileInputRef.current?.click()}
          className="relative group cursor-pointer"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-600 to-brand-400 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-[3rem] p-12 md:p-24 text-center bg-white dark:bg-neutral-900/50 backdrop-blur-xl hover:border-brand-600 transition-all duration-500">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-brand-50 dark:bg-brand-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-all duration-700 shadow-2xl shadow-brand-500/10">
              <FileVideo size={48} className="text-brand-600" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black mb-4 text-neutral-900 dark:text-white font-display">Drop your videos here</h2>
            <p className="text-neutral-500 dark:text-neutral-400 font-medium max-w-xs mx-auto mb-12">
              Drag and drop video files or click to browse your computer
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-8 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">
              <span className="flex items-center gap-3"><CheckCircle2 size={16} className="text-brand-600" /> 4K Support</span>
              <span className="flex items-center gap-3"><CheckCircle2 size={16} className="text-brand-600" /> NVENC Encoding</span>
              <span className="flex items-center gap-3"><CheckCircle2 size={16} className="text-brand-600" /> Multi-Format</span>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-10">
          <AnimatePresence mode="popLayout">
            {files.map((fileObj, idx) => (
              <motion.div
                key={fileObj.id || `${fileObj.file.name}_${idx}`}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass rounded-[3rem] p-6 md:p-10 border border-neutral-100 dark:border-neutral-800 shadow-2xl shadow-black/5"
              >
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-4 space-y-6">
                    {/* --- LOCAL VIDEO CARD PREVIEW (STAGE 1.23 ZERO FREEZE) --- */}
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center group shadow-inner">
                        <video 
                          src={fileObj.localPreviewUrl} 
                          className="w-full h-full object-contain bg-black rounded-2xl"
                          muted 
                          playsInline 
                          preload="metadata"
                          onLoadedMetadata={(e) => {
                            (e.target as HTMLVideoElement).currentTime = 1.0;
                          }}
                        />

                      {/* Badge Indikator Preview */}
                      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>🎬 PREVIEW</span>
                      </div>

                      <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-[10px] font-mono font-bold text-neutral-300">
                        {fileObj.sizeFormatted || `${(fileObj.file.size / (1024 * 1024)).toFixed(1)} MB`}
                      </div>
                    </div>
                    
                    <div className="p-5 bg-brand-50 dark:bg-brand-500/5 rounded-2xl border border-brand-100 dark:border-brand-500/10">
                      <div className="flex items-center gap-3 text-brand-600 mb-2">
                        <Info size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Encoding Tip</span>
                      </div>
                      <p className="text-[11px] text-brand-700 dark:text-brand-400 font-bold leading-relaxed">
                        Your video will be encoded into multiple resolutions using NVENC GPU acceleration for maximum quality and compatibility.
                      </p>
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-8">
                    {/* --- TAHAP 65.0: FORM METADATA LAPORAN SISWA --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-3xl border border-neutral-100 dark:border-neutral-800 mb-6">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                          Nama Siswa <span className="text-brand-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Nama Siswa"
                          value={fileObj.studentName || ''}
                          onChange={(e) => updateFileData(fileObj.id, { studentName: e.target.value })}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:border-brand-600 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                          Program Pembelajaran <span className="text-brand-500">*</span>
                        </label>
                        {/* TAHAP 72.0: FIX DROPDOWN DARK MODE VISIBILITY */}
                        <select
                          required
                          value={fileObj.programId || ''}
                          onChange={(e) => updateFileData(fileObj.id, { programId: e.target.value })}
                          className="w-full bg-zinc-900 text-white border border-zinc-700/80 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:border-brand-600 transition-all appearance-none cursor-pointer"
                          style={{ colorScheme: 'dark' }}
                        >
                          <option value="" className="bg-zinc-900 text-white hover:bg-zinc-800">-- Pilih Program --</option>
                          {programsList.map((prog) => (
                            <option key={prog.id} value={prog.id} className="bg-zinc-900 text-white hover:bg-zinc-800 py-2">
                              {prog.program_name} ({prog.type === 'reset_monthly' ? 'Bulanan' : 'Kontinu'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                          Pertemuan Ke- <span className="text-neutral-400 font-normal">(Auto-Calculated)</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={fileObj.meetingNumber || ''}
                          onChange={(e) => updateFileData(fileObj.id, { meetingNumber: parseInt(e.target.value, 10) || '' })}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:border-brand-600 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                          Tanggal Sesi <span className="text-neutral-400 font-normal">(Opsional)</span>
                        </label>
                        <input
                          type="date"
                          value={fileObj.sessionDate || new Date().toISOString().split('T')[0]}
                          onChange={(e) => updateFileData(fileObj.id, { sessionDate: e.target.value })}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:border-brand-600 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Judul Video (Opsional)</label>
                        <input
                          type="text"
                          value={fileObj.title}
                          onChange={(e) => updateFileData(fileObj.id, { title: e.target.value })}
                          placeholder="What's the story?"
                          className="text-2xl md:text-3xl font-black w-full focus:outline-none bg-transparent border-b-2 border-neutral-100 dark:border-neutral-800 focus:border-brand-600 transition-all py-2 font-display text-neutral-900 dark:text-white"
                        />
                      </div>
                      <button
                        onClick={() => removeFile(fileObj.id)}
                        className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-2xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all shrink-0 active:scale-90 shadow-sm"
                      >
                        <Trash2 size={22} />
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Description</label>
                      <textarea
                        value={fileObj.description}
                        onChange={(e) => updateFileData(fileObj.id, { description: e.target.value })}
                        placeholder="Tell your audience about this video..."
                        className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-[2rem] p-6 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white dark:focus:bg-neutral-900 focus:border-brand-200 dark:focus:border-brand-900 transition-all min-h-[150px] resize-none text-neutral-700 dark:text-neutral-300"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Visibility</label>
                        <select
                          value={fileObj.visibility}
                          onChange={(e) => updateFileData(fileObj.id, { visibility: e.target.value })}
                          className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-brand-500/5 focus:border-brand-200 dark:focus:border-brand-900 transition-all appearance-none cursor-pointer text-neutral-700 dark:text-neutral-300"
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                          <option value="unlisted">Unlisted</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Category</label>
                        <select
                          value={fileObj.categoryId}
                          onChange={(e) => updateFileData(fileObj.id, { categoryId: e.target.value })}
                          className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-brand-500/5 focus:border-brand-200 dark:focus:border-brand-900 transition-all appearance-none cursor-pointer text-neutral-700 dark:text-neutral-300"
                        >
                          <option value="1">Entertainment</option>
                          <option value="2">Education</option>
                          <option value="3">Gaming</option>
                          <option value="4">Music</option>
                          <option value="5">Technology</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Permissions</label>
                        <label className="flex items-center gap-4 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 px-5 py-4 rounded-2xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all group/check">
                          <div className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                            fileObj.allowDownload 
                              ? "bg-brand-600 border-brand-600 text-white" 
                              : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                          )}>
                            {fileObj.allowDownload && <CheckCircle2 size={16} />}
                          </div>
                          <input
                            type="checkbox"
                            checked={fileObj.allowDownload}
                            onChange={(e) => updateFileData(fileObj.id, { allowDownload: e.target.checked })}
                            className="hidden"
                          />
                          <span className="text-xs font-black uppercase tracking-widest text-neutral-700 dark:text-neutral-300">Allow Download</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="flex flex-col md:flex-row items-center justify-end gap-6 pt-12 md:pt-20 border-t border-neutral-100 dark:border-neutral-800">
            <button
              onClick={() => navigate('/studio')}
              className="w-full md:w-auto px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all order-2 md:order-1 active:scale-95"
            >
              Discard Changes
            </button>
            <button
              onClick={handlePublish}
              disabled={files.length === 0 || isPublishing}
              className="w-full md:w-auto bg-brand-600 text-white px-20 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl shadow-brand-500/30 hover:bg-brand-700 hover:scale-[1.02] active:scale-95 order-1 md:order-2 flex items-center justify-center gap-3"
            >
              {isPublishing ? 'Publishing...' : 'Publish Content'} <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed bottom-10 right-10 p-6 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 rounded-3xl flex items-center gap-4 font-bold shadow-2xl z-50"
        >
          <AlertCircle size={24} /> {error}
          <button onClick={() => setError(null)} className="ml-4 p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </motion.div>
      )}

      {toastMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 p-4 bg-brand-600 text-white rounded-2xl flex items-center gap-3 font-bold shadow-2xl z-50 text-sm"
        >
          <CheckCircle2 size={20} /> {toastMessage}
        </motion.div>
      )}
    </div>
  );
}
