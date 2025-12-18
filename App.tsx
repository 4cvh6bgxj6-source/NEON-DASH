
import React, { useState, useEffect, useMemo } from 'react';
import { GameState, LevelConfig, Skin, ProgressData } from './types';
import { DEFAULT_LEVEL_CONFIG, PRESET_LEVELS, SKINS } from './constants';
import { getGameCommentary } from './services/geminiService';
import { GameCanvas } from './components/GameCanvas';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [levelConfig, setLevelConfig] = useState<LevelConfig>(DEFAULT_LEVEL_CONFIG);
  const [selectedSkin, setSelectedSkin] = useState<Skin>(SKINS[0]);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncKeyInput, setSyncKeyInput] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Helper safe per localStorage
  const safeGetItem = (key: string, fallback: string): string => {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (e) {
      return fallback;
    }
  };

  // Membership states
  const [hasVip, setHasVip] = useState<boolean>(() => safeGetItem('nd_has_vip', 'false') === 'true');
  const [hasPremium, setHasPremium] = useState<boolean>(() => safeGetItem('nd_has_premium', 'false') === 'true');

  const [gems, setGems] = useState<number>(() => {
    const saved = safeGetItem('nd_gems', '0');
    return parseInt(saved) || 0;
  });

  const [unlockedSkinIds, setUnlockedSkinIds] = useState<string[]>(() => {
    const saved = safeGetItem('nd_unlocked_skins', '["1", "2"]');
    try {
      return JSON.parse(saved);
    } catch {
      return ['1', '2'];
    }
  });

  const [aiCommentary, setAiCommentary] = useState('');
  const [lastScore, setLastScore] = useState(0);
  const [lastReason, setLastReason] = useState<string>('');

  const IS_CHRISTMAS = true; 
  const VIP_BASE_PRICE = 10000;
  const PREMIUM_BASE_PRICE = 5000;
  const DISCOUNT = 0.75; 

  const vipPrice = useMemo(() => Math.floor(VIP_BASE_PRICE * (IS_CHRISTMAS ? DISCOUNT : 1)), [IS_CHRISTMAS]);
  const premiumPrice = useMemo(() => Math.floor(PREMIUM_BASE_PRICE * (IS_CHRISTMAS ? DISCOUNT : 1)), [IS_CHRISTMAS]);

  useEffect(() => {
    setUnlockedSkinIds(prev => {
      const newIds = [...prev];
      if (hasVip) {
        SKINS.filter(s => s.isExclusive).forEach(s => {
          if (!newIds.includes(s.id)) newIds.push(s.id);
        });
      } else if (hasPremium) {
        SKINS.filter(s => s.exclusiveType === 'premium').forEach(s => {
          if (!newIds.includes(s.id)) newIds.push(s.id);
        });
      }
      const uniqueIds = Array.from(new Set(newIds));
      if (uniqueIds.length !== prev.length) return uniqueIds;
      return prev;
    });
  }, [hasVip, hasPremium]);

  useEffect(() => {
    try {
      localStorage.setItem('nd_gems', gems.toString());
      localStorage.setItem('nd_unlocked_skins', JSON.stringify(unlockedSkinIds));
      localStorage.setItem('nd_selected_skin_id', selectedSkin.id);
      localStorage.setItem('nd_has_vip', hasVip.toString());
      localStorage.setItem('nd_has_premium', hasPremium.toString());
    } catch (e) {
      console.warn("LocalStorage non disponibile");
    }
  }, [gems, unlockedSkinIds, selectedSkin, hasVip, hasPremium]);

  const handleStartGame = () => {
    let modifiedConfig = { ...levelConfig };
    if (hasVip && levelConfig.themeName === 'Clubstep (HELL MODE)') {
      modifiedConfig.speed = 12; 
    } else if (hasPremium && levelConfig.themeName === 'Back on Track') {
      modifiedConfig.speed = 12; 
    }
    setLevelConfig(modifiedConfig);
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = async (score: number, deathReason: string) => {
    setLastScore(score);
    setLastReason(deathReason);
    let earnedGems = deathReason === 'WIN' ? 70 : Math.floor(score / 10);
    setAiCommentary(deathReason === 'WIN' ? "HAI VINTO! Leggendario." : "Analisi crash in corso...");
    
    if (deathReason !== 'WIN') {
      try {
        const comment = await getGameCommentary(score, deathReason);
        setAiCommentary(comment);
      } catch (e) {
        setAiCommentary("Riprova, sarai più fortunato!");
      }
    }
    
    setGems(prev => prev + earnedGems);
    setGameState(GameState.GAMEOVER);
  };

  const handleSkinPurchase = (skin: Skin) => {
    if (unlockedSkinIds.includes(skin.id)) {
      setSelectedSkin(skin);
    } else if (!skin.isExclusive && gems >= skin.price) {
      setGems(prev => prev - skin.price);
      setUnlockedSkinIds(prev => [...prev, skin.id]);
      setSelectedSkin(skin);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#050505] text-white">
      <div className="absolute inset-0 opacity-10 pointer-events-none transition-all duration-1000" style={{ background: `radial-gradient(circle at center, ${levelConfig.primaryColor} 0%, transparent 70%)` }} />

      {gameState !== GameState.PLAYING && (
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-50">
          <div className="flex items-center gap-4">
            <div className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                {hasVip ? 'MEMBRO VIP' : hasPremium ? 'MEMBRO PREMIUM' : 'PILOTA FREE'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
            <i className="fas fa-gem text-blue-400"></i>
            <span className="font-orbitron font-black text-xl">{gems}</span>
          </div>
        </div>
      )}

      {gameState === GameState.PLAYING ? (
        <GameCanvas config={levelConfig} skin={selectedSkin} onGameOver={handleGameOver} />
      ) : (
        <div className="z-10 w-full max-w-4xl px-6 flex flex-col items-center">
          {gameState === GameState.START && (
            <div className="text-center space-y-12 w-full animate-in fade-in duration-500">
              <div className="space-y-2">
                <h1 className="text-6xl md:text-8xl font-black font-orbitron italic tracking-tighter drop-shadow-2xl">
                  NEON<span style={{ color: levelConfig.primaryColor }}>DASH</span>
                </h1>
                {IS_CHRISTMAS && <div className="text-red-500 font-bold animate-pulse text-sm">🎄 SCONTI DI NATALE: -25% NEL VIP SHOP! 🎅</div>}
              </div>
              <div className="bg-white/5 backdrop-blur-md p-10 rounded-[2rem] border border-white/10 shadow-2xl space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {PRESET_LEVELS.map((lvl) => (
                    <button key={lvl.themeName} onClick={() => setLevelConfig(lvl)} className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left relative group ${levelConfig.themeName === lvl.themeName ? 'border-white bg-white/10 scale-105' : 'border-white/5 bg-black/40 hover:border-white/20'}`}>
                      <h3 className="font-orbitron font-black uppercase text-sm mb-1" style={{ color: lvl.primaryColor }}>{lvl.themeName}</h3>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Base Speed: {lvl.speed / 8}x</p>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button onClick={() => setGameState(GameState.SKIN_SHOP)} variant="secondary" className="px-8 py-5"><i className="fas fa-palette mr-2"></i> SKINS</Button>
                  <Button onClick={() => setGameState(GameState.MEMBERSHIP_SHOP)} variant="secondary" className="px-8 py-5 bg-gradient-to-r from-amber-500 to-yellow-600 border-yellow-700"><i className="fas fa-crown mr-2"></i> VIP SHOP</Button>
                  <Button onClick={handleStartGame} variant="primary" className="flex-1 py-5 text-2xl font-black italic min-w-[200px]"><i className="fas fa-play-circle mr-2"></i> JUMP IN</Button>
                </div>
              </div>
            </div>
          )}

          {gameState === GameState.MEMBERSHIP_SHOP && (
            <div className="text-center space-y-10 w-full animate-in slide-in-from-bottom duration-500">
              <h2 className="text-5xl font-orbitron font-black uppercase italic">ZONA <span className="text-yellow-500">MEMBERSHIP</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                <div className={`p-8 rounded-[2.5rem] border-2 bg-black/60 relative flex flex-col items-center gap-6 ${hasPremium ? 'border-green-500' : 'border-purple-500/50'}`}>
                  {IS_CHRISTMAS && !hasPremium && <div className="absolute top-4 left-4 bg-red-600 text-[10px] font-black px-3 py-1 rounded-full">-25% XMAS</div>}
                  <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-lg"><i className="fas fa-star text-2xl"></i></div>
                  <h3 className="text-2xl font-black italic">PREMIUM</h3>
                  <div className="mt-auto w-full">
                    {hasPremium ? <div className="text-green-500 font-black">ATTIVO</div> : <Button onClick={() => { if(gems >= premiumPrice) { setGems(prev => prev - premiumPrice); setHasPremium(true); } }} variant="secondary" className="w-full" disabled={gems < premiumPrice}>{premiumPrice} GEMS</Button>}
                  </div>
                </div>
                <div className={`p-8 rounded-[2.5rem] border-2 bg-black/60 relative flex flex-col items-center gap-6 ${hasVip ? 'border-green-500' : 'border-yellow-500/50'}`}>
                  {IS_CHRISTMAS && !hasVip && <div className="absolute top-4 left-4 bg-red-600 text-[10px] font-black px-3 py-1 rounded-full">-25% XMAS</div>}
                  <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg"><i className="fas fa-crown text-2xl text-black"></i></div>
                  <h3 className="text-2xl font-black italic text-yellow-500">VIP LEGEND</h3>
                  <div className="mt-auto w-full">
                    {hasVip ? <div className="text-green-500 font-black">ATTIVO</div> : <Button onClick={() => { if(gems >= vipPrice) { setGems(prev => prev - vipPrice); setHasVip(true); } }} className="w-full bg-yellow-500 text-black" disabled={gems < vipPrice}>{vipPrice} GEMS</Button>}
                  </div>
                </div>
              </div>
              <Button onClick={() => setGameState(GameState.START)} variant="secondary" className="px-12">TORNA AL MENU</Button>
            </div>
          )}

          {gameState === GameState.SKIN_SHOP && (
            <div className="text-center space-y-10 w-full animate-in slide-in-from-bottom duration-500">
              <h2 className="text-5xl font-orbitron font-black uppercase italic">SKIN <span className="text-blue-500">VAULT</span></h2>
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-6 overflow-y-auto max-h-[50vh]">
                {SKINS.map(s => {
                  const isUnlocked = unlockedSkinIds.includes(s.id);
                  return (
                    <button key={s.id} onClick={() => handleSkinPurchase(s)} disabled={s.isExclusive && !isUnlocked} className={`aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 relative group ${selectedSkin.id === s.id ? 'border-white scale-105' : 'border-white/10'}`} style={{ backgroundColor: isUnlocked ? s.color + '20' : '#111' }}>
                      <div className={`w-12 h-12 border-2 border-white/30 ${!isUnlocked ? 'grayscale' : ''}`} style={{ backgroundColor: s.color }} />
                      <span className="text-[9px] font-black uppercase">{s.name}</span>
                      {s.isExclusive && <div className={`absolute top-2 right-2 text-[8px] font-black px-2 py-0.5 rounded-full ${s.exclusiveType === 'vip' ? 'bg-yellow-500 text-black' : 'bg-purple-600 text-white'}`}>{s.exclusiveType?.toUpperCase()}</div>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4">
                <Button onClick={() => setGameState(GameState.START)} variant="secondary" className="px-12">CHIUDI VAULT</Button>
              </div>
            </div>
          )}

          {gameState === GameState.GAMEOVER && (
            <div className="text-center space-y-8 w-full animate-in zoom-in duration-300">
              <h1 className={`text-6xl md:text-8xl font-black ${lastReason === 'WIN' ? 'text-green-500' : 'text-red-600'} font-orbitron italic`}>{lastReason === 'WIN' ? 'VICTORY' : 'CRASH'}</h1>
              <div className="bg-black/80 p-8 md:p-12 rounded-[3rem] border border-white/10 backdrop-blur-xl">
                <div className="grid grid-cols-2 gap-8 mb-10 text-center">
                  <div className="border-r border-white/10 pr-4 md:pr-8">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Punteggio</div>
                    <div className="text-4xl md:text-6xl font-orbitron font-black">{lastScore}</div>
                  </div>
                  <div className="pl-4 md:pl-8">
                    <div className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">Gemme</div>
                    <div className="text-4xl md:text-6xl font-orbitron font-black text-blue-400">+{lastReason === 'WIN' ? 70 : Math.floor(lastScore / 10)}</div>
                  </div>
                </div>
                <p className="italic text-gray-400 text-lg md:text-xl px-6 mb-10 leading-relaxed">"{aiCommentary}"</p>
                <div className="flex flex-col md:flex-row gap-6">
                  <Button onClick={() => setGameState(GameState.PLAYING)} variant="primary" className="flex-1 py-5">RIPROVA</Button>
                  <Button onClick={() => setGameState(GameState.START)} variant="secondary" className="flex-1 py-5">MENU</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
