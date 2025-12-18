
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

  // Membership states
  const [hasVip, setHasVip] = useState<boolean>(() => localStorage.getItem('nd_has_vip') === 'true');
  const [hasPremium, setHasPremium] = useState<boolean>(() => localStorage.getItem('nd_has_premium') === 'true');

  const [gems, setGems] = useState<number>(() => {
    const saved = localStorage.getItem('nd_gems');
    return saved ? parseInt(saved) : 0;
  });

  const [unlockedSkinIds, setUnlockedSkinIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('nd_unlocked_skins');
    return saved ? JSON.parse(saved) : ['1', '2'];
  });

  const [aiCommentary, setAiCommentary] = useState('');
  const [lastScore, setLastScore] = useState(0);
  const [lastReason, setLastReason] = useState<string>('');

  // Christmas Discount Logic (25%)
  const IS_CHRISTMAS = true; 
  const VIP_BASE_PRICE = 10000;
  const PREMIUM_BASE_PRICE = 5000;
  const DISCOUNT = 0.75; 

  const vipPrice = useMemo(() => Math.floor(VIP_BASE_PRICE * (IS_CHRISTMAS ? DISCOUNT : 1)), [IS_CHRISTMAS]);
  const premiumPrice = useMemo(() => Math.floor(PREMIUM_BASE_PRICE * (IS_CHRISTMAS ? DISCOUNT : 1)), [IS_CHRISTMAS]);

  // Sincronizzazione automatica delle skin esclusive quando cambia la membership
  useEffect(() => {
    setUnlockedSkinIds(prev => {
      const newIds = [...prev];
      if (hasVip) {
        // VIP sblocca TUTTO (Premium + VIP)
        SKINS.filter(s => s.isExclusive).forEach(s => {
          if (!newIds.includes(s.id)) newIds.push(s.id);
        });
      } else if (hasPremium) {
        // Premium sblocca solo Premium
        SKINS.filter(s => s.exclusiveType === 'premium').forEach(s => {
          if (!newIds.includes(s.id)) newIds.push(s.id);
        });
      }
      return Array.from(new Set(newIds));
    });
  }, [hasVip, hasPremium]);

  // Persistenza
  useEffect(() => {
    localStorage.setItem('nd_gems', gems.toString());
    localStorage.setItem('nd_unlocked_skins', JSON.stringify(unlockedSkinIds));
    localStorage.setItem('nd_selected_skin_id', selectedSkin.id);
    localStorage.setItem('nd_has_vip', hasVip.toString());
    localStorage.setItem('nd_has_premium', hasPremium.toString());
  }, [gems, unlockedSkinIds, selectedSkin, hasVip, hasPremium]);

  // Caricamento iniziale skin
  useEffect(() => {
    const savedSkinId = localStorage.getItem('nd_selected_skin_id');
    if (savedSkinId) {
      const skin = SKINS.find(s => s.id === savedSkinId);
      if (skin) setSelectedSkin(skin);
    }
  }, []);

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
    
    let earnedGems = 0;
    if (deathReason === 'WIN') {
      earnedGems = 70;
      setAiCommentary("HAI VINTO! Sei una leggenda del Neon.");
    } else {
      earnedGems = Math.floor(score / 10);
      setAiCommentary("Analizzando il crash...");
      try {
        const comment = await getGameCommentary(score, deathReason);
        setAiCommentary(comment);
      } catch (e) {
        setAiCommentary("Poteva andare meglio... riprova!");
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

  const handleBuyVip = () => {
    if (!hasVip && gems >= vipPrice) {
      setGems(prev => prev - vipPrice);
      setHasVip(true);
    }
  };

  const handleBuyPremium = () => {
    if (!hasPremium && gems >= premiumPrice) {
      setGems(prev => prev - premiumPrice);
      setHasPremium(true);
    }
  };

  const generateSyncKey = () => {
    const data: ProgressData = {
      gems,
      unlockedSkinIds,
      lastSelectedSkinId: selectedSkin.id,
      timestamp: Date.now(),
      hasVip,
      hasPremium
    };
    return btoa(JSON.stringify(data));
  };

  const handleImportSyncKey = () => {
    try {
      const decoded = atob(syncKeyInput);
      const data: ProgressData = JSON.parse(decoded);
      if (typeof data.gems === 'number') {
        setGems(data.gems);
        setUnlockedSkinIds(data.unlockedSkinIds);
        setHasVip(!!data.hasVip);
        setHasPremium(!!data.hasPremium);
        const skin = SKINS.find(s => s.id === data.lastSelectedSkinId);
        if (skin) setSelectedSkin(skin);
        setSyncStatus('success');
        setTimeout(() => { setIsSyncModalOpen(false); setSyncStatus('idle'); setSyncKeyInput(''); }, 1500);
      }
    } catch (e) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col items-center justify-center bg-[#050505] text-white">
      <div className="absolute inset-0 opacity-10 pointer-events-none transition-all duration-1000" style={{ background: `radial-gradient(circle at center, ${levelConfig.primaryColor} 0%, transparent 70%)` }} />

      {/* Top Bar HUD */}
      {gameState !== GameState.PLAYING && (
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                {hasVip ? 'MEMBRO VIP' : hasPremium ? 'MEMBRO PREMIUM' : 'PILOTA FREE'}
              </span>
            </div>
            <button onClick={() => setIsSyncModalOpen(true)} className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-5 py-2 rounded-full border border-blue-600/30 transition-all flex items-center gap-2 group">
              <i className="fas fa-sync-alt group-hover:rotate-180 transition-transform duration-500"></i>
              <span className="text-[10px] font-black uppercase tracking-tighter">Sync</span>
            </button>
          </div>
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
            <i className="fas fa-gem text-blue-400"></i>
            <span className="font-orbitron font-black text-xl">{gems}</span>
          </div>
        </div>
      )}

      {/* Sync Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-lg">
          <div className="bg-[#111] border-2 border-blue-500/50 p-10 rounded-[2.5rem] w-full max-w-lg space-y-6 relative">
            <h3 className="text-2xl font-black uppercase text-center text-blue-400">Sincronizzazione</h3>
            <div className="space-y-4">
              <Button onClick={() => { navigator.clipboard.writeText(generateSyncKey()); setSyncStatus('success'); setTimeout(() => setSyncStatus('idle'), 1000); }} variant="secondary" className="w-full">
                {syncStatus === 'success' ? 'Copiato!' : 'Copia Sync Key'}
              </Button>
              <textarea 
                placeholder="Incolla Sync Key..." 
                value={syncKeyInput} 
                onChange={e => setSyncKeyInput(e.target.value)}
                className="w-full h-24 bg-black border border-white/10 rounded-xl p-3 text-xs font-mono"
              />
              <Button onClick={handleImportSyncKey} variant="primary" className="w-full">Importa</Button>
            </div>
            <button onClick={() => setIsSyncModalOpen(false)} className="absolute top-4 right-4"><i className="fas fa-times"></i></button>
          </div>
        </div>
      )}

      {gameState === GameState.PLAYING ? (
        <GameCanvas config={levelConfig} skin={selectedSkin} onGameOver={handleGameOver} />
      ) : (
        <div className="z-10 w-full max-w-4xl px-6 flex flex-col items-center">
          
          {gameState === GameState.START && (
            <div className="text-center space-y-12 animate-in fade-in duration-700 w-full">
              <div className="space-y-2">
                <h1 className="text-8xl font-black font-orbitron italic tracking-tighter drop-shadow-2xl">
                  NEON<span style={{ color: levelConfig.primaryColor }}>DASH</span>
                </h1>
                {IS_CHRISTMAS && <div className="text-red-500 font-bold animate-pulse text-sm">🎄 SCONTI DI NATALE: -25% NEL VIP SHOP! 🎅</div>}
              </div>
              
              <div className="bg-white/5 backdrop-blur-md p-10 rounded-[2rem] border border-white/10 shadow-2xl space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {PRESET_LEVELS.map((lvl) => {
                    let displaySpeed = lvl.speed / 8;
                    if (hasVip && lvl.themeName === 'Clubstep (HELL MODE)') displaySpeed = 1.5;
                    if (hasPremium && lvl.themeName === 'Back on Track') displaySpeed = 1.5;
                    return (
                      <button
                        key={lvl.themeName}
                        onClick={() => setLevelConfig(lvl)}
                        className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left relative group ${
                          levelConfig.themeName === lvl.themeName ? 'border-white bg-white/10 scale-105' : 'border-white/5 bg-black/40 hover:border-white/20'
                        }`}
                      >
                        <h3 className="font-orbitron font-black uppercase text-sm mb-1" style={{ color: lvl.primaryColor }}>{lvl.themeName}</h3>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Velocità: {displaySpeed}x</p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-4 justify-center">
                  <Button onClick={() => setGameState(GameState.SKIN_SHOP)} variant="secondary" className="px-8 py-5">
                    <i className="fas fa-palette mr-2"></i> SKINS
                  </Button>
                  <Button onClick={() => setGameState(GameState.MEMBERSHIP_SHOP)} variant="secondary" className="px-8 py-5 bg-gradient-to-r from-amber-500 to-yellow-600 border-yellow-700">
                    <i className="fas fa-crown mr-2"></i> VIP SHOP
                  </Button>
                  <Button onClick={handleStartGame} variant="primary" className="flex-1 py-5 text-2xl font-black italic min-w-[200px]">
                    <i className="fas fa-play-circle mr-2"></i> JUMP IN
                  </Button>
                </div>
              </div>
            </div>
          )}

          {gameState === GameState.MEMBERSHIP_SHOP && (
            <div className="text-center space-y-10 animate-in slide-in-from-bottom duration-500 w-full">
              <h2 className="text-5xl font-orbitron font-black uppercase italic">ZONA <span className="text-yellow-500">MEMBERSHIP</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {/* Premium Card */}
                <div className={`p-8 rounded-[2.5rem] border-2 bg-black/60 relative flex flex-col items-center gap-6 ${hasPremium ? 'border-green-500' : 'border-purple-500/50'}`}>
                  {IS_CHRISTMAS && !hasPremium && <div className="absolute top-4 left-4 bg-red-600 text-[10px] font-black px-3 py-1 rounded-full">-25% XMAS</div>}
                  <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.3)]">
                    <i className="fas fa-star text-2xl"></i>
                  </div>
                  <h3 className="text-2xl font-black italic">PREMIUM</h3>
                  <ul className="text-left text-[10px] space-y-2 font-bold text-gray-400 uppercase tracking-widest">
                    <li><i className="fas fa-check text-purple-500 mr-2"></i> Skin Esclusive Premium</li>
                    <li><i className="fas fa-bolt text-purple-500 mr-2"></i> Back on Track Speed: 1.5x</li>
                  </ul>
                  <div className="mt-auto w-full">
                    {hasPremium ? <div className="text-green-500 font-black">ATTIVO</div> : <Button onClick={handleBuyPremium} variant="secondary" className="w-full" disabled={gems < premiumPrice}>{premiumPrice} GEMS</Button>}
                  </div>
                </div>

                {/* VIP Card */}
                <div className={`p-8 rounded-[2.5rem] border-2 bg-black/60 relative flex flex-col items-center gap-6 ${hasVip ? 'border-green-500' : 'border-yellow-500/50'}`}>
                  {IS_CHRISTMAS && !hasVip && <div className="absolute top-4 left-4 bg-red-600 text-[10px] font-black px-3 py-1 rounded-full">-25% XMAS</div>}
                  <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                    <i className="fas fa-crown text-2xl text-black"></i>
                  </div>
                  <h3 className="text-2xl font-black italic text-yellow-500">VIP LEGEND</h3>
                  <ul className="text-left text-[10px] space-y-2 font-bold text-gray-400 uppercase tracking-widest">
                    <li><i className="fas fa-check text-yellow-500 mr-2"></i> Tutte le Skin Esclusive</li>
                    <li><i className="fas fa-bolt text-yellow-500 mr-2"></i> Clubstep Speed: 1.5x</li>
                  </ul>
                  <div className="mt-auto w-full">
                    {hasVip ? <div className="text-green-500 font-black">ATTIVO</div> : <Button onClick={handleBuyVip} className="w-full bg-yellow-500 text-black" disabled={gems < vipPrice}>{vipPrice} GEMS</Button>}
                  </div>
                </div>
              </div>
              <Button onClick={() => setGameState(GameState.START)} variant="secondary" className="px-12">TORNA AL MENU</Button>
            </div>
          )}

          {gameState === GameState.SKIN_SHOP && (
            <div className="text-center space-y-10 animate-in slide-in-from-bottom duration-500 w-full">
              <h2 className="text-5xl font-orbitron font-black uppercase italic">SKIN <span className="text-blue-500">VAULT</span></h2>
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-6 overflow-y-auto max-h-[50vh]">
                {SKINS.map(s => {
                  const isUnlocked = unlockedSkinIds.includes(s.id);
                  const canAfford = gems >= s.price;
                  return (
                    <button 
                      key={s.id}
                      onClick={() => handleSkinPurchase(s)}
                      disabled={s.isExclusive && !isUnlocked}
                      className={`aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 relative group ${
                        selectedSkin.id === s.id ? 'border-white scale-105' : 'border-white/10'
                      }`}
                      style={{ backgroundColor: isUnlocked ? s.color + '20' : '#111' }}
                    >
                      <div className={`w-12 h-12 border-2 border-white/30 transition-transform ${!isUnlocked ? 'grayscale' : ''}`} style={{ backgroundColor: s.color }} />
                      <span className="text-[9px] font-black uppercase">{s.name}</span>
                      
                      {s.isExclusive && (
                        <div className={`absolute top-2 right-2 text-[8px] font-black px-2 py-0.5 rounded-full ${s.exclusiveType === 'vip' ? 'bg-yellow-500 text-black' : 'bg-purple-600 text-white'}`}>
                          {s.exclusiveType?.toUpperCase()}
                        </div>
                      )}

                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-black/95 rounded-2xl flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           {s.isExclusive ? (
                             <span className="text-[10px] font-black text-center text-red-400">RICHIEDE {s.exclusiveType?.toUpperCase()}</span>
                           ) : (
                             <>
                               <span className={`font-black text-[12px] ${canAfford ? 'text-blue-400' : 'text-red-500'}`}>{s.price} GEMS</span>
                               <span className="text-[9px] text-white mt-1 bg-blue-600 px-3 py-1 rounded-full italic uppercase">Compra</span>
                             </>
                           )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <Button onClick={() => setGameState(GameState.START)} variant="secondary" className="px-12">CHIUDI VAULT</Button>
            </div>
          )}

          {gameState === GameState.GAMEOVER && (
            <div className="text-center space-y-8 animate-in zoom-in duration-300 w-full max-w-2xl">
              <h1 className={`text-9xl font-black ${lastReason === 'WIN' ? 'text-green-500' : 'text-red-600'} font-orbitron italic tracking-tighter`}>
                {lastReason === 'WIN' ? 'VICTORY' : 'CRASH'}
              </h1>
              <div className="bg-black/80 p-12 rounded-[3rem] border border-white/10 backdrop-blur-xl">
                <div className="grid grid-cols-2 gap-8 mb-10 text-center">
                  <div className="border-r border-white/10 pr-8">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Punteggio</div>
                    <div className="text-6xl font-orbitron font-black">{lastScore}</div>
                  </div>
                  <div className="pl-8">
                    <div className="text-[10px] text-blue-400 uppercase tracking-widest mb-2 font-bold">Guadagno</div>
                    <div className="text-6xl font-orbitron font-black text-blue-400">+{lastReason === 'WIN' ? 70 : Math.floor(lastScore / 10)}</div>
                  </div>
                </div>
                <p className="italic text-gray-400 text-xl px-6 mb-10">"{aiCommentary}"</p>
                <div className="flex gap-6">
                  <Button onClick={() => setGameState(GameState.PLAYING)} variant="primary" className="flex-1 py-5 text-xl font-black">RIPROVA</Button>
                  <Button onClick={() => setGameState(GameState.START)} variant="secondary" className="flex-1 py-5 text-xl font-black">MENU</Button>
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
