// Euro Flow – game rules. Pure state in, new state out.
// Only the host (or the local device) runs apply(); everyone else receives the state.
// Log entries and errors are language-neutral: [key, params] – translated when shown (see i18n.js).
import {
  RAT, FAST, PROFESSIONS, SMALL, BIG, MARKET, DOODADS, COLORS, DREAM_INDEXES, CITIES, MODES, GREST, GREST_DEFAULT, churchRate,
  KINDERGELD, ABGELTUNG, SPARERPAUSCHBETRAG, SPEKU_YEARS_IMMO, SPEKU_YEARS_GOLD, CRYPTO_FREIGRENZE, ETF_TEILFREI, GEZ, NOTAR,
  BUILDING_SHARE, AFA_RATE, ADVISOR_FEE, ADVISOR_MONTH, BAUSPAR_READY, BAUSPAR_RATE, RATE_STEP,
} from './data.js';
import { payroll, afaSaving } from './tax.js';

export const DECKS = { small: SMALL, big: BIG, market: MARKET, doodad: DOODADS };
export const IMMO = ['etw', 'haus', 'mfh', 'fewo', 'gewerbe', 'land'];
export const BUILDINGS = ['etw', 'haus', 'mfh', 'fewo', 'gewerbe'];
export const RENTALS = ['etw', 'haus', 'mfh', 'fewo', 'gewerbe'];

const clone = o => JSON.parse(JSON.stringify(o));
const die = () => 1 + Math.floor(Math.random() * 6);
const uid = () => Math.random().toString(36).slice(2, 9);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const r100 = n => Math.round(n / 100) * 100;

// Param helpers for translatable messages
export const M = n => ({ m: n });           // money
export const SM = n => ({ sm: n });         // signed money (+/−)
export const C = (deck, i) => ({ card: [deck, i] });
export const F = i => ({ fast: i });
export const K = (k, p) => ({ k, p });
export const A = a => ({ asset: { ref: a.ref, sym: a.sym, kind: a.kind } });

export class GameError extends Error { constructor(key, params) { super(key); this.key = key; this.params = params || {}; } }
const fail = (key, params) => { throw new GameError(key, params); };

// ---------- Rules / mode ----------
export const R = s => MODES[(s && s.mode) || 'classic'];
const cityOf = p => CITIES.find(c => c.key === p.city) || CITIES[0];

// ---------- Salary & taxes ----------
export const working = p => !(p.alg > 0 || p.sperr > 0);
const taxOpts = (p, s) => ({ pkv: p.pkv || undefined, hasKids: p.children > 0, church: p.church && R(s).city ? churchRate(cityOf(p).st) : 0 });
// yearly depreciation (AfA) on buildings you own
export const afaYear = p => p.assets.filter(a => BUILDINGS.includes(a.kind)).reduce((t, a) => t + a.price * BUILDING_SHARE * (a.afa || AFA_RATE), 0);
export function payInfo(p, s) {
  const gross = working(p) ? p.salary : 0;
  const pr = payroll(gross, taxOpts(p, s));
  const afaSave = p.advisor && R(s).afa && gross ? afaSaving(gross, afaYear(p), taxOpts(p, s)) : 0;
  return { gross, ...pr, afaSave };
}
// net pay if working normally (base for unemployment benefit)
export function normalNet(p, s) {
  const pr = payroll(p.salary, taxOpts(p, s));
  return p.salary - pr.tax - pr.soli - pr.church - pr.social;
}
export const algAmount = (p, s) => (p.alg > 0 ? Math.round(normalNet(p, s) * 0.6) : 0);
export const mrateOf = (p, s) => payroll(p.salary, taxOpts(p, s)).mrate;
// what hiring a tax advisor would save per month right now
export const afaPotential = (p, s) => (R(s).afa ? afaSaving(p.salary, afaYear(p), taxOpts(p, s)) : 0);

// ---------- Assets ----------
export const etfPayout = a => Math.round(a.value * 0.04 / 12);   // 4 % rule
export function assetCf(a) {
  if (a.kind === 'etf') return etfPayout(a);
  return (a.cf || 0) - (a.vacant > 0 ? a.loss || 0 : 0);
}
export const passive = p => p.assets.reduce((t, a) => t + assetCf(a), 0);
export const kindergeld = p => p.children * KINDERGELD;
export const loanPay = p => Math.round(p.loan / 10);
export const etfOf = p => p.assets.find(a => a.kind === 'etf');
export const bausparOf = p => p.assets.find(a => a.kind === 'bauspar');

