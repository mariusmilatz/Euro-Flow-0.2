// Euro Flow – Spielbrett als SVG (16:10)
import { RAT, RAT_INFO, FAST, FAST_INFO } from './data.js';
import { dreamCost } from './engine.js';
import { t, fmt, fastName, fastText } from './i18n.js';

const W = 1600, H = 1000, M = 8, T = 132;
const CW = (W - 2 * M) / 12, CH = (H - 2 * M - 2 * T) / 6;
const CX = 800, CY = 500, R1 = 340, R0 = 222;
const RM = (R0 + R1) / 2;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function fastRect(i) {
  if (i < 12) return { x: M + i * CW, y: M, w: CW, h: T };
  if (i < 18) return { x: W - M - T, y: M + T + (i - 12) * CH, w: T, h: CH };
  if (i < 30) return { x: W - M - (i - 18 + 1) * CW, y: H - M - T, w: CW, h: T };
  return { x: M, y: H - M - T - (i - 30 + 1) * CH, w: T, h: CH };
}
// Winkel (Grad, SVG: im Uhrzeigersinn ab +x). START liegt unten (90°), es geht im Uhrzeigersinn nach links.
const ratAngle = i => 90 + (i + 0.5) * (360 / RAT.length);
const pt = (r, deg) => [CX + r * Math.cos(deg * Math.PI / 180), CY + r * Math.sin(deg * Math.PI / 180)];
export const START_PT = [CX, CY + R0 - 80];
export function ratPoint(i) { return i < 0 ? START_PT : pt(RM, ratAngle(i)); }

