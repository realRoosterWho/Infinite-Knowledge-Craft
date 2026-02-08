import React, { useState } from 'react';
import { ShopItem, ShopItemId, DecorationCategory } from '../types';

interface ShopModalProps {
  onClose: () => void;
  unlockedItems: Set<ShopItemId>;
  activeItems: Set<ShopItemId>;
  onBuy: (id: ShopItemId, cost: number) => void;
  onToggle: (id: ShopItemId) => void;
  
  // Game State for Pricing & Logic
  currentScore: number;
  nextDecorationCost: number;
  
  // Upgrade Props
  maxCombo: number;
  onUpgradeCombo: (cost: number) => void;
  nextComboCost: number;

  // Pet Props
  petCount: number;
  onSummonPet: (cost: number) => void;
  nextPetCost: number;
  isSummoningPet: boolean;
}

export const SHOP_ITEMS: ShopItem[] = [
  // Backgrounds
  { id: 'runes', category: 'background', name: 'Mystic Runes', emoji: 'ᚯ', description: 'Ancient symbols float from the abyss.' },
  { id: 'nebula', category: 'background', name: 'Deep Nebula', emoji: '🌌', description: 'Cosmic gas clouds pulse in the background.' },
  { id: 'binary', category: 'background', name: 'The Matrix', emoji: '💻', description: 'Digital rain for the cyberpunk soul.' },
  { id: 'bubbles', category: 'background', name: 'Zen Bubbles', emoji: '🫧', description: 'Calming bubbles drifting upwards.' },
  
  // Upgrades (Visual)
  { id: 'firework_boom', category: 'upgrade', name: 'Mega Boom', emoji: '💥', description: 'Fireworks are 50% bigger and brighter!' },
  { id: 'firework_color', category: 'upgrade', name: 'Rainbow Spark', emoji: '🌈', description: 'Fireworks emit way more particles.' },
];