// ---------- Statement lines: [labelKey, amount, labelParams] ----------
export function incomeLines(p, s) {
  const l = [];
  if (working(p)) l.push(['salary', p.salary]);
  else if (p.alg > 0) l.push(['inAlg', algAmount(p, s), { n: p.alg }]);
  else l.push(['inSperr', 0, { n: p.sperr }]);
  if (p.children) l.push(['kindergeld', kindergeld(p), { n: p.children, amt: M(KINDERGELD) }]);
  return l;
}
export function deductionLines(p, s) {
  const pi = payInfo(p, s);
  if (!pi.gross) return [];
  const l = [['dTax', pi.tax, { rate: Math.round(pi.mrate * 100) }]];
  if (pi.soli) l.push(['dSoli', pi.soli]);
  if (pi.church) l.push(['dChurch', pi.church]);
  l.push([p.pkv ? 'dPkv' : 'dSv', pi.social]);
  if (pi.afaSave) l.push(['dAfa', -pi.afaSave]);
  return l;
}
export function livingLines(p) {
  const l = [];
  if (p.rent) l.push(['exRent', p.rent]);
  l.push(['exCar', p.car], ['exIns', p.ins], ['exGez', GEZ], ['exOther', p.other]);
  for (const [k, d] of Object.entries(p.debts)) if (d.pay) l.push(['debt_' + k, d.pay]);
  if (p.children) l.push(['exKids', p.children * p.childPer, { n: p.children, amt: M(p.childPer) }]);
  if (p.loan) l.push(['exLoan', loanPay(p)]);
  if (p.advisor) l.push(['exAdvisor', ADVISOR_MONTH]);
  return l;
}
export function saveLines(p) {
  const l = [];
  const e = etfOf(p), b = bausparOf(p);
  if (e && e.monthly) l.push(['svEtf', e.monthly]);
  if (b) l.push(['svBauspar', b.monthly]);
  return l;
}
const sum = l => l.reduce((t, [, v]) => t + v, 0);
export const livingCosts = p => sum(livingLines(p));
export const healthCost = (p, s) => (!R(s).health ? 0 : p.pkv ? p.pkv * 2 : Math.min(1090, Math.max(230, Math.round(livingCosts(p) * 0.245))));
export const escapeTarget = (p, s) => livingCosts(p) + healthCost(p, s);
export const totalIncome = (p, s) => sum(incomeLines(p, s)) + passive(p);
export const totalExpenses = (p, s) => sum(deductionLines(p, s)) + livingCosts(p) + sum(saveLines(p));
export const cashflow = (p, s) => totalIncome(p, s) - totalExpenses(p, s);
export const canLeave = (p, s) => p.track === 'rat' && passive(p) > escapeTarget(p, s);
export const cardOf = c => c && DECKS[c.deck][c.i];
export const buyCost = card => (card.kind === 'gold' || card.kind === 'crypto' ? card.units * card.unitPrice : card.down);

// ---------- Property purchase costs & prices ----------
export const nkRate = (card, s) => (BUILDINGS.includes(card.kind) ? (R(s).city ? GREST[card.st] ?? GREST_DEFAULT : GREST_DEFAULT) + NOTAR : 0);
export const nebenkosten = (card, s) => r100(card.price * nkRate(card, s));
export const darlehen = (card, s) => (card.kind === 'gold' || card.kind === 'crypto' ? 0 : Math.max(0, card.price + nebenkosten(card, s) - card.down));
export const rateFactor = s => 1 - RATE_STEP * (s.rate || 0);

