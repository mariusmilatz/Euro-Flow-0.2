// Euro Flow – English (default) and German texts.
// Every UI string lives here as key: [English, German]. Add a language by adding a third column.
import { SMALL, BIG, MARKET, DOODADS, FAST, PROFESSIONS, STOCKS } from './data.js';
import { PROF_EN, STOCKS_EN, SMALL_EN, BIG_EN, MARKET_EN, DOODADS_EN, FAST_EN } from './data_en.js';

const DECK_DE = { small: SMALL, big: BIG, market: MARKET, doodad: DOODADS };
const DECK_EN = { small: SMALL_EN, big: BIG_EN, market: MARKET_EN, doodad: DOODADS_EN };

let lang = 'en';
try { lang = localStorage.getItem('euroflow-lang') || 'en'; } catch { /* ignore */ }
export const getLang = () => lang;
export function setLang(l) { lang = l; try { localStorage.setItem('euroflow-lang', l); } catch { /* ignore */ } document.documentElement.lang = l; }
const col = () => (lang === 'de' ? 1 : 0);

export const fmt = n => {
  const v = Math.abs(Math.round(n));
  const sign = n < 0 ? '−' : '';
  return lang === 'de' ? `${sign}${v.toLocaleString('de-DE')} €` : `${sign}€${v.toLocaleString('en-GB')}`;
};
export const sfmt = n => (n >= 0 ? '+' : '') + fmt(n);

// ---------- Names of cards, spaces, jobs ----------
export function cardT(deck, i) {
  const de = DECK_DE[deck][i];
  if (lang === 'de') return { title: de.title, text: de.text, name: de.name || de.title };
  const [title, text, name] = DECK_EN[deck][i] || [];
  let t = title;
  if (!t && de.type === 'stock') t = `Stock – ${stockName(de.sym)}`;
  if (!t && de.type === 'split') t = `${de.ratio > 1 ? 'Stock split' : 'Reverse split'} – ${stockName(de.sym)}`;
  return { title: t || de.title, text: text || de.text, name: name || t || de.name };
}
export const stockName = sym => (lang === 'en' && STOCKS_EN[sym].name) || STOCKS[sym].name;
export const stockWhat = sym => (lang === 'en' ? STOCKS_EN[sym].what : STOCKS[sym].what);
export const fastName = i => (lang === 'de' ? FAST[i].name.replace('­', '') : FAST_EN[i][0]);
export const fastText = i => (lang === 'de' ? FAST[i].text : FAST_EN[i][1]) || '';
export const profName = key => (lang === 'de' ? PROFESSIONS.find(p => p.key === key)?.name : PROF_EN[key]) || key;
export const assetName = a => (a.kind === 'stock' ? `${t('stockWord')} ${a.sym}` : a.ref ? cardT(a.ref[0], a.ref[1]).name : '?');

// Turn a log/error params object into text
function param(key, v) {
  if (v == null) return '';
  if (Array.isArray(v)) return key === 'cardName' ? cardT(v[0], v[1]).name : cardT(v[0], v[1]).title;
  if (typeof v !== 'object') return String(v);
  if ('m' in v) return fmt(v.m);
  if ('sm' in v) return sfmt(v.sm);
  if (v.card) return cardT(v.card[0], v.card[1]).title;
  if ('fast' in v) return fastName(v.fast);
  if (v.asset) return assetName(v.asset);
  if (v.prof) return profName(v.prof);
  if (v.k) return t(v.k, v.p);
  return '';
}
export function t(key, params) {
  const e = S[key];
  let s = e ? (e[col()] ?? e[0]) : key;
  if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => {
    if (k === 'fast' && typeof params.fast === 'number') return fastName(params.fast);
    return param(k, params[k]);
  });
  return s;
}
export const logLine = ([key, params]) => t(key, params);

