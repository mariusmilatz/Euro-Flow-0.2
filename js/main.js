import { FAST, RAT, DREAM_INDEXES, COLORS, STOCKS, CITIES, ADVISOR_FEE, ADVISOR_MONTH, BAUSPAR_READY, SPEKU_YEARS_IMMO, SPEKU_YEARS_GOLD } from './data.js';
import {
  apply, newGame, passive, totalIncome, cashflow, cardOf, R, BUILDINGS, IMMO,
  sellable, salePrice, saleTax, nebenkosten, nkRate, darlehen, dreamCost, loanPay, buyCost,
  incomeLines, deductionLines, livingLines, saveLines, livingCosts, healthCost, escapeTarget, assetCf, netWorth,
  payInfo, afaPotential, etfOf, bausparOf, etfSaleTax, working, quickSale, canPlayOn,
} from './engine.js';
import { boardSVG, drawDynamic } from './board.js';
import { hostRoom, joinRoom, newCode } from './net.js';
import { botAction, botSells } from './bot.js';
import { coachHTML } from './assistant.js';
import { t, fmt, sfmt, setLang, getLang, cardT, fastName, fastText, profName, assetName, stockName, stockWhat, logLine, cityName, RULES } from './i18n.js';
import { reportHTML } from './report.js';

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SAVE = 'euroflow-save-v4';
const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const BOT_NAMES = ['Lena', 'Jonas', 'Mia', 'Felix', 'Emma', 'Paul', 'Hannah', 'Leon', 'Sophie', 'Ben'];

let state = null;
let mode = null;        // 'local' | 'host' | 'client'
let me = 'host';        // owner id of this device
let net = null;
let viewPid = null;
let lastRollSeq = null;
let lastLogLen = 0;
let lastTurnSeen = null;
let justOpen = false;   // coach: "what just happened" expanded?
let logOpen = false;
let logFilter = 'all';  // 'all' or a player id
let qsOpen = null;      // property whose "sell now" breakdown is unfolded
let closedCard = null;  // another player's card the viewer clicked away
const outShown = new Set(); // my players whose 'you're out' notice was shown

// ---------- walking animation: pieces hop space by space like on a real board ----------
const HOP_MS = 210;
let justLanded = false; // a piece just arrived → computer players react right away
const anim = { shown: {}, timer: null };
const moving = () => anim.timer != null;
function syncAnim() {
  let any = false;
  for (const p of state.players) {
    const sh = anim.shown[p.id];
    if (!sh || sh.track !== p.track || state.phase !== 'play' || p.out) { anim.shown[p.id] = { track: p.track, pos: p.pos }; continue; }
    if (sh.pos !== p.pos) any = true;
  }
  if (any && !anim.timer) anim.timer = setInterval(hop, HOP_MS);
}
function hop() {
  let still = false;
  for (const p of state.players) {
    const sh = anim.shown[p.id];
    if (!sh || sh.pos === p.pos || sh.track !== p.track) continue;
    sh.pos = (sh.pos + 1) % (sh.track === 'rat' ? RAT.length : FAST.length);
    if (sh.pos !== p.pos) still = true;
  }
  drawDynamic($('#board-svg'), state, anim.shown);
  if (!still) { clearInterval(anim.timer); anim.timer = null; justLanded = true; setTimeout(render, 120); }
}

// ---------- helpers ----------
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
let coachOn = store.get('euroflow-coach') === true;

function toast(msg, kind = 'err') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind; el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}
const errText = e => (e && e.key ? t(e.key, e.params) : (e?.message || String(e)));
// A player is "mine" if this device controls it (bots are never clicked by humans)
const mine = p => p && !p.bot && (mode === 'local' || p.owner === me);
const cur = () => state?.players[state.turn];
const pname = p => (p.bot ? '🤖 ' : '') + p.name;

// ---------- actions ----------
function dispatch(action) {
  if (mode === 'client') return net.send({ t: 'act', action });
  try {
    state = apply(state, action, mode === 'local' ? null : 'host');
    changed();
  } catch (e) { toast(errText(e)); }
}
function changed() {
  if (mode !== 'client') store.set(SAVE, { mode, code: net?.code, state });
  if (mode === 'host') net.broadcast({ t: 'state', state });
  render();
}

function onHostMessage(peerId, msg) {
  if (msg.t === 'hello') {
    let claimed = 0;
    for (const pid of msg.pids || []) {
      const p = state.players.find(q => q.id === pid && !q.bot);
      if (p) { p.owner = peerId; claimed++; }
    }
    if (!claimed && state.phase === 'lobby') {
      try { state = apply(state, { type: 'addPlayer', name: msg.name }, peerId); } catch (e) { net.send(peerId, { t: 'err', key: e.key, params: e.params }); }
    }
    changed();
    net.send(peerId, { t: 'state', state });
  } else if (msg.t === 'act') {
    try { state = apply(state, msg.action, peerId); changed(); }
    catch (e) { net.send(peerId, { t: 'err', key: e.key, params: e.params }); }
  }
}
function onClientMessage(msg) {
  if (msg.t === 'state') {
    state = msg.state;
    store.set('euroflow-mine-' + net.code, state.players.filter(p => p.owner === me).map(p => p.id));
    render();
  } else if (msg.t === 'err') toast(t(msg.key, msg.params));
}

// ---------- computer players (run on host / local device only) ----------
let botTimer = null, botCardSeen = null, cardSince = 0, ackCard = null;
const RESULT_MS = 2000;   // how long the other player's choice stays visible after a click
const showResultUntil = {};   // card id → time until the bot's result stays visible after a click
const BUYABLE = ['asset', 'stock', 'etfplan', 'bauspar', 'choice'];
// a computer player still has to decide on its own card (buy / pass / choose)
function botDecisionPending() {
  const c = cur(), card = cardOf(state.card);
  return !!(card && c.bot && state.step === 'card' && state.card.by === c.id && BUYABLE.includes(card.type) && !state.card.done && !(state.card.passed || []).includes(c.id));
}
const ACK_WAIT = 40000; // max time a bot's card stays open waiting for a click
const humanHere = () => state.players.some(p => !p.bot && !p.out && (mode === 'local' || p.owner === me));
function scheduleBots() {
  if (mode === 'client' || !state || botTimer || moving()) return;
  if (state.phase !== 'order' && state.phase !== 'play') return;
  const c = cur();
  // quick pace: computer players "think" while pieces move and act right after landing;
  // a card stays visible a moment before the computer decides so you can read it
  let delay = state.phase === 'order' ? 380 : state.step === 'card' ? (botDecisionPending() ? 1100 : 300) : state.step === 'roll' ? 350 : 300;
  if (justLanded) { delay = Math.min(delay, state.step === 'card' && botDecisionPending() ? 900 : 150); justLanded = false; }
  if (state.phase === 'play' && !c.bot && !(state.card && state.card.id !== botCardSeen)) return;
  botTimer = setTimeout(() => { botTimer = null; botStep(); }, delay);
}
function botDo(a) {
  try { state = apply(state, a, mode === 'local' ? null : 'host'); }
  catch (e) {
    const c = cur();
    try { state = apply(state, { type: state.step === 'roll' ? 'roll' : 'endTurn', pid: c.id }, mode === 'local' ? null : 'host'); } catch { return; }
  }
  changed();
}
// Humans who still might sell into the open card
function humansDeciding() {
  const card = cardOf(state.card);
  if (!card || state.step !== 'card') return [];
  return state.players.filter(p => !p.bot && !p.out && !(state.card.passed || []).includes(p.id) && p.assets.some(a => sellable(card, a)));
}
function botStep() {
  if (moving()) return;
  if (state.phase === 'order') {
    const b = state.players.find(p => p.bot && state.order.eligible.includes(p.id) && state.order.rolls[p.id] == null);
    if (b) botDo(botAction(state, b));
    return;
  }
  if (state.phase !== 'play') return;
  // 1) when a new card appears, every bot considers selling into it
  if (state.card && state.card.id !== botCardSeen) {
    botCardSeen = state.card.id; cardSince = Date.now();
    let sold = false;
    for (const p of state.players.filter(q => q.bot && !q.out)) for (const a of botSells(state, p)) {
      try { state = apply(state, a, mode === 'local' ? null : 'host'); sold = true; } catch { /* ignore */ }
    }
    if (sold) return changed();
  }
  const c = cur();
  if (!c.bot) return;
  let a = botAction(state, c);
  if (!a) return;
  if (state.step === 'card' && a.type === 'endTurn') {
    const card = cardOf(state.card);
    // the bot declines a buyable card → record it so the popup can show "didn't buy"
    if (['asset', 'stock', 'etfplan', 'bauspar'].includes(card.type) && !state.card.done && !(state.card.passed || []).includes(c.id)) a = { type: 'passCard', pid: c.id };
    // keep the popup open: wait for humans to sell, and for a click on the board (or a timeout)
    else if ((humansDeciding().length || (humanHere() && ackCard !== state.card.id)) && Date.now() - cardSince < ACK_WAIT) {
      botTimer = setTimeout(() => { botTimer = null; botStep(); }, 400);
      return;
    }
    // the popup was clicked away before the bot decided: show its result for a moment, then go on
    else if ((showResultUntil[state.card.id] || 0) > Date.now()) {
      botTimer = setTimeout(() => { botTimer = null; botStep(); }, showResultUntil[state.card.id] - Date.now());
      return;
    }
  }
  botDo(a);
}

