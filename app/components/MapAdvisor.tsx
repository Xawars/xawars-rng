'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Target, Shield, Crosshair, CheckCircle, Lightbulb, RotateCcw } from 'lucide-react';
import { MAPS, getMapData, getSiteById } from '../data/maps';
import { operators } from '../data/operators';
import { getRoleColor, Role } from '../data/roles';
import * as r6operators from 'r6operators';

type TransitionType = 'fade' | 'slide-left' | 'slide-right';

export function MapAdvisor() {
  const [selectedMap, setSelectedMap] = useState<string>('');
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedSide, setSelectedSide] = useState<'attack' | 'defense'>('defense');
  const [animationKey, setAnimationKey] = useState(0);
  const [transition, setTransition] = useState<TransitionType>('fade');
  const prevSideRef = useRef(selectedSide);

  const currentMap = MAPS.find(m => m.id === selectedMap);
  const mapData = selectedMap && selectedSite ? getMapData(selectedMap, selectedSite) : null;
  const currentSite = selectedMap && selectedSite ? getSiteById(selectedMap, selectedSite) : null;
  const recommendations = mapData?.[selectedSide] || [];
  const strategyTip = mapData?.strategyTips?.[selectedSide];

  const primaryPicks = recommendations.filter(r => r.importance === 'primary');
  const secondaryPicks = recommendations.filter(r => r.importance === 'secondary');
  const nichePicks = recommendations.filter(r => r.importance === 'niche');

  // Determine which step is active
  const currentStep = !selectedMap ? 1 : !selectedSite ? 2 : 3;

  const accentColor = selectedSide === 'defense' ? 'blue' : 'orange';
  const borderColor = selectedSide === 'defense' ? 'border-blue-500/40' : 'border-orange-500/40';
  const headingColor = selectedSide === 'defense' ? 'text-blue-400' : 'text-orange-400';

  // Trigger animation on map/site/side change
  useEffect(() => {
    if (prevSideRef.current !== selectedSide) {
      setTransition(selectedSide === 'attack' ? 'slide-right' : 'slide-left');
      prevSideRef.current = selectedSide;
    } else {
      setTransition('fade');
    }
    setAnimationKey(k => k + 1);
  }, [selectedMap, selectedSite, selectedSide]);

  const getOperatorName = (id: string) => {
    const op = operators.find(o => o.id === id);
    return op?.name || id;
  };

  const getOperator = (id: string) => {
    return operators.find(o => o.id === id);
  };

  const getTransitionClass = () => {
    switch (transition) {
      case 'slide-left': return 'animate-slide-in-left';
      case 'slide-right': return 'animate-slide-in-right';
      default: return 'animate-fade-in';
    }
  };

  const renderOperatorIcon = (operatorId: string, size: 'sm' | 'md' | 'lg') => {
    const op = getOperator(operatorId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opIconData = (r6operators as any)[operatorId];
    const iconSvg = opIconData?.toSVG({
      class: "w-full h-full drop-shadow-lg",
      width: "100%",
      height: "100%"
    });

    const sizeClasses = {
      sm: 'h-7 w-7',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
    };

    const bgColor = op?.side === 'attacker' ? 'bg-orange-900/30' : 'bg-blue-900/30';

    return (
      <div className={`${sizeClasses[size]} shrink-0 rounded-md flex items-center justify-center ${bgColor}`}>
        {iconSvg ? (
          <div className="w-full h-full flex items-center justify-center p-0.5">
            <div dangerouslySetInnerHTML={{ __html: iconSvg }} />
          </div>
        ) : (
          <span className={`font-bold text-zinc-400 ${size === 'lg' ? 'text-base' : size === 'md' ? 'text-sm' : 'text-xs'}`}>
            {getOperatorName(operatorId)[0]}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-zinc-900/80 border ${borderColor} rounded-xl p-5 transition-colors duration-300`}>
      {/* Header */}
      <h2 className={`text-xl font-black uppercase tracking-tighter mb-4 flex items-center gap-2 transition-colors duration-300 ${headingColor}`}>
        <MapPin className="w-5 h-5" />
        Map Advisor
      </h2>

      {/* Prominent Side Toggle (Requirement 2) */}
      <div className="mb-4">
        <div className="flex w-full bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setSelectedSide('defense')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-bold text-sm transition-all duration-200 ${
              selectedSide === 'defense'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            Defense
          </button>
          <button
            onClick={() => setSelectedSide('attack')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-bold text-sm transition-all duration-200 ${
              selectedSide === 'attack'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            Attack
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-3 mb-5 items-end">
        {/* Map Selector */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
            Map
          </label>
          <select
            value={selectedMap}
            onChange={(e) => {
              setSelectedMap(e.target.value);
              setSelectedSite('');
            }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-yellow-500"
          >
            <option value="">Choose a map...</option>
            {MAPS.map(map => (
              <option key={map.id} value={map.id}>{map.name}</option>
            ))}
          </select>
        </div>

        {/* Site Selector */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
            Site
          </label>
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            disabled={!selectedMap}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Choose a site...</option>
            {currentMap?.sites.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>

        {/* Reset Button */}
        <button
          onClick={() => {
            setSelectedMap('');
            setSelectedSite('');
          }}
          disabled={!selectedMap && !selectedSite}
          className="h-[34px] px-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Reset selections"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content Area */}
      {recommendations.length > 0 ? (
        <div key={animationKey} className={`space-y-4 ${getTransitionClass()}`}>
          {/* Site Name with Nickname Badges (Requirement 5) */}
          {currentSite && (
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                {currentSite.name} — {selectedSide === 'defense' ? 'Defense' : 'Attack'}
              </h3>
              {currentSite.nicknames?.map(nick => (
                <span
                  key={nick}
                  className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300 border border-zinc-600"
                >
                  {nick}
                </span>
              ))}
            </div>
          )}

          {/* Team Composition Summary (Requirement 4) */}
          <div className="flex items-center gap-1.5 p-2.5 bg-zinc-800/60 rounded-lg border border-zinc-700/50 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mr-1">Lineup</span>
            {[...primaryPicks, ...secondaryPicks, ...nichePicks].map(rec => (
              <div key={rec.operatorId} className="relative group">
                {renderOperatorIcon(rec.operatorId, 'sm')}
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-zinc-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {getOperatorName(rec.operatorId)}
                </span>
              </div>
            ))}
          </div>

          {/* Tiered Recommendations (Requirement 3) */}
          {/* Primary Picks */}
          {primaryPicks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-yellow-500">
                Primary Picks
              </h4>
              <div className="space-y-2">
                {primaryPicks.map(rec => {
                  const op = getOperator(rec.operatorId);
                  return (
                    <div
                      key={rec.operatorId}
                      className="bg-zinc-800/80 border border-yellow-500/30 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        {renderOperatorIcon(rec.operatorId, 'lg')}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-black text-white uppercase">
                              {getOperatorName(rec.operatorId)}
                            </span>
                            {op?.roles?.[0] && (
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${getRoleColor(op.roles[0] as Role)}/20 ${getRoleColor(op.roles[0] as Role).replace('bg-', 'text-')}`}>
                                {op.roles[0]}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 leading-snug">
                            {rec.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Secondary Picks */}
          {secondaryPicks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Secondary Picks
              </h4>
              <div className="space-y-1.5">
                {secondaryPicks.map(rec => {
                  const op = getOperator(rec.operatorId);
                  return (
                    <div
                      key={rec.operatorId}
                      className="bg-zinc-800/80 border border-zinc-700 rounded-lg p-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        {renderOperatorIcon(rec.operatorId, 'md')}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-white uppercase">
                              {getOperatorName(rec.operatorId)}
                            </span>
                            {op?.roles?.[0] && (
                              <span className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded ${getRoleColor(op.roles[0] as Role)}/20 ${getRoleColor(op.roles[0] as Role).replace('bg-', 'text-')}`}>
                                {op.roles[0]}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-snug">
                            {rec.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Niche Picks */}
          {nichePicks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Niche / Situational
              </h4>
              <div className="space-y-1">
                {nichePicks.map(rec => (
                  <div
                    key={rec.operatorId}
                    className="flex items-center gap-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-md px-2.5 py-2"
                  >
                    {renderOperatorIcon(rec.operatorId, 'sm')}
                    <span className="text-xs font-bold text-zinc-300 uppercase shrink-0">
                      {getOperatorName(rec.operatorId)}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      — {rec.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategy Tip (Requirement 7) */}
          {strategyTip && (
            <div className={`p-3.5 rounded-lg border ${
              selectedSide === 'defense'
                ? 'bg-blue-950/20 border-blue-800/30'
                : 'bg-orange-950/20 border-orange-800/30'
            }`}>
              <div className="flex items-start gap-2">
                <Lightbulb className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                  selectedSide === 'defense' ? 'text-blue-400' : 'text-orange-400'
                }`} />
                <div>
                  <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
                    selectedSide === 'defense' ? 'text-blue-400' : 'text-orange-400'
                  }`}>
                    Strategy Tip
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {strategyTip}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : selectedMap && selectedSite ? (
        <div key={animationKey} className={`text-center py-8 text-zinc-500 ${getTransitionClass()}`}>
          <p>No recommendations available for this site yet.</p>
        </div>
      ) : (
        /* Step Indicators for Empty State (Requirement 1) */
        <div className="py-4">
          <div className="flex flex-col gap-3">
            {[
              { step: 1, label: 'Pick a map' },
              { step: 2, label: 'Pick a site' },
              { step: 3, label: 'See recommendations' },
            ].map(({ step, label }) => {
              const isCompleted = step < currentStep;
              const isActive = step === currentStep;

              return (
                <div
                  key={step}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-200 ${
                    isCompleted
                      ? 'border-green-700/40 bg-green-950/20'
                      : isActive
                      ? selectedSide === 'defense'
                        ? 'border-blue-500/40 bg-blue-950/20'
                        : 'border-orange-500/40 bg-orange-950/20'
                      : 'border-zinc-800 bg-zinc-900/40'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center text-[9px] font-bold ${
                      isActive
                        ? selectedSide === 'defense'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-orange-500 text-orange-400'
                        : 'border-zinc-600 text-zinc-600'
                    }`}>
                      {step}
                    </div>
                  )}
                  <span className={`text-xs font-medium ${
                    isCompleted
                      ? 'text-green-400'
                      : isActive
                      ? 'text-white'
                      : 'text-zinc-500'
                  }`}>
                    Step {step}: {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