// ---------- Strings ----------
const S = {
  // Start / lobby
  tagline: ['Escape the hamster wheel – get on the fast track!', 'Raus aus dem Hamsterrad – rauf auf die Überholspur!'],
  yourName: ['Your name', 'Dein Name'],
  namePh: ['e.g. Marius', 'z. B. Marius'],
  invited: ['You’ve been invited! Enter your name and click <b>Join</b>.', 'Du wurdest eingeladen! Gib deinen Namen ein und klicke auf <b>Beitreten</b>.'],
  playOnline: ['🌐 Play online', '🌐 Online spielen'],
  createGame: ['Create game', 'Spiel erstellen'],
  join: ['Join', 'Beitreten'],
  onlineHint: ['Create a game and send your friends the link – Mac, PC, tablet or phone.', 'Erstelle ein Spiel und schick deinen Freunden den Link – Mac, PC, Tablet oder Handy.'],
  playLocal: ['🖥️ On this device', '🖥️ An diesem Gerät'],
  localBtn: ['Play here (vs. computer)', 'Hier spielen (gegen Computer)'],
  localHint: ['Play alone against computer players, or pass the mouse around with friends.', 'Spiel allein gegen Computer-Gegner oder gebt die Maus am selben Bildschirm weiter.'],
  resume: ['↺ Continue last game', '↺ Letztes Spiel fortsetzen'],
  rulesLink: ['📖 Rules & what’s German about it?', '📖 Spielregeln & was ist „deutsch“ daran?'],
  rules: ['📖 Rules', '📖 Regeln'],
  menu: ['⏏ Menu', '⏏ Menü'],
  connecting: ['Connecting …', 'Verbinde …'],
  roomCode: ['Room code:', 'Raum-Code:'],
  copyLink: ['Copy link', 'Link kopieren'],
  linkCopied: ['Link copied!', 'Link kopiert!'],
  inviteHint: ['Send this link to your friends. They open it, enter their name – done.', 'Schick diesen Link an deine Mitspieler. Sie öffnen ihn, geben ihren Namen ein – fertig.'],
  players: ['Players', 'Spieler'],
  noPlayers: ['No players yet.', 'Noch keine Spieler.'],
  addHuman: ['+ Human', '+ Mensch'],
  addHumanPh: ['Name of another player on this device', 'Name eines weiteren Spielers an diesem Gerät'],
  addBot: ['+ Computer', '+ Computer'],
  botLevel: ['Computer level', 'Computer-Stärke'],
  lvl_easy: ['Easy', 'Leicht'],
  lvl_medium: ['Medium', 'Mittel'],
  lvl_hard: ['Hard (plays like a real person)', 'Schwer (spielt wie ein echter Mensch)'],
  lvlShort_easy: ['easy', 'leicht'], lvlShort_medium: ['medium', 'mittel'], lvlShort_hard: ['hard', 'schwer'],
  human: ['Human', 'Mensch'],
  computer: ['Computer', 'Computer'],
  dream: ['Dream:', 'Traum:'],
  you: ['(you)', '(du)'],
  lobbyHint: ['Everyone picks a dream ★. Jobs are dealt randomly at the start. Then everyone rolls to see who goes first.', 'Jeder wählt einen Traum ★. Die Berufe werden beim Start zufällig verteilt. Danach würfeln alle, wer anfängt.'],
  startGame: ['Start game ➜', 'Spiel starten ➜'],
  waitHost: ['Waiting for the host to start the game …', 'Warte, bis der Host das Spiel startet …'],
  assistOpt: ['🐹 Coach: explains cards, what just happened and your options', '🐹 Coach: erklärt Karten, was passiert ist und deine Möglichkeiten'],
  coachOn: ['🐹 Coach: ON', '🐹 Coach: AN'],
  coachOff: ['🐹 Coach: OFF', '🐹 Coach: AUS'],
  remove: ['Remove', 'Entfernen'],
  color: ['Colour', 'Farbe'],
  leaveConfirm: ['Leave the game? (The game is saved.)', 'Spiel verlassen? (Der Spielstand bleibt gespeichert.)'],
  lostConn: ['Lost connection to the host. Reload the page to reconnect.', 'Verbindung zum Host verloren. Seite neu laden zum Wiederverbinden.'],
  disconnected: ['🔴 disconnected', '🔴 getrennt'],
  enterCode: ['Please enter a room code.', 'Bitte Raum-Code eingeben.'],
  roomFail: ['Could not create online room: ', 'Online-Raum konnte nicht erstellt werden: '],
  roomTaken: ['This room code is already taken.', 'Dieser Raum-Code ist schon vergeben.'],
  roomNotFound: ['Room not found. Check the code – is the host still online?', 'Raum nicht gefunden. Code prüfen – ist der Host noch online?'],
  netLocal: ['🖥️ Local game', '🖥️ Lokales Spiel'],
  netHost: ['🟢 Host · room {code} · {n} connected', '🟢 Host · Raum {code} · {n} verbunden'],
  netClient: ['🟢 Online · room {code}', '🟢 Online · Raum {code}'],
  guest: ['Guest', 'Gast'],

  // Turn order
  orderTitle: ['Who goes first?', 'Wer fängt an?'],
  orderHint: ['Everyone rolls one die. Highest number starts. Ties roll again.', 'Alle würfeln einmal. Die höchste Zahl beginnt. Bei Gleichstand wird neu gewürfelt.'],
  rollForOrder: ['🎲 Roll', '🎲 Würfeln'],
  waiting: ['waiting …', 'wartet …'],
  rerolls: ['rolls again', 'würfelt neu'],

  // Turn panel
  isTurn: ['<b>{name}</b>’s turn', '<b>{name}</b> ist am Zug'],
  ratRace: ['Hamster wheel', 'Hamsterrad'],
  fastTrack: ['Fast track', 'Überholspur'],
  start: ['Start', 'Start'],
  waitFor: ['Waiting for <b style="color:{color}">{name}</b> …', 'Warte auf <b style="color:{color}">{name}</b> …'],
  walking: ['🚶 {name} is moving …', '🚶 {name} zieht …'],
  botThinking: ['🤖 {name} is thinking …', '🤖 {name} überlegt …'],
  skipBtn: ['⏸ Miss this turn ({n})', '⏸ Runde aussetzen ({n})'],
  charityDice: ['Charity active ({n} turns): choose your dice.', 'Spende aktiv ({n} Runden): wähle die Würfel.'],
  oneDie: ['🎲 1 die', '🎲 1 Würfel'], twoDice: ['🎲🎲 2 dice', '🎲🎲 2 Würfel'],
  roll: ['🎲 Roll', '🎲 Würfeln'],
  dealQ: ['Opportunity! Which deal do you want to draw?', 'Chance! Welchen Deal willst du ziehen?'],
  smallDeal: ['Small deal', 'Kleiner Deal'], bigDeal: ['Big deal', 'Großer Deal'],
  upTo5k: ['up to €5,000', 'bis 5.000 €'], from6k: ['from €6,000', 'ab 6.000 €'],
  noDeal: ['No deal – end turn', 'Kein Deal – Zug beenden'],
  charityQ: ['💜 Donate 10 % of your total income ({amt}) and roll 1 or 2 dice for the next 3 turns.', '💜 Spende 10 % deines Gesamteinkommens ({amt}) und würfle die nächsten 3 Runden mit 1 oder 2 Würfeln.'],
  donate: ['Donate', 'Spenden'], noThanks: ['No thanks', 'Nein danke'],
  buy: ['Buy', 'Kaufen'], pass: ['Pass', 'Passen'],
  bizOffer: ['🏢 <b>{fast}</b><br>Price {cost} · +{cf}/month', '🏢 <b>{fast}</b><br>Preis {cost} · +{cf}/Monat'],
  dreamOffer: ['{icon} Your dream: <b>{fast}</b> – now costs {cost}', '{icon} Dein Traum: <b>{fast}</b> – kostet jetzt {cost}'],
  buyDream: ['Buy dream & win!', 'Traum kaufen & gewinnen!'], notYet: ['Not yet', 'Noch nicht'],
  invest: ['Invest & roll', 'Investieren & würfeln'],
  foundationBtn: ['Start foundation', 'Stiftung gründen'],
  endTurn: ['End turn ➜', 'Zug beenden ➜'],
  gameOver: ['Game over', 'Spiel beendet'],

  // Card
  deck_small: ['Small Deal', 'Kleiner Deal'], deck_big: ['Big Deal', 'Großer Deal'], deck_market: ['The Market', 'Der Markt'], deck_doodad: ['Doodads', 'Schnickschnack'],
  drawnBy: ['drawn by', 'gezogen von'],
  bought: ['✅ Bought', '✅ Gekauft'],
  boughtBy: ['✅ {name} bought it.', '✅ {name} hat gekauft.'],
  declinedBy: ['❌ {name} didn’t buy it.', '❌ {name} hat nicht gekauft.'],
  cardResult: ['What happened:', 'Was passiert ist:'],
  clickToContinue: ['👆 Click anywhere on the board to close and continue.', '👆 Klicke irgendwo aufs Spielbrett, um zu schließen und weiterzuspielen.'],
  sellTotal: ['Total {amt} · profit {profit} · tax {tax} → you get <b>{net}</b>', 'Gesamt {amt} · Gewinn {profit} · Steuer {tax} → du bekommst <b>{net}</b>'],
  logBtn: ['📜 Log', '📜 Verlauf'],
  backToMe: ['← My statement', '← Mein Finanzbericht'],
  shares: ['shares', 'Aktien'],
  costLine: ['Cost: {cost} · Cash: {cash}', 'Kosten: {cost} · Bargeld: {cash}'],
  buyFor: ['Buy for {amt}', 'Kaufen für {amt}'],
  inclLoan: ['(incl. {amt} bank loan)', '(inkl. {amt} Bankkredit)'],
  sell: ['Sell', 'Verkaufen'],
  keepIt: ['{name}: keep it (don’t sell)', '{name}: behalten (nicht verkaufen)'],
  avg: ['avg', 'Ø'],
  loanMinus: ['loan −{amt}', 'Darlehen −{amt}'],
  taxMinus: ['tax −{amt}', 'Steuer −{amt}'],
  cSymbol: ['Symbol', 'Symbol'], cCompany: ['Company', 'Firma'], cToday: ['Price today', 'Kurs heute'], cRange: ['Usual range', 'Üblicher Kurs'],
  cDividend: ['Dividend', 'Dividende'], none: ['none', 'keine'],
  cStockFine: ['Only the player who drew the card may buy. Everyone may sell at this price. Profits are taxed 26.375 % (Abgeltungsteuer), €1,000 per year tax-free.', 'Nur wer die Karte zieht, darf kaufen. Alle dürfen zu diesem Kurs verkaufen. Gewinne kosten 26,375 % Abgeltungsteuer (Sparerpauschbetrag 1.000 €/Jahr).'],
  cAmount: ['Amount', 'Menge'], coins: ['{n} coins', '{n} Münzen'], perCoin: ['Price per coin', 'Preis je Münze'], total: ['Total', 'Gesamt'],
  cPrice: ['Price', 'Kaufpreis'], cNk: ['Purchase costs 7 %', 'Kaufnebenkosten 7 %'], cEquity: ['Your cash (down payment)', 'Eigenkapital'], cCapital: ['Capital needed', 'Kapitaleinsatz'],
  cMortgage: ['Bank mortgage', 'Bankdarlehen'], cLiability: ['Liability', 'Verbindlichkeit'], cCf: ['Cash flow / month', 'Cashflow / Monat'],
  cNkFine: ['Purchase costs = real-estate transfer tax (Grunderwerbsteuer), notary & land register. Selling at a profit within 10 years → speculation tax.', 'Kaufnebenkosten = Grunderwerbsteuer, Notar & Grundbuch. Verkauf mit Gewinn innerhalb von 10 Jahren → Spekulationssteuer.'],
  cBuyerPays: ['Buyer pays', 'Käufer zahlt'], perUnitCoin: ['{amt} per coin', '{amt} pro Münze'], perUnitFlat: ['{amt} per unit', '{amt} pro Wohneinheit'], multPrice: ['{n}× purchase price', '{n}× Kaufpreis'],
  cSellFine: ['Everyone who owns this may sell now. The loan is repaid from the proceeds.', 'Jeder, der so etwas besitzt, darf jetzt verkaufen. Das Darlehen wird vom Erlös abgelöst.'],

  // Player sheet
  passiveOf: ['Passive {pas} / {exp}', 'Passiv {pas} / {exp}'],
  out: ['out', 'ausgeschieden'],
  skipsN: ['misses {n}×', 'setzt {n}× aus'],
  charityN: ['💜 {n}× 2 dice', '💜 {n}× 2 Würfel'],
  cash: ['Cash', 'Bargeld'], paydayCf: ['Payday (cash flow)', 'Zahltag (Cashflow)'], kids: ['Children', 'Kinder'],
  progress: ['Passive income {pas} / expenses {exp} – {rest}', 'Passives Einkommen {pas} / Ausgaben {exp} – {rest}'],
  escape: ['Escape the hamster wheel! 🚀', 'Raus aus dem Hamsterrad! 🚀'],
  stillNeed: ['{amt} to go', 'noch {amt}'],
  income: ['Income', 'Einnahmen'], expenses: ['Expenses', 'Ausgaben'], assets: ['Assets', 'Vermögen'], liabilities: ['Liabilities', 'Verbindlichkeiten'],
  salary: ['Gross salary', 'Bruttogehalt'], kindergeld: ['Child benefit / Kindergeld ({n} × {amt})', 'Kindergeld ({n} × {amt})'],
  noAssets: ['No assets yet. Buy things that put money in your pocket!', 'Noch keine Vermögenswerte. Kaufe Dinge, die dir Geld bringen!'],
  pcs: ['{n} pcs · avg {amt}', '{n} Stk. · Ø {amt}'], coinsVal: ['{n} coins · {amt}', '{n} Münzen · {amt}'],
  priceLoan: ['Price {price} · loan {loan}', 'Preis {price} · Darlehen {loan}'], priceOnly: ['Price {price}', 'Preis {price}'],
  perMonth: ['{amt}/month', '{amt}/Monat'],
  payOff: ['Pay off', 'Ablösen'], payOffTitle: ['Pay off completely', 'Komplett ablösen'],
  bankLoan: ['Bank loan', 'Bankkredit'], interestMonth: ['{amt}/month interest', '{amt}/Monat Zinsen'],
  takeLoan: ['Take loan', 'Kredit aufnehmen'], repay: ['Repay', 'Tilgen'],
  allowanceLeft: ['Tax-free capital gains left this year: {amt} · Paydays: {n}', 'Freibetrag für Kapitalerträge übrig: {amt} · Zahltage: {n}'],
  ftIncome: ['Euro Flow Day', 'Euro-Flow-Tag'], goal: ['Goal', 'Ziel'],
  ftProgress: ['{amt} of €50,000 extra cash flow', '{amt} von 50.000 € zusätzlichem Cashflow'],
  ftDream: ['Dream', 'Traum'], businesses: ['Businesses', 'Unternehmen'], noneYet: ['None yet.', 'Noch keine.'],
  ftFine: ['Win by buying your dream or adding €50,000 to your Euro Flow Day income. No bank loans on the fast track.', 'Gewinne, indem du deinen Traum kaufst oder dein Euro-Flow-Tag-Einkommen um 50.000 € steigerst. Keine Bankkredite auf der Überholspur.'],
  log: ['Game log', 'Spielverlauf'],
  wins: ['{name} wins!', '{name} gewinnt!'],
  newGame: ['New game', 'Neues Spiel'], viewBoard: ['View board', 'Brett ansehen'],
  stockWord: ['Stock', 'Aktie'],
  // expense lines
  exTax: ['Income tax & solidarity surcharge', 'Lohnsteuer & Soli'],
  exSv: ['Social insurance (pension, health, care, unemployment)', 'Sozialversicherung'],
  exPkv: ['Private health insurance', 'Private Krankenversicherung'],
  exRent: ['Rent (incl. utilities)', 'Miete (warm)'],
  exOther: ['Living costs (food, phone, insurance …)', 'Lebenshaltung (Essen, Handy, Versicherungen …)'],
  exKids: ['Children ({n} × {amt})', 'Kinder ({n} × {amt})'],
  exLoan: ['Bank loan interest (10 %/month)', 'Bankkredit-Zinsen (10 %/Monat)'],
  debt_baufi: ['Home mortgage (Baufinanzierung)', 'Baufinanzierung (Eigenheim)'],
  debt_bafoeg: ['Student loan (BAföG)', 'BAföG-Darlehen'],
  debt_auto: ['Car loan', 'Autokredit'],
  debt_karte: ['Credit card / overdraft (Dispo)', 'Kreditkarte / Dispo'],
  debt_raten: ['Instalment purchases (0 % financing)', 'Ratenkäufe (0 %-Finanzierung)'],
  // spaces
  sp_deal: ['Opportunity (deal)', 'Chance (Deal)'], sp_doodad: ['Doodads', 'Schnickschnack'], sp_market: ['Market', 'Markt'], sp_payday: ['Payday', 'Zahltag'],
  sp_charity: ['Charity', 'Spende'], sp_baby: ['Baby', 'Baby'], sp_downsized: ['Fired', 'Gekündigt'],

  // Log
  lAutoLoan: ['🏦 {name} automatically takes a {amt} bank loan.', '🏦 {name} nimmt automatisch {amt} Bankkredit auf.'],
  lPays: ['💸 {name} pays {amt} – {why}', '💸 {name} zahlt {amt} – {why}'],
  lPayday: ['💰 Payday for {name}: {amt}', '💰 Zahltag für {name}: {amt}'],
  lBankrupt: ['⚠️ {name} can’t pay – personal bankruptcy!', '⚠️ {name} ist zahlungsunfähig – Privatinsolvenz!'],
  lBankTakes: ['   The bank takes over {asset} for {amt}', '   Bank übernimmt {asset} für {amt}'],
  lHalfDebt: ['   Half of the consumer debt is forgiven.', '   Die Hälfte der Konsumschulden wird erlassen.'],
  lRestForgiven: ['   Remaining debt of {amt} is forgiven in the insolvency procedure.', '   Restschuld von {amt} wird im Insolvenzverfahren erlassen.'],
  lOut: ['❌ {name} is out of the game.', '❌ {name} scheidet aus dem Spiel aus.'],
  lSkip3: ['   {name} misses 3 turns.', '   {name} setzt 3 Runden aus.'],
  lEnterFast: ['🚀 {name} escaped the hamster wheel! Euro Flow Day income: {amt} (100 × passive income). Goal: {goal}.', '🚀 {name} ist raus aus dem Hamsterrad! Euro-Flow-Tag-Einkommen: {amt} (100 × passives Einkommen). Ziel: {goal}.'],
  lWins: ['🏆 {name} wins: {reason}', '🏆 {name} gewinnt: {reason}'],
  winGoal: ['€50,000 extra monthly cash flow reached!', '+50.000 € zusätzlicher monatlicher Cashflow erreicht!'],
  winDream: ['Dream come true: {fast}!', 'Traum erfüllt: {fast}!'],
  lAllOut: ['All players are out.', 'Alle Spieler sind ausgeschieden.'],
  lNoKids: ['{name} has no children – nothing to pay.', '{name} hat keine Kinder – nichts zu zahlen.'],
  lFinance: ['🧾 {name}: {card} – debt +{amt}, expenses +{pay}/month', '🧾 {name}: {card} – Schulden +{amt}, Ausgaben +{pay}/Monat'],
  lRentUp: ['🏠 {name}: rent +{amt}/month', '🏠 {name}: Miete +{amt}/Monat'],
  lOwner: ['{name} owns their home – not affected.', '{name} wohnt im Eigentum – nicht betroffen.'],
  lNotAffected: ['{name} is not affected.', '{name} ist nicht betroffen.'],
  lGain: ['🎉 {name} receives {amt} – {card}', '🎉 {name} erhält {amt} – {card}'],
  lSplit: ['📈 {name} now owns {n} {sym} shares.', '📈 {name} hat jetzt {n} {sym}-Aktien.'],
  lCfChange: ['📊 {name}: {asset} cash flow {cf}', '📊 {name}: {asset} Cashflow {cf}'],
  lDraws: ['🃏 {name} draws “{card}”', '🃏 {name} zieht „{card}“'],
  lBaby: ['👶 {name} has a baby! +{amt} expenses, +{kg} child benefit.', '👶 {name} bekommt ein Baby! +{amt} Ausgaben, +{kg} Kindergeld.'],
  lBaby3: ['👶 {name} already has 3 children – no more babies.', '👶 {name} hat schon 3 Kinder – kein weiteres Baby.'],
  lFired: ['📉 {name} was fired! Unemployment benefit (60 % of net pay) = {amt}.', '📉 {name} wurde gekündigt! Arbeitslosengeld I (60 % vom Netto) = {amt}.'],
  whyFired: ['expenses minus unemployment benefit', 'Ausgaben minus Arbeitslosengeld'],
  whyStock: ['{qty} × {sym} at {price}', '{qty} × {sym} zu {price}'],
  whyEquity: ['down payment for {cardName}', 'Eigenkapital für {cardName}'],
  lReturnCash: ['🏦 {name} returns the rat-race cash ({amt}) to the bank.', '🏦 {name} gibt das Bargeld aus dem Hamsterrad ({amt}) an die Bank zurück.'],
  lOwnBiz: ['{name} lands on their own business: {fast}.', '{name} landet auf dem eigenen Unternehmen: {fast}.'],
  lBizFee: ['💼 {name} lands on {owner}’s business ({fast}) and pays {owner} {amt}.', '💼 {name} landet auf dem Unternehmen von {owner} ({fast}) und zahlt {owner} {amt}.'],
  lBuysDream: ['✨ {name} buys an extra dream: {fast} for {amt}.', '✨ {name} kauft einen weiteren Traum: {fast} für {amt}.'],
  savingsNote: ['Savings of {amt} were paid out once at the start.', 'Ersparnisse von {amt} wurden einmalig beim Start ausgezahlt.'],
  dreamOfferOther: ['{icon} <b>{fast}</b> is nobody’s dream yet – buy it as an extra dream for {cost}? (Doesn’t win the game – only your own dream ★ does.)', '{icon} <b>{fast}</b> ist noch niemandes Traum – als zusätzlichen Traum für {cost} kaufen? (Gewinnt nicht – nur dein eigener Traum ★.)'],
  buyExtraDream: ['Buy extra dream', 'Zusätzlichen Traum kaufen'],
  lCfDay: ['💶 Euro Flow Day: {name} receives {amt}', '💶 Euro-Flow-Tag: {name} erhält {amt}'],
  lOwnedBy: ['{fast} already belongs to {owner}.', '{fast} gehört schon {owner}.'],
  lDreamMark: ['😈 {name} lands on someone else’s dream: “{fast}” now costs its owner {amt} more!', '😈 {name} landet auf einem fremden Traum: „{fast}“ wird für dessen Besitzer um {amt} teurer!'],
  lGambleTaken: ['{fast}: this chance is already taken.', '{fast}: Die Chance ist schon vergeben.'],
  lLoseHalf: ['⚖️ {name}: {fast} – loses {amt}', '⚖️ {name}: {fast} – verliert {amt}'],
  lDivorce: ['💔 {name}: divorce – loses {amt}', '💔 {name}: Scheidung – verliert {amt}'],
  lProfIs: ['🎲 {name} is a {prof}. Starting cash: {amt}', '🎲 {name} ist {prof}. Startkapital: {amt}'],
  lOrderStart: ['🎲 Everyone rolls to decide who goes first.', '🎲 Alle würfeln, wer anfängt.'],
  lOrderRoll: ['🎲 {name} rolls {r} for the starting order.', '🎲 {name} würfelt eine {r} für die Startreihenfolge.'],
  lOrderTie: ['🔁 Tie at {r}! {names} roll again.', '🔁 Gleichstand bei {r}! {names} würfeln neu.'],
  lStarts: ['▶️ {name} goes first.', '▶️ {name} beginnt.'],
  lSkipTurn: ['⏸ {name} misses this turn.', '⏸ {name} setzt diese Runde aus.'],
  lRolls: ['🎲 {name} rolls {dice}', '🎲 {name} würfelt {dice}'],
  lDrawsDeal: ['🃏 {name} draws a {size}: “{card}”', '🃏 {name} zieht {size}: „{card}“'],
  aSmallDeal: ['small deal', 'einen kleinen Deal'], aBigDeal: ['big deal', 'einen großen Deal'],
  lBuys: ['✅ {name} buys: {card}', '✅ {name} kauft: {card}'],
  lSellsStock: ['💹 {name} sells {qty} × {sym} for {amt} (tax {tax})', '💹 {name} verkauft {qty} × {sym} für {amt} (Steuer {tax})'],
  lSellsAsset: ['🤝 {name} sells {asset} for {price} (loan repaid {mort}, tax {tax}) → {net}', '🤝 {name} verkauft {asset} für {price} (Darlehen {mort}, Steuer {tax}) → {net}'],
  lDonates: ['💜 {name} donates {amt} (10 % of income) and may roll 1 or 2 dice for 3 turns.', '💜 {name} spendet {amt} (10 % des Einkommens) und darf 3 Runden mit 1 oder 2 Würfeln würfeln.'],
  lBuysBiz: ['🏢 {name} buys {fast}: +{cf} Euro Flow Day income.', '🏢 {name} kauft {fast}: +{cf} Euro-Flow-Tag-Einkommen.'],
  lGambleWin: ['🎯 {name} rolls {r} – {fast} is a success! +{amt}', '🎯 {name} würfelt {r} – {fast} ist ein Erfolg! +{amt}'],
  lGambleLose: ['🎲 {name} rolls {r} – {fast} fails. {amt} lost.', '🎲 {name} würfelt {r} – {fast} scheitert. {amt} verloren.'],
  lFoundation: ['💜 {name} starts a foundation and may now choose 1, 2 or 3 dice.', '💜 {name} gründet eine Stiftung und darf ab jetzt 1, 2 oder 3 Würfel wählen.'],
  lLoan: ['🏦 {name} takes a {amt} bank loan (+{pay}/month interest).', '🏦 {name} nimmt {amt} Bankkredit auf (+{pay}/Monat Zinsen).'],
  lRepayLoan: ['✔️ {name} repays {amt} of the bank loan.', '✔️ {name} tilgt {amt} Bankkredit.'],
  lRepayDebt: ['✔️ {name} pays off {debt} completely ({amt}): −{pay}/month expenses.', '✔️ {name} löst {debt} komplett ab ({amt}): −{pay}/Monat Ausgaben.'],
  taxAbgeltung: ['capital gains tax + Soli (26.375 %)', 'Abgeltungsteuer + Soli (26,375 %)'],
  taxSpekuImmo: ['speculation tax (sold within 10 years)', 'Spekulationssteuer (Verkauf innerhalb von 10 Jahren)'],
  taxSpekuGold: ['speculation tax (gold held < 1 year)', 'Spekulationssteuer (Gold kürzer als 1 Jahr gehalten)'],

  // Errors
  errNotFound: ['Player not found.', 'Spieler nicht gefunden.'],
  errNotYours: ['That is not your player.', 'Das ist nicht dein Spieler.'],
  errNotTurn: ['It’s not your turn.', 'Du bist nicht am Zug.'],
  errRunning: ['The game is already running.', 'Das Spiel läuft schon.'],
  errMax6: ['Maximum 6 players.', 'Maximal 6 Spieler.'],
  errOnlyHost: ['Only the host can do that.', 'Nur der Host darf das.'],
  errMin1: ['Add at least one player.', 'Mindestens ein Spieler.'],
  errNoRollNow: ['You can’t roll now.', 'Jetzt nicht würfeln.'],
  errNoDeal: ['No deal right now.', 'Jetzt kein Deal.'],
  errNothingToBuy: ['Nothing to buy.', 'Nichts zu kaufen.'],
  errEnterQty: ['Enter a quantity.', 'Anzahl eingeben.'],
  errCantBuy: ['This card can’t be bought.', 'Diese Karte kann man nicht kaufen.'],
  errCantSellNow: ['You can’t sell right now.', 'Gerade kann nicht verkauft werden.'],
  errAssetNF: ['Asset not found.', 'Vermögenswert nicht gefunden.'],
  errCardNoMatch: ['This card doesn’t match.', 'Diese Karte passt nicht.'],
  errNotNow: ['Not now.', 'Jetzt nicht.'],
  errNeedCash: ['You need {amt} in cash.', 'Du brauchst {amt} Bargeld.'],
  errFastCash: ['Not enough cash (no bank loans on the fast track).', 'Nicht genug Bargeld (auf der Überholspur gibt es keine Kredite).'],
  errDreamCost: ['Your dream costs {amt}.', 'Dein Traum kostet {amt}.'],
  errFirstRoll: ['Roll first.', 'Erst würfeln.'],
  errNoLoanFast: ['No bank loans on the fast track.', 'Auf der Überholspur gibt es keine Bankkredite.'],
  errLoanSteps: ['Loans only in steps of €1,000.', 'Kredite nur in 1.000-€-Schritten.'],
  errNoDebt: ['No debt there.', 'Keine Schulden.'],
  errUnknown: ['Unknown action.', 'Unbekannte Aktion.'],
  errColorTaken: ['That colour is taken.', 'Farbe ist schon vergeben.'],
  errTooLate: ['Too late.', 'Zu spät.'],
  errAlreadyRolled: ['Already rolled.', 'Schon gewürfelt.'],

  // Board
  bBig: ['BIG DEAL', 'GROSSER DEAL'], bSmall: ['SMALL DEAL', 'KLEINER DEAL'], bChance: ['OPPORTUNITY', 'CHANCE'],
  bMarket: ['MARKET', 'MARKT'], bThe: ['THE', 'DER'], bDoodads: ['DOODADS', 'SCHNICKSCHNACK'], bTrap: ['SPENDING TRAP', 'KONSUMFALLE'],
  bDreamWaits: ['Your dream is waiting …', 'Dein Traum wartet …'], bOnFast: ['… on the fast track', '… auf der Überholspur'],
  bOutOf: ['ESCAPE THE', 'RAUS AUS DEM'], bWheel: ['HAMSTER WHEEL!', 'HAMSTERRAD!'], bStart: ['◀ START', '◀ START'],
  r_deal: ['BIG DEAL|OPPORTUNITY|SMALL DEAL', 'GROSSER DEAL|CHANCE|KLEINER DEAL'], r_doodad: ['DOODADS', 'SCHNICK-|SCHNACK'],
  r_market: ['MARKET', 'MARKT'], r_payday: ['PAYDAY!', 'ZAHLTAG!'], r_charity: ['CHARITY', 'SPENDE'], r_baby: ['BABY!', 'BABY!'], r_downsized: ['FIRED!', 'GEKÜN-|DIGT!'],
  bCfDay: ['EURO FLOW|DAY', 'EURO-FLOW|TAG'], bFoundation: ['START A|FOUNDATION', 'STIFTUNG|GRÜNDEN'],
  bMonth: ['/mo', '/Mon.'], bStake: ['Stake {amt}', 'Einsatz {amt}'], bOnly6: ['only 6', 'nur 6'],
  bOwnedBy: ['owned by {name}', 'gehört {name}'], bDreamOf: ['Dream of {name} – now costs {amt}', 'Traum von {name} – kostet jetzt {amt}'],
};