// Another player's card: once they decided (bought / passed / chose), show the result for
// 2 seconds and close the popup by itself — no click needed. Stays open while I can still sell into it.
// How long another player's popup stays open: adapts to how much there is to read
// (≈ 0.2 s per word + 2 s, between 3 and 14 s). A click on the board closes it sooner.
const cardShownAt = {}, cardWords = {};
const READ = { base: 2000, perWord: 200, min: 3000, max: 14000 };
const readMs = id => Math.min(READ.max, Math.max(READ.min, READ.base + (cardWords[id] || 0) * READ.perWord));
let closeTimer = null;
function closeCardAt(id, at) {
  ackCard = id;
  showResultUntil[id] = at;   // the computer waits until then before it moves on
  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(() => { closeTimer = null; if (state.card && state.card.id === id) { closedCard = id; render(); } scheduleBots(); }, Math.max(0, at - Date.now()));
}
// Another player's card closes by itself once it has been read (decision cards: after the choice,
// at least 2 s with the result). Stays open while I can still sell into it.
function autoCloseDecided() {
  const s = state;
  if (!s.card || s.phase !== 'play' || moving() || closedCard === s.card.id || ackCard === s.card.id) return;
  const drawer = s.players.find(p => p.id === s.card.by), card = cardOf(s.card);
  if (!drawer || mine(drawer) || !card) return;
  const decided = !BUYABLE.includes(card.type) || s.card.done || (s.card.passed || []).includes(drawer.id);
  if (!decided || humansDeciding().some(mine)) return;
  const id = s.card.id, now = Date.now();
  const at = Math.max((cardShownAt[id] ?? now) + readMs(id), BUYABLE.includes(card.type) ? now + RESULT_MS : 0);
  closeCardAt(id, at);
  setTimeout(() => render(), 0);   // show the "closes by itself" hint
}

// ---------- screens ----------
function showScreen(id) { for (const el of document.querySelectorAll('.screen')) el.hidden = el.id !== id; }

async function startHost(code, existing) {
  showScreen('connecting');
  try {
    net = await hostRoom(code, { onMessage: onHostMessage, onPeers: () => render() });
  } catch (e) {
    toast(t('roomFail') + (e.message === 'taken' ? t('roomTaken') : e.message || e.type));
    showScreen('start'); return;
  }
  mode = 'host'; me = 'host';
  state = existing || newGame();
  history.replaceState(null, '', location.pathname + '?host=' + code);
  if (!existing) addSelf();
  changed();
}
async function startJoin(code) {
  code = code.trim().toUpperCase();
  if (!code) return toast(t('enterCode'));
  const name = $('#name').value.trim() || t('guest');
  store.set('euroflow-name', name);
  showScreen('connecting');
  try {
    net = await joinRoom(code, {
      onMessage: onClientMessage,
      onClose: () => { toast(t('lostConn')); $('#netstatus').textContent = t('disconnected'); },
    });
  } catch (e) {
    toast(e.message === 'notfound' ? t('roomNotFound') : (e.message || String(e))); showScreen('start'); return;
  }
  net.code = code; mode = 'client'; me = net.id;
  history.replaceState(null, '', location.pathname + '?room=' + code);
  net.send({ t: 'hello', name, pids: store.get('euroflow-mine-' + code) || [] });
}
function startLocal(existing) {
  mode = 'local'; me = 'host'; net = null;
  state = existing || newGame();
  if (!existing) {
    addSelf();
    for (let i = 0; i < 2; i++) addBot('medium');
  }
  history.replaceState(null, '', location.pathname);
  changed();
}
function addSelf() {
  const n = $('#name').value.trim();
  state = apply(state, { type: 'addPlayer', name: n || 'Player 1' }, mode === 'local' ? null : 'host');
}
function addBot(level) {
  const used = state.players.map(p => p.name);
  const name = BOT_NAMES.find(n => !used.includes(n)) || 'Bot';
  dispatch({ type: 'addPlayer', name, bot: level });
}

// ---------- static texts & language ----------
function applyStatic() {
  for (const el of document.querySelectorAll('[data-i18n]')) el.innerHTML = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-ph]')) el.placeholder = t(el.dataset.i18nPh);
  for (const b of document.querySelectorAll('[data-lang]')) b.classList.toggle('on', b.dataset.lang === getLang());
  $('#rules-content').innerHTML = RULES[getLang()];
  $('#coach-toggle').textContent = coachOn ? t('coachOn') : t('coachOff');
  $('#coach-toggle').classList.toggle('on', coachOn);
  $('#lobby-coach').checked = coachOn;
  $('#board').innerHTML = boardSVG();
  lastRollSeq = state?.roll?.n;
}

// ---------- rendering ----------
function render() {
  if (!state) return;
  if (state.phase === 'lobby') { showScreen('lobby'); renderLobby(); return; }
  showScreen('game');
  const c = cur();
  if (!viewPid || !state.players.some(p => p.id === viewPid)) viewPid = (state.players.find(mine) || state.players[0]).id;
  // pass-and-play: follow whichever human is on turn
  if (state.phase === 'play' && mine(c) && lastTurnSeen !== state.turn) viewPid = c.id;
  lastTurnSeen = state.turn;
  syncAnim();
  drawDynamic($('#board-svg'), state, anim.shown);
  renderCoach();
  renderTurn();
  renderCard();
  autoCloseDecided();
  renderPlayers();
  renderSheet();
  renderLog();
  renderWinner();
  renderOut();
  $('#netstatus').textContent = mode === 'local' ? '' : mode === 'host' ? t('netHost', { code: net.code, n: net.count() }) : t('netClient', { code: net.code });
  scheduleBots();
}

