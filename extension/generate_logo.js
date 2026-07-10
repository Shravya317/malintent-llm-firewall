const fs = require('fs');

const W = 35;
const S = W * 0.577; // ~20.2
const H = 45;
const D = 22;
const DS = D * 0.577; // ~12.7
const GAP = 6;
const colX = W + GAP;
const colY = S + GAP * 0.577;
const rowY = H + GAP;

let svgContent = '';

for (let c = 0; c < 4; c++) {
  for (let r = 0; r < 4; r++) {
    const ox = c * colX;
    const oy = -c * colY + r * rowY;

    const fTL = [ox, oy];
    const fTR = [ox + W, oy - S];
    const fBR = [ox + W, oy - S + H];
    const fBL = [ox, oy + H];

    const toPoints = (pts) => pts.map(p => p.join(',')).join(' ');

    if (r === 0) {
      const tBL = fTL;
      const tBR = fTR;
      const tTR = [fTR[0] - D, fTR[1] - DS];
      const tTL = [fTL[0] - D, fTL[1] - DS];
      svgContent += `      <polygon points="${toPoints([tBL, tBR, tTR, tTL])}" fill="#ff4d4d" />\n`;
    }

    if (c === 0) {
      const lTR = fTL;
      const lBR = fBL;
      const lBL = [fBL[0] - D, fBL[1] - DS];
      const lTL = [fTL[0] - D, fTL[1] - DS];
      svgContent += `      <polygon points="${toPoints([lTR, lBR, lBL, lTL])}" fill="#b30000" />\n`;
    }

    svgContent += `      <polygon points="${toPoints([fTL, fTR, fBR, fBL])}" fill="#e60000" />\n`;
  }
}

const finalSvg = `<svg 
  viewBox="0 0 260 390" 
  xmlns="http://www.w3.org/2000/svg"
>
  <style>
    @keyframes logoCenterPulse {
      0% { filter: drop-shadow(0px 0px 15px rgba(255, 77, 77, 0.4)); }
      100% { filter: drop-shadow(0px 0px 40px rgba(255, 77, 77, 0.9)); }
    }
    .animated-logo-glow {
      animation: logoCenterPulse 2.5s infinite alternate ease-in-out;
    }
  </style>
  <g class="animated-logo-glow" transform="translate(55, 130)">
${svgContent}  </g>
</svg>`;

fs.writeFileSync('C:\\Users\\shrav\\OneDrive\\Desktop\\malintent\\extension\\logo.svg', finalSvg);
console.log('Logo generated');
