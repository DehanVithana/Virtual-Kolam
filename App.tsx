import React, { useState, useRef, useEffect } from 'react';
import { VideoOff } from 'lucide-react';
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
  
  // Gesture Refs
  const touchStartRef = useRef<{ x: number; y: number; dist: number; angle: number } | null>(null);
  const initialItemStateRef = useRef<KolamItem | null>(null);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, // Rear camera preferred
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        setPermissionDenied(true);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once

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

  // Upload Background
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedImage(ev.target?.result as string);
        // Stop camera if running to save battery
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
          setStream(null);
        }
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
    <div className="relative w-full h-screen overflow-hidden bg-pongal-cream font-sans touch-none">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-6 pb-12 bg-gradient-to-b from-black/90 to-transparent pointer-events-none flex flex-col items-center gap-2">
        <h1 className="text-pongal-turmeric text-3xl font-serif font-bold tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center uppercase">
          🌾 Thai Pongal AR 🌾
        </h1>
        <div className="pointer-events-auto bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-lg transform active:scale-95 transition-transform">
           <p className="text-white/90 text-xs font-medium tracking-wide">
             Developed by <a href="https://dehanvithana.com" target="_blank" rel="noopener noreferrer" className="text-pongal-turmeric hover:text-pongal-sugarcane transition-colors font-bold border-b border-transparent hover:border-pongal-sugarcane">Dehan Vithana</a>
           </p>
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
                  <div className="absolute -inset-4 border-2 border-dashed border-white/50 rounded-full animate-pulse pointer-events-none" />
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
        onUpload={() => {}} // Triggered by label in Toolbar component 
        isCameraActive={!uploadedImage && !permissionDenied}
      />
      
      {/* Hidden file input handler connected to Toolbar via ID or ref would be cleaner, 
          but simpler to pass handler logic if we restructure. 
          For now, Toolbar handles the file input UI. We need to pass the handler logic down. 
          Actually Toolbar has the input inside the label. We just need the event.
      */}
      <div className="hidden">
         <input type="file" id="upload-hidden" onChange={handleUpload} />
      </div>

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