function wrap(text, max) {
  const words = String(text).split(/\s+/); const lines = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

function wedge(i) {
  const step = 360 / RAT.length;
  const a0 = 90 + i * step, a1 = a0 + step;
  const [x0, y0] = pt(R1, a0), [x1, y1] = pt(R1, a1), [x2, y2] = pt(R0, a1), [x3, y3] = pt(R0, a0);
  const info = { ...RAT_INFO[RAT[i]], lines: t('r_' + RAT[i]).split('|'), name: t('sp_' + RAT[i]) };
  const mid = ratAngle(i);
  const flip = mid > 90 && mid < 270;            // linke Hälfte: Text drehen, damit er lesbar bleibt
  const [tx, ty] = pt(RM, mid);
  const rot = flip ? mid + 180 : mid;
  // fit the longest line into the ring width (R1 − R0)
  const longest = Math.max(...info.lines.map(l => l.length));
  const fs = Math.min(info.lines.length > 2 ? 12 : 16, (R1 - R0 - 16) / (longest * 0.68));
  const lh = fs + 3;
  const lines = info.lines.map((l, k) =>
    `<tspan x="${tx}" dy="${k === 0 ? -((info.lines.length - 1) * lh) / 2 : lh}">${esc(l)}</tspan>`).join('');
  return [`<g class="ratspace" data-rat="${i}"><title>${esc(info.name)}</title>
    <path d="M${x0},${y0} A${R1},${R1} 0 0 1 ${x1},${y1} L${x2},${y2} A${R0},${R0} 0 0 0 ${x3},${y3} Z" fill="${info.fill}" stroke="#fff" stroke-width="2.5"/></g>`,
    `<text pointer-events="none" x="${tx}" y="${ty}" transform="rotate(${rot} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle"
      font-family="Luckiest Guy, Nunito, sans-serif" font-size="${fs.toFixed(1)}" fill="${info.ink}" letter-spacing=".3">${lines}</text>`];
}

function fastSquare(i) {
  const f = FAST[i], r = fastRect(i), info = FAST_INFO[f.type], name = fastName(i);
  const cx = r.x + r.w / 2;
  let body = '';
  const textLines = (lines, y0, fs, weight = 800, color = info.ink) =>
    lines.map((l, k) => `<text x="${cx}" y="${y0 + k * (fs + 2)}" text-anchor="middle" font-size="${fs}" font-weight="${weight}" fill="${color}">${esc(l)}</text>`).join('');
  if (f.type === 'cfday') {
    body = `<text x="${cx}" y="${r.y + r.h / 2 - 14}" text-anchor="middle" font-size="26">💶</text>` +
      textLines(t('bCfDay').split('|'), r.y + r.h / 2 + 18, 16, 400).replace(/font-weight="400"/g, 'font-family="Luckiest Guy, sans-serif"');
  } else if (f.type === 'biz') {
    const nl = wrap(name, 15);
    body = textLines(nl, r.y + 22, 12.5) +
      `<line x1="${r.x + 10}" x2="${r.x + r.w - 10}" y1="${r.y + r.h - 44}" y2="${r.y + r.h - 44}" stroke="rgba(255,255,255,.35)"/>` +
      textLines([`+${fmt(f.cf)}${t('bMonth')}`], r.y + r.h - 26, 12.5, 900, '#d9ffd9') +
      textLines([`${fmt(f.cost)}`], r.y + r.h - 10, 11.5, 700, '#fff');
  } else if (f.type === 'dream') {
    body = `<text x="${cx}" y="${r.y + 34}" text-anchor="middle" font-size="26">${f.icon}</text>` +
      textLines(wrap(name, 16), r.y + 58, 12) +
      textLines([fmt(f.cost)], r.y + r.h - 10, 11.5, 700);
  } else if (f.type === 'gamble') {
    body = `<text x="${cx}" y="${r.y + 30}" text-anchor="middle" font-size="22">🎲</text>` +
      textLines(wrap(name, 15), r.y + 52, 12.5) +
      textLines([t('bStake', { amt: { m: f.cost } }), `${f.need === 6 ? t('bOnly6') : f.need + '–6'} → +${fmt(f.payout)}`], r.y + r.h - 24, 10.5, 700, '#cfeee8');
  } else if (f.type === 'charity') {
    body = `<text x="${cx}" y="${r.y + 36}" text-anchor="middle" font-size="26">💜</text>` +
      textLines(t('bFoundation').split('|'), r.y + 66, 14, 400).replace(/font-weight="400"/g, 'font-family="Luckiest Guy, sans-serif"') +
      textLines([fmt(f.cost)], r.y + r.h - 12, 11.5, 700);
  } else {
    const icon = { lawsuit: '⚖️', divorce: '💔', audit: '🧾' }[f.type];
    body = `<text x="${cx}" y="${r.y + 40}" text-anchor="middle" font-size="28">${icon}</text>` +
      textLines(wrap(name, 12), r.y + 72, name.length > 10 ? 13 : 17, 400).replace(/font-weight="400"/g, 'font-family="Luckiest Guy, sans-serif"');
  }
  const tip = fastText(i) || (f.type === 'biz' ? `${name}: ${fmt(f.cost)}, +${fmt(f.cf)}${t('bMonth')}` : f.type === 'dream' ? `${name} (${fmt(f.cost)})` : name);
  return `<g class="fastspace" data-fast="${i}">
    <rect x="${r.x + 2}" y="${r.y + 2}" width="${r.w - 4}" height="${r.h - 4}" rx="10" fill="${info.fill}" stroke="#fff" stroke-width="2"/>
    ${body}<title>${esc(tip)}</title></g>`;
}

function deckSlot(x, y, w, h, fill, title, sub, deck) {
  return `<g class="deck" data-deck="${deck}">
    <rect x="${x + 6}" y="${y + 6}" width="${w}" height="${h}" rx="12" fill="rgba(0,0,0,.25)"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="#fff" stroke-width="4"/>
    <rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" rx="8" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2"/>
    <text x="${x + w / 2}" y="${y + 34}" text-anchor="middle" font-size="12" letter-spacing="3" fill="rgba(255,255,255,.85)" font-weight="800">${sub}</text>
    <text x="${x + w / 2}" y="${y + h / 2 + 22}" text-anchor="middle" font-family="Luckiest Guy, sans-serif" font-size="${title.length > 8 ? 30 : 40}" fill="#fff">${title}</text>
  </g>`;
}

export function boardSVG() {
  const clouds = [[300, 620, 90], [1250, 640, 110], [420, 200, 70], [1180, 210, 80], [260, 780, 60], [1360, 790, 70]]
    .map(([x, y, r]) => `<g opacity=".75" fill="#fff"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .38}"/><ellipse cx="${x - r * .4}" cy="${y - r * .22}" rx="${r * .5}" ry="${r * .35}"/><ellipse cx="${x + r * .35}" cy="${y - r * .28}" rx="${r * .45}" ry="${r * .33}"/></g>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Nunito, sans-serif" id="board-svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb3f0"/><stop offset=".65" stop-color="#a8dcf7"/><stop offset="1" stop-color="#e3f4fc"/></linearGradient>
    <radialGradient id="hub" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#8a5bd6"/><stop offset="1" stop-color="#3d1d78"/></radialGradient>
    <linearGradient id="logo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe86b"/><stop offset=".55" stop-color="#ffb21e"/><stop offset="1" stop-color="#f26b1d"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="26" fill="#4b1f86"/>
  <rect x="${M + T}" y="${M + T}" width="${W - 2 * (M + T)}" height="${H - 2 * (M + T)}" fill="url(#sky)"/>
  ${clouds}
  ${deckSlot(175, 175, 250, 150, '#1e8a4a', t('bBig'), t('bChance'), 'big')}
  ${deckSlot(175, 350, 250, 150, '#27a35a', t('bSmall'), t('bChance'), 'small')}
  ${deckSlot(1175, 175, 250, 150, '#c2185b', t('bMarket'), t('bThe'), 'market')}
  ${deckSlot(1175, 350, 250, 150, '#2f6fd6', t('bDoodads'), t('bTrap'), 'doodad')}
  <g font-family="Luckiest Guy, sans-serif" text-anchor="middle">
    <text x="300" y="590" font-size="64">🏎️</text><text x="300" y="650" font-size="17" fill="#3d1d78">${t('bDreamWaits')}</text>
  </g>
  <circle cx="${CX}" cy="${CY}" r="${R1 + 10}" fill="#f2c230" stroke="#fff" stroke-width="4"/>
  ${(() => { const w = RAT.map((_, i) => wedge(i)); return w.map(x => x[0]).join('') + w.map(x => x[1]).join(''); })()}
  <circle cx="${CX}" cy="${CY}" r="${R0}" fill="url(#hub)" stroke="#f2c230" stroke-width="8"/>
  <text x="${CX}" y="${CY - 70}" text-anchor="middle" font-size="96">🐹</text>
  <text x="${CX}" y="${CY + 30}" text-anchor="middle" font-family="Luckiest Guy, sans-serif" font-size="76" fill="url(#logo)" stroke="#2a0f55" stroke-width="10" paint-order="stroke" letter-spacing="2">EURO<tspan font-family="Nunito, sans-serif" font-weight="900" fill="#7df0a6">€</tspan>FLOW</text>
  <text x="${CX}" y="${CY + 78}" text-anchor="middle" font-family="Luckiest Guy, sans-serif" font-size="22" fill="#fff" letter-spacing="1">${t('bOutOf')}</text>
  <text x="${CX}" y="${CY + 112}" text-anchor="middle" font-family="Luckiest Guy, sans-serif" font-size="34" fill="#ffd23f" stroke="#2a0f55" stroke-width="5" paint-order="stroke">${t('bWheel')}</text>
  <line x1="${CX}" y1="${CY + R0 - 2}" x2="${CX}" y2="${CY + R1 + 8}" stroke="#e53935" stroke-width="6" stroke-linecap="round"/>
  <g transform="translate(${CX} ${CY + R0 - 44})"><rect x="-50" y="-6" width="100" height="30" rx="8" fill="#e53935" stroke="#fff" stroke-width="3"/>
    <text y="16" text-anchor="middle" font-family="Luckiest Guy, sans-serif" font-size="18" fill="#fff">${t('bStart')}</text></g>
  ${FAST.map((_, i) => fastSquare(i)).join('')}
  <g id="marks"></g><g id="tokens"></g>
</svg>`;
}

// Dynamische Ebene: Spielfiguren, Besitzmarken, Traum-Markierungen
export function drawDynamic(svg, s, shown) {
  const marks = svg.querySelector('#marks'), tokens = svg.querySelector('#tokens');
  let m = '';
  for (const [idx, pid] of Object.entries(s.fastOwners || {})) {
    const p = s.players.find(q => q.id === pid); if (!p) continue;
    const r = fastRect(+idx);
    m += `<circle cx="${r.x + r.w - 16}" cy="${r.y + 16}" r="10" fill="${p.color}" stroke="#fff" stroke-width="3"><title>${esc(t('bOwnedBy', { name: p.name }))}</title></circle>`;
  }
  for (const p of s.players) if (p.dream != null && !p.out) {
    const r = fastRect(p.dream);
    const k = s.players.filter(q => q.dream === p.dream).indexOf(p);
    m += `<text x="${r.x + 14 + k * 18}" y="${r.y + 22}" font-size="18" fill="${p.color}" stroke="#fff" stroke-width="2" paint-order="stroke">★<title>${esc(t('bDreamOf', { name: p.name, amt: { m: dreamCost(s, p.dream) } }))}</title></text>`;
  }
  for (const [idx, n] of Object.entries(s.dreamMarks || {})) {
    const r = fastRect(+idx);
    m += `<text x="${r.x + r.w - 10}" y="${r.y + r.h - 30}" text-anchor="end" font-size="13" font-weight="900" fill="#c62828">×${n + 1}</text>`;
  }
  marks.innerHTML = m;

  // Tokens are kept as persistent elements so CSS can animate each hop.
  // shown = { pid: {track, pos} } – the position currently displayed (may lag behind the state while walking)
  const where = p => (shown && shown[p.id]) || p;
  const groups = {};
  s.players.filter(p => !p.out && s.phase !== 'lobby').forEach(p => {
    const w = where(p), key = w.track + w.pos; (groups[key] = groups[key] || []).push(p);
  });
  const live = new Set();
  for (const list of Object.values(groups)) list.forEach((p, k) => {
    const w = where(p);
    let x, y;
    if (w.track === 'fast') { const r = fastRect(w.pos); x = r.x + r.w / 2; y = r.y + r.h / 2; }
    else [x, y] = ratPoint(w.pos);
    const off = (k - (list.length - 1) / 2) * 22;
    const active = s.players[s.turn]?.id === p.id && s.phase === 'play';
    live.add(p.id);
    let g = tokens.querySelector(`[data-pid="${p.id}"]`);
    const pos = `translate(${x + off}px, ${y}px)`;
    if (!g) {
      g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.dataset.pid = p.id; g.style.transform = pos; tokens.appendChild(g);
    }
    const html = `${active ? `<circle r="22" fill="none" stroke="#fff" stroke-width="3" class="pulse"/>` : ''}
      <g class="piece"><circle r="16" fill="${p.color}" stroke="#fff" stroke-width="4"/>
      <text y="6" text-anchor="middle" font-size="16" font-weight="900" fill="#fff">${esc(p.name[0].toUpperCase())}</text></g>
      <title>${esc(p.name)}</title>`;
    if (g.dataset.html !== html) { g.innerHTML = html; g.dataset.html = html; }
    g.setAttribute('class', 'token' + (active ? ' active' : ''));
    if (g.style.transform !== pos) {
      g.style.transform = pos;
      g.classList.remove('hop'); void g.getBBox(); g.classList.add('hop');
    }
    if (active && tokens.lastChild !== g) tokens.appendChild(g); // active token on top
  });
  for (const g of [...tokens.children]) if (!live.has(g.dataset.pid)) g.remove();
}