function renderLobby() {
  const host = mode !== 'client';
  const realistic = state.mode === 'realistic';
  $('#lobby-invite').hidden = !net;
  if (net) { $('#invite-link').value = `${location.origin}${location.pathname}?room=${net.code}`; $('#room-code').textContent = net.code; }
  $('#lobby-mode').innerHTML = `<label>${t('gameMode')}</label><div class="modes">${['easy', 'classic', 'realistic'].map(m =>
    `<button class="modebtn ${state.mode === m ? 'on' : ''}" data-mode="${m}" ${host ? '' : 'disabled'}><b>${t('mode_' + m)}</b><small>${t('modeHint_' + m)}</small></button>`).join('')}</div>`;
  const bots = state.players.filter(p => p.bot);
  const allLvl = bots.length && bots.every(p => p.bot === bots[0].bot) ? bots[0].bot : null;
  $('#lobby-alllvl').hidden = !host || !bots.length;
  $('#lobby-alllvl').innerHTML = `<label>${t('allBots')}</label><div class="modes">${['easy', 'medium', 'hard'].map(l =>
    `<button class="modebtn ${allLvl === l ? 'on' : ''}" data-alllvl="${l}"><b>${t('lvl_' + l)}</b></button>`).join('')}</div>`;
  $('#lobby-players').innerHTML = state.players.map(p => {
    const editable = mine(p) || (host && p.bot);
    return `<div class="lp" style="--c:${p.color}">
      <span class="dot"></span>
      <b>${esc(pname(p))}</b>${p.owner === me && mode !== 'local' && !p.bot ? ` <small>${t('you')}</small>` : ''}
      ${p.bot ? (host ? `<select data-botlvl="${p.id}">${['easy', 'medium', 'hard'].map(l => `<option value="${l}" ${p.bot === l ? 'selected' : ''}>${t('lvl_' + l)}</option>`).join('')}</select>` : `<small>${t('lvlShort_' + p.bot)}</small>`) : ''}
      <label>${t('dream')}
        <select data-dream="${p.id}" ${editable ? '' : 'disabled'}>
          ${DREAM_INDEXES.map(d => `<option value="${d}" ${p.dream === d ? 'selected' : ''}>${FAST[d].icon} ${esc(fastName(d))} (${fmt(FAST[d].cost)})</option>`).join('')}
        </select></label>
      ${realistic ? `<label>${t('homeCity')}
        <select data-city="${p.id}" ${editable ? '' : 'disabled'}>${CITIES.map(c => `<option value="${c.key}" ${p.city === c.key ? 'selected' : ''}>${esc(cityName(c))}</option>`).join('')}</select></label>
        <label class="church"><input type="checkbox" data-church="${p.id}" ${p.church ? 'checked' : ''} ${editable ? '' : 'disabled'}> ${t('churchMember')}</label>` : ''}
      <span class="colors">${editable ? COLORS.map(c => `<button class="sw ${c === p.color ? 'on' : ''}" style="background:${c}" data-color="${c}" data-pid="${p.id}" title="${t('color')}"></button>`).join('') : ''}</span>
      ${(host || mine(p)) ? `<button class="x" data-remove="${p.id}" title="${t('remove')}">✕</button>` : ''}
    </div>`;
  }).join('') || `<p class="muted">${t('noPlayers')}</p>`;
  $('#lobby-start').hidden = !host;
  $('#lobby-botrow').hidden = !host;
  $('#lobby-wait').hidden = host;
}

function renderCoach() {
  const el = $('#coach');
  el.hidden = !coachOn;
  if (!coachOn) return;
  const top = el.scrollTop;
  el.innerHTML = `<div class="coachhead"><span>${t('coachTitle')}</span><button class="x" id="coach-close" title="${t('coachOff')}">✕</button></div>` + coachHTML(state, mine, justOpen);
  el.scrollTop = top;
  const d = el.querySelector('details.cjust');
  if (d) d.addEventListener('toggle', () => { justOpen = d.open; });
}

function renderTurn() {
  const s = state, c = cur(), el = $('#turn');
  const rollChanged = s.roll && s.roll.n !== lastRollSeq;
  const dice = s.roll ? `<div class="dice ${rollChanged ? 'shake' : ''}">${s.roll.dice.map(d => `<span>${DICE[d]}</span>`).join('')}</div>` : '';
  lastRollSeq = s.roll?.n;
  if (s.phase === 'order') {
    const o = s.order;
    el.innerHTML = `<div class="turnhead"><b>${t('orderTitle')}</b></div><p class="fine">${t('orderHint')}</p>
      <div class="order">${s.players.map(p => {
        const r = o.rolls[p.id], hist = (o.history[p.id] || []).map(d => `<span class="old">${DICE[d]}</span>`).join('');
        const elig = o.eligible.includes(p.id);
        let right;
        if (r != null) right = `<span class="die">${DICE[r]}</span>`;
        else if (!elig) right = '';
        else if (mine(p)) right = `<button class="btn small" data-act="orderRoll" data-pid="${p.id}">${t('rollForOrder')}</button>`;
        else right = `<span class="muted">${t('waiting')}</span>`;
        return `<div class="orow ${elig ? '' : 'dim'}"><span class="dot" style="background:${p.color}"></span><b>${esc(pname(p))}</b>${hist}<span class="sp"></span>${right}</div>`;
      }).join('')}</div>`;
    return;
  }
  if (s.phase === 'over') { el.innerHTML = `<div class="turnhead">${t('gameOver')}</div>${dice}`; return; }
  let act = '';
  if (moving()) act = `<p class="muted thinking">${t('walking', { name: esc(c.name) })}</p>`;
  else if (c.bot) act = `<p class="muted thinking">${t('botThinking', { name: esc(c.name) })}</p>`;
  else if (!mine(c)) act = `<p class="muted">${t('waitFor', { name: esc(c.name), color: c.color })}</p>`;
  else switch (s.step) {
    case 'roll':
      if (c.skip > 0) act = `<button class="btn big" data-act="roll">${t('skipBtn', { n: c.skip })}</button>`;
      else if (c.track === 'rat' && c.charity > 0) act = `<p class="hint">${t('charityDice', { n: c.charity })}</p><div class="row"><button class="btn big" data-act="roll" data-dice="1">${t('oneDie')}</button><button class="btn big" data-act="roll" data-dice="2">${t('twoDice')}</button></div>`;
      else if (c.track === 'fast' && c.fastDice) act = `<div class="row"><button class="btn" data-act="roll" data-dice="1">🎲 1</button><button class="btn" data-act="roll" data-dice="2">🎲 2</button><button class="btn" data-act="roll" data-dice="3">🎲 3</button></div>`;
      else act = `<button class="btn big" data-act="roll">${t('roll')}</button>`;
      break;
    case 'deal':
      act = `<p class="hint">${t('dealQ')}</p>
        <div class="row"><button class="btn green" data-act="deal" data-deck="small">${t('smallDeal')}<small>${t('upTo5k')}</small></button>
        <button class="btn green dark" data-act="deal" data-deck="big">${t('bigDeal')}<small>${t('from6k')}</small></button></div>
        <button class="btn ghost" data-act="endTurn">${t('noDeal')}</button>`;
      break;
    case 'charity':
      act = `<p class="hint">${t('charityQ', { amt: { m: Math.round(totalIncome(c, s) * 0.1) } })}</p>
        <div class="row"><button class="btn purple" data-act="charity" data-accept="1">${t('donate')}</button><button class="btn ghost" data-act="charity">${t('noThanks')}</button></div>`;
      break;
    case 'fast': {
      const sp = FAST[c.pos];
      if (sp.type === 'biz') act = `<p class="hint">${t('bizOffer', { fast: c.pos, cost: { m: sp.cost }, cf: { m: sp.cf } })}</p><div class="row"><button class="btn green" data-act="fastBuy">${t('buy')}</button><button class="btn ghost" data-act="endTurn">${t('pass')}</button></div>`;
      else if (sp.type === 'dream' && c.dream === c.pos) act = `<p class="hint">${t('dreamOffer', { icon: sp.icon, fast: c.pos, cost: { m: dreamCost(s, c.pos) } })}</p><div class="row"><button class="btn gold" data-act="fastBuy">${t('buyDream')}</button><button class="btn ghost" data-act="endTurn">${t('notYet')}</button></div>`;
      else if (sp.type === 'dream') act = `<p class="hint">${t('dreamOfferOther', { icon: sp.icon, fast: c.pos, cost: { m: dreamCost(s, c.pos) } })}</p><div class="row"><button class="btn green" data-act="fastBuy">${t('buyExtraDream')}</button><button class="btn ghost" data-act="endTurn">${t('pass')}</button></div>`;
      else if (sp.type === 'gamble') act = `<p class="hint">🎲 ${esc(fastText(c.pos))}</p><div class="row"><button class="btn green" data-act="fastBuy">${t('invest')}</button><button class="btn ghost" data-act="endTurn">${t('pass')}</button></div>`;
      else if (sp.type === 'charity') act = `<p class="hint">💜 ${esc(fastText(c.pos))}</p><div class="row"><button class="btn purple" data-act="fastBuy">${t('foundationBtn')}</button><button class="btn ghost" data-act="endTurn">${t('noThanks')}</button></div>`;
      break;
    }
    default: act = `<button class="btn big" data-act="endTurn">${t('endTurn')}</button>`;
  }
  const where = c.track === 'rat' ? (c.pos < 0 ? t('start') : t('sp_' + RAT[c.pos])) : fastName(c.pos);
  const info = `<div class="trayinfo">${c.track === 'rat' ? `<span title="${t('yearHint')}">📅 ${t('yearN', { n: c.year })}</span>` : ''}<span title="${t('indexHint')}">📈 ${t('etfIndex')} ${Math.round(s.index)}</span><span title="${t('rateHint')}">🏦 ${t('rate_' + (s.rate || 0))}</span></div>`;
  el.innerHTML = `<div class="turnhead"><span class="dot" style="background:${c.color}"></span> ${t('isTurn', { name: esc(pname(c)) })}<small>${c.track === 'rat' ? t('ratRace') : t('fastTrack')} · ${esc(where)}</small></div>${dice}<div class="actions">${act}</div>${info}`;
}

