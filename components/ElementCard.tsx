import React from 'react';
import { BoardElement } from '../types';

interface ElementCardProps {
  element: BoardElement;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onContextMenu?: (e: React.MouseEvent, element: BoardElement) => void;
  style?: React.CSSProperties;
  className?: string;
}

const ElementCard: React.FC<ElementCardProps> = ({ element, onMouseDown, onContextMenu, style, className }) => {
  return (
    <div
      onMouseDown={(e) => onMouseDown(e, element.instanceId)}
      onContextMenu={(e) => {
        if (onContextMenu) {
            e.preventDefault();
            onContextMenu(e, element);
        }
      }}
      style={{
        ...style,
        position: 'absolute',
        left: element.x,
        top: element.y,
        transform: 'translate(-50%, -50%)', // Center anchor
        zIndex: element.isDragging ? 50 : 10,
        cursor: element.isDragging ? 'grabbing' : 'grab',
      }}
      className={`
        flex items-center gap-2 px-4 py-2 
        bg-white/10 backdrop-blur-md 
        border border-white/20 rounded-full 
        shadow-lg select-none hover:bg-white/20 transition-colors
        text-white font-medium text-sm sm:text-base whitespace-nowrap
        ${element.isLoading ? 'animate-pulse opacity-90 border-blue-400/50 bg-blue-500/10' : ''}
        ${className || ''}
      `}
    >
      <span className={`text-xl ${element.isLoading ? 'animate-spin' : ''}`}>
        {element.isLoading ? '⏳' : element.emoji}
      </span>
      <span>{element.text}</span>
    </div>
  );
};

export default ElementCard;