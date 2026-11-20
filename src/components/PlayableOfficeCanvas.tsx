import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  BookOpen,
  Footprints,
  Sparkles,
} from 'lucide-react';
import { ClientCase, OfficePhase, StaffId } from '../types/game';
import { snesAudio } from '../utils/sound';

interface PlayableOfficeCanvasProps {
  client: ClientCase;
  officeTier: 1 | 2;
  hiredStaff: StaffId[];
  officePhase: OfficePhase;
  celebrationData?: {
    amount: number;
    label: string;
    isClean: boolean;
  } | null;
  onStartConsultation: () => void;
  onFinishCelebration: () => void;
  onOpenManual: () => void;
  onOpenUpgrades: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  kind: 'COIN' | 'BILL' | 'SPARK';
}

interface RectBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Upgraded 480x260 (+25% logical resolution) 16-bit office coordinate system
const W = 480;
const H = 260;

const DESK_BOX: RectBox = { x: 278, y: 106, w: 86, h: 34 };
const MANUAL_BOX: RectBox = { x: 24, y: 52, w: 44, h: 28 };
const UPGRADE_BOX: RectBox = { x: 406, y: 52, w: 48, h: 28 };

const LOBBY_CLIENT_POS = { x: 74, y: 204 };
const DESK_AGENT_SEAT = { x: 320, y: 92 };
const DESK_CLIENT_SEAT = { x: 320, y: 158 };

