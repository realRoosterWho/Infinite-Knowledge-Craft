import React, { useEffect, useState, useRef } from 'react';
import { PetData } from '../types';

interface PetLayerProps {
  pets: PetData[];
}

interface PetInstance extends PetData {
  x: number; // Percentage 0-100
  speed: number;
  direction: 1 | -1;
  wobbleOffset: number;
}

const PetLayer: React.FC<PetLayerProps> = ({ pets }) => {
  const [instances, setInstances] = useState<PetInstance[]>([]);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  // Sync props to internal state (initialize positions for new pets)
  useEffect(() => {
    setInstances(prev => {
      const currentIds = new Set(prev.map(p => p.id));
      const newPets = pets.filter(p => !currentIds.has(p.id)).map(p => ({
        ...p,
        x: Math.random() * 80, // Random start pos
        speed: 0.05 + Math.random() * 0.1, // Random speed
        direction: Math.random() > 0.5 ? 1 : -1,
        wobbleOffset: Math.random() * 100
      } as PetInstance));
      
      return [...prev, ...newPets];
    });
  }, [pets]);

  // Animation Loop
  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      // Calculate Sidebar safe zone
      const isMobile = window.innerWidth < 768;
      const rightLimit = isMobile ? 90 : 75; // % of screen width
      const leftLimit = 2; 

      setInstances(prevInstances => 
        prevInstances.map(pet => {
          let newX = pet.x + (pet.speed * pet.direction);
          let newDirection = pet.direction;

          if (newX >= rightLimit) {
            newX = rightLimit;
            newDirection = -1;
          } else if (newX <= leftLimit) {
            newX = leftLimit;
            newDirection = 1;
          }

          // Random chance to turn around occasionally
          if (Math.random() < 0.005) {
              newDirection *= -1;
          }

          return { ...pet, x: newX, direction: newDirection };
        })
      );
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  return (
    // Raised bottom to 32 (approx 8rem / 128px) to sit comfortably above the Create UI
    <div className="absolute bottom-32 left-0 right-0 h-32 pointer-events-none z-20 overflow-hidden">
      {instances.map(pet => (
        <div
          key={pet.id}
          className="absolute bottom-0 transition-transform duration-75 will-change-transform flex flex-col items-center"
          style={{
            left: `${pet.x}%`,
            transform: `scaleX(${-pet.direction})`, // Flip sprite based on direction
          }}
        >
            {/* Name Tag (Prevent flipping with parent) */}
            <div 
                className="absolute bottom-full mb-2 bg-slate-900/80 border border-slate-700 px-2 py-0.5 rounded text-[10px] whitespace-nowrap font-bold shadow-lg backdrop-blur-sm"
                style={{ 
                    transform: `scaleX(${-pet.direction})`, // Counter-flip text
                    color: pet.color 
                }}
            >
                {pet.name}
            </div>

            {/* Pet Body */}
            <div className="text-4xl filter drop-shadow-lg animate-walk select-none cursor-help pointer-events-auto hover:scale-125 transition-transform"
                 title={pet.description}>
                {pet.emoji}
            </div>
        </div>
      ))}
    </div>
  );
};

export default PetLayer;