// Euro Flow – English (default) and German texts.
// Every UI string lives here as key: [English, German]. Add a language by adding a third column.
import { SMALL, BIG, MARKET, DOODADS, FAST, STOCKS } from './data.js';
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
const PROF_DE = {
  hausmeister: 'Hausmeister/in', pflege: 'Pflegefachkraft', bus: 'Busfahrer/in', buero: 'Bürokaufmann/-frau', kfz: 'Kfz-Mechatroniker/in',
  polizei: 'Polizist/in (Beamte)', lehrer: 'Lehrer/in (verbeamtet)', dev: 'Softwareentwickler/in', ing: 'Ingenieur/in',
  anwalt: 'Rechtsanwalt/-anwältin', arzt: 'Ärztin/Arzt', pilot: 'Pilot/in',
};
export const profName = key => (lang === 'de' ? PROF_DE[key] : PROF_EN[key]) || key;
export const cityName = c => (c ? (lang === 'de' ? c.nameDe : c.name) : '');
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
  closingSoon: ['⏳ Closing in a moment …', '⏳ Wird gleich geschlossen …'],
  clickToContinue: ['👆 Click anywhere on the board to close and continue.', '👆 Klicke irgendwo aufs Spielbrett, um zu schließen und weiterzuspielen.'],
  sellTotal: ['Total {amt} · profit {profit} · tax {tax} → you get <b>{net}</b>', 'Gesamt {amt} · Gewinn {profit} · Steuer {tax} → du bekommst <b>{net}</b>'],
  logBtn: ['📜 Log', '📜 Verlauf'],
  logShow: ['Show:', 'Zeigen:'],
  logAll: ['All players', 'Alle Spieler'],
  logMe: ['Me', 'Ich'],
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
  cNkFine: ['Purchase costs = real-estate transfer tax (Grunderwerbsteuer), notary & land register. Selling at a profit within the speculation period (4 laps = 10 real years) → speculation tax.', 'Kaufnebenkosten = Grunderwerbsteuer, Notar & Grundbuch. Verkauf mit Gewinn innerhalb der Spekulationsfrist (4 Runden = 10 echte Jahre) → Spekulationssteuer.'],
  cBuyerPays: ['Buyer pays', 'Käufer zahlt'], perUnitCoin: ['{amt} per coin', '{amt} pro Münze'], perUnitFlat: ['{amt} per unit', '{amt} pro Wohneinheit'], multPrice: ['{n}× purchase price', '{n}× Kaufpreis'],
  cSellFine: ['Everyone who owns this may sell now. The loan is repaid from the proceeds.', 'Jeder, der so etwas besitzt, darf jetzt verkaufen. Das Darlehen wird vom Erlös abgelöst.'],

  // Player sheet
  passiveOf: ['Passive {pas} / {exp}', 'Passiv {pas} / {exp}'],
  out: ['out', 'ausgeschieden'],
  skipsN: ['misses {n}×', 'setzt {n}× aus'],
  charityN: ['💜 {n}× 2 dice', '💜 {n}× 2 Würfel'],
  cash: ['Cash', 'Bargeld'], paydayCf: ['Payday (cash flow)', 'Zahltag (Cashflow)'], kids: ['Children', 'Kinder'],
  progress: ['Passive income {pas} / escape target {exp} – {rest}', 'Passives Einkommen {pas} / Ausstiegsziel {exp} – {rest}'],
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
  exOther: ['Food, phone, leisure', 'Essen, Handy, Freizeit'],
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
  endBroke: ['{name} went bankrupt – the game is over. Look at the report to see what went wrong.', '{name} ist pleite – das Spiel ist vorbei. Schau in die Auswertung, was schiefgelaufen ist.'],
  lGameOverBroke: ['🏁 Game over: {name} is bankrupt.', '🏁 Spielende: {name} ist pleite.'],
  outTitle: ['You’re out!', 'Du bist raus!'],
  outText: ['{name} went bankrupt: even after the insolvency, the monthly cash flow stays negative. The others play on.', '{name} ist pleite: Auch nach der Insolvenz bleibt der monatliche Cashflow negativ. Die anderen spielen weiter.'],
  outHostWarn: ['You are the host – if you leave, the game ends for everyone. Keep this tab open to let them finish.', 'Du bist der Host – wenn du gehst, endet das Spiel für alle. Lass diesen Tab offen, damit die anderen fertig spielen können.'],
  outLeave: ['Leave game', 'Spiel verlassen'],
  outWatch: ['Keep watching', 'Weiter zuschauen'],
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
  lFired: ['📉 {name} was fired! For 2 paydays: unemployment benefit {amt} instead of salary (60 % of net). Investments keep paying.', '📉 {name} wurde gekündigt! 2 Zahltage lang: Arbeitslosengeld I {amt} statt Gehalt (60 % vom Netto). Investitionen zahlen weiter.'],
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
  taxSpekuImmo: ['speculation tax (sold within the speculation period)', 'Spekulationssteuer (Verkauf innerhalb der Spekulationsfrist)'],
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
  // ===== German-system update =====
  gameMode: ['Game mode', 'Spielmodus'],
  mode_easy: ['Easy', 'Einfach'],
  modeHint_easy: ['No taxes on sales, no health-insurance rule – learn the basics first.', 'Keine Steuern auf Verkäufe, ohne Krankenversicherungs-Regel – erst die Grundlagen lernen.'],
  mode_classic: ['Classic', 'Klassisch'],
  modeHint_classic: ['German taxes on sales, tax advisor & depreciation, yearly events, health insurance in the escape target.', 'Steuern auf Verkäufe, Steuerberater & Abschreibung, jährliche Ereignisse, Krankenversicherung im Ausstiegsziel.'],
  mode_realistic: ['Realistic Germany', 'Realistisches Deutschland'],
  modeHint_realistic: ['Everything + home city (salary, rent, transfer tax by state), church tax and inflation.', 'Alles + Heimatstadt (Gehalt, Miete, Grunderwerbsteuer je Bundesland), Kirchensteuer und Inflation.'],
  homeCity: ['Home city:', 'Heimatstadt:'],
  churchMember: ['Church member (church tax)', 'Kirchenmitglied (Kirchensteuer)'],
  yearN: ['Year {n}', 'Jahr {n}'],
  yearHint: ['1 lap around the hamster wheel = 1 year', '1 Runde im Hamsterrad = 1 Jahr'],
  etfIndex: ['World ETF', 'Welt-ETF'],
  indexHint: ['World ETF index (starts at 100). It moves on every market space.', 'Welt-ETF-Index (Start bei 100). Er bewegt sich auf jedem Marktfeld.'],
  rateHint: ['ECB interest level – changes property prices on buyer cards.', 'EZB-Zinsniveau – verändert die Immobilienpreise auf Käuferkarten.'],
  'rate_-2': ['Rates very low', 'Zinsen sehr niedrig'], 'rate_-1': ['Rates low', 'Zinsen niedrig'], rate_0: ['Rates normal', 'Zinsen normal'],
  rate_1: ['Rates high', 'Zinsen hoch'], rate_2: ['Rates very high', 'Zinsen sehr hoch'],
  cTeilfrei: ['Tax-free share of gains (Teilfreistellung)', 'Teilfreistellung'],
  cEtfFine: ['Every payday your chosen amount is invested. 4 % of the value per year is paid to you as passive income (4 % rule). Sell any time in your statement: 30 % of the gain is tax-free, the rest pays 26.375 % above your yearly allowance.', 'Jeden Zahltag wird dein Betrag investiert. 4 % des Werts pro Jahr werden dir als passives Einkommen ausgezahlt (4-%-Regel). Verkaufen jederzeit im Finanzbericht: 30 % des Gewinns sind steuerfrei, der Rest kostet 26,375 % über dem Freibetrag.'],
  cMonthly: ['Every payday', 'Jeden Zahltag'],
  cBausparReady: ['Ready at', 'Zuteilungsreif ab'],
  cBausparLoan: ['Building loan', 'Bauspardarlehen'],
  cBausparLoanV: ['up to 2× savings, 1 %/month', 'bis 2× Guthaben, 1 %/Monat'],
  cRateNow: ['Interest level now', 'Zinsniveau jetzt'],
  units: ['{n} units', '{n} Anteile'],
  perUnit: ['Price per unit', 'Preis je Anteil'],
  cNkPct: ['Purchase costs {pct} % {st}', 'Kaufnebenkosten {pct} % {st}'],
  cAfa: ['Depreciation (AfA) per year', 'Abschreibung (AfA) pro Jahr'],
  perUnitCrypto: ['{amt} per unit', '{amt} pro Anteil'],
  cRateAdj: ['Property prices adjusted for the interest level ({lvl}).', 'Immobilienpreise angepasst ans Zinsniveau ({lvl}).'],
  etfPerPayday: ['Per payday:', 'Pro Zahltag:'],
  etfStart: ['Start plan', 'Sparplan starten'],
  etfIncrease: ['Increase plan', 'Sparplan erhöhen'],
  bausparSign: ['Sign contract ({amt}/payday)', 'Vertrag abschließen ({amt}/Zahltag)'],
  choiceQuit: ['A) Quit', 'A) Kündigen'],
  choiceStay: ['B) Stay (€800)', 'B) Bleiben (800 €)'],
  buyWithBauspar: ['Buy with Bausparvertrag ({amt} saved + cheap loan)', 'Mit Bausparvertrag kaufen ({amt} Guthaben + günstiges Darlehen)'],
  taxFreeFrom: ['tax-free from year {n}', 'steuerfrei ab Jahr {n}'],
  taxFreeNow: ['tax-free when sold', 'steuerfrei verkaufbar'],
  choseQuit: ['🚪 {name} quit the job.', '🚪 {name} hat gekündigt.'],
  choseStay: ['🧘 {name} stayed.', '🧘 {name} ist geblieben.'],
  netWorth: ['Net worth', 'Nettovermögen'],
  ownHome: ['Own home (lived in)', 'Eigenheim (selbst bewohnt)'],
  ownHomeHint: ['counts for net worth, but brings no income – it costs you every month', 'zählt zum Vermögen, bringt aber kein Einkommen – es kostet dich jeden Monat'],
  stAlg: ['Unemployed ({n} paydays)', 'Arbeitslos ({n} Zahltage)'],
  stSperr: ['Sperrzeit ({n} paydays)', 'Sperrzeit ({n} Zahltage)'],
  stAdvisor: ['Tax advisor', 'Steuerberater'],
  vacantN: ['no rent: {n} paydays', 'keine Miete: {n} Zahltage'],
  etfVal: ['value {val} · gain {gain} · {m}/payday', 'Wert {val} · Gewinn {gain} · {m}/Zahltag'],
  bausparVal: ['saved {val} of {need}', 'gespart {val} von {need}'],
  bausparReadyV: ['saved {val} – ready! Use it when buying property.', 'gespart {val} – zuteilungsreif! Beim Immobilienkauf nutzbar.'],
  etfSetBtn: ['Change', 'Ändern'],
  etfSellBtn: ['Sell all (+{amt})', 'Alles verkaufen (+{amt})'],
  etfSellHint: ['Tax on sale: {tax}', 'Steuer beim Verkauf: {tax}'],
  advisorOn: ['Tax advisor hired: depreciation saves you {amt}/month in income tax (your marginal rate: {rate} %).', 'Steuerberater beauftragt: Die Abschreibung spart dir {amt}/Monat Lohnsteuer (dein Grenzsteuersatz: {rate} %).'],
  advisorOff: ['Tax advisor ({fee} once, then {m}/month): would save you {amt}/month through depreciation (AfA) on your property. Your marginal tax rate: {rate} %.', 'Steuerberater ({fee} einmalig, dann {m}/Monat): würde dir durch Abschreibung (AfA) auf deine Immobilien {amt}/Monat sparen. Dein Grenzsteuersatz: {rate} %.'],
  advisorHire: ['Hire', 'Beauftragen'],
  advisorFire: ['Cancel', 'Kündigen'],
  escapeBreak: ['Escape target = living costs {living} + self-paid health insurance {health} = {total}. Salary taxes don’t count – without a job you don’t pay them.', 'Ausstiegsziel = Lebenshaltung {living} + selbst bezahlte Krankenversicherung {health} = {total}. Lohnsteuer & Sozialabgaben zählen nicht – ohne Job zahlst du sie nicht.'],
  escapeBreakNoHealth: ['Escape target = your living costs {total}.', 'Ausstiegsziel = deine Lebenshaltungskosten {total}.'],
  deductions: ['Salary deductions', 'Abzüge vom Gehalt'],
  livingCosts: ['Living costs', 'Lebenshaltungskosten'],
  savingsPlans: ['Savings plans', 'Sparpläne'],
  repChart: ['Net worth over time', 'Nettovermögen im Zeitverlauf'],
  repRanking: ['Ranking by net worth', 'Rangliste nach Nettovermögen'],
  repMoves: ['Best 👍 and worst 👎 move', 'Bester 👍 und schlechtester 👎 Zug'],
  repCompare: ['You finished #{rank} of {n} with {nw}. Best computer player: {best} with {bnw}.', 'Du bist Platz {rank} von {n} mit {nw}. Bester Computer-Gegner: {best} mit {bnw}.'],
  // statement lines
  inAlg: ['Unemployment benefit I (60 % of net, {n} paydays left)', 'Arbeitslosengeld I (60 % vom Netto, noch {n} Zahltage)'],
  inSperr: ['No income – Sperrzeit ({n} paydays left)', 'Kein Einkommen – Sperrzeit (noch {n} Zahltage)'],
  dTax: ['Income tax (marginal rate {rate} %)', 'Lohnsteuer (Grenzsteuersatz {rate} %)'],
  dSoli: ['Solidarity surcharge', 'Solidaritätszuschlag'],
  dChurch: ['Church tax', 'Kirchensteuer'],
  dSv: ['Social insurance (pension, health, care, unemployment)', 'Sozialversicherung (Rente, Kranken, Pflege, Arbeitslosen)'],
  dPkv: ['Private health insurance', 'Private Krankenversicherung'],
  dAfa: ['Tax saved through depreciation (AfA)', 'Steuerersparnis durch Abschreibung (AfA)'],
  exCar: ['Car (fuel, insurance, upkeep)', 'Auto (Sprit, Versicherung, Unterhalt)'],
  exIns: ['Insurances (liability, disability)', 'Versicherungen (Haftpflicht, Berufsunfähigkeit)'],
  exGez: ['Broadcasting fee (GEZ)', 'Rundfunkbeitrag (GEZ)'],
  exAdvisor: ['Tax advisor', 'Steuerberater'],
  svEtf: ['ETF savings plan', 'ETF-Sparplan'],
  svBauspar: ['Bausparvertrag', 'Bausparvertrag'],
  debt_leasing: ['Lease contract', 'Leasingvertrag'],
  debt_bauspar: ['Building loan (Bauspardarlehen)', 'Bauspardarlehen'],
  withAdvisor: ['with tax advisor', 'mit Steuerberater'],
  withoutAdvisor: ['filed yourself', 'selbst gemacht'],
  whyNk: ['utility bill back-payment (Nebenkostenabrechnung)', 'Nachzahlung Nebenkostenabrechnung'],
  taxCrypto: ['crypto speculation tax (held less than 1 year)', 'Krypto-Spekulationssteuer (Haltedauer unter 1 Jahr)'],
  // log
  lBausparReady: ['🏠 {name}’s Bausparvertrag is ready ({amt} saved).', '🏠 Der Bausparvertrag von {name} ist zuteilungsreif ({amt} gespart).'],
  lTenantBack: ['🏠 {name}: rent is paid again in {asset}.', '🏠 {name}: In {asset} wird wieder Miete gezahlt.'],
  lBackToWork: ['💼 {name} has a job again.', '💼 {name} hat wieder einen Job.'],
  lNewJob: ['💼 {name} starts a new job: {amt} gross.', '💼 {name} startet einen neuen Job: {amt} brutto.'],
  lNewYear: ['📅 {name} starts year {n}.', '📅 {name} startet ins Jahr {n}.'],
  lXmas: ['🎄 {name} gets a Christmas bonus (Weihnachtsgeld): +{amt}', '🎄 {name} bekommt Weihnachtsgeld: +{amt}'],
  lTaxRefund: ['🧾 Tax return ({how}): {name} gets {amt} back.', '🧾 Steuererklärung ({how}): {name} bekommt {amt} zurück.'],
  lNkBack: ['🧾 {name}: utility bill settlement (rolled {r}) – back-payment!', '🧾 {name}: Nebenkostenabrechnung (gewürfelt {r}) – Nachzahlung!'],
  lNkRefund: ['🧾 {name}: utility bill settlement (rolled {r}) – refund +{amt}', '🧾 {name}: Nebenkostenabrechnung (gewürfelt {r}) – Guthaben +{amt}'],
  lNkEven: ['🧾 {name}: utility bill settlement (rolled {r}) – all even.', '🧾 {name}: Nebenkostenabrechnung (gewürfelt {r}) – alles ausgeglichen.'],
  lInflation: ['📈 Inflation: {name}’s living costs rise by {amt}/month.', '📈 Inflation: Die Lebenshaltungskosten von {name} steigen um {amt}/Monat.'],
  lBadTenant: ['🏚️ {name}: rent nomad in {asset} – −{amt}/month for 3 paydays.', '🏚️ {name}: Mietnomade in {asset} – −{amt}/Monat für 3 Zahltage.'],
  lRate: ['🏦 Interest level: {lvl}. Property prices on buyer cards: {pct} %.', '🏦 Zinsniveau: {lvl}. Immobilienpreise auf Käuferkarten: {pct} %.'],
  lIndex: ['📈 World ETF {pct} % → index {idx}', '📈 Welt-ETF {pct} % → Index {idx}'],
  lIndexRoll: ['📈 Market day: {name} rolls {r} for the World ETF: {pct} % → index {idx}', '📈 Börsentag: {name} würfelt {r} für den Welt-ETF: {pct} % → Index {idx}'],
  lAlreadyNoJob: ['{name} has no job right now – nothing more to lose.', '{name} hat gerade keinen Job – nichts mehr zu verlieren.'],
  lEtfStart: ['📈 {name} now saves {amt} per payday in the World ETF.', '📈 {name} spart jetzt {amt} pro Zahltag in den Welt-ETF.'],
  lBausparStart: ['🏠 {name} signs a Bausparvertrag: {amt} per payday.', '🏠 {name} schließt einen Bausparvertrag ab: {amt} pro Zahltag.'],
  lBausparUse: ['🏠 {name} uses the Bausparvertrag: {amt} savings + building loan {loan} ({pay}/month).', '🏠 {name} nutzt den Bausparvertrag: {amt} Guthaben + Bauspardarlehen {loan} ({pay}/Monat).'],
  lQuit: ['🚪 {name} quits – Sperrzeit: 3 paydays without salary or benefit, then a better job.', '🚪 {name} kündigt – Sperrzeit: 3 Zahltage ohne Gehalt und Arbeitslosengeld, danach ein besserer Job.'],
  lStay: ['🧘 {name} stays and pays for coaching and a holiday.', '🧘 {name} bleibt und zahlt Coaching und Urlaub.'],
  lAdvisorOn: ['🧾 {name} hires a tax advisor ({amt} once, {m}/month).', '🧾 {name} beauftragt einen Steuerberater ({amt} einmalig, {m}/Monat).'],
  lAdvisorOff: ['🧾 {name} cancels the tax advisor.', '🧾 {name} kündigt den Steuerberater.'],
  lEtfSet: ['📈 {name} changes the ETF plan to {amt} per payday.', '📈 {name} ändert den ETF-Sparplan auf {amt} pro Zahltag.'],
  lEtfPause: ['⏸ {name} pauses the ETF plan.', '⏸ {name} pausiert den ETF-Sparplan.'],
  lEtfSell: ['💹 {name} sells the ETF for {amt} (gain {gain}, tax {tax}).', '💹 {name} verkauft den ETF für {amt} (Gewinn {gain}, Steuer {tax}).'],
  // best / worst moves
  nBuy: ['Bought {cardName} (+{cf}/month)', '{cardName} gekauft (+{cf}/Monat)'],
  nSell: ['Sold {asset}: {amt} profit', '{asset} verkauft: {amt} Gewinn'],
  nSellLoss: ['Sold {asset} at a loss: {amt}', '{asset} mit Verlust verkauft: {amt}'],
  nSellStock: ['Sold {sym} shares: {amt}', '{sym}-Aktien verkauft: {amt}'],
  nSellStockLoss: ['Sold {sym} shares at a loss: {amt}', '{sym}-Aktien mit Verlust verkauft: {amt}'],
  nPaid: ['Paid for “{card}”', 'Bezahlt: „{card}“'],
  nFinance: ['Bought on credit: “{card}”', 'Auf Pump gekauft: „{card}“'],
  nBadTenant: ['A rent nomad cost 3 months of rent', 'Ein Mietnomade kostete 3 Monatsmieten'],
  nBankrupt: ['Went bankrupt', 'Privatinsolvenz'],
  nEscape: ['Escaped the hamster wheel! 🚀', 'Raus aus dem Hamsterrad! 🚀'],
  nBuyBiz: ['Bought {fast} (+{cf}/month)', '{fast} gekauft (+{cf}/Monat)'],
  nGambleWin: ['Won the gamble: {fast}', 'Wette gewonnen: {fast}'],
  nGambleLose: ['Lost the gamble: {fast}', 'Wette verloren: {fast}'],
  nLoseHalf: ['{fast}: lost half of the cash', '{fast}: die Hälfte des Bargelds verloren'],
  nDivorce: ['Divorce: lost all cash', 'Scheidung: alles Bargeld verloren'],
  nEtfSell: ['Sold the ETF: {amt}', 'ETF verkauft: {amt}'],
  nEtfSellLoss: ['Sold the ETF at a loss: {amt}', 'ETF mit Verlust verkauft: {amt}'],

};

