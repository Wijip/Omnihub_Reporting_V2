import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ResolutionSettings = () => {
  const [resolutions, setResolutions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    axios.get('/api/admin/config')
      .then(res => setResolutions(res.data.resolutions))
      .catch(err => console.error('Gagal mengambil config:', err));
  }, []);

  const handleToggle = async (key: string) => {
    const updated = { ...resolutions, [key]: !resolutions[key] };
    setResolutions(updated);
    try {
      await axios.post('/api/admin/config', { resolutions: updated });
    } catch (err) {
      console.error('Gagal menyimpan config', err);
    }
  };

  return (
    <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 mt-6">
      <h3 className="text-xl font-bold text-white mb-4">⚙️ Kontrol Resolusi Mesin NVENC</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(resolutions).map(([key, isActive]) => (
          <div key={key} className="flex items-center justify-between bg-neutral-900 p-3 rounded-lg border border-neutral-800">
            <span className="text-gray-300 font-medium">{key}</span>
            <button 
              onClick={() => handleToggle(key)}
              className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? 'bg-blue-600' : 'bg-gray-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ResolutionSettings;
