import { FAST, RAT, DREAM_INDEXES, COLORS, KINDERGELD, STOCKS } from './data.js';
import {
  apply, newGame, passive, totalExpenses, totalIncome, cashflow, expenseLines, kindergeld, cardOf,
  sellable, salePrice, saleTax, nebenkosten, darlehen, dreamCost, loanPay, buyCost,
} from './engine.js';
import { boardSVG, drawDynamic } from './board.js';
import { hostRoom, joinRoom, newCode } from './net.js';
import { botAction, botSells } from './bot.js';
import { coachHTML } from './assistant.js';
import { t, fmt, sfmt, setLang, getLang, cardT, fastName, fastText, profName, assetName, stockName, stockWhat, logLine, RULES } from './i18n.js';

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SAVE = 'euroflow-save-v3';
const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const BOT_NAMES = ['Lena', 'Jonas', 'Mia', 'Felix', 'Emma', 'Paul', 'Hannah', 'Leon', 'Sophie', 'Ben'];

let state = null;
let mode = null;        // 'local' | 'host' | 'client'
let me = 'host';        // owner id of this device
let net = null;
let viewPid = null;
let lastRollSeq = null;
let lastLogLen = 0;

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
let botTimer = null, botCardSeen = null, cardSince = 0;
function scheduleBots() {
  if (mode === 'client' || !state || botTimer) return;
  if (state.phase !== 'order' && state.phase !== 'play') return;
  const c = cur();
  const delay = state.phase === 'order' ? 650 : state.step === 'card' ? 2200 : 1100;
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
  const a = botAction(state, c);
  if (!a) return;
  // give humans time to sell into a market card before the bot ends its turn
  if (a.type === 'endTurn' && state.step === 'card' && humansDeciding().length && Date.now() - cardSince < 45000) {
    botTimer = setTimeout(() => { botTimer = null; botStep(); }, 1000);
    return;
  }
  botDo(a);
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
  if (!viewPid || !state.players.some(p => p.id === viewPid)) viewPid = (state.players.find(mine) || state.players[0]).id;
  const c = cur();
  if (state.phase === 'play' && mine(c) && mode === 'local') viewPid = c.id;
  drawDynamic($('#board-svg'), state);
  renderCoach();
  renderTurn();
  renderCard();
  renderPlayers();
  renderSheet();
  renderLog();
  renderWinner();
  $('#netstatus').textContent = mode === 'local' ? t('netLocal') : mode === 'host' ? t('netHost', { code: net.code, n: net.count() }) : t('netClient', { code: net.code });
  scheduleBots();
}

function renderLobby() {
  const host = mode !== 'client';
  $('#lobby-invite').hidden = !net;
  if (net) { $('#invite-link').value = `${location.origin}${location.pathname}?room=${net.code}`; $('#room-code').textContent = net.code; }
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
  el.innerHTML = `<div class="coachhead"><span>${t('coachTitle')}</span><button class="x" id="coach-close" title="${t('coachOff')}">✕</button></div>` + coachHTML(state, mine);
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
  if (c.bot) act = `<p class="muted thinking">${t('botThinking', { name: esc(c.name) })}</p>`;
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
      act = `<p class="hint">${t('charityQ', { amt: { m: Math.round(totalIncome(c) * 0.1) } })}</p>
        <div class="row"><button class="btn purple" data-act="charity" data-accept="1">${t('donate')}</button><button class="btn ghost" data-act="charity">${t('noThanks')}</button></div>`;
      break;
    case 'fast': {
      const sp = FAST[c.pos];
      if (sp.type === 'biz') act = `<p class="hint">${t('bizOffer', { fast: c.pos, cost: { m: sp.cost }, cf: { m: sp.cf } })}</p><div class="row"><button class="btn green" data-act="fastBuy">${t('buy')}</button><button class="btn ghost" data-act="endTurn">${t('pass')}</button></div>`;
      else if (sp.type === 'dream') act = `<p class="hint">${t('dreamOffer', { icon: sp.icon, fast: c.pos, cost: { m: dreamCost(s, c.pos) } })}</p><div class="row"><button class="btn gold" data-act="fastBuy">${t('buyDream')}</button><button class="btn ghost" data-act="endTurn">${t('notYet')}</button></div>`;
      else if (sp.type === 'gamble') act = `<p class="hint">🎲 ${esc(fastText(c.pos))}</p><div class="row"><button class="btn green" data-act="fastBuy">${t('invest')}</button><button class="btn ghost" data-act="endTurn">${t('pass')}</button></div>`;
      else if (sp.type === 'charity') act = `<p class="hint">💜 ${esc(fastText(c.pos))}</p><div class="row"><button class="btn purple" data-act="fastBuy">${t('foundationBtn')}</button><button class="btn ghost" data-act="endTurn">${t('noThanks')}</button></div>`;
      break;
    }
    default: act = `<button class="btn big" data-act="endTurn">${t('endTurn')}</button>`;
  }
  const where = c.track === 'rat' ? (c.pos < 0 ? t('start') : t('sp_' + RAT[c.pos])) : fastName(c.pos);
  el.innerHTML = `<div class="turnhead"><span class="dot" style="background:${c.color}"></span> ${t('isTurn', { name: esc(pname(c)) })} <small>· ${c.track === 'rat' ? t('ratRace') : t('fastTrack')} · ${esc(where)}</small></div>${dice}<div class="actions">${act}</div>`;
}

