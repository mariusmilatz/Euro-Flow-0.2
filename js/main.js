import { FAST, RAT, RAT_INFO, DREAM_INDEXES, COLORS, DEBT_LABELS, KINDERGELD, STOCKS } from './data.js';
import {
  apply, newGame, fmt, passive, totalExpenses, totalIncome, cashflow, expenseLines, kindergeld, cardOf,
  sellable, salePrice, saleTax, nebenkosten, darlehen, dreamCost, loanPay,
} from './engine.js';
import { boardSVG, drawDynamic } from './board.js';
import { hostRoom, joinRoom, newCode } from './net.js';

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SAVE = 'euroflow-save-v2';
const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

let state = null;
let mode = null;        // 'local' | 'host' | 'client'
let me = 'host';        // Besitzer-ID dieses Geräts
let net = null;
let viewPid = null;
let lastRollSeq = null;
let lastLogLen = 0;

// ---------- Hilfen ----------
function toast(msg, kind = 'err') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 4200);
}
const mine = p => p && (mode === 'local' || p.owner === me);
const cur = () => state?.players[state.turn];
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

// ---------- Aktionen ausführen ----------
function dispatch(action) {
  if (mode === 'client') return net.send({ t: 'act', action });
  try {
    state = apply(state, action, mode === 'local' ? null : 'host');
    changed();
  } catch (e) { toast(e.message); }
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
      const p = state.players.find(q => q.id === pid);
      if (p) { p.owner = peerId; claimed++; }
    }
    if (!claimed && state.phase === 'lobby') {
      try { state = apply(state, { type: 'addPlayer', name: msg.name }, peerId); } catch (e) { net.send(peerId, { t: 'err', msg: e.message }); }
    }
    changed();
    net.send(peerId, { t: 'state', state });
  } else if (msg.t === 'act') {
    try { state = apply(state, msg.action, peerId); changed(); }
    catch (e) { net.send(peerId, { t: 'err', msg: e.message }); }
  }
}

function onClientMessage(msg) {
  if (msg.t === 'state') {
    state = msg.state;
    const pids = state.players.filter(p => p.owner === me).map(p => p.id);
    store.set('euroflow-mine-' + net.code, pids);
    render();
  } else if (msg.t === 'err') toast(msg.msg);
}

// ---------- Start-Bildschirm ----------
function showScreen(id) {
  for (const el of document.querySelectorAll('.screen')) el.hidden = el.id !== id;
}

async function startHost(code, existing) {
  showScreen('connecting');
  try {
    net = await hostRoom(code, { onMessage: onHostMessage, onPeers: () => render() });
  } catch (e) {
    toast('Online-Raum konnte nicht erstellt werden: ' + e.message);
    showScreen('start'); return;
  }
  mode = 'host'; me = 'host';
  state = existing || newGame();
  history.replaceState(null, '', location.pathname + '?host=' + code);
  if (!existing) { const n = $('#name').value.trim(); if (n) state = apply(state, { type: 'addPlayer', name: n }, 'host'); }
  changed();
}

async function startJoin(code) {
  code = code.trim().toUpperCase();
  if (!code) return toast('Bitte Raum-Code eingeben.');
  const name = $('#name').value.trim() || 'Gast';
  store.set('euroflow-name', name);
  showScreen('connecting');
  try {
    net = await joinRoom(code, {
      onMessage: onClientMessage,
      onClose: () => { toast('Verbindung zum Host verloren. Seite neu laden zum Wiederverbinden.'); $('#netstatus').textContent = '🔴 getrennt'; },
    });
  } catch (e) {
    toast(e.message || String(e)); showScreen('start'); return;
  }
  net.code = code; mode = 'client'; me = net.id;
  history.replaceState(null, '', location.pathname + '?room=' + code);
  net.send({ t: 'hello', name, pids: store.get('euroflow-mine-' + code) || [] });
}

