import React, { useEffect, useState } from 'react';
import { GameState, GameStats, Upgrade, EvolutionRecipe, ControllerAction } from '../types';
import { AVAILABLE_UPGRADES, REROLL_COST, EVOLUTION_RECIPES, MAX_WEAPON_LEVEL } from '../constants';

interface UIOverlayProps {
  gameState: GameState;
  stats: GameStats | null;
  loadProgress?: { loaded: number; total: number };
  onRestart: () => void;
  onResume: () => void;
  onSelectUpgrade: (id: string, bonusLevels?: number, evolutionRecipe?: EvolutionRecipe) => void;
  onSpinSlots: (targetId: string | null, boostGold: number, isReroll: boolean) => Upgrade[];
  upgradeOptions: Upgrade[];
  onSpawnTestXP?: () => void;
  onToggleGodMode?: (enabled: boolean) => void;
  onTriggerLevelUp?: () => void;
  onGrantMaxLevelItem?: (id: string) => void;
  onUpdateProjectileScale?: (scale: number) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({
    gameState,
    stats,
    loadProgress,
    onRestart,
    onResume,
    onSelectUpgrade,
    onSpinSlots,
    onSpawnTestXP,
    onToggleGodMode,
    onTriggerLevelUp,
    onGrantMaxLevelItem,
    onUpdateProjectileScale
}) => {
  const [beliefHistory, setBeliefHistory] = useState<number[][]>([]);

  // Slot Machine States
  const [slots, setSlots] = useState<Upgrade[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(true);

  // Betting States
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);

  // Debug Mode
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [projectileScale, setProjectileScale] = useState(1.0);
  // AI Panel State
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Ctrl+Shift+D to toggle debug panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowDebugPanel(prev => !prev);
      }
      // Ctrl+Shift+A to toggle AI panel
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAiPanel(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Define handleSpin before useEffect to ensure safe closure capture
  const handleSpin = (targetId: string | null, amount: number, isReroll: boolean) => {
      if (!canSpin) return;
      setCanSpin(false);
      setIsSpinning(true);

      // Animation loop
      let ticks = 0;
      const interval = setInterval(() => {
          // Visual noise (always simulated as free spin for noise)
          const noise = onSpinSlots(null, 0, false); 
          setSlots(noise);
          ticks++;
          if (ticks > 8) {
              clearInterval(interval);
              // Final Result call (This will deduct gold in App if isReroll is true)
              const finalSlots = onSpinSlots(targetId, amount, isReroll); 
              setSlots(finalSlots);
              setIsSpinning(false);
              setCanSpin(true);
          }
      }, 80);
  };

  // Reset history when returning to menu
  useEffect(() => {
      if (gameState === GameState.MENU) {
          setBeliefHistory([]);
      }
  }, [gameState]);

  // Handle Level Up Entry
  useEffect(() => {
      if (gameState === GameState.LEVEL_UP) {
          // Reset betting
          setSelectedTargetId(null);
          setBidAmount(0);
          setCanSpin(true);
          // Free initial spin (not a reroll)
          handleSpin(null, 0, false);
      } else {
          setSlots([]);
      }
  }, [gameState]);

  // Update history when stats change
  useEffect(() => {
      if (stats?.aiDebug?.beliefState) {
          setBeliefHistory(prev => {
              const newHistory = [...prev, stats.aiDebug!.beliefState];
              return newHistory.length > 60 ? newHistory.slice(newHistory.length - 60) : newHistory;
          });
      }
  }, [stats]);

  const getBonusLevel = (item: Upgrade, allSlots: Upgrade[]) => {
      // Logic:
      // Count occurrences of item.id in allSlots
      const count = allSlots.filter(s => s.id === item.id).length;
      if (count === 3) return 2; // +2 bonus (Total +3)
      if (count === 2) return 1; // +1 bonus (Total +2)
      return 0; // Standard (+1)
  };

  const handleSelectSlot = (index: number) => {
      if (isSpinning) return;
      const item = slots[index];
      const bonus = getBonusLevel(item, slots);
      onSelectUpgrade(item.id, bonus, item.evolutionRecipe);
  };

  // Convert belief state [Anxiety, Flow, Boredom] to Flow Diagram coordinates (Challenge, Skill)
  // Anxiety → high challenge, low skill (upper-left)
  // Boredom → low challenge, high skill (lower-right)
  // Flow → balanced (on diagonal)
  const beliefToFlowCoords = (belief: number[]): { x: number; y: number } => {
    const [anxiety, flow, boredom] = belief;
    // X = Challenge: high when anxious, medium when in flow, low when bored
    // Y = Skill: low when anxious, medium when in flow, high when bored
    const challenge = anxiety + flow * 0.5;
    const skill = boredom + flow * 0.5;
    return { x: challenge, y: skill };
  };

  // Get flow diagram trail path
  const getFlowTrailPath = () => {
    if (beliefHistory.length < 2) return '';
    return beliefHistory.map((belief, i) => {
      const { x, y } = beliefToFlowCoords(belief);
      const px = x * 100;
      const py = (1 - y) * 100; // Invert Y for SVG coords
      return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
    }).join(' ');
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- RENDER METHODS ---

  // Loading Screen
  if (gameState === GameState.LOADING) {
      const progress = loadProgress ? (loadProgress.loaded / loadProgress.total) * 100 : 0;
      return (
          <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white z-50"
              style={{
                  paddingTop: 'env(safe-area-inset-top, 0px)',
                  paddingBottom: 'env(safe-area-inset-bottom, 0px)'
              }}
          >
              {/* Logo */}
              <div className="mb-12">
                  <h1 className="text-3xl md:text-5xl font-bold text-yellow-400 tracking-widest animate-pulse text-center">
                      SURVIVOR AI
                  </h1>
                  <div className="text-center text-gray-500 text-xs md:text-sm mt-2">Adaptive Difficulty System</div>
              </div>

              {/* Loading bar */}
              <div className="w-64 md:w-80 mb-4">
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                      <div
                          className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 transition-all duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                      />
                  </div>
              </div>

              {/* Loading text */}
              <div className="text-gray-400 text-sm">
                  Loading assets... {loadProgress?.loaded || 0}/{loadProgress?.total || 0}
              </div>

              {/* Animated dots */}
              <div className="mt-8 flex gap-2">
                  {[0, 1, 2].map(i => (
                      <div
                          key={i}
                          className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                      />
                  ))}
              </div>
          </div>
      );
  }

  // Main Menu
  if (gameState === GameState.MENU) {
      return (
          <div
              className="absolute inset-0 flex flex-col items-center bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white z-50 pointer-events-auto overflow-y-auto"
              style={{
                  paddingTop: 'max(2rem, env(safe-area-inset-top, 0px))',
                  paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
                  paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
                  paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))'
              }}
          >
              {/* Spacer for vertical centering when content is short */}
              <div className="flex-1 min-h-0" />
              {/* Title */}
              <h1 className="text-4xl md:text-6xl font-bold mb-2 text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] tracking-wider text-center">
                  SURVIVOR AI
              </h1>
              <p className="text-gray-400 mb-8 text-sm md:text-lg">Dynamic Difficulty Adaptation</p>

              {/* Game Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-4xl px-4 w-full">
                  {/* How to Play */}
                  <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 backdrop-blur">
                      <h3 className="text-yellow-400 font-bold mb-3 flex items-center gap-2">
                          <span className="text-2xl">🎮</span> How to Play
                      </h3>
                      <ul className="text-sm text-gray-300 space-y-2">
                          <li className="flex items-start gap-2">
                              <span className="text-blue-400">▸</span>
                              <span>Use Joystick or <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs hidden md:inline">WASD</kbd> to move</span>
                          </li>
                          <li className="flex items-start gap-2">
                              <span className="text-blue-400">▸</span>
                              <span>Weapons attack automatically</span>
                          </li>
                          <li className="flex items-start gap-2">
                              <span className="text-blue-400">▸</span>
                              <span>Collect gems to level up</span>
                          </li>
                          <li className="flex items-start gap-2">
                              <span className="text-blue-400">▸</span>
                              <span>Survive for <span className="text-yellow-400 font-bold">15 minutes</span> to win!</span>
                          </li>
                      </ul>
                  </div>

                  {/* Upgrade System */}
                  <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 backdrop-blur">
                      <h3 className="text-purple-400 font-bold mb-3 flex items-center gap-2">
                          <span className="text-2xl">🎰</span> Slot Machine
                      </h3>
                      <ul className="text-sm text-gray-300 space-y-2">
                          <li className="flex items-start gap-2">
                              <span className="text-purple-400">▸</span>
                              <span>Level up to spin for upgrades</span>
                          </li>
                          <li className="flex items-start gap-2">
                              <span className="text-purple-400">▸</span>
                              <span><span className="text-blue-400">2 matches</span> = +2 levels</span>
                          </li>
                          <li className="flex items-start gap-2">
                              <span className="text-purple-400">▸</span>
                              <span><span className="text-yellow-400">3 matches</span> = JACKPOT +3!</span>
                          </li>
                          <li className="flex items-start gap-2">
                              <span className="text-purple-400">▸</span>
                              <span>Spend gold to rig the odds</span>
                          </li>
                      </ul>
                  </div>

                  {/* Evolution System */}
                  <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 backdrop-blur">
                      <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                          <span className="text-2xl">⚔️</span> Evolution
                      </h3>
                      <ul className="text-sm text-gray-300 space-y-2">
                          <li className="flex items-start gap-2">
                              <span className="text-red-400">▸</span>
                              <span>Max a weapon to <span className="text-yellow-400">Lv.8</span></span>
                          </li>
                          <li className="flex items-start gap-2">
                              <span className="text-red-400">▸</span>
                              <span>Get matching passive item</span>
                          </li>
                          <li className="flex items-start gap-2">
                              <span className="text-red-400">▸</span>
                              <span>Evolution unlocks at level up!</span>
                          </li>
                          <li className="flex items-start gap-2">
                              <span className="text-red-400">▸</span>
                              <span className="text-purple-400">Example: Wand + Tome = Holy Wand</span>
                          </li>
                      </ul>
                  </div>
              </div>

              {/* Weapons Preview */}
              <div className="mb-8 bg-gray-800/50 border border-gray-700 rounded-xl p-4 max-w-2xl mx-4">
                  <h3 className="text-center text-gray-400 text-sm mb-3">AVAILABLE WEAPONS & PASSIVES</h3>
                  <div className="flex flex-wrap justify-center gap-3">
                      {AVAILABLE_UPGRADES.filter(u => u.type !== 'HEAL').map(u => (
                          <div
                              key={u.id}
                              className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg text-xl md:text-2xl
                                  ${u.type === 'WEAPON' ? 'bg-red-900/50 border border-red-700' : 'bg-blue-900/50 border border-blue-700'}
                              `}
                              title={`${u.name}: ${u.description}`}
                          >
                              {u.icon}
                          </div>
                      ))}
                  </div>
              </div>

              {/* Start Button */}
              <button
                  onClick={onRestart}
                  className="group relative px-12 py-5 bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 border-4 border-red-900 rounded-xl text-2xl font-bold text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all transform hover:scale-105 active:scale-95 hover:shadow-[0_0_50px_rgba(220,38,38,0.6)]"
              >
                  <span className="relative z-10">START GAME</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 rounded-lg" />
              </button>

              {/* AI Info */}
              <div className="mt-6 text-center text-gray-500 text-xs max-w-md px-4">
                  <p>Powered by <span className="text-blue-400">Active Inference AI</span></p>
                  <p className="mt-1">The game dynamically adjusts difficulty based on your performance</p>
              </div>

              {/* Bottom spacer for vertical centering */}
              <div className="flex-1 min-h-0" />
          </div>
      );
  }

  if (gameState === GameState.GAME_OVER) {
      return (
          <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white z-50 pointer-events-auto"
              style={{
                  paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
                  paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
                  paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
                  paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))'
              }}
          >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-red-600 text-center">GAME OVER</h1>
              {stats && (
                  <div className="mb-8 text-center space-y-2 text-lg md:text-xl">
                      <p>Level: <span className="text-white font-bold">{stats.level}</span></p>
                      <p>Kills: <span className="text-red-400 font-bold">{stats.killCount}</span></p>
                      <p>Gold: <span className="text-yellow-400 font-bold">{stats.gold}</span></p>
                      <p>Time: <span className="text-blue-400 font-bold">{formatTime(stats.timeElapsed)}</span></p>
                  </div>
              )}
              <button onClick={onRestart} className="px-8 py-4 bg-white text-black hover:bg-gray-200 rounded text-xl font-bold transition w-full md:w-auto">TRY AGAIN</button>
          </div>
      );
  }

  if (gameState === GameState.VICTORY) {
      return (
          <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-yellow-900/90 to-black/90 text-white z-50 pointer-events-auto"
              style={{
                  paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
                  paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
                  paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
                  paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))'
              }}
          >
              <h1 className="text-4xl md:text-6xl font-bold mb-2 text-yellow-400 animate-pulse text-center">VICTORY!</h1>
              <p className="text-lg md:text-2xl mb-8 text-yellow-200 text-center">You survived 15 minutes!</p>
              {stats && (
                  <div className="mb-8 text-center space-y-2 text-lg md:text-xl bg-black/50 p-6 rounded-lg border border-yellow-600 w-full md:w-auto">
                      <p>Final Level: <span className="text-yellow-400 font-bold">{stats.level}</span></p>
                      <p>Total Kills: <span className="text-red-400 font-bold">{stats.killCount}</span></p>
                      <p>Gold Earned: <span className="text-yellow-400 font-bold">{stats.gold}</span></p>
                  </div>
              )}
              <button onClick={onRestart} className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-black rounded text-xl font-bold transition border-b-4 border-yellow-800 w-full md:w-auto">PLAY AGAIN</button>
          </div>
      );
  }

  if (gameState === GameState.LEVEL_UP) {
      const currentGold = stats?.gold || 0;
      const rerollTotalCost = REROLL_COST + bidAmount;
      const canAfford = currentGold >= rerollTotalCost;
      const selectedItem = AVAILABLE_UPGRADES.find(u => u.id === selectedTargetId);

      // Calculate probability increase display
      // Formula matches engine: 1 + (Gold/25). Base weight 1.
      const calcProb = (bid: number) => {
          if (!selectedTargetId) return "Base";
          const w = 1 + (bid / 25.0);
          return `${w.toFixed(1)}x Chance`;
      };

      return (
          <div
              className="absolute inset-0 flex flex-col bg-black/95 text-white z-50 pointer-events-auto overflow-y-auto"
              style={{
                  paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
                  paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
                  paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
                  paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))'
              }}
          >
              {/* Top spacer for vertical centering */}
              <div className="flex-1 min-h-0" />
              <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 md:max-h-[700px]">
                  
                  {/* Left Column: Betting & Stats (Mobile: Order 2, Desktop: Order 1) */}
                  <div className="col-span-1 lg:col-span-4 bg-gray-900 border border-gray-700 rounded-xl p-4 md:p-6 flex flex-col shadow-2xl order-2 lg:order-1 h-fit lg:h-full">
                      <h2 className="text-xl md:text-2xl font-bold text-yellow-400 mb-2 border-b border-gray-700 pb-2">BLACK MARKET</h2>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-400 text-sm md:text-base">Your Gold:</span>
                        <span className="text-xl md:text-2xl text-yellow-400 font-mono font-bold">{currentGold}</span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mb-4 max-h-40 lg:max-h-none">
                          <h3 className="text-xs md:text-sm text-gray-300 mb-2 font-bold uppercase tracking-wide">Rig the System</h3>
                          <div className="grid grid-cols-3 lg:grid-cols-2 gap-2">
                              {AVAILABLE_UPGRADES.map(u => (
                                  <button
                                    key={u.id}
                                    onClick={() => {
                                        if (selectedTargetId === u.id) setSelectedTargetId(null);
                                        else setSelectedTargetId(u.id);
                                    }}
                                    className={`p-2 rounded-lg border-2 flex flex-col items-center transition-all
                                        ${selectedTargetId === u.id 
                                            ? 'border-yellow-400 bg-yellow-900/60 shadow-[0_0_10px_rgba(250,204,21,0.3)] scale-105' 
                                            : 'border-gray-700 bg-gray-800 hover:bg-gray-700 hover:border-gray-500'}
                                    `}
                                  >
                                      <div className="text-2xl mb-1">{u.icon}</div>
                                      <div className="text-[9px] font-bold text-center leading-tight truncate w-full">{u.name}</div>
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-700">
                           {selectedTargetId ? (
                               <>
                                   {selectedItem && (
                                       <div className="mb-2 text-xs text-center text-blue-300 italic min-h-[2em] flex items-center justify-center bg-black/30 p-1 rounded">
                                           {selectedItem.description}
                                       </div>
                                   )}
                                   <div className="flex justify-between text-xs md:text-sm mb-2">
                                       <span className="text-gray-300">Bribe Amount:</span>
                                       <span className="text-yellow-400 font-bold">{bidAmount} G</span>
                                   </div>
                                   <input 
                                     type="range" 
                                     min="0" 
                                     max={Math.min(currentGold - REROLL_COST, 500)} 
                                     value={bidAmount}
                                     onChange={(e) => setBidAmount(parseInt(e.target.value))}
                                     className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-400 mb-3"
                                     disabled={currentGold < REROLL_COST}
                                   />
                                   <div className="text-xs text-center">
                                       <span className="text-gray-400">Effect: </span>
                                       <span className="text-green-400 font-bold">{calcProb(bidAmount)}</span>
                                   </div>
                               </>
                           ) : (
                               <div className="text-xs text-gray-500 text-center italic py-2">Select an item above to increase its drop chance.</div>
                           )}
                      </div>
                  </div>

                  {/* Right Column: Slot Machine (Mobile: Order 1, Desktop: Order 2) */}
                  <div className="col-span-1 lg:col-span-8 flex flex-col items-center justify-start lg:justify-center relative order-1 lg:order-2">
                      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 md:mb-8 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-widest">LEVEL UP!</h2>
                      
                      <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-6 md:mb-10 w-full justify-center">
                          {slots.length > 0 ? slots.map((opt, i) => {
                              const bonus = getBonusLevel(opt, slots);
                              let borderClass = 'border-gray-600 bg-gradient-to-b from-gray-800 to-gray-900';
                              let animClass = '';
                              let bonusTag = null;
                              let glowClass = '';

                              // Evolution items get special legendary styling
                              if (opt.type === 'EVOLUTION') {
                                  borderClass = 'border-purple-400 bg-gradient-to-b from-purple-900 to-purple-950';
                                  animClass = 'animate-pulse';
                                  bonusTag = (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-yellow-500 text-white text-[10px] md:text-xs font-black px-2 py-0.5 rounded-full shadow-lg border-2 border-purple-300 z-10 whitespace-nowrap">
                                        EVO!
                                    </div>
                                  );
                                  glowClass = 'shadow-[0_0_50px_rgba(168,85,247,0.6)]';
                              } else if (bonus === 2) {
                                  borderClass = 'border-yellow-400 bg-gradient-to-b from-yellow-900 to-yellow-950';
                                  animClass = 'animate-pulse';
                                  bonusTag = (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[10px] md:text-xs font-black px-2 py-0.5 rounded-full shadow-lg border-2 border-yellow-200 z-10 whitespace-nowrap">
                                        +3
                                    </div>
                                  );
                                  glowClass = 'shadow-[0_0_40px_rgba(250,204,21,0.5)]';
                              } else if (bonus === 1) {
                                  borderClass = 'border-blue-400 bg-gradient-to-b from-blue-900 to-blue-950';
                                  bonusTag = (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] md:text-xs font-black px-2 py-0.5 rounded-full shadow-lg border-2 border-blue-300 z-10 whitespace-nowrap">
                                        +2
                                    </div>
                                  );
                                  glowClass = 'shadow-[0_0_25px_rgba(59,130,246,0.4)]';
                              }

                              return (
                                  <button
                                    key={i}
                                    onClick={() => handleSelectSlot(i)}
                                    disabled={isSpinning}
                                    className={`relative w-full md:w-48 aspect-[3/1] md:aspect-[2/3] flex flex-row md:flex-col items-center p-3 md:p-4 rounded-xl border-4 transition-all transform hover:-translate-y-1 active:scale-95
                                        ${borderClass} ${animClass} ${glowClass} ${isSpinning ? 'blur-sm grayscale' : ''}
                                    `}
                                  >
                                      {bonusTag}

                                      <div className="flex-shrink-0 md:flex-1 flex items-center justify-center mr-4 md:mr-0">
                                          <div className="text-4xl md:text-7xl drop-shadow-lg">{opt.icon}</div>
                                      </div>

                                      <div className="flex-1 w-full bg-black/40 p-2 md:p-3 rounded-lg text-left md:text-center mt-0 md:mt-2">
                                        <h3 className={`text-xs md:text-sm font-bold mb-1 uppercase tracking-wide ${opt.type === 'EVOLUTION' ? 'text-purple-300' : 'text-white'}`}>{opt.name}</h3>
                                        <div className="h-px w-full bg-white/20 my-1 hidden md:block"></div>
                                        <p className="text-[10px] text-gray-300 leading-tight md:min-h-[2.5em] flex items-center justify-start md:justify-center">
                                            {opt.description}
                                        </p>
                                        <div className={`mt-1 md:mt-2 text-[10px] font-mono hidden md:block ${opt.type === 'EVOLUTION' ? 'text-purple-400' : 'text-gray-500'}`}>{opt.type}</div>
                                      </div>
                                  </button>
                              );
                          }) : (
                              <div className="text-white text-xl animate-pulse">Initializing Neural Link...</div>
                          )}
                      </div>

                      <button
                        onClick={() => handleSpin(selectedTargetId, bidAmount, true)}
                        disabled={isSpinning || !canAfford}
                        className={`group relative px-12 md:px-16 py-3 md:py-4 rounded-full font-bold text-lg md:text-xl transition-all flex flex-col items-center border-b-8 active:border-b-0 active:translate-y-2
                             ${canAfford 
                                ? 'bg-red-600 hover:bg-red-500 border-red-900 text-white shadow-lg hover:shadow-red-500/30' 
                                : 'bg-gray-700 border-gray-900 text-gray-500 cursor-not-allowed'}
                        `}
                      >
                          <span className="z-10 flex items-center gap-2">
                            SPIN
                             {selectedTargetId && <span className="text-xs bg-yellow-500 text-black px-1 rounded">RIGGED</span>}
                          </span>
                          <span className="text-xs font-mono opacity-80 mt-1 z-10">Cost: {rerollTotalCost} G</span>
                      </button>
                  </div>
              </div>
              {/* Bottom spacer for vertical centering */}
              <div className="flex-1 min-h-0" />
          </div>
      );
  }

  // HUD
  return (
    <div
        className="absolute inset-0 pointer-events-none flex flex-col justify-between z-40"
        style={{
            paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
            paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))'
        }}
    >
        {/* Countdown Timer - Top Center */}
        <div className="absolute left-1/2 -translate-x-1/2 z-50" style={{ top: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}>
          <div className={`px-4 py-1 md:px-6 md:py-2 rounded-lg border-2 font-mono text-xl md:text-3xl font-bold shadow-lg
            ${(stats?.timeRemaining || 0) <= 60
              ? 'bg-red-900/80 border-red-500 text-red-300 animate-pulse'
              : (stats?.timeRemaining || 0) <= 300
                ? 'bg-yellow-900/80 border-yellow-500 text-yellow-300'
                : 'bg-black/60 border-gray-600 text-white'
            }`}
          >
            {formatTime(stats?.timeRemaining || 0)}
          </div>
        </div>

        {/* Top Bar */}
        <div className="flex justify-between items-start">
            {/* Player Stats - Simplified (HP bar moved to player head) */}
            <div className="bg-black/60 backdrop-blur-sm p-2 md:p-3 rounded-lg text-white border border-gray-700 shadow-lg scale-90 md:scale-100 origin-top-left">
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center text-yellow-400 font-bold text-xs md:text-sm bg-black/40 rounded px-2 py-1 border border-yellow-900/50">
                        <span className="mr-1 md:mr-2 text-base md:text-lg">💰</span>
                        <span>{stats?.gold || 0}</span>
                    </div>
                    <div className="text-gray-400 text-xs md:text-sm">
                        LVL <span className="text-white font-bold">{stats?.level || 1}</span>
                    </div>
                </div>
            </div>

            {/* AI Debug Info (Right Top) - Hidden on Mobile */}
            <div className="hidden md:block bg-black/80 backdrop-blur-sm p-2 rounded border border-gray-700 w-56 text-white font-mono text-[10px] shadow-lg relative group pointer-events-auto">
                {/* Toggle Button for Side Panel */}
                <button 
                    onClick={() => setShowAiPanel(prev => !prev)}
                    className="absolute -left-8 top-0 bg-black/80 p-2 rounded-l border-y border-l border-gray-700 hover:bg-gray-800 text-blue-400 font-bold"
                    title="Toggle AI Brain Monitor (Ctrl+Shift+A)"
                >
                    {showAiPanel ? '»' : '🧠'}
                </button>

                <div className="text-xs font-bold text-blue-400 mb-1 border-b border-gray-600 pb-1 flex justify-between cursor-pointer" onClick={() => setShowAiPanel(true)}>
                    <span>FLOW STATE</span>
                    <span className="text-gray-500 hover:text-white">AI DDA ↗</span>
                </div>
                {stats?.aiDebug ? (
                  <>
                    {/* Classic Flow Diagram: X=Challenge, Y=Skill */}
                    <div className="h-40 w-40 mx-auto bg-gray-900 border border-gray-700 mb-2 relative overflow-hidden rounded">
                        <svg className="w-full h-full block" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                            {/* Background regions */}
                            {/* Boredom region (above diagonal: Skill > Challenge) */}
                            <polygon points="0,0 100,0 0,100" fill="rgba(234,179,8,0.15)" />
                            {/* Anxiety region (below diagonal: Challenge > Skill) */}
                            <polygon points="100,0 100,100 0,100" fill="rgba(239,68,68,0.15)" />

                            {/* Flow channel (diagonal band along Y=X) */}
                            <polygon points="0,90 0,100 100,0 90,0" fill="rgba(59,130,246,0.2)" />

                            {/* Grid lines */}
                            {[25, 50, 75].map(v => (
                                <g key={v}>
                                    <line x1={v} y1="0" x2={v} y2="100" stroke="#333" strokeWidth="0.5" />
                                    <line x1="0" y1={v} x2="100" y2={v} stroke="#333" strokeWidth="0.5" />
                                </g>
                            ))}

                            {/* Diagonal line Y=X (Flow = Challenge matches Skill) */}
                            <line x1="0" y1="100" x2="100" y2="0" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,2" />

                            {/* Trail path */}
                            <path
                                d={getFlowTrailPath()}
                                fill="none"
                                stroke="rgba(255,255,255,0.4)"
                                strokeWidth="1"
                                vectorEffect="non-scaling-stroke"
                            />

                            {/* Current position dot */}
                            {beliefHistory.length > 0 && (() => {
                                const current = beliefHistory[beliefHistory.length - 1];
                                const { x, y } = beliefToFlowCoords(current);
                                const px = x * 100;
                                const py = (1 - y) * 100;
                                // Color based on dominant state
                                const [anx, flow, bore] = current;
                                const dotColor = flow > anx && flow > bore ? '#3b82f6'
                                    : anx > bore ? '#ef4444' : '#eab308';
                                return (
                                    <>
                                        <circle cx={px} cy={py} r="6" fill={dotColor} opacity="0.3" />
                                        <circle cx={px} cy={py} r="3" fill={dotColor} stroke="white" strokeWidth="1" />
                                    </>
                                );
                            })()}

                            {/* Axis labels */}
                            <text x="50" y="98" textAnchor="middle" fill="#888" fontSize="6">Challenge →</text>
                            <text x="3" y="50" textAnchor="start" fill="#888" fontSize="6" transform="rotate(-90, 3, 50)">Skill →</text>

                            {/* Region labels */}
                            <text x="25" y="25" textAnchor="middle" fill="#eab308" fontSize="7" opacity="0.8">BOREDOM</text>
                            <text x="75" y="80" textAnchor="middle" fill="#ef4444" fontSize="7" opacity="0.8">ANXIETY</text>
                            <text x="50" y="50" textAnchor="middle" fill="#3b82f6" fontSize="6" fontWeight="bold" transform="rotate(-45, 50, 50)">FLOW</text>
                        </svg>
                    </div>

                    {/* Current state indicator */}
                    <div className="flex justify-center gap-3 mb-2 text-[9px]">
                        {(() => {
                            const [anx, flow, bore] = stats.aiDebug.beliefState;
                            return (
                                <>
                                    <span className={anx > 0.4 ? 'text-red-400 font-bold' : 'text-gray-500'}>
                                        😰 {(anx * 100).toFixed(0)}%
                                    </span>
                                    <span className={flow > 0.4 ? 'text-blue-400 font-bold' : 'text-gray-500'}>
                                        🎯 {(flow * 100).toFixed(0)}%
                                    </span>
                                    <span className={bore > 0.4 ? 'text-yellow-400 font-bold' : 'text-gray-500'}>
                                        😴 {(bore * 100).toFixed(0)}%
                                    </span>
                                </>
                            );
                        })()}
                    </div>

                    <div className="flex flex-col gap-0.5 text-[9px]">
                        <div className="flex justify-between text-gray-400">
                            <span>AI Action:</span>
                            <span className="text-white font-bold">
                                {['↓Spawn', '↑Spawn', '↑Drop', '↓Drop', '↑Gem', '↓Gem', '—'][stats.aiDebug.lastAction]}
                            </span>
                        </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-500 py-4">Initializing AI...</div>
                )}
            </div>
        </div>
        
        {/* Bottom Section */}
        <div className="flex flex-col gap-2 pointer-events-none">
            {/* XP Bar - DNF Style */}
            <div className="w-full h-4 md:h-6 bg-gray-900/90 rounded-full overflow-hidden relative border-2 border-blue-900 shadow-[0_0_20px_rgba(59,130,246,0.3)] pointer-events-auto">
                <div
                    className="h-full bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 transition-all duration-500 ease-out relative"
                    style={{ width: `${stats ? (stats.xp / stats.nextLevelXp) * 100 : 0}%` }}
                >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent h-1/2" />
                    {/* Moving highlight */}
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"
                        style={{ animationDuration: '1.5s' }}
                    />
                </div>
                {/* XP Text */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] md:text-sm font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wider">
                        EXP {stats?.xp || 0} / {stats?.nextLevelXp || 10}
                    </span>
                </div>
                {/* Level badge */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full border border-blue-400 shadow-lg">
                    Lv.{stats?.level || 1}
                </div>
            </div>

            {/* Bottom Bar: Inventory - Two Rows */}
            <div className="flex justify-between items-end text-white text-xs pointer-events-auto">
             <div className="flex flex-col gap-1">
                 {/* Row 1: Weapons (Red) */}
                 <div className="flex gap-1 flex-wrap max-w-[200px] md:max-w-none">
                     {stats?.inventory.filter(item => item.type === 'WEAPON').map((item, i) => {
                         const evolutionRecipe = EVOLUTION_RECIPES.find(r => r.baseWeapon === item.id);
                         const hasRequiredPassive = evolutionRecipe
                             ? stats.inventory.some(inv => inv.id === evolutionRecipe.requiredPassive)
                             : false;
                         const isMaxLevel = item.level >= MAX_WEAPON_LEVEL;
                         const isEvolutionReady = evolutionRecipe && hasRequiredPassive && isMaxLevel;

                         return (
                             <div
                                 key={`weapon-${i}`}
                                 className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded shadow-md relative group
                                     ${isEvolutionReady
                                         ? 'bg-purple-900 border-2 border-purple-400 animate-pulse'
                                         : isMaxLevel
                                             ? 'bg-yellow-900 border-2 border-yellow-600'
                                             : 'bg-red-900/80 border-2 border-red-500'
                                     }`}
                                 title={item.name}
                             >
                                 <div className="text-base md:text-xl">{item.icon}</div>
                                 <div className={`absolute -top-1 -right-1 md:-top-2 md:-right-2 text-[8px] md:text-[9px] rounded-full w-3 h-3 md:w-4 md:h-4 flex items-center justify-center border
                                     ${isMaxLevel ? 'bg-yellow-600 border-yellow-400 text-black font-bold' : 'bg-red-700 border-red-400'}`}>
                                     {item.level}
                                 </div>
                                 {isEvolutionReady && (
                                     <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[6px] md:text-[8px] text-purple-300 font-bold">
                                         EVO
                                     </div>
                                 )}
                                 {/* Tooltip */}
                                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 bg-black/90 p-2 rounded hidden group-hover:block pointer-events-none z-50 border border-red-600">
                                    <div className={`font-bold mb-1 ${isEvolutionReady ? 'text-purple-400' : 'text-red-400'}`}>{item.name}</div>
                                    <div className="text-[9px] text-gray-300">WEAPON</div>
                                    {evolutionRecipe && (
                                        <div className="text-[8px] mt-1 border-t border-gray-600 pt-1">
                                            <span className={hasRequiredPassive ? 'text-green-400' : 'text-gray-500'}>
                                                + {AVAILABLE_UPGRADES.find(u => u.id === evolutionRecipe.requiredPassive)?.name}
                                            </span>
                                            <span className="text-gray-500"> = </span>
                                            <span className="text-purple-400">{evolutionRecipe.evolvedName}</span>
                                        </div>
                                    )}
                                 </div>
                             </div>
                         );
                     })}
                 </div>
                 {/* Row 2: Passives (Blue) */}
                 <div className="flex gap-1 flex-wrap max-w-[200px] md:max-w-none">
                     {stats?.inventory.filter(item => item.type === 'PASSIVE').map((item, i) => (
                         <div
                             key={`passive-${i}`}
                             className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded shadow-md relative group bg-blue-900/80 border-2 border-blue-500"
                             title={item.name}
                         >
                             <div className="text-base md:text-xl">{item.icon}</div>
                             <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 text-[8px] md:text-[9px] rounded-full w-3 h-3 md:w-4 md:h-4 flex items-center justify-center border bg-blue-700 border-blue-400">
                                 {item.level}
                             </div>
                             {/* Tooltip */}
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 bg-black/90 p-2 rounded hidden group-hover:block pointer-events-none z-50 border border-blue-600">
                                <div className="font-bold mb-1 text-blue-400">{item.name}</div>
                                <div className="text-[9px] text-gray-300">PASSIVE</div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
             <div className="text-right text-gray-400 font-mono text-[10px] md:text-xs">
                 Kills: <span className="text-white">{stats?.killCount || 0}</span> | Time: <span className="text-white">{stats?.timeElapsed || 0}</span>
             </div>
            </div>
        </div>

        {gameState === GameState.PAUSED && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-auto backdrop-blur-sm z-50">
                <button onClick={onResume} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 border-b-4 border-blue-800 rounded text-xl font-bold text-white transition transform hover:-translate-y-1">RESUME</button>
            </div>
        )}

        {/* AI Brain Monitor Side Panel */}
        <div 
            className={`fixed top-0 right-0 h-full w-80 bg-gray-900/95 border-l border-blue-500 shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out overflow-y-auto pointer-events-auto
                ${showAiPanel ? 'translate-x-0' : 'translate-x-full'}
            `}
            style={{ paddingTop: 'max(4rem, env(safe-area-inset-top, 0px))' }}
        >
            <div className="p-4">
                <div className="flex justify-between items-center mb-6 border-b border-blue-500/30 pb-2">
                    <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                        <span>🧠</span> AI Internals
                    </h2>
                    <button
                        onClick={() => setShowAiPanel(false)}
                        className="text-gray-400 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                {stats?.aiDebug ? (
                    <div className="space-y-6">
                        {/* 1. Entropy & Status */}
                        <div className="bg-black/40 p-3 rounded border border-gray-700/50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-400 uppercase">Uncertainty (Entropy)</span>
                                <span className={`font-mono font-bold ${stats.aiDebug.entropy > 1.0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {stats.aiDebug.entropy.toFixed(3)}
                                </span>
                            </div>
                            <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${stats.aiDebug.entropy > 1.0 ? 'bg-red-500' : 'bg-green-500'}`} 
                                    style={{ width: `${Math.min(stats.aiDebug.entropy * 50, 100)}%` }} 
                                />
                            </div>
                        </div>

                        {/* 2. Belief Update */}
                        <div>
                            <h3 className="text-xs text-gray-400 mb-3 uppercase font-bold tracking-wider">Belief Update</h3>
                            <div className="space-y-3">
                                {['Anxiety', 'Flow', 'Boredom'].map((state, i) => {
                                    const prior = stats.aiDebug!.priorState ? stats.aiDebug!.priorState[i] : 0;
                                    const posterior = stats.aiDebug!.beliefState[i];
                                    const diff = posterior - prior;
                                    const color = i === 0 ? 'bg-red-500' : i === 1 ? 'bg-blue-500' : 'bg-yellow-500';
                                    const textColor = i === 0 ? 'text-red-400' : i === 1 ? 'text-blue-400' : 'text-yellow-400';
                                    
                                    return (
                                        <div key={state} className="relative bg-black/20 p-2 rounded">
                                            <div className="flex justify-between text-[10px] text-gray-300 mb-1">
                                                <span className={`font-bold ${textColor}`}>{state}</span>
                                                <div className="flex gap-2 font-mono">
                                                    <span className="text-gray-500 opacity-60">{prior.toFixed(2)}</span>
                                                    <span className="text-gray-600">→</span>
                                                    <span className="text-white font-bold">{posterior.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden relative mt-1">
                                                <div 
                                                    className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-20" 
                                                    style={{ left: `${prior * 100}%` }}
                                                />
                                                <div 
                                                    className={`h-full ${color} transition-all duration-300`} 
                                                    style={{ width: `${posterior * 100}%` }} 
                                                />
                                            </div>
                                            <div className={`text-[9px] text-right mt-0.5 ${diff > 0 ? 'text-green-500' : 'text-red-500/50'}`}>
                                                {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Observations */}
                        <div>
                            <h3 className="text-xs text-gray-400 mb-3 uppercase font-bold tracking-wider">Sensory Inputs</h3>
                            <div className="grid grid-cols-3 gap-2 text-[10px] text-center font-mono">
                                <div className="bg-black/40 p-2 rounded border border-gray-800">
                                    <div className="text-gray-500 mb-1">Health</div>
                                    <div className="text-green-300 font-bold">{stats.aiDebug.currentObservations[0]}</div>
                                </div>
                                <div className="bg-black/40 p-2 rounded border border-gray-800">
                                    <div className="text-gray-500 mb-1">Encircle</div>
                                    <div className="text-red-300 font-bold">{stats.aiDebug.currentObservations[1]}</div>
                                </div>
                                <div className="bg-black/40 p-2 rounded border border-gray-800">
                                    <div className="text-gray-500 mb-1">Streak</div>
                                    <div className="text-yellow-300 font-bold">{stats.aiDebug.currentObservations[2]}</div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Action Selection */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <h3 className="text-xs text-gray-400 mb-3 uppercase font-bold tracking-wider flex justify-between">
                                <span>Action Plan (EFE)</span>
                                <span className="text-[9px] normal-case opacity-50">Lower G = Better</span>
                            </h3>
                            <div className="space-y-1 overflow-y-auto max-h-60 pr-1 custom-scrollbar">
                                {['↓Spawn (Harder)', '↑Spawn (Easier)', '↑Drop (Easier)', '↓Drop (Harder)', '↑Gem Life (Easier)', '↓Gem Life (Harder)', 'Do Nothing'].map((label, i) => {
                                    const g = stats.aiDebug!.efe[i];
                                    const isSelected = stats.aiDebug!.lastAction === i;
                                    
                                    return (
                                        <div 
                                            key={i} 
                                            className={`flex justify-between items-center px-3 py-2 rounded text-xs border transition-all
                                                ${isSelected 
                                                    ? 'bg-blue-900/40 border-blue-500/50 text-white shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
                                                    : 'bg-black/20 border-transparent text-gray-500 hover:bg-white/5'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-400 animate-pulse' : 'bg-gray-700'}`} />
                                                <span className={isSelected ? 'font-bold' : ''}>{label}</span>
                                            </div>
                                            <span className="font-mono text-[10px] opacity-70">{g.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-500 text-sm text-center italic mt-10">
                        AI System Offline
                    </div>
                )}
            </div>
        </div>

        {/* Debug Panel - Evolution Table Only */}
        {showDebugPanel && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/95 border-2 border-purple-500 rounded-lg p-4 z-[100] pointer-events-auto min-w-[320px] md:min-w-[600px] max-h-[90vh] overflow-auto shadow-2xl">
                <div className="flex justify-between items-center mb-4 border-b border-purple-500 pb-2">
                    <h2 className="text-lg md:text-xl font-bold text-purple-400">Evolution Recipes (Debug)</h2>
                    <button
                        onClick={() => setShowDebugPanel(false)}
                        className="text-gray-400 hover:text-white text-xl px-2"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Evolution Table Content */}
                <h3 className="text-sm font-bold text-gray-400 mb-2 border-b border-gray-700 pb-1">Evolution Recipes</h3>
                <table className="w-full text-xs md:text-sm">
                    <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-700">
                            <th className="py-2 px-2">Base Weapon</th>
                            <th className="py-2 px-2">Lvl</th>
                            <th className="py-2 px-2 hidden md:table-cell">+</th>
                            <th className="py-2 px-2">Passive</th>
                            <th className="py-2 px-2 hidden md:table-cell">=</th>
                            <th className="py-2 px-2">Evolution</th>
                            <th className="py-2 px-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {EVOLUTION_RECIPES.map((recipe, i) => {
                            const weapon = stats?.inventory.find(inv => inv.id === recipe.baseWeapon && inv.type === 'WEAPON');
                            const passive = stats?.inventory.find(inv => inv.id === recipe.requiredPassive && inv.type === 'PASSIVE');
                            const weaponLevel = weapon?.level || 0;
                            const hasPassive = !!passive;
                            const isMaxLevel = weaponLevel >= MAX_WEAPON_LEVEL;
                            const canEvolve = isMaxLevel && hasPassive;
                            const alreadyEvolved = stats?.inventory.some(inv => inv.id === recipe.evolvedWeapon);

                            const baseUpgrade = AVAILABLE_UPGRADES.find(u => u.id === recipe.baseWeapon);
                            const passiveUpgrade = AVAILABLE_UPGRADES.find(u => u.id === recipe.requiredPassive);

                            let statusText = '';
                            let statusColor = 'text-gray-500';
                            if (alreadyEvolved) {
                                statusText = 'EVOLVED';
                                statusColor = 'text-green-400';
                            } else if (canEvolve) {
                                statusText = 'READY!';
                                statusColor = 'text-purple-400 animate-pulse';
                            } else if (weaponLevel === 0 && !hasPassive) {
                                statusText = 'Missing Both';
                                statusColor = 'text-gray-500';
                            } else if (!isMaxLevel && !hasPassive) {
                                statusText = `Lvl ${weaponLevel}/${MAX_WEAPON_LEVEL}, No Passive`;
                                statusColor = 'text-yellow-600';
                            } else if (!isMaxLevel) {
                                statusText = `Lvl ${weaponLevel}/${MAX_WEAPON_LEVEL}`;
                                statusColor = 'text-yellow-500';
                            } else {
                                statusText = 'Need Passive';
                                statusColor = 'text-orange-400';
                            }

                            return (
                                <tr key={i} className={`border-b border-gray-800 ${canEvolve ? 'bg-purple-900/30' : ''}`}>
                                    <td className="py-2 px-2">
                                        <span className={weaponLevel > 0 ? 'text-white' : 'text-gray-500'}>
                                            {baseUpgrade?.icon} <span className="hidden md:inline">{baseUpgrade?.name}</span>
                                        </span>
                                    </td>
                                    <td className={`py-2 px-2 font-mono ${isMaxLevel ? 'text-yellow-400 font-bold' : weaponLevel > 0 ? 'text-white' : 'text-gray-500'}`}>
                                        {weaponLevel}/{MAX_WEAPON_LEVEL}
                                    </td>
                                    <td className="py-2 px-2 text-gray-500 hidden md:table-cell">+</td>
                                    <td className="py-2 px-2">
                                        <span className={hasPassive ? 'text-green-400' : 'text-gray-500'}>
                                            {passiveUpgrade?.icon} <span className="hidden md:inline">{passiveUpgrade?.name}</span>
                                            {hasPassive && <span className="ml-1 text-xs hidden md:inline">(Lv{passive?.level})</span>}
                                        </span>
                                    </td>
                                    <td className="py-2 px-2 text-gray-500 hidden md:table-cell">=</td>
                                    <td className="py-2 px-2">
                                        <span className={alreadyEvolved ? 'text-green-400' : canEvolve ? 'text-purple-400' : 'text-gray-500'}>
                                            {recipe.evolvedIcon} <span className="hidden md:inline">{recipe.evolvedName}</span>
                                        </span>
                                    </td>
                                    <td className={`py-2 px-2 font-bold ${statusColor}`}>
                                        {statusText}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="mt-4 flex flex-col gap-3 border-t border-gray-700 pt-3">
                    {/* Scale Slider */}
                    {onUpdateProjectileScale && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 rounded border border-gray-700">
                            <span className="text-gray-400 text-xs whitespace-nowrap">Projectile Scale:</span>
                            <input 
                                type="range" 
                                min="0.5" 
                                max="5.0" 
                                step="0.1" 
                                value={projectileScale}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setProjectileScale(val);
                                    onUpdateProjectileScale(val);
                                }}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                            />
                            <span className="text-yellow-400 font-mono text-xs w-8 text-right">{projectileScale.toFixed(1)}x</span>
                        </div>
                    )}

                    <div className="flex items-center gap-3 flex-wrap justify-center">
                    {onSpawnTestXP && (
                        <button
                            onClick={onSpawnTestXP}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded border-b-2 border-blue-800 transition text-sm"
                        >
                            Spawn XP
                        </button>
                    )}
                    {onToggleGodMode && (
                        <button
                            onClick={() => onToggleGodMode(!stats?.isGodMode)}
                            className={`px-3 py-2 font-bold rounded border-b-2 transition text-sm flex items-center gap-2
                                ${stats?.isGodMode 
                                    ? 'bg-red-600 hover:bg-red-500 border-red-800 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]' 
                                    : 'bg-gray-700 hover:bg-gray-600 border-gray-900 text-gray-300'}
                            `}
                        >
                            <span>{stats?.isGodMode ? '⚡ GOD ON' : '🛡️ GOD OFF'}</span>
                        </button>
                    )}
                    {onTriggerLevelUp && (
                        <button
                            onClick={onTriggerLevelUp}
                            className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded border-b-2 border-yellow-800 transition text-sm"
                        >
                            Level Up
                        </button>
                    )}
                    <span className="text-xs text-gray-500 hidden md:inline">
                        <kbd className="bg-gray-700 px-1 rounded">Ctrl</kbd>+<kbd className="bg-gray-700 px-1 rounded">Shift</kbd>+<kbd className="bg-gray-700 px-1 rounded">D</kbd>
                    </span>
                </div>
                </div>

                {/* Grant Max Level Items */}
                {onGrantMaxLevelItem && (
                    <div className="mt-4 border-t border-gray-700 pt-3">
                        <h3 className="text-sm text-gray-400 mb-2">Grant Max Level (Lv8)</h3>
                        <div className="flex flex-wrap gap-1 justify-center">
                            {AVAILABLE_UPGRADES.filter(u => u.type === 'WEAPON').map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => onGrantMaxLevelItem(u.id)}
                                    className="px-2 py-1 bg-red-800 hover:bg-red-600 text-white rounded text-xs border border-red-600"
                                    title={u.name}
                                >
                                    {u.icon}
                                </button>
                            ))}
                            {AVAILABLE_UPGRADES.filter(u => u.type === 'PASSIVE').map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => onGrantMaxLevelItem(u.id)}
                                    className="px-2 py-1 bg-blue-800 hover:bg-blue-600 text-white rounded text-xs border border-blue-600"
                                    title={u.name}
                                >
                                    {u.icon}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default UIOverlay;