const ShopModal: React.FC<ShopModalProps> = ({ 
    onClose, unlockedItems, activeItems, onBuy, onToggle, currentScore, nextDecorationCost,
    maxCombo, onUpgradeCombo, nextComboCost,
    petCount, onSummonPet, nextPetCost, isSummoningPet
}) => {
  const [activeTab, setActiveTab] = useState<DecorationCategory | 'gameplay'>('gameplay');

  const filteredItems = SHOP_ITEMS.filter(item => item.category === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-yellow-600/50 p-6 rounded-2xl max-w-2xl w-full shadow-[0_0_50px_rgba(234,179,8,0.1)] relative max-h-[90vh] flex flex-col">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 mb-1">
          Void Market
        </h2>
        <p className="text-slate-400 mb-4 text-sm">
          Spending points increases future prices exponentially!
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-slate-700 pb-2 overflow-x-auto">
            <button
                onClick={() => setActiveTab('gameplay')}
                className={`
                    px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all whitespace-nowrap
                    ${activeTab === 'gameplay' 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
                `}
            >
                ⚡ Upgrades
            </button>
            {(['background', 'upgrade'] as DecorationCategory[]).map(cat => (
                <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`
                        px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all whitespace-nowrap
                        ${activeTab === cat 
                            ? 'bg-yellow-600 text-white shadow-lg' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
                    `}
                >
                    {cat === 'upgrade' ? 'FX Upgrades' : cat + 's'}
                </button>
            ))}
        </div>

        {/* Gameplay Upgrades Section */}
        {activeTab === 'gameplay' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto scrollbar-thin">
                
                {/* Max Combo Upgrade */}
                <div className="p-4 rounded-xl border border-blue-500/30 bg-slate-800/50 flex flex-col justify-between">
                    <div>
                        <div className="text-4xl mb-2">🔥</div>
                        <h3 className="font-bold text-white text-lg">Max Combo Limit</h3>
                        <p className="text-slate-400 text-xs mb-2">Increase your maximum combo limit by +1 (10x → 11x → 12x...).</p>
                        <div className="text-blue-300 font-mono text-sm mb-4">Current Max: <span className="text-white font-bold">x{maxCombo}</span></div>
                    </div>
                    <button
                        onClick={() => onUpgradeCombo(nextComboCost)}
                        disabled={currentScore < nextComboCost}
                        className={`
                            w-full py-3 rounded-lg text-sm font-bold transition-all flex justify-between items-center px-4
                            ${currentScore >= nextComboCost 
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg' 
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                        `}
                    >
                        <span>Upgrade</span>
                        <span className="font-mono bg-black/20 px-2 rounded">{nextComboCost.toLocaleString()}</span>
                    </button>
                </div>

                {/* Summon Pet */}
                <div className="p-4 rounded-xl border border-pink-500/30 bg-slate-800/50 flex flex-col justify-between">
                    <div>
                        <div className="text-4xl mb-2">🥚</div>
                        <h3 className="font-bold text-white text-lg">Summon Companion</h3>
                        <p className="text-slate-400 text-xs mb-2">
                            Manifest a new pet based on items currently on your board.
                        </p>
                        <div className="text-pink-300 font-mono text-sm mb-4">Active Pets: <span className="text-white font-bold">{petCount}</span></div>
                    </div>
                    <button
                        onClick={() => onSummonPet(nextPetCost)}
                        disabled={currentScore < nextPetCost || isSummoningPet}
                        className={`
                            w-full py-3 rounded-lg text-sm font-bold transition-all flex justify-between items-center px-4
                            ${currentScore >= nextPetCost && !isSummoningPet
                                ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg' 
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                        `}
                    >
                        <span>{isSummoningPet ? 'Summoning...' : 'Summon'}</span>
                        <span className="font-mono bg-black/20 px-2 rounded">{nextPetCost.toLocaleString()}</span>
                    </button>
                </div>

            </div>
        )}

        {/* Decorations Section */}
        {activeTab !== 'gameplay' && (
            <>
                <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700 mb-6 shrink-0">
                    <span className="text-slate-300">Next Decor Cost:</span>
                    <span className="text-yellow-400 font-mono font-bold text-xl">{nextDecorationCost.toLocaleString()} pts</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto scrollbar-thin pr-2">
                {filteredItems.map((item) => {
                    const isOwned = unlockedItems.has(item.id);
                    const isActive = activeItems.has(item.id);
                    const canAfford = currentScore >= nextDecorationCost;

                    return (
                    <div 
                        key={item.id}
                        className={`
                            relative p-4 rounded-xl border transition-all flex flex-col justify-between
                            ${isOwned 
                                ? isActive ? 'bg-slate-800/80 border-green-500/50 shadow-green-500/10 shadow-lg' : 'bg-slate-800/40 border-slate-700' 
                                : 'bg-slate-900 border-slate-800 hover:border-yellow-500/30'}
                        `}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <div className="text-4xl">{item.emoji}</div>
                                {isOwned && (
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Owned
                                    </span>
                                )}
                            </div>
                            
                            <h3 className="font-bold text-white text-lg">{item.name}</h3>
                            <p className="text-slate-400 text-xs mb-4">{item.description}</p>
                        </div>

                        {!isOwned ? (
                            <button
                                onClick={() => onBuy(item.id, nextDecorationCost)}
                                disabled={!canAfford}
                                className={`
                                    w-full py-2 rounded-lg text-sm font-bold transition-all flex justify-center items-center gap-2
                                    ${canAfford 
                                        ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg' 
                                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                                `}
                            >
                                <span>Buy</span>
                                <span className="font-mono bg-black/20 px-2 rounded">
                                    {nextDecorationCost.toLocaleString()}
                                </span>
                            </button>
                        ) : (
                            <button
                                onClick={() => onToggle(item.id)}
                                className={`
                                    w-full py-2 rounded-lg text-sm font-bold transition-all
                                    ${isActive 
                                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30' 
                                        : 'bg-green-600 hover:bg-green-500 text-white shadow-lg'}
                                `}
                            >
                                {isActive ? 'Disable' : 'Enable'}
                            </button>
                        )}
                    </div>
                    );
                })}
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default ShopModal;