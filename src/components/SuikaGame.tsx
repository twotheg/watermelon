'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { World, Vec2, CircleShape, BoxShape } from 'planck';
import {
  BOARD_WIDTH,
  DANGER_RATIO,
  FRUITS,
  clamp,
  getMaxSpawnTier,
  randomSpawnTier,
} from '@/lib/game';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type FruitBodyData = {
  id: number;
  tier: number;
  createdAt: number;
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

function worldToScreenY(canvasHeight: number, scale: number, worldY: number) {
  return canvasHeight - worldY * scale;
}

function drawFruit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  tier: number,
  ghost = false,
  alpha = 1
) {
  const spec = FRUITS[tier];
  ctx.save();
  ctx.globalAlpha = ghost ? 0.65 : alpha;

  const grad = ctx.createRadialGradient(
    x - radius * 0.3,
    y - radius * 0.3,
    radius * 0.1,
    x,
    y,
    radius
  );
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.2, spec.gradient[0]);
  grad.addColorStop(1, spec.gradient[1]);
  
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(
    x - radius * 0.35,
    y - radius * 0.35,
    radius * 0.22,
    radius * 0.12,
    -Math.PI / 4,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.restore();
}

function drawNextFruitPreview(canvas: HTMLCanvasElement, tiers: number[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const w = canvas.clientWidth || 150;
  const h = canvas.clientHeight || 50;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  
  const size = 40;
  const radius = (size / 2) * 0.78;
  
  tiers.forEach((tier, i) => {
    const alpha = i === 0 ? 1 : i === 1 ? 0.6 : 0.3;
    drawFruit(ctx, 25 + i * 45, h / 2, radius, tier, false, alpha);
  });
}

export default function SuikaGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const worldRef = useRef<World | null>(null);
  const bodiesRef = useRef<Map<number, ReturnType<World['createBody']>>>(new Map());
  const nextIdRef = useRef(1);
  const currentFruitRef = useRef<{ id: number; tier: number; body: ReturnType<World['createBody']> } | null>(null);
  const nextTierRef = useRef(0);
  const scoreRef = useRef(0);
  const dropsRef = useRef(0);
  const gameOverRef = useRef(false);
  const canSpawnRef = useRef(true);
  const spawnCooldownRef = useRef(0);
  const overTimesRef = useRef<Map<number, number>>(new Map());
  const particlesRef = useRef<Particle[]>([]);
  const pendingMergesRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const scaleRef = useRef(1);
  const worldHeightRef = useRef(1);
  const targetXRef = useRef(BOARD_WIDTH / 2);
  const pointerDownRef = useRef(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [nextTiers, setNextTiers] = useState<number[]>([0, 0, 0]);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'over'>('ready');
  const [playerName, setPlayerName] = useState('나');
  const [rankMessage, setRankMessage] = useState('');

  
  // 5. Sound functions
  const playSound = useCallback((type: 'drop' | 'merge') => {
    if (!isSoundOn) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      if (type === 'drop') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'merge') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        
        setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(800, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.15);
        }, 50);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      }
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
    } catch (e) {
      console.error(e);
    }
  }, [isSoundOn]);

  const getScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { scale: 1, worldHeight: 1 };
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / BOARD_WIDTH;
    const worldHeight = rect.height / scale;
    return { scale, worldHeight, width: rect.width, height: rect.height };
  }, []);

  const createWalls = useCallback((world: World, worldHeight: number) => {
    const ground = world.createBody({ type: 'static' });
    ground.createFixture(BoxShape(BOARD_WIDTH / 2, 0.25), { friction: 0.5 });
    ground.setPosition(Vec2(BOARD_WIDTH / 2, -0.25));

    const left = world.createBody({ type: 'static' });
    left.createFixture(BoxShape(0.25, worldHeight / 2), { friction: 0.2 });
    left.setPosition(Vec2(-0.25, worldHeight / 2));

    const right = world.createBody({ type: 'static' });
    right.createFixture(BoxShape(0.25, worldHeight / 2), { friction: 0.2 });
    right.setPosition(Vec2(BOARD_WIDTH + 0.25, worldHeight / 2));
  }, []);

  const spawnFruit = useCallback(
    (tier: number, x: number, y: number, dynamic = true) => {
      const world = worldRef.current;
      if (!world) return null;
      const id = nextIdRef.current++;
      const spec = FRUITS[tier];
      const body = world.createBody({
        type: dynamic ? 'dynamic' : 'static',
        position: Vec2(x, y),
        bullet: dynamic,
        angularDamping: 0.3,
        linearDamping: 0.1,
      });
      body.createFixture(CircleShape(spec.radius), {
        density: 1,
        friction: 0.45,
        restitution: 0.2,
      });
      body.setUserData({ id, tier, createdAt: Date.now() } as FruitBodyData);
      bodiesRef.current.set(id, body);
      return { id, tier, body };
    },
    []
  );

  const addParticles = useCallback((x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color,
        size: 0.08 + Math.random() * 0.12,
      });
    }
  }, []);

  const handleMerge = useCallback(
    (idA: number, idB: number) => {
      const world = worldRef.current;
      if (!world) return;
      const bodyA = bodiesRef.current.get(idA);
      const bodyB = bodiesRef.current.get(idB);
      if (!bodyA || !bodyB) return;
      const dataA = bodyA.getUserData() as FruitBodyData;
      const dataB = bodyB.getUserData() as FruitBodyData;
      if (dataA.tier !== dataB.tier || dataA.tier >= FRUITS.length - 1) return;

      const posA = bodyA.getPosition();
      const posB = bodyB.getPosition();
      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2;
      const newTier = dataA.tier + 1;

      world.destroyBody(bodyA);
      world.destroyBody(bodyB);
      bodiesRef.current.delete(idA);
      bodiesRef.current.delete(idB);
      overTimesRef.current.delete(idA);
      overTimesRef.current.delete(idB);

      playSound('merge');
      const merged = spawnFruit(newTier, midX, midY, true);
      if (merged) {
        merged.body.setLinearVelocity(Vec2(0, 3));
        merged.body.setAngularVelocity((Math.random() - 0.5) * 4);
        const spec = FRUITS[newTier];
        addParticles(midX, midY, spec.color, 18);
        scoreRef.current += spec.score;
        setScore(scoreRef.current);
      }
    },
    [spawnFruit, addParticles]
  );

  const queueMerge = useCallback((idA: number, idB: number) => {
    const key = idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
    if (pendingMergesRef.current.has(key)) return;
    pendingMergesRef.current.add(key);
    // Defer merge to avoid Box2D step mutation
    setTimeout(() => {
      handleMerge(idA, idB);
      pendingMergesRef.current.delete(key);
    }, 0);
  }, [handleMerge]);

  const setupWorld = useCallback(() => {
    const { scale, worldHeight } = getScale();
    scaleRef.current = scale;
    worldHeightRef.current = worldHeight;

    const world = new World(Vec2(0, -28));
    worldRef.current = world;
    createWalls(world, worldHeight);

    world.on('begin-contact', (contact) => {
      const fixtureA = contact.getFixtureA();
      const fixtureB = contact.getFixtureB();
      const bodyA = fixtureA.getBody();
      const bodyB = fixtureB.getBody();
      const dataA = bodyA.getUserData() as FruitBodyData | null;
      const dataB = bodyB.getUserData() as FruitBodyData | null;
      if (!dataA || !dataB) return;
      if (dataA.tier === dataB.tier && dataA.tier < FRUITS.length - 1) {
        queueMerge(dataA.id, dataB.id);
      }
    });
  }, [createWalls, getScale, queueMerge]);

  const startGame = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (worldRef.current) {
      // Destroy existing bodies
      for (const body of bodiesRef.current.values()) {
        worldRef.current.destroyBody(body);
      }
    }
    bodiesRef.current.clear();
    nextIdRef.current = 1;
    scoreRef.current = 0;
    dropsRef.current = 0;
    setScore(0);
    setRankMessage('');
    gameOverRef.current = false;
    canSpawnRef.current = true;
    spawnCooldownRef.current = 0;
    overTimesRef.current.clear();
    particlesRef.current = [];
    pendingMergesRef.current.clear();
    currentFruitRef.current = null;

    setupWorld();

    const t0 = randomSpawnTier(getMaxSpawnTier(0, 0));
    const nextList = [
      randomSpawnTier(getMaxSpawnTier(0, 0)),
      randomSpawnTier(getMaxSpawnTier(0, 0)),
      randomSpawnTier(getMaxSpawnTier(0, 0))
    ];
    nextTierRef.current = nextList[0];
    setNextTiers(nextList);

    const fruit = spawnFruit(t0, BOARD_WIDTH / 2, worldHeightRef.current - FRUITS[t0].radius - 0.4, false);
    if (fruit) {
      currentFruitRef.current = fruit;
    }
    setGameState('playing');
  }, [setupWorld, spawnFruit]);

  const dropCurrentFruit = useCallback(() => {
    if (gameOverRef.current || !canSpawnRef.current) return;
    const current = currentFruitRef.current;
    if (!current) return;
    const world = worldRef.current;
    if (!world) return;

    const x = clamp(targetXRef.current, FRUITS[current.tier].radius, BOARD_WIDTH - FRUITS[current.tier].radius);
    const y = worldHeightRef.current - FRUITS[current.tier].radius - 0.3;

    // Replace static preview with dynamic body
    world.destroyBody(current.body);
    bodiesRef.current.delete(current.id);

    playSound('drop');
    const dynamic = spawnFruit(current.tier, x, y, true);
    if (!dynamic) return;

    currentFruitRef.current = dynamic;
    canSpawnRef.current = false;
    spawnCooldownRef.current = Date.now();
    dropsRef.current += 1;

    // Schedule next spawn
    const spawnNextFruit = () => {
      const maxTier = getMaxSpawnTier(scoreRef.current, dropsRef.current);
      setNextTiers((prev) => {
        const nextList = [...prev.slice(1), randomSpawnTier(maxTier)];
        nextTierRef.current = nextList[0];
        return nextList;
      });
      const tier = nextTierRef.current;

      const startX = clamp(targetXRef.current, FRUITS[tier].radius, BOARD_WIDTH - FRUITS[tier].radius);
      const startY = worldHeightRef.current - FRUITS[tier].radius - 0.4;
      const fruit = spawnFruit(tier, startX, startY, false);
      if (fruit) {
        currentFruitRef.current = fruit;
      }
      canSpawnRef.current = true;
    };

    const waitForNext = () => {
      if (gameOverRef.current) return;
      const elapsed = Date.now() - spawnCooldownRef.current;
      const stillExists = bodiesRef.current.has(dynamic.id);

      if (!stillExists) {
        // Current fruit was merged before landing
        spawnNextFruit();
        return;
      }

      const speed = dynamic.body.getLinearVelocity().length();
      if (elapsed > 1200 || (elapsed > 400 && speed < 0.15 && dynamic.body.isAwake() === false)) {
        spawnNextFruit();
      } else {
        requestAnimationFrame(waitForNext);
      }
    };
    requestAnimationFrame(waitForNext);
  }, [spawnFruit]);

  const checkGameOver = useCallback(() => {
    if (gameOverRef.current) return;
    const dangerY = worldHeightRef.current * DANGER_RATIO;
    const now = Date.now();
    let anyOver = false;

    for (const body of bodiesRef.current.values()) {
      const data = body.getUserData() as FruitBodyData;
      const current = currentFruitRef.current;
      if (current && data.id === current.id) continue;
      if (now - data.createdAt < 1200) continue;

      const pos = body.getPosition();
      if (pos.y > dangerY) {
        anyOver = true;
        const start = overTimesRef.current.get(data.id);
        if (!start) {
          overTimesRef.current.set(data.id, now);
        } else if (now - start > 1800) {
          gameOverRef.current = true;
          setGameState('over');
          if (scoreRef.current > bestScore) {
            setBestScore(scoreRef.current);
            localStorage.setItem('watermelonHighScore', scoreRef.current.toString());
          }
          return;
        }
      } else {
        overTimesRef.current.delete(data.id);
      }
    }
    if (!anyOver) {
      overTimesRef.current.clear();
    }
  }, [bestScore]);

  const saveScore = useCallback(async () => {
    try {
      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName || '익명', score: scoreRef.current }),
      });
      const res = await fetch('/api/score?limit=1');
      const data = await res.json();
      const top = data.scores?.[0]?.score ?? 0;
      if (scoreRef.current >= top) {
        setRankMessage('🏆 현재 최고 기록입니다!');
      } else {
        setRankMessage('기록이 저장되었어요!');
      }
    } catch {
      setRankMessage('기록 저장에 실패했어요.');
    }
  }, [playerName]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scaleRef.current;
    targetXRef.current = clamp(x, 0, BOARD_WIDTH);
    if (currentFruitRef.current && currentFruitRef.current.body.getType() === 'static') {
      const spec = FRUITS[currentFruitRef.current.tier];
      const nx = clamp(targetXRef.current, spec.radius, BOARD_WIDTH - spec.radius);
      currentFruitRef.current.body.setPosition(Vec2(nx, worldHeightRef.current - spec.radius - 0.4));
    }
  }, []);

  const handlePointerDown = useCallback(() => {
    pointerDownRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = false;
    if (gameState === 'playing') {
      dropCurrentFruit();
    }
  }, [dropCurrentFruit, gameState]);

    useEffect(() => {
    const localBest = localStorage.getItem('watermelonHighScore');
    if (localBest) {
      setBestScore(parseInt(localBest));
    }
    fetch('/api/score?limit=1')
      .then((r) => r.json())
      .then((data) => {
        const top = data.scores?.[0]?.score ?? 0;
        if (top > parseInt(localBest || '0')) {
          setBestScore(top);
          localStorage.setItem('watermelonHighScore', top.toString());
        }
      })
      .catch(() => {});
  }, []);

  // Install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width * dpr);
      canvas.height = Math.max(1, rect.height * dpr);
      const { scale, worldHeight } = getScale();
      scaleRef.current = scale;
      worldHeightRef.current = worldHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      const world = worldRef.current;
      if (!world) return;
      world.step(1 / 60, 8, 3);
      checkGameOver();

      const rect = canvas.getBoundingClientRect();
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Background board
      ctx.fillStyle = '#FFF8E7';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Wood frame
      ctx.save();
      ctx.translate(0, canvasHeight);
      ctx.scale(scaleRef.current, -scaleRef.current);

      // Container back
      ctx.fillStyle = '#F5E6C8';
      ctx.fillRect(0, 0, BOARD_WIDTH, worldHeightRef.current);

      // Danger line
      const dangerY = worldHeightRef.current * DANGER_RATIO;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 0.08;
      ctx.setLineDash([0.4, 0.25]);
      ctx.beginPath();
      ctx.moveTo(0, dangerY);
      ctx.lineTo(BOARD_WIDTH, dangerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Fruits
      for (const body of bodiesRef.current.values()) {
        const data = body.getUserData() as FruitBodyData;
        const pos = body.getPosition();
        const angle = body.getAngle();
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(-angle);
        drawFruit(ctx, 0, 0, FRUITS[data.tier].radius, data.tier);
        ctx.restore();
      }

      // Walls
      ctx.fillStyle = '#8D6E63';
      ctx.fillRect(-0.5, -0.5, 0.5, worldHeightRef.current + 1);
      ctx.fillRect(BOARD_WIDTH, -0.5, 0.5, worldHeightRef.current + 1);
      ctx.fillRect(-0.5, -0.5, BOARD_WIDTH + 1, 0.5);

      ctx.restore();

      // Particles (screen space)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life -= 0.03;
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        const sx = p.x * scaleRef.current;
        const sy = worldToScreenY(canvasHeight, scaleRef.current, p.y);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * scaleRef.current, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.vx * (1 / 60);
        p.y += p.vy * (1 / 60);
        p.vy -= 4 * (1 / 60);
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [gameState, checkGameOver, getScale]);

  // Update next preview
  useEffect(() => {
    if (previewRef.current) {
      drawNextFruitPreview(previewRef.current, nextTiers);
    }
  }, [nextTiers]);

  const installApp = async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    setDeferredInstallPrompt(null);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[#FFF8E7] text-slate-900">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍉</span>
          <h1 className="text-lg font-bold text-green-700">수박 합치기</h1>
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <button onClick={() => setIsSoundOn(!isSoundOn)} className="text-2xl">
            {isSoundOn ? '🔊' : '🔇'}
          </button>
          <div className="rounded-full bg-white px-3 py-1 shadow">최고: {bestScore.toLocaleString()}</div>
          <div className="rounded-full bg-green-100 px-3 py-1 text-green-800 shadow">점수: {score.toLocaleString()}</div>
        </div>
      </header>

      <main className="relative flex-1 px-4 pb-4">
        <div
          ref={containerRef}
          className="relative mx-auto aspect-[9/14] w-full max-w-[420px] overflow-hidden rounded-2xl border-4 border-[#8D6E63] bg-[#F5E6C8] shadow-xl"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full touch-none"
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />

          {gameState === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 p-6 text-center text-white backdrop-blur-sm">
              <div className="text-6xl mb-4">🍉</div>
              <h2 className="mb-2 text-3xl font-bold">수박 합치기</h2>
              <p className="mb-6 max-w-[260px] text-sm leading-relaxed opacity-90">
                작은 블루베리부터 시작해서<br />같은 과일끼리 합쳐 수박을 만들어 보세요!
              </p>
              <button
                onClick={startGame}
                className="rounded-full bg-green-500 px-8 py-3 font-bold text-white shadow-lg transition hover:scale-105 hover:bg-green-600 active:scale-95"
              >
                게임 시작
              </button>
            </div>
          )}

          {gameState === 'over' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-6 text-center text-white backdrop-blur-sm">
              <h2 className="mb-1 text-3xl font-bold">게임 오버</h2>
              <p className="mb-4 text-2xl font-semibold text-yellow-300">{score.toLocaleString()}점</p>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={10}
                className="mb-3 w-40 rounded-lg px-3 py-2 text-center text-slate-900 outline-none focus:ring-2 focus:ring-green-400"
                placeholder="이름"
              />
              {rankMessage && <p className="mb-2 text-sm text-green-200">{rankMessage}</p>}
              <div className="flex gap-3">
                <button
                  onClick={saveScore}
                  className="rounded-full bg-blue-500 px-5 py-2 font-semibold shadow hover:bg-blue-600"
                >
                  기록 저장
                </button>
                <button
                  onClick={startGame}
                  className="rounded-full bg-green-500 px-5 py-2 font-semibold shadow hover:bg-green-600"
                >
                  다시 하기
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-white p-3 shadow">
         <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-600">다음 과일</span>
        <canvas ref={previewRef} className="h-[50px] w-[150px]" />
        <span className="text-sm font-bold text-slate-800">{FRUITS[nextTiers[0]]?.name}</span>
      </div>
          <div className="text-xs text-slate-500">
            {gameState === 'playing' ? '터치 후 떼면 떨어져요' : ''}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {deferredInstallPrompt && (
            <button
              onClick={installApp}
              className="rounded-full bg-purple-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-purple-600"
            >
              📲 홈 화면에 설치
            </button>
          )}
          {/* Ad Banner replacing source code download */}
          <div className="w-full max-w-[320px] h-[50px] bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-bold rounded-lg shadow-inner">
            Ad Banner Area
          </div>
        </div>
      </main>
    </div>
  );
}
