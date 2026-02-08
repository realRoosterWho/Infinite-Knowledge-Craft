
export interface ElementData {
  id: string;
  text: string;
  emoji: string;
  parents?: [string, string]; 
}

export interface BoardElement extends ElementData {
  instanceId: string; 
  x: number;
  y: number;
  isDragging: boolean;
  isLoading?: boolean; 
}

export interface CraftingResult {
  result: string;
  emoji: string;
  isNew: boolean;
  colors: string[]; 
}

export enum GameState {
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
}

export interface ExtractionRequest {
  sourceText: string;
}

export interface FloatingTextData {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string; 
  size: 'sm' | 'lg';
}

export interface PetData {
  id: string;
  name: string;
  emoji: string;
  color: string; // Tailwind text color class or Hex
  description: string;
  createdAt: number;
}

export type DecorationCategory = 'background' | 'upgrade';

// Removed static pets from ID list as they are now dynamic
export type ShopItemId = 
  | 'runes' | 'binary' | 'bubbles' | 'nebula' // Backgrounds
  | 'firework_boom' | 'firework_color'; // Visual Upgrades

export interface ShopItem {
  id: ShopItemId;
  category: DecorationCategory;
  name: string;
  emoji: string;
  description: string;
}
