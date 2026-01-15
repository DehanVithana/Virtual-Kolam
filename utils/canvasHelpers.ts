import { KolamItem, KolamType } from "../types";
import { KOLAM_ASSETS } from "../constants";

// Helper to render an SVG string from the React Component
// In a real production app, we might use an SVG library, but here we serialize the static SVGs defined in constants.
const getSvgString = (type: KolamType): string => {
  // We need to render the component to a string string. 
  // Since we are in a browser, we can't easily use ReactDOMServer.
  // Instead, we will store the raw SVG strings here for the canvas renderer to use specifically.
  
  // Simplified paths matching constants.tsx for canvas rendering
  // Note: For a robust app, we would load actual .svg files. 
  // Here we approximate the look for the canvas export since we can't easily rasterize React components to canvas without html2canvas (which is heavy).
  
  // FALLBACK: Use simple drawing or simplified SVG Data URIs.
  // To keep this file simple and robust, we will use a workaround:
  // We will assume the React rendering is for "Edit Mode" and for "Capture", we rely on the logic in App.tsx
  // which will use a more robust method: drawing the video to a canvas, converting that to a data URL,
  // then overlaying the DOM elements using HTML absolute positioning, and snapshotting the container?
  // No, `html2canvas` is too heavy.
  
  // STRATEGY: We will render the SVGs as Data URIs.
  
  const colors = {
    white: '#FFFFFF',
    potBody: '#D4A373',
    potRim: '#795548',
    sugarStalk: '#4CAF50',
    sun: '#FFC107'
  };

  switch (type) {
    case KolamType.POT:
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M30,40 Q20,60 30,80 Q50,95 70,80 Q80,60 70,40" fill="${colors.potBody}" stroke="${colors.potRim}" stroke-width="2"/><path d="M30,40 L70,40 L75,30 L25,30 Z" fill="#E6BE8A" stroke="${colors.potRim}" stroke-width="2"/><path d="M35,30 Q50,20 65,30" fill="white" stroke="#FFF" stroke-width="3"/></svg>`;
    case KolamType.SUGARCANE:
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 150"><path d="M25,140 L25,20" stroke="${colors.sugarStalk}" stroke-width="8" stroke-linecap="round"/><path d="M25,20 Q10,10 5,30" stroke="#81C784" stroke-width="4" fill="none"/><path d="M25,20 Q40,10 45,30" stroke="#81C784" stroke-width="4" fill="none"/></svg>`;
    case KolamType.SUN:
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="20" fill="${colors.sun}" stroke="#FF9800" stroke-width="2"/><line x1="50" y1="50" x2="50" y2="10" stroke="#FF9800" stroke-width="4"/><line x1="50" y1="50" x2="90" y2="50" stroke="#FF9800" stroke-width="4"/><line x1="50" y1="50" x2="50" y2="90" stroke="#FF9800" stroke-width="4"/><line x1="50" y1="50" x2="10" y2="50" stroke="#FF9800" stroke-width="4"/></svg>`;
    case KolamType.DOTS_SIMPLE:
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50,10 L90,50 L50,90 L10,50 Z" stroke="white" stroke-width="3" fill="none"/><circle cx="50" cy="50" r="5" fill="white"/></svg>`;
    case KolamType.DOTS_COMPLEX:
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50,20 Q80,20 80,50 Q80,80 50,80 Q20,80 20,50 Q20,20 50,20" stroke="white" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="10" stroke="white" stroke-width="2" fill="none"/></svg>`;
    case KolamType.FLOWER:
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="10" fill="#FFEB3B"/><ellipse cx="50" cy="25" rx="10" ry="20" fill="#E91E63" opacity="0.8"/><ellipse cx="50" cy="75" rx="10" ry="20" fill="#E91E63" opacity="0.8"/><ellipse cx="25" cy="50" rx="20" ry="10" fill="#E91E63" opacity="0.8"/><ellipse cx="75" cy="50" rx="20" ry="10" fill="#E91E63" opacity="0.8"/></svg>`;
    default:
        return `<svg></svg>`;
  }
}

export const captureCanvas = async (
  videoRef: React.RefObject<HTMLVideoElement>,
  imgRef: React.RefObject<HTMLImageElement>, // Fallback image
  items: KolamItem[],
  containerWidth: number,
  containerHeight: number
): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = containerWidth;
  canvas.height = containerHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get context');

  // 1. Draw Background (Video or Image)
  if (videoRef.current && videoRef.current.readyState === 4) {
    // Determine Scale to cover
    const vid = videoRef.current;
    const vRatio = vid.videoWidth / vid.videoHeight;
    const cRatio = canvas.width / canvas.height;
    
    let drawW, drawH, startX, startY;

    if (vRatio > cRatio) {
        drawH = canvas.height;
        drawW = drawH * vRatio;
        startX = (canvas.width - drawW) / 2;
        startY = 0;
    } else {
        drawW = canvas.width;
        drawH = drawW / vRatio;
        startX = 0;
        startY = (canvas.height - drawH) / 2;
    }
    ctx.drawImage(vid, startX, startY, drawW, drawH);
  } else if (imgRef.current) {
    // Draw uploaded image
     const img = imgRef.current;
     const iRatio = img.naturalWidth / img.naturalHeight;
     const cRatio = canvas.width / canvas.height;
     let drawW, drawH, startX, startY;
     
     if (iRatio > cRatio) {
         drawH = canvas.height;
         drawW = drawH * iRatio;
         startX = (canvas.width - drawW) / 2;
         startY = 0;
     } else {
         drawW = canvas.width;
         drawH = drawW / iRatio;
         startX = 0;
         startY = (canvas.height - drawH) / 2;
     }
     ctx.drawImage(img, startX, startY, drawW, drawH);
  } else {
    ctx.fillStyle = '#333';
    ctx.fillRect(0,0, canvas.width, canvas.height);
  }

  // 2. Draw Items
  const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });

  for (const item of items) {
    const svgString = getSvgString(item.type);
    const blob = new Blob([svgString], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const img = await loadImage(url);

    ctx.save();
    // Move to item position
    ctx.translate(item.x, item.y);
    ctx.rotate((item.rotation * Math.PI) / 180);
    ctx.scale(item.scale, item.scale);
    
    // Draw centered
    // Assumes base size of 100x100 for simplicity in logic
    ctx.drawImage(img, -50, -50, 100, 100);
    
    ctx.restore();
    URL.revokeObjectURL(url);
  }

  return canvas.toDataURL('image/png');
};
