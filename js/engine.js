// Euro Flow – Spiellogik. Reiner Zustand rein, neuer Zustand raus.
// Nur der Host (oder das lokale Gerät) führt apply() aus; alle anderen bekommen den Zustand geschickt.
import {
  RAT, FAST, PROFESSIONS, SMALL, BIG, MARKET, DOODADS, COLORS, DREAM_INDEXES, DEBT_LABELS,
  KINDERGELD, NK_RATE, ABGELTUNG, SPARERPAUSCHBETRAG, SPEKU_RATE, SPEKU_IMMO, SPEKU_GOLD,
} from './data.js';

export const DECKS = { small: SMALL, big: BIG, market: MARKET, doodad: DOODADS };
export const IMMO = ['etw', 'haus', 'mfh', 'fewo', 'gewerbe', 'land'];

export const fmt = n => (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('de-DE') + ' €';
const clone = o => JSON.parse(JSON.stringify(o));
const die = () => 1 + Math.floor(Math.random() * 6);
const uid = () => Math.random().toString(36).slice(2, 9);
const fail = msg => { throw new Error(msg); };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- Rechnungen ----------
export const nebenkosten = c => ['etw', 'haus', 'mfh', 'fewo', 'gewerbe'].includes(c.kind) ? Math.round(c.price * NK_RATE / 100) * 100 : 0;
export const darlehen = c => c.kind === 'gold' ? 0 : Math.max(0, c.price + nebenkosten(c) - c.down);
export const passive = p => p.assets.reduce((a, x) => a + (x.cf || 0), 0);
export const kindergeld = p => p.children * KINDERGELD;
export const totalIncome = p => p.salary + passive(p) + kindergeld(p);
export const loanPay = p => Math.round(p.loan / 10);
export function expenseLines(p) {
  const l = [['Lohnsteuer & Soli', p.tax], [p.socialLabel, p.social]];
  if (p.rent) l.push(['Miete (warm)', p.rent]);
  l.push(['Lebenshaltung (Essen, Handy, Versicherungen …)', p.other]);
  for (const [k, d] of Object.entries(p.debts)) if (d.pay) l.push([DEBT_LABELS[k], d.pay]);
  if (p.children) l.push([`Kinder (${p.children} × ${fmt(p.childPer)})`, p.children * p.childPer]);
  if (p.loan) l.push(['Bankkredit-Zinsen (10 %/Monat)', loanPay(p)]);
  return l;
}
export const totalExpenses = p => expenseLines(p).reduce((a, [, v]) => a + v, 0);
export const cashflow = p => totalIncome(p) - totalExpenses(p);
export const cardOf = c => c && DECKS[c.deck][c.i];
export const canLeave = p => p.track === 'rat' && passive(p) > totalExpenses(p);

// Welche Vermögenswerte eines Spielers passen zur aktuellen Karte (zum Verkaufen)?
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
// Steuer beim Verkauf (deutsches Steuerrecht, vereinfacht)
export function saleTax(p, card, a, qty) {
  if (a.kind === 'stock') {
    const gain = (card.price - a.cost / a.shares) * qty;
    const taxable = Math.max(0, gain - p.allowance);
    return { tax: Math.round(taxable * ABGELTUNG), gain, used: Math.min(Math.max(gain, 0), p.allowance), why: 'Abgeltungsteuer + Soli (26,375 %)' };
  }
  const price = salePrice(card, a);
  const gain = price - a.price - (a.nk || 0);
  const held = p.paydays - (a.boughtAt || 0);
  if (IMMO.includes(a.kind) && gain > 0 && held < SPEKU_IMMO) return { tax: Math.round(gain * SPEKU_RATE), gain, why: 'Spekulationssteuer (Verkauf innerhalb von 10 Jahren)' };
  if (a.kind === 'gold' && gain > 0 && held < SPEKU_GOLD) return { tax: Math.round(gain * SPEKU_RATE), gain, why: 'Spekulationssteuer (Gold kürzer als 1 Jahr gehalten)' };
  return { tax: 0, gain, why: '' };
}

// ---------- Spielaufbau ----------
export function newGame() {
  return { v: 2, phase: 'lobby', players: [], turn: 0, step: 'roll', card: null, decks: {}, fastOwners: {}, dreamMarks: {}, gambleDone: {}, log: [], winner: null, roll: null, seq: 0 };
}

function log(s, msg) { s.log.push(msg); if (s.log.length > 120) s.log.splice(0, s.log.length - 120); }

function draw(s, deck) {
  if (!s.decks[deck] || !s.decks[deck].length) s.decks[deck] = shuffle([...DECKS[deck].keys()]);
  return s.decks[deck].pop();
}

function setupPlayer(p, prof) {
  Object.assign(p, {
    prof: prof.name, salary: prof.salary, tax: prof.tax, social: prof.social, socialLabel: prof.socialLabel,
    rent: prof.rent, other: prof.other, childPer: prof.childPer, savings: prof.savings,
    debts: Object.fromEntries(Object.entries(prof.debts).map(([k, [bal, pay]]) => [k, { bal, pay }])),
    loan: 0, children: 0, assets: [], pos: -1, track: 'rat', skip: 0, charity: 0, fastDice: false,
    fast: null, paydays: 0, allowance: SPARERPAUSCHBETRAG, out: false,
  });
  p.cash = cashflow(p) + prof.savings;
}

// Bargeld abziehen; im Hamsterrad springt die Bank automatisch mit einem Kredit ein.
function charge(s, p, amount, why) {
  if (amount <= 0) return;
  if (p.cash < amount && p.track === 'rat') {
    const loan = Math.ceil((amount - p.cash) / 1000) * 1000;
    p.loan += loan; p.cash += loan;
    log(s, `🏦 ${p.name} nimmt automatisch ${fmt(loan)} Bankkredit auf.`);
  }
  p.cash -= amount;
  log(s, `💸 ${p.name} zahlt ${fmt(amount)} – ${why}`);
}

function payday(s, p) {
  p.paydays++;
  if (p.paydays % 12 === 0) p.allowance = SPARERPAUSCHBETRAG; // neues Steuerjahr
  const cf = cashflow(p);
  p.cash += cf;
  log(s, `💰 Zahltag für ${p.name}: ${cf >= 0 ? '+' : ''}${fmt(cf)}`);
  if (p.cash < 0) bankrupt(s, p);
}

// Privatinsolvenz (vereinfacht)
function bankrupt(s, p) {
  log(s, `⚠️ ${p.name} ist zahlungsunfähig – Privatinsolvenz!`);
  for (const a of p.assets) {
    const v = a.kind === 'stock' ? Math.round(a.cost / 2) : Math.round((a.down || a.price) / 2);
    p.cash += v;
    log(s, `   Bank übernimmt ${a.name} für ${fmt(v)}`);
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
    log(s, `   Die Hälfte der Konsumschulden wird erlassen.`);
  }
  if (p.cash < 0) { log(s, `   Restschuld von ${fmt(-p.cash)} wird im Insolvenzverfahren erlassen.`); p.cash = 0; }
  if (cashflow(p) < 0) {
    p.out = true;
    log(s, `❌ ${p.name} scheidet aus dem Spiel aus.`);
  } else {
    p.skip = 3;
    log(s, `   ${p.name} setzt 3 Runden aus.`);
  }
}

function enterFast(s, p) {
  const start = passive(p) * 100;
  p.track = 'fast'; p.pos = 0; p.skip = 0; p.charity = 0;
  p.fast = { start, income: start, goal: start + 50000 };
  p.cash += start;
  log(s, `🚀 ${p.name} ist raus aus dem Hamsterrad! Euro-Flow-Tag-Einkommen: ${fmt(start)} (100 × passives Einkommen). Ziel: ${fmt(p.fast.goal)}.`);
}

function win(s, p, reason) {
  s.phase = 'over'; s.winner = { pid: p.id, reason };
  log(s, `🏆 ${p.name} gewinnt: ${reason}`);
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
  s.phase = 'over'; s.winner = null; log(s, 'Alle Spieler sind ausgeschieden.');
}

// Sofort-Effekte einer gezogenen Karte
function immediate(s, p, card) {
  switch (card.type) {
    case 'pay': charge(s, p, card.amount, card.title); break;
    case 'payKids':
      if (p.children) charge(s, p, card.amount * p.children, card.title);
      else log(s, `${p.name} hat keine Kinder – nichts zu zahlen.`);
      break;
    case 'finance': {
      const d = p.debts[card.debt] || (p.debts[card.debt] = { bal: 0, pay: 0 });
      d.bal += card.amount; d.pay += card.pay;
      log(s, `🧾 ${p.name}: ${card.title} – Schulden +${fmt(card.amount)}, Ausgaben +${fmt(card.pay)}/Monat`);
      break;
    }
    case 'rentUp':
      if (p.rent) { p.rent += card.amount; log(s, `🏠 ${p.name}: Miete +${fmt(card.amount)}/Monat`); }
      else log(s, `${p.name} wohnt im Eigentum – nicht betroffen.`);
      break;
    case 'payIf': {
      const n = p.assets.filter(a => card.kinds.includes(a.kind)).length;
      if (n) charge(s, p, card.perAsset ? card.amount * n : card.amount, card.title);
      else log(s, `${p.name} ist nicht betroffen.`);
      break;
    }
    case 'gain':
      if (card.amount) { p.cash += card.amount; log(s, `🎉 ${p.name} erhält ${fmt(card.amount)} – ${card.title}`); }
      break;
    case 'split':
      for (const q of s.players) for (const a of q.assets) if (a.kind === 'stock' && a.sym === card.sym) {
        a.shares = card.ratio > 1 ? a.shares * card.ratio : Math.floor(a.shares * card.ratio);
        log(s, `📈 ${q.name} hat jetzt ${a.shares} ${card.sym}-Aktien.`);
      }
      break;
    case 'cfAll':
      for (const q of s.players) for (const a of q.assets) if (a.kind === card.kind && (!card.code || a.code === card.code)) {
        const d = card.perUnit ? card.amount * (a.units || 1) : card.amount;
        a.cf += d;
        log(s, `📊 ${q.name}: ${a.name} Cashflow ${d >= 0 ? '+' : ''}${fmt(d)}`);
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
      const deck = sp;
      const i = draw(s, deck);
      s.card = { deck, i, by: p.id, done: false };
      log(s, `🃏 ${p.name} zieht „${DECKS[deck][i].title}“`);
      immediate(s, p, DECKS[deck][i]);
      s.step = 'card';
      break;
    }
    case 'payday': payday(s, p); s.step = 'end'; break;
    case 'charity': s.step = 'charity'; break;
    case 'baby':
      if (p.children < 3) { p.children++; log(s, `👶 ${p.name} bekommt ein Baby! +${fmt(p.childPer)} Ausgaben, +${fmt(KINDERGELD)} Kindergeld.`); }
      else log(s, `👶 ${p.name} hat schon 3 Kinder – kein weiteres Baby.`);
      s.step = 'end'; break;
    case 'downsized': {
      const net = p.salary - p.tax - p.social;
      const alg = Math.round(net * 0.6);
      const due = Math.max(0, totalExpenses(p) - alg);
      log(s, `📉 ${p.name} wurde gekündigt! Arbeitslosengeld I (60 % vom Netto) = ${fmt(alg)}.`);
      charge(s, p, due, 'Ausgaben minus Arbeitslosengeld');
      p.skip = 2; p.charity = 0;
      s.step = 'end'; break;
    }
  }
  if (p.out) nextTurn(s);
}

function moveFast(s, p, steps) {
  for (let k = 1; k <= steps; k++) {
    p.pos = (p.pos + 1) % FAST.length;
    if (FAST[p.pos].type === 'cfday') { p.cash += p.fast.income; log(s, `💶 Euro-Flow-Tag: ${p.name} erhält ${fmt(p.fast.income)}`); }
  }
  const sp = FAST[p.pos];
  s.step = 'end';
  switch (sp.type) {
    case 'biz':
      if (s.fastOwners[p.pos]) log(s, `${sp.name} gehört schon ${s.players.find(q => q.id === s.fastOwners[p.pos])?.name}.`);
      else s.step = 'fast';
      break;
    case 'dream':
      if (p.dream === p.pos) s.step = 'fast';
      else if (s.players.some(q => q.id !== p.id && q.dream === p.pos && !q.out)) {
        s.dreamMarks[p.pos] = (s.dreamMarks[p.pos] || 0) + 1;
        log(s, `😈 ${p.name} landet auf einem fremden Traum: „${sp.name}“ wird für dessen Besitzer um ${fmt(sp.cost)} teurer!`);
      }
      break;
    case 'gamble': if (!s.gambleDone[p.pos]) s.step = 'fast'; else log(s, `${sp.name}: Die Chance ist schon vergeben.`); break;
    case 'charity': s.step = 'fast'; break;
    case 'lawsuit': case 'audit': { const l = Math.round(p.cash / 2); p.cash -= l; log(s, `⚖️ ${p.name}: ${sp.name.replace('­', '')} – verliert ${fmt(l)}`); break; }
    case 'divorce': log(s, `💔 ${p.name}: Scheidung – verliert ${fmt(p.cash)}`); p.cash = 0; break;
  }
}

export const dreamCost = (s, idx) => FAST[idx].cost * (1 + (s.dreamMarks[idx] || 0));

// ---------- Aktionen ----------
export function apply(state, a, from) {
  const s = clone(state);
  s.seq++;
  const P = id => s.players.find(p => p.id === id) || fail('Spieler nicht gefunden.');
  const isHost = from == null || from === 'host';
  const own = id => { const p = P(id); if (from != null && p.owner !== from) fail('Das ist nicht dein Spieler.'); return p; };
  const cur = s.players[s.turn];
  const current = id => { const p = own(id); if (s.phase !== 'play' || cur.id !== p.id) fail('Du bist nicht am Zug.'); return p; };

  switch (a.type) {
    // ----- Lobby -----
    case 'addPlayer': {
      if (s.phase !== 'lobby') fail('Das Spiel läuft schon.');
      if (s.players.length >= 6) fail('Maximal 6 Spieler.');
      const name = String(a.name || '').trim().slice(0, 16) || `Spieler ${s.players.length + 1}`;
      const used = s.players.map(p => p.color);
      const freeDreams = DREAM_INDEXES.filter(d => !s.players.some(p => p.dream === d));
      s.players.push({ id: uid(), name, owner: from ?? 'host', color: COLORS.find(c => !used.includes(c)), dream: freeDreams[Math.floor(Math.random() * freeDreams.length)] ?? DREAM_INDEXES[0] });
      break;
    }
    case 'removePlayer': {
      if (s.phase !== 'lobby') fail('Das Spiel läuft schon.');
      const p = P(a.pid);
      if (!isHost && p.owner !== from) fail('Nur der Host darf das.');
      s.players = s.players.filter(q => q.id !== a.pid);
      break;
    }
    case 'setDream': { if (s.phase !== 'lobby') fail('Zu spät.'); own(a.pid).dream = a.dream; break; }
    case 'setColor': {
      if (s.phase !== 'lobby') fail('Zu spät.');
      if (s.players.some(p => p.color === a.color && p.id !== a.pid)) fail('Farbe ist schon vergeben.');
      own(a.pid).color = a.color; break;
    }
    case 'start': {
      if (!isHost) fail('Nur der Host kann starten.');
      if (s.phase !== 'lobby') fail('Läuft schon.');
      if (!s.players.length) fail('Mindestens ein Spieler.');
      const profs = shuffle([...PROFESSIONS]);
      s.players.forEach((p, i) => setupPlayer(p, profs[i % profs.length]));
      for (const d of Object.keys(DECKS)) s.decks[d] = shuffle([...DECKS[d].keys()]);
      s.phase = 'play';
      s.turn = Math.floor(Math.random() * s.players.length);
      s.players.forEach(p => log(s, `🎲 ${p.name} ist ${p.prof}. Startkapital: ${fmt(p.cash)}`));
      log(s, `${s.players[s.turn].name} beginnt.`);
      startTurn(s);
      break;
    }
    case 'reclaim': { // Wiederverbinden: Spieler einem neuen Gerät zuordnen
      if (!isHost) fail('Nur der Host.');
      P(a.pid).owner = a.owner; break;
    }

    // ----- Zug -----
    case 'roll': {
      const p = current(a.pid);
      if (s.step !== 'roll') fail('Jetzt nicht würfeln.');
      if (p.skip > 0) { p.skip--; log(s, `⏸ ${p.name} setzt diese Runde aus.`); nextTurn(s); break; }
      let n = p.track === 'rat' ? 1 : 2;
      if (p.track === 'rat' && p.charity > 0) { n = a.dice === 2 ? 2 : 1; p.charity--; }
      if (p.track === 'fast' && p.fastDice) n = Math.min(3, Math.max(1, a.dice || 2));
      const dice = Array.from({ length: n }, die);
      const total = dice.reduce((x, y) => x + y, 0);
      s.roll = { pid: p.id, dice, n: s.seq };
      log(s, `🎲 ${p.name} würfelt ${dice.join(' + ')}${n > 1 ? ' = ' + total : ''}`);
      if (p.track === 'rat') moveRat(s, p, total); else moveFast(s, p, total);
      break;
    }
    case 'deal': {
      const p = current(a.pid);
      if (s.step !== 'deal') fail('Jetzt kein Deal.');
      const i = draw(s, a.deck);
      s.card = { deck: a.deck, i, by: p.id, done: false };
      const card = DECKS[a.deck][i];
      log(s, `🃏 ${p.name} zieht ${a.deck === 'small' ? 'einen kleinen' : 'einen großen'} Deal: „${card.title}“`);
      immediate(s, p, card);
      s.step = 'card';
      break;
    }
    case 'buy': {
      const p = current(a.pid);
      const card = cardOf(s.card);
      if (s.step !== 'card' || !card || s.card.done) fail('Nichts zu kaufen.');
      if (card.type === 'stock') {
        const qty = Math.floor(a.qty);
        if (!(qty > 0)) fail('Anzahl eingeben.');
        charge(s, p, qty * card.price, `${qty} × ${card.sym} zu ${fmt(card.price)}`);
        const h = p.assets.find(x => x.kind === 'stock' && x.sym === card.sym);
        if (h) { h.shares += qty; h.cost += qty * card.price; }
        else p.assets.push({ id: uid(), kind: 'stock', sym: card.sym, name: `Aktie ${card.sym}`, shares: qty, cost: qty * card.price, cf: 0 });
      } else if (card.type === 'asset') {
        const price = card.kind === 'gold' ? card.units * card.unitPrice : card.price;
        const down = card.kind === 'gold' ? price : card.down;
        charge(s, p, down, `Eigenkapital für ${card.name}`);
        p.assets.push({
          id: uid(), kind: card.kind, code: card.code || null, name: card.name, units: card.units || null,
          price, nk: nebenkosten(card), down, mortgage: card.kind === 'gold' ? 0 : darlehen(card), cf: card.cf, boughtAt: p.paydays,
        });
      } else fail('Diese Karte kann man nicht kaufen.');
      s.card.done = true;
      log(s, `✅ ${p.name} kauft: ${card.title}`);
      break;
    }
    case 'sell': {
      const p = own(a.pid);
      const card = cardOf(s.card);
      if (s.phase !== 'play' || s.step !== 'card') fail('Gerade kann nicht verkauft werden.');
      const asset = p.assets.find(x => x.id === a.assetId) || fail('Vermögenswert nicht gefunden.');
      if (!sellable(card, asset)) fail('Diese Karte passt nicht.');
      if (card.type === 'stock') {
        const qty = Math.min(asset.shares, Math.floor(a.qty || asset.shares));
        if (!(qty > 0)) fail('Anzahl eingeben.');
        const { tax, used } = saleTax(p, card, asset, qty);
        const avg = asset.cost / asset.shares;
        p.cash += qty * card.price - tax;
        p.allowance -= used || 0;
        asset.shares -= qty; asset.cost = Math.round(avg * asset.shares);
        if (!asset.shares) p.assets = p.assets.filter(x => x !== asset);
        log(s, `💹 ${p.name} verkauft ${qty} × ${card.sym} für ${fmt(qty * card.price)}${tax ? ` (Abgeltungsteuer ${fmt(tax)})` : ''}`);
      } else {
        const price = salePrice(card, asset);
        const { tax, why } = saleTax(p, card, asset);
        const net = price - (asset.mortgage || 0) - tax;
        p.cash += net;
        p.assets = p.assets.filter(x => x !== asset);
        log(s, `🤝 ${p.name} verkauft ${asset.name} für ${fmt(price)}${asset.mortgage ? `, tilgt Darlehen ${fmt(asset.mortgage)}` : ''}${tax ? `, ${why}: ${fmt(tax)}` : ''} → ${net >= 0 ? '+' : ''}${fmt(net)}`);
      }
      break;
    }
    case 'charity': {
      const p = current(a.pid);
      if (s.step !== 'charity') fail('Jetzt nicht.');
      if (a.accept) {
        const amt = Math.round(totalIncome(p) * 0.1);
        if (p.cash < amt) fail(`Du brauchst ${fmt(amt)} Bargeld.`);
        p.cash -= amt; p.charity = 3;
        log(s, `💜 ${p.name} spendet ${fmt(amt)} (10 % des Einkommens) und darf 3 Runden mit 1 oder 2 Würfeln würfeln.`);
      }
      nextTurn(s);
      break;
    }
    case 'fastBuy': {
      const p = current(a.pid);
      if (s.step !== 'fast') fail('Jetzt nicht.');
      const sp = FAST[p.pos];
      if (sp.type === 'biz') {
        if (p.cash < sp.cost) fail('Nicht genug Bargeld (auf der Überholspur gibt es keine Kredite).');
        p.cash -= sp.cost; p.fast.income += sp.cf; s.fastOwners[p.pos] = p.id;
        log(s, `🏢 ${p.name} kauft ${sp.name}: +${fmt(sp.cf)} Euro-Flow-Tag-Einkommen.`);
        if (p.fast.income >= p.fast.goal) win(s, p, `+50.000 € zusätzlicher monatlicher Cashflow erreicht!`);
      } else if (sp.type === 'dream') {
        const c = dreamCost(s, p.pos);
        if (p.cash < c) fail(`Dein Traum kostet ${fmt(c)}.`);
        p.cash -= c; s.fastOwners[p.pos] = p.id;
        win(s, p, `Traum erfüllt: ${sp.name}!`);
      } else if (sp.type === 'gamble') {
        if (p.cash < sp.cost) fail('Nicht genug Bargeld.');
        p.cash -= sp.cost;
        const r = die();
        s.roll = { pid: p.id, dice: [r], n: s.seq };
        if (r >= sp.need) { p.cash += sp.payout; s.gambleDone[p.pos] = p.id; log(s, `🎯 ${p.name} würfelt ${r} – ${sp.name} ist ein Erfolg! +${fmt(sp.payout)}`); }
        else log(s, `🎲 ${p.name} würfelt ${r} – ${sp.name} scheitert. ${fmt(sp.cost)} verloren.`);
      } else if (sp.type === 'charity') {
        if (p.cash < sp.cost) fail('Nicht genug Bargeld.');
        p.cash -= sp.cost; p.fastDice = true;
        log(s, `💜 ${p.name} gründet eine Stiftung und darf ab jetzt 1, 2 oder 3 Würfel wählen.`);
      }
      if (s.phase === 'play') s.step = 'end';
      break;
    }
    case 'endTurn': {
      current(a.pid);
      if (!['card', 'end', 'fast', 'deal'].includes(s.step)) fail('Erst würfeln.');
      nextTurn(s);
      break;
    }
    case 'loan': {
      const p = own(a.pid);
      if (p.track !== 'rat') fail('Auf der Überholspur gibt es keine Bankkredite.');
      const amt = Math.round(a.amount / 1000) * 1000;
      if (!(amt > 0)) fail('Kredite nur in 1.000-€-Schritten.');
      p.loan += amt; p.cash += amt;
      log(s, `🏦 ${p.name} nimmt ${fmt(amt)} Bankkredit auf (+${fmt(amt / 10)}/Monat Zinsen).`);
      break;
    }
    case 'repay': {
      const p = own(a.pid);
      if (a.which === 'loan') {
        const amt = Math.min(p.loan, Math.round(a.amount / 1000) * 1000);
        if (!(amt > 0)) fail('Betrag in 1.000-€-Schritten.');
        if (p.cash < amt) fail('Nicht genug Bargeld.');
        p.loan -= amt; p.cash -= amt;
        log(s, `✔️ ${p.name} tilgt ${fmt(amt)} Bankkredit.`);
      } else {
        const d = p.debts[a.which];
        if (!d || !d.bal) fail('Keine Schulden.');
        if (p.cash < d.bal) fail(`Du brauchst ${fmt(d.bal)} um ${DEBT_LABELS[a.which]} komplett abzulösen.`);
        p.cash -= d.bal;
        log(s, `✔️ ${p.name} löst ${DEBT_LABELS[a.which]} komplett ab (${fmt(d.bal)}): −${fmt(d.pay)}/Monat Ausgaben.`);
        d.bal = 0; d.pay = 0;
      }
      break;
    }
    default: fail('Unbekannte Aktion.');
  }
  return s;
}
