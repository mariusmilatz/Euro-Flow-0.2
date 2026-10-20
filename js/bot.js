// Euro Flow – computer players.
// easy: loose and random · medium: solid, no risks · hard: plays like an experienced human.
// The decide*() functions also power the coach's "a pro would …" tips (always at level 'hard').
import { FAST } from './data.js';
import { cardOf, cashflow, totalExpenses, totalIncome, sellable, saleNet, buyCost, dreamCost, M } from './engine.js';

const rnd = () => Math.random();
const LOW = { AWK: 5, SOL: 10, PHN: 10, TEK: 5, WLT: 10 };
const HIGH = { AWK: 20, SOL: 20, PHN: 20, TEK: 20, WLT: 30 };
const reserveOf = (p, lvl) => (lvl === 'hard' ? 1000 : lvl === 'medium' ? 2000 : 500);

// ---- Buying a card ----
export function decideBuy(s, p, card, lvl = 'hard') {
  const spare = p.cash - reserveOf(p, lvl);
  if (card.type === 'stock') {
    const cheap = card.price <= (lvl === 'medium' ? 5 : LOW[card.sym]);
    let share = lvl === 'hard' ? 0.7 : lvl === 'medium' ? 0.4 : 0.3;
    const qtyOf = () => { const q = Math.floor(spare * share / card.price); return q >= 100 ? Math.floor(q / 100) * 100 : Math.floor(q / 10) * 10; };
    if (lvl === 'easy') return card.price <= 10 && rnd() < 0.5 && qtyOf() > 0 ? { yes: true, qty: qtyOf() } : { yes: false };
    if (cheap && qtyOf() > 0) return { yes: true, qty: qtyOf(), why: 'tipStockBuy', params: { high: M(HIGH[card.sym]) } };
    return { yes: false, why: cheap ? 'tipNoCash' : 'tipStockSkip' };
  }
  if (card.type !== 'asset') return { yes: false };
  const down = buyCost(card);
  if (lvl === 'easy') {
    if (spare >= down && (card.cf > 0 ? rnd() < 0.75 : rnd() < 0.25)) return { yes: true };
    return { yes: false };
  }
  if (card.kind === 'bond') return { yes: false, why: 'tipBond' };
  if (card.kind === 'gold') {
    if (lvl === 'hard' && spare - down >= 3000) return { yes: true, why: 'tipGoldBuy' };
    return { yes: false, why: 'tipGoldSkip' };
  }
  if (card.kind === 'land') {
    if (lvl === 'hard' && spare - down >= (down > 10000 ? 10000 : 2000)) return { yes: true, why: 'tipLandBuy' };
    return { yes: false, why: 'tipLandSkip' };
  }
  if (card.cf <= 0) return { yes: false, why: 'tipSkipNeg' };
  const roi = card.cf * 12 / down;
  const need = Math.max(0, down - spare);
  const loan = Math.ceil(need / 1000) * 1000;
  const interest = loan / 10;
  const roiPct = Math.round(roi * 100);
  if (roi < (lvl === 'hard' ? 0.1 : 0.15)) return { yes: false, why: 'tipSkipRoi', params: { roi: roiPct } };
  if (loan) {
    if (lvl === 'medium' && loan > 2000) return { yes: false, why: 'tipNoCash' };
    if (card.cf - interest <= 0) return { yes: false, why: 'tipSkipLoan', params: { int: M(interest), cf: M(card.cf) } };
    if (cashflow(p) + card.cf - interest <= 0) return { yes: false, why: 'tipSkipCash' };
    return { yes: true, why: 'tipBuyLoanOk', params: { loan: M(loan), cf: M(card.cf), int: M(interest) } };
  }
  return { yes: true, why: 'tipBuyGood', params: { roi: roiPct } };
}

// ---- Selling into a market / stock card ----
export function decideSell(s, p, card, a, lvl = 'hard') {
  if (card.type === 'stock') {
    const avg = a.cost / a.shares;
    if (lvl === 'easy') return { yes: card.price > avg && rnd() < 0.5 };
    if (lvl === 'medium') return { yes: card.price >= avg * 2, why: card.price >= avg * 2 ? 'tipStockSell' : 'tipStockHold' };
    const yes = card.price >= HIGH[card.sym] && card.price > avg * 1.5;
    return { yes, why: yes ? 'tipStockSell' : 'tipStockHold', params: { high: M(HIGH[card.sym]) } };
  }
  const net = saleNet(p, card, a);
  if (lvl === 'easy') return { yes: net > 0 && rnd() < 0.5 };
  const base = a.down || a.price || 1;
  const months = a.cf > 0 ? Math.round(net / a.cf) : 999;
  const yes = lvl === 'hard' ? net > Math.max(base * 2, a.cf * 36) : net > base * 1.5 && net > a.cf * 24;
  return { yes, why: yes ? 'tipSellYes' : 'tipSellNo', params: { net: M(net), months } };
}