// Merge extra strings (coach) from other modules
export function addStrings(obj) { Object.assign(S, obj); }

export const RULES = {
  en: `
<h2>How to play Euro Flow</h2>
<p><b>Goal:</b> escape the <b>hamster wheel</b> (inner circle) by making your <b>passive income</b> (rent, businesses, interest) bigger than your <b>monthly expenses</b>. Then you move onto the <b>fast track</b> (outer ring).</p>
<p><b>Start:</b> everyone gets a random job and receives their monthly cash flow plus savings (savings are paid only once). Then everyone rolls one die – the highest number goes first (ties roll again). Play goes clockwise.</p>
<h3>Hamster wheel</h3>
<ul>
<li><b>Opportunity (green):</b> draw a small deal (up to €5,000) or a big deal (€6,000+). Buying is optional.</li>
<li><b>Market (pink):</b> buyers for property, gold and businesses – or events. <i>Every</i> player who owns the matching thing may sell.</li>
<li><b>Doodads (blue):</b> spending you must pay. If you lack cash, the bank automatically lends it.</li>
<li><b>Payday (yellow):</b> landing on or passing it pays your monthly cash flow.</li>
<li><b>Charity:</b> donate 10 % of your income → roll 1 or 2 dice for 3 turns.</li>
<li><b>Baby:</b> higher expenses – but also child benefit (max. 3 children).</li>
<li><b>Fired:</b> pay your expenses minus unemployment benefit and miss 2 turns.</li>
<li><b>Bank loan:</b> any time in steps of €1,000, 10 % interest per month (game rule). Paying off debt lowers your expenses.</li>
</ul>
<h3>Fast track</h3>
<ul>
<li>You give your rat-race cash back to the bank and start with your buyout: <b>100 × your passive income</b>. That is also your Euro Flow Day income.</li><li>Roll 2 dice. Landing on or passing <b>Euro Flow Day</b> pays your income.</li><li>Buy a green business and your token goes on it. If another player lands on <b>your</b> business, they pay you <b>€50,000</b>.</li><li>You may buy other free dreams too (“don’t limit yourself to one dream”) – but only <b>your own</b> dream wins.</li>
<li>You win by <b>buying your dream ★</b> or adding <b>€50,000</b> monthly income (buy green businesses).</li>
<li>Landing on someone else’s dream makes it more expensive for them. Lawsuit & tax audit cost half your cash, divorce all of it.</li><li><b>Charity</b> (foundation): pay €100,000 and choose 1, 2 or 3 dice for the rest of the game.</li>
</ul>
<h3>🇩🇪 The German system in the game</h3>
<ul>
<li><b>Gross & net:</b> income tax/solidarity surcharge and social insurance come off your salary. Civil servants (Beamte) pay private health insurance instead.</li>
<li><b>Renting instead of a mortgage:</b> most Germans rent. Rent can’t be paid off – index rent can even go up.</li>
<li><b>7 % purchase costs:</b> real-estate transfer tax, notary and land register are added when buying property.</li>
<li><b>Speculation period:</b> sell property at a profit within 10 years (120 paydays) and you pay tax (simplified 30 %). For gold it’s 1 year.</li>
<li><b>Capital gains tax:</b> stock profits cost 26.375 % (25 % + Soli). €1,000 per year is tax-free (Sparerpauschbetrag).</li>
<li><b>Child benefit (Kindergeld):</b> €255 per child per month.</li>
<li><b>Unemployment benefit I:</b> 60 % of net pay if you are fired.</li>
<li><b>BAföG, Dispo, 0 % financing:</b> typical German debts on your financial statement.</li>
<li><b>Personal insolvency:</b> can’t pay on payday? The bank takes your assets at half your investment, remaining debt is forgiven, you miss 3 turns.</li>
</ul>
<h3>🤖 Computer players & 🐹 coach</h3>
<ul>
<li><b>Easy</b> plays loosely, <b>medium</b> plays solidly, <b>hard</b> plays like an experienced human: careful with loans, sells at the right time, pays off expensive debt.</li>
<li>The <b>coach</b> explains every card, what just happened and which options you have. Turn it on or off any time (top bar).</li>
</ul>
<p class="fine">Euro Flow is an independent learning game inspired by classic money board games. All companies and numbers are fictional or simplified and are not tax or investment advice.</p>`,
  de: `
<h2>So spielst du Euro Flow</h2>
<p><b>Ziel:</b> Raus aus dem <b>Hamsterrad</b> (innerer Kreis) – indem dein <b>passives Einkommen</b> (Mieten, Unternehmen, Zinsen) größer ist als deine <b>monatlichen Ausgaben</b>. Danach geht’s auf die <b>Überholspur</b> (äußerer Ring).</p>
<p><b>Start:</b> Jeder bekommt einen zufälligen Beruf und erhält seinen monatlichen Cashflow plus Ersparnisse (Ersparnisse gibt es nur einmal). Dann würfeln alle einmal – die höchste Zahl beginnt (bei Gleichstand wird neu gewürfelt). Gespielt wird im Uhrzeigersinn.</p>
<h3>Hamsterrad</h3>
<ul>
<li><b>Chance (grün):</b> Ziehe einen kleinen Deal (bis 5.000 €) oder großen Deal (ab 6.000 €). Kaufen ist freiwillig.</li>
<li><b>Markt (pink):</b> Käufer für Immobilien, Gold & Firmen – oder Ereignisse. <i>Alle</i> Spieler, die das Passende besitzen, dürfen verkaufen.</li>
<li><b>Schnickschnack (blau):</b> Konsumausgaben – müssen bezahlt werden. Fehlt Geld, gibt die Bank automatisch einen Kredit.</li>
<li><b>Zahltag (gelb):</b> Beim Landen oder Überqueren bekommst du deinen monatlichen Cashflow.</li>
<li><b>Spende:</b> 10 % deines Einkommens spenden → 3 Runden mit 1 oder 2 Würfeln.</li>
<li><b>Baby:</b> Mehr Ausgaben – aber auch Kindergeld (max. 3 Kinder).</li>
<li><b>Gekündigt:</b> Du zahlst deine Ausgaben minus Arbeitslosengeld und setzt 2 Runden aus.</li>
<li><b>Bankkredit:</b> Jederzeit in 1.000-€-Schritten, 10 % Zinsen pro Monat (Spielregel). Schulden ablösen senkt deine Ausgaben.</li>
</ul>
<h3>Überholspur</h3>
<ul>
<li>Du gibst dein Bargeld aus dem Hamsterrad an die Bank zurück und startest mit deiner Auszahlung: <b>100 × dein passives Einkommen</b>. Das ist auch dein Euro-Flow-Tag-Einkommen.</li><li>Du würfelst mit 2 Würfeln. Beim Landen auf oder Überqueren des <b>Euro-Flow-Tags</b> bekommst du dein Einkommen.</li><li>Kaufst du ein grünes Unternehmen, kommt deine Marke drauf. Landet ein anderer Spieler auf <b>deinem</b> Unternehmen, zahlt er dir <b>50.000 €</b>.</li><li>Du darfst auch andere freie Träume kaufen („beschränke dich nicht auf einen Traum“) – gewinnen tut aber nur <b>dein eigener</b> Traum.</li>
<li>Du gewinnst, wenn du <b>deinen Traum ★ kaufst</b> oder dein Einkommen um <b>50.000 €</b> steigerst (grüne Unternehmen kaufen).</li>
<li>Landest du auf dem Traum eines anderen, wird er für ihn teurer. Klage & Betriebsprüfung kosten die Hälfte deines Bargelds, Scheidung alles.</li><li><b>Spende</b> (Stiftung): 100.000 € zahlen und für den Rest des Spiels 1, 2 oder 3 Würfel wählen.</li>
</ul>
<h3>🇩🇪 Das deutsche System im Spiel</h3>
<ul>
<li><b>Brutto & Netto:</b> Vom Gehalt gehen Lohnsteuer/Soli und Sozialversicherung ab. Beamte zahlen keine Sozialversicherung, aber private Krankenversicherung.</li>
<li><b>Miete statt Hauskredit:</b> Die meisten Deutschen wohnen zur Miete. Miete kann man nicht „abbezahlen“ – Indexmiete kann sogar steigen.</li>
<li><b>Kaufnebenkosten 7 %:</b> Grunderwerbsteuer, Notar und Grundbuch kommen beim Immobilienkauf obendrauf.</li>
<li><b>Spekulationsfrist:</b> Verkaufst du eine Immobilie innerhalb von 10 Jahren (120 Zahltage) mit Gewinn, zahlst du Steuern (vereinfacht 30 %). Bei Gold gilt 1 Jahr.</li>
<li><b>Abgeltungsteuer:</b> Aktiengewinne kosten 26,375 % (25 % + Soli). Pro Jahr sind 1.000 € steuerfrei (Sparerpauschbetrag).</li>
<li><b>Kindergeld:</b> 255 € pro Kind und Monat.</li>
<li><b>Arbeitslosengeld I:</b> 60 % vom Netto, wenn du gekündigt wirst.</li>
<li><b>BAföG, Dispo, 0 %-Finanzierung:</b> typisch deutsche Schulden auf deinem Finanzbericht.</li>
<li><b>Privatinsolvenz:</b> Kannst du am Zahltag nicht zahlen, übernimmt die Bank deine Vermögenswerte zum halben Einsatz, Restschulden werden erlassen, du setzt 3 Runden aus.</li>
</ul>
<h3>🤖 Computer-Gegner & 🐹 Coach</h3>
<ul>
<li><b>Leicht</b> spielt locker, <b>Mittel</b> solide, <b>Schwer</b> wie ein erfahrener Mensch: vorsichtig mit Krediten, verkauft im richtigen Moment, löst teure Schulden ab.</li>
<li>Der <b>Coach</b> erklärt jede Karte, was gerade passiert ist und welche Möglichkeiten du hast. Jederzeit oben an- und ausschaltbar.</li>
</ul>
<p class="fine">Euro Flow ist ein eigenständiges Lernspiel, inspiriert von klassischen Finanz-Brettspielen. Alle Firmen und Zahlen sind fiktiv bzw. vereinfacht und keine Steuer- oder Anlageberatung.</p>`,
};
