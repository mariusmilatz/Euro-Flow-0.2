// Euro Flow – game rules. Pure state in, new state out.
// Only the host (or the local device) runs apply(); everyone else receives the state.
// Log entries and errors are language-neutral: [key, params] – translated when shown (see i18n.js).
import {
  RAT, FAST, PROFESSIONS, SMALL, BIG, MARKET, DOODADS, COLORS, DREAM_INDEXES,
  KINDERGELD, NK_RATE, ABGELTUNG, SPARERPAUSCHBETRAG, SPEKU_RATE, SPEKU_IMMO, SPEKU_GOLD,
} from './data.js';

export const DECKS = { small: SMALL, big: BIG, market: MARKET, doodad: DOODADS };
export const IMMO = ['etw', 'haus', 'mfh', 'fewo', 'gewerbe', 'land'];

const clone = o => JSON.parse(JSON.stringify(o));
const die = () => 1 + Math.floor(Math.random() * 6);
const uid = () => Math.random().toString(36).slice(2, 9);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Param helpers for translatable messages
export const M = n => ({ m: n });           // money
export const SM = n => ({ sm: n });         // signed money (+/−)
export const C = (deck, i) => ({ card: [deck, i] });
export const F = i => ({ fast: i });
export const K = (k, p) => ({ k, p });
export const A = a => ({ asset: { ref: a.ref, sym: a.sym, kind: a.kind } });

export class GameError extends Error { constructor(key, params) { super(key); this.key = key; this.params = params || {}; } }
const fail = (key, params) => { throw new GameError(key, params); };

// ---------- Calculations ----------
export const nebenkosten = c => ['etw', 'haus', 'mfh', 'fewo', 'gewerbe'].includes(c.kind) ? Math.round(c.price * NK_RATE / 100) * 100 : 0;
export const darlehen = c => c.kind === 'gold' ? 0 : Math.max(0, c.price + nebenkosten(c) - c.down);
export const passive = p => p.assets.reduce((a, x) => a + (x.cf || 0), 0);
export const kindergeld = p => p.children * KINDERGELD;
export const totalIncome = p => p.salary + passive(p) + kindergeld(p);
export const loanPay = p => Math.round(p.loan / 10);
// [labelKey, amount, labelParams]
export function expenseLines(p) {
  const l = [['exTax', p.tax], [p.socialKey === 'pkv' ? 'exPkv' : 'exSv', p.social]];
  if (p.rent) l.push(['exRent', p.rent]);
  l.push(['exOther', p.other]);
  for (const [k, d] of Object.entries(p.debts)) if (d.pay) l.push(['debt_' + k, d.pay]);
  if (p.children) l.push(['exKids', p.children * p.childPer, { n: p.children, amt: M(p.childPer) }]);
  if (p.loan) l.push(['exLoan', loanPay(p)]);
  return l;
}
export const totalExpenses = p => expenseLines(p).reduce((a, [, v]) => a + v, 0);
export const cashflow = p => totalIncome(p) - totalExpenses(p);
export const cardOf = c => c && DECKS[c.deck][c.i];
export const canLeave = p => p.track === 'rat' && passive(p) > totalExpenses(p);
export const buyCost = card => card.kind === 'gold' ? card.units * card.unitPrice : card.down;

