// Euro Flow – end-of-game report: net-worth chart, ranking, best & worst move of every player.
import { netWorth, passive, escapeTarget } from './engine.js';
import { t, fmt, profName, getLang } from './i18n.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function chart(s) {
  const W = 560, H = 200, P = 46;
  const series = s.players.map(p => ({ p, h: p.hist && p.hist.length ? p.hist : [netWorth(p, s)] }));
  const all = series.flatMap(x => x.h);
  let lo = Math.min(0, ...all), hi = Math.max(1, ...all);
  if (hi - lo < 1000) hi = lo + 1000;
  const y = v => H - P / 2 - (v - lo) / (hi - lo) * (H - P);
  const lines = series.map(({ p, h }) => {
    const x = i => P + (h.length < 2 ? 0 : i / (h.length - 1)) * (W - P - 10);
    const pts = h.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${p.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${x(h.length - 1)}" cy="${y(h[h.length - 1])}" r="4" fill="${p.color}"/>`;
  }).join('');
  const short = v => { const a = Math.abs(v), n = a >= 1e6 ? (a / 1e6).toFixed(1) + 'M' : a >= 1000 ? Math.round(a / 1000) + 'k' : String(Math.round(a)); return (v < 0 ? '−' : '') + (getLang() === 'de' ? n + ' €' : '€' + n); };
  const grid = [lo, (lo + hi) / 2, hi].map(v => `<line x1="${P}" x2="${W - 10}" y1="${y(v)}" y2="${y(v)}" stroke="#e7e1f3"/><text x="${P - 4}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#6d6386">${short(v)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="nwchart" role="img" aria-label="${esc(t('repChart'))}">${grid}${lo < 0 ? `<line x1="${P}" x2="${W - 10}" y1="${y(0)}" y2="${y(0)}" stroke="#d6334a" stroke-dasharray="4 4"/>` : ''}${lines}</svg>`;
}

export function reportHTML(s, mine, pname) {
  const w = s.players.find(q => q.id === s.winner?.pid);
  const ranked = [...s.players].sort((a, b) => netWorth(b, s) - netWorth(a, s));
  const me = s.players.find(mine);
  const myRank = me ? ranked.indexOf(me) + 1 : 0;
  const rows = ranked.map((p, i) => {
    const status = p.out ? t('out') : p.track === 'fast' ? '🚀 ' + t('fastTrack') : `${fmt(passive(p))} / ${fmt(escapeTarget(p, s))}`;
    return `<tr class="${mine(p) ? 'me' : ''}"><td>${i + 1}.</td><td><span class="dot" style="background:${p.color}"></span> ${esc(pname(p))}${p.bot ? ` <small>(${t('lvlShort_' + p.bot)})</small>` : ''}<br><small>${esc(profName(p.profKey))}</small></td>
      <td><b>${fmt(netWorth(p, s))}</b></td><td><small>${status}</small></td></tr>`;
  }).join('');
  const moves = s.players.map(p => `<div class="moves ${mine(p) ? 'me' : ''}"><b style="color:${p.color}">${esc(pname(p))}</b>
      <div>👍 ${p.best ? t(p.best.key, p.best.params) : '–'}</div>
      <div>👎 ${p.worst ? t(p.worst.key, p.worst.params) : '–'}</div></div>`).join('');
  const bots = s.players.filter(p => p.bot);
  const compare = me && bots.length ? `<p class="fine">${t('repCompare', { rank: myRank, n: s.players.length, nw: { m: netWorth(me, s) }, best: esc(pname(ranked.find(p => p.bot))), bnw: { m: netWorth(ranked.find(p => p.bot), s) } })}</p>` : '';
  return `<div class="winbox report"><div class="trophy">🏆</div>
    ${w ? '' : '<style>.report .trophy{display:none}</style><div class="lost">💸</div>'}<h2>${w ? esc(t('wins', { name: pname(w) })) : t('gameOver')}</h2><p>${s.winner ? esc(t(s.winner.reason.k, s.winner.reason.p)) : s.endReason ? esc(t(s.endReason.k, s.endReason.p)) : ''}</p>
    <h4>${t('repChart')}</h4>${chart(s)}
    <div class="legend">${s.players.map(p => `<span><i style="background:${p.color}"></i>${esc(p.name)}</span>`).join('')}</div>
    <h4>${t('repRanking')}</h4><table class="rank">${rows}</table>${compare}
    <h4>${t('repMoves')}</h4><div class="movegrid">${moves}</div></div>`;
}
