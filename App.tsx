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

  const IS_CHRISTMAS = true; // Attiva gli sconti e il tema
  const DISCOUNT = 0.75; // 25% di sconto

  // Prezzi base
  const BASE_VIP_PRICE = 10000;
  const BASE_PREMIUM_PRICE = 5000;

  // Prezzi scontati
  const vipPrice = Math.floor(BASE_VIP_PRICE * (IS_CHRISTMAS ? DISCOUNT : 1));
  const premiumPrice = Math.floor(BASE_PREMIUM_PRICE * (IS_CHRISTMAS ? DISCOUNT : 1));

  // Stato Persistente
  const [gems, setGems] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('nd_gems') || '0');
    } catch { return 0; }
  });

  const [hasVip, setHasVip] = useState<boolean>(() => localStorage.getItem('nd_has_vip') === 'true');
  const [hasPremium, setHasPremium] = useState<boolean>(() => localStorage.getItem('nd_has_premium') === 'true');

  const [unlockedSkinIds, setUnlockedSkinIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nd_unlocked_skins');
      return saved ? JSON.parse(saved) : ['1', '2'];
    } catch { return ['1', '2']; }
  });

  const [aiCommentary, setAiCommentary] = useState('');
  const [lastScore, setLastScore] = useState(0);
  const [lastReason, setLastReason] = useState<string>('');

  // Sincronizzazione automatica skin esclusive
  useEffect(() => {
    setUnlockedSkinIds(prev => {
      const newUnlocked = [...prev];
      let changed = false;

      SKINS.forEach(skin => {
        if (skin.isExclusive) {
          if (skin.exclusiveType === 'vip' && hasVip && !newUnlocked.includes(skin.id)) {
            newUnlocked.push(skin.id);
            changed = true;
          }
          if (skin.exclusiveType === 'premium' && (hasPremium || hasVip) && !newUnlocked.includes(skin.id)) {
            newUnlocked.push(skin.id);
            changed = true;
          }
        }
      });

      return changed ? newUnlocked : prev;
    });
  }, [hasVip, hasPremium]);

  useEffect(() => {
    localStorage.setItem('nd_gems', gems.toString());
    localStorage.setItem('nd_unlocked_skins', JSON.stringify(unlockedSkinIds));
    localStorage.setItem('nd_has_vip', hasVip.toString());
    localStorage.setItem('nd_has_premium', hasPremium.toString());
  }, [gems, unlockedSkinIds, hasVip, hasPremium]);

  const handleStartGame = () => {
    let activeConfig = { ...levelConfig };
    
    // Logica velocità Premium/VIP
    if (activeConfig.themeName === 'Clubstep (HELL MODE)' && hasVip) {
      activeConfig.speed = Math.floor(activeConfig.speed * 1.5);
    }
    
    if (activeConfig.themeName === 'Back on Track' && hasPremium) {
      activeConfig.speed = Math.floor(activeConfig.speed * 1.5);
    }

    setLevelConfig(activeConfig);
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = async (score: number, deathReason: string) => {
    setLastScore(score);
    setLastReason(deathReason);
    let earnedGems = deathReason === 'WIN' ? 100 : Math.floor(score / 5);
    
    setAiCommentary(deathReason === 'WIN' ? "Sbalorditivo! Hai conquistato il neon." : "Analisi del fallimento in corso...");
    
    if (deathReason !== 'WIN') {
      const comment = await getGameCommentary(score, deathReason);
      setAiCommentary(comment);
    }
    
    setGems(prev => prev + earnedGems);
    setGameState(GameState.GAMEOVER);
  };

  const buyVip = () => {
    if (gems >= vipPrice && !hasVip) {
      setGems(prev => prev - vipPrice);
      setHasVip(true);
    }
  };

  const buyPremium = () => {
    if (gems >= premiumPrice && !hasPremium) {
      setGems(prev => prev - premiumPrice);
      setHasPremium(true);
    }
  };

  const unlockWithGems = (skin: Skin) => {
    if (!unlockedSkinIds.includes(skin.id) && gems >= skin.price && !skin.isExclusive) {
      setGems(prev => prev - skin.price);
      setUnlockedSkinIds(prev => [...prev, skin.id]);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#050505] text-white overflow-hidden">
      {/* Background decorativo Natale */}
      {IS_CHRISTMAS && <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="snowflake" style={{ 
            left: `${Math.random() * 100}%`, 
            animationDuration: `${Math.random() * 5 + 7}s`,
            animationDelay: `${Math.random() * 5}s`
          }}>❄</div>
        ))}
      </div>}

      {gameState !== GameState.PLAYING && (
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-50">
          <div className="flex gap-4">
            <div className={`px-4 py-1 rounded-full border text-[10px] font-black uppercase tracking-tighter shadow-lg ${hasVip ? 'bg-yellow-500 border-yellow-300 text-black' : hasPremium ? 'bg-purple-600 border-purple-400 text-white' : 'bg-white/10 border-white/20 text-gray-400'}`}>
              {hasVip ? 'VIP MEMBER' : hasPremium ? 'PREMIUM MEMBER' : 'GUEST'}
            </div>
            {IS_CHRISTMAS && <div className="bg-red-600 px-4 py-1 rounded-full text-[10px] font-bold animate-pulse shadow-lg">🎄 XMAS DISCOUNTS -25%</div>}
          </div>
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-xl">
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
              <div className="space-y-2">
                <h1 className="text-7xl md:text-9xl font-black font-orbitron italic tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                  NEON<span style={{ color: levelConfig.primaryColor }}>DASH</span>
                </h1>
                <p className="text-sm font-bold text-gray-500 tracking-[0.5em] uppercase">Rhythm Platformer</p>
              </div>

              <div className="bg-white/5 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/10 space-y-10 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {PRESET_LEVELS.map((lvl) => (
                    <button 
                      key={lvl.themeName} 
                      onClick={() => setLevelConfig(lvl)} 
                      className={`p-6 rounded-2xl border-2 transition-all group relative overflow-hidden ${levelConfig.themeName === lvl.themeName ? 'border-white bg-white/10 scale-105' : 'border-white/5 bg-black/40 hover:border-white/20'}`}
                    >
                      <h3 className="font-orbitron font-black uppercase text-sm" style={{ color: lvl.primaryColor }}>{lvl.themeName}</h3>
                      <div className="text-[10px] opacity-60 mt-2 font-bold uppercase">{lvl.description}</div>
                      {(lvl.themeName === 'Clubstep (HELL MODE)' && hasVip) || (lvl.themeName === 'Back on Track' && hasPremium) ? (
                        <div className="absolute top-2 right-2 text-green-400 text-[8px] font-black animate-pulse">1.5x ACTIVE</div>
                      ) : null}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button onClick={() => setGameState(GameState.SKIN_SHOP)} variant="secondary" className="px-10"><i className="fas fa-palette mr-2"></i> SKINS</Button>
                  <Button onClick={() => setGameState(GameState.MEMBERSHIP_SHOP)} variant="secondary" className="px-10 bg-gradient-to-r from-amber-500 to-yellow-600 border-yellow-700 text-black"><i className="fas fa-crown mr-2"></i> STORE</Button>
                  <Button onClick={handleStartGame} variant="primary" className="flex-1 text-2xl font-black italic shadow-[0_0_20px_rgba(59,130,246,0.5)]">PLAY NOW</Button>
                </div>
              </div>
            </div>
          )}

          {gameState === GameState.MEMBERSHIP_SHOP && (
            <div className="text-center space-y-10 w-full animate-in slide-in-from-bottom duration-500">
              <h2 className="text-5xl font-orbitron font-black italic text-yellow-500">UPGRADES</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Premium Card */}
                <div className={`p-8 rounded-3xl border-2 bg-black/60 flex flex-col items-center gap-6 transition-all ${hasPremium ? 'border-green-500 scale-95 opacity-80' : 'border-purple-500/30'}`}>
                  <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center shadow-lg"><i className="fas fa-bolt text-3xl"></i></div>
                  <div>
                    <h3 className="text-2xl font-black italic">PREMIUM DASH</h3>
                    <ul className="text-xs text-gray-400 mt-2 space-y-2">
                      <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Unlock Premium Exclusive Skins</li>
                      <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> 1.5x Speed on Back on Track</li>
                      <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Purple Profile Badge</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={buyPremium} 
                    disabled={hasPremium || gems < premiumPrice}
                    className="w-full"
                  >
                    {hasPremium ? 'OWNED' : `${premiumPrice} GEMS`}
                  </Button>
                </div>

                {/* VIP Card */}
                <div className={`p-8 rounded-3xl border-2 bg-black/60 flex flex-col items-center gap-6 transition-all ${hasVip ? 'border-green-500 scale-95 opacity-80' : 'border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.2)]'}`}>
                  <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg"><i className="fas fa-crown text-3xl text-black"></i></div>
                  <div>
                    <h3 className="text-2xl font-black italic text-yellow-500">VIP LEGEND</h3>
                    <ul className="text-xs text-gray-400 mt-2 space-y-2">
                      <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Unlock ALL Skins (incl. Premium)</li>
                      <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> 1.5x Speed on Clubstep</li>
                      <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Golden Glow Effects</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={buyVip} 
                    disabled={hasVip || gems < vipPrice}
                    className="w-full bg-yellow-500 text-black border-yellow-700"
                  >
                    {hasVip ? 'OWNED' : `${vipPrice} GEMS`}
                  </Button>
                </div>
              </div>
              <Button onClick={() => setGameState(GameState.START)} variant="secondary" className="px-12">BACK TO MENU</Button>
            </div>
          )}

          {gameState === GameState.SKIN_SHOP && (
            <div className="text-center space-y-10 w-full animate-in slide-in-from-bottom duration-500">
              <h2 className="text-5xl font-orbitron font-black italic">SKIN VAULT</h2>
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 overflow-y-auto max-h-[55vh]">
                {SKINS.map(s => {
                  const isUnlocked = unlockedSkinIds.includes(s.id);
                  const isSelected = selectedSkin.id === s.id;
                  const canBuy = gems >= s.price && !s.isExclusive;
                  
                  return (
                    <div key={s.id} className="relative group">
                      <button 
                        onClick={() => {
                          if (isUnlocked) setSelectedSkin(s);
                          else if (!s.isExclusive) unlockWithGems(s);
                        }}
                        className={`w-full aspect-square p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 relative ${isSelected ? 'border-white ring-4 ring-white/20' : isUnlocked ? 'border-white/20 bg-white/5 hover:bg-white/10' : 'border-white/5 bg-black/40'}`}
                        style={{ backgroundColor: isUnlocked ? s.color + '20' : '' }}
                      >
                        <div className={`w-14 h-14 border-2 border-white/40 shadow-lg ${!isUnlocked ? 'grayscale brightness-50' : ''}`} style={{ backgroundColor: s.color }} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{s.name}</span>
                        
                        {!isUnlocked && s.isExclusive && (
                          <div className="absolute top-2 right-2">
                            {s.exclusiveType === 'vip' ? (
                              <i className="fas fa-crown text-yellow-500 text-xs drop-shadow-md"></i>
                            ) : (
                              <i className="fas fa-bolt text-purple-500 text-xs drop-shadow-md"></i>
                            )}
                          </div>
                        )}

                        {!isUnlocked && !s.isExclusive && s.price > 0 && (
                          <div className="text-[10px] text-blue-400 font-black mt-1">
                            <i className="fas fa-gem mr-1"></i>{s.price}
                          </div>
                        )}
                      </button>

                      {!isUnlocked && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1 rounded-full border border-white/10 text-[8px] font-black uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          {s.isExclusive ? `Requires ${s.exclusiveType?.toUpperCase()}` : `Cost: ${s.price} Gems`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button onClick={() => setGameState(GameState.START)} variant="secondary" className="px-12 mt-4">BACK</Button>
            </div>
          )}

          {gameState === GameState.GAMEOVER && (
            <div className="text-center space-y-8 animate-in zoom-in duration-300">
              <h1 className={`text-8xl font-black ${lastReason === 'WIN' ? 'text-green-500' : 'text-red-600'} font-orbitron italic tracking-tighter`}>
                {lastReason === 'WIN' ? 'VICTORY' : 'CRASHED'}
              </h1>
              <div className="bg-black/80 p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-xl shadow-2xl">
                <div className="flex justify-center gap-12 mb-8">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em]">Distance</p>
                    <div className="text-5xl font-black font-orbitron">{lastScore}m</div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-blue-400 uppercase font-bold tracking-[0.2em]">Gems</p>
                    <div className="text-5xl font-black font-orbitron text-blue-400">+{lastReason === 'WIN' ? 100 : Math.floor(lastScore / 5)}</div>
                  </div>
                </div>
                <p className="italic text-gray-400 text-lg mb-12 px-6 max-w-lg mx-auto leading-relaxed">"{aiCommentary}"</p>
                <div className="flex gap-6">
                  <Button onClick={() => setGameState(GameState.PLAYING)} className="flex-1 py-5 text-xl">RETRY</Button>
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