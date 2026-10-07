import { useState } from 'react';
import { RefreshCw, UserCheck, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';

export function AdminControlPanel({ onRefresh }: { onRefresh?: () => void }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState<any>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<number[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Helper Ambil Token Auth
  const getAuthHeader = () => {
    const token = localStorage.getItem('omnihub_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Fetch daftar user
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users-list', { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (e) {
      console.error("Gagal memuat daftar user:", e);
    }
  };

  // Trigger Rebuild Storage
  const handleRebuildDatabase = async () => {
    if (!window.confirm("Jalankan pindaian drive dan rekonstruksi database dari file fisik?")) return;

    setIsScanning(true);
    setScanSummary(null);
    try {
      const token = localStorage.getItem('omnihub_token') || localStorage.getItem('token');
      const res = await fetch('/api/admin/rebuild-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setScanSummary(data.summary);
        if (typeof onRefresh === 'function') onRefresh();
      } else {
        alert(data.error || `Gagal merekonstruksi database (HTTP ${res.status})`);
      }
    } catch (err) {
      console.error("Rebuild error:", err);
      alert("Terjadi kesalahan koneksi jaringan ke server.");
    } finally {
      setIsScanning(false);
    }
  };

  // Trigger Bulk Ownership Transfer
  const handleTransferOwnership = async () => {
    if (!targetUserId || selectedVideoIds.length === 0) return;

    setIsTransferring(true);
    try {
      const res = await fetch('/api/admin/transfer-ownership', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          videoIds: selectedVideoIds,
          targetUserId: parseInt(targetUserId, 10)
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        setSelectedVideoIds([]);
        setShowTransferModal(false);
        if (typeof onRefresh === 'function') onRefresh();
      } else {
        alert("Gagal memindahkan kepemilikan video.");
      }
    } catch (err) {
      console.error("Transfer error:", err);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl mb-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white font-display">Pusat Kendali Aset Admin</h2>
            <p className="text-xs text-neutral-400">Pemulihan otomatis drive dan alih kepemilikan video</p>
          </div>
        </div>

        <button
          onClick={handleRebuildDatabase}
          disabled={isScanning}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
        >
          {isScanning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          <span>{isScanning ? 'Memindai Drive...' : '🔍 Scan & Rebuild Storage'}</span>
        </button>
      </div>

      {scanSummary && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-emerald-400 text-xs font-bold">
            <CheckCircle2 size={18} />
            <span>
              Rekonstruksi Selesai! Total Dipindai: {scanSummary.scannedCount} | Berhasil Dipulihkan: {scanSummary.insertedCount} | Dilewati (Sudah Ada): {scanSummary.skippedCount}
            </span>
          </div>
          <button onClick={() => setScanSummary(null)} className="text-xs text-neutral-400 hover:text-white">
            Tutup
          </button>
        </div>
      )}

      {selectedVideoIds.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl flex items-center justify-between gap-4">
          <span className="text-xs font-bold text-blue-400">
            {selectedVideoIds.length} video dipilih untuk dipindahkan.
          </span>
          <button
            onClick={() => { fetchUsers(); setShowTransferModal(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2"
          >
            <UserCheck size={16} />
            <span>Pindahkan Kepemilikan</span>
          </button>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md p-6 rounded-3xl space-y-6 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white font-display">Pindahkan Kepemilikan Video</h3>
              <p className="text-xs text-neutral-400">Pilih pengguna target untuk menerima video terpilih.</p>
            </div>

            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white text-xs rounded-xl p-3 focus:outline-none"
            >
              <option value="">-- Pilih User Tujuan --</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.email})
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setShowTransferModal(false)} className="px-4 py-2 text-xs text-neutral-400">
                Batal
              </button>
              <button
                onClick={handleTransferOwnership}
                disabled={!targetUserId || isTransferring}
                className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {isTransferring ? 'Memindahkan...' : 'Eksekusi Pindah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