export function sellable(card, a) {
  if (!card) return false;
  if (card.type === 'stock') return a.kind === 'stock' && a.sym === card.sym;
  if (card.type === 'sell') return a.kind === card.kind && (!card.code || a.code === card.code);
  return false;
}
export function salePrice(card, a, s) {
  if (card.type === 'stock') return card.price * a.shares;
  let v;
  if (card.perUnit) v = card.perUnit * (a.units || 1);
  else if (card.mult) v = a.price * card.mult;
  else v = card.price;
  return IMMO.includes(a.kind) ? r100(v * rateFactor(s)) : v;
}
// Tax on a sale (German tax law, simplified). why = message key
export function saleTax(p, card, a, qty, s) {
  const on = R(s).specTax;
  if (a.kind === 'stock') {
    const gain = (card.price - a.cost / a.shares) * qty;
    const taxable = Math.max(0, gain - p.allowance);
    return { tax: on ? Math.round(taxable * ABGELTUNG) : 0, gain, used: Math.min(Math.max(gain, 0), p.allowance), why: 'taxAbgeltung' };
  }
  const price = salePrice(card, a, s);
  const gain = price - a.price - (a.nk || 0);
  const held = p.year - (a.boughtYear || 1);
  const rate = mrateOf(p, s);
  if (!on || gain <= 0) return { tax: 0, gain, why: '' };
  if (IMMO.includes(a.kind) && held < SPEKU_YEARS_IMMO) return { tax: Math.round(gain * rate), gain, why: 'taxSpekuImmo', rate };
  if (a.kind === 'gold' && held < SPEKU_YEARS_GOLD) return { tax: Math.round(gain * rate), gain, why: 'taxSpekuGold', rate };
  if (a.kind === 'crypto' && held < SPEKU_YEARS_GOLD && gain + (p.cryptoGain || 0) > CRYPTO_FREIGRENZE) return { tax: Math.round(gain * rate), gain, why: 'taxCrypto', rate };
  return { tax: 0, gain, why: '' };
}
export const saleNet = (p, card, a, s) => salePrice(card, a, s) - (a.mortgage || 0) - saleTax(p, card, a, a.shares, s).tax;
export function etfSaleTax(p, a, s) {
  const gain = a.value - a.basis;
  if (!R(s).specTax || gain <= 0) return 0;
  return Math.round(Math.max(0, gain * (1 - ETF_TEILFREI) - p.allowance) * ABGELTUNG);
}
export const dreamCost = (s, idx) => FAST[idx].cost * (1 + (s.dreamMarks[idx] || 0));

// ---------- Net worth (Nettovermögen) ----------
export function assetValue(a, s) {
  if (IMMO.includes(a.kind)) return r100(a.price * rateFactor(s)) - (a.mortgage || 0);
  if (a.kind === 'stock') return a.cost;
  if (a.kind === 'etf') return Math.round(a.value);
  if (a.kind === 'bauspar') return a.balance;
  return (a.price || 0) - (a.mortgage || 0);
}
export function netWorth(p, s) {
  if (p.track === 'fast') {
    return p.cash + Object.entries(s.fastOwners).filter(([, id]) => id === p.id).reduce((t, [i]) => t + (FAST[i].cost || 0), 0);
  }
  const home = p.homeValue ?? (p.debts.baufi ? p.debts.baufi.bal * 1.25 : 0);
  return Math.round(p.cash + home + p.assets.reduce((t, a) => t + assetValue(a, s), 0)
    - Object.values(p.debts).reduce((t, d) => t + d.bal, 0) - p.loan);
}

// ---------- Setup ----------
export function newGame() {
  return { v: 4, phase: 'lobby', mode: 'classic', players: [], turn: 0, step: 'roll', card: null, decks: {}, fastOwners: {}, dreamMarks: {}, gambleDone: {},
    order: null, log: [], winner: null, roll: null, seq: 0, rate: 0, index: 100 };
}

function log(s, key, params = {}) { s.log.push([key, params]); if (s.log.length > 200) s.log.splice(0, s.log.length - 200); }

// remember each player's best and worst move for the end-of-game report
function note(p, v, key, params) {
  if (v > 0 && (!p.best || v > p.best.v)) p.best = { v, key, params };
  if (v < 0 && (!p.worst || v < p.worst.v)) p.worst = { v, key, params };
}
function snapshot(s, p) { (p.hist = p.hist || []).push(netWorth(p, s)); if (p.hist.length > 400) p.hist.shift(); }

function draw(s, deck) {
  if (!s.decks[deck] || !s.decks[deck].length) s.decks[deck] = shuffle([...DECKS[deck].keys()]);
  return s.decks[deck].pop();
}

