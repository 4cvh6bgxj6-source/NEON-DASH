
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LevelConfig, Obstacle, Skin, Particle } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, PHYSICS } from '../constants';

interface GameCanvasProps {
  config: LevelConfig;
  skin: Skin;
  onGameOver: (score: number, reason: string) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ config, skin, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  
  const gameStateRef = useRef({
    player: { y: GROUND_Y - 40, velocity: 0, size: 40, rotation: 0 },
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    distance: 0,
    isJumping: false,
    lastObstacleX: 0,
    shakeTime: 0
  });

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < PHYSICS.PARTICLE_COUNT; i++) {
      gameStateRef.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 1.0,
        color,
        size: Math.random() * 8 + 2
      });
    }
  };

  const handleInput = useCallback(() => {
    const state = gameStateRef.current;
    
    // Check for Orb Triggering
    const orb = state.obstacles.find(o => 
      o.type === 'orb' && 
      !o.triggered &&
      Math.abs(o.x - 100) < 100 &&
      Math.abs(o.y - state.player.y) < 150
    );

    if (orb) {
      state.player.velocity = config.jumpForce * 1.2;
      orb.triggered = true;
      state.isJumping = true;
      createExplosion(orb.x + 20, orb.y + 20, '#fbbf24');
      return;
    }

    if (!state.isJumping && state.player.y >= GROUND_Y - state.player.size) {
      state.player.velocity = config.jumpForce;
      state.isJumping = true;
    }
  }, [config.jumpForce]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => (e.code === 'Space' || e.code === 'ArrowUp') && handleInput();
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const drawPlayer = (p: any) => {
      ctx.save();
      const px = 100;
      ctx.translate(px + p.size / 2, p.y + p.size / 2);
      ctx.rotate(p.rotation);
      
      // Glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = skin.color;
      
      // Main Cube
      ctx.fillStyle = skin.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.strokeRect(-p.size / 2 + 4, -p.size / 2 + 4, p.size - 8, p.size - 8);

      // Icon details
      ctx.fillStyle = 'white';
      if (skin.iconType === 'pro') {
        ctx.beginPath();
        ctx.moveTo(-10, -10); ctx.lineTo(10, 10);
        ctx.moveTo(10, -10); ctx.lineTo(-10, 10);
        ctx.stroke();
      } else {
        ctx.strokeRect(-8, -8, 16, 16);
      }
      
      ctx.restore();
    };

    const updateParticles = () => {
      gameStateRef.current.particles = gameStateRef.current.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        return p.life > 0;
      });
    };

    const loop = () => {
      const state = gameStateRef.current;
      
      // Update Physics
      state.player.velocity += config.gravity;
      state.player.y += state.player.velocity;

      if (state.player.y > GROUND_Y - state.player.size) {
        state.player.y = GROUND_Y - state.player.size;
        state.player.velocity = 0;
        state.isJumping = false;
        state.player.rotation = Math.round(state.player.rotation / (Math.PI / 2)) * (Math.PI / 2);
      } else {
        state.player.rotation += PHYSICS.ROTATE_SPEED;
      }

      const effectiveSpeed = config.speed * (skin.speedMultiplier || 1);
      state.distance += effectiveSpeed;
      state.obstacles.forEach(obs => (obs.x -= effectiveSpeed));

      // Trail Particles
      if (Math.random() > 0.5) {
        state.particles.push({
          x: 100, y: state.player.y + 20,
          vx: -2 - Math.random() * 2, vy: (Math.random() - 0.5) * 2,
          life: 0.5, color: skin.color, size: Math.random() * 4 + 1
        });
      }

      // Progress Check
      const progress = state.distance / config.levelLength;
      if (progress >= 1) {
          // WIN CONDITION
          onGameOver(Math.floor(state.distance / 100), 'WIN');
          return;
      }

      // Spawning (stop spawning near the end)
      if (progress < 0.95 && state.distance - state.lastObstacleX > config.minGap) {
        if (Math.random() < config.spawnChance) {
          const typeRand = Math.random();
          let type: 'spike' | 'block' | 'orb' = 'spike';
          if (typeRand > 0.8) type = 'orb';
          else if (typeRand > 0.5) type = 'block';

          // Calcola se la trappola deve essere invisibile
          const isHidden = config.hiddenChance ? Math.random() < config.hiddenChance : false;

          state.obstacles.push({
            id: Math.random().toString(),
            x: CANVAS_WIDTH + 100,
            y: type === 'orb' ? GROUND_Y - 150 : GROUND_Y - 40,
            width: 40, height: 40,
            type,
            hidden: isHidden
          });
          state.lastObstacleX = state.distance;
        }
      }

      state.obstacles = state.obstacles.filter(o => o.x > -100);
      updateParticles();

      // Collision
      for (const obs of state.obstacles) {
        if (obs.type === 'orb') continue;
        const px = 100;
        const padding = 6;
        if (
          px + state.player.size - padding > obs.x && 
          px + padding < obs.x + obs.width && 
          state.player.y + state.player.size - padding > obs.y &&
          state.player.y + padding < obs.y + obs.height
        ) {
          createExplosion(px + 20, state.player.y + 20, skin.color);
          setTimeout(() => onGameOver(Math.floor(state.distance / 100), obs.type), 100);
          return;
        }
      }

      // Draw
      ctx.save();
      if (state.shakeTime > 0) {
        ctx.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
        state.shakeTime--;
      }
      
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Progress Bar
      ctx.fillStyle = '#222';
      ctx.fillRect(CANVAS_WIDTH/2 - 200, 20, 400, 8);
      ctx.fillStyle = config.primaryColor;
      ctx.fillRect(CANVAS_WIDTH/2 - 200, 20, 400 * Math.min(progress, 1), 8);

      // Floor
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
      ctx.strokeStyle = config.primaryColor;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CANVAS_WIDTH, GROUND_Y); ctx.stroke();

      drawPlayer(state.player);

      // Obstacles & Particles
      state.obstacles.forEach(obs => {
        // Se l'ostacolo è nascosto, non lo disegniamo o lo disegniamo quasi invisibile
        if (obs.hidden) return;

        ctx.shadowBlur = 15;
        ctx.shadowColor = obs.type === 'orb' ? '#fbbf24' : config.secondaryColor;
        ctx.fillStyle = ctx.shadowColor;
        
        if (obs.type === 'spike') {
          ctx.beginPath(); ctx.moveTo(obs.x, obs.y + 40); ctx.lineTo(obs.x + 20, obs.y); ctx.lineTo(obs.x + 40, obs.y + 40); ctx.fill();
        } else if (obs.type === 'orb') {
          ctx.beginPath(); ctx.arc(obs.x + 20, obs.y + 20, 15, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'white'; ctx.stroke();
        } else {
          ctx.fillRect(obs.x, obs.y, 40, 40);
        }
      });

      state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.globalAlpha = 1.0;
      
      ctx.restore();

      setScore(Math.floor(state.distance / 100));
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [config, skin, onGameOver]);

  return (
    <div className="relative cursor-pointer" onMouseDown={handleInput}>
      <div className="absolute top-12 left-1/2 -translate-x-1/2 text-5xl font-black font-orbitron text-white/80 pointer-events-none">
        {score}
      </div>
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-xl border-4 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-[95vw] h-auto" />
    </div>
  );
};
