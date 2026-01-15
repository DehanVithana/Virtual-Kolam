import React from 'react';
import { Camera, Upload, RefreshCw, Download, Sparkles, X, Plus, RotateCcw } from 'lucide-react';
import { KolamType, GeminResponseState } from '../types';
import { KOLAM_ASSETS } from '../constants';

interface ToolbarProps {
  onAdd: (type: KolamType) => void;
  onCapture: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  isCameraActive: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onAdd, onCapture, onUpload, onReset, isCameraActive }) => {
  return (
    <div 
      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 z-20"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex flex-col items-center gap-6">
        
        {/* Kolam Selector Scroll */}
        <div className="w-full overflow-x-auto no-scrollbar pb-2">
          <div className="flex gap-4 px-4 justify-center md:justify-start min-w-full md:min-w-0">
            {Object.keys(KOLAM_ASSETS).map((key) => {
              const type = key as KolamType;
              const Icon = KOLAM_ASSETS[type];
              return (
                <button
                  key={key}
                  onClick={() => onAdd(type)}
                  className="flex-shrink-0 w-14 h-14 md:w-16 md:h-16 bg-pongal-cream/90 rounded-full border-2 border-pongal-maroon shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                >
                  <Icon className="w-8 h-8 md:w-10 md:h-10" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Actions */}
        <div className="flex items-center justify-center gap-8 w-full max-w-sm px-4 pb-2">
          <label className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white cursor-pointer hover:bg-white/20 active:scale-95 transition-transform border border-white/20">
            <Upload size={24} />
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                onUpload(e);
                // Reset input value to allow re-uploading the same file if needed
                e.target.value = '';
              }} 
            />
          </label>

          {/* Shutter Button - Ring Style */}
          <button
            onClick={onCapture}
            className="group relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] active:scale-95 transition-transform"
            aria-label="Capture Photo"
          >
            {/* Inner Circle */}
            <div className="w-16 h-16 bg-pongal-turmeric rounded-full border-2 border-white/50 shadow-inner group-active:scale-90 transition-transform duration-100" />
          </button>

          <button
            onClick={onReset}
            className="p-3 bg-red-500/80 backdrop-blur-md rounded-full text-white cursor-pointer hover:bg-red-600 active:scale-95 transition-transform border border-red-400/50"
            aria-label="Reset Canvas"
          >
             <RotateCcw size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalImage: string | null;
  geminiState: GeminResponseState;
  onGenerateAI: () => void; // Used for Retry now
}

export const ResultModal: React.FC<ResultModalProps> = ({ isOpen, onClose, originalImage, geminiState, onGenerateAI }) => {
  if (!isOpen || !originalImage) return null;

  // If success, show AI image. If loading, show Original (blurred) or Loading placeholder. 
  // If error, show Original.
  const displayImage = geminiState.status === 'success' && geminiState.imageUrl ? geminiState.imageUrl : originalImage;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 z-10">
        <X size={32} />
      </button>

      <div className="relative w-full max-w-md aspect-[3/4] bg-neutral-900 rounded-lg overflow-hidden shadow-2xl border border-neutral-800">
        <img 
          src={displayImage} 
          alt="Result" 
          className={`w-full h-full object-contain transition-opacity duration-500 ${geminiState.status === 'loading' ? 'opacity-50 blur-sm' : 'opacity-100'}`} 
        />
        
        {geminiState.status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-pongal-turmeric border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                 <Sparkles size={24} className="text-pongal-turmeric animate-pulse" />
              </div>
            </div>
            <p className="font-serif mt-4 text-lg animate-pulse text-pongal-cream">Sprinkling Rice Flour...</p>
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-6 w-full max-w-md">
        {geminiState.status === 'error' && (
           <button
             onClick={onGenerateAI}
             className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-900/50 text-red-200 border border-red-500 rounded-lg font-bold hover:bg-red-900/80"
           >
             <RotateCcw size={20} />
             Retry
           </button>
        )}

        <a
          href={displayImage}
          download="pongal-kolam.png"
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-pongal-turmeric text-black rounded-lg font-bold hover:bg-yellow-400 transition-all ${geminiState.status === 'loading' ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <Download size={20} />
          Save Photo
        </a>
      </div>
      
      {geminiState.error && (
        <p className="text-red-400 mt-4 text-sm text-center px-4 bg-black/50 p-2 rounded">{geminiState.error}</p>
      )}
    </div>
  );
};
