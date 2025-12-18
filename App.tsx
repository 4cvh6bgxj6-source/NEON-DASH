import React, { useState, useEffect, useMemo } from 'react';
import { GameState, LevelConfig, Skin } from './types';
import { DEFAULT_LEVEL_CONFIG, PRESET_LEVELS, SKINS } from './constants';
import { getGameCommentary } from './services/geminiService';
import { GameCanvas } from './components/GameCanvas';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [levelConfig, setLevelConfig] = useState<LevelConfig>(DEFAULT_LEVEL_CONFIG);
  const [selectedSkin, setSelectedSkin] = useState<Skin>(SKINS[0]);

  // Safe access to localStorage
  const [gems, setGems] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      return parseInt(localStorage.getItem('nd_gems') || '0');
    } catch {
      return 0;
    }
  });

  const [unlockedSkinIds, setUnlockedSkinIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['1', '2'];
    try {
      const saved = localStorage.getItem('nd_unlocked_skins');
      return saved ? JSON.parse(saved) : ['1', '2'];
    } catch {
      return ['1', '2'];
    }
  });

  const [hasVip, setHasVip] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('nd_has_vip') === 'true';
  });

  const [hasPremium, setHasPremium] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('nd_has_premium') === 'true';
  });

  const [aiCommentary, setAiCommentary] = useState('');
  const [lastScore, setLastScore] = useState(0);
  const [lastReason, setLastReason] = useState<string>('');

  const IS_CHRISTMAS = true;
  const VIP_BASE_PRICE = 10000;
  const PREMIUM_BASE_PRICE = 5000;
  const DISCOUNT = 0.75;

  const vipPrice = useMemo(() => Math.floor(VIP_BASE_PRICE * (IS_CHRISTMAS ? DISCOUNT : 1)), []);
  const premiumPrice = useMemo(() => Math.floor(PREMIUM_BASE_PRICE * (IS_CHRISTMAS ? DISCOUNT : 1)), []);

  useEffect(() => {
    try {
      localStorage.setItem('nd_gems', gems.toString());
      localStorage.setItem('nd_unlocked_skins', JSON.stringify(unlockedSkinIds));
      localStorage.setItem('nd_has_vip', hasVip.toString());
      localStorage.setItem('nd_has_premium', hasPremium.toString());
    } catch (e) {
      console.warn("Storage not available");
    }
  }, [gems, unlockedSkinIds, hasVip, hasPremium]);

  const handleStartGame = () => {
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = async (score: number, deathReason: string) => {
    setLastScore(score);
    setLastReason(deathReason);
    let earnedGems = deathReason === 'WIN' ? 70 : Math.floor(score / 10);
    setAiCommentary(deathReason === 'WIN' ? "HAI VINTO! Leggendario." : "Analisi crash...");
    
    if (deathReason !== 'WIN') {
      const comment = await getGameCommentary(score, deathReason);
      setAiCommentary(comment);
    }
    
    setGems(prev => prev + earnedGems);
    setGameState(GameState.GAMEOVER);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#050505] text-white">
      {gameState !== GameState.PLAYING && (
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-50">
          <div className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-[10px] font-black text-blue-400 uppercase tracking-widest">
            {hasVip ? 'VIP' : hasPremium ? 'PREMIUM' : 'GUEST'}
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
            <div className="text-center space-y-12 w-full animate-in fade-in duration-700">
              <h1 className="text-6xl md:text-8xl font-black font-orbitron italic tracking-tighter">
                NEON<span style={{ color: levelConfig.primaryColor }}>DASH</span>
              </h1>
              <div className="bg-white/5 backdrop-blur-md p-10 rounded-[2rem] border border-white/10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {PRESET_LEVELS.map((lvl) => (
                    <button key={lvl.themeName} onClick={() => setLevelConfig(lvl)} className={`p-6 rounded-2xl border-2 transition-all ${levelConfig.themeName === lvl.themeName ? 'border-white bg-white/10' : 'border-white/5 bg-black/40'}`}>
                      <h3 className="font-orbitron font-black uppercase text-sm" style={{ color: lvl.primaryColor }}>{lvl.themeName}</h3>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button onClick={() => setGameState(GameState.SKIN_SHOP)} variant="secondary">SKINS</Button>
                  <Button onClick={handleStartGame} variant="primary" className="flex-1 text-2xl">PLAY</Button>
                </div>
              </div>
            </div>
          )}

          {gameState === GameState.SKIN_SHOP && (
            <div className="text-center space-y-10 w-full">
              <h2 className="text-4xl font-orbitron font-black italic">SKIN VAULT</h2>
              <div className="grid grid-cols-4 gap-4 max-h-[40vh] overflow-y-auto p-4">
                {SKINS.map(s => (
                  <button key={s.id} onClick={() => setSelectedSkin(s)} className={`aspect-square p-4 rounded-xl border-2 ${selectedSkin.id === s.id ? 'border-white' : 'border-white/10'}`} style={{ backgroundColor: s.color + '40' }}>
                    <div className="w-full h-full border-2 border-white/20" style={{ backgroundColor: s.color }} />
                  </button>
                ))}
              </div>
              <Button onClick={() => setGameState(GameState.START)} variant="secondary">BACK</Button>
            </div>
          )}

          {gameState === GameState.GAMEOVER && (
            <div className="text-center space-y-8 animate-in zoom-in duration-300">
              <h1 className={`text-7xl font-black ${lastReason === 'WIN' ? 'text-green-500' : 'text-red-600'} font-orbitron`}>
                {lastReason === 'WIN' ? 'VICTORY' : 'CRASHED'}
              </h1>
              <div className="bg-black/80 p-12 rounded-[3rem] border border-white/10 backdrop-blur-xl">
                <div className="text-4xl font-black mb-4">SCORE: {lastScore}</div>
                <p className="italic text-gray-400 text-xl mb-10">"{aiCommentary}"</p>
                <div className="flex gap-4">
                  <Button onClick={() => setGameState(GameState.PLAYING)} className="flex-1">RETRY</Button>
                  <Button onClick={() => setGameState(GameState.START)} variant="secondary" className="flex-1">MENU</Button>
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