function setupPlayer(s, p, prof) {
  const city = R(s).city ? cityOf(p) : CITIES[0];
  Object.assign(p, {
    profKey: prof.key, salary: Math.round(prof.salary * city.salaryF / 50) * 50, pkv: prof.pkv || 0,
    rent: Math.round(prof.rent * city.rentF / 10) * 10, car: prof.car, ins: prof.ins, other: prof.other,
    childPer: prof.childPer, savings: prof.savings,
    debts: Object.fromEntries(Object.entries(prof.debts).map(([k, [bal, pay]]) => [k, { bal, pay }])),
    loan: 0, children: 0, assets: [], pos: -1, track: 'rat', skip: 0, charity: 0, fastDice: false,
    fast: null, paydays: 0, year: 1, allowance: SPARERPAUSCHBETRAG, cryptoGain: 0, out: false,
    advisor: false, alg: 0, sperr: 0, indexRent: false, hist: [], best: null, worst: null,
  });
  // homeowners: the own home counts for net worth – but it brings no income (it is not a cash-flow asset)
  p.homeValue = prof.debts.baufi ? Math.round(prof.debts.baufi[0] * 1.25 / 1000) * 1000 : 0;
  if (!R(s).city) p.church = false;
  p.cash = cashflow(p, s) + prof.savings;
  snapshot(s, p);
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
  const cf = cashflow(p, s);
  p.cash += cf;
  log(s, 'lPayday', { name: p.name, amt: SM(cf) });
  // savings plans
  const e = etfOf(p);
  if (e) {
    const out = etfPayout(e);
    if (out && e.value > 0) e.basis = e.basis * (1 - out / e.value);
    e.value = Math.max(0, e.value - out + e.monthly); e.basis += e.monthly;
  }
  const b = bausparOf(p);
  if (b) {
    b.balance += b.monthly;
    if (!b.ready && b.balance >= BAUSPAR_READY) { b.ready = true; log(s, 'lBausparReady', { name: p.name, amt: M(b.balance) }); }
  }
  // bad tenants / unemployment run out
  for (const a of p.assets) if (a.vacant > 0 && --a.vacant === 0) log(s, 'lTenantBack', { name: p.name, asset: A(a).asset });
  if (p.alg > 0 && --p.alg === 0) log(s, 'lBackToWork', { name: p.name });
  if (p.sperr > 0 && --p.sperr === 0) {
    if (p.quitBonus) { p.salary = Math.round(p.salary * 1.1 / 50) * 50; p.quitBonus = false; }
    log(s, 'lNewJob', { name: p.name, amt: M(p.salary) });
  }
  snapshot(s, p);
  if (p.cash < 0) bankrupt(s, p);
}

// A new year starts every time you pass START (1 lap = 1 year)
function newYear(s, p) {
  p.year++;
  p.allowance = SPARERPAUSCHBETRAG; p.cryptoGain = 0;
  log(s, 'lNewYear', { name: p.name, n: p.year });
  if (!R(s).yearly) return;
  if (working(p)) {
    const xmas = r100(normalNet(p, s) * 0.5);
    p.cash += xmas; log(s, 'lXmas', { name: p.name, amt: M(xmas) });
    const refund = r100(p.salary * 12 * (p.advisor ? 0.025 : 0.012));
    p.cash += refund; log(s, 'lTaxRefund', { name: p.name, amt: M(refund), how: K(p.advisor ? 'withAdvisor' : 'withoutAdvisor') });
  }
  if (p.rent) {
    const r = die();
    if (r <= 2) { const n = r100(p.rent * 0.4); log(s, 'lNkBack', { name: p.name, r }); charge(s, p, n, K('whyNk')); }
    else if (r >= 5) { const n = r100(p.rent * 0.25); p.cash += n; log(s, 'lNkRefund', { name: p.name, r, amt: M(n) }); }
    else log(s, 'lNkEven', { name: p.name, r });
  }
  if (R(s).inflation) {
    const before = livingCosts(p);
    p.other = Math.round(p.other * 1.02); p.car = Math.round(p.car * 1.02); p.ins = Math.round(p.ins * 1.02);
    if (p.indexRent && p.rent) p.rent = Math.round(p.rent * 1.02);
    log(s, 'lInflation', { name: p.name, amt: M(livingCosts(p) - before) });
  }
}