function cardBody(card) {
  const row = (k, v, cls = '') => `<tr class="${cls}"><td>${k}</td><td>${v}</td></tr>`;
  if (card.type === 'stock') {
    const st = STOCKS[card.sym];
    const [lo, hi] = st.range.match(/\d+/g).map(Number);
    return `<table>${row(t('cSymbol'), card.sym)}${row(t('cCompany'), `${esc(stockName(card.sym))} (${esc(stockWhat(card.sym))})`)}${row(t('cToday'), `<b>${fmt(card.price)}</b>`)}${row(t('cRange'), `${fmt(lo)} – ${fmt(hi)}`)}${row(t('cDividend'), t('none'))}</table>
      <p class="fine">${t('cStockFine')}</p>`;
  }
  if (card.type === 'asset') {
    if (card.kind === 'gold') return `<table>${row(t('cAmount'), t('coins', { n: card.units }))}${row(t('perCoin'), fmt(card.unitPrice))}${row(t('total'), `<b>${fmt(card.units * card.unitPrice)}</b>`)}</table>`;
    const nk = nebenkosten(card), dl = darlehen(card), biz = card.kind === 'biz';
    return `<table>${row(t('cPrice'), fmt(card.price))}${nk ? row(t('cNk'), fmt(nk), 'sub') : ''}${row(biz ? t('cCapital') : t('cEquity'), `<b>${fmt(card.down)}</b>`)}${dl ? row(biz ? t('cLiability') : t('cMortgage'), fmt(dl)) : ''}${row(t('cCf'), `<b class="${card.cf < 0 ? 'neg' : 'pos'}">${sfmt(card.cf)}</b>`)}</table>
      ${nk ? `<p class="fine">${t('cNkFine')}</p>` : ''}`;
  }
  if (card.type === 'sell') {
    const how = card.perUnit ? t(card.kind === 'gold' ? 'perUnitCoin' : 'perUnitFlat', { amt: { m: card.perUnit } }) : card.mult ? t('multPrice', { n: card.mult }) : fmt(card.price);
    return `<table>${row(t('cBuyerPays'), `<b>${how}</b>`)}</table><p class="fine">${t('cSellFine')}</p>`;
  }
  return '';
}