function startLocal(existing) {
  mode = 'local'; me = 'host'; net = null;
  state = existing || newGame();
  if (!existing) { const n = $('#name').value.trim(); if (n) state = apply(state, { type: 'addPlayer', name: n }, null); }
  history.replaceState(null, '', location.pathname);
  changed();
}

// ---------- Rendering ----------
function render() {
  if (!state) return;
  if (state.phase === 'lobby') { showScreen('lobby'); renderLobby(); return; }
  showScreen('game');
  if (!viewPid || !state.players.some(p => p.id === viewPid)) viewPid = (state.players.find(mine) || state.players[0]).id;
  const c = cur();
  if (mine(c) && state.phase === 'play' && mode === 'local') viewPid = c.id;
  drawDynamic($('#board-svg'), state);
  renderTurn();
  renderCard();
  renderPlayers();
  renderSheet();
  renderLog();
  renderWinner();
  $('#netstatus').textContent = mode === 'local' ? '📱 Lokales Spiel' : mode === 'host' ? `🟢 Host · Raum ${net.code} · ${net.count()} verbunden` : `🟢 Online · Raum ${net.code}`;
}

function renderLobby() {
  const host = mode !== 'client';
  const link = net ? `${location.origin}${location.pathname}?room=${net.code}` : '';
  $('#lobby-invite').hidden = !net;
  if (net) { $('#invite-link').value = link; $('#room-code').textContent = net.code; }
  $('#lobby-players').innerHTML = state.players.map(p => `
    <div class="lp" style="--c:${p.color}">
      <span class="dot"></span>
      <b>${esc(p.name)}</b>${p.owner === me && mode !== 'local' ? ' <small>(du)</small>' : ''}
      <label>Traum:
        <select data-dream="${p.id}" ${mine(p) ? '' : 'disabled'}>
          ${DREAM_INDEXES.map(d => `<option value="${d}" ${p.dream === d ? 'selected' : ''}>${FAST[d].icon} ${esc(FAST[d].name)} (${fmt(FAST[d].cost)})</option>`).join('')}
        </select></label>
      <span class="colors">${mine(p) ? COLORS.map(c => `<button class="sw ${c === p.color ? 'on' : ''}" style="background:${c}" data-color="${c}" data-pid="${p.id}" title="Farbe"></button>`).join('') : ''}</span>
      ${(host || mine(p)) ? `<button class="x" data-remove="${p.id}" title="Entfernen">✕</button>` : ''}
    </div>`).join('') || '<p class="muted">Noch keine Spieler.</p>';
  $('#lobby-start').hidden = !host;
  $('#lobby-wait').hidden = host;
}

