'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Download, Video } from 'lucide-react';
import { Button } from './ui/Button';
import { MATCH_TYPES, getRandomMatchType, operators, getRandomOperator, generateLoadout } from '../data/operators';
import { Operator, Loadout } from '../data/types';
import * as r6operators from 'r6operators';

interface AnimationExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
        console.warn(`Failed to load image: ${src}`);
        resolve(img); // resolve anyway to avoid breaking animation
    };
    img.src = src;
  });
};

const preloadSvg = (svgString: string): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    const img = new Image();
    const modifiedSvg = svgString.replace(/currentColor/g, 'white').replace(/<svg /, '<svg fill="white" ');
    const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(modifiedSvg)}`;
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
        console.warn('Failed to load SVG');
        resolve(img);
    };
    img.src = dataUri;
  });
};

export function AnimationExporterModal({ isOpen, onClose }: AnimationExporterModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  
  const [exportMode, setExportMode] = useState<'matchType' | 'operator'>('operator');
  const [targetOperatorId, setTargetOperatorId] = useState<string>('random');

  // Clear canvas on open or state change
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        if (exportMode === 'matchType') {
           drawFrameMatchType(ctx, "MATCH TYPE", "rgba(255, 255, 255, 0.5)", 0, 0);
        } else {
           drawFrameOperator(ctx, "ANY", "OPERATOR", '#ffffff', '#eab308', 0, 0, null, null, null);
        }
      }
    }
  }, [isOpen, exportMode, targetOperatorId]);

  const drawFrameMatchType = (
    ctx: CanvasRenderingContext2D, 
    text: string, 
    color: string, 
    offsetY = 0, 
    blur = 0
  ) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    ctx.clearRect(0, 0, width, height);
    
    ctx.save();
    ctx.textAlign = 'center';
    if (blur > 0) ctx.filter = `blur(${blur}px)`;
    
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.font = '900 80px ui-sans-serif, system-ui, sans-serif'; 
    ctx.fillText(text.toUpperCase(), width / 2, height / 2 + offsetY);
    ctx.restore();
  };

  const drawFrameOperator = (
    ctx: CanvasRenderingContext2D,
    side: string,
    name: string,
    nameColor: string,
    sideColor: string,
    offsetY: number,
    blur: number,
    bgImg: HTMLImageElement | null,
    iconImg: HTMLImageElement | null,
    loadout: Loadout | null,
    revealProgress = 0
  ) => {
      const width = ctx.canvas.width;
      const height = ctx.canvas.height;
      ctx.clearRect(0, 0, width, height);
      
      ctx.save();
      
      // Draw card background
      ctx.fillStyle = '#18181b'; // zinc-900
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 12);
      ctx.fill();
      ctx.clip();

      // Draw background image
      if (bgImg && revealProgress > 0) {
          ctx.globalAlpha = 0.4 * revealProgress;
          // Calculate cover aspect ratio
          const imgRatio = bgImg.width / bgImg.height;
          const canvasRatio = width / height;
          let drawW = width;
          let drawH = height;
          let drawX = 0;
          let drawY = 0;

          if (imgRatio > canvasRatio) {
              drawW = height * imgRatio;
              drawX = (width - drawW) / 2;
          } else {
              drawH = width / imgRatio;
              drawY = (height - drawH) / 2;
          }
          
          ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
          ctx.globalAlpha = 1.0;
          
          // Draw gradient overlay
          const grad = ctx.createLinearGradient(0, 0, 0, height);
          grad.addColorStop(0, 'rgba(24,24,27,0.1)');
          grad.addColorStop(0.5, 'rgba(24,24,27,0.4)');
          grad.addColorStop(1, 'rgba(24,24,27,0.95)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
      }

      ctx.restore(); // remove clip
      
      // Draw border
      ctx.save();
      ctx.strokeStyle = '#27272a'; // zinc-800
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(1, 1, width - 2, height - 2, 12);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      if (blur > 0) ctx.filter = `blur(${blur}px)`;
      
      // Draw Top Left (Side and Name)
      ctx.textAlign = 'left';
      
      // Side
      ctx.fillStyle = sideColor;
      ctx.font = 'bold 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(side.toUpperCase(), 24, 40 + offsetY);

      // Name
      ctx.fillStyle = nameColor;
      ctx.font = '900 48px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(name.toUpperCase(), 24, 85 + offsetY);

      // Draw Icon
      if (iconImg && revealProgress > 0) {
          ctx.globalAlpha = revealProgress;
          ctx.drawImage(iconImg, width - 64 - 24, 24, 64, 64);
          ctx.globalAlpha = 1.0;
      }

      // Draw Loadout
      if (loadout && revealProgress > 0) {
          ctx.globalAlpha = revealProgress;
          const items = [
              { label: 'PRIMARY WEAPON', value: loadout.primary },
              { label: 'SECONDARY WEAPON', value: loadout.secondary },
              { label: 'GADGET', value: loadout.gadget },
          ];

          let startY = height - (3 * 68) - 32; // Start from bottom
          items.forEach(item => {
              // Yellow line
              ctx.fillStyle = 'rgba(234, 179, 8, 0.5)';
              ctx.fillRect(24, startY, 4, 52);

              // Background box
              ctx.fillStyle = 'rgba(0,0,0,0.6)';
              ctx.beginPath();
              ctx.roundRect(28, startY, width - 52, 52, [0, 8, 8, 0]);
              ctx.fill();

              // Label
              ctx.fillStyle = 'rgba(234, 179, 8, 0.8)';
              ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
              ctx.fillText(item.label, 40, startY + 20);

              // Value
              ctx.fillStyle = '#ffffff';
              ctx.font = '900 22px ui-sans-serif, system-ui, sans-serif';
              ctx.fillText(item.value, 40, startY + 44);

              startY += 68;
          });
          ctx.globalAlpha = 1.0;
      }

      ctx.restore();
  };

  const startAnimationAndRecord = async (record: boolean) => {
    if (!canvasRef.current || isRecording || isPreviewing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (record) setIsRecording(true);
    else setIsPreviewing(true);

    let mediaRecorder: MediaRecorder | null = null;
    let chunks: BlobPart[] = [];

    // Preload assets if operator mode
    let bgImg: HTMLImageElement | null = null;
    let iconImg: HTMLImageElement | null = null;
    let loadout: Loadout | null = null;
    
    let finalType = '';
    let finalOp: Operator | null = null;

    if (exportMode === 'matchType') {
        finalType = getRandomMatchType();
    } else {
        if (targetOperatorId === 'random') {
            finalOp = getRandomOperator();
        } else {
            finalOp = operators.find(o => o.id === targetOperatorId) || getRandomOperator();
        }
        
        loadout = generateLoadout(finalOp);
        
        try {
            bgImg = await preloadImage(`/ops/${finalOp.id}.jpg`);
            const opIconData = (r6operators as any)[finalOp.id];
            if (opIconData) {
                const svgString = opIconData.toSVG({ width: "100%", height: "100%" });
                iconImg = await preloadSvg(svgString);
            }
        } catch (err) {
            console.error("Failed to preload assets", err);
        }
    }

    if (record) {
      try {
        const stream = canvas.captureStream(60); // 60 FPS
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${exportMode}-animation-${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
          setIsRecording(false);
        };
        mediaRecorder.start();
      } catch (err) {
        console.error("MediaRecorder error", err);
        alert("Recording failed. Your browser might not support transparent WebM recording.");
        setIsRecording(false);
        return;
      }
    }

    const duration = 4500; // ms
    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (exportMode === 'matchType') {
          if (progress < 0.8) {
            const offsetY = Math.sin(elapsed / 20) * 10;
            const typeIndex = Math.floor(elapsed / 50) % MATCH_TYPES.length;
            drawFrameMatchType(ctx, MATCH_TYPES[typeIndex], '#eab308', offsetY, 1.5);
          } else if (progress < 1) {
            const blur = (1 - progress) * 5;
            drawFrameMatchType(ctx, finalType, '#eab308', 0, blur);
          } else {
            drawFrameMatchType(ctx, finalType, '#eab308', 0, 0);
          }
      } else {
          // Operator mode
          // 0 -> 1.6s (Rolling)
          // 1.6s -> 2.0s (Reveal)
          // 2.0s -> 4.5s (Hold)
          if (elapsed < 1600) {
              const offsetY = Math.sin(elapsed / 20) * 5;
              const opIndex = Math.floor(elapsed / 50) % operators.length;
              const currentOp = operators[opIndex];
              const sideColor = currentOp.side === 'attacker' ? '#f97316' : '#3b82f6';
              drawFrameOperator(ctx, currentOp.side, currentOp.name, '#ffffff', sideColor, offsetY, 1.5, null, null, null, 0);
          } else if (elapsed < 2000) {
              const revealProgress = (elapsed - 1600) / 400;
              const sideColor = finalOp!.side === 'attacker' ? '#f97316' : '#3b82f6';
              drawFrameOperator(ctx, finalOp!.side, finalOp!.name, '#ffffff', sideColor, 0, 0, bgImg, iconImg, loadout, revealProgress);
          } else {
              const sideColor = finalOp!.side === 'attacker' ? '#f97316' : '#3b82f6';
              drawFrameOperator(ctx, finalOp!.side, finalOp!.name, '#ffffff', sideColor, 0, 0, bgImg, iconImg, loadout, 1.0);
          }
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          if (record && mediaRecorder) {
            mediaRecorder.stop();
          } else {
            setIsPreviewing(false);
          }
        }, 500);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-yellow-500" />
            <h2 className="font-bold text-lg text-white">Export Animation</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors" disabled={isRecording}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center max-h-[80vh] overflow-y-auto">
           <p className="text-zinc-400 text-sm mb-6 text-center">
             Generate a <b>WebM video with a transparent background</b> for your overlays.
           </p>

           <div className="w-full flex gap-4 mb-6">
               <div className="flex-1 space-y-2">
                   <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Animation Type</label>
                   <select 
                       value={exportMode} 
                       onChange={(e) => setExportMode(e.target.value as 'matchType' | 'operator')}
                       disabled={isRecording || isPreviewing}
                       className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 outline-none"
                   >
                       <option value="operator">Operator Roll (Card)</option>
                       <option value="matchType">Match Type Roll (Text)</option>
                   </select>
               </div>

               {exportMode === 'operator' && (
                   <div className="flex-1 space-y-2">
                       <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Target Operator</label>
                       <select 
                           value={targetOperatorId} 
                           onChange={(e) => setTargetOperatorId(e.target.value)}
                           disabled={isRecording || isPreviewing}
                           className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 outline-none"
                       >
                           <option value="random">Random (Any)</option>
                           {operators.map(op => (
                               <option key={op.id} value={op.id}>{op.name}</option>
                           ))}
                       </select>
                   </div>
               )}
           </div>

           <div className="checkerboard-bg rounded-xl border border-zinc-700/50 p-4 mb-8 w-full flex justify-center">
             <canvas 
               ref={canvasRef} 
               width={exportMode === 'matchType' ? 800 : 400} 
               height={exportMode === 'matchType' ? 300 : 600} 
               className="w-full max-w-lg bg-transparent"
             />
           </div>

           <div className="flex gap-4">
             <Button 
               variant="outline" 
               onClick={() => startAnimationAndRecord(false)}
               disabled={isRecording || isPreviewing}
             >
               Preview
             </Button>
             <Button 
               variant="primary" 
               className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
               onClick={() => startAnimationAndRecord(true)}
               disabled={isRecording || isPreviewing}
               icon={Download}
             >
               {isRecording ? 'Recording...' : 'Record & Download WebM'}
             </Button>
           </div>
        </div>

      </div>
      <style>{`
        .checkerboard-bg {
          background-image: linear-gradient(45deg, #18181b 25%, transparent 25%),
            linear-gradient(-45deg, #18181b 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #18181b 75%),
            linear-gradient(-45deg, transparent 75%, #18181b 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
      `}</style>
    </div>
  );
}