export function sellable(card, a) {
  if (!card) return false;
  if (card.type === 'stock') return a.kind === 'stock' && a.sym === card.sym;
  if (card.type === 'sell') return a.kind === card.kind && (!card.code || a.code === card.code);
  return false;
}
export function salePrice(card, a) {
  if (card.type === 'stock') return card.price * a.shares;
  if (card.perUnit) return card.perUnit * (a.units || 1);
  if (card.mult) return a.price * card.mult;
  return card.price;
}
// Tax on a sale (German tax law, simplified). why = message key
export function saleTax(p, card, a, qty) {
  if (a.kind === 'stock') {
    const gain = (card.price - a.cost / a.shares) * qty;
    const taxable = Math.max(0, gain - p.allowance);
    return { tax: Math.round(taxable * ABGELTUNG), gain, used: Math.min(Math.max(gain, 0), p.allowance), why: 'taxAbgeltung' };
  }
  const price = salePrice(card, a);
  const gain = price - a.price - (a.nk || 0);
  const held = p.paydays - (a.boughtAt || 0);
  if (IMMO.includes(a.kind) && gain > 0 && held < SPEKU_IMMO) return { tax: Math.round(gain * SPEKU_RATE), gain, why: 'taxSpekuImmo' };
  if (a.kind === 'gold' && gain > 0 && held < SPEKU_GOLD) return { tax: Math.round(gain * SPEKU_RATE), gain, why: 'taxSpekuGold' };
  return { tax: 0, gain, why: '' };
}
export const saleNet = (p, card, a) => salePrice(card, a) - (a.mortgage || 0) - saleTax(p, card, a, a.shares).tax;
export const dreamCost = (s, idx) => FAST[idx].cost * (1 + (s.dreamMarks[idx] || 0));

// ---------- Setup ----------
export function newGame() {
  return { v: 3, phase: 'lobby', players: [], turn: 0, step: 'roll', card: null, decks: {}, fastOwners: {}, dreamMarks: {}, gambleDone: {},
    order: null, log: [], winner: null, roll: null, seq: 0 };
}

function log(s, key, params = {}) { s.log.push([key, params]); if (s.log.length > 150) s.log.splice(0, s.log.length - 150); }

function draw(s, deck) {
  if (!s.decks[deck] || !s.decks[deck].length) s.decks[deck] = shuffle([...DECKS[deck].keys()]);
  return s.decks[deck].pop();
}

function setupPlayer(p, prof) {
  Object.assign(p, {
    profKey: prof.key, salary: prof.salary, tax: prof.tax, social: prof.social, socialKey: prof.socialLabel.startsWith('Private') ? 'pkv' : 'sv',
    rent: prof.rent, other: prof.other, childPer: prof.childPer, savings: prof.savings,
    debts: Object.fromEntries(Object.entries(prof.debts).map(([k, [bal, pay]]) => [k, { bal, pay }])),
    loan: 0, children: 0, assets: [], pos: -1, track: 'rat', skip: 0, charity: 0, fastDice: false,
    fast: null, paydays: 0, allowance: SPARERPAUSCHBETRAG, out: false,
  });
  p.cash = cashflow(p) + prof.savings;
}

// Take cash; in the rat race the bank steps in automatically with a loan.
function charge(s, p, amount, why) {
  if (amount <= 0) return;
  if (p.cash < amount && p.track === 'rat') {
    const loan = Math.ceil((amount - p.cash) / 1000) * 1000;
    p.loan += loan; p.cash += loan;
    log(s, 'lAutoLoan', { name: p.name, amt: M(loan) });
  }
  p.cash -= amount;
  log(s, 'lPays', { name: p.name, amt: M(amount), why });
}

function payday(s, p) {
  p.paydays++;
  if (p.paydays % 12 === 0) p.allowance = SPARERPAUSCHBETRAG; // new tax year
  const cf = cashflow(p);
  p.cash += cf;
  log(s, 'lPayday', { name: p.name, amt: SM(cf) });
  if (p.cash < 0) bankrupt(s, p);
}

// Personal insolvency (simplified)
function bankrupt(s, p) {
  log(s, 'lBankrupt', { name: p.name });
  for (const a of p.assets) {
    const v = a.kind === 'stock' ? Math.round(a.cost / 2) : Math.round((a.down || a.price) / 2);
    p.cash += v;
    log(s, 'lBankTakes', { asset: A(a).asset, amt: M(v) });
  }
  p.assets = [];
  const repayLoan = Math.min(p.loan, Math.floor(Math.max(0, p.cash) / 1000) * 1000);
  p.loan -= repayLoan; p.cash -= repayLoan;
  for (const k of ['karte', 'raten', 'auto']) {
    const d = p.debts[k];
    if (d && d.bal && p.cash >= d.bal && cashflow(p) < 0) { p.cash -= d.bal; d.bal = 0; d.pay = 0; }
  }
  if (cashflow(p) < 0) {
    for (const k of ['karte', 'raten', 'auto']) { const d = p.debts[k]; if (d) { d.bal = Math.round(d.bal / 2); d.pay = Math.round(d.pay / 2); } }
    log(s, 'lHalfDebt');
  }
  if (p.cash < 0) { log(s, 'lRestForgiven', { amt: M(-p.cash) }); p.cash = 0; }
  if (cashflow(p) < 0) { p.out = true; log(s, 'lOut', { name: p.name }); }
  else { p.skip = 3; log(s, 'lSkip3', { name: p.name }); }
}

