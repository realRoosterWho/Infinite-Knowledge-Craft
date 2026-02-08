import React, { useEffect, useState } from 'react';
import { ShopItemId } from '../types';

interface DecorationLayerProps {
  activeItems: Set<ShopItemId>;
}

const DecorationLayer: React.FC<DecorationLayerProps> = ({ activeItems }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Backgrounds */}
      {activeItems.has('nebula') && <NebulaEffect />}
      {activeItems.has('runes') && <FloatingRunes />}
      {activeItems.has('binary') && <BinaryRain />}
      {activeItems.has('bubbles') && <Bubbles />}
    </div>
  );
};

// --- Sub-Components ---

const NebulaEffect = () => (
  <div className="absolute inset-0 opacity-50">
    <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-purple-600/30 rounded-full blur-[120px] animate-blob mix-blend-screen" />
    <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-indigo-600/30 rounded-full blur-[120px] animate-blob animation-delay-2000 mix-blend-screen" />
    <div className="absolute top-[30%] left-[30%] w-[50vw] h-[50vw] bg-pink-600/20 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-screen" />
  </div>
);

const FloatingRunes = () => {
  const [runes, setRunes] = useState<{id: number, left: number, delay: number, char: string}[]>([]);

  useEffect(() => {
    const chars = '᚛᚜ᚠᚢᚦᚨᚱᚲᚳᚴᚵᚶᚷᚸᚹᚺᚻᚼᚽᚾᚿᛀᛁᛂᛃᛄᛅᛆᛇᛈᛉᛊ';
    const newRunes = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 20,
      char: chars[Math.floor(Math.random() * chars.length)]
    }));
    setRunes(newRunes);
  }, []);

  return (
    <>
      {runes.map(r => (
        <div
          key={r.id}
          className="absolute text-slate-500/20 font-serif text-4xl select-none"
          style={{
            left: `${r.left}%`,
            bottom: '-50px',
            animation: `floatUp 25s linear infinite`,
            animationDelay: `-${r.delay}s`
          }}
        >
          {r.char}
        </div>
      ))}
    </>
  );
};

const BinaryRain = () => {
  const [drops, setDrops] = useState<{id: number, left: number, delay: number, speed: number}[]>([]);

  useEffect(() => {
    const newDrops = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      speed: 2 + Math.random() * 5
    }));
    setDrops(newDrops);
  }, []);

  return (
    <>
      {drops.map(d => (
        <div
          key={d.id}
          className="absolute top-[-150px] text-green-500/30 font-mono text-xs w-4 break-words leading-none select-none"
          style={{
            left: `${d.left}%`,
            animation: `matrixRain ${d.speed}s linear infinite`,
            animationDelay: `-${d.delay}s`
          }}
        >
          {'01'.repeat(25).split('').sort(() => 0.5 - Math.random()).join('\n')}
        </div>
      ))}
      <style>{`
        @keyframes matrixRain {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(120vh); opacity: 0; }
        }
      `}</style>
    </>
  );
};

const Bubbles = () => {
    const [bubbles, setBubbles] = useState<{id: number, left: number, size: number, delay: number}[]>([]);
    
    useEffect(() => {
        const b = Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100,
            size: 20 + Math.random() * 60,
            delay: Math.random() * 10
        }));
        setBubbles(b);
    }, []);

    return (
        <>
            {bubbles.map(b => (
                <div 
                    key={b.id}
                    className="absolute bottom-[-100px] rounded-full border-2 border-white/10 bg-white/5 backdrop-blur-[1px]"
                    style={{
                        left: `${b.left}%`,
                        width: `${b.size}px`,
                        height: `${b.size}px`,
                        animation: `bubbleFloat 10s ease-in infinite`,
                        animationDelay: `-${b.delay}s`
                    }}
                />
            ))}
            <style>{`
                @keyframes bubbleFloat {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    20% { opacity: 0.6; }
                    50% { transform: translateY(-50vh) translateX(30px); }
                    100% { transform: translateY(-110vh) translateX(-30px); opacity: 0; }
                }
            `}</style>
        </>
    );
};

export default DecorationLayer;