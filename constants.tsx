import React from 'react';
import { KolamType } from './types';

// Asset Map returning SVG components
export const KOLAM_ASSETS: Record<KolamType, (props: { className?: string }) => React.JSX.Element> = {
  [KolamType.POT]: ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      {/* Paal Panai (Pot) */}
      <path d="M30,40 Q20,60 30,80 Q50,95 70,80 Q80,60 70,40" fill="#D4A373" stroke="#795548" />
      <path d="M30,40 L70,40 L75,30 L25,30 Z" fill="#E6BE8A" stroke="#795548" />
      {/* Overflowing Milk */}
      <path d="M35,30 Q50,20 65,30" fill="white" stroke="#FFF" strokeWidth="3" />
      <path d="M40,30 Q40,50 42,60" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M50,30 Q55,50 52,65" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M60,30 Q60,50 58,55" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  [KolamType.SUGARCANE]: ({ className }) => (
    <svg viewBox="0 0 50 150" className={className} fill="none" stroke="currentColor">
      {/* Stalk */}
      <path d="M25,140 L25,20" stroke="#4CAF50" strokeWidth="8" strokeLinecap="round" />
      {/* Segments */}
      <line x1="20" y1="40" x2="30" y2="40" stroke="#2E7D32" strokeWidth="2" />
      <line x1="20" y1="70" x2="30" y2="70" stroke="#2E7D32" strokeWidth="2" />
      <line x1="20" y1="100" x2="30" y2="100" stroke="#2E7D32" strokeWidth="2" />
      {/* Leaves */}
      <path d="M25,20 Q10,10 5,30" stroke="#81C784" strokeWidth="4" fill="none" />
      <path d="M25,20 Q40,10 45,30" stroke="#81C784" strokeWidth="4" fill="none" />
      <path d="M25,20 Q25,5 25,0" stroke="#81C784" strokeWidth="4" />
    </svg>
  ),
  [KolamType.SUN]: ({ className }) => (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="20" fill="#FFC107" stroke="#FF9800" strokeWidth="2" />
      {[...Array(8)].map((_, i) => (
        <line
          key={i}
          x1="50" y1="50" x2="50" y2="10"
          stroke="#FF9800"
          strokeWidth="4"
          transform={`rotate(${i * 45} 50 50)`}
        />
      ))}
    </svg>
  ),
  [KolamType.DOTS_SIMPLE]: ({ className }) => (
    <svg viewBox="0 0 100 100" className={className}>
      <path d="M50,10 L90,50 L50,90 L10,50 Z" stroke="black" strokeWidth="3" fill="none" />
      <circle cx="50" cy="50" r="5" fill="black" />
      <circle cx="10" cy="50" r="3" fill="black" />
      <circle cx="90" cy="50" r="3" fill="black" />
      <circle cx="50" cy="10" r="3" fill="black" />
      <circle cx="50" cy="90" r="3" fill="black" />
    </svg>
  ),
  [KolamType.DOTS_COMPLEX]: ({ className }) => (
    <svg viewBox="0 0 100 100" className={className}>
      <path d="M50,20 Q80,20 80,50 Q80,80 50,80 Q20,80 20,50 Q20,20 50,20" stroke="black" strokeWidth="2" fill="none" />
      <path d="M50,10 L50,90" stroke="black" strokeWidth="2" />
      <path d="M10,50 L90,50" stroke="black" strokeWidth="2" />
      <circle cx="50" cy="50" r="10" stroke="black" strokeWidth="2" fill="none" />
    </svg>
  ),
  [KolamType.FLOWER]: ({ className }) => (
    <svg viewBox="0 0 100 100" className={className}>
       {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <ellipse
            key={i}
            cx="50" cy="30" rx="10" ry="25"
            fill="black"
            stroke="white"
            strokeWidth="1"
            transform={`rotate(${deg} 50 50)`}
            opacity="0.9"
          />
       ))}
       <circle cx="50" cy="50" r="10" fill="black" />
    </svg>
  ),
};

export const INITIAL_SCALE = 1;
export const MAX_ITEMS = 15;