import React, { useMemo, useState } from 'react';
import { ElementData } from '../types';

interface SidebarProps {
  inventory: ElementData[];
  onAddToBoard: (element: ElementData) => void;
  onClearBoard: () => void;
  onResetGame: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ inventory, onAddToBoard, onClearBoard, onResetGame }) => {
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<'time' | 'alpha'>('time'); // Default to 'time'

  const filteredInventory = useMemo(() => {
    // 1. Filter by search
    const result = inventory.filter(item => 
      item.text.toLowerCase().includes(search.toLowerCase())
    );

    // 2. Sort based on mode
    if (sortMode === 'alpha') {
        return result.sort((a, b) => a.text.localeCompare(b.text));
    }
    
    // 'time' mode: Uses the natural order of the array (discovery order)
    return result;
  }, [inventory, search, sortMode]);

  return (
    <div className="fixed right-0 top-0 bottom-0 w-64 md:w-80 bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl z-40">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-900 z-10">
        <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-white">Library</h2>
            <button
                onClick={() => setSortMode(prev => prev === 'time' ? 'alpha' : 'time')}
                className="text-xs font-medium px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 transition-all flex items-center gap-1"
                title={sortMode === 'time' ? "Sorted by Discovery Time" : "Sorted Alphabetically"}
            >
                {sortMode === 'time' ? <span>🕒 Time</span> : <span>🔤 A-Z</span>}
            </button>
        </div>

        <p className="text-xs text-slate-400 mb-3">{inventory.length} concepts discovered</p>
        
        <input 
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <div className="grid grid-cols-2 gap-2">
          {filteredInventory.map((item) => (
            <button
              key={item.id}
              onClick={() => onAddToBoard(item)}
              className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all active:scale-95"
            >
              <span className="text-2xl mb-1">{item.emoji}</span>
              <span className="text-xs text-center text-slate-200 line-clamp-2 leading-tight">
                {item.text}
              </span>
            </button>
          ))}
        </div>
        {filteredInventory.length === 0 && (
          <div className="text-center text-slate-500 mt-10">
            No matches found.
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-4 border-t border-slate-700 bg-slate-900 flex gap-2">
         <button 
          onClick={onClearBoard}
          className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-600 transition-colors"
        >
          Clear Board
        </button>
        <button 
          onClick={onResetGame}
          className="flex-1 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 text-xs rounded border border-red-900/50 transition-colors"
        >
          New Topic
        </button>
      </div>
    </div>
  );
};

export default Sidebar;