'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Download, Image as ImageIcon, LayoutTemplate, Type, Check, MousePointer2 } from 'lucide-react';
import { Button } from './ui/Button';
import { OperatorDisplay } from './OperatorDisplay';
import { operators, MATCH_TYPES } from '../data/operators';
import { Operator, Loadout, MatchType } from '../data/types';
import { toPng } from 'html-to-image';

interface ThumbnailEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOperator: Operator | null;
  defaultLoadout: Loadout | null;
  defaultMatchType?: MatchType | null;
  defaultKills: number;
  defaultDeaths: number;
}

export function ThumbnailEditorModal({
  isOpen,
  onClose,
  defaultOperator,
  defaultLoadout,
  defaultMatchType,
  defaultKills,
  defaultDeaths
}: ThumbnailEditorModalProps) {
  
  // Customization State
  const [selectedOpId, setSelectedOpId] = useState(defaultOperator?.id || operators[0].id);
  const selectedOperator = operators.find(op => op.id === selectedOpId) || operators[0];
  
  // Initialize loadout based on defaults or the first option
  const [primary, setPrimary] = useState(defaultLoadout?.primary || selectedOperator.primaries[0]);
  const [secondary, setSecondary] = useState(defaultLoadout?.secondary || selectedOperator.secondaries[0]);
  const [gadget, setGadget] = useState(defaultLoadout?.gadget || selectedOperator.gadgets[0]);
  const [matchType, setMatchType] = useState<MatchType>(defaultMatchType || MATCH_TYPES[0]);
  
  const [customTitle, setCustomTitle] = useState("");
  const [bgStyle, setBgStyle] = useState<"wallpaper" | "transparent" | "solid">("wallpaper");
  const [solidColor, setSolidColor] = useState("#00ff00");
  const [showStats, setShowStats] = useState(true);
  const [showLoadout, setShowLoadout] = useState(true);
  const [layoutFormat, setLayoutFormat] = useState<"horizontal" | "vertical">("horizontal");
  
  // Stats override
  const [kills, setKills] = useState(defaultKills);
  const [deaths, setDeaths] = useState(defaultDeaths);

  const [isExporting, setIsExporting] = useState(false);
  const exportNodeRef = useRef<HTMLDivElement>(null);

  // Update loadout dropdowns if operator changes to prevent invalid loadouts
  useEffect(() => {
    if (!selectedOperator.primaries.includes(primary)) setPrimary(selectedOperator.primaries[0]);
    if (!selectedOperator.secondaries.includes(secondary)) setSecondary(selectedOperator.secondaries[0]);
    if (!selectedOperator.gadgets.includes(gadget)) setGadget(selectedOperator.gadgets[0]);
  }, [selectedOpId]);

  // Sync defaults when modal opens
  useEffect(() => {
    if (isOpen) {
        setSelectedOpId(defaultOperator?.id || operators[0].id);
        setPrimary(defaultLoadout?.primary || (defaultOperator || operators[0]).primaries[0]);
        setSecondary(defaultLoadout?.secondary || (defaultOperator || operators[0]).secondaries[0]);
        setGadget(defaultLoadout?.gadget || (defaultOperator || operators[0]).gadgets[0]);
        setMatchType(defaultMatchType || MATCH_TYPES[0]);
        setKills(defaultKills);
        setDeaths(defaultDeaths);
    }
  }, [isOpen, defaultOperator, defaultLoadout, defaultMatchType, defaultKills, defaultDeaths]);

  const currentLoadout: Loadout = { primary, secondary, gadget };

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!exportNodeRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(exportNodeRef.current, { 
        cacheBust: true,
        backgroundColor: bgStyle === 'transparent' ? 'transparent' : undefined,
        // Enforce specific size based on format
        canvasWidth: layoutFormat === 'horizontal' ? 1920 : 1080,
        canvasHeight: layoutFormat === 'horizontal' ? 1080 : 1920
      });
      const link = document.createElement('a');
      link.download = `xawars-thumbnail-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-[1400px] h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-yellow-500" />
            <h2 className="font-bold text-lg text-white">Thumbnail Generator</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
          
          {/* Controls Sidebar */}
          <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-900/30 p-6 overflow-y-auto space-y-6">
            
            {/* Operator Selection */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-500 flex items-center gap-2">
                <MousePointer2 className="w-4 h-4" /> Loadout
              </h3>
              
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Operator</label>
                <select 
                  value={selectedOpId} 
                  onChange={(e) => setSelectedOpId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 text-white focus:border-yellow-500 outline-none"
                >
                  {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Primary</label>
                <select value={primary} onChange={e => setPrimary(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 text-white focus:border-yellow-500 outline-none">
                  {selectedOperator.primaries.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Secondary</label>
                <select value={secondary} onChange={e => setSecondary(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 text-white focus:border-yellow-500 outline-none">
                  {selectedOperator.secondaries.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Gadget</label>
                <select value={gadget} onChange={e => setGadget(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 text-white focus:border-yellow-500 outline-none">
                  {selectedOperator.gadgets.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Match Type</label>
                <select value={matchType} onChange={e => setMatchType(e.target.value as MatchType)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 text-white focus:border-yellow-500 outline-none">
                  {MATCH_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <hr className="border-zinc-800" />

            {/* Appearance */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-500 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Appearance
              </h3>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Format</label>
                <div className="flex gap-2">
                  <button onClick={() => setLayoutFormat('horizontal')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${layoutFormat === 'horizontal' ? 'bg-zinc-800 border-yellow-500 text-white' : 'border-zinc-700 text-zinc-500 hover:text-white'}`}>16:9</button>
                  <button onClick={() => setLayoutFormat('vertical')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${layoutFormat === 'vertical' ? 'bg-zinc-800 border-yellow-500 text-white' : 'border-zinc-700 text-zinc-500 hover:text-white'}`}>9:16</button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Background</label>
                <div className="flex gap-2">
                  <button onClick={() => setBgStyle('wallpaper')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${bgStyle === 'wallpaper' ? 'bg-zinc-800 border-yellow-500 text-white' : 'border-zinc-700 text-zinc-500 hover:text-white'}`}>Wallpaper</button>
                  <button onClick={() => setBgStyle('solid')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${bgStyle === 'solid' ? 'bg-zinc-800 border-yellow-500 text-white' : 'border-zinc-700 text-zinc-500 hover:text-white'}`}>Solid</button>
                  <button onClick={() => setBgStyle('transparent')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${bgStyle === 'transparent' ? 'bg-zinc-800 border-yellow-500 text-white' : 'border-zinc-700 text-zinc-500 hover:text-white'}`}>Transp.</button>
                </div>
                {bgStyle === 'solid' && (
                  <input type="color" value={solidColor} onChange={e => setSolidColor(e.target.value)} className="w-full h-8 mt-2 cursor-pointer bg-transparent rounded" />
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${showStats ? 'bg-yellow-500 border-yellow-500' : 'border-zinc-600'}`}>
                    {showStats && <Check className="w-3 h-3 text-black" />}
                  </div>
                  <span className="text-sm text-zinc-300 group-hover:text-white">Show Stats Counter</span>
                </label>
                {showStats && (
                  <div className="flex gap-2 pl-6">
                    <input type="number" value={kills} onChange={e => setKills(Number(e.target.value))} className="w-16 bg-zinc-900 border border-zinc-700 rounded p-1 text-sm text-white" title="Kills" />
                    <input type="number" value={deaths} onChange={e => setDeaths(Number(e.target.value))} className="w-16 bg-zinc-900 border border-zinc-700 rounded p-1 text-sm text-white" title="Deaths" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${showLoadout ? 'bg-yellow-500 border-yellow-500' : 'border-zinc-600'}`}>
                    {showLoadout && <Check className="w-3 h-3 text-black" />}
                  </div>
                  <span className="text-sm text-zinc-300 group-hover:text-white">Show Loadout Grid</span>
                </label>
              </div>

            </div>

            <hr className="border-zinc-800" />

            {/* Text Options */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-500 flex items-center gap-2">
                <Type className="w-4 h-4" /> Text Overlay
              </h3>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Custom Title</label>
                <input 
                  type="text" 
                  value={customTitle} 
                  onChange={e => setCustomTitle(e.target.value)} 
                  placeholder="e.g. 100 KILLS CHALLENGE"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 text-white focus:border-yellow-500 outline-none"
                />
              </div>
            </div>

          </div>

          {/* Preview Area */}
          <div className="flex-1 bg-zinc-950 p-8 flex items-center justify-center overflow-auto relative checkerboard-bg">
            
            {/* The actual exportable node */}
            <div 
              ref={exportNodeRef}
              className={`relative flex items-center justify-center shadow-2xl overflow-hidden shrink-0 transition-colors
                ${bgStyle === 'transparent' ? 'bg-transparent' : bgStyle === 'solid' ? '' : 'bg-zinc-950'}
              `}
              style={{
                width: layoutFormat === 'horizontal' ? '960px' : '405px',
                height: layoutFormat === 'horizontal' ? '540px' : '720px',
                backgroundColor: bgStyle === 'solid' ? solidColor : undefined
              }}
            >
              {/* Wallpaper Background */}
              {bgStyle === 'wallpaper' && (
                <div className="absolute inset-0 z-0">
                  <img 
                    src={`/ops/${selectedOpId}_wallpaper.jpg`} 
                    alt="" 
                    className="w-full h-full object-cover opacity-40" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-r from-black ${layoutFormat === 'horizontal' ? 'via-zinc-900/60' : 'via-black/80'} to-transparent`} />
                </div>
              )}

              {/* Composition Container */}
              <div className={`relative z-10 w-full h-full flex ${layoutFormat === 'horizontal' ? 'items-center justify-between px-12' : 'flex-col items-center justify-center gap-8 py-8 px-6'}`}>
                
                {/* Text & Stats */}
                <div className={`flex flex-col ${layoutFormat === 'horizontal' ? 'flex-1 pr-8 justify-center' : 'w-full items-center text-center shrink-0'}`}>
                  {customTitle && (
                    <h1 className={`${layoutFormat === 'horizontal' ? 'text-6xl text-left' : 'text-5xl text-center'} font-black italic uppercase tracking-tighter text-white mb-6 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] leading-tight`}>
                      <span className="text-yellow-500 block">{customTitle.split(' ')[0]}</span>
                      {customTitle.substring(customTitle.indexOf(' ') + 1)}
                    </h1>
                  )}

                  {showStats && (
                    <div className="flex gap-4">
                      <div className={`bg-black/60 backdrop-blur-md border border-zinc-800 rounded-xl p-4 shadow-lg ${layoutFormat === 'horizontal' ? 'w-32' : 'w-28'}`}>
                        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Kills</p>
                        <p className={`${layoutFormat === 'horizontal' ? 'text-5xl' : 'text-4xl'} font-black text-white`}>{kills}</p>
                      </div>
                      <div className={`bg-black/60 backdrop-blur-md border border-red-900/30 rounded-xl p-4 shadow-lg ${layoutFormat === 'horizontal' ? 'w-32' : 'w-28'}`}>
                        <p className="text-red-400/80 text-[10px] font-bold uppercase tracking-widest mb-1">Deaths</p>
                        <p className={`${layoutFormat === 'horizontal' ? 'text-5xl' : 'text-4xl'} font-black text-red-500`}>{deaths}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Operator Card */}
                <div className={`${layoutFormat === 'horizontal' ? 'w-[400px]' : 'w-full max-w-[340px]'} shrink-0`}>
                  <OperatorDisplay 
                    operator={selectedOperator} 
                    loadout={currentLoadout} 
                    matchType={matchType}
                    hideBg={bgStyle === 'transparent'}
                    hideLoadout={!showLoadout}
                  />
                </div>

              </div>
            </div>
            
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
          <Button onClick={handleExport} disabled={isExporting} icon={Download}>
            {isExporting ? 'Exporting...' : 'Download Thumbnail'}
          </Button>
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