function cardBody(card) {
  const s = state;
  const row = (k, v, cls = '') => `<tr class="${cls}"><td>${k}</td><td>${v}</td></tr>`;
  if (card.type === 'stock') {
    const st = STOCKS[card.sym];
    const [lo, hi] = st.range.match(/\d+/g).map(Number);
    return `<table>${row(t('cSymbol'), card.sym)}${row(t('cCompany'), `${esc(stockName(card.sym))} (${esc(stockWhat(card.sym))})`)}${row(t('cToday'), `<b>${fmt(card.price)}</b>`)}${row(t('cRange'), `${fmt(lo)} – ${fmt(hi)}`)}${row(t('cDividend'), t('none'))}</table>
      <p class="fine">${t('cStockFine')}</p>`;
  }
  if (card.type === 'etfplan') return `<table>${row(t('etfIndex'), Math.round(s.index))}${row(t('cTeilfrei'), '30 %')}</table><p class="fine">${t('cEtfFine')}</p>`;
  if (card.type === 'bauspar') return `<table>${row(t('cMonthly'), fmt(card.monthly))}${row(t('cBausparReady'), fmt(BAUSPAR_READY))}${row(t('cBausparLoan'), t('cBausparLoanV'))}</table>`;
  if (card.type === 'rate') return `<table>${row(t('cRateNow'), `<b>${t('rate_' + (s.rate || 0))}</b>`)}</table>`;
  if (card.type === 'index') return `<table>${row(t('etfIndex'), `<b>${Math.round(s.index)}</b>`)}</table>`;
  if (card.type === 'asset') {
    if (card.kind === 'gold' || card.kind === 'crypto') return `<table>${row(t('cAmount'), t(card.kind === 'gold' ? 'coins' : 'units', { n: card.units }))}${row(t(card.kind === 'gold' ? 'perCoin' : 'perUnit'), fmt(card.unitPrice))}${row(t('total'), `<b>${fmt(card.units * card.unitPrice)}</b>`)}</table>`;
    const nk = nebenkosten(card, s), dl = darlehen(card, s), biz = card.kind === 'biz' || card.kind === 'coop';
    const pct = Math.round(nkRate(card, s) * 1000) / 10;
    return `<table>${row(t('cPrice'), fmt(card.price))}${nk ? row(t('cNkPct', { pct: String(pct).replace('.', getLang() === 'de' ? ',' : '.'), st: R(s).city && card.st ? card.st : '' }), fmt(nk), 'sub') : ''}${row(biz ? t('cCapital') : t('cEquity'), `<b>${fmt(card.down)}</b>`)}${dl ? row(biz ? t('cLiability') : t('cMortgage'), fmt(dl)) : ''}${row(t('cCf'), `<b class="${card.cf < 0 ? 'neg' : 'pos'}">${sfmt(card.cf)}</b>`)}${card.afa ? row(t('cAfa'), `${Math.round(card.afa * 100)} %`) : ''}</table>
      ${nk ? `<p class="fine">${t('cNkFine')}</p>` : ''}`;
  }
  if (card.type === 'sell') {
    const how = card.perUnit ? t(card.kind === 'gold' ? 'perUnitCoin' : card.kind === 'crypto' ? 'perUnitCrypto' : 'perUnitFlat', { amt: { m: card.perUnit } }) : card.mult ? t('multPrice', { n: card.mult }) : fmt(card.price);
    const rf = IMMO.includes(card.kind) && s.rate ? `<p class="fine">${t('cRateAdj', { lvl: t('rate_' + s.rate) })}</p>` : '';
    return `<table>${row(t('cBuyerPays'), `<b>${how}</b>`)}</table>${rf}<p class="fine">${t('cSellFine')}</p>`;
  }
  return '';
}

// Bank loan the player would need for a cost, plus what it does to the monthly payday.
const loanFor = (p, cost) => p.track === 'rat' ? Math.max(0, Math.ceil((cost - p.cash) / 1000) * 1000) : 0;
const needLoanHint = (p, cost, cfDelta = 0) => {
  const l = loanFor(p, cost);
  return l ? t('needLoan', { amt: { m: l }, pay: { m: loanPay({ loan: l }) }, cf: { sm: cashflow(p, state) + cfDelta - loanPay({ loan: l }) } }) : '';
};

// Deal needs more cash than you have → show what the loan costs each month vs. what the deal brings
function loanCheck(p, cost, brings = 0) {
  const l = loanFor(p, cost);
  if (!l) return '';
  const pay = loanPay({ loan: l }), netM = brings - pay, after = cashflow(p, state) + netM;
  const r = (k, v, cls = '') => `<tr class="${cls}"><td>${k}</td><td>${v}</td></tr>`;
  return `<div class="loancheck"><b>${t('lcTitle')}</b><table>
    ${r(t('lcNeed'), fmt(l))}
    ${r(t('lcInterest'), `<b class="neg">${sfmt(-pay)}</b>`)}
    ${r(t('lcBrings'), `<b class="${brings < 0 ? 'neg' : 'pos'}">${sfmt(brings)}</b>`)}
    ${r(`<b>${t('lcNet')}</b>`, `<b class="${netM < 0 ? 'neg' : 'pos'}">${sfmt(netM)}</b>`, 'sum')}
    ${r(t('lcPayday'), `<b class="${after < 0 ? 'neg' : ''}">${sfmt(after)}</b>`)}
    </table><p class="fine">${t(netM < 0 ? 'lcBad' : 'lcGood')} ${t('lcRepay')}</p></div>`;
}