function enterFast(s, p) {
  const start = passive(p) * 100;
  p.track = 'fast'; p.pos = 0; p.skip = 0; p.charity = 0;
  p.fast = { start, income: start, goal: start + 50000 };
  log(s, 'lReturnCash', { name: p.name, amt: M(p.cash) });
  p.cash = start; // rat-race cash goes back to the bank, you start with your buyout
  log(s, 'lEnterFast', { name: p.name, amt: M(start), goal: M(p.fast.goal) });
}

function win(s, p, reason) {
  s.phase = 'over'; s.winner = { pid: p.id, reason };
  log(s, 'lWins', { name: p.name, reason });
}

function startTurn(s) {
  const p = s.players[s.turn];
  s.step = 'roll'; s.card = null;
  if (canLeave(p)) enterFast(s, p);
}

function nextTurn(s) {
  if (s.phase !== 'play') return;
  const n = s.players.length;
  for (let i = 1; i <= n; i++) {
    const j = (s.turn + i) % n;
    if (!s.players[j].out) { s.turn = j; return startTurn(s); }
  }
  s.phase = 'over'; s.winner = null; log(s, 'lAllOut');
}

function showCard(s, p, deck, i) {
  s.card = { deck, i, by: p.id, done: false, id: s.seq, logAt: s.log.length };
  immediate(s, p, DECKS[deck][i], deck, i);
  s.step = 'card';
}

// Immediate effects of a drawn card
function immediate(s, p, card, deck, i) {
  const why = C(deck, i);
  switch (card.type) {
    case 'pay': charge(s, p, card.amount, why); break;
    case 'payKids':
      if (p.children) charge(s, p, card.amount * p.children, why);
      else log(s, 'lNoKids', { name: p.name });
      break;
    case 'finance': {
      const d = p.debts[card.debt] || (p.debts[card.debt] = { bal: 0, pay: 0 });
      d.bal += card.amount; d.pay += card.pay;
      log(s, 'lFinance', { name: p.name, card: why.card, amt: M(card.amount), pay: M(card.pay) });
      break;
    }
    case 'rentUp':
      if (p.rent) { p.rent += card.amount; log(s, 'lRentUp', { name: p.name, amt: M(card.amount) }); }
      else log(s, 'lOwner', { name: p.name });
      break;
    case 'payIf': {
      const n = p.assets.filter(a => card.kinds.includes(a.kind)).length;
      if (n) charge(s, p, card.perAsset ? card.amount * n : card.amount, why);
      else log(s, 'lNotAffected', { name: p.name });
      break;
    }
    case 'gain':
      if (card.amount) { p.cash += card.amount; log(s, 'lGain', { name: p.name, amt: M(card.amount), card: why.card }); }
      break;
    case 'split':
      for (const q of s.players) for (const a of q.assets) if (a.kind === 'stock' && a.sym === card.sym) {
        a.shares = card.ratio > 1 ? a.shares * card.ratio : Math.floor(a.shares * card.ratio);
        log(s, 'lSplit', { name: q.name, n: a.shares, sym: card.sym });
      }
      break;
    case 'cfAll':
      for (const q of s.players) for (const a of q.assets) if (a.kind === card.kind && (!card.code || a.code === card.code)) {
        const d = card.perUnit ? card.amount * (a.units || 1) : card.amount;
        a.cf += d;
        log(s, 'lCfChange', { name: q.name, asset: A(a).asset, cf: SM(d) });
      }
      break;
  }
}

