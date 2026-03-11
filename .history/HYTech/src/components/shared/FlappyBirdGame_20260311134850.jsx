import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 580;
const BIRD_SIZE = 40;
const GRAVITY = 0.45;
const FLAP_FORCE = -9;
const PIPE_WIDTH = 58;
const PIPE_GAP = 165;
const PIPE_SPEED = 2.8;
const PIPE_INTERVAL = 1600; // ms between pipes

const FlappyBirdGame = ({ onClose }) => {
  const canvasRef = useRef(null);
  const gsRef = useRef({
    bird: { x: 100, y: CANVAS_HEIGHT / 2, vy: 0 },
    pipes: [],
    score: 0,
    gameOver: false,
    started: false,
    frameId: null,
    lastPipeTime: 0,
    logoImg: null,
  });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const flap = useCallback(() => {
    const gs = gsRef.current;
    if (gs.gameOver) {
      // restart
      gs.bird = { x: 100, y: CANVAS_HEIGHT / 2, vy: 0 };
      gs.pipes = [];
      gs.score = 0;
      gs.gameOver = false;
      gs.started = true;
      gs.lastPipeTime = performance.now();
      setScore(0);
      setGameOver(false);
      return;
    }
    if (!gs.started) {
      gs.started = true;
      gs.lastPipeTime = performance.now();
    }
    gs.bird.vy = FLAP_FORCE;
  }, []);

  useEffect(() => {
    // Pre-load bird image
    const img = new Image();
    img.src = '/images/hyt_logo.png';
    img.onload = () => { gsRef.current.logoImg = img; };

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const addPipe = (now) => {
      const minTop = 70;
      const maxTop = CANVAS_HEIGHT - PIPE_GAP - 70;
      const topHeight = Math.random() * (maxTop - minTop) + minTop;
      gsRef.current.pipes.push({ x: CANVAS_WIDTH, topHeight, scored: false });
      gsRef.current.lastPipeTime = now;
    };

    const drawRoundRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const loop = (now) => {
      const gs = gsRef.current;

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      skyGrad.addColorStop(0, '#87CEEB');
      skyGrad.addColorStop(1, '#C9E8F5');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Ground
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(0, CANVAS_HEIGHT - 40, CANVAS_WIDTH, 40);
      ctx.fillStyle = '#8BC34A';
      ctx.fillRect(0, CANVAS_HEIGHT - 40, CANVAS_WIDTH, 10);

      if (gs.started && !gs.gameOver) {
        // Physics
        gs.bird.vy += GRAVITY;
        gs.bird.y += gs.bird.vy;

        // Spawn pipes
        if (now - gs.lastPipeTime > PIPE_INTERVAL) addPipe(now);

        // Move & cull pipes
        gs.pipes.forEach(p => { p.x -= PIPE_SPEED; });
        gs.pipes = gs.pipes.filter(p => p.x > -PIPE_WIDTH - 10);

        // Score
        gs.pipes.forEach(p => {
          if (!p.scored && p.x + PIPE_WIDTH < gs.bird.x) {
            p.scored = true;
            gs.score++;
            setScore(gs.score);
          }
        });

        // Collision: ground / ceiling
        if (gs.bird.y + BIRD_SIZE > CANVAS_HEIGHT - 40 || gs.bird.y < 0) {
          gs.gameOver = true;
          setGameOver(true);
        }

        // Collision: pipes
        const margin = 5;
        gs.pipes.forEach(p => {
          const bx = gs.bird.x, by = gs.bird.y;
          const hitsX = bx + BIRD_SIZE - margin > p.x && bx + margin < p.x + PIPE_WIDTH;
          const hitsY = by + margin < p.topHeight || by + BIRD_SIZE - margin > p.topHeight + PIPE_GAP;
          if (hitsX && hitsY) {
            gs.gameOver = true;
            setGameOver(true);
          }
        });
      }

      // Draw pipes
      gs.pipes.forEach(p => {
        const bottomY = p.topHeight + PIPE_GAP;

        // Top pipe body
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight - 18);
        // Top pipe cap
        ctx.fillStyle = '#388E3C';
        drawRoundRect(p.x - 5, p.topHeight - 22, PIPE_WIDTH + 10, 22, 4);
        ctx.fill();

        // Bottom pipe cap
        ctx.fillStyle = '#388E3C';
        drawRoundRect(p.x - 5, bottomY, PIPE_WIDTH + 10, 22, 4);
        ctx.fill();
        // Bottom pipe body
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(p.x, bottomY + 20, PIPE_WIDTH, CANVAS_HEIGHT - bottomY - 20);

        // Pipe shine
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(p.x + 6, 0, 8, p.topHeight - 18);
        ctx.fillRect(p.x + 6, bottomY + 22, 8, CANVAS_HEIGHT - bottomY - 22);
      });

      // Draw bird with rotation
      ctx.save();
      const angle = Math.min(Math.max(gs.bird.vy * 3, -25), 75) * (Math.PI / 180);
      ctx.translate(gs.bird.x + BIRD_SIZE / 2, gs.bird.y + BIRD_SIZE / 2);
      ctx.rotate(angle);
      if (gs.logoImg && gs.logoImg.complete) {
        ctx.drawImage(gs.logoImg, -BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE);
      } else {
        // Fallback circle
        ctx.fillStyle = '#F97316';
        ctx.beginPath();
        ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HYT', 0, 0);
      }
      ctx.restore();

      // Start overlay
      if (!gs.started) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.font = 'bold 26px Poppins, sans-serif';
        ctx.fillText('HYTech Flappy Bird', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
        ctx.font = '18px Poppins, sans-serif';
        ctx.fillText('Click or press Space to flap!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 0);
        ctx.font = '13px Poppins, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('Avoid the pipes — good luck!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
      }

      // Game over overlay
      if (gs.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#F97316';
        ctx.font = 'bold 40px Poppins, sans-serif';
        ctx.fillText('Game Over!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Poppins, sans-serif';
        ctx.fillText(`Score: ${gs.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '16px Poppins, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText('Click or press Space to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 45);
      }

      gs.frameId = requestAnimationFrame(loop);
    };

    gsRef.current.frameId = requestAnimationFrame(loop);

    const handleKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(gsRef.current.frameId);
      window.removeEventListener('keydown', handleKey);
    };
  }, [flap]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative shadow-2xl rounded-xl overflow-hidden">
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ backgroundColor: '#0B005C' }}
        >
          <div className="flex items-center gap-2">
            <img
              src="/images/hyt_logo.png"
              alt="HYT"
              className="w-6 h-6 object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="text-white font-bold text-sm tracking-wide">HYTech Flappy Bird</span>
            <span className="text-xs text-white/40 ml-1">— secret mode 🐣</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white text-sm font-semibold bg-orange-500 px-3 py-0.5 rounded-full">
              Score: {score}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
              title="Close game"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={flap}
          className="block cursor-pointer"
        />
      </div>
    </div>
  );
};

export default FlappyBirdGame;