export function decideDeal(p, lvl = 'hard') {
  const spare = p.cash - reserveOf(p, lvl);
  if (lvl === 'easy') return spare >= 40000 ? 'big' : 'small';
  if (lvl === 'medium') return spare >= 25000 ? 'big' : 'small';
  return spare >= 15000 || (spare >= 8000 && cashflow(p) >= 1000) ? 'big' : 'small';
}

export function decideCharity(p, lvl = 'hard') {
  const amt = Math.round(totalIncome(p) * 0.1);
  if (p.cash < amt) return false;
  if (lvl === 'easy') return rnd() < 0.4;
  if (lvl === 'medium') return p.cash >= amt * 3 && rnd() < 0.7;
  return p.cash - amt >= 3000;
}

// Best debt to pay off right now (hard), or null
export function debtToPay(p, lvl = 'hard') {
  if (lvl === 'easy' || p.track !== 'rat') return null;
  const reserve = lvl === 'hard' ? 3000 : 5000;
  if (p.loan > 0) {
    const amt = Math.min(p.loan, Math.floor((p.cash - reserve) / 1000) * 1000);
    if (amt >= 1000) return { which: 'loan', amount: amt };
  }
  if (lvl !== 'hard') return null;
  const opts = Object.entries(p.debts).filter(([k, d]) => d.bal && k !== 'baufi' && d.pay / d.bal >= 0.025 && d.bal <= p.cash - 8000)
    .sort((x, y) => y[1].pay / y[1].bal - x[1].pay / x[1].bal);
  return opts.length ? { which: opts[0][0], amount: 0 } : null;
}

export function decideFast(s, p, lvl = 'hard') {
  const sp = FAST[p.pos];
  if (sp.type === 'dream') return p.dream === p.pos ? p.cash >= dreamCost(s, p.pos) : lvl === 'easy' && p.cash >= dreamCost(s, p.pos) * 2 && rnd() < 0.3;
  if (sp.type === 'biz') return lvl === 'easy' ? p.cash >= sp.cost && rnd() < 0.7 : p.cash >= sp.cost * (lvl === 'medium' ? 1.1 : 1);
  if (sp.type === 'gamble') return lvl === 'hard' ? p.cash - sp.cost >= 150000 : lvl === 'easy' ? p.cash >= sp.cost && rnd() < 0.3 : false;
  if (sp.type === 'charity') return lvl === 'hard' && !p.fastDice && p.cash >= 300000;
  return false;
}

function fastDiceFor(p, lvl) {
  if (!p.fastDice) return undefined;
  if (lvl !== 'hard') return 2;
  const d = (p.dream - p.pos + 36) % 36;
  return d >= 1 && d <= 6 ? 1 : d <= 12 ? 2 : d <= 18 ? 3 : 2;
}

// ---- What should this bot do now? (current player's turn) ----
export function botAction(s, p) {
  const lvl = p.bot;
  if (s.phase === 'order') return s.order.eligible.includes(p.id) && s.order.rolls[p.id] == null ? { type: 'orderRoll', pid: p.id } : null;
  if (s.phase !== 'play' || s.players[s.turn].id !== p.id) return null;
  switch (s.step) {
    case 'roll': {
      const debt = p.skip ? null : debtToPay(p, lvl);
      if (debt) return { type: 'repay', pid: p.id, ...debt };
      const dice = p.track === 'rat' ? (p.charity > 0 ? (lvl === 'easy' && rnd() < 0.5 ? 1 : 2) : undefined) : fastDiceFor(p, lvl);
      return { type: 'roll', pid: p.id, dice };
    }
    case 'deal': return { type: 'deal', pid: p.id, deck: decideDeal(p, lvl) };
    case 'card': {
      const card = cardOf(s.card);
      if (!s.card.done && s.card.by === p.id && (card.type === 'asset' || card.type === 'stock')) {
        const d = decideBuy(s, p, card, lvl);
        if (d.yes) return { type: 'buy', pid: p.id, qty: d.qty };
      }
      return { type: 'endTurn', pid: p.id };
    }
    case 'charity': return { type: 'charity', pid: p.id, accept: decideCharity(p, lvl) };
    case 'fast': return decideFast(s, p, lvl) ? { type: 'fastBuy', pid: p.id } : { type: 'endTurn', pid: p.id };
    default: return { type: 'endTurn', pid: p.id };
  }
}

// ---- Sales by a bot into the open card (works on any player's turn) ----
export function botSells(s, p) {
  const card = cardOf(s.card);
  if (!card || s.step !== 'card') return [];
  return p.assets.filter(a => sellable(card, a) && decideSell(s, p, card, a, p.bot).yes)
    .map(a => ({ type: 'sell', pid: p.id, assetId: a.id, qty: a.shares }));
}

export { totalExpenses };