function renderCard() {
  const box = $('#card'), s = state, c = cur();
  const card = cardOf(s.card);
  if (!card || s.phase !== 'play') { box.hidden = true; return; }
  box.hidden = false;
  box.className = 'gamecard deck-' + s.card.deck;
  const tx = cardT(s.card.deck, s.card.i);
  const drawer = s.players.find(p => p.id === s.card.by);
  let actions = '';
  if (mine(c) && c.id === s.card.by && !s.card.done && (card.type === 'stock' || card.type === 'asset')) {
    if (card.type === 'stock') actions += `<div class="buyrow"><input type="number" id="qty" min="1" step="10" value="100"> ${t('shares')} <button class="btn green" data-act="buy">${t('buy')}</button></div><div class="fine" id="qtycost"></div>`;
    else {
      const need = buyCost(card);
      const loan = Math.max(0, Math.ceil((need - c.cash) / 1000) * 1000);
      actions += `<button class="btn green" data-act="buy">${t('buyFor', { amt: { m: need } })}${loan ? ` <small>${t('inclLoan', { amt: { m: loan } })}</small>` : ''}</button>`;
    }
  }
  // selling options for all my players
  for (const p of s.players.filter(mine)) {
    const own = p.assets.filter(x => sellable(card, x));
    for (const a of own) {
      if (card.type === 'stock') {
        actions += `<div class="sellrow"><span style="color:${p.color}">●</span> ${esc(p.name)}: ${a.shares} × ${a.sym} (${t('avg')} ${fmt(a.cost / a.shares)})
          <input type="number" min="1" max="${a.shares}" value="${a.shares}" data-sellqty="${a.id}"> <button class="btn small" data-act="sell" data-pid="${p.id}" data-asset="${a.id}">${t('sell')}</button></div>`;
      } else {
        const price = salePrice(card, a), { tax } = saleTax(p, card, a);
        const net = price - (a.mortgage || 0) - tax;
        actions += `<div class="sellrow"><span style="color:${p.color}">●</span> ${esc(p.name)}: ${esc(assetName(a))} → ${fmt(price)}${a.mortgage ? `, ${t('loanMinus', { amt: { m: a.mortgage } })}` : ''}${tax ? `, ${t('taxMinus', { amt: { m: tax } })}` : ''} = <b class="${net < 0 ? 'neg' : 'pos'}">${fmt(net)}</b>
          <button class="btn small" data-act="sell" data-pid="${p.id}" data-asset="${a.id}">${t('sell')}</button></div>`;
      }
    }
    if (own.length && p.id !== c.id && !(s.card.passed || []).includes(p.id)) actions += `<button class="btn small ghost" data-act="passCard" data-pid="${p.id}">${t('keepIt', { name: esc(p.name) })}</button>`;
  }
  if (mine(c) && s.step === 'card') actions += `<button class="btn ghost" data-act="endTurn">${t('endTurn')}</button>`;
  box.innerHTML = `<div class="ch"><span>${t('deck_' + s.card.deck)}</span><small>${t('drawnBy')} <b style="color:${drawer?.color}">${esc(drawer && pname(drawer))}</b></small></div>
    <h3>${esc(tx.title)}</h3><p class="ct">${esc(tx.text)}</p>${cardBody(card)}
    ${s.card.done ? `<p class="done">${t('bought')}</p>` : ''}
    <div class="cardacts">${actions}</div>`;
  const q = $('#qty');
  if (q) { const upd = () => { $('#qtycost').textContent = t('costLine', { cost: { m: (+q.value || 0) * card.price }, cash: { m: c.cash } }); }; q.oninput = upd; upd(); }
}

function renderPlayers() {
  $('#players').innerHTML = state.players.map(p => {
    if (!p.debts) return '';
    const exp = totalExpenses(p), pas = passive(p);
    const pct = p.track === 'fast' ? Math.min(100, (p.fast.income - p.fast.start) / 500) : Math.min(100, pas / exp * 100);
    return `<button class="pchip ${p.id === viewPid ? 'on' : ''} ${p.out ? 'out' : ''}" data-view="${p.id}" style="--c:${p.color}">
      <span class="pn"><span class="dot"></span>${esc(pname(p))}${state.phase === 'play' && cur().id === p.id ? ' 🎲' : ''}</span>
      <span class="pm">${fmt(p.cash)}</span>
      <span class="bar"><i style="width:${pct}%"></i></span>
      <span class="pl">${p.out ? t('out') : p.track === 'fast' ? '🚀 ' + t('fastTrack') : t('passiveOf', { pas: { m: pas }, exp: { m: exp } })}</span>
    </button>`;
  }).join('');
}

