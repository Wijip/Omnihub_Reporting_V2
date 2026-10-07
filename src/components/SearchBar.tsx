// --- YOUTUBE-STYLE SEARCH BAR COMPONENT (TAHAP 55) ---
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, X, Trash2, ArrowRight } from 'lucide-react';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('search_history') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 1. Debounce Autocomplete Polling (200ms)
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (e) {
        console.error("Failed to fetch suggestions:", e);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // 2. Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Eksekusi Pencarian & Simpan History
  const handleSearch = (searchTerm: string) => {
    const cleanTerm = searchTerm.trim();
    if (!cleanTerm) return;

    // Simpan ke history local (max 10 item)
    const updatedHistory = [cleanTerm, ...history.filter((h) => h !== cleanTerm)].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem('search_history', JSON.stringify(updatedHistory));

    setQuery(cleanTerm);
    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(cleanTerm)}`);
  };

  const removeHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const updated = history.filter((h) => h !== item);
    setHistory(updated);
    localStorage.setItem('search_history', JSON.stringify(updated));
  };

  // 4. Keyboard Navigation (Arrow keys & Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const displayList = query.trim() ? suggestions : history;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < displayList.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : displayList.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && displayList[selectedIndex]) {
        handleSearch(displayList[selectedIndex]);
      } else {
        handleSearch(query);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-xl mx-auto hidden sm:block">
      {/* Input Box Bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}
        className="relative flex items-center"
      >
        <div className="relative w-full">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Cari video di OmniHub..."
            className="w-full bg-neutral-800/50 border border-white/10 focus:border-brand-500 text-white text-sm rounded-full py-2.5 pl-11 pr-10 focus:outline-none transition-colors shadow-inner"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />

          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setSuggestions([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="submit"
          className="ml-2 bg-neutral-800 hover:bg-neutral-700 text-white p-2.5 rounded-full transition-colors border border-white/10"
          title="Cari"
        >
          <Search size={16} />
        </button>
      </form>

      {/* Dropdown Suggestions / History Panel */}
      {isOpen && (query.trim() ? suggestions.length > 0 : history.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-50 py-2">
          {!query.trim() && (
            <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-neutral-500">
              Riwayat Pencarian
            </div>
          )}

          {/* List Item Suggestions or History */}
          {(query.trim() ? suggestions : history).map((item, index) => {
            const isSelected = index === selectedIndex;
            const isHistoryItem = !query.trim();

            return (
              <div
                key={index}
                onClick={() => handleSearch(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`px-4 py-2.5 flex items-center justify-between cursor-pointer text-sm transition-colors ${
                  isSelected ? 'bg-brand-600/20 text-brand-400 font-bold' : 'text-neutral-200 hover:bg-neutral-800/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate pr-2">
                  {isHistoryItem ? (
                    <Clock size={15} className="text-neutral-500 shrink-0" />
                  ) : (
                    <Search size={15} className="text-neutral-400 shrink-0" />
                  )}
                  <span className="truncate">{item}</span>
                </div>

                {isHistoryItem && (
                  <button
                    onClick={(e) => removeHistoryItem(e, item)}
                    title="Hapus dari riwayat"
                    className="text-neutral-500 hover:text-red-400 p-1 rounded transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}