// Personal insolvency (simplified)
function bankrupt(s, p) {
  log(s, 'lBankrupt', { name: p.name });
  note(p, -1e7, 'nBankrupt', {});
  for (const a of p.assets) {
    const v = a.kind === 'stock' ? Math.round(a.cost / 2) : a.kind === 'etf' ? Math.round(a.value / 2) : a.kind === 'bauspar' ? a.balance : Math.round((a.down || a.price) / 2);
    p.cash += v;
    log(s, 'lBankTakes', { asset: A(a).asset, amt: M(v) });
  }
  p.assets = [];
  const repayLoan = Math.min(p.loan, Math.floor(Math.max(0, p.cash) / 1000) * 1000);
  p.loan -= repayLoan; p.cash -= repayLoan;
  for (const k of ['karte', 'raten', 'leasing', 'auto']) {
    const d = p.debts[k];
    if (d && d.bal && p.cash >= d.bal && cashflow(p, s) < 0) { p.cash -= d.bal; d.bal = 0; d.pay = 0; }
  }
  if (cashflow(p, s) < 0) {
    for (const k of ['karte', 'raten', 'leasing', 'auto']) { const d = p.debts[k]; if (d) { d.bal = Math.round(d.bal / 2); d.pay = Math.round(d.pay / 2); } }
    log(s, 'lHalfDebt');
  }
  if (p.cash < 0) { log(s, 'lRestForgiven', { amt: M(-p.cash) }); p.cash = 0; }
  if (cashflow(p, s) < 0) { p.out = true; log(s, 'lOut', { name: p.name }); }
  else { p.skip = 3; log(s, 'lSkip3', { name: p.name }); }
}

function enterFast(s, p) {
  const start = passive(p) * 100;
  p.track = 'fast'; p.pos = 0; p.skip = 0; p.charity = 0;
  p.fast = { start, income: start, goal: start + 50000 };
  log(s, 'lReturnCash', { name: p.name, amt: M(p.cash) });
  p.cash = start; // rat-race cash goes back to the bank, you start with your buyout
  log(s, 'lEnterFast', { name: p.name, amt: M(start), goal: M(p.fast.goal) });
  note(p, 5e6, 'nEscape', {});
  snapshot(s, p);
}

function win(s, p, reason) {
  s.phase = 'over'; s.winner = { pid: p.id, reason };
  log(s, 'lWins', { name: p.name, reason });
}

