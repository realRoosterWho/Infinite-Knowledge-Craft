import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ElementData } from '../types';

interface RecipeBookProps {
  inventory: ElementData[];
  onClose: () => void;
}

// Helper to build a tree structure
interface TreeNode {
  name: string;
  emoji: string;
  children: TreeNode[];
  id: string;
}

const RecipeBook: React.FC<RecipeBookProps> = ({ inventory, onClose }) => {
  const [selectedItem, setSelectedItem] = useState<ElementData | null>(null);
  
  // Canvas Transform State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Map for quick lookup
  const inventoryMap = useMemo(() => {
    return new Map(inventory.map(i => [i.text, i]));
  }, [inventory]);

  // Build Tree
  const buildTree = (itemName: string, depth = 0): TreeNode | null => {
    const item = inventoryMap.get(itemName);
    if (!item) return null;
    // Limit depth to prevent infinite loops/crashes in circular dependencies
    if (depth > 12) return { name: item.text, emoji: item.emoji, children: [], id: item.id };

    const node: TreeNode = {
      name: item.text,
      emoji: item.emoji,
      children: [],
      id: item.id + Math.random().toString(36).substr(2, 5)
    };

    if (item.parents) {
      const parent1 = buildTree(item.parents[0], depth + 1);
      const parent2 = buildTree(item.parents[1], depth + 1);
      if (parent1) node.children.push(parent1);
      if (parent2) node.children.push(parent2);
    }
    return node;
  };

  const treeData = useMemo(() => {
    if (!selectedItem) return null;
    return buildTree(selectedItem.text);
  }, [selectedItem, inventoryMap]);

  // --- Canvas Interaction Logic ---

  // Center the view whenever a new item is selected
  useEffect(() => {
    if (selectedItem && containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      // Center horizontally, and place slightly down from top
      setTransform({
        x: clientWidth / 2, 
        y: 100, 
        scale: 1 
      });
    }
  }, [selectedItem]);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const scaleSensitivity = 0.001;
    const delta = -e.deltaY * scaleSensitivity;
    const newScale = Math.min(Math.max(0.2, transform.scale + delta), 3);

    // Zoom towards mouse pointer logic
    // We need to adjust x/y so the point under the mouse stays stationary
    // Simplified for now: Zooming keeps the center roughly stable or just zooms in place
    // For true "zoom to cursor", we need bounding client rect math. 
    // Let's stick to simple center zoom relative to current viewport for stability, 
    // or just direct scale modification which scales from transform-origin (center).
    
    setTransform(prev => ({
      ...prev,
      scale: newScale
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    e.preventDefault();
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStartRef.current!.x,
      y: e.clientY - dragStartRef.current!.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Zoom Controls
  const adjustZoom = (delta: number) => {
    setTransform(prev => ({ ...prev, scale: Math.min(Math.max(0.2, prev.scale + delta), 3) }));
  };

  const resetView = () => {
    if (containerRef.current) {
       setTransform({
        x: containerRef.current.clientWidth / 2, 
        y: 100, 
        scale: 1 
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-2 md:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-slate-700 w-full h-full rounded-2xl shadow-2xl flex overflow-hidden relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors border border-slate-600 shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        {/* Sidebar List */}
        <div className="w-64 md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-40 shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900">
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Recipe Map
            </h2>
            <p className="text-xs text-slate-400 mt-1">Select an item to trace its origin</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            <div className="grid grid-cols-1 gap-1">
              {inventory.slice().reverse().map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all text-sm
                    ${selectedItem?.text === item.text 
                      ? 'bg-blue-600/20 border border-blue-500/50 text-white' 
                      : 'hover:bg-slate-800 border border-transparent text-slate-400 hover:text-slate-200'}
                  `}
                >
                  <span className="text-xl w-8 text-center">{item.emoji}</span>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-bold truncate">{item.text}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                        {item.parents ? 'Crafted' : 'Base Element'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Infinite Canvas Area */}
        <div 
            ref={containerRef}
            className="flex-1 relative overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Dynamic Grid Background */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)',
                    backgroundSize: `${24 * transform.scale}px ${24 * transform.scale}px`,
                    backgroundPosition: `${transform.x}px ${transform.y}px`
                }}
            />

            {/* Canvas Controls */}
            <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-2">
                <button onClick={() => adjustZoom(0.2)} className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg shadow-lg border border-slate-700 font-bold">+</button>
                <button onClick={resetView} className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg shadow-lg border border-slate-700 text-xs font-bold">Fit</button>
                <button onClick={() => adjustZoom(-0.2)} className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg shadow-lg border border-slate-700 font-bold">-</button>
            </div>

            {/* Content Layer */}
            <div 
                className="absolute origin-top-left transition-transform duration-75 ease-out will-change-transform"
                style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`
                }}
            >
                {/* We render the tree relative to this 0,0 point. 
                    The tree itself needs to be centered relative to the 'x' point.
                    Since TreeRenderer builds downwards, we center horizontal. */}
                <div className="-translate-x-1/2"> 
                    {!selectedItem ? (
                        <div className="text-center text-slate-600 mt-20 select-none">
                            <span className="text-6xl block mb-4 opacity-10">🗺️</span>
                            <p className="text-lg font-medium">Select an item to view the map</p>
                        </div>
                    ) : (
                        <TreeRenderer node={treeData} />
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// Recursive Tree Node Component
const TreeRenderer: React.FC<{ node: TreeNode | null }> = ({ node }) => {
  if (!node) return null;

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div className="
        flex flex-col items-center justify-center 
        w-20 h-20 bg-slate-900 border-2 border-slate-700 
        rounded-2xl shadow-2xl z-10 relative
        hover:border-blue-400 hover:shadow-blue-500/30 transition-all
        group select-none
      ">
        <span className="text-3xl mb-1 filter drop-shadow-md group-hover:scale-110 transition-transform">{node.emoji}</span>
        <span className="text-[10px] font-bold text-center px-1 leading-tight text-slate-300 group-hover:text-white max-w-full truncate">
          {node.name}
        </span>
        
        {/* Output Connection Dot (Bottom) */}
        {/* Only show if it's not the root... wait, visualization is parents-down. 
            So this node is made FROM its children below it visually.
            Actually, the standard view here is: Target (Top) -> Ingredients (Bottom).
        */}
      </div>

      {/* Children (Ingredients) */}
      {node.children.length > 0 && (
        <>
          <div className="h-8 w-0.5 bg-slate-600"></div>
          
          {/* Branch Connector */}
          {node.children.length > 1 && (
             <div className="w-[50%] h-4 border-t-2 border-l-2 border-r-2 border-slate-600 rounded-t-lg"></div>
          )}

          <div className="flex gap-6 items-start">
            {node.children.map((child) => (
              <TreeRenderer key={child.id} node={child} />
            ))}
          </div>
        </>
      )}
      
      {node.children.length === 0 && (
         <div className="mt-2 flex flex-col items-center opacity-50">
             <div className="w-1 h-2 bg-emerald-500/50"></div>
             <div className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-900">Base</div>
         </div>
      )}
    </div>
  );
};

export default RecipeBook;