function renderCard() {
  const box = $('#card'), s = state, c = cur();
  const card = cardOf(s.card);
  if (!card || s.phase !== 'play' || moving() || closedCard === s.card.id) { box.hidden = true; return; }
  box.hidden = false;
  box.className = 'gamecard deck-' + s.card.deck;
  const tx = cardT(s.card.deck, s.card.i);
  const drawer = s.players.find(p => p.id === s.card.by);
  let actions = '';
  const myTurnCard = mine(c) && c.id === s.card.by && !s.card.done;
  if (myTurnCard) {
    if (card.type === 'stock') actions += `<div class="buyrow"><input type="number" id="qty" min="1" step="10" value="100"> ${t('shares')} <button class="btn green" data-act="buy">${t('buy')}</button></div><div class="fine" id="qtycost"></div>`;
    else if (card.type === 'etfplan') {
      const sug = Math.max(100, Math.round(cashflow(c, s) * 0.2 / 50) * 50);
      actions += `<div class="buyrow">${t('etfPerPayday')} <input type="number" id="qty" min="50" step="50" value="${sug}"> € <button class="btn green" data-act="buy">${etfOf(c) ? t('etfIncrease') : t('etfStart')}</button></div>`;
    } else if (card.type === 'bauspar') actions += `<button class="btn green" data-act="buy">${t('bausparSign', { amt: { m: card.monthly } })}</button>`;
    else if (card.type === 'choice') actions += `<div class="row"><button class="btn" data-act="choose" data-opt="quit">${t('choiceQuit')}</button><button class="btn ghost" data-act="choose" data-opt="stay">${t('choiceStay')}</button></div>${loanFor(c, 800) ? `<p class="fine loanhint">${needLoanHint(c, 800)}</p>` : ''}`;
    else if (card.type === 'asset') {
      const need = buyCost(card);
      const loan = loanFor(c, need);
      actions += `<button class="btn green" data-act="buy">${t('buyFor', { amt: { m: need } })}${loan ? ` <small>${t('inclLoan', { amt: { m: loan }, pay: { m: loanPay({ loan }) } })}</small>` : ''}</button>`;
      if (loan) actions = loanCheck(c, need, card.cf || 0) + actions;
      const b = bausparOf(c);
      if (b && b.ready && BUILDINGS.includes(card.kind)) actions += `<button class="btn green dark" data-act="buy" data-bauspar="1">${t('buyWithBauspar', { amt: { m: b.balance } })}</button>`;
    }
  }
  // selling options for all my players
  for (const p of s.players.filter(mine)) {
    const own = p.assets.filter(x => sellable(card, x));
    for (const a of own) {
      if (card.type === 'stock') {
        const avg = a.cost / a.shares, pct = Math.round((card.price - avg) / avg * 100);
        actions += `<div class="sellrow"><span style="color:${p.color}">●</span> ${esc(p.name)}: ${a.shares} × ${a.sym} · ${t('avg')} ${fmt(avg)} → ${fmt(card.price)}
          <b class="${pct < 0 ? 'neg' : 'pos'}">${pct >= 0 ? '+' : ''}${pct} %</b>
          <span class="qtywrap"><input type="number" min="1" max="${a.shares}" value="${a.shares}" data-sellqty="${a.id}" data-pid="${p.id}"> <button class="btn small" data-act="sell" data-pid="${p.id}" data-asset="${a.id}">${t('sell')}</button></span>
          <span class="selltotal" data-selltotal="${a.id}"></span></div>`;
      } else {
        const price = salePrice(card, a, s), { tax, why } = saleTax(p, card, a, undefined, s);
        const net = price - (a.mortgage || 0) - tax;
        const cost = a.down || a.price || 0, pct = cost ? Math.round((net - cost) / cost * 100) : 0;
        actions += `<div class="sellrow"><span style="color:${p.color}">●</span> ${esc(p.name)}: ${esc(assetName(a))} → ${fmt(price)}${a.mortgage ? `, ${t('loanMinus', { amt: { m: a.mortgage } })}` : ''}${tax ? `, ${t('taxMinus', { amt: { m: tax } })}` : ''} = <b class="${net < 0 ? 'neg' : 'pos'}">${fmt(net)}</b> <b class="${pct < 0 ? 'neg' : 'pos'}">(${pct >= 0 ? '+' : ''}${pct} %)</b>
          <button class="btn small" data-act="sell" data-pid="${p.id}" data-asset="${a.id}">${t('sell')}</button>
          ${tax ? `<span class="selltotal">⚖️ ${t(why)} · ${t('taxFreeFrom', { n: (a.boughtYear || 1) + (IMMO.includes(a.kind) ? SPEKU_YEARS_IMMO : SPEKU_YEARS_GOLD) })}</span>` : ''}</div>`;
      }
    }
    if (own.length && p.id !== c.id && !(s.card.passed || []).includes(p.id)) actions += `<button class="btn small ghost" data-act="passCard" data-pid="${p.id}">${t('keepIt', { name: esc(p.name) })}</button>`;
  }
  if (mine(c) && s.step === 'card') actions += `<button class="btn ghost" data-act="endTurn">${t('endTurn')}</button>`;
  // what happened with this card (bought / passed / paid / sold …)
  const results = s.log.slice(s.card.logAt ?? s.log.length).map(l => `<div>${esc(logLine(l))}</div>`).join('');
  const declined = (s.card.passed || []).includes(s.card.by) && !s.card.done;
  const othersCard = !mine(drawer);
  const doneTxt = card.type === 'choice' ? t(s.card.choice === 'quit' ? 'choseQuit' : 'choseStay', { name: esc(drawer.name) }) : t('boughtBy', { name: esc(drawer.name) });
  box.innerHTML = `<div class="ch"><span>${t('deck_' + s.card.deck)}</span><small>${t('drawnBy')} <b style="color:${drawer?.color}">${esc(drawer && pname(drawer))}</b></small></div>
    <h3>${esc(tx.title)}</h3><p class="ct">${esc(tx.text)}</p>${cardBody(card)}
    ${s.card.done ? `<p class="done">${doneTxt}</p>` : declined ? `<p class="declined">${t('declinedBy', { name: esc(drawer.name) })}</p>` : ''}
    ${results ? `<div class="cresult"><b>${t('cardResult')}</b>${results}</div>` : ''}
    <div class="cardacts">${actions}</div>
    ${othersCard ? `<p class="clickhint">${ackCard === s.card.id ? ((showResultUntil[s.card.id] || 0) - Date.now() > RESULT_MS + 300 ? t('closesAuto') : t('closingSoon')) : t('clickToContinue')}</p>` : ''}`;
  if (othersCard) {
    cardShownAt[s.card.id] ??= Date.now();
    const txt = [...box.querySelectorAll('h3, .ct, table, .done, .declined, .cresult')].map(e => e.textContent).join(' ');
    cardWords[s.card.id] = Math.max(cardWords[s.card.id] || 0, txt.split(/\s+/).filter(w => /[\p{L}\d]/u.test(w)).length);
  }
  for (const inp of box.querySelectorAll('[data-sellqty]')) {
    const p = s.players.find(x => x.id === inp.dataset.pid), a = p.assets.find(x => x.id === inp.dataset.sellqty);
    const upd = () => {
      const qty = Math.max(0, Math.min(a.shares, Math.floor(+inp.value || 0)));
      const gross = qty * card.price, profit = gross - qty * (a.cost / a.shares), { tax } = saleTax(p, card, a, qty, s);
      box.querySelector(`[data-selltotal="${a.id}"]`).innerHTML = t('sellTotal', { amt: { m: gross }, profit: { sm: profit }, tax: { m: tax }, net: { m: gross - tax } });
    };
    inp.oninput = upd; upd();
  }
  const q = $('#qty');
  if (q && card.type === 'stock') { const upd = () => { const cost = (+q.value || 0) * card.price; $('#qtycost').innerHTML = t('costLine', { cost: { m: cost }, cash: { m: c.cash } }) + loanCheck(c, cost); }; q.oninput = upd; upd(); }
}

function renderPlayers() {
  $('#players').innerHTML = state.players.map(p => {
    if (!p.debts || mine(p)) return '';
    const exp = escapeTarget(p, state), pas = passive(p);
    const pct = p.track === 'fast' ? Math.min(100, (p.fast.income - p.fast.start) / 500) : Math.min(100, pas / exp * 100);
    return `<button class="pchip ${p.id === viewPid ? 'on' : ''} ${p.out ? (p.won ? 'won' : 'out') : ''}" data-view="${p.id}" style="--c:${p.color}">
      <span class="pn"><span class="dot"></span>${esc(pname(p))}${state.phase === 'play' && cur().id === p.id ? ' 🎲' : ''}</span>
      <span class="pm">${fmt(p.cash)}</span>
      <span class="bar"><i style="width:${pct}%"></i></span>
      <span class="pl">${p.won ? '🏆 ' + t('placeN', { n: p.place }) : p.out ? t('out') : p.track === 'fast' ? '🚀 ' + t('fastTrack') : t('passiveOf', { pas: { m: pas }, exp: { m: exp } })}</span>
    </button>`;
  }).join('');
}

