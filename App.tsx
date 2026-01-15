import React, { useState, useRef, useEffect } from 'react';
import { VideoOff, X, Sparkles } from 'lucide-react';
import { KolamItem, KolamType, GeminResponseState } from './types';
import { KOLAM_ASSETS, MAX_ITEMS } from './constants';
import { Toolbar, ResultModal } from './components/AppUI';
import { captureCanvas } from './utils/canvasHelpers';
import { generateRealKolam } from './services/geminiService';

export default function App() {
  // State
  const [items, setItems] = useState<KolamItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [geminiState, setGeminiState] = useState<GeminResponseState>({ status: 'idle' });

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // We use a Ref for the stream to ensure we always have access to the latest instance
  const streamRef = useRef<MediaStream | null>(null);
  
  // Gesture Refs
  const touchStartRef = useRef<{ x: number; y: number; dist: number; angle: number } | null>(null);
  const initialItemStateRef = useRef<KolamItem | null>(null);

  // Helper: Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  };

  // Helper: Start Camera
  const startCamera = async () => {
    stopCamera(); // Ensure cleanup first

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Rear camera preferred
        audio: false,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setPermissionDenied(false);
    } catch (err) {
      console.error("Camera error:", err);
      setPermissionDenied(true);
      setStream(null);
    }
  };

  // Effect: Bind Stream to Video Element
  useEffect(() => {
    // Only bind if we have a stream and we are NOT showing an uploaded image
    if (videoRef.current && stream && !uploadedImage) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Video play error:", e));
    }
  }, [stream, uploadedImage]); 

  // Effect: Initialize Camera on Mount
  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Add Item
  const addItem = (type: KolamType) => {
    if (items.length >= MAX_ITEMS) return;
    
    // Center of screen logic
    const container = containerRef.current;
    const centerX = container ? container.clientWidth / 2 : 150;
    const centerY = container ? container.clientHeight / 2 : 300;

    const newItem: KolamItem = {
      id: crypto.randomUUID(),
      type,
      x: centerX,
      y: centerY,
      scale: 1,
      rotation: 0,
    };
    setItems(prev => [...prev, newItem]);
    setActiveId(newItem.id);
  };

  // Delete Item
  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (activeId === id) setActiveId(null);
  };

  // Reset App (Restart)
  const handleReset = () => {
    // Removed window.confirm to ensure the button action always fires immediately
    
    // 1. Stop existing camera to be safe
    stopCamera();

    // 2. Clear All State
    setItems([]);
    setActiveId(null);
    setUploadedImage(null);
    setCapturedImage(null);
    setGeminiState({ status: 'idle' });
    setIsModalOpen(false);
    setPermissionDenied(false);

    // 3. Restart Camera
    // setTimeout is crucial here: it allows React to perform the render cycle 
    // where `uploadedImage` becomes null and <video> element is mounted.
    // Only then can we attach the stream to videoRef.current.
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  // Upload Background
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedImage(ev.target?.result as string);
        stopCamera(); // Stop camera when image is loaded
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // --- Gesture Handling (Touch) ---
  
  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  };

  const getAngle = (t1: React.Touch, t2: React.Touch) => {
    return (Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180) / Math.PI;
  };

  const handleTouchStart = (e: React.TouchEvent, itemId: string) => {
    e.stopPropagation(); // Prevent container scroll
    setActiveId(itemId);
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    initialItemStateRef.current = { ...item };

    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        dist: 0,
        angle: 0
      };
    } else if (e.touches.length === 2) {
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        dist: getDistance(e.touches[0], e.touches[1]),
        angle: getAngle(e.touches[0], e.touches[1])
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!activeId || !touchStartRef.current || !initialItemStateRef.current) return;
    e.preventDefault(); // Stop scrolling

    const item = initialItemStateRef.current;

    if (e.touches.length === 1) {
      // Drag
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      
      setItems(prev => prev.map(i => 
        i.id === activeId ? { ...i, x: item.x + dx, y: item.y + dy } : i
      ));
    } else if (e.touches.length === 2) {
      // Pinch / Rotate
      const currentDist = getDistance(e.touches[0], e.touches[1]);
      const currentAngle = getAngle(e.touches[0], e.touches[1]);
      
      const scaleFactor = currentDist / touchStartRef.current.dist;
      const angleDiff = currentAngle - touchStartRef.current.angle;

      setItems(prev => prev.map(i => 
        i.id === activeId ? { 
          ...i, 
          scale: Math.max(0.5, Math.min(3, item.scale * scaleFactor)),
          rotation: item.rotation + angleDiff
        } : i
      ));
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    initialItemStateRef.current = null;
  };

  // --- Capture & AI ---

  const processAI = async (imageDataUrl: string) => {
    setGeminiState({ status: 'loading' });
    try {
      const resultUrl = await generateRealKolam(imageDataUrl.split(',')[1]); // Send base64 part
      setGeminiState({ status: 'success', imageUrl: resultUrl });
    } catch (err: any) {
      setGeminiState({ status: 'error', error: "AI generation failed. Please try again." });
    }
  };

  const handleCapture = async () => {
    if (!containerRef.current) return;
    
    // Deselect items for clean capture
    setActiveId(null);
    
    // Brief delay to allow UI to update (remove selection border)
    setTimeout(async () => {
      try {
        const dataUrl = await captureCanvas(
          videoRef, 
          imgRef, 
          items, 
          containerRef.current!.clientWidth, 
          containerRef.current!.clientHeight
        );
        setCapturedImage(dataUrl);
        setIsModalOpen(true);
        
        // Auto trigger AI
        processAI(dataUrl);
        
      } catch (err) {
        console.error("Capture failed", err);
        alert("Failed to capture image");
      }
    }, 100);
  };

  const handleRetryAI = () => {
    if (capturedImage) {
      processAI(capturedImage);
    }
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-pongal-cream font-sans touch-none">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-8 pb-12 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none flex flex-col items-center gap-4">
        
        <div className="flex flex-col items-center px-4 text-center">
           <span className="text-white/80 text-[10px] md:text-xs font-sans tracking-[0.4em] uppercase mb-2 border-b border-white/10 pb-1">
             Thai Pongal
           </span>
           <h1 className="flex items-center gap-2 md:gap-4 text-pongal-turmeric text-3xl md:text-4xl font-serif font-light tracking-[0.1em] drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] uppercase">
             <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-pongal-cream opacity-80" />
             Virtual Kolam
             <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-pongal-cream opacity-80" />
           </h1>
        </div>

        <div className="pointer-events-auto bg-black/40 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/10 shadow-xl transform active:scale-95 transition-transform hover:bg-black/50">
           <div className="flex flex-col items-center justify-center gap-0.5">
             <div className="flex items-center gap-1 text-[10px] text-white/70 uppercase tracking-widest">
                <span>Concept by</span>
                <span className="text-white font-semibold">Dehan Vithana</span>
             </div>
             <a 
               href="https://dehanvithana.com" 
               target="_blank" 
               rel="noopener noreferrer" 
               className="text-[10px] text-pongal-turmeric hover:text-pongal-cream transition-colors tracking-widest border-b border-transparent hover:border-pongal-turmeric/50 font-mono"
             >
               dehanvithana.com
             </a>
           </div>
        </div>
      </div>

      {/* Main AR Stage */}
      <div 
        ref={containerRef}
        className="relative w-full h-full bg-black overflow-hidden"
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background Layer */}
        {uploadedImage ? (
           <img 
            ref={imgRef}
            src={uploadedImage} 
            alt="Background" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            {permissionDenied && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-neutral-800 p-8 text-center">
                <VideoOff size={48} className="mb-4 text-red-400" />
                <p>Camera access denied or unavailable.</p>
                <p className="text-sm text-neutral-400 mt-2">Please upload a photo of your floor instead.</p>
              </div>
            )}
          </>
        )}

        {/* Overlay Layer (Kolam Items) */}
        {items.map((item) => {
          const Asset = KOLAM_ASSETS[item.type];
          const isActive = activeId === item.id;
          
          return (
            <div
              key={item.id}
              className={`absolute w-[100px] h-[100px] flex items-center justify-center cursor-move select-none ${isActive ? 'z-10' : 'z-0'}`}
              style={{
                transform: `translate(${item.x - 50}px, ${item.y - 50}px) rotate(${item.rotation}deg) scale(${item.scale})`,
                touchAction: 'none'
              }}
              onTouchStart={(e) => handleTouchStart(e, item.id)}
              onMouseDown={() => setActiveId(item.id)} // Desktop fallback for testing
            >
              <div className={`relative w-full h-full transition-shadow ${isActive ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]' : ''}`}>
                <Asset className="w-full h-full filter drop-shadow-lg" />
                {isActive && (
                  <>
                    <div className="absolute -inset-4 border-2 border-dashed border-white/50 rounded-full animate-pulse pointer-events-none" />
                    <button
                        className="absolute -top-6 -right-6 w-9 h-9 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white z-30 active:scale-90 transition-transform"
                        onTouchEnd={(e) => {
                            e.stopPropagation();
                            deleteItem(item.id);
                        }}
                        onClick={(e) => { // Mouse click fallback
                            e.stopPropagation();
                            deleteItem(item.id);
                        }}
                    >
                        <X size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Hint Overlay (Disappears after adding first item) */}
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
             <div className="bg-black/40 text-white px-6 py-3 rounded-full backdrop-blur-sm">
                Add a design to start
             </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <Toolbar 
        onAdd={addItem} 
        onCapture={handleCapture} 
        onUpload={handleUpload}
        onReset={handleReset}
        isCameraActive={!uploadedImage && !permissionDenied}
      />
      
      {/* Result Modal */}
      <ResultModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        originalImage={capturedImage}
        geminiState={geminiState}
        onGenerateAI={handleRetryAI}
      />
    </div>
  );
}