function renderSheet() {
  const p = state.players.find(q => q.id === viewPid);
  const el = $('#sheet');
  const can = mine(p) && state.phase === 'play';
  const row = (k, v, cls = '') => `<div class="r ${cls}"><span>${k}</span><b>${v}</b></div>`;
  const head = `<div class="sheethead" style="--c:${p.color}"><h2>${esc(pname(p))}${p.bot ? ` <small>(${t('lvlShort_' + p.bot)})</small>` : ''}</h2><span>${esc(profName(p.profKey))}`;
  if (p.track === 'fast') {
    const owned = Object.entries(state.fastOwners).filter(([, id]) => id === p.id).map(([i]) => +i);
    el.innerHTML = `${head} · 🚀 ${t('fastTrack')}</span></div>
      <div class="big3"><div><small>${t('cash')}</small><b>${fmt(p.cash)}</b></div><div><small>${t('ftIncome')}</small><b class="pos">${fmt(p.fast.income)}</b></div><div><small>${t('goal')}</small><b>${fmt(p.fast.goal)}</b></div></div>
      <div class="prog"><i style="width:${Math.min(100, (p.fast.income - p.fast.start) / 500)}%"></i><span>${t('ftProgress', { amt: { m: p.fast.income - p.fast.start } })}</span></div>
      <h4>${t('ftDream')}</h4>${row(`${FAST[p.dream].icon} ${esc(fastName(p.dream))}`, fmt(dreamCost(state, p.dream)))}
      <h4>${t('businesses')}</h4>${owned.filter(i => FAST[i].type === 'biz').map(i => row(esc(fastName(i)), '+' + fmt(FAST[i].cf))).join('') || `<p class="muted">${t('noneYet')}</p>`}
      <p class="fine">${t('ftFine')}</p>`;
    return;
  }
  const exp = totalExpenses(p), pas = passive(p), cf = cashflow(p);
  const income = [row(t('salary'), fmt(p.salary))];
  if (p.children) income.push(row(t('kindergeld', { n: p.children, amt: { m: KINDERGELD } }), fmt(kindergeld(p))));
  for (const a of p.assets.filter(x => x.cf)) income.push(row(esc(assetName(a)), fmt(a.cf), 'pass'));
  const assets = p.assets.map(a => {
    let d = '';
    if (a.kind === 'stock') d = t('pcs', { n: a.shares, amt: { m: a.cost / a.shares } });
    else if (a.kind === 'gold') d = t('coinsVal', { n: a.units, amt: { m: a.price } });
    else d = a.mortgage ? t('priceLoan', { price: { m: a.price }, loan: { m: a.mortgage } }) : t('priceOnly', { price: { m: a.price } });
    return `<div class="r"><span>${esc(assetName(a))}<small>${d}</small></span><b class="${a.cf < 0 ? 'neg' : ''}">${a.cf ? sfmt(a.cf) : '–'}</b></div>`;
  }).join('') || `<p class="muted">${t('noAssets')}</p>`;
  const debts = Object.entries(p.debts).filter(([, d]) => d.bal).map(([k, d]) =>
    `<div class="r"><span>${t('debt_' + k)}<small>${t('perMonth', { amt: { m: d.pay } })}</small></span><b>${fmt(d.bal)}</b>${can ? `<button class="btn tiny" data-act="repay" data-which="${k}" data-pid="${p.id}" title="${t('payOffTitle')}">${t('payOff')}</button>` : ''}</div>`).join('');
  el.innerHTML = `${head}${p.skip ? ` · ${t('skipsN', { n: p.skip })}` : ''}${p.charity ? ` · ${t('charityN', { n: p.charity })}` : ''}</span></div>
    <div class="big3"><div><small>${t('cash')}</small><b>${fmt(p.cash)}</b></div><div><small>${t('paydayCf')}</small><b class="${cf < 0 ? 'neg' : 'pos'}">${sfmt(cf)}</b></div><div><small>${t('kids')}</small><b>${p.children}</b></div></div>
    <div class="prog"><i style="width:${Math.min(100, pas / exp * 100)}%"></i><span>${t('progress', { pas: { m: pas }, exp: { m: exp }, rest: pas > exp ? t('escape') : t('stillNeed', { amt: { m: exp - pas } }) })}</span></div>
    <details open><summary>${t('income')} <b>${fmt(totalIncome(p))}</b></summary>${income.join('')}</details>
    <details open><summary>${t('expenses')} <b>${fmt(exp)}</b></summary>${expenseLines(p).map(([k, v, pr]) => row(esc(t(k, pr)), fmt(v))).join('')}</details>
    <details open><summary>${t('assets')}</summary>${assets}</details>
    <details open><summary>${t('liabilities')}</summary>${debts}
      <div class="r"><span>${t('bankLoan')}<small>${t('interestMonth', { amt: { m: loanPay(p) } })}</small></span><b>${fmt(p.loan)}</b></div>
      ${can ? `<div class="loanrow"><input type="number" id="loanamt" step="1000" min="1000" value="1000"><button class="btn small" data-act="loan" data-pid="${p.id}">${t('takeLoan')}</button>${p.loan ? `<button class="btn small ghost" data-act="repay" data-which="loan" data-pid="${p.id}">${t('repay')}</button>` : ''}</div>` : ''}
    </details>
    <p class="fine">${t('allowanceLeft', { amt: { m: p.allowance }, n: p.paydays })}</p>`;
}

