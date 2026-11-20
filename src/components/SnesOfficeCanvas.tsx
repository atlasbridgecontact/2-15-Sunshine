import React, { useEffect, useRef } from 'react';
import { ClientCase } from '../types/game';

interface SnesOfficeCanvasProps {
  mode: 'TITLE' | 'DESK';
  client?: ClientCase | null;
  clientMood?: 'neutral' | 'happy' | 'worried' | 'shocked';
  agentSpeaking?: boolean;
}

/**
 * Higher-detail 16-bit SNES pixel art renderer (400x225 Title / 400x170 Desk)
 * with zero blurry bitmap text on canvas.
 */
export const SnesOfficeCanvas: React.FC<SnesOfficeCanvasProps> = ({
  mode,
  client,
  clientMood = 'neutral',
  agentSpeaking = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const startTime = performance.now();

    const W = 400;
    const H = mode === 'TITLE' ? 225 : 170;
    canvas.width = W;
    canvas.height = H;

    const px = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };

    const drawPalmTree = (bx: number, by: number, sway: number, scale: number = 1) => {
      for (let i = 0; i < 9; i++) {
        const tx = bx + Math.round(i * sway * 0.2 * scale);
        const ty = by - i * 5 * scale;
        px(tx, ty, 4 * scale, 5 * scale, i % 2 === 0 ? '#694737' : '#513528');
        px(tx + 1 * scale, ty, 1 * scale, 5 * scale, '#7c5644');
      }
      const topX = bx + Math.round(sway * 1.6 * scale);
      const topY = by - 45 * scale;
      const fronds = [
        [-18, -2, 18, 4, '#186a54'],
        [2, -2, 18, 4, '#1f7a61'],
        [-14, -8, 14, 4, '#2a9d8f'],
        [2, -8, 14, 4, '#2a9d8f'],
        [-6, -12, 12, 3, '#59c3b4'],
      ] as const;
      fronds.forEach(([ox, oy, fw, fh, col], idx) => {
        px(
          topX + ox * scale,
          topY + oy * scale + (idx < 2 ? Math.round(sway * 0.4) : 0),
          fw * scale,
          fh * scale,
          col
        );
      });
    };

    const drawCharacterPortrait = (
      cx: number,
      cy: number,
      skin: string,
      hair: string,
      shirt: string,
      options: { isAgent?: boolean; glasses?: boolean; mood?: string; bob?: number }
    ) => {
      const by = cy + (options.bob || 0);

      // Soft drop shadow behind torso
      px(cx - 17, by + 20, 34, 26, 'rgba(9,14,20,0.28)');

      // Chair back
      px(cx - 16, by + 4, 32, 30, '#2b394a');
      px(cx - 14, by + 6, 28, 26, '#394b60');

      // Suit / Shirt shoulders with collar highlight
      px(cx - 15, by + 20, 30, 24, shirt);
      px(cx - 15, by + 20, 30, 3, 'rgba(255,255,255,0.12)');
      if (options.isAgent) {
        px(cx - 6, by + 20, 12, 16, '#f4efe6');
        px(cx - 2, by + 22, 4, 14, '#e09f3e');
        px(cx - 1, by + 22, 2, 14, '#f6d57a');
      } else {
        px(cx - 6, by + 20, 12, 5, '#f4efe6');
      }

      // Neck + chin shadow
      px(cx - 4, by + 15, 8, 7, skin);
      px(cx - 4, by + 15, 8, 2, 'rgba(0,0,0,0.16)');

      // Head with subtle cheek shading
      px(cx - 10, by - 5, 20, 21, skin);
      px(cx - 10, by - 5, 3, 21, 'rgba(0,0,0,0.08)');
      px(cx - 12, by + 2, 2, 6, skin); // Left ear
      px(cx + 10, by + 2, 2, 6, skin); // Right ear

      // Hair + top highlight
      px(cx - 11, by - 9, 22, 7, hair);
      px(cx - 9, by - 8, 14, 2, 'rgba(255,255,255,0.14)');
      px(cx - 11, by - 5, 3, 9, hair);
      px(cx + 8, by - 5, 3, 9, hair);

      // Eyebrows & Eyes
      const eyeY = by + 3;
      px(cx - 6, eyeY - 3, 4, 1, hair);
      px(cx + 2, eyeY - 3, 4, 1, hair);

      if (options.mood === 'shocked') {
        px(cx - 6, eyeY - 1, 4, 4, '#ffffff');
        px(cx + 2, eyeY - 1, 4, 4, '#ffffff');
        px(cx - 5, eyeY, 2, 2, '#111827');
        px(cx + 3, eyeY, 2, 2, '#111827');
      } else {
        px(cx - 5, eyeY, 3, 3, '#111827');
        px(cx + 2, eyeY, 3, 3, '#111827');
        px(cx - 5, eyeY, 1, 1, '#ffffff');
        px(cx + 2, eyeY, 1, 1, '#ffffff');
      }

      if (options.glasses) {
        px(cx - 7, eyeY - 1, 6, 5, 'rgba(186,230,253,0.3)');
        px(cx + 1, eyeY - 1, 6, 5, 'rgba(186,230,253,0.3)');
        px(cx - 7, eyeY - 1, 6, 1, '#334155');
        px(cx + 1, eyeY - 1, 6, 1, '#334155');
        px(cx - 1, eyeY + 1, 2, 1, '#334155');
      }

      // Mouth
      if (options.mood === 'happy') {
        px(cx - 4, by + 10, 8, 3, '#9e4747');
        px(cx - 3, by + 10, 6, 1, '#ffffff');
      } else if (options.mood === 'worried') {
        px(cx - 4, by + 11, 8, 1, '#7c3f3f');
        px(cx - 5, by + 12, 2, 1, '#7c3f3f');
        px(cx + 3, by + 12, 2, 1, '#7c3f3f');
      } else if (options.mood === 'shocked') {
        px(cx - 3, by + 10, 6, 4, '#7c2d12');
      } else {
        px(cx - 3, by + 11, 6, 1, '#7c4a3a');
      }
    };

    const renderFrame = (now: number) => {
      const t = (now - startTime) / 1000;
      ctx.imageSmoothingEnabled = false;

      if (mode === 'TITLE') {
        const skyBands = ['#132036', '#1e3a5f', '#2b5878', '#47788e', '#c97b63', '#eba860'];
        skyBands.forEach((col, i) => px(0, i * 24, W, 24, col));

        // Coastal Sun & Glow
        px(268, 82, 36, 36, '#f6d57a');
        px(274, 88, 24, 24, '#fef3c7');

        // Ocean Bay & Shimmering Ripples
        px(0, 134, W, 42, '#144c66');
        px(0, 134, W, 3, '#2d7a96');
        for (let i = 0; i < 10; i++) {
          const rx = 248 + Math.sin(t * 2 + i) * 6 + (i % 3) * 8;
          px(rx, 139 + i * 3, 24 - i, 1, '#fce9a8');
        }

        // Skyline Silhouettes
        const bldgs = [
          [18, 102, 20, 32],
          [42, 88, 18, 46],
          [64, 106, 22, 28],
          [90, 94, 16, 40],
          [332, 98, 20, 36],
          [356, 86, 24, 48],
        ];
        bldgs.forEach(([bx, by, bw, bh]) => {
          px(bx, by, bw, bh, '#162436');
          px(bx + 4, by + 5, 3, 3, '#f6d57a');
          px(bx + 11, by + 11, 3, 3, '#f6d57a');
        });

        const sway = Math.sin(t * 1.4) * 2.8;
        drawPalmTree(142, 144, sway, 1.15);
        drawPalmTree(314, 148, -sway * 0.85, 1);

        // Foreground Mahogany Desk & Dual Monitor
        px(0, 168, W, 57, '#281a14');
        px(0, 168, W, 5, '#7c5035');
        px(0, 173, W, 2, '#4a2e1f');

        // Monitor + Portal Screen
        px(28, 142, 46, 30, '#cbd5e1');
        px(32, 146, 38, 21, '#0f2f2f');
        px(36, 150, 16, 3, '#59c3b4');
        px(36, 156, 26, 3, '#e09f3e');
        if (Math.floor(t * 2) % 2 === 0) px(36, 161, 6, 3, '#59c3b4');

        // Stack of legal folders & stamp
        px(324, 156, 36, 6, '#f4efe6');
        px(327, 151, 32, 5, '#d9cbb8');
        px(331, 146, 28, 5, '#59c3b4');
      } else {
        // DESK CONSULTATION CLOSE-UP (400 x 170)
        px(0, 0, W, 118, '#1d2d3d');
        px(0, 0, W, 8, '#111b24');
        // Wall wainscoting trim
        px(0, 88, W, 30, '#162330');
        px(0, 86, W, 3, '#3c4b5c');

        // Large Coastal Window
        px(134, 14, 132, 68, '#0f1722');
        px(138, 18, 124, 60, '#327697');
        px(138, 48, 124, 30, '#185470');
        const sway = Math.sin(t * 1.5) * 2;
        drawPalmTree(236, 76, sway, 0.72);
        px(199, 18, 3, 60, '#d9cbb8');
        px(138, 18, 124, 2, '#d9cbb8');

        // Framed 2-15 State License + FMO Plaques
        px(22, 20, 52, 34, '#8c6239');
        px(25, 23, 46, 28, '#f4efe6');
        px(30, 28, 24, 3, '#1b2838');
        px(30, 34, 34, 2, '#0d7a6f');
        px(30, 40, 20, 2, '#64748b');
        px(58, 37, 8, 8, '#e09f3e');

        // Potted Office Palm Left & Filing Cabinet Right
        px(90, 74, 14, 14, '#a45a3d');
        px(95, 58, 4, 16, '#1b6e58');
        px(86, 56, 12, 4, '#2a9d8f');
        px(96, 54, 12, 4, '#59c3b4');

        px(320, 24, 56, 92, '#3c4b5c');
        px(325, 30, 46, 20, '#52657a');
        px(342, 38, 12, 3, '#d9cbb8');
        px(325, 55, 46, 20, '#52657a');
        px(342, 63, 12, 3, '#d9cbb8');

        // Agent & Client Portraits
        const agentBob = agentSpeaking ? Math.round(Math.sin(t * 14)) : 0;
        drawCharacterPortrait(98, 76, '#e6b89c', '#2b1e16', '#1e3a5f', {
          isAgent: true,
          mood: 'happy',
          bob: agentBob,
        });

        if (client) {
          const clientBob =
            clientMood === 'shocked'
              ? Math.round(Math.sin(t * 18))
              : Math.round(Math.sin(t * 2.4) * 0.6);
          drawCharacterPortrait(282, 74, client.skinTone, client.hairColor, client.shirtColor, {
            glasses: client.hasGlasses,
            mood: clientMood,
            bob: clientBob,
          });
        }

        // Foreground Mahogany Desk
        px(0, 114, W, 56, '#4e3020');
        px(0, 114, W, 5, '#996240');
        px(0, 119, W, 2, '#69402a');

        // Dual Monitor Workstation
        px(36, 88, 34, 26, '#cbd5e1');
        px(40, 92, 26, 17, '#10383a');
        px(43, 96, 16, 3, '#59c3b4');
        px(43, 102, 20, 3, '#e09f3e');
        px(48, 114, 10, 4, '#94a3b8');

        // Legal Application Pad & Stamp Pad
        px(166, 124, 62, 32, '#f4efe6');
        px(172, 130, 38, 3, '#1b2838');
        px(172, 137, 48, 2, '#64748b');
        px(172, 143, 34, 2, '#64748b');
        px(242, 132, 22, 14, '#0d7a6f');
        px(247, 127, 12, 5, '#d9cbb8');
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [mode, client, clientMood, agentSpeaking]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block pixelated"
      aria-label="16-bit Florida insurance agency office scene"
    />
  );
};
