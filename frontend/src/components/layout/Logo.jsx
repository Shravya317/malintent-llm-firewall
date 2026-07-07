import React from 'react';

export default function Logo({ className = '', style = {} }) {
  // SVG drawing logic converted to React elements
  const W = 35;
  const S = W * 0.577; // ~20.2
  const H = 45;
  const D = 22;
  const DS = D * 0.577; // ~12.7
  const GAP = 6;
  const colX = W + GAP;
  const colY = S + GAP * 0.577;
  const rowY = H + GAP;

  const elements = [];

  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      const ox = c * colX;
      const oy = -c * colY + r * rowY;

      const fTL = [ox, oy];
      const fTR = [ox + W, oy - S];
      const fBR = [ox + W, oy - S + H];
      const fBL = [ox, oy + H];

      const toPoints = (pts) => pts.map(p => p.join(',')).join(' ');

      // Top face (only for top row)
      if (r === 0) {
        const tBL = fTL;
        const tBR = fTR;
        const tTR = [fTR[0] - D, fTR[1] - DS];
        const tTL = [fTL[0] - D, fTL[1] - DS];
        elements.push(
          <polygon key={`top-${c}-${r}`} points={toPoints([tBL, tBR, tTR, tTL])} fill="var(--logo-top)" style={{ transition: 'fill 0.3s' }} />
        );
      }

      // Left face (only for leftmost column)
      if (c === 0) {
        const lTR = fTL;
        const lBR = fBL;
        const lBL = [fBL[0] - D, fBL[1] - DS];
        const lTL = [fTL[0] - D, fTL[1] - DS];
        elements.push(
          <polygon key={`left-${c}-${r}`} points={toPoints([lTR, lBR, lBL, lTL])} fill="var(--logo-left)" style={{ transition: 'fill 0.3s' }} />
        );
      }

      // Front face
      elements.push(
        <polygon key={`front-${c}-${r}`} points={toPoints([fTL, fTR, fBR, fBL])} fill="var(--logo-front)" style={{ transition: 'fill 0.3s' }} />
      );
    }
  }

  return (
    <svg 
      className={className}
      style={{ ...style, overflow: 'visible' }}
      viewBox="0 0 260 390" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>
        {`
          @keyframes logoCenterPulse {
            0% { filter: drop-shadow(0px 0px 15px var(--logo-glow)); }
            100% { filter: drop-shadow(0px 0px 40px var(--logo-glow-bright)); }
          }
          .animated-logo-glow {
            animation: logoCenterPulse 2.5s infinite alternate ease-in-out;
          }
        `}
      </style>
      <g className="animated-logo-glow" transform="translate(55, 130)">
        {elements}
      </g>
    </svg>
  );
}