export const PlayableOfficeCanvas: React.FC<PlayableOfficeCanvasProps> = ({
  client,
  officeTier,
  hiredStaff,
  officePhase,
  celebrationData,
  onStartConsultation,
  onFinishCelebration,
  onOpenManual,
  onOpenUpgrades,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const simRef = useRef({
    agentX: 248,
    agentY: 136,
    walkTarget: null as { x: number; y: number; action?: 'GREET' | 'SIT' | 'MANUAL' | 'UPGRADES' } | null,
    clientX: LOBBY_CLIENT_POS.x,
    clientY: LOBBY_CLIENT_POS.y,
    clientStatus: 'WAITING' as 'WAITING' | 'FOLLOWING' | 'SEATED',
    particles: [] as Particle[],
    shakeTime: 0,
    shakeMag: 0,
    celebrateTimer: 0,
    stepSoundCooldown: 0,
    greetedBannerTimer: 0,
  });

  const heldKeysRef = useRef<Record<string, boolean>>({});
  const [promptText, setPromptText] = useState<string>(
    `Walk to ${client.name} at the lobby entrance to greet them`
  );
  const [clientStatusUi, setClientStatusUi] = useState<'WAITING' | 'FOLLOWING' | 'SEATED'>('WAITING');
  const [clientPosPct, setClientPosPct] = useState<{ left: number; top: number }>({
    left: (LOBBY_CLIENT_POS.x / W) * 100,
    top: (LOBBY_CLIENT_POS.y / H) * 100,
  });
  const [showGreetedBubble, setShowGreetedBubble] = useState(false);

  useEffect(() => {
    if (officePhase === 'ROAMING') {
      const s = simRef.current;
      s.clientX = LOBBY_CLIENT_POS.x;
      s.clientY = LOBBY_CLIENT_POS.y;
      s.clientStatus = 'WAITING';
      s.agentX = 258;
      s.agentY = 132;
      s.walkTarget = null;
      s.particles = [];
      s.celebrateTimer = 0;
      s.greetedBannerTimer = 0;
      setClientStatusUi('WAITING');
      setClientPosPct({
        left: (LOBBY_CLIENT_POS.x / W) * 100,
        top: (LOBBY_CLIENT_POS.y / H) * 100,
      });
      setShowGreetedBubble(false);
      setPromptText(`Tap Greet or walk to ${client.name} at the lobby door`);
      snesAudio.doorBell();
    } else if (officePhase === 'CELEBRATING') {
      const s = simRef.current;
      s.agentX = DESK_AGENT_SEAT.x;
      s.agentY = DESK_AGENT_SEAT.y;
      s.clientX = DESK_CLIENT_SEAT.x;
      s.clientY = DESK_CLIENT_SEAT.y;
      s.clientStatus = 'SEATED';
      s.shakeTime = 0.3;
      s.shakeMag = celebrationData?.isClean ? 4 : 2.5;
      s.celebrateTimer = 2.7;
      setClientStatusUi('SEATED');

      const burst: Particle[] = [];
      const count = celebrationData && celebrationData.amount > 0 ? 36 : 18;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI + Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 115;
        burst.push({
          x: DESK_AGENT_SEAT.x + (Math.random() - 0.5) * 32,
          y: DESK_AGENT_SEAT.y + 22,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 75,
          life: 1.5 + Math.random() * 0.7,
          kind:
            celebrationData && celebrationData.amount > 0
              ? i % 3 === 0
                ? 'BILL'
                : 'COIN'
              : 'SPARK',
        });
      }
      s.particles = burst;
      snesAudio.stamp();
      if (celebrationData && celebrationData.amount > 0) {
        setTimeout(() => snesAudio.coinBurst(), 110);
      }
    }
  }, [officePhase, client.id, client.name, celebrationData]);

  useEffect(() => {
    const triggerContextAction = () => {
      if (officePhase === 'CELEBRATING') {
        onFinishCelebration();
        return;
      }
      if (officePhase !== 'ROAMING') return;
      const s = simRef.current;
      const distClient = Math.hypot(s.agentX - s.clientX, s.agentY - s.clientY);
      const distDesk = Math.hypot(s.agentX - DESK_AGENT_SEAT.x, s.agentY - (DESK_AGENT_SEAT.y + 18));
      const distManual = Math.hypot(s.agentX - 46, s.agentY - 90);
      const distUpgrade = Math.hypot(s.agentX - 430, s.agentY - 90);

      if (s.clientStatus === 'WAITING' && distClient < 64) {
        s.clientStatus = 'FOLLOWING';
        s.greetedBannerTimer = 2.0;
        setClientStatusUi('FOLLOWING');
        setShowGreetedBubble(true);
        setPromptText(`Escort ${client.name} back to your Consultation Desk!`);
        snesAudio.select();
      } else if (s.clientStatus === 'FOLLOWING' && distDesk < 70) {
        s.clientStatus = 'SEATED';
        snesAudio.pageTurn();
        onStartConsultation();
      } else if (distManual < 58) {
        snesAudio.select();
        onOpenManual();
      } else if (distUpgrade < 58) {
        snesAudio.select();
        onOpenUpgrades();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        heldKeysRef.current[k] = true;
        simRef.current.walkTarget = null;
      } else if (k === ' ' || k === 'e') {
        if (officePhase === 'ROAMING' || officePhase === 'CELEBRATING') {
          e.preventDefault();
          triggerContextAction();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current[e.key.toLowerCase()] = false;
    };

    const onBlur = () => {
      heldKeysRef.current = {};
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [officePhase, client.name, onFinishCelebration, onStartConsultation, onOpenManual, onOpenUpgrades]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = W;
    canvas.height = H;

    let animId = 0;
    let lastTime = performance.now();
    let uiSyncAccumulator = 0;

    const px = (x: number, y: number, w: number, h: number, col: string) => {
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };

    const collides = (nx: number, ny: number): boolean => {
      if (nx < 20 || nx > W - 20 || ny < 68 || ny > H - 18) return true;
      if (
        nx > DESK_BOX.x - 10 &&
        nx < DESK_BOX.x + DESK_BOX.w + 10 &&
        ny > DESK_BOX.y - 6 &&
        ny < DESK_BOX.y + DESK_BOX.h + 12
      ) {
        return true;
      }
      if (hiredStaff.includes('COMPLIANCE_CSR')) {
        if (nx > 20 && nx < 104 && ny > 108 && ny < 152) return true;
      }
      if (hiredStaff.includes('JUNIOR_PRODUCER')) {
        if (nx > 368 && nx < 456 && ny > 168 && ny < 212) return true;
      }
      return false;
    };

    const drawPerson = (
      x: number,
      y: number,
      skin: string,
      hair: string,
      shirt: string,
      opts: { isAgent?: boolean; glasses?: boolean; walking?: boolean; time: number }
    ) => {
      const bob = opts.walking ? Math.abs(Math.sin(opts.time * 12)) * 2.5 : 0;
      const ppx = Math.round(x);
      const ppy = Math.round(y - bob);

      // Ground shadow
      px(ppx - 9, Math.round(y) + 7, 18, 5, 'rgba(0,0,0,0.32)');
      // Legs & shoes
      const stride = opts.walking ? Math.round(Math.sin(opts.time * 12) * 3) : 0;
      px(ppx - 6, ppy + 2 + stride, 5, 7, '#1e293b');
      px(ppx + 1, ppy + 2 - stride, 5, 7, '#1e293b');
      // Torso / Jacket
      px(ppx - 9, ppy - 12, 18, 15, shirt);
      px(ppx - 9, ppy - 12, 18, 2, 'rgba(255,255,255,0.14)');
      // Arms
      const armSwing = opts.walking ? Math.round(Math.sin(opts.time * 12) * 2) : 0;
      px(ppx - 12, ppy - 10 - armSwing, 3, 11, shirt);
      px(ppx + 9, ppy - 10 + armSwing, 3, 11, shirt);
      px(ppx - 12, ppy + 1 - armSwing, 3, 3, skin);
      px(ppx + 9, ppy + 1 + armSwing, 3, 3, skin);

      if (opts.isAgent) {
        px(ppx - 3, ppy - 12, 6, 10, '#f4efe6');
        px(ppx - 1, ppy - 11, 2, 9, '#e09f3e');
      } else {
        px(ppx - 3, ppy - 12, 6, 3, '#f4efe6');
      }

      // Head + ears + hair highlight
      px(ppx - 7, ppy - 26, 14, 14, skin);
      px(ppx - 9, ppy - 21, 2, 4, skin);
      px(ppx + 7, ppy - 21, 2, 4, skin);
      px(ppx - 8, ppy - 29, 16, 6, hair);
      px(ppx - 6, ppy - 28, 10, 2, 'rgba(255,255,255,0.15)');
      px(ppx - 8, ppy - 25, 2, 6, hair);
      px(ppx + 6, ppy - 25, 2, 6, hair);

      // Eyes
      px(ppx - 4, ppy - 20, 2, 3, '#111827');
      px(ppx + 2, ppy - 20, 2, 3, '#111827');
      px(ppx - 4, ppy - 20, 1, 1, '#ffffff');
      px(ppx + 2, ppy - 20, 1, 1, '#ffffff');

      if (opts.glasses) {
        px(ppx - 5, ppy - 21, 5, 4, 'rgba(186,230,253,0.34)');
        px(ppx + 1, ppy - 21, 5, 4, 'rgba(186,230,253,0.34)');
        px(ppx, ppy - 20, 1, 1, '#334155');
      }
    };

    const drawPlant = (x: number, y: number, sway: number) => {
      px(x - 7, y, 14, 10, '#a45a3d');
      px(x - 8, y - 2, 16, 3, '#c27150');
      px(x - 1, y - 14, 2, 12, '#1b6e58');
      px(x - 11 + sway, y - 16, 12, 4, '#2a9d8f');
      px(x + sway, y - 18, 11, 4, '#59c3b4');
      px(x - 7 + sway, y - 22, 14, 3, '#2a9d8f');
    };

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const t = now / 1000;
      const s = simRef.current;

      let isWalking = false;
      if (officePhase === 'ROAMING') {
        const keys = heldKeysRef.current;
        let dx = 0;
        let dy = 0;
        if (keys['w'] || keys['arrowup']) dy -= 1;
        if (keys['s'] || keys['arrowdown']) dy += 1;
        if (keys['a'] || keys['arrowleft']) dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;

        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy);
          dx /= len;
          dy /= len;
          isWalking = true;
        } else if (s.walkTarget) {
          const tx = s.walkTarget.x - s.agentX;
          const ty = s.walkTarget.y - s.agentY;
          const dist = Math.hypot(tx, ty);
          if (dist > 5) {
            dx = tx / dist;
            dy = ty / dist;
            isWalking = true;
          } else {
            const action = s.walkTarget.action;
            s.walkTarget = null;
            if (action === 'GREET' && s.clientStatus === 'WAITING') {
              s.clientStatus = 'FOLLOWING';
              s.greetedBannerTimer = 2.2;
              setClientStatusUi('FOLLOWING');
              setShowGreetedBubble(true);
              setPromptText(`Escort ${client.name} to your Consultation Desk!`);
              snesAudio.select();
            } else if (action === 'SIT' && s.clientStatus === 'FOLLOWING') {
              s.clientStatus = 'SEATED';
              snesAudio.pageTurn();
              onStartConsultation();
            } else if (action === 'MANUAL') {
              snesAudio.select();
              onOpenManual();
            } else if (action === 'UPGRADES') {
              snesAudio.select();
              onOpenUpgrades();
            }
          }
        }

        if (isWalking) {
          const speed = 115;
          const nx = s.agentX + dx * speed * dt;
          const ny = s.agentY + dy * speed * dt;
          if (!collides(nx, s.agentY)) s.agentX = nx;
          if (!collides(s.agentX, ny)) s.agentY = ny;

          s.stepSoundCooldown -= dt;
          if (s.stepSoundCooldown <= 0) {
            snesAudio.step();
            s.stepSoundCooldown = 0.24;
          }

          if (s.clientStatus === 'WAITING') {
            const dClient = Math.hypot(s.agentX - s.clientX, s.agentY - s.clientY);
            if (dClient < 32) {
              s.clientStatus = 'FOLLOWING';
              s.greetedBannerTimer = 2.2;
              setClientStatusUi('FOLLOWING');
              setShowGreetedBubble(true);
              setPromptText(`Escort ${client.name} to your Consultation Desk!`);
              snesAudio.select();
            }
          } else if (s.clientStatus === 'FOLLOWING') {
            const dDesk = Math.hypot(
              s.agentX - DESK_AGENT_SEAT.x,
              s.agentY - (DESK_AGENT_SEAT.y + 10)
            );
            if (dDesk < 34) {
              s.clientStatus = 'SEATED';
              snesAudio.pageTurn();
              onStartConsultation();
            }
          }
        }

        if (s.clientStatus === 'FOLLOWING') {
          const targetX = s.agentX - 30;
          const targetY = s.agentY + 14;
          const fx = targetX - s.clientX;
          const fy = targetY - s.clientY;
          const fDist = Math.hypot(fx, fy);
          if (fDist > 10) {
            s.clientX += (fx / fDist) * 102 * dt;
            s.clientY += (fy / fDist) * 102 * dt;
          }
        }

        if (s.greetedBannerTimer > 0) {
          s.greetedBannerTimer = Math.max(0, s.greetedBannerTimer - dt);
          if (s.greetedBannerTimer === 0) setShowGreetedBubble(false);
        }

        uiSyncAccumulator += dt;
        if (uiSyncAccumulator > 0.08) {
          uiSyncAccumulator = 0;
          setClientPosPct({
            left: (s.clientX / W) * 100,
            top: (s.clientY / H) * 100,
          });
        }
      }

      if (officePhase === 'CELEBRATING') {
        s.celebrateTimer -= dt;
        if (s.celebrateTimer <= 0) {
          onFinishCelebration();
        }
      }

      if (s.shakeTime > 0) {
        s.shakeTime = Math.max(0, s.shakeTime - dt);
      }

      s.particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 210 * dt;
        p.life -= dt;
      });
      s.particles = s.particles.filter((p) => p.life > 0);

      // --- RENDER HIGHER-DETAIL 480x260 16-BIT OFFICE ---
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (s.shakeTime > 0) {
        const sx = (Math.random() - 0.5) * s.shakeMag * 2;
        const sy = (Math.random() - 0.5) * s.shakeMag * 2;
        ctx.translate(sx, sy);
      }

      // Floor with richer wood/tile shading
      if (officeTier >= 2) {
        px(0, 56, W, H - 56, '#8f603d');
        for (let py = 62; py < H; py += 14) {
          px(0, py, W, 1, '#734b2e');
          px(0, py + 1, W, 1, '#a06f49');
        }
        // Executive coastal rug
        px(256, 82, 130, 102, '#0d4a50');
        px(262, 88, 118, 90, '#13666e');
        px(266, 92, 110, 82, '#17757d');
      } else {
        px(0, 56, W, H - 56, '#2d3b4e');
        for (let tx = 0; tx < W; tx += 24) {
          for (let ty = 56; ty < H; ty += 24) {
            if (((tx / 24) + (ty / 24)) % 2 === 0) {
              px(tx, ty, 24, 24, '#34445a');
            }
          }
        }
        px(266, 88, 110, 86, '#1b3554');
        px(270, 92, 102, 78, '#214166');
      }

      // Back Wall + Baseboard
      px(0, 0, W, 56, officeTier >= 2 ? '#e9e0d2' : '#1b2838');
      px(0, 52, W, 5, '#0f1722');
      px(0, 49, W, 3, officeTier >= 2 ? '#cbbda8' : '#2d3e50');

      // Panoramic Coastal Window
      const winX = officeTier >= 2 ? 142 : 176;
      const winW = officeTier >= 2 ? 196 : 128;
      px(winX, 8, winW, 38, '#0f1722');
      px(winX + 3, 11, winW - 6, 20, '#3884a8');
      px(winX + 3, 31, winW - 6, 12, '#165a78');
      const sway = Math.round(Math.sin(t * 1.8) * 2);
      px(winX + winW - 28, 22, 4, 21, '#5c4033');
      px(winX + winW - 37 + sway, 17, 22, 5, '#2a9d8f');
      px(winX + winW - 31 + sway, 13, 12, 4, '#59c3b4');
      if (officeTier >= 2) {
        const boatX = winX + 30 + Math.round(Math.sin(t * 0.6) * 12);
        px(boatX, 32, 14, 4, '#f4efe6');
        px(boatX + 6, 23, 2, 9, '#f4efe6');
        px(boatX + 8, 24, 6, 7, '#e09f3e');
      }

      // FMO Wall Plaques (PSM Brokerage Left + Gordon Marketing Right)
      px(98, 14, 34, 24, '#0f766e');
      px(100, 16, 30, 20, '#f4efe6');
      px(104, 20, 22, 4, '#0d7a6f');
      px(104, 27, 16, 3, '#334155');

      px(348, 14, 34, 24, '#1d4ed8');
      px(350, 16, 30, 20, '#f4efe6');
      px(354, 20, 22, 4, '#1d4ed8');
      px(354, 27, 18, 3, '#e09f3e');

      // Potted Coastal Palms
      drawPlant(156, 62, Math.round(Math.sin(t * 1.5)));
      drawPlant(392, 62, Math.round(Math.cos(t * 1.5)));

      // Left Hotspot: 2-15 Manual Filing Cabinet
      px(MANUAL_BOX.x, MANUAL_BOX.y, MANUAL_BOX.w, MANUAL_BOX.h, '#475569');
      px(MANUAL_BOX.x + 4, MANUAL_BOX.y + 4, MANUAL_BOX.w - 8, 9, '#64748b');
      px(MANUAL_BOX.x + 4, MANUAL_BOX.y + 15, MANUAL_BOX.w - 8, 9, '#64748b');
      px(MANUAL_BOX.x + 15, MANUAL_BOX.y - 8, 14, 8, '#0d7a6f');

      // Right Hotspot: Growth & Contracting Terminal
      px(UPGRADE_BOX.x, UPGRADE_BOX.y, UPGRADE_BOX.w, UPGRADE_BOX.h, '#3c4b5c');
      px(UPGRADE_BOX.x + 9, UPGRADE_BOX.y - 10, 30, 19, '#cbd5e1');
      px(UPGRADE_BOX.x + 12, UPGRADE_BOX.y - 7, 24, 13, '#10383a');
      px(UPGRADE_BOX.x + 15, UPGRADE_BOX.y - 3, 14, 3, '#e09f3e');

      // Lobby Entrance Mat & Reception Chairs
      px(22, H - 20, 56, 15, '#0d7a6f');
      px(26, H - 16, 48, 7, '#59c3b4');
      px(24, 182, 22, 16, '#6d4c3d');
      px(98, 182, 22, 16, '#6d4c3d');

      // Hired Staff Desk #2: Compliance CSR Elena
      if (hiredStaff.includes('COMPLIANCE_CSR')) {
        px(24, 118, 70, 24, '#5c3a28');
        px(24, 118, 70, 4, '#8b5a3c');
        px(30, 112, 22, 15, '#cbd5e1');
        px(33, 115, 16, 10, '#0d7a6f');
        drawPerson(64, 106, '#ebbfa0', '#3b2416', '#0d7a6f', { time: t });
      }

      // Hired Staff Desk #3: Junior Producer Marcus
      if (hiredStaff.includes('JUNIOR_PRODUCER')) {
        px(374, 178, 72, 24, '#5c3a28');
        px(374, 178, 72, 4, '#8b5a3c');
        px(416, 172, 22, 15, '#cbd5e1');
        px(419, 175, 16, 10, '#1e3a5f');
        drawPerson(398, 166, '#9c6244', '#1a1a1a', '#e09f3e', { time: t });
      }

      // Consultation Desk
      px(DESK_BOX.x, DESK_BOX.y + 4, DESK_BOX.w, DESK_BOX.h, 'rgba(0,0,0,0.25)');
      px(DESK_BOX.x, DESK_BOX.y, DESK_BOX.w, DESK_BOX.h, officeTier >= 2 ? '#734124' : '#4e3020');
      px(DESK_BOX.x, DESK_BOX.y, DESK_BOX.w, 5, '#a36640');
      px(DESK_BOX.x + 10, DESK_BOX.y - 8, 24, 17, '#cbd5e1');
      px(DESK_BOX.x + 13, DESK_BOX.y - 5, 18, 11, '#10383a');
      if (officeTier >= 2) {
        px(DESK_BOX.x + 38, DESK_BOX.y - 8, 22, 17, '#cbd5e1');
        px(DESK_BOX.x + 41, DESK_BOX.y - 5, 16, 11, '#10383a');
      }
      px(DESK_BOX.x + 62, DESK_BOX.y + 10, 16, 17, '#f4efe6');
      px(DESK_BOX.x + 42, DESK_BOX.y + 14, 13, 9, '#0d7a6f');

      // Chairs behind & across desk
      px(DESK_AGENT_SEAT.x - 10, DESK_AGENT_SEAT.y - 6, 20, 14, '#1e293b');
      px(DESK_CLIENT_SEAT.x - 10, DESK_CLIENT_SEAT.y - 6, 20, 14, '#1e3a5f');

      // Characters depth-sorted
      const clientWalking =
        officePhase === 'ROAMING' &&
        s.clientStatus === 'FOLLOWING' &&
        Math.hypot(s.agentX - 30 - s.clientX, s.agentY + 14 - s.clientY) > 12;

      const people = [
        {
          y: s.agentY,
          draw: () =>
            drawPerson(s.agentX, s.agentY, '#e6b89c', '#2b1e16', '#1e3a5f', {
              isAgent: true,
              walking: isWalking,
              time: t,
            }),
        },
        {
          y: s.clientY,
          draw: () =>
            drawPerson(s.clientX, s.clientY, client.skinTone, client.hairColor, client.shirtColor, {
              glasses: client.hasGlasses,
              walking: clientWalking,
              time: t,
            }),
        },
      ].sort((a, b) => a.y - b.y);

      people.forEach((p) => p.draw());

      // Particles (Coins / Bills / Sparks)
      s.particles.forEach((p) => {
        if (p.kind === 'COIN') {
          px(p.x - 4, p.y - 4, 8, 8, '#e09f3e');
          px(p.x - 2, p.y - 3, 4, 6, '#fef08a');
        } else if (p.kind === 'BILL') {
          px(p.x - 6, p.y - 3, 12, 7, '#10b981');
          px(p.x - 3, p.y - 1, 6, 3, '#ecfdf5');
        } else {
          px(p.x - 3, p.y - 3, 6, 6, '#59c3b4');
        }
      });

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [officePhase, officeTier, hiredStaff, client, celebrationData, onStartConsultation, onFinishCelebration, onOpenManual, onOpenUpgrades]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (officePhase === 'CELEBRATING') {
      onFinishCelebration();
      return;
    }
    if (officePhase !== 'ROAMING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rectBounds = canvas.getBoundingClientRect();
    const lx = ((e.clientX - rectBounds.left) / rectBounds.width) * W;
    const ly = ((e.clientY - rectBounds.top) / rectBounds.height) * H;
    const s = simRef.current;

    if (s.clientStatus === 'WAITING' && Math.hypot(lx - s.clientX, ly - (s.clientY - 12)) < 42) {
      s.walkTarget = { x: s.clientX + 24, y: s.clientY, action: 'GREET' };
      return;
    }

    if (
      s.clientStatus === 'FOLLOWING' &&
      lx > DESK_BOX.x - 20 &&
      lx < DESK_BOX.x + DESK_BOX.w + 20 &&
      ly > DESK_BOX.y - 30 &&
      ly < DESK_BOX.y + DESK_BOX.h + 22
    ) {
      s.walkTarget = { x: DESK_AGENT_SEAT.x, y: DESK_AGENT_SEAT.y, action: 'SIT' };
      return;
    }

    if (lx > MANUAL_BOX.x - 14 && lx < MANUAL_BOX.x + MANUAL_BOX.w + 14 && ly < 96) {
      s.walkTarget = { x: 48, y: 88, action: 'MANUAL' };
      return;
    }

    if (lx > UPGRADE_BOX.x - 14 && lx < UPGRADE_BOX.x + UPGRADE_BOX.w + 14 && ly < 96) {
      s.walkTarget = { x: 428, y: 88, action: 'UPGRADES' };
      return;
    }

    s.walkTarget = {
      x: Math.max(24, Math.min(W - 24, lx)),
      y: Math.max(72, Math.min(H - 22, ly)),
    };
  };

  const setTouchDir = (key: string, pressed: boolean) => {
    heldKeysRef.current[key] = pressed;
    if (pressed) {
      simRef.current.walkTarget = null;
    }
  };

  return (
    <div className="h-full flex flex-col gap-2.5 sm:gap-3 min-h-0">
      {/* Top Roam Status Bar */}
      <div className="snes-frame px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
          <Footprints className="w-4 h-4 text-[#59c3b4] shrink-0" />
          <span className="font-semibold text-[#f4efe6] leading-snug">
            {officePhase === 'CELEBRATING'
              ? celebrationData?.label || 'Transaction Complete!'
              : promptText}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {officePhase === 'ROAMING' && clientStatusUi === 'WAITING' && (
            <button
              type="button"
              onClick={() => {
                simRef.current.walkTarget = {
                  x: simRef.current.clientX + 24,
                  y: simRef.current.clientY,
                  action: 'GREET',
                };
              }}
              className="snes-btn bg-[#e09f3e] text-[#1b2530] px-3.5 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              Walk &amp; Greet {client.name}
            </button>
          )}
          {officePhase === 'ROAMING' && clientStatusUi === 'FOLLOWING' && (
            <button
              type="button"
              onClick={() => {
                simRef.current.walkTarget = {
                  x: DESK_AGENT_SEAT.x,
                  y: DESK_AGENT_SEAT.y,
                  action: 'SIT',
                };
              }}
              className="snes-btn bg-[#0d7a6f] text-[#f4efe6] px-3.5 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              Walk to Desk &amp; Begin
            </button>
          )}
          {officePhase === 'CELEBRATING' && (
            <button
              type="button"
              onClick={onFinishCelebration}
              className="snes-btn bg-[#0d7a6f] text-[#f4efe6] px-3.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next Client</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 16-Bit Floorplan Container with Crisp HTML Overlay Labels */}
      <div className="snes-frame sm:flex-1 relative overflow-hidden bg-[#111b24] flex items-center justify-center min-h-[180px] sm:min-h-[300px]">
        <div className="relative w-full h-full max-w-full max-h-full aspect-[480/260]">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full h-full block pixelated cursor-pointer touch-manipulation"
            aria-label="Playable 16-bit Florida insurance agency office floorplan"
          />
          <div className="absolute inset-0 crt-scanlines" />

          {/* Crisp HTML Hotspot Labels (hidden on tiny <sm phone canvases to prevent edge clipping; mobile uses gamepad deck below) */}
          <button
            type="button"
            onClick={onOpenManual}
            style={{ left: '9.5%', top: '12%' }}
            className="hidden sm:block absolute -translate-x-1/2 bg-[#0f1722]/95 border border-[#59c3b4] px-2.5 py-1 text-xs font-semibold text-[#59c3b4] shadow cursor-pointer hover:bg-[#10383a]"
          >
            2-15 Manual
          </button>

          <button
            type="button"
            onClick={onOpenUpgrades}
            style={{ left: '89.5%', top: '12%' }}
            className="hidden sm:block absolute -translate-x-1/2 bg-[#0f1722]/95 border border-[#e09f3e] px-2.5 py-1 text-xs font-semibold text-[#e09f3e] shadow cursor-pointer hover:bg-[#2a2210]"
          >
            Growth &amp; Certs
          </button>

          {/* FMO Wall Plaque Labels */}
          <div
            style={{ left: '24%', top: '16%' }}
            className="hidden sm:block absolute -translate-x-1/2 pointer-events-none bg-[#0f1722]/90 border border-[#59c3b4] px-2 py-0.5 text-xs font-semibold text-[#f4efe6] whitespace-nowrap"
          >
            PSM Brokerage
          </div>
          <div
            style={{ left: '76%', top: '16%' }}
            className="hidden sm:block absolute -translate-x-1/2 pointer-events-none bg-[#0f1722]/90 border border-[#60a5fa] px-2 py-0.5 text-xs font-semibold text-[#f4efe6] whitespace-nowrap"
          >
            Gordon Marketing
          </div>

          {hiredStaff.includes('COMPLIANCE_CSR') && (
            <div
              style={{ left: '12%', top: '56%' }}
              className="hidden sm:block absolute -translate-x-1/2 pointer-events-none bg-[#0f1722]/90 border border-[#59c3b4] px-2 py-0.5 text-xs font-semibold text-[#59c3b4] whitespace-nowrap"
            >
              CSR Elena
            </div>
          )}

          {hiredStaff.includes('JUNIOR_PRODUCER') && (
            <div
              style={{ left: '85%', top: '79%' }}
              className="hidden sm:block absolute -translate-x-1/2 pointer-events-none bg-[#0f1722]/90 border border-[#e09f3e] px-2 py-0.5 text-xs font-semibold text-[#e09f3e] whitespace-nowrap"
            >
              Producer Marcus
            </div>
          )}

          {/* Dynamic Client Prompt Bubble (Clamped horizontally so it never clips off mobile edges) */}
          {officePhase === 'ROAMING' && clientStatusUi === 'WAITING' && (
            <button
              type="button"
              onClick={() => {
                simRef.current.walkTarget = {
                  x: simRef.current.clientX + 24,
                  y: simRef.current.clientY,
                  action: 'GREET',
                };
              }}
              style={{
                left: `${Math.max(26, Math.min(74, clientPosPct.left))}%`,
                top: `${Math.max(26, clientPosPct.top - 16)}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-full bg-[#e09f3e] text-[#1b2530] border-2 border-[#f4efe6] px-2.5 sm:px-3 py-1 text-xs font-bold shadow-md animate-bounce whitespace-nowrap cursor-pointer"
            >
              Greet {client.name.split(' ')[0]} ({client.productLine})
            </button>
          )}

          {officePhase === 'ROAMING' && showGreetedBubble && (
            <div
              style={{
                left: `${Math.max(28, Math.min(72, clientPosPct.left + 8))}%`,
                top: `${Math.max(24, clientPosPct.top - 14)}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-full pointer-events-none bg-[#0d7a6f] text-[#f4efe6] border-2 border-[#f4efe6] px-2.5 sm:px-3 py-1 text-xs font-bold shadow whitespace-nowrap"
            >
              Follow me to the desk!
            </div>
          )}

          {officePhase === 'ROAMING' && clientStatusUi === 'FOLLOWING' && (
            <button
              type="button"
              onClick={() => {
                simRef.current.walkTarget = {
                  x: DESK_AGENT_SEAT.x,
                  y: DESK_AGENT_SEAT.y,
                  action: 'SIT',
                };
              }}
              style={{ left: '66%', top: '26%' }}
              className="absolute -translate-x-1/2 bg-[#0d7a6f] text-[#f4efe6] border-2 border-[#f4efe6] px-2.5 sm:px-3 py-1 text-xs font-bold shadow-md whitespace-nowrap cursor-pointer"
            >
              Sit at Desk
            </button>
          )}

          {/* Crisp Celebration Stamp & Floating Payday Banner */}
          {officePhase === 'CELEBRATING' && celebrationData && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-2 sm:gap-3 px-3">
              <div
                className={`px-4 sm:px-6 py-2 sm:py-3 border-4 shadow-xl font-pixel text-xs sm:text-base md:text-lg tracking-wider text-center ${
                  celebrationData.isClean
                    ? 'bg-[#f4efe6] border-[#0d7a6f] text-[#0d7a6f]'
                    : 'bg-[#fef2f2] border-[#dc2626] text-[#991b1b]'
                }`}
              >
                {celebrationData.label}
              </div>
              {celebrationData.amount > 0 && (
                <div className="bg-[#0f1722]/95 border-2 border-[#e09f3e] px-4 sm:px-5 py-1.5 sm:py-2 font-mono-tabular text-base sm:text-xl font-bold text-[#fde047] shadow-lg">
                  +${celebrationData.amount.toLocaleString()} EARNED!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Bottom Unobtrusive Control Bar (Hidden on mobile so it never obscures the lobby floor) */}
        <div className="hidden md:flex absolute bottom-3 left-3 right-3 flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="bg-[#0f1722]/95 border border-[#d9cbb8] px-3 py-1.5 text-xs font-medium text-[#f4efe6]">
            WASD / Arrows or Click Floor to Walk · Space / Click to Greet &amp; Sit
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={onOpenManual}
              className="snes-btn bg-[#1b2838] text-[#f4efe6] px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#59c3b4]" />
              <span>2-15 Manual</span>
            </button>
            <button
              type="button"
              onClick={onOpenUpgrades}
              className="snes-btn bg-[#1b2838] text-[#f4efe6] px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-[#e09f3e]" />
              <span>Office &amp; Staff</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile SNES Touch Gamepad + Thumb-Zone Primary Action Deck (< md) */}
      <div className="md:hidden snes-frame p-3 space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          {/* Left: 4-Way SNES Touch D-Pad */}
          <div className="grid grid-cols-3 gap-1 shrink-0 touch-none" aria-label="Movement controls">
            <div />
            <button
              type="button"
              onPointerDown={() => setTouchDir('arrowup', true)}
              onPointerUp={() => setTouchDir('arrowup', false)}
              onPointerLeave={() => setTouchDir('arrowup', false)}
              onPointerCancel={() => setTouchDir('arrowup', false)}
              className="snes-btn bg-[#25364a] active:bg-[#0d7a6f] text-[#f4efe6] w-11 h-11 flex items-center justify-center touch-none cursor-pointer"
              aria-label="Walk up"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => setTouchDir('arrowleft', true)}
              onPointerUp={() => setTouchDir('arrowleft', false)}
              onPointerLeave={() => setTouchDir('arrowleft', false)}
              onPointerCancel={() => setTouchDir('arrowleft', false)}
              className="snes-btn bg-[#25364a] active:bg-[#0d7a6f] text-[#f4efe6] w-11 h-11 flex items-center justify-center touch-none cursor-pointer"
              aria-label="Walk left"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onPointerDown={() => setTouchDir('arrowdown', true)}
              onPointerUp={() => setTouchDir('arrowdown', false)}
              onPointerLeave={() => setTouchDir('arrowdown', false)}
              onPointerCancel={() => setTouchDir('arrowdown', false)}
              className="snes-btn bg-[#25364a] active:bg-[#0d7a6f] text-[#f4efe6] w-11 h-11 flex items-center justify-center touch-none cursor-pointer"
              aria-label="Walk down"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <button
              type="button"
              onPointerDown={() => setTouchDir('arrowright', true)}
              onPointerUp={() => setTouchDir('arrowright', false)}
              onPointerLeave={() => setTouchDir('arrowright', false)}
              onPointerCancel={() => setTouchDir('arrowright', false)}
              className="snes-btn bg-[#25364a] active:bg-[#0d7a6f] text-[#f4efe6] w-11 h-11 flex items-center justify-center touch-none cursor-pointer"
              aria-label="Walk right"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Right: Primary Thumb Action + Secondary Desk Utilities */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            {officePhase === 'ROAMING' && clientStatusUi === 'WAITING' && (
              <button
                type="button"
                onClick={() => {
                  simRef.current.walkTarget = {
                    x: simRef.current.clientX + 24,
                    y: simRef.current.clientY,
                    action: 'GREET',
                  };
                }}
                className="snes-btn bg-[#e09f3e] text-[#1b2530] w-full min-h-[48px] px-3 py-2 text-xs font-bold text-center cursor-pointer"
              >
                Walk &amp; Greet {client.name}
              </button>
            )}
            {officePhase === 'ROAMING' && clientStatusUi === 'FOLLOWING' && (
              <button
                type="button"
                onClick={() => {
                  simRef.current.walkTarget = {
                    x: DESK_AGENT_SEAT.x,
                    y: DESK_AGENT_SEAT.y,
                    action: 'SIT',
                  };
                }}
                className="snes-btn bg-[#0d7a6f] text-[#f4efe6] w-full min-h-[48px] px-3 py-2 text-xs font-bold text-center cursor-pointer"
              >
                Sit at Desk &amp; Begin
              </button>
            )}
            {officePhase === 'CELEBRATING' && (
              <button
                type="button"
                onClick={onFinishCelebration}
                className="snes-btn bg-[#0d7a6f] text-[#f4efe6] w-full min-h-[48px] px-3 py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Next Client</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenManual}
                className="snes-btn bg-[#1b2838] text-[#f4efe6] min-h-[44px] px-2.5 py-1.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#59c3b4] shrink-0" />
                <span className="truncate">2-15 Manual</span>
              </button>
              <button
                type="button"
                onClick={onOpenUpgrades}
                className="snes-btn bg-[#1b2838] text-[#f4efe6] min-h-[44px] px-2.5 py-1.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-[#e09f3e] shrink-0" />
                <span className="truncate">Office &amp; Staff</span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs font-mono-tabular text-[#b8c4d0] pt-1.5 border-t border-[#2c3c4f] flex flex-wrap items-center justify-between gap-1">
          <span>FMOs: PSM Brokerage (ACA/Senior) · Gordon Marketing (Life/Annuity)</span>
          <span>Tap floor or hold D-Pad to move</span>
        </div>
      </div>
    </div>
  );
};