function moveRat(s, p, steps) {
  for (let k = 1; k <= steps; k++) {
    p.pos = (p.pos + 1) % RAT.length;
    if (RAT[p.pos] === 'payday' && k < steps) payday(s, p);
  }
  if (p.out) return nextTurn(s);
  const sp = RAT[p.pos];
  switch (sp) {
    case 'deal': s.step = 'deal'; break;
    case 'doodad': case 'market': {
      const i = draw(s, sp);
      log(s, 'lDraws', { name: p.name, card: [sp, i] });
      showCard(s, p, sp, i);
      break;
    }
    case 'payday': payday(s, p); s.step = 'end'; break;
    case 'charity': s.step = 'charity'; break;
    case 'baby':
      if (p.children < 3) { p.children++; log(s, 'lBaby', { name: p.name, amt: M(p.childPer), kg: M(KINDERGELD) }); }
      else log(s, 'lBaby3', { name: p.name });
      s.step = 'end'; break;
    case 'downsized': {
      const alg = Math.round((p.salary - p.tax - p.social) * 0.6);
      const due = Math.max(0, totalExpenses(p) - alg);
      log(s, 'lFired', { name: p.name, amt: M(alg) });
      charge(s, p, due, K('whyFired'));
      p.skip = 2; p.charity = 0;
      s.step = 'end'; break;
    }
  }
  if (p.out) nextTurn(s);
}

function moveFast(s, p, steps) {
  for (let k = 1; k <= steps; k++) {
    p.pos = (p.pos + 1) % FAST.length;
    if (FAST[p.pos].type === 'cfday') { p.cash += p.fast.income; log(s, 'lCfDay', { name: p.name, amt: M(p.fast.income) }); }
  }
  const sp = FAST[p.pos];
  s.step = 'end';
  switch (sp.type) {
    case 'biz': {
      const owner = s.players.find(q => q.id === s.fastOwners[p.pos]);
      if (!owner) s.step = 'fast';
      else if (owner.id === p.id) log(s, 'lOwnBiz', { name: p.name, fast: p.pos });
      else { // landing on someone else's business: pay the owner €50,000
        const fee = Math.min(50000, Math.max(0, p.cash));
        p.cash -= fee; owner.cash += fee;
        log(s, 'lBizFee', { name: p.name, owner: owner.name, fast: p.pos, amt: M(fee) });
      }
      break;
    }
    case 'dream':
      if (s.fastOwners[p.pos]) log(s, 'lOwnedBy', { fast: p.pos, owner: s.players.find(q => q.id === s.fastOwners[p.pos])?.name });
      else if (p.dream === p.pos) s.step = 'fast';
      else if (s.players.some(q => q.id !== p.id && q.dream === p.pos && !q.out)) {
        s.dreamMarks[p.pos] = (s.dreamMarks[p.pos] || 0) + 1;
        log(s, 'lDreamMark', { name: p.name, fast: p.pos, amt: M(sp.cost) });
      } else s.step = 'fast'; // nobody's dream: you may buy it as an extra dream
      break;
    case 'gamble': if (!s.gambleDone[p.pos]) s.step = 'fast'; else log(s, 'lGambleTaken', { fast: p.pos }); break;
    case 'charity': s.step = 'fast'; break;
    case 'lawsuit': case 'audit': { const l = Math.round(p.cash / 2); p.cash -= l; log(s, 'lLoseHalf', { name: p.name, fast: p.pos, amt: M(l) }); break; }
    case 'divorce': log(s, 'lDivorce', { name: p.name, amt: M(p.cash) }); p.cash = 0; break;
  }
}

function orderRollDone(s) {
  const o = s.order;
  if (!o.eligible.every(id => o.rolls[id] != null)) return;
  const max = Math.max(...o.eligible.map(id => o.rolls[id]));
  const top = o.eligible.filter(id => o.rolls[id] === max);
  if (top.length > 1) {
    log(s, 'lOrderTie', { r: max, names: top.map(id => s.players.find(p => p.id === id).name).join(', ') });
    o.round++; o.eligible = top;
    for (const id of top) { o.history[id] = [...(o.history[id] || []), o.rolls[id]]; delete o.rolls[id]; }
    return;
  }
  s.turn = s.players.findIndex(p => p.id === top[0]);
  s.phase = 'play';
  log(s, 'lStarts', { name: s.players[s.turn].name });
  startTurn(s);
}

