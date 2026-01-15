export enum KolamType {
  POT = 'POT',
  SUGARCANE = 'SUGARCANE',
  SUN = 'SUN',
  DOTS_SIMPLE = 'DOTS_SIMPLE',
  DOTS_COMPLEX = 'DOTS_COMPLEX',
  FLOWER = 'FLOWER'
}

export interface KolamItem {
  id: string;
  type: KolamType;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface GeminResponseState {
  status: 'idle' | 'loading' | 'success' | 'error';
  imageUrl?: string;
  error?: string;
}

export type ToolMode = 'move' | 'delete';