// Merge extra strings (coach) from other modules
export function addStrings(obj) { Object.assign(S, obj); }

export const RULES = {
  en: `
<h2>How to play Euro Flow</h2>
<p><b>Goal:</b> escape the <b>hamster wheel</b> (inner circle). You escape when your <b>passive income</b> (rent, businesses, dividends, ETF payouts) is bigger than your <b>escape target</b>: your living costs plus the health insurance you’d have to pay yourself without a job. Salary taxes and social insurance don’t count – without a job you don’t pay them. Then you move onto the <b>fast track</b> (outer ring).</p>
<p><b>Start:</b> choose a game mode, everyone gets a random job and receives one month’s cash flow plus savings (savings only once). Everyone rolls one die – the highest number goes first (ties roll again). Play goes clockwise.</p>
<h3>Game modes</h3>
<ul>
<li><b>Easy:</b> no taxes on sales, escape target = living costs. Good for learning.</li>
<li><b>Classic:</b> German taxes on sales, tax advisor & depreciation, yearly events, health insurance in the escape target.</li>
<li><b>Realistic Germany:</b> everything from Classic plus a home city (salary, rent and real-estate transfer tax by state), optional church tax and inflation.</li>
</ul>
<h3>Hamster wheel</h3>
<ul>
<li><b>Opportunity (green):</b> draw a small deal (up to €5,000) or a big deal (€6,000+). Buying is optional.</li>
<li><b>Market (pink):</b> first the World ETF index moves (roll), then a market card: buyers for property, gold, crypto and businesses, interest-rate news or events. <i>Every</i> player who owns the matching thing may sell.</li>
<li><b>Doodads (blue):</b> spending you must pay. If you lack cash, the bank lends it automatically.</li>
<li><b>Payday (yellow):</b> landing on or passing it pays your monthly cash flow. Savings plans are paid in at the same time.</li>
<li><b>Charity:</b> donate 10 % of your income → roll 1 or 2 dice for 3 turns.</li>
<li><b>Baby:</b> higher expenses – but also €255 Kindergeld (max. 3 children).</li>
<li><b>Fired:</b> for 2 paydays you get unemployment benefit (60 % of net pay) instead of salary. Your investments keep paying.</li>
<li><b>Bank loan:</b> any time in steps of €1,000, 10 % interest per month (game rule). Paying off debt lowers your living costs.</li>
</ul>
<h3>Time: 1 lap = 1 year</h3>
<ul>
<li>Every time you pass START a new year begins: Christmas bonus (Weihnachtsgeld), tax refund (bigger with a tax advisor), utility bill settlement (Nebenkostenabrechnung – roll: back-payment, nothing or refund), new €1,000 tax-free allowance. In Realistic mode living costs rise 2 % (inflation).</li>
<li><b>Speculation period:</b> property sold at a profit within 4 laps (stands for the real 10 years) is taxed at your personal tax rate; afterwards it’s tax-free. Gold and crypto: 1 lap.</li>
</ul>
<h3>Taxes & German money tools</h3>
<ul>
<li><b>Income tax</b> is calculated with the real 2025 German formula (§32a EStG) – high earners reach 42 %. Soli only applies to very high incomes; church tax 8–9 % if you are a member (Realistic).</li>
<li><b>Tax advisor:</b> hire one in your statement (€1,500 once, €80/month). Then the depreciation (AfA, 2 % of the building value per year, 9 % for listed buildings) lowers your income tax every month – the higher your tax rate, the more you save.</li>
<li><b>Purchase costs:</b> real-estate transfer tax (3.5–6.5 % depending on the state) + 2 % notary and land register.</li>
<li><b>Stocks:</b> 26.375 % capital gains tax above the €1,000 yearly allowance.</li>
<li><b>ETF savings plan:</b> invests a fixed amount every payday; you receive 4 % of the value per year as passive income. Selling: 30 % of the gain is tax-free (Teilfreistellung).</li>
<li><b>Bausparvertrag:</b> save €150 per payday; from €3,000 it is ready – buy a building with it and get a cheap building loan (1 %/month instead of 10 %).</li>
<li><b>Crypto:</b> tax-free after 1 year; before that, gains above €1,000 a year are taxed.</li>
<li><b>Interest rates (ECB):</b> low rates raise property prices on buyer cards, high rates lower them.</li>
<li><b>Rent nomad:</b> a tenant stops paying – that property earns nothing for 3 paydays (evictions take months in Germany).</li>
<li><b>Quitting:</b> if you quit yourself you get a Sperrzeit (3 paydays without salary or benefit), then a better-paid job.</li>
<li><b>Personal insolvency:</b> can’t pay on payday? The bank takes your assets at half your investment, remaining debt is forgiven, you miss 3 turns.</li>
</ul>
<h3>Fast track</h3>
<ul>
<li>You give your rat-race cash back to the bank and start with your buyout: <b>100 × your passive income</b>. That is also your Euro Flow Day income. Roll 2 dice.</li>
<li>You win by <b>buying your dream ★</b> or adding <b>€50,000</b> monthly income (buy green businesses).</li>
<li>If another player lands on <b>your</b> business, they pay you €50,000. You may buy other free dreams too – but only your own dream wins.</li>
<li>Landing on someone else’s dream makes it more expensive for them. Lawsuit & tax audit cost half your cash, divorce all of it. Foundation: €100,000 → choose 1, 2 or 3 dice.</li>
</ul>
<h3>🤖 Computer players, 🐹 coach & report</h3>
<ul>
<li><b>Easy</b> plays loosely, <b>medium</b> plays solidly, <b>hard</b> plays like an experienced human (careful with loans, uses the tax advisor and Bausparvertrag, waits out the speculation period).</li>
<li>The <b>coach</b> explains every card, what just happened, your options, a tip – and the German law behind it.</li>
<li>At the end you see a <b>net-worth chart</b>, the ranking and every player’s best and worst move.</li>
</ul>
<p class="fine">Euro Flow is an independent learning game inspired by classic money board games. All companies are fictional; tax rules are simplified (e.g. rental income on cards is shown after tax) and are not tax or investment advice.</p>`,
  de: `
<h2>So spielst du Euro Flow</h2>
<p><b>Ziel:</b> Raus aus dem <b>Hamsterrad</b> (innerer Kreis). Du kommst raus, wenn dein <b>passives Einkommen</b> (Mieten, Unternehmen, Dividenden, ETF-Auszahlungen) größer ist als dein <b>Ausstiegsziel</b>: deine Lebenshaltungskosten plus die Krankenversicherung, die du ohne Job selbst zahlen müsstest. Lohnsteuer und Sozialabgaben zählen nicht – ohne Job zahlst du sie nicht. Danach geht es auf die <b>Überholspur</b> (äußerer Ring).</p>
<p><b>Start:</b> Spielmodus wählen, jeder bekommt einen zufälligen Beruf und erhält einen Monats-Cashflow plus Ersparnisse (Ersparnisse nur einmal). Alle würfeln einmal – die höchste Zahl beginnt (bei Gleichstand wird neu gewürfelt). Gespielt wird im Uhrzeigersinn.</p>
<h3>Spielmodi</h3>
<ul>
<li><b>Einfach:</b> keine Steuern auf Verkäufe, Ausstiegsziel = Lebenshaltungskosten. Gut zum Lernen.</li>
<li><b>Klassisch:</b> Steuern auf Verkäufe, Steuerberater & Abschreibung, jährliche Ereignisse, Krankenversicherung im Ausstiegsziel.</li>
<li><b>Realistisches Deutschland:</b> alles aus „Klassisch“ plus Heimatstadt (Gehalt, Miete und Grunderwerbsteuer je Bundesland), optionale Kirchensteuer und Inflation.</li>
</ul>
<h3>Hamsterrad</h3>
<ul>
<li><b>Chance (grün):</b> Ziehe einen kleinen Deal (bis 5.000 €) oder großen Deal (ab 6.000 €). Kaufen ist freiwillig.</li>
<li><b>Markt (pink):</b> Erst bewegt sich der Welt-ETF-Index (Würfel), dann kommt eine Marktkarte: Käufer für Immobilien, Gold, Krypto und Firmen, Zinsnachrichten oder Ereignisse. <i>Alle</i> Spieler, die das Passende besitzen, dürfen verkaufen.</li>
<li><b>Schnickschnack (blau):</b> Konsumausgaben – müssen bezahlt werden. Fehlt Geld, gibt die Bank automatisch einen Kredit.</li>
<li><b>Zahltag (gelb):</b> Beim Landen oder Überqueren bekommst du deinen monatlichen Cashflow. Gleichzeitig werden Sparpläne eingezahlt.</li>
<li><b>Spende:</b> 10 % deines Einkommens spenden → 3 Runden mit 1 oder 2 Würfeln.</li>
<li><b>Baby:</b> Mehr Ausgaben – aber auch 255 € Kindergeld (max. 3 Kinder).</li>
<li><b>Gekündigt:</b> 2 Zahltage lang bekommst du Arbeitslosengeld I (60 % vom Netto) statt Gehalt. Deine Investitionen zahlen weiter.</li>
<li><b>Bankkredit:</b> Jederzeit in 1.000-€-Schritten, 10 % Zinsen pro Monat (Spielregel). Schulden ablösen senkt deine Lebenshaltungskosten.</li>
</ul>
<h3>Zeit: 1 Runde = 1 Jahr</h3>
<ul>
<li>Jedes Mal, wenn du über START ziehst, beginnt ein neues Jahr: Weihnachtsgeld, Steuererstattung (höher mit Steuerberater), Nebenkostenabrechnung (Würfel: Nachzahlung, nichts oder Guthaben), neuer Freibetrag von 1.000 €. Im Modus „Realistisch“ steigen die Lebenshaltungskosten um 2 % (Inflation).</li>
<li><b>Spekulationsfrist:</b> Verkaufst du eine Immobilie innerhalb von 4 Runden (stehen für die echten 10 Jahre) mit Gewinn, wird er mit deinem persönlichen Steuersatz versteuert; danach steuerfrei. Gold und Krypto: 1 Runde.</li>
</ul>
<h3>Steuern & deutsche Finanzwerkzeuge</h3>
<ul>
<li><b>Lohnsteuer</b> wird mit der echten Formel 2025 berechnet (§32a EStG) – hohe Einkommen erreichen 42 %. Soli zahlen nur sehr hohe Einkommen; Kirchensteuer 8–9 %, wenn du Mitglied bist (Realistisch).</li>
<li><b>Steuerberater:</b> im Finanzbericht beauftragen (1.500 € einmalig, 80 €/Monat). Dann senkt die Abschreibung (AfA, 2 % des Gebäudewerts pro Jahr, 9 % bei Denkmalschutz) jeden Monat deine Lohnsteuer – je höher dein Steuersatz, desto mehr sparst du.</li>
<li><b>Kaufnebenkosten:</b> Grunderwerbsteuer (3,5–6,5 % je Bundesland) + 2 % Notar und Grundbuch.</li>
<li><b>Aktien:</b> 26,375 % Abgeltungsteuer über dem Freibetrag von 1.000 € pro Jahr.</li>
<li><b>ETF-Sparplan:</b> investiert jeden Zahltag einen festen Betrag; 4 % des Werts pro Jahr bekommst du als passives Einkommen. Beim Verkauf sind 30 % des Gewinns steuerfrei (Teilfreistellung).</li>
<li><b>Bausparvertrag:</b> 150 € pro Zahltag sparen; ab 3.000 € zuteilungsreif – damit eine Immobilie kaufen und ein günstiges Bauspardarlehen bekommen (1 %/Monat statt 10 %).</li>
<li><b>Krypto:</b> nach 1 Jahr steuerfrei; davor werden Gewinne über 1.000 € im Jahr versteuert.</li>
<li><b>Zinsen (EZB):</b> Niedrige Zinsen erhöhen die Immobilienpreise auf Käuferkarten, hohe senken sie.</li>
<li><b>Mietnomade:</b> Ein Mieter zahlt nicht – die Immobilie bringt 3 Zahltage lang nichts (Räumungen dauern in Deutschland Monate).</li>
<li><b>Selbst kündigen:</b> Dann gibt es eine Sperrzeit (3 Zahltage ohne Gehalt und Arbeitslosengeld), danach einen besser bezahlten Job.</li>
<li><b>Privatinsolvenz:</b> Kannst du am Zahltag nicht zahlen, übernimmt die Bank deine Vermögenswerte zum halben Einsatz, Restschulden werden erlassen, du setzt 3 Runden aus.</li>
</ul>
<h3>Überholspur</h3>
<ul>
<li>Du gibst dein Bargeld aus dem Hamsterrad an die Bank zurück und startest mit deiner Auszahlung: <b>100 × dein passives Einkommen</b>. Das ist auch dein Euro-Flow-Tag-Einkommen. Du würfelst mit 2 Würfeln.</li>
<li>Du gewinnst, wenn du <b>deinen Traum ★ kaufst</b> oder dein Einkommen um <b>50.000 €</b> steigerst (grüne Unternehmen kaufen).</li>
<li>Landet ein anderer auf <b>deinem</b> Unternehmen, zahlt er dir 50.000 €. Du darfst auch andere freie Träume kaufen – gewinnen tut aber nur dein eigener.</li>
<li>Landest du auf dem Traum eines anderen, wird er für ihn teurer. Klage & Betriebsprüfung kosten die Hälfte deines Bargelds, Scheidung alles. Stiftung: 100.000 € → 1, 2 oder 3 Würfel wählen.</li>
</ul>
<h3>🤖 Computer-Gegner, 🐹 Coach & Auswertung</h3>
<ul>
<li><b>Leicht</b> spielt locker, <b>Mittel</b> solide, <b>Schwer</b> wie ein erfahrener Mensch (vorsichtig mit Krediten, nutzt Steuerberater und Bausparvertrag, wartet die Spekulationsfrist ab).</li>
<li>Der <b>Coach</b> erklärt jede Karte, was gerade passiert ist, deine Möglichkeiten, einen Tipp – und das deutsche Gesetz dahinter.</li>
<li>Am Ende siehst du eine <b>Vermögenskurve</b>, die Rangliste und den besten und schlechtesten Zug jedes Spielers.</li>
</ul>
<p class="fine">Euro Flow ist ein eigenständiges Lernspiel, inspiriert von klassischen Finanz-Brettspielen. Alle Firmen sind fiktiv; Steuerregeln sind vereinfacht (z. B. sind Mieteinnahmen auf den Karten nach Steuern angegeben) und keine Steuer- oder Anlageberatung.</p>`,
};