// ---------- Actions ----------
export function apply(state, a, from) {
  const s = clone(state);
  s.seq++;
  const P = id => s.players.find(p => p.id === id) || fail('errNotFound');
  const isHost = from == null || from === 'host';
  const own = id => { const p = P(id); if (from != null && p.owner !== from) fail('errNotYours'); return p; };
  const cur = s.players[s.turn];
  const current = id => { const p = own(id); if (s.phase !== 'play' || cur.id !== p.id) fail('errNotTurn'); return p; };

  switch (a.type) {
    // ----- Lobby -----
    case 'addPlayer': {
      if (s.phase !== 'lobby') fail('errRunning');
      if (s.players.length >= 6) fail('errMax6');
      if (a.bot && !isHost) fail('errOnlyHost');
      const used = s.players.map(p => p.color);
      const freeDreams = DREAM_INDEXES.filter(d => !s.players.some(p => p.dream === d));
      const name = String(a.name || '').trim().slice(0, 16) || (a.bot ? a.botName : null) || `P${s.players.length + 1}`;
      s.players.push({
        id: uid(), name, owner: from ?? 'host', bot: a.bot || null,
        color: COLORS.find(c => !used.includes(c)),
        dream: freeDreams[Math.floor(Math.random() * freeDreams.length)] ?? DREAM_INDEXES[0],
      });
      break;
    }
    case 'removePlayer': {
      if (s.phase !== 'lobby') fail('errRunning');
      const p = P(a.pid);
      if (!isHost && p.owner !== from) fail('errOnlyHost');
      s.players = s.players.filter(q => q.id !== a.pid);
      break;
    }
    case 'setDream': { if (s.phase !== 'lobby') fail('errTooLate'); own(a.pid).dream = a.dream; break; }
    case 'setBot': { if (s.phase !== 'lobby' || !isHost) fail('errOnlyHost'); P(a.pid).bot = a.bot; break; }
    case 'setColor': {
      if (s.phase !== 'lobby') fail('errTooLate');
      if (s.players.some(p => p.color === a.color && p.id !== a.pid)) fail('errColorTaken');
      own(a.pid).color = a.color; break;
    }
    case 'start': {
      if (!isHost) fail('errOnlyHost');
      if (s.phase !== 'lobby') fail('errRunning');
      if (!s.players.length) fail('errMin1');
      const profs = shuffle([...PROFESSIONS]);
      s.players.forEach((p, i) => setupPlayer(p, profs[i % profs.length]));
      for (const d of Object.keys(DECKS)) s.decks[d] = shuffle([...DECKS[d].keys()]);
      s.players.forEach(p => log(s, 'lProfIs', { name: p.name, prof: { prof: p.profKey }, amt: M(p.cash) }));
      s.phase = 'order';
      s.order = { eligible: s.players.map(p => p.id), rolls: {}, history: {}, round: 1 };
      log(s, 'lOrderStart');
      break;
    }
    case 'orderRoll': {
      const p = own(a.pid);
      if (s.phase !== 'order') fail('errNotNow');
      if (!s.order.eligible.includes(p.id) || s.order.rolls[p.id] != null) fail('errAlreadyRolled');
      const r = die();
      s.order.rolls[p.id] = r;
      s.roll = { pid: p.id, dice: [r], n: s.seq };
      log(s, 'lOrderRoll', { name: p.name, r });
      orderRollDone(s);
      break;
    }

    // ----- Turn -----
    case 'roll': {
      const p = current(a.pid);
      if (s.step !== 'roll') fail('errNoRollNow');
      if (p.skip > 0) { p.skip--; log(s, 'lSkipTurn', { name: p.name }); nextTurn(s); break; }
      let n = p.track === 'rat' ? 1 : 2;
      if (p.track === 'rat' && p.charity > 0) { n = a.dice === 2 ? 2 : 1; p.charity--; }
      if (p.track === 'fast' && p.fastDice) n = Math.min(3, Math.max(1, a.dice || 2));
      const dice = Array.from({ length: n }, die);
      const total = dice.reduce((x, y) => x + y, 0);
      s.roll = { pid: p.id, dice, n: s.seq };
      log(s, 'lRolls', { name: p.name, dice: dice.join(' + ') + (n > 1 ? ' = ' + total : '') });
      if (p.track === 'rat') moveRat(s, p, total); else moveFast(s, p, total);
      break;
    }
    case 'deal': {
      const p = current(a.pid);
      if (s.step !== 'deal') fail('errNoDeal');
      const deck = a.deck === 'big' ? 'big' : 'small';
      const i = draw(s, deck);
      log(s, 'lDrawsDeal', { name: p.name, size: K(deck === 'small' ? 'aSmallDeal' : 'aBigDeal'), card: [deck, i] });
      showCard(s, p, deck, i);
      break;
    }
    case 'buy': {
      const p = current(a.pid);
      const card = cardOf(s.card);
      if (s.step !== 'card' || !card || s.card.done) fail('errNothingToBuy');
      if (card.type === 'stock') {
        const qty = Math.floor(a.qty);
        if (!(qty > 0)) fail('errEnterQty');
        charge(s, p, qty * card.price, K('whyStock', { qty, sym: card.sym, price: M(card.price) }));
        const h = p.assets.find(x => x.kind === 'stock' && x.sym === card.sym);
        if (h) { h.shares += qty; h.cost += qty * card.price; }
        else p.assets.push({ id: uid(), kind: 'stock', sym: card.sym, shares: qty, cost: qty * card.price, cf: 0 });
      } else if (card.type === 'asset') {
        const price = card.kind === 'gold' ? card.units * card.unitPrice : card.price;
        const down = buyCost(card);
        const ref = [s.card.deck, s.card.i];
        charge(s, p, down, K('whyEquity', { cardName: ref }));
        p.assets.push({
          id: uid(), ref, kind: card.kind, code: card.code || null, units: card.units || null,
          price, nk: nebenkosten(card), down, mortgage: card.kind === 'gold' ? 0 : darlehen(card), cf: card.cf, boughtAt: p.paydays,
        });
      } else fail('errCantBuy');
      s.card.done = true;
      log(s, 'lBuys', { name: p.name, card: [s.card.deck, s.card.i] });
      break;
    }
    case 'sell': {
      const p = own(a.pid);
      const card = cardOf(s.card);
      if (s.phase !== 'play' || s.step !== 'card') fail('errCantSellNow');
      const asset = p.assets.find(x => x.id === a.assetId) || fail('errAssetNF');
      if (!sellable(card, asset)) fail('errCardNoMatch');
      if (card.type === 'stock') {
        const qty = Math.min(asset.shares, Math.floor(a.qty || asset.shares));
        if (!(qty > 0)) fail('errEnterQty');
        const { tax, used } = saleTax(p, card, asset, qty);
        const avg = asset.cost / asset.shares;
        p.cash += qty * card.price - tax;
        p.allowance -= used || 0;
        asset.shares -= qty; asset.cost = Math.round(avg * asset.shares);
        if (!asset.shares) p.assets = p.assets.filter(x => x !== asset);
        log(s, 'lSellsStock', { name: p.name, qty, sym: card.sym, amt: M(qty * card.price), tax: M(tax) });
      } else {
        const price = salePrice(card, asset);
        const { tax } = saleTax(p, card, asset);
        const net = price - (asset.mortgage || 0) - tax;
        p.cash += net;
        p.assets = p.assets.filter(x => x !== asset);
        log(s, 'lSellsAsset', { name: p.name, asset: A(asset).asset, price: M(price), mort: M(asset.mortgage || 0), tax: M(tax), net: SM(net) });
      }
      break;
    }
    case 'passCard': { // "keep it" – a player decides not to sell into the open card
      const p = own(a.pid);
      if (!s.card) fail('errNotNow');
      s.card.passed = [...new Set([...(s.card.passed || []), p.id])];
      break;
    }
    case 'charity': {
      const p = current(a.pid);
      if (s.step !== 'charity') fail('errNotNow');
      if (a.accept) {
        const amt = Math.round(totalIncome(p) * 0.1);
        if (p.cash < amt) fail('errNeedCash', { amt: M(amt) });
        p.cash -= amt; p.charity = 3;
        log(s, 'lDonates', { name: p.name, amt: M(amt) });
      }
      nextTurn(s);
      break;
    }
    case 'fastBuy': {
      const p = current(a.pid);
      if (s.step !== 'fast') fail('errNotNow');
      const sp = FAST[p.pos];
      if (sp.type === 'biz') {
        if (p.cash < sp.cost) fail('errFastCash');
        p.cash -= sp.cost; p.fast.income += sp.cf; s.fastOwners[p.pos] = p.id;
        log(s, 'lBuysBiz', { name: p.name, fast: p.pos, cf: M(sp.cf) });
        if (p.fast.income >= p.fast.goal) win(s, p, K('winGoal'));
      } else if (sp.type === 'dream') {
        const c = dreamCost(s, p.pos);
        if (p.cash < c) fail('errDreamCost', { amt: M(c) });
        p.cash -= c; s.fastOwners[p.pos] = p.id;
        if (p.dream === p.pos) win(s, p, K('winDream', { fast: F(p.pos) }));
        else log(s, 'lBuysDream', { name: p.name, fast: p.pos, amt: M(c) });
      } else if (sp.type === 'gamble') {
        if (p.cash < sp.cost) fail('errFastCash');
        p.cash -= sp.cost;
        const r = die();
        s.roll = { pid: p.id, dice: [r], n: s.seq };
        if (r >= sp.need) { p.cash += sp.payout; s.gambleDone[p.pos] = p.id; log(s, 'lGambleWin', { name: p.name, r, fast: p.pos, amt: M(sp.payout) }); }
        else log(s, 'lGambleLose', { name: p.name, r, fast: p.pos, amt: M(sp.cost) });
      } else if (sp.type === 'charity') {
        if (p.cash < sp.cost) fail('errFastCash');
        p.cash -= sp.cost; p.fastDice = true;
        log(s, 'lFoundation', { name: p.name });
      }
      if (s.phase === 'play') s.step = 'end';
      break;
    }
    case 'endTurn': {
      current(a.pid);
      if (!['card', 'end', 'fast', 'deal'].includes(s.step)) fail('errFirstRoll');
      nextTurn(s);
      break;
    }
    case 'loan': {
      const p = own(a.pid);
      if (p.track !== 'rat') fail('errNoLoanFast');
      const amt = Math.round(a.amount / 1000) * 1000;
      if (!(amt > 0)) fail('errLoanSteps');
      p.loan += amt; p.cash += amt;
      log(s, 'lLoan', { name: p.name, amt: M(amt), pay: M(amt / 10) });
      break;
    }
    case 'repay': {
      const p = own(a.pid);
      if (a.which === 'loan') {
        const amt = Math.min(p.loan, Math.round(a.amount / 1000) * 1000);
        if (!(amt > 0)) fail('errLoanSteps');
        if (p.cash < amt) fail('errNeedCash', { amt: M(amt) });
        p.loan -= amt; p.cash -= amt;
        log(s, 'lRepayLoan', { name: p.name, amt: M(amt) });
      } else {
        const d = p.debts[a.which];
        if (!d || !d.bal) fail('errNoDebt');
        if (p.cash < d.bal) fail('errNeedCash', { amt: M(d.bal) });
        p.cash -= d.bal;
        log(s, 'lRepayDebt', { name: p.name, debt: K('debt_' + a.which), amt: M(d.bal), pay: M(d.pay) });
        d.bal = 0; d.pay = 0;
      }
      break;
    }
    default: fail('errUnknown');
  }
  return s;
}