function startTurn(s) {
  const p = s.players[s.turn];
  s.step = 'roll'; s.card = null;
  if (canLeave(p, s)) enterFast(s, p);
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

function applyIndex(s, pct) {
  s.index = Math.round(s.index * (1 + pct / 100) * 10) / 10;
  for (const q of s.players) { const e = q.assets && etfOf(q); if (e) e.value = Math.round(e.value * (1 + pct / 100)); }
}

// Immediate effects of a drawn card
function immediate(s, p, card, deck, i) {
  const why = C(deck, i);
  switch (card.type) {
    case 'pay': charge(s, p, card.amount, why); note(p, -card.amount, 'nPaid', { card: [deck, i] }); break;
    case 'payKids':
      if (p.children) charge(s, p, card.amount * p.children, why);
      else log(s, 'lNoKids', { name: p.name });
      break;
    case 'finance': {
      const d = p.debts[card.debt] || (p.debts[card.debt] = { bal: 0, pay: 0 });
      d.bal += card.amount; d.pay += card.pay;
      log(s, 'lFinance', { name: p.name, card: why.card, amt: M(card.amount), pay: M(card.pay) });
      note(p, -card.pay * 24, 'nFinance', { card: [deck, i] });
      break;
    }
    case 'rentUp':
      if (p.rent) { p.rent += card.amount; p.indexRent = true; log(s, 'lRentUp', { name: p.name, amt: M(card.amount) }); }
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
    case 'badTenant': {
      const list = p.assets.filter(a => RENTALS.includes(a.kind) && a.cf > 0 && !(a.vacant > 0));
      if (!list.length) { log(s, 'lNotAffected', { name: p.name }); break; }
      const a = list[Math.floor(Math.random() * list.length)];
      a.vacant = 3; a.loss = a.kind === 'mfh' ? Math.round(a.cf / (a.units || 1)) : a.cf;
      log(s, 'lBadTenant', { name: p.name, asset: A(a).asset, amt: M(a.loss) });
      note(p, -a.loss * 3, 'nBadTenant', {});
      break;
    }
    case 'rate': {
      s.rate = Math.max(-2, Math.min(2, (s.rate || 0) + card.delta));
      log(s, 'lRate', { lvl: K('rate_' + s.rate), pct: Math.round((rateFactor(s) - 1) * 100) });
      break;
    }
    case 'index': applyIndex(s, card.pct); log(s, 'lIndex', { pct: (card.pct > 0 ? '+' : '') + card.pct, idx: s.index }); break;
  }
}

function moveRat(s, p, steps) {
  for (let k = 1; k <= steps; k++) {
    p.pos = (p.pos + 1) % RAT.length;
    if (p.pos === 0 && p.lapStarted) newYear(s, p);          // crossed START (not on the very first move)
    p.lapStarted = true;
    if (RAT[p.pos] === 'payday' && k < steps) payday(s, p);
  }
  if (p.out) return nextTurn(s);
  const sp = RAT[p.pos];
  switch (sp) {
    case 'deal': s.step = 'deal'; break;
    case 'market': {
      // every market space moves the stock index a little
      const r = die(), pct = [0, -10, -3, 2, 5, 8, 12][r];
      applyIndex(s, pct);
      log(s, 'lIndexRoll', { name: p.name, r, pct: (pct > 0 ? '+' : '') + pct, idx: s.index });
      const i = draw(s, sp);
      log(s, 'lDraws', { name: p.name, card: [sp, i] });
      showCard(s, p, sp, i);
      break;
    }
    case 'doodad': {
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
    case 'downsized':
      if (!working(p)) { log(s, 'lAlreadyNoJob', { name: p.name }); s.step = 'end'; break; }
      p.alg = 2; p.charity = 0;
      log(s, 'lFired', { name: p.name, amt: M(algAmount(p, s)) });
      s.step = 'end'; break;
  }
  if (p.out) nextTurn(s);
}

function moveFast(s, p, steps) {
  for (let k = 1; k <= steps; k++) {
    p.pos = (p.pos + 1) % FAST.length;
    if (FAST[p.pos].type === 'cfday') { p.cash += p.fast.income; log(s, 'lCfDay', { name: p.name, amt: M(p.fast.income) }); snapshot(s, p); }
  }
  const sp = FAST[p.pos];
  s.step = 'end';
  switch (sp.type) {
    case 'biz': {
      const owner = s.players.find(q => q.id === s.fastOwners[p.pos]);
      if (!owner) s.step = 'fast';
      else if (owner.id === p.id) log(s, 'lOwnBiz', { name: p.name, fast: p.pos });
      else {
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
      } else s.step = 'fast';
      break;
    case 'gamble': if (!s.gambleDone[p.pos]) s.step = 'fast'; else log(s, 'lGambleTaken', { fast: p.pos }); break;
    case 'charity': s.step = 'fast'; break;
    case 'lawsuit': case 'audit': { const l = Math.round(p.cash / 2); p.cash -= l; log(s, 'lLoseHalf', { name: p.name, fast: p.pos, amt: M(l) }); note(p, -l, 'nLoseHalf', { fast: F(p.pos) }); break; }
    case 'divorce': log(s, 'lDivorce', { name: p.name, amt: M(p.cash) }); note(p, -p.cash, 'nDivorce', {}); p.cash = 0; break;
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
  const ownOrBot = id => (isHost && P(id).bot ? P(id) : own(id));
  const cur = s.players[s.turn];
  const current = id => { const p = own(id); if (s.phase !== 'play' || cur.id !== p.id) fail('errNotTurn'); return p; };
  const ratOnly = p => { if (p.track !== 'rat') fail('errNotNow'); };

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
        id: uid(), name, owner: from ?? 'host', bot: a.bot || null, city: 'de', church: false,
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
    case 'setDream': { if (s.phase !== 'lobby') fail('errTooLate'); ownOrBot(a.pid).dream = a.dream; break; }
    case 'setBot': { if (s.phase !== 'lobby' || !isHost) fail('errOnlyHost'); P(a.pid).bot = a.bot; break; }
    case 'setMode': { if (s.phase !== 'lobby' || !isHost) fail('errOnlyHost'); if (MODES[a.mode]) s.mode = a.mode; break; }
    case 'setCity': { if (s.phase !== 'lobby') fail('errTooLate'); ownOrBot(a.pid).city = a.city; break; }
    case 'setChurch': { if (s.phase !== 'lobby') fail('errTooLate'); ownOrBot(a.pid).church = !!a.on; break; }
    case 'setColor': {
      if (s.phase !== 'lobby') fail('errTooLate');
      if (s.players.some(p => p.color === a.color && p.id !== a.pid)) fail('errColorTaken');
      ownOrBot(a.pid).color = a.color; break;
    }
    case 'start': {
      if (!isHost) fail('errOnlyHost');
      if (s.phase !== 'lobby') fail('errRunning');
      if (!s.players.length) fail('errMin1');
      const profs = shuffle([...PROFESSIONS]);
      s.players.forEach((p, i) => setupPlayer(s, p, profs[i % profs.length]));
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
      const ref = [s.card.deck, s.card.i];
      if (card.type === 'stock') {
        const qty = Math.floor(a.qty);
        if (!(qty > 0)) fail('errEnterQty');
        charge(s, p, qty * card.price, K('whyStock', { qty, sym: card.sym, price: M(card.price) }));
        const h = p.assets.find(x => x.kind === 'stock' && x.sym === card.sym);
        if (h) { h.shares += qty; h.cost += qty * card.price; }
        else p.assets.push({ id: uid(), kind: 'stock', sym: card.sym, shares: qty, cost: qty * card.price, cf: 0 });
      } else if (card.type === 'etfplan') {
        const amt = Math.round((a.qty || 0) / 50) * 50;
        if (!(amt > 0)) fail('errEnterQty');
        const e = etfOf(p);
        if (e) e.monthly += amt;
        else p.assets.push({ id: uid(), kind: 'etf', ref, value: 0, basis: 0, monthly: amt, cf: 0 });
        log(s, 'lEtfStart', { name: p.name, amt: M(etfOf(p).monthly) });
      } else if (card.type === 'bauspar') {
        const b = bausparOf(p);
        if (b) b.monthly += card.monthly;
        else p.assets.push({ id: uid(), kind: 'bauspar', ref, balance: 0, monthly: card.monthly, ready: false, cf: 0 });
        log(s, 'lBausparStart', { name: p.name, amt: M(card.monthly) });
      } else if (card.type === 'asset') {
        const price = card.kind === 'gold' || card.kind === 'crypto' ? card.units * card.unitPrice : card.price;
        const down = buyCost(card);
        const b = bausparOf(p);
        if (a.useBauspar && b && b.ready && BUILDINGS.includes(card.kind)) {
          // Bauspar: savings go into the deal, the building society lends up to twice the balance cheaply
          p.cash += b.balance;
          const need = Math.max(0, down - p.cash);
          const bl = Math.min(b.balance * 2, Math.ceil(need / 1000) * 1000);
          if (bl) { const d = p.debts.bauspar || (p.debts.bauspar = { bal: 0, pay: 0 }); d.bal += bl; d.pay += Math.round(bl * BAUSPAR_RATE); p.cash += bl; }
          log(s, 'lBausparUse', { name: p.name, amt: M(b.balance), loan: M(bl), pay: M(Math.round(bl * BAUSPAR_RATE)) });
          p.assets = p.assets.filter(x => x !== b);
        }
        charge(s, p, down, K('whyEquity', { cardName: ref }));
        p.assets.push({
          id: uid(), ref, kind: card.kind, code: card.code || null, units: card.units || null, st: card.st || null, afa: card.afa || null,
          price, nk: nebenkosten(card, s), down, mortgage: darlehen(card, s), cf: card.cf, boughtYear: p.year,
        });
        if (card.cf > 0) note(p, card.cf * 12, 'nBuy', { cardName: ref, cf: M(card.cf) });
      } else fail('errCantBuy');
      s.card.done = true;
      log(s, 'lBuys', { name: p.name, card: ref });
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
        const { tax, used, gain } = saleTax(p, card, asset, qty, s);
        const avg = asset.cost / asset.shares;
        p.cash += qty * card.price - tax;
        if (R(s).specTax) p.allowance -= used || 0;
        asset.shares -= qty; asset.cost = Math.round(avg * asset.shares);
        if (!asset.shares) p.assets = p.assets.filter(x => x !== asset);
        log(s, 'lSellsStock', { name: p.name, qty, sym: card.sym, amt: M(qty * card.price), tax: M(tax) });
        note(p, gain - tax, gain - tax >= 0 ? 'nSellStock' : 'nSellStockLoss', { sym: card.sym, amt: SM(gain - tax) });
      } else {
        const price = salePrice(card, asset, s);
        const { tax, gain } = saleTax(p, card, asset, undefined, s);
        const net = price - (asset.mortgage || 0) - tax;
        p.cash += net;
        if (asset.kind === 'crypto' && gain > 0) p.cryptoGain = (p.cryptoGain || 0) + gain;
        p.assets = p.assets.filter(x => x !== asset);
        log(s, 'lSellsAsset', { name: p.name, asset: A(asset).asset, price: M(price), mort: M(asset.mortgage || 0), tax: M(tax), net: SM(net) });
        const profit = net - (asset.down || asset.price || 0);
        note(p, profit, profit >= 0 ? 'nSell' : 'nSellLoss', { asset: A(asset).asset, amt: SM(profit) });
      }
      break;
    }
    case 'passCard': { // "keep it" / "don't buy" – recorded so the popup can show it
      const p = own(a.pid);
      if (!s.card) fail('errNotNow');
      s.card.passed = [...new Set([...(s.card.passed || []), p.id])];
      break;
    }
    case 'choose': {
      const p = current(a.pid);
      const card = cardOf(s.card);
      if (!card || card.type !== 'choice' || s.card.done) fail('errNotNow');
      if (a.opt === 'quit') { p.sperr = 3; p.quitBonus = true; p.alg = 0; log(s, 'lQuit', { name: p.name }); }
      else { charge(s, p, 800, C(s.card.deck, s.card.i)); log(s, 'lStay', { name: p.name }); }
      s.card.done = true; s.card.choice = a.opt;
      break;
    }
    case 'charity': {
      const p = current(a.pid);
      if (s.step !== 'charity') fail('errNotNow');
      if (a.accept) {
        const amt = Math.round(totalIncome(p, s) * 0.1);
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
        note(p, sp.cf * 12, 'nBuyBiz', { fast: F(p.pos), cf: M(sp.cf) });
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
        if (r >= sp.need) { p.cash += sp.payout; s.gambleDone[p.pos] = p.id; log(s, 'lGambleWin', { name: p.name, r, fast: p.pos, amt: M(sp.payout) }); note(p, sp.payout, 'nGambleWin', { fast: F(p.pos) }); }
        else { log(s, 'lGambleLose', { name: p.name, r, fast: p.pos, amt: M(sp.cost) }); note(p, -sp.cost, 'nGambleLose', { fast: F(p.pos) }); }
      } else if (sp.type === 'charity') {
        if (p.cash < sp.cost) fail('errFastCash');
        p.cash -= sp.cost; p.fastDice = true;
        log(s, 'lFoundation', { name: p.name });
      }
      if (s.phase === 'play') s.step = 'end';
      break;
    }
    case 'endTurn': {
      const p = current(a.pid);
      if (!['card', 'end', 'fast', 'deal'].includes(s.step)) fail('errFirstRoll');
      const card = cardOf(s.card);
      if (card && card.type === 'choice' && !s.card.done) { charge(s, p, 800, C(s.card.deck, s.card.i)); log(s, 'lStay', { name: p.name }); }
      nextTurn(s);
      break;
    }
    case 'loan': {
      const p = own(a.pid); ratOnly(p);
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
    case 'advisor': {
      const p = own(a.pid); ratOnly(p);
      if (a.on) {
        if (p.advisor) break;
        if (p.cash < ADVISOR_FEE) fail('errNeedCash', { amt: M(ADVISOR_FEE) });
        p.cash -= ADVISOR_FEE; p.advisor = true;
        log(s, 'lAdvisorOn', { name: p.name, amt: M(ADVISOR_FEE), m: M(ADVISOR_MONTH) });
      } else { p.advisor = false; log(s, 'lAdvisorOff', { name: p.name }); }
      break;
    }
    case 'etfSet': {
      const p = own(a.pid); ratOnly(p);
      const e = etfOf(p) || fail('errNotNow');
      e.monthly = Math.max(0, Math.round((a.amount || 0) / 50) * 50);
      log(s, e.monthly ? 'lEtfSet' : 'lEtfPause', { name: p.name, amt: M(e.monthly) });
      break;
    }
    case 'etfSell': {
      const p = own(a.pid); ratOnly(p);
      const e = etfOf(p) || fail('errNotNow');
      const tax = etfSaleTax(p, e, s);
      const gain = e.value - e.basis;
      if (R(s).specTax && gain > 0) p.allowance = Math.max(0, p.allowance - gain * (1 - ETF_TEILFREI));
      p.cash += Math.round(e.value) - tax;
      p.assets = p.assets.filter(x => x !== e);
      log(s, 'lEtfSell', { name: p.name, amt: M(e.value), gain: SM(gain), tax: M(tax) });
      note(p, gain - tax, gain - tax >= 0 ? 'nEtfSell' : 'nEtfSellLoss', { amt: SM(gain - tax) });
      break;
    }
    default: fail('errUnknown');
  }
  return s;
}