function renderLog() {
  const el = $('#log');
  el.innerHTML = state.log.slice(-60).map(l => `<div>${esc(logLine(l))}</div>`).join('');
  if (state.log.length !== lastLogLen) { el.scrollTop = el.scrollHeight; lastLogLen = state.log.length; }
}

function renderWinner() {
  const w = $('#winner');
  if (state.phase !== 'over') { w.hidden = true; return; }
  if (w.dataset.closed === String(state.seq)) return;
  const p = state.players.find(q => q.id === state.winner?.pid);
  w.hidden = false;
  w.innerHTML = `<div class="winbox"><div class="trophy">🏆</div><h2>${p ? esc(t('wins', { name: pname(p) })) : t('gameOver')}</h2><p>${state.winner ? esc(t(state.winner.reason.k, state.winner.reason.p)) : ''}</p>
    ${mode !== 'client' ? `<button class="btn big" id="again">${t('newGame')}</button>` : ''}<button class="btn ghost" id="closewin">${t('viewBoard')}</button></div>`;
}

// ---------- events ----------
document.addEventListener('click', e => {
  const b = e.target.closest('button, [data-view]');
  if (!b) return;
  const d = b.dataset;
  if (b.id === 'coach-close') return setCoach(false);
  if (d.lang) { setLang(d.lang); applyStatic(); render(); return; }
  if (d.view) { viewPid = d.view; render(); return; }
  if (d.remove) return dispatch({ type: 'removePlayer', pid: d.remove });
  if (d.color) return dispatch({ type: 'setColor', pid: d.pid, color: d.color });
  if (!d.act) return;
  const c = cur();
  switch (d.act) {
    case 'orderRoll': return dispatch({ type: 'orderRoll', pid: d.pid });
    case 'roll': return dispatch({ type: 'roll', pid: c.id, dice: +d.dice || undefined });
    case 'deal': return dispatch({ type: 'deal', pid: c.id, deck: d.deck });
    case 'charity': return dispatch({ type: 'charity', pid: c.id, accept: !!d.accept });
    case 'fastBuy': return dispatch({ type: 'fastBuy', pid: c.id });
    case 'endTurn': return dispatch({ type: 'endTurn', pid: c.id });
    case 'buy': return dispatch({ type: 'buy', pid: c.id, qty: +($('#qty')?.value || 0) });
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
    if (e.target.id === 'closewin') { $('#winner').hidden = true; $('#winner').dataset.closed = String(state.seq); }
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