function renderTurn() {
  const c = cur(), s = state;
  const el = $('#turn');
  const rollChanged = s.roll && s.roll.n !== lastRollSeq;
  const dice = s.roll ? `<div class="dice ${rollChanged ? 'shake' : ''}">${s.roll.dice.map(d => `<span>${DICE[d]}</span>`).join('')}</div>` : '';
  lastRollSeq = s.roll?.n;
  if (s.phase === 'over') { el.innerHTML = `<div class="turnhead">Spiel beendet</div>${dice}`; return; }
  const can = mine(c);
  let act = '';
  if (!can) act = `<p class="muted">Warte auf <b style="color:${c.color}">${esc(c.name)}</b> …</p>`;
  else switch (s.step) {
    case 'roll':
      if (c.skip > 0) act = `<button class="btn big" data-act="roll">⏸ Runde aussetzen (${c.skip})</button>`;
      else if (c.track === 'rat' && c.charity > 0) act = `<p class="hint">Spende aktiv (${c.charity} Runden): wähle die Würfel.</p><div class="row"><button class="btn big" data-act="roll" data-dice="1">🎲 1 Würfel</button><button class="btn big" data-act="roll" data-dice="2">🎲🎲 2 Würfel</button></div>`;
      else if (c.track === 'fast' && c.fastDice) act = `<div class="row"><button class="btn" data-act="roll" data-dice="1">🎲 1</button><button class="btn" data-act="roll" data-dice="2">🎲 2</button><button class="btn" data-act="roll" data-dice="3">🎲 3</button></div>`;
      else act = `<button class="btn big" data-act="roll">🎲 Würfeln</button>`;
      break;
    case 'deal':
      act = `<p class="hint">Chance! Welchen Deal willst du ziehen?</p>
        <div class="row"><button class="btn green" data-act="deal" data-deck="small">Kleiner Deal<small>bis 5.000 €</small></button>
        <button class="btn green dark" data-act="deal" data-deck="big">Großer Deal<small>ab 6.000 €</small></button></div>
        <button class="btn ghost" data-act="endTurn">Kein Deal – Zug beenden</button>`;
      break;
    case 'charity': {
      const amt = Math.round(totalIncome(c) * 0.1);
      act = `<p class="hint">💜 Spende 10 % deines Gesamteinkommens (${fmt(amt)}) und würfle die nächsten 3 Runden mit 1 oder 2 Würfeln.</p>
        <div class="row"><button class="btn purple" data-act="charity" data-accept="1">Spenden</button><button class="btn ghost" data-act="charity">Nein danke</button></div>`;
      break;
    }
    case 'fast': {
      const sp = FAST[c.pos];
      if (sp.type === 'biz') act = `<p class="hint">🏢 <b>${esc(sp.name)}</b><br>Preis ${fmt(sp.cost)} · +${fmt(sp.cf)}/Monat</p><div class="row"><button class="btn green" data-act="fastBuy">Kaufen</button><button class="btn ghost" data-act="endTurn">Passen</button></div>`;
      else if (sp.type === 'dream') act = `<p class="hint">${sp.icon} Dein Traum: <b>${esc(sp.name)}</b> – kostet jetzt ${fmt(dreamCost(s, c.pos))}</p><div class="row"><button class="btn gold" data-act="fastBuy">Traum kaufen & gewinnen!</button><button class="btn ghost" data-act="endTurn">Noch nicht</button></div>`;
      else if (sp.type === 'gamble') act = `<p class="hint">🎲 ${esc(sp.text)}</p><div class="row"><button class="btn green" data-act="fastBuy">Investieren & würfeln</button><button class="btn ghost" data-act="endTurn">Passen</button></div>`;
      else if (sp.type === 'charity') act = `<p class="hint">💜 ${esc(sp.text)}</p><div class="row"><button class="btn purple" data-act="fastBuy">Stiftung gründen</button><button class="btn ghost" data-act="endTurn">Nein danke</button></div>`;
      break;
    }
    default:
      act = `<button class="btn big" data-act="endTurn">Zug beenden ➜</button>`;
  }
  const where = c.track === 'rat' ? (c.pos < 0 ? 'Start' : RAT_INFO[RAT[c.pos]].name) : FAST[c.pos].name;
  el.innerHTML = `<div class="turnhead"><span class="dot" style="background:${c.color}"></span> <b>${esc(c.name)}</b> ist am Zug <small>· ${c.track === 'rat' ? 'Hamsterrad' : 'Überholspur'} · ${esc(where)}</small></div>${dice}<div class="actions">${act}</div>`;
}