// "Sell now" for a property: full breakdown of what a quick sale costs, so you can judge if it is worth it
function quickSellBox(p, a) {
  const s = state, q = quickSale(p, a, s);
  const myTurn = cur().id === p.id && ['roll', 'card', 'end'].includes(s.step) && !moving();
  const r = (k, v, cls = '') => `<tr class="${cls}"><td>${k}</td><td>${v}</td></tr>`;
  const neg = v => v ? `−${fmt(v)}` : fmt(0);
  const taxRow = q.tax ? r(t('qsTax', { pct: Math.round(q.tax / q.gain * 100), gain: { m: q.gain } }), neg(q.tax), 'neg')
    : q.why ? `<tr><td colspan="2" class="muted">${t(q.why)}</td></tr>` : '';
  return `<details class="qsell" data-qs="${a.id}" ${qsOpen === a.id ? 'open' : ''}><summary>${t('qsBtn')}</summary>
    <p class="fine">${t('qsIntro')}</p><table>
    ${r(t('qsMarket', { n: q.held }), fmt(q.market))}
    ${r(t('qsPrice'), fmt(q.price))}
    ${r(t('qsMakler'), neg(q.makler), 'neg')}
    ${a.mortgage ? r(t('qsMort'), neg(a.mortgage), 'neg') : ''}
    ${q.vfe ? r(t('qsVfe'), neg(q.vfe), 'neg') : ''}
    ${taxRow}
    ${r(`<b>${t(q.net >= 0 ? 'qsNet' : 'qsNetNeg')}</b>`, `<b class="${q.net < 0 ? 'neg' : 'pos'}">${fmt(Math.abs(q.net))}</b>`, 'sum')}
    ${q.cfLost ? r(t('qsCf'), `<b class="${q.cfLost > 0 ? 'neg' : 'pos'}">${sfmt(-q.cfLost)}</b>`) : ''}
    </table>
    ${q.held < SPEKU_YEARS_IMMO && (q.tax || q.vfe) ? `<p class="fine">${t('qsWait', { n: q.freeAt })}</p>` : ''}
    ${myTurn ? `<button class="btn small" data-act="quickSell" data-pid="${p.id}" data-asset="${a.id}">${t('qsConfirm', { amt: { sm: q.net } })}</button>` : `<p class="fine">${t('qsOnlyTurn')}</p>`}
  </details>`;
}

function renderSheet() {
  const s = state, p = s.players.find(q => q.id === viewPid);
  const el = $('#sheet');
  const can = mine(p) && s.phase === 'play';
  const row = (k, v, cls = '') => `<div class="r ${cls}"><span>${k}</span><b>${v}</b></div>`;
  const lines = l => l.map(([k, v, pr]) => row(esc(t(k, pr)), fmt(v), v < 0 ? 'pos' : '')).join('');
  const myP = s.players.find(mine);
  const back = !mine(p) && myP ? `<button class="btn tiny ghost backme" data-view="${p.id}">${t('backToMe')}</button>` : '';
  const city = R(s).city && p.city && p.city !== 'de' ? ` · 📍 ${esc(cityName(CITIES.find(c => c.key === p.city)))}` : '';
  const head = `${back}<div class="sheethead" style="--c:${p.color}"><h2>${esc(pname(p))}${p.bot ? ` <small>(${t('lvlShort_' + p.bot)})</small>` : ''}</h2><span>${esc(profName(p.profKey))}${city}`;
  if (p.track === 'fast') {
    const owned = Object.entries(s.fastOwners).filter(([, id]) => id === p.id).map(([i]) => +i);
    el.innerHTML = `${head} · 🚀 ${t('fastTrack')}</span></div>
      <div class="big3"><div><small>${t('cash')}</small><b>${fmt(p.cash)}</b></div><div><small>${t('ftIncome')}</small><b class="pos">${fmt(p.fast.income)}</b></div><div><small>${t('goal')}</small><b>${fmt(p.fast.goal)}</b></div></div>
      <div class="prog"><i style="width:${Math.min(100, (p.fast.income - p.fast.start) / 500)}%"></i><span>${t('ftProgress', { amt: { m: p.fast.income - p.fast.start } })}</span></div>
      <h4>${t('ftDream')}</h4>${row(`${FAST[p.dream].icon} ${esc(fastName(p.dream))}`, fmt(dreamCost(s, p.dream)))}
      <h4>${t('businesses')}</h4>${owned.filter(i => FAST[i].type === 'biz').map(i => row(esc(fastName(i)), '+' + fmt(FAST[i].cf))).join('') || `<p class="muted">${t('noneYet')}</p>`}
      <p class="fine">${t('netWorth')}: <b>${fmt(netWorth(p, s))}</b></p>
      <p class="fine">${t('ftFine')}</p>`;
    return;
  }
  const target = escapeTarget(p, s), living = livingCosts(p), health = healthCost(p, s), pas = passive(p), cf = cashflow(p, s);
  const pi = payInfo(p, s);
  const status = [];
  if (p.alg > 0) status.push(`<span class="badge red">${t('stAlg', { n: p.alg })}</span>`);
  if (p.sperr > 0) status.push(`<span class="badge red">${t('stSperr', { n: p.sperr })}</span>`);
  if (p.skip) status.push(`<span class="badge">${t('skipsN', { n: p.skip })}</span>`);
  if (p.charity) status.push(`<span class="badge purple">${t('charityN', { n: p.charity })}</span>`);
  if (p.advisor) status.push(`<span class="badge green">${t('stAdvisor')}</span>`);
  // income
  const income = incomeLines(p, s).map(([k, v, pr]) => row(esc(t(k, pr)), fmt(v)));
  for (const a of p.assets.filter(x => assetCf(x) || x.vacant > 0)) income.push(row(`${esc(assetName(a))}${a.vacant > 0 ? ` <small class="neg">${t('vacantN', { n: a.vacant })}</small>` : ''}`, fmt(assetCf(a)), 'pass'));
  const deds = deductionLines(p, s);
  const saves = saveLines(p);
  // assets
  const assets = p.assets.map(a => {
    let d = '';
    if (a.kind === 'stock') d = t('pcs', { n: a.shares, amt: { m: a.cost / a.shares } });
    else if (a.kind === 'gold' || a.kind === 'crypto') d = t('coinsVal', { n: a.units, amt: { m: a.price } });
    else if (a.kind === 'etf') d = t('etfVal', { val: { m: a.value }, gain: { sm: a.value - a.basis }, m: { m: a.monthly } });
    else if (a.kind === 'bauspar') d = t(a.ready ? 'bausparReadyV' : 'bausparVal', { val: { m: a.balance }, need: { m: BAUSPAR_READY } });
    else d = a.mortgage ? t('priceLoan', { price: { m: a.price }, loan: { m: a.mortgage } }) : t('priceOnly', { price: { m: a.price } });
    if (R(s).specTax && (IMMO.includes(a.kind) || a.kind === 'gold' || a.kind === 'crypto')) {
      const free = (a.boughtYear || 1) + (IMMO.includes(a.kind) ? SPEKU_YEARS_IMMO : SPEKU_YEARS_GOLD);
      d += ` · ${p.year >= free ? t('taxFreeNow') : t('taxFreeFrom', { n: free })}`;
    }
    let ctl = '';
    if (a.kind === 'etf' && can) ctl = `<div class="etfctl"><input type="number" step="50" min="0" value="${a.monthly}" id="etfamt"> <button class="btn tiny" data-act="etfSet" data-pid="${p.id}">${t('etfSetBtn')}</button><button class="btn tiny ghost" data-act="etfSell" data-pid="${p.id}" title="${esc(t('etfSellHint', { tax: { m: etfSaleTax(p, a, s) } }))}">${t('etfSellBtn', { amt: { m: Math.round(a.value) - etfSaleTax(p, a, s) } })}</button></div>`;
    if (IMMO.includes(a.kind) && mine(p) && p.track === 'rat' && s.phase === 'play') ctl += quickSellBox(p, a);
    return `<div class="r"><span>${esc(assetName(a))}<small>${d}</small>${ctl}</span><b class="${assetCf(a) < 0 ? 'neg' : ''}">${assetCf(a) ? sfmt(assetCf(a)) : '–'}</b></div>`;
  }).join('') || `<p class="muted">${t('noAssets')}</p>`;
  const home = p.homeValue ? `<div class="r"><span>🏡 ${t('ownHome')}<small>${t('ownHomeHint')}</small></span><b>${fmt(p.homeValue)}</b></div>` : '';
  const debts = Object.entries(p.debts).filter(([, d]) => d.bal).map(([k, d]) =>
    `<div class="r"><span>${t('debt_' + k)}<small>${t('perMonth', { amt: { m: d.pay } })}</small></span><b>${fmt(d.bal)}</b>${can ? `<button class="btn tiny" data-act="repay" data-which="${k}" data-pid="${p.id}" title="${t('payOffTitle')}">${t('payOff')}</button>` : ''}</div>`).join('');
  // tax advisor box
  let advisor = '';
  const pot = R(s).afa && pi.gross ? afaPotential(p, s) : 0;
  if (pot > 0 || p.advisor) {
    advisor = p.advisor
      ? `<div class="advisor on">🧾 ${t('advisorOn', { amt: { m: pi.afaSave }, rate: Math.round(pi.mrate * 100) })}${can ? ` <button class="btn tiny ghost" data-act="advisor" data-pid="${p.id}">${t('advisorFire')}</button>` : ''}</div>`
      : `<div class="advisor">🧾 ${t('advisorOff', { amt: { m: pot }, fee: { m: ADVISOR_FEE }, m: { m: ADVISOR_MONTH }, rate: Math.round(pi.mrate * 100) })}${can ? ` <button class="btn tiny" data-act="advisor" data-on="1" data-pid="${p.id}">${t('advisorHire')}</button>` : ''}</div>`;
  }
  el.innerHTML = `${head} · 📅 ${t('yearN', { n: p.year })}</span>${status.length ? `<div class="badges">${status.join('')}</div>` : ''}</div>
    <div class="big3"><div><small>${t('cash')}</small><b>${fmt(p.cash)}</b></div><div><small>${t('paydayCf')}</small><b class="${cf < 0 ? 'neg' : 'pos'}">${sfmt(cf)}</b></div><div><small>${t('netWorth')}</small><b>${fmt(netWorth(p, s))}</b></div></div>
    <div class="escape">
      <div class="prog"><i style="width:${Math.min(100, pas / target * 100)}%"></i><span>${t('progress', { pas: { m: pas }, exp: { m: target }, rest: pas > target ? t('escape') : t('stillNeed', { amt: { m: target - pas } }) })}</span></div>
      <small>${t(health ? 'escapeBreak' : 'escapeBreakNoHealth', { living: { m: living }, health: { m: health }, total: { m: target } })}</small>
    </div>
    <details open><summary>${t('income')} <b>${fmt(totalIncome(p, s))}</b></summary>${income.join('')}</details>
    ${deds.length ? `<details open><summary>${t('deductions')} <b>${fmt(deds.reduce((x, [, v]) => x + v, 0))}</b></summary>${lines(deds)}</details>` : ''}
    <details open><summary>${t('livingCosts')} <b>${fmt(living)}</b></summary>${lines(livingLines(p))}</details>
    ${saves.length ? `<details open><summary>${t('savingsPlans')} <b>${fmt(saves.reduce((x, [, v]) => x + v, 0))}</b></summary>${lines(saves)}</details>` : ''}
    ${advisor}
    <details open><summary>${t('assets')}</summary>${assets}${home}</details>
    <details open><summary>${t('liabilities')}</summary>${debts}
      <div class="r"><span>${t('bankLoan')}<small>${t('interestMonth', { amt: { m: loanPay(p) } })}</small></span><b>${fmt(p.loan)}</b></div>
      ${can ? `<div class="loanrow"><input type="number" id="loanamt" step="1000" min="1000" value="1000"><span class="fine" id="loancalc"></span><button class="btn small" data-act="loan" data-pid="${p.id}">${t('takeLoan')}</button>${p.loan ? `<button class="btn small ghost" data-act="repay" data-which="loan" data-pid="${p.id}">${t('repay')}</button>` : ''}</div>` : ''}
    </details>
    <p class="fine">${t('savingsNote', { amt: { m: p.savings } })}<br>${t('allowanceLeft', { amt: { m: p.allowance }, n: p.paydays })}</p>`;
  const la = $('#loanamt');
  if (la) { const upd = () => { $('#loancalc').textContent = t('loanCalc', { pay: { m: loanPay({ loan: Math.max(0, Math.round((+la.value || 0) / 1000) * 1000) }) } }); }; la.oninput = upd; upd(); }
}

