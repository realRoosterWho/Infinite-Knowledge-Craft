import React, { useState, useRef, useCallback, useEffect } from 'react';
import SetupModal from './components/SetupModal';
import Sidebar from './components/Sidebar';
import ElementCard from './components/ElementCard';
import Fireworks, { FireworkBurst } from './components/Fireworks';
import RecipeBook from './components/RecipeBook';
import DecorationLayer from './components/DecorationLayer'; 
import PetLayer from './components/PetLayer'; 
import ShopModal, { SHOP_ITEMS } from './components/ShopModal'; 
import { ElementData, BoardElement, GameState, FloatingTextData, ShopItemId, PetData } from './types';
import { combineElements, explainConcept, generateSingleElement, generatePetFromContext } from './services/geminiService';

const generateId = () => Math.random().toString(36).substr(2, 9);

const STORAGE_KEY = 'ikc_save_data_v5'; 

interface SaveData {
  inventory: ElementData[];
  score: number;
  visitedRecipes: string[]; 
  baseMultiplier: number;
  language: string;
  topic?: string;
  customItemCount?: number;
  unlockedItems?: ShopItemId[]; 
  activeItems?: ShopItemId[];
  pets?: PetData[]; 
  maxCombo?: number; 
}

interface ExplanationState {
  isOpen: boolean;
  term: string;
  text: string;
  isLoading: boolean;
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.SETUP);
  const [inventory, setInventory] = useState<ElementData[]>([]);
  const [boardElements, setBoardElements] = useState<BoardElement[]>([]);
  
  // Scoring & Progression
  const [score, setScore] = useState(0);
  const [visitedRecipes, setVisitedRecipes] = useState<Set<string>>(new Set());
  const [baseMultiplier, setBaseMultiplier] = useState(1.0);
  const [language, setLanguage] = useState<string>('English');
  const [topic, setTopic] = useState<string>('');
  
  // Custom Item Logic
  const [customItemCount, setCustomItemCount] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  // Decorations & Shop
  const [unlockedItems, setUnlockedItems] = useState<Set<ShopItemId>>(new Set());
  const [activeItems, setActiveItems] = useState<Set<ShopItemId>>(new Set());
  const [isShopOpen, setIsShopOpen] = useState(false);

  // New Upgrade Systems
  const [pets, setPets] = useState<PetData[]>([]);
  const [maxCombo, setMaxCombo] = useState(10); // Start at 10
  const [isSummoningPet, setIsSummoningPet] = useState(false);

  // UI Animation States
  const [scoreBump, setScoreBump] = useState(false);
  const [comboBump, setComboBump] = useState(false);
  
  // Recipe Book State
  const [isRecipeBookOpen, setIsRecipeBookOpen] = useState(false);

  // Combo System
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [comboTimeLeft, setComboTimeLeft] = useState(0); 
  const MAX_COMBO_TIME = 10;

  const [floatingTexts, setFloatingTexts] = useState<FloatingTextData[]>([]);
  const [bursts, setBursts] = useState<FireworkBurst[]>([]);

  // Explanation Popup
  const [explanation, setExplanation] = useState<ExplanationState>({
    isOpen: false,
    term: '',
    text: '',
    isLoading: false,
  });

  const dragRef = useRef<{
    id: string | null;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
  }>({ id: null, offsetX: 0, offsetY: 0, startX: 0, startY: 0 });

  // --- Dynamic Pricing Logic ---
  
  const customItemCost = Math.floor(1000 * Math.pow(1.5, customItemCount));
  const canAffordCustom = score >= customItemCost;

  // Decor Cost: Based on unlocked static decorations
  const nextDecorationCost = Math.floor(2000 * Math.pow(1.8, unlockedItems.size));

  // Combo Upgrade Cost: Base 5000. 
  // Price grows exponentially (1.5x) but benefit is linear (+1 max combo).
  const comboUpgradeLevel = maxCombo - 10;
  const nextComboCost = Math.floor(5000 * Math.pow(1.5, comboUpgradeLevel));

  // Pet Cost: Base 5000 * 1.4^pets
  const nextPetCost = Math.floor(5000 * Math.pow(1.4, pets.length));

  // --- Load/Save ---

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data: SaveData = JSON.parse(saved);
        if (data.inventory && data.inventory.length > 0) {
          setInventory(data.inventory);
          setScore(data.score || 0);
          setVisitedRecipes(new Set(data.visitedRecipes || []));
          setBaseMultiplier(data.baseMultiplier || 1.0);
          setLanguage(data.language || 'English');
          setTopic(data.topic || '');
          setCustomItemCount(data.customItemCount || 0);
          setUnlockedItems(new Set(data.unlockedItems || []));
          setActiveItems(new Set(data.activeItems || []));
          setPets(data.pets || []);
          setMaxCombo(data.maxCombo || 10);
          setGameState(GameState.PLAYING);
        }
      } catch (e) {
        console.error("Failed to load save data", e);
      }
    }
  }, []);

  useEffect(() => {
    if (gameState === GameState.PLAYING && inventory.length > 0) {
      const data: SaveData = {
        inventory,
        score,
        visitedRecipes: Array.from(visitedRecipes),
        baseMultiplier,
        language,
        topic,
        customItemCount,
        unlockedItems: Array.from(unlockedItems),
        activeItems: Array.from(activeItems),
        pets,
        maxCombo
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [inventory, score, visitedRecipes, baseMultiplier, language, topic, gameState, customItemCount, unlockedItems, activeItems, pets, maxCombo]);

  // --- Timers & Cleanup ---

  useEffect(() => {
    if (isRecipeBookOpen) return;
    if (comboTimeLeft <= 0) {
      if (comboMultiplier > 1) setComboMultiplier(1);
      return;
    }
    const interval = setInterval(() => {
      setComboTimeLeft((prev) => Math.max(0, prev - 0.1));
    }, 100);
    return () => clearInterval(interval);
  }, [comboTimeLeft, comboMultiplier, isRecipeBookOpen]);

  useEffect(() => {
      if (bursts.length > 0) {
          const timer = setTimeout(() => {
              setBursts(prev => prev.slice(1));
          }, 3000);
          return () => clearTimeout(timer);
      }
  }, [bursts]);

  useEffect(() => {
    if (explanation.isOpen && !explanation.isLoading) {
        const timer = setTimeout(() => {
            setExplanation(prev => ({ ...prev, isOpen: false }));
        }, 6000);
        return () => clearTimeout(timer);
    }
  }, [explanation.isOpen, explanation.isLoading]);

  // --- Helpers ---

  const addFloatingText = (x: number, y: number, text: string, type: 'discovery' | 'recipe' | 'combo' | 'error' | 'neutral') => {
    let color = 'text-white';
    let size: 'sm' | 'lg' = 'sm';

    if (type === 'discovery') {
        color = 'text-yellow-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]';
        size = 'lg';
    }
    else if (type === 'recipe') {
        color = 'text-green-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]';
    }
    else if (type === 'combo') {
        color = 'text-purple-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]';
    }
    else if (type === 'error') {
        color = 'text-red-500 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]';
    }
    else if (type === 'neutral') {
        color = 'text-slate-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] opacity-80';
    }

    const id = generateId();
    setFloatingTexts(prev => [...prev, { id, x, y, text, color, size }]);
    setTimeout(() => {
        setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 800);
  };

  const createFirework = (x: number, y: number, colors: string[], size: 'big' | 'small' | 'tiny') => {
      let particleMultiplier = activeItems.has('firework_color') ? 1.5 : 1.0;
      let scaleMultiplier = activeItems.has('firework_boom') ? 1.5 : 1.0;

      let baseParticles = 0;
      let baseVelocity = 0;

      if (size === 'big') {
          baseParticles = 50;
          baseVelocity = 1.2;
      } else if (size === 'small') {
          baseParticles = 15;
          baseVelocity = 0.6;
      } else {
          baseParticles = 6;
          baseVelocity = 0.3;
      }

      setBursts(prev => [...prev, {
          id: generateId(),
          x,
          y,
          colors,
          particleCount: Math.round(baseParticles * particleMultiplier),
          velocityScale: baseVelocity * scaleMultiplier
      }]);
  };

  // --- Core Actions ---

  const handleSetupComplete = (elements: ElementData[], detectedLanguage: string, inputTopic: string) => {
    setInventory(elements);
    setLanguage(detectedLanguage);
    setTopic(inputTopic);
    setGameState(GameState.PLAYING);
  };

  const addToBoard = (elementData: ElementData) => {
    const newElement: BoardElement = {
      ...elementData,
      instanceId: generateId(),
      x: window.innerWidth / 2 + (Math.random() * 40 - 20),
      y: window.innerHeight / 2 + (Math.random() * 40 - 20),
      isDragging: false,
    };
    setBoardElements(prev => [...prev, newElement]);
  };

  const clearBoard = () => setBoardElements([]);

  const resetGame = () => {
    setBoardElements([]);
    setInventory([]);
    setTopic('');
    setCustomItemCount(0);
    setPets([]);
    setMaxCombo(10);
    setGameState(GameState.SETUP);
  };

  const hardReset = () => {
    if (confirm("Are you sure? This will delete all progress.")) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload(); 
    }
  };

  const handleCreateCustomItem = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!customInput.trim() || !canAffordCustom || isCreatingCustom) return;

    setIsCreatingCustom(true);
    const itemName = customInput.trim();
    setCustomInput('');

    try {
        setScore(prev => prev - customItemCost);
        const newElement = await generateSingleElement(itemName);
        
        if (newElement) {
            setInventory(prev => {
                if (prev.some(i => i.text.toLowerCase() === newElement.text.toLowerCase())) return prev;
                return [...prev, newElement];
            });
            addToBoard(newElement);
            setCustomItemCount(prev => prev + 1);
            addFloatingText(window.innerWidth / 2, window.innerHeight - 100, `Created ${itemName}!`, 'recipe');
            createFirework(window.innerWidth / 2, window.innerHeight - 80, ['#60A5FA', '#A78BFA'], 'small');
        }
    } catch (error) {
        console.error("Failed to create custom item", error);
        addFloatingText(window.innerWidth / 2, window.innerHeight - 100, "Creation Failed", 'error');
        setScore(prev => prev + customItemCost); 
    } finally {
        setIsCreatingCustom(false);
    }
  };

  const handleBuyDecoration = (id: ShopItemId, cost: number) => {
    if (score >= cost && !unlockedItems.has(id)) {
        setScore(prev => prev - cost);
        setUnlockedItems(prev => new Set(prev).add(id));
        setActiveItems(prev => new Set(prev).add(id)); // Auto-equip
        
        addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Unlocked!", 'discovery');
        createFirework(window.innerWidth / 2, window.innerHeight / 2, ['#FFD700', '#FFA500'], 'big');
    }
  };

  const handleToggleDecoration = (id: ShopItemId) => {
      setActiveItems(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const handleUpgradeCombo = (cost: number) => {
      if (score >= cost) {
          setScore(prev => prev - cost);
          // Linear Upgrade: +1 to max combo
          setMaxCombo(prev => prev + 1);
          addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Max Combo +1!", 'discovery');
          createFirework(window.innerWidth / 2, window.innerHeight / 2, ['#3B82F6', '#60A5FA'], 'big');
      }
  };

  const handleSummonPet = async (cost: number) => {
      if (score >= cost) {
          setIsSummoningPet(true);
          try {
              // Collect current items on board for context, fallback to inventory if empty
              const context = boardElements.length > 0 
                  ? boardElements.map(b => b.text) 
                  : inventory.slice(-5).map(i => i.text);
              
              const newPet = await generatePetFromContext(context);
              setScore(prev => prev - cost);
              setPets(prev => [...prev, newPet]);
              
              addFloatingText(window.innerWidth / 2, window.innerHeight / 2, `${newPet.name} Summoned!`, 'discovery');
              createFirework(window.innerWidth / 2, window.innerHeight / 2, [newPet.color, '#FFFFFF'], 'big');
          } catch (e) {
             console.error("Pet summon failed", e);
             addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Summon Failed", 'error');
          } finally {
              setIsSummoningPet(false);
          }
      }
  };

  // --- Interaction ---

  const handleElementRightClick = async (e: React.MouseEvent, element: BoardElement) => {
      e.preventDefault();
      setExplanation({ isOpen: true, term: element.text, text: '', isLoading: true });
      const text = await explainConcept(element.text, language, topic);
      setExplanation(prev => ({ ...prev, text: text, isLoading: false }));
  };

  const handleMouseDown = (e: React.MouseEvent, instanceId: string) => {
    if (isRecipeBookOpen || isShopOpen) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('input')) return;
    if (e.button !== 0) return;
    
    e.preventDefault();
    const element = boardElements.find(el => el.instanceId === instanceId);
    if (!element) return;

    dragRef.current = {
      id: instanceId,
      offsetX: e.clientX - element.x,
      offsetY: e.clientY - element.y,
      startX: element.x,
      startY: element.y
    };

    setBoardElements(prev => prev.map(el => 
      el.instanceId === instanceId ? { ...el, isDragging: true } : el
    ));
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current.id) return;
    const x = e.clientX - dragRef.current.offsetX;
    const y = e.clientY - dragRef.current.offsetY;
    setBoardElements(prev => prev.map(el => el.instanceId === dragRef.current.id ? { ...el, x, y } : el));
  }, []);

  const handleMouseUp = useCallback(async (e: MouseEvent) => {
    const draggingId = dragRef.current.id;
    if (!draggingId) return;
    dragRef.current.id = null;
    let currentBoard = boardElements; 
    setBoardElements(prev => {
        currentBoard = prev.map(el => el.instanceId === draggingId ? { ...el, isDragging: false } : el);
        return currentBoard;
    });
    const draggedEl = currentBoard.find(el => el.instanceId === draggingId);
    if (!draggedEl) return;
    
    const targetEl = currentBoard.find(el => 
      el.instanceId !== draggingId && 
      !el.isLoading &&
      Math.hypot(el.x - draggedEl.x, el.y - draggedEl.y) < 50
    );

    if (targetEl) {
      await attemptCraft(draggedEl, targetEl);
    }
  }, [boardElements, isRecipeBookOpen, isShopOpen, activeItems, maxCombo]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const attemptCraft = async (source: BoardElement, target: BoardElement) => {
    const recipeKey = [source.text, target.text].sort().join('|');

    setBoardElements(prev => prev.filter(el => el.instanceId !== source.instanceId).map(el => 
      el.instanceId === target.instanceId ? { ...el, isLoading: true, text: "Crafting..." } : el
    ));

    const result = await combineElements(source.text, target.text, language);

    if (result) {
        const newElementData: ElementData = {
            id: result.result.toLowerCase().replace(/\s/g, '-'),
            text: result.result,
            emoji: result.emoji,
            parents: [source.text, target.text]
        };

        let isFirstTimeRecipe = !visitedRecipes.has(recipeKey);
        const isNewElement = !inventory.some(i => i.text === newElementData.text);

        if (isFirstTimeRecipe) {
            setVisitedRecipes(prev => new Set(prev).add(recipeKey));
            const basePoints = isNewElement ? 100 : 10;
            setBaseMultiplier(prev => prev * 1.1);
            setComboMultiplier(prev => Math.min(maxCombo, prev + 1)); // Use dynamic maxCombo
            setComboTimeLeft(MAX_COMBO_TIME);

            const currentCombo = Math.min(maxCombo, comboMultiplier + 1); 
            const currentBaseMult = baseMultiplier * 1.1;
            const finalPoints = Math.round(basePoints * currentBaseMult * currentCombo);
            setScore(prev => prev + finalPoints);

            if (isNewElement) {
                setScoreBump(true);
                setTimeout(() => setScoreBump(false), 300);
                addFloatingText(target.x, target.y - 60, `+${finalPoints}`, 'discovery');
                createFirework(target.x, target.y, result.colors.length === 2 ? result.colors : ['#ffffff', '#ffff00'], 'big');
            } else {
                addFloatingText(target.x, target.y - 60, `+${finalPoints}`, 'recipe');
                createFirework(target.x, target.y, result.colors.length === 2 ? result.colors : ['#ffffff', '#cccccc'], 'small');
            }
            if (currentCombo > 1) {
              setComboBump(true);
              setTimeout(() => setComboBump(false), 300);
              setTimeout(() => addFloatingText(target.x, target.y - 40, `${currentCombo}x COMBO!`, 'combo'), 100);
            }
        } else {
            addFloatingText(target.x, target.y - 40, "Synthesized", 'neutral');
            createFirework(target.x, target.y, result.colors.length === 2 ? result.colors : ['#cccccc'], 'tiny');
        }

        setInventory(prev => {
            if (prev.some(i => i.text === newElementData.text)) return prev;
            return [...prev, newElementData];
        });

        setBoardElements(prev => prev.map(el => {
            if (el.instanceId === target.instanceId) {
                return { ...el, ...newElementData, isLoading: false };
            }
            return el;
        }));
    } else {
        addFloatingText(target.x, target.y - 40, "🚫 Too Weak", "error");
        setBoardElements(prev => prev.map(el => {
            if (el.instanceId === target.instanceId) {
                return { ...el, isLoading: false, text: target.text, emoji: target.emoji }; 
            }
            return el;
        }));
    }
  };

  return (
    <div className="w-full h-screen relative bg-slate-900 overflow-hidden text-slate-200 font-sans selection:bg-blue-500/30">
      
      <DecorationLayer activeItems={activeItems} />
      <PetLayer pets={pets} /> {/* Pets are independent now */}
      
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      <Fireworks bursts={bursts} />

      {/* Modals */}
      {isRecipeBookOpen && (
        <RecipeBook inventory={inventory} onClose={() => setIsRecipeBookOpen(false)} />
      )}
      
      {isShopOpen && (
        <ShopModal 
            onClose={() => setIsShopOpen(false)} 
            unlockedItems={unlockedItems}
            activeItems={activeItems}
            onBuy={handleBuyDecoration}
            onToggle={handleToggleDecoration}
            currentScore={score}
            nextDecorationCost={nextDecorationCost}
            // Gameplay Upgrades
            maxCombo={maxCombo}
            onUpgradeCombo={handleUpgradeCombo}
            nextComboCost={nextComboCost}
            petCount={pets.length}
            onSummonPet={handleSummonPet}
            nextPetCost={nextPetCost}
            isSummoningPet={isSummoningPet}
        />
      )}

      {gameState === GameState.SETUP && (
        <SetupModal onComplete={handleSetupComplete} />
      )}

      {gameState === GameState.PLAYING && (
        <>
          {/* Explanation Popup */}
          <div className={`
              absolute top-8 left-1/2 -translate-x-1/2 z-50
              transition-all duration-300 transform
              ${explanation.isOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}
          `}>
              <div className="bg-slate-800/90 backdrop-blur-md border border-purple-500/30 shadow-2xl rounded-xl p-4 max-w-md text-center">
                  <h3 className="text-purple-300 font-bold text-lg mb-1 flex items-center justify-center gap-2">
                      {explanation.term}
                      {explanation.isLoading && <span className="animate-spin text-sm">⏳</span>}
                  </h3>
                  {!explanation.isLoading && (
                      <p className="text-sm text-slate-200 leading-relaxed animate-in fade-in">
                          {explanation.text}
                      </p>
                  )}
              </div>
          </div>

          {/* Stats Bar */}
          <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 pointer-events-none select-none">
             {/* Stats UI */}
             <div className="flex gap-2">
                 <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg px-4 py-1.5 shadow-xl flex items-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mr-2">Language</span>
                    <span className="text-sm font-bold text-white">{language}</span>
                 </div>
                 {topic && (
                    <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg px-4 py-1.5 shadow-xl flex items-center max-w-[200px]">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mr-2 whitespace-nowrap">Topic</span>
                      <span className="text-sm font-bold text-white truncate" title={topic}>{topic}</span>
                   </div>
                 )}
             </div>

             <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg px-4 py-2 shadow-xl min-w-[140px] transition-transform">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block">Total Score</span>
                <span className={`text-2xl font-mono text-yellow-400 font-bold block transition-transform ${scoreBump ? 'animate-bump' : ''}`}>
                    {score.toLocaleString()}
                </span>
             </div>
             
             <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg px-4 py-1.5 shadow-xl flex justify-between items-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Base Mult</span>
                <span className="text-sm font-mono text-blue-400 font-bold">x{baseMultiplier.toFixed(2)}</span>
             </div>

             <div className={`transition-all duration-300 origin-left ${comboMultiplier > 1 || comboTimeLeft > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                <div className={`flex items-center gap-2 mb-1 ${comboBump ? 'animate-bump' : ''}`}>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-black text-xl italic drop-shadow-sm">
                    COMBO x{comboMultiplier} <span className="text-xs text-slate-400 not-italic">/ {maxCombo}</span>
                  </span>
                  {isRecipeBookOpen && (
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-1 rounded border border-yellow-500/50">PAUSED</span>
                  )}
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                    style={{ 
                        width: `${(comboTimeLeft / MAX_COMBO_TIME) * 100}%`,
                        transition: isRecipeBookOpen ? 'none' : 'width 0.1s linear'
                    }}
                  />
                </div>
             </div>
          </div>

          {/* Shop Button */}
          <button
            onClick={() => setIsShopOpen(true)}
            className="absolute top-4 right-80 z-40 bg-yellow-700/80 hover:bg-yellow-600 border border-yellow-500/50 text-yellow-100 p-2 rounded-lg shadow-lg backdrop-blur transition-all hover:scale-105 active:scale-95 flex flex-col items-center"
            title="Void Market"
          >
             <span className="text-xl">🎪</span>
             <span className="text-[10px] font-bold uppercase tracking-wide">Market</span>
          </button>

          {/* Custom Item Creator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-full shadow-2xl p-1.5 flex items-center gap-2 transition-transform hover:-translate-y-1">
             <form onSubmit={handleCreateCustomItem} className="flex items-center gap-2">
                 <input 
                    type="text" 
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Create anything..."
                    className="bg-slate-800 text-white text-sm px-3 py-2 rounded-full border border-slate-600 focus:outline-none focus:border-blue-500 w-32 sm:w-56"
                 />
                 <button 
                    type="submit"
                    disabled={!canAffordCustom || !customInput.trim() || isCreatingCustom}
                    className={`
                        px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2
                        ${canAffordCustom && customInput.trim()
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25' 
                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'}
                    `}
                 >
                    {isCreatingCustom ? <span className="animate-spin">⏳</span> : (
                        <>
                            <span>Create</span>
                            <span className={`${canAffordCustom ? 'text-blue-200' : 'text-red-900'} font-mono`}>
                                {customItemCost.toLocaleString()}
                            </span>
                        </>
                    )}
                 </button>
             </form>
          </div>

          {/* Recipe Book Toggle */}
          <button
            onClick={() => setIsRecipeBookOpen(true)}
            className="absolute bottom-16 left-4 z-40 bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-full shadow-lg border border-indigo-400 transition-all hover:scale-110 active:scale-95 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <path d="M10 10l4 4"></path>
              <path d="M3 21v-7"></path>
            </svg>
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Recipe Chain
            </span>
          </button>

          <button 
             onClick={hardReset}
             className="absolute bottom-4 left-4 z-50 text-[10px] text-slate-600 hover:text-red-500 transition-colors opacity-50 hover:opacity-100"
          >
             Reset Data
          </button>

          <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {floatingTexts.map(ft => (
              <div 
                key={ft.id}
                style={{ left: ft.x, top: ft.y }}
                className={`
                    absolute font-black whitespace-nowrap animate-float-up
                    ${ft.color}
                    ${ft.size === 'lg' ? 'text-3xl z-50' : 'text-xl z-40'}
                `}
              >
                {ft.text}
              </div>
            ))}
          </div>

          <div className="absolute inset-0 pr-64 md:pr-80">
            {boardElements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-700 font-bold text-2xl uppercase tracking-widest opacity-50">
                    Drag items here
                </div>
            )}

            {boardElements.map(el => (
              <ElementCard 
                key={el.instanceId} 
                element={el} 
                onMouseDown={handleMouseDown} 
                onContextMenu={handleElementRightClick}
              />
            ))}
          </div>

          <Sidebar 
            inventory={inventory} 
            onAddToBoard={addToBoard} 
            onClearBoard={clearBoard}
            onResetGame={resetGame}
          />
        </>
      )}
    </div>
  );
};

export default App;