function cardBody(card) {
  const row = (k, v, cls = '') => `<tr class="${cls}"><td>${k}</td><td>${v}</td></tr>`;
  if (card.type === 'stock') {
    const st = STOCKS[card.sym];
    return `<table>${row('Symbol', card.sym)}${row('Firma', `${esc(st.name)} (${esc(st.what)})`)}${row('Kurs heute', `<b>${fmt(card.price)}</b>`)}${row('Üblicher Kurs', st.range)}${row('Dividende', 'keine')}</table>
      <p class="fine">Nur wer die Karte zieht, darf kaufen. Alle dürfen zu diesem Kurs verkaufen. Gewinne kosten 26,375 % Abgeltungsteuer (Sparerpauschbetrag 1.000 €/Jahr).</p>`;
  }
  if (card.type === 'asset') {
    if (card.kind === 'gold') return `<table>${row('Menge', card.units + ' Münzen')}${row('Preis je Münze', fmt(card.unitPrice))}${row('Gesamt', `<b>${fmt(card.units * card.unitPrice)}</b>`)}</table>`;
    const nk = nebenkosten(card), dl = darlehen(card);
    return `<table>${row('Kaufpreis', fmt(card.price))}${nk ? row('Kaufnebenkosten 7 %', fmt(nk), 'sub') : ''}${row(card.kind === 'biz' ? 'Kapitaleinsatz' : 'Eigenkapital', `<b>${fmt(card.down)}</b>`)}${dl ? row(card.kind === 'biz' ? 'Verbindlichkeit' : 'Bankdarlehen', fmt(dl)) : ''}${row('Cashflow / Monat', `<b class="${card.cf < 0 ? 'neg' : 'pos'}">${card.cf >= 0 ? '+' : ''}${fmt(card.cf)}</b>`)}</table>
      ${nk ? '<p class="fine">Kaufnebenkosten = Grunderwerbsteuer, Notar & Grundbuch. Verkauf mit Gewinn innerhalb von 10 Jahren → Spekulationssteuer.</p>' : ''}`;
  }
  if (card.type === 'sell') {
    const how = card.perUnit ? `${fmt(card.perUnit)} pro ${card.kind === 'gold' ? 'Münze' : 'Wohneinheit'}` : card.mult ? `${card.mult}× Kaufpreis` : fmt(card.price);
    return `<table>${row('Käufer zahlt', `<b>${how}</b>`)}</table><p class="fine">Jeder, der so etwas besitzt, darf jetzt verkaufen. Das Darlehen wird vom Erlös abgelöst.</p>`;
  }
  return '';
}

function renderCard() {
  const box = $('#card');
  const s = state, c = cur();
  const card = cardOf(s.card);
  if (!card || s.phase !== 'play') { box.hidden = true; return; }
  box.hidden = false;
  box.className = 'gamecard deck-' + s.card.deck;
  const deckName = { small: 'Kleiner Deal', big: 'Großer Deal', market: 'Der Markt', doodad: 'Schnickschnack' }[s.card.deck];
  const drawer = s.players.find(p => p.id === s.card.by);
  let actions = '';
  const canBuy = mine(c) && c.id === s.card.by && !s.card.done && (card.type === 'stock' || card.type === 'asset');
  if (canBuy) {
    if (card.type === 'stock') actions += `<div class="buyrow"><input type="number" id="qty" min="1" step="10" value="100"> Aktien <button class="btn green" data-act="buy">Kaufen</button></div><div class="fine" id="qtycost"></div>`;
    else {
      const need = card.kind === 'gold' ? card.units * card.unitPrice : card.down;
      const loan = Math.max(0, Math.ceil((need - c.cash) / 1000) * 1000);
      actions += `<button class="btn green" data-act="buy">Kaufen für ${fmt(need)}${loan ? ` <small>(inkl. ${fmt(loan)} Bankkredit)</small>` : ''}</button>`;
    }
  }
  // Verkaufsoptionen für alle meine Spieler
  for (const p of s.players.filter(mine)) for (const a of p.assets.filter(x => sellable(card, x))) {
    if (card.type === 'stock') {
      actions += `<div class="sellrow"><span style="color:${p.color}">●</span> ${esc(p.name)}: ${a.shares} × ${a.sym} (Ø ${fmt(a.cost / a.shares)})
        <input type="number" min="1" max="${a.shares}" value="${a.shares}" data-sellqty="${a.id}"> <button class="btn small" data-act="sell" data-pid="${p.id}" data-asset="${a.id}">Verkaufen</button></div>`;
    } else {
      const price = salePrice(card, a), { tax } = saleTax(p, card, a);
      const net = price - (a.mortgage || 0) - tax;
      actions += `<div class="sellrow"><span style="color:${p.color}">●</span> ${esc(p.name)}: ${esc(a.name)} → ${fmt(price)}${a.mortgage ? `, Darlehen −${fmt(a.mortgage)}` : ''}${tax ? `, Steuer −${fmt(tax)}` : ''} = <b class="${net < 0 ? 'neg' : 'pos'}">${fmt(net)}</b>
        <button class="btn small" data-act="sell" data-pid="${p.id}" data-asset="${a.id}">Verkaufen</button></div>`;
    }
  }
  if (mine(c) && s.step === 'card') actions += `<button class="btn ghost" data-act="endTurn">Zug beenden ➜</button>`;
  box.innerHTML = `<div class="ch"><span>${deckName}</span><small>gezogen von <b style="color:${drawer?.color}">${esc(drawer?.name)}</b></small></div>
    <h3>${esc(card.title)}</h3><p class="ct">${esc(card.text)}</p>${cardBody(card)}
    ${s.card.done ? '<p class="done">✅ Gekauft</p>' : ''}
    <div class="cardacts">${actions}</div>`;
  const q = $('#qty');
  if (q) { const upd = () => { $('#qtycost').textContent = `Kosten: ${fmt((+q.value || 0) * card.price)} · Bargeld: ${fmt(c.cash)}`; }; q.oninput = upd; upd(); }
}

function renderPlayers() {
  $('#players').innerHTML = state.players.map(p => {
    const exp = totalExpenses(p), pas = passive(p);
    const pct = p.track === 'fast' ? Math.min(100, (p.fast.income - p.fast.start) / 500) : Math.min(100, pas / exp * 100);
    return `<button class="pchip ${p.id === viewPid ? 'on' : ''} ${p.out ? 'out' : ''}" data-view="${p.id}" style="--c:${p.color}">
      <span class="pn"><span class="dot"></span>${esc(p.name)}${state.players[state.turn].id === p.id ? ' 🎲' : ''}</span>
      <span class="pm">${fmt(p.cash)}</span>
      <span class="bar"><i style="width:${pct}%"></i></span>
      <span class="pl">${p.out ? 'ausgeschieden' : p.track === 'fast' ? '🚀 Überholspur' : `Passiv ${fmt(pas)} / ${fmt(exp)}`}</span>
    </button>`;
  }).join('');
}

function renderSheet() {
  const p = state.players.find(q => q.id === viewPid);
  const el = $('#sheet');
  const can = mine(p) && state.phase === 'play';
  const row = (k, v, cls = '') => `<div class="r ${cls}"><span>${k}</span><b>${v}</b></div>`;
  if (p.track === 'fast') {
    const owned = Object.entries(state.fastOwners).filter(([, id]) => id === p.id).map(([i]) => FAST[i]);
    el.innerHTML = `<div class="sheethead" style="--c:${p.color}"><h2>${esc(p.name)}</h2><span>${esc(p.prof)} · 🚀 Überholspur</span></div>
      <div class="big3"><div><small>Bargeld</small><b>${fmt(p.cash)}</b></div><div><small>Euro-Flow-Tag</small><b class="pos">${fmt(p.fast.income)}</b></div><div><small>Ziel</small><b>${fmt(p.fast.goal)}</b></div></div>
      <div class="prog"><i style="width:${Math.min(100, (p.fast.income - p.fast.start) / 500)}%"></i><span>${fmt(p.fast.income - p.fast.start)} von 50.000 € zusätzlichem Cashflow</span></div>
      <h4>Traum</h4>${row(`${FAST[p.dream].icon} ${esc(FAST[p.dream].name)}`, fmt(dreamCost(state, p.dream)))}
      <h4>Unternehmen</h4>${owned.map(f => row(esc(f.name), '+' + fmt(f.cf))).join('') || '<p class="muted">Noch keine.</p>'}
      <p class="fine">Gewinne, indem du deinen Traum kaufst oder dein Euro-Flow-Tag-Einkommen um 50.000 € steigerst. Keine Bankkredite auf der Überholspur.</p>`;
    return;
  }
  const exp = totalExpenses(p), pas = passive(p), cf = cashflow(p);
  const income = [row('Bruttogehalt', fmt(p.salary))];
  if (p.children) income.push(row(`Kindergeld (${p.children} × ${fmt(KINDERGELD)})`, fmt(kindergeld(p))));
  for (const a of p.assets.filter(x => x.cf)) income.push(row(esc(a.name), fmt(a.cf), 'pass'));
  const assets = p.assets.map(a => {
    let d = '';
    if (a.kind === 'stock') d = `${a.shares} Stk. · Ø ${fmt(a.cost / a.shares)}`;
    else if (a.kind === 'gold') d = `${a.units} Münzen · ${fmt(a.price)}`;
    else d = `Preis ${fmt(a.price)}${a.mortgage ? ` · Darlehen ${fmt(a.mortgage)}` : ''}`;
    return `<div class="r"><span>${esc(a.name)}<small>${d}</small></span><b class="${a.cf < 0 ? 'neg' : ''}">${a.cf ? (a.cf > 0 ? '+' : '') + fmt(a.cf) : '–'}</b></div>`;
  }).join('') || '<p class="muted">Noch keine Vermögenswerte. Kaufe Dinge, die dir Geld bringen!</p>';
  const debts = Object.entries(p.debts).filter(([, d]) => d.bal).map(([k, d]) =>
    `<div class="r"><span>${DEBT_LABELS[k]}<small>${fmt(d.pay)}/Monat</small></span><b>${fmt(d.bal)}</b>${can ? `<button class="btn tiny" data-act="repay" data-which="${k}" data-pid="${p.id}" title="Komplett ablösen">Ablösen</button>` : ''}</div>`).join('');
  el.innerHTML = `<div class="sheethead" style="--c:${p.color}"><h2>${esc(p.name)}</h2><span>${esc(p.prof)}${p.skip ? ` · setzt ${p.skip}× aus` : ''}${p.charity ? ` · 💜 ${p.charity}× 2 Würfel` : ''}</span></div>
    <div class="big3"><div><small>Bargeld</small><b>${fmt(p.cash)}</b></div><div><small>Zahltag (Cashflow)</small><b class="${cf < 0 ? 'neg' : 'pos'}">${cf >= 0 ? '+' : ''}${fmt(cf)}</b></div><div><small>Kinder</small><b>${p.children}</b></div></div>
    <div class="prog"><i style="width:${Math.min(100, pas / exp * 100)}%"></i><span>Passives Einkommen ${fmt(pas)} / Ausgaben ${fmt(exp)} – ${pas > exp ? 'Raus aus dem Hamsterrad! 🚀' : `noch ${fmt(exp - pas)}`}</span></div>
    <details open><summary>Einnahmen <b>${fmt(totalIncome(p))}</b></summary>${income.join('')}</details>
    <details open><summary>Ausgaben <b>${fmt(exp)}</b></summary>${expenseLines(p).map(([k, v]) => row(esc(k), fmt(v))).join('')}</details>
    <details open><summary>Vermögen</summary>${assets}</details>
    <details open><summary>Verbindlichkeiten</summary>${debts}
      <div class="r"><span>Bankkredit<small>${fmt(loanPay(p))}/Monat Zinsen</small></span><b>${fmt(p.loan)}</b></div>
      ${can ? `<div class="loanrow"><input type="number" id="loanamt" step="1000" min="1000" value="1000"><button class="btn small" data-act="loan" data-pid="${p.id}">Kredit aufnehmen</button>${p.loan ? `<button class="btn small ghost" data-act="repay" data-which="loan" data-pid="${p.id}">Tilgen</button>` : ''}</div>` : ''}
    </details>
    <p class="fine">Freibetrag für Kapitalerträge übrig: ${fmt(p.allowance)} · Zahltage: ${p.paydays}</p>`;
}

function renderLog() {
  const el = $('#log');
  el.innerHTML = state.log.slice(-60).map(l => `<div>${esc(l)}</div>`).join('');
  if (state.log.length !== lastLogLen) { el.scrollTop = el.scrollHeight; lastLogLen = state.log.length; }
}

function renderWinner() {
  const w = $('#winner');
  if (state.phase !== 'over') { w.hidden = true; return; }
  const p = state.players.find(q => q.id === state.winner?.pid);
  w.hidden = false;
  w.innerHTML = `<div class="winbox"><div class="trophy">🏆</div><h2>${p ? esc(p.name) + ' gewinnt!' : 'Spiel vorbei'}</h2><p>${esc(state.winner?.reason || '')}</p>
    ${mode !== 'client' ? '<button class="btn big" id="again">Neues Spiel</button>' : ''}<button class="btn ghost" id="closewin">Brett ansehen</button></div>`;
}

// ---------- Events ----------
document.addEventListener('click', e => {
  const b = e.target.closest('button, [data-view]');
  if (!b) return;
  const d = b.dataset;
  if (d.view) { viewPid = d.view; render(); return; }
  if (d.remove) return dispatch({ type: 'removePlayer', pid: d.remove });
  if (d.color) return dispatch({ type: 'setColor', pid: d.pid, color: d.color });
  if (!d.act) return;
  const c = cur();
  switch (d.act) {
    case 'roll': return dispatch({ type: 'roll', pid: c.id, dice: +d.dice || undefined });
    case 'deal': return dispatch({ type: 'deal', pid: c.id, deck: d.deck });
    case 'charity': return dispatch({ type: 'charity', pid: c.id, accept: !!d.accept });
    case 'fastBuy': return dispatch({ type: 'fastBuy', pid: c.id });
    case 'endTurn': return dispatch({ type: 'endTurn', pid: c.id });
    case 'buy': return dispatch({ type: 'buy', pid: c.id, qty: +($('#qty')?.value || 0) });
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
});

function setup() {
  $('#board').innerHTML = boardSVG();
  $('#name').value = store.get('euroflow-name') || '';
  $('#name').addEventListener('change', () => store.set('euroflow-name', $('#name').value.trim()));
  const save = store.get(SAVE);
  $('#btn-resume').hidden = !(save && save.state && save.state.phase !== 'over');
  $('#btn-resume').onclick = () => {
    if (save.mode === 'host' && save.code) startHost(save.code, save.state);
    else startLocal(save.state);
  };
  $('#btn-host').onclick = () => startHost(newCode());
  $('#btn-local').onclick = () => startLocal();
  $('#btn-join').onclick = () => startJoin($('#joincode').value);
  $('#joincode').addEventListener('keydown', e => { if (e.key === 'Enter') startJoin($('#joincode').value); });
  $('#lobby-add').onclick = () => {
    const n = $('#lobby-name').value.trim();
    dispatch({ type: 'addPlayer', name: n || undefined });
    $('#lobby-name').value = '';
  };
  $('#lobby-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('#lobby-add').click(); });
  $('#lobby-start').onclick = () => dispatch({ type: 'start' });
  $('#copy-link').onclick = async () => {
    try { await navigator.clipboard.writeText($('#invite-link').value); toast('Link kopiert!', 'ok'); }
    catch { $('#invite-link').select(); }
  };
  for (const b of document.querySelectorAll('[data-rules]')) b.onclick = () => { $('#rules').hidden = false; };
  $('#rules-close').onclick = () => { $('#rules').hidden = true; };
  $('#rules').onclick = e => { if (e.target.id === 'rules') $('#rules').hidden = true; };
  $('#winner').addEventListener('click', e => {
    if (e.target.id === 'closewin') $('#winner').hidden = true;
    if (e.target.id === 'again') { store.del(SAVE); location.href = location.pathname; }
  });
  $('#btn-leave').onclick = () => { if (confirm('Spiel verlassen? (Der Spielstand bleibt gespeichert.)')) location.href = location.pathname; };

  const params = new URLSearchParams(location.search);
  if (params.get('room')) {
    $('#joincode').value = params.get('room');
    $('#join-hint').hidden = false;
    $('#name').focus();
  }
  showScreen('start');
}
setup();