// does a log entry concern this player?
const logAbout = ([, p], name) => !!p && (p.name === name || p.owner === name || (typeof p.names === 'string' && p.names.split(', ').includes(name)));
function renderLog() {
  const el = $('#log');
  $('#log-toggle').textContent = t('logBtn');
  $('#logfilter-label').textContent = t('logShow');
  if (logFilter !== 'all' && !state.players.some(p => p.id === logFilter)) logFilter = 'all';
  const opts = [['all', t('logAll')], ...[...state.players].sort((a, b) => (mine(b) ? 1 : 0) - (mine(a) ? 1 : 0)).map(p => [p.id, (mine(p) ? t('logMe') + ' – ' : '') + pname(p)])];
  const sel = $('#logfilter');
  const html = opts.map(([v, l]) => `<option value="${v}" ${v === logFilter ? 'selected' : ''}>${esc(l)}</option>`).join('');
  if (sel.dataset.html !== html) { sel.innerHTML = html; sel.dataset.html = html; }
  const who = state.players.find(p => p.id === logFilter);
  const list = who ? state.log.filter(l => logAbout(l, who.name)) : state.log;
  el.innerHTML = list.slice(-80).map(l => `<div>${esc(logLine(l))}</div>`).join('') || `<p class="muted">–</p>`;
  if (state.log.length !== lastLogLen) { el.scrollTop = el.scrollHeight; lastLogLen = state.log.length; }
}

// one of my players went bankrupt while other people play on → leave or keep watching
function renderOut() {
  if (state.phase !== 'play') return;
  const p = state.players.find(q => mine(q) && q.out && !q.won && !outShown.has(q.id));
  if (!p) return;
  outShown.add(p.id);
  const w = $('#winner');
  w.hidden = false;
  w.innerHTML = `<div class="winbox"><div class="trophy">💸</div><h2>${t('outTitle')}</h2><p>${esc(t('outText', { name: p.name }))}</p>
    ${mode === 'host' ? `<p class="hint">${t('outHostWarn')}</p>` : ''}
    <button class="btn big" id="outleave">${t('outLeave')}</button><button class="btn ghost" id="closewin">${t('outWatch')}</button></div>`;
}

function renderWinner() {
  const w = $('#winner');
  if (state.phase !== 'over') { w.hidden = true; return; }
  if (w.dataset.closed === String(state.seq)) return;
  w.hidden = false;
  w.innerHTML = reportHTML(state, mine, pname);
  w.querySelector('.report').insertAdjacentHTML('beforeend', `<div class="winbtns">${mode !== 'client' && canPlayOn(state) ? `<button class="btn big green" id="playon">${t('playOn')}</button>` : ''}${mode !== 'client' ? `<button class="btn big" id="again">${t('newGame')}</button>` : ''}<button class="btn ghost" id="closewin">${t('viewBoard')}</button></div>`);
}

// ---------- events ----------
document.addEventListener('toggle', e => { const d = e.target; if (d.matches && d.matches('details.qsell')) { if (d.open) qsOpen = d.dataset.qs; else if (qsOpen === d.dataset.qs) qsOpen = null; } }, true);
document.addEventListener('click', e => {
  // click anywhere on the board (not on a panel) closes another player's card popup and lets the game go on
  if (state && state.card && e.target.closest('#board') && !e.target.closest('button')) {
    const drawer = state.players.find(p => p.id === state.card.by);
    const id = state.card.id;
    if (!mine(drawer) && closedCard !== id && !(ackCard === id && (showResultUntil[id] || 0) <= Date.now() + RESULT_MS)) {
      for (const p of humansDeciding().filter(mine)) dispatch({ type: 'passCard', pid: p.id });
      // keep the popup (with the other player's choice) on screen for 2 seconds, then close and go on
      closeCardAt(id, Math.min(showResultUntil[id] || Infinity, Date.now() + RESULT_MS));
      if (botTimer) { clearTimeout(botTimer); botTimer = null; }
      if (mode !== 'client' && botDecisionPending()) botStep();   // the computer decides right now
      else render();
      scheduleBots();
      return;
    }
  }
  if (e.target.id === 'log-toggle') { logOpen = !logOpen; $('#logpanel').hidden = !logOpen; if (logOpen) { const l = $('#log'); l.scrollTop = l.scrollHeight; } return; }
  if (logOpen && !e.target.closest('.logwrap')) { logOpen = false; $('#logpanel').hidden = true; }
  if (e.target.closest('.logpanel')) return;
  const b = e.target.closest('button, [data-view]');
  if (b && b.dataset.alllvl) {
    const l = b.dataset.alllvl;
    $('#lobby-botlevel').value = l;
    for (const p of state.players.filter(q => q.bot && q.bot !== l)) dispatch({ type: 'setBot', pid: p.id, bot: l });
    return;
  }
  if (!b) return;
  const d = b.dataset;
  if (b.id === 'coach-close') return setCoach(false);
  if (d.lang) { setLang(d.lang); applyStatic(); render(); return; }
  if (d.view) { viewPid = viewPid === d.view ? (state.players.find(mine) || state.players[0]).id : d.view; render(); return; }
  if (d.remove) return dispatch({ type: 'removePlayer', pid: d.remove });
  if (d.color) return dispatch({ type: 'setColor', pid: d.pid, color: d.color });
  if (d.mode) return dispatch({ type: 'setMode', mode: d.mode });
  if (!d.act) return;
  const c = cur();
  switch (d.act) {
    case 'orderRoll': return dispatch({ type: 'orderRoll', pid: d.pid });
    case 'roll': return dispatch({ type: 'roll', pid: c.id, dice: +d.dice || undefined });
    case 'deal': return dispatch({ type: 'deal', pid: c.id, deck: d.deck });
    case 'charity': return dispatch({ type: 'charity', pid: c.id, accept: !!d.accept });
    case 'fastBuy': return dispatch({ type: 'fastBuy', pid: c.id });
    case 'endTurn': return dispatch({ type: 'endTurn', pid: c.id });
    case 'buy': return dispatch({ type: 'buy', pid: c.id, qty: +($('#qty')?.value || 0), useBauspar: !!d.bauspar });
    case 'choose': return dispatch({ type: 'choose', pid: c.id, opt: d.opt });
    case 'advisor': return dispatch({ type: 'advisor', pid: d.pid, on: !!d.on });
    case 'etfSet': return dispatch({ type: 'etfSet', pid: d.pid, amount: +$('#etfamt').value });
    case 'etfSell': return dispatch({ type: 'etfSell', pid: d.pid });
    case 'quickSell': qsOpen = null; return dispatch({ type: 'quickSell', pid: d.pid, assetId: d.asset });
    case 'passCard': return dispatch({ type: 'passCard', pid: d.pid });
    case 'sell': {
      const q = document.querySelector(`[data-sellqty="${d.asset}"]`);
      return dispatch({ type: 'sell', pid: d.pid, assetId: d.asset, qty: q ? +q.value : undefined });
    }
    case 'loan': return dispatch({ type: 'loan', pid: d.pid, amount: +$('#loanamt').value });
    case 'repay': return dispatch({ type: 'repay', pid: d.pid, which: d.which, amount: d.which === 'loan' ? +$('#loanamt').value : 0 });
  }
});
document.addEventListener('change', e => {
  const d = e.target.dataset;
  if (d.dream) dispatch({ type: 'setDream', pid: d.dream, dream: +e.target.value });
  if (d.botlvl) dispatch({ type: 'setBot', pid: d.botlvl, bot: e.target.value });
  if (e.target.id === 'logfilter') { logFilter = e.target.value; lastLogLen = -1; renderLog(); return; }
  if (d.city) dispatch({ type: 'setCity', pid: d.city, city: e.target.value });
  if (d.church) dispatch({ type: 'setChurch', pid: d.church, on: e.target.checked });
});

function setCoach(on) {
  coachOn = on; store.set('euroflow-coach', on);
  $('#coach-toggle').textContent = on ? t('coachOn') : t('coachOff');
  $('#coach-toggle').classList.toggle('on', on);
  $('#lobby-coach').checked = on;
  render();
}

function setup() {
  setLang(getLang());
  applyStatic();
  $('#name').value = store.get('euroflow-name') || '';
  $('#name').addEventListener('change', () => store.set('euroflow-name', $('#name').value.trim()));
  const save = store.get(SAVE);
  $('#btn-resume').hidden = !(save && save.state && save.state.phase !== 'over');
  $('#btn-resume').onclick = () => (save.mode === 'host' && save.code ? startHost(save.code, save.state) : startLocal(save.state));
  $('#btn-host').onclick = () => startHost(newCode());
  $('#btn-local').onclick = () => startLocal();
  $('#btn-join').onclick = () => startJoin($('#joincode').value);
  $('#joincode').addEventListener('keydown', e => { if (e.key === 'Enter') startJoin($('#joincode').value); });
  $('#lobby-add').onclick = () => { dispatch({ type: 'addPlayer', name: $('#lobby-name').value.trim() || undefined }); $('#lobby-name').value = ''; };
  $('#lobby-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('#lobby-add').click(); });
  $('#lobby-addbot').onclick = () => addBot($('#lobby-botlevel').value);
  $('#lobby-start').onclick = () => dispatch({ type: 'start' });
  $('#lobby-coach').onchange = e => setCoach(e.target.checked);
  $('#coach-toggle').onclick = () => setCoach(!coachOn);
  $('#copy-link').onclick = async () => {
    try { await navigator.clipboard.writeText($('#invite-link').value); toast(t('linkCopied'), 'ok'); }
    catch { $('#invite-link').select(); }
  };
  for (const b of document.querySelectorAll('[data-rules]')) b.onclick = () => { $('#rules').hidden = false; };
  $('#rules-close').onclick = () => { $('#rules').hidden = true; };
  $('#rules').onclick = e => { if (e.target.id === 'rules') $('#rules').hidden = true; };
  $('#winner').addEventListener('click', e => {
    if (e.target.id === 'closewin') { $('#winner').hidden = true; if (state.phase === 'over') $('#winner').dataset.closed = String(state.seq); }
    if (e.target.id === 'outleave') { if (mode !== 'client') store.del(SAVE); location.href = location.pathname; }
    if (e.target.id === 'playon') { $('#winner').hidden = true; return dispatch({ type: 'playOn' }); }
    if (e.target.id === 'again') { store.del(SAVE); location.href = location.pathname; }
  });
  $('#btn-leave').onclick = () => { if (confirm(t('leaveConfirm'))) location.href = location.pathname; };

  const params = new URLSearchParams(location.search);
  if (params.get('room')) {
    $('#joincode').value = params.get('room');
    $('#join-hint').hidden = false;
    $('#name').focus();
  }
  showScreen('start');
}
setup();
