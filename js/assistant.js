// Euro Flow – the coach 🐹: explains the card, what just happened and which options you have.
import { FAST, RAT, STOCKS, KINDERGELD } from './data.js';
import {
  cardOf, passive, totalExpenses, totalIncome, cashflow, sellable, saleNet, saleTax, darlehen, buyCost, dreamCost,
} from './engine.js';
import { decideBuy, decideSell, decideDeal, decideCharity, debtToPay, decideFast } from './bot.js';
import { t, fmt, logLine, fastName, fastText, assetName, addStrings } from './i18n.js';

addStrings({
  coachTitle: ['🐹 Coach', '🐹 Coach'],
  cJust: ['What just happened', 'Was gerade passiert ist'],
  cExplain: ['What this means', 'Was das bedeutet'],
  cOptions: ['Your options', 'Deine Möglichkeiten'],
  cTip: ['💡 Tip', '💡 Tipp'],
  cAnytime: ['Any time: take a bank loan (10 %/month interest) or pay off debts in your financial statement below.', 'Jederzeit: Bankkredit aufnehmen (10 %/Monat Zinsen) oder Schulden in deinem Finanzbericht unten ablösen.'],
  cNotYourTurn: ['It’s {name}’s turn. Keep an eye on market cards: if a buyer appears for something you own, you can sell even when it’s not your turn.', '{name} ist am Zug. Achte auf Marktkarten: Taucht ein Käufer für etwas auf, das dir gehört, darfst du auch außerhalb deines Zuges verkaufen.'],
  cOrder: ['Everyone rolls one die. The highest number starts, ties roll again. After that you play clockwise.', 'Alle würfeln einmal. Die höchste Zahl beginnt, bei Gleichstand wird neu gewürfelt. Danach geht es im Uhrzeigersinn weiter.'],
  oOrderRoll: ['<b>Roll</b> – see if you go first.', '<b>Würfeln</b> – schau, ob du anfängst.'],
  cGoalRat: ['Your goal: passive income bigger than your expenses. Now: {pas} passive vs. {exp} expenses – you need {gap} more per month. Every asset with positive cash flow brings you closer.', 'Dein Ziel: passives Einkommen größer als deine Ausgaben. Jetzt: {pas} passiv gegen {exp} Ausgaben – es fehlen noch {gap} pro Monat. Jeder Vermögenswert mit positivem Cashflow bringt dich näher.'],
  cGoalFast: ['You’re on the fast track! Win by buying your dream ({dream}, now {cost}) or by adding €50,000 to your monthly income (so far +{have}).', 'Du bist auf der Überholspur! Gewinne, indem du deinen Traum kaufst ({dream}, jetzt {cost}) oder dein Monatseinkommen um 50.000 € steigerst (bisher +{have}).'],
  oRoll: ['<b>Roll</b> – move clockwise. Passing <i>Payday</i> pays you {cf}.', '<b>Würfeln</b> – im Uhrzeigersinn ziehen. Über den <i>Zahltag</i> gibt es {cf}.'],
  oRollFast: ['<b>Roll</b> – 2 dice on the fast track. Passing <i>Euro Flow Day</i> pays {amt}.', '<b>Würfeln</b> – 2 Würfel auf der Überholspur. Über den <i>Euro-Flow-Tag</i> gibt es {amt}.'],
  oSkip: ['You must miss this turn (fired or bankruptcy). Click the button to pass.', 'Du musst diese Runde aussetzen (Kündigung oder Insolvenz). Klicke den Knopf, um weiterzugeben.'],
  oDice12: ['Thanks to your donation you may choose <b>1 or 2 dice</b>. 2 dice = faster around the board = more paydays.', 'Dank deiner Spende darfst du <b>1 oder 2 Würfel</b> wählen. 2 Würfel = schneller übers Brett = mehr Zahltage.'],
  eDeal: ['You landed on an opportunity. <b>Small deals</b> cost up to €5,000 (stocks, small flats, gold). <b>Big deals</b> need €6,000+ but pay much more (apartment buildings, businesses). You have {cash} cash.', 'Du bist auf einer Chance gelandet. <b>Kleine Deals</b> kosten bis 5.000 € (Aktien, kleine Wohnungen, Gold). <b>Große Deals</b> brauchen ab 6.000 €, bringen aber viel mehr (Mehrfamilienhäuser, Firmen). Du hast {cash} Bargeld.'],
  oSmall: ['<b>Small deal</b> – affordable, good for starting.', '<b>Kleiner Deal</b> – bezahlbar, gut zum Starten.'],
  oBig: ['<b>Big deal</b> – needs more cash or a loan, but big cash flow.', '<b>Großer Deal</b> – braucht mehr Geld oder einen Kredit, aber großer Cashflow.'],
  oNoDeal: ['<b>No deal</b> – end your turn.', '<b>Kein Deal</b> – Zug beenden.'],
  tipBig: ['With your cash a pro would draw a <b>big deal</b>.', 'Mit deinem Bargeld würde ein Profi einen <b>großen Deal</b> ziehen.'],
  tipSmall: ['A pro would draw a <b>small deal</b> – build cash first.', 'Ein Profi würde einen <b>kleinen Deal</b> ziehen – erst Geld aufbauen.'],
  eAsset: ['This is an <b>investment</b>. You pay {down} of your own money. {loanPart}Every payday it pays you <b>{cf}</b>. That is a return of <b>{roi} % per year</b> on your cash – it pays for itself in {months} months. It would close {pct} % of the gap to escaping.', 'Das ist eine <b>Investition</b>. Du zahlst {down} aus eigener Tasche. {loanPart}Jeden Zahltag bringt sie dir <b>{cf}</b>. Das sind <b>{roi} % Rendite pro Jahr</b> auf dein Geld – nach {months} Monaten hat sie sich bezahlt. Sie würde {pct} % deiner Lücke zum Hamsterrad-Ausstieg schließen.'],
  eLoanPart: ['The bank lends the other {loan} (mortgage), the rent pays it off. ', 'Die Bank leiht dir die restlichen {loan} (Darlehen), das zahlt die Miete ab. '],
  eAssetNeg: ['⚠️ This investment has <b>negative cash flow ({cf})</b>: it costs you money every month. Only worth it if you are sure to sell it at a big profit.', '⚠️ Diese Investition hat <b>negativen Cashflow ({cf})</b>: Sie kostet dich jeden Monat Geld. Lohnt sich nur, wenn du sicher mit großem Gewinn verkaufen kannst.'],
  eNeedLoan: ['You only have {cash}. Buying would need a <b>{loan} bank loan</b> = {int}/month interest.', 'Du hast nur {cash}. Zum Kaufen brauchst du <b>{loan} Bankkredit</b> = {int}/Monat Zinsen.'],
  eLand: ['<b>Land</b> brings no income. It is a bet: if a market card rezones it, buyers pay many times the price.', '<b>Land</b> bringt kein Einkommen. Es ist eine Wette: Wird es per Marktkarte Bauland, zahlen Käufer ein Vielfaches.'],
  eGold: ['<b>Gold</b> pays no income, but its price can jump in a crisis. In Germany gains are tax-free after holding it 1 year.', '<b>Gold</b> bringt kein Einkommen, aber der Preis kann in Krisen stark steigen. In Deutschland sind Gewinne nach 1 Jahr Haltedauer steuerfrei.'],
  eBond: ['A <b>government bond</b> is very safe but pays only {cf}/month on {down}. Safe, but it won’t get you out of the wheel.', 'Eine <b>Bundesanleihe</b> ist sehr sicher, bringt aber nur {cf}/Monat auf {down}. Sicher, aber damit kommst du nicht aus dem Hamsterrad.'],
  eStock: ['<b>Stocks</b> here pay no dividend – you earn only by <b>buying low and selling high</b>. {name} usually trades at {range}; today’s price is {price}, which is <b>{level}</b>. Profits are taxed 26.375 % above your €1,000 yearly allowance.', '<b>Aktien</b> zahlen hier keine Dividende – du verdienst nur, wenn du <b>günstig kaufst und teuer verkaufst</b>. {name} kostet meist {range}; heute {price} – das ist <b>{level}</b>. Gewinne über dem Freibetrag von 1.000 €/Jahr kosten 26,375 % Steuer.'],
  lvlLow: ['cheap', 'günstig'], lvlMid: ['average', 'normal'], lvlHigh: ['expensive', 'teuer'],
  eStockOwn: ['You own {n} {sym} (bought at avg {avg}). Selling all now gives {amt}.', 'Du besitzt {n} {sym} (Ø-Kaufkurs {avg}). Alles verkaufen bringt jetzt {amt}.'],
  eSplit: ['A <b>split</b> changes how many shares owners hold, not what they paid. 2:1 = twice as many shares; 1:2 = half as many. Nobody buys or sells now.', 'Ein <b>Split</b> ändert die Anzahl der Aktien, nicht den Kaufpreis. 2:1 = doppelt so viele Aktien, 1:2 = halb so viele. Jetzt kauft und verkauft niemand.'],
  eSell: ['A <b>buyer</b>! Everyone who owns the matching asset can sell now – even if it’s not their turn. Selling turns your equity into cash for bigger deals, but you lose the monthly cash flow. The bank loan is repaid from the price; profits within 10 years cost speculation tax.', 'Ein <b>Käufer</b>! Jeder, der das Passende besitzt, darf jetzt verkaufen – auch außerhalb seines Zuges. Verkaufen macht aus deinem Eigenkapital Bargeld für größere Deals, aber der monatliche Cashflow fällt weg. Das Darlehen wird vom Preis abgelöst; Gewinne innerhalb von 10 Jahren kosten Spekulationssteuer.'],
  eSellNone: ['You don’t own anything this buyer wants.', 'Du besitzt nichts, was dieser Käufer sucht.'],
  eSellMine: ['Your {asset}: you’d get <b>{net}</b> in cash and lose {cf}/month.', 'Dein(e) {asset}: Du bekämst <b>{net}</b> Bargeld und verlierst {cf}/Monat.'],
  eDoodad: ['<b>Doodads</b> are spending that gives nothing back. Real-life lesson: the rich buy assets first and pay for luxuries from the income of those assets.', '<b>Schnickschnack</b> sind Ausgaben, die nichts zurückbringen. Lektion fürs Leben: Reiche kaufen erst Vermögenswerte und bezahlen Luxus aus deren Einnahmen.'],
  eFinance: ['Buying on credit adds a <b>monthly payment</b> that lowers your cash flow for a long time. You can pay it off early in your financial statement.', 'Auf Pump kaufen bringt eine <b>monatliche Rate</b>, die deinen Cashflow lange senkt. Du kannst sie in deinem Finanzbericht vorzeitig ablösen.'],
  eRent: ['<b>Index rent</b> (Indexmiete) rises with inflation. Renters’ expenses grow; homeowners are not affected.', 'Eine <b>Indexmiete</b> steigt mit der Inflation. Mieter zahlen mehr, Eigentümer sind nicht betroffen.'],
  eEvent: ['An <b>event</b>: it happens automatically and is already in the log.', 'Ein <b>Ereignis</b>: Es passiert automatisch und steht schon im Spielverlauf.'],
  eCfAll: ['This changes the monthly cash flow of matching assets for <b>all players</b>.', 'Das ändert den monatlichen Cashflow passender Vermögenswerte für <b>alle Spieler</b>.'],
  oBuyStock: ['<b>Buy</b> – enter how many shares (costs that number × the price).', '<b>Kaufen</b> – gib die Anzahl ein (kostet Anzahl × Kurs).'],
  oBuyAsset: ['<b>Buy</b> for {amt}.', '<b>Kaufen</b> für {amt}.'],
  oSellBtn: ['<b>Sell</b> – use the buttons on the card.', '<b>Verkaufen</b> – über die Knöpfe auf der Karte.'],
  oEnd: ['<b>End turn</b> – pass to the next player (the card expires).', '<b>Zug beenden</b> – weiter zum nächsten Spieler (die Karte verfällt).'],
  eCharity: ['<b>Charity</b>: donate 10 % of your income ({amt}). In return you may roll 2 dice for 3 turns – you pass paydays faster and land on more deals.', '<b>Spende</b>: 10 % deines Einkommens ({amt}). Dafür darfst du 3 Runden mit 2 Würfeln würfeln – schneller über Zahltage und mehr Deals.'],
  tipCharityYes: ['A pro would donate – you can afford it and the extra speed pays off.', 'Ein Profi würde spenden – du kannst es dir leisten und das Tempo zahlt sich aus.'],
  tipCharityNo: ['A pro would keep the cash for now – you need it for deals.', 'Ein Profi würde das Geld jetzt behalten – du brauchst es für Deals.'],
  ePayday: ['<b>Payday!</b> You received your monthly cash flow: salary + passive income − expenses = {cf}.', '<b>Zahltag!</b> Du bekommst deinen monatlichen Cashflow: Gehalt + passives Einkommen − Ausgaben = {cf}.'],
  eBaby: ['<b>Baby!</b> Each child costs {per}/month but brings {kg} Kindergeld. Net: {net}/month.', '<b>Baby!</b> Jedes Kind kostet {per}/Monat, bringt aber {kg} Kindergeld. Netto: {net}/Monat.'],
  eFired: ['<b>Fired!</b> You paid one month of expenses minus unemployment benefit (Arbeitslosengeld I = 60 % of your net pay) and miss 2 turns. Passive income protects you from this – it keeps flowing without a job.', '<b>Gekündigt!</b> Du hast einen Monat Ausgaben minus Arbeitslosengeld I (60 % vom Netto) bezahlt und setzt 2 Runden aus. Passives Einkommen schützt dich davor – es fließt auch ohne Job.'],
  eEndGeneric: ['Your move is done. You can still take a loan or pay off debts, then end your turn.', 'Dein Zug ist erledigt. Du kannst noch Kredite aufnehmen oder Schulden ablösen, dann den Zug beenden.'],
  eFastBiz: ['A <b>business</b> on the fast track: pay {cost} once, earn +{cf} every Euro Flow Day. That gets you {pct} % of the way to the €50,000 goal.', 'Ein <b>Unternehmen</b> auf der Überholspur: einmal {cost} zahlen, jeden Euro-Flow-Tag +{cf}. Das bringt dich {pct} % näher ans 50.000-€-Ziel.'],
  eFastDream: ['Your <b>dream</b>! Buy it for {cost} and you win immediately.', 'Dein <b>Traum</b>! Kaufe ihn für {cost} und du gewinnst sofort.'],
  eFastGamble: ['A <b>gamble</b>: {text} Only bet money you can afford to lose.', 'Ein <b>Glücksspiel</b>: {text} Setze nur Geld, dessen Verlust du verkraftest.'],
  eFastCharity: ['A <b>foundation</b> costs {cost}, but lets you choose 1, 2 or 3 dice for the rest of the game – great for aiming at your dream.', 'Eine <b>Stiftung</b> kostet {cost}, aber du darfst für den Rest des Spiels 1, 2 oder 3 Würfel wählen – perfekt, um deinen Traum zu treffen.'],
  tipFastYes: ['A pro would do it.', 'Ein Profi würde zugreifen.'],
  tipFastNo: ['A pro would pass this time.', 'Ein Profi würde diesmal passen.'],
  tipBuyGood: ['A pro would <b>buy</b>: {roi} % yearly return on your cash.', 'Ein Profi würde <b>kaufen</b>: {roi} % Rendite pro Jahr auf dein Geld.'],
  tipBuyLoanOk: ['A pro would <b>buy</b>, even with a {loan} loan: it pays {cf}/month, the loan costs {int}/month. Repay the loan soon.', 'Ein Profi würde <b>kaufen</b>, auch mit {loan} Kredit: Es bringt {cf}/Monat, der Kredit kostet {int}/Monat. Kredit bald tilgen.'],
  tipSkipNeg: ['A pro would <b>skip</b>: negative cash flow costs you every month.', 'Ein Profi würde <b>passen</b>: Negativer Cashflow kostet dich jeden Monat.'],
  tipSkipLoan: ['A pro would <b>skip</b>: the loan interest ({int}/month) would eat the cash flow ({cf}/month).', 'Ein Profi würde <b>passen</b>: Die Kreditzinsen ({int}/Monat) fressen den Cashflow ({cf}/Monat).'],
  tipSkipRoi: ['A pro would <b>skip</b>: only {roi} % per year – too little.', 'Ein Profi würde <b>passen</b>: Nur {roi} % pro Jahr – zu wenig.'],
  tipSkipCash: ['A pro would <b>skip</b>: with the loan your monthly cash flow would drop below zero.', 'Ein Profi würde <b>passen</b>: Mit dem Kredit fiele dein monatlicher Cashflow unter null.'],
  tipNoCash: ['A pro would <b>skip</b>: not enough spare cash right now.', 'Ein Profi würde <b>passen</b>: Gerade nicht genug freies Geld.'],
  tipLandBuy: ['A pro might <b>buy</b> with spare cash – a cheap lottery ticket for a rezoning card.', 'Ein Profi kauft das evtl. mit freiem Geld – ein günstiges Los auf eine Bauland-Karte.'],
  tipLandSkip: ['A pro would <b>skip</b>: no income and cash is tight.', 'Ein Profi würde <b>passen</b>: Kein Einkommen und das Geld ist knapp.'],
  tipGoldBuy: ['A pro would <b>buy</b> a little gold with spare cash and wait for a gold-rush card.', 'Ein Profi kauft mit freiem Geld etwas Gold und wartet auf eine Goldrausch-Karte.'],
  tipGoldSkip: ['A pro would <b>skip</b>: no income, and you need the cash for deals.', 'Ein Profi würde <b>passen</b>: Kein Einkommen, und du brauchst das Geld für Deals.'],
  tipBond: ['A pro would <b>skip</b>: safe, but the return is too small to matter here.', 'Ein Profi würde <b>passen</b>: Sicher, aber die Rendite ist hier zu klein.'],
  tipStockBuy: ['Cheap price! A pro <b>buys</b> now and waits to sell at {high} or more.', 'Günstiger Kurs! Ein Profi <b>kauft</b> jetzt und wartet auf einen Verkauf ab {high}.'],
  tipStockSkip: ['Not cheap enough – a pro <b>waits</b> for a lower price.', 'Nicht günstig genug – ein Profi <b>wartet</b> auf einen niedrigeren Kurs.'],
  tipStockSell: ['A pro would <b>sell</b> your shares at this high price.', 'Ein Profi würde deine Aktien zu diesem hohen Kurs <b>verkaufen</b>.'],
  tipStockHold: ['A pro would <b>hold</b> your shares – the price isn’t high enough yet ({high}+).', 'Ein Profi würde deine Aktien <b>halten</b> – der Kurs ist noch nicht hoch genug ({high}+).'],
  tipSellYes: ['A pro would <b>sell</b>: you get {net} now – that’s {months} months of its cash flow at once.', 'Ein Profi würde <b>verkaufen</b>: Du bekommst jetzt {net} – das sind {months} Monate Cashflow auf einmal.'],
  tipSellNo: ['A pro would <b>keep</b> it: the price isn’t worth giving up the monthly cash flow.', 'Ein Profi würde <b>behalten</b>: Der Preis lohnt den Verzicht auf den Cashflow nicht.'],
  tipPayLoan: ['Your bank loan costs 10 % <b>per month</b>. A pro repays {amt} now.', 'Dein Bankkredit kostet 10 % <b>pro Monat</b>. Ein Profi tilgt jetzt {amt}.'],
  tipPayDebt: ['A pro would pay off <b>{debt}</b> ({amt}) – it cuts your expenses by {pay}/month.', 'Ein Profi würde <b>{debt}</b> ablösen ({amt}) – das senkt deine Ausgaben um {pay}/Monat.'],
  tipEscape: ['Your passive income already beats your expenses – next turn you move to the fast track!', 'Dein passives Einkommen schlägt schon deine Ausgaben – nächsten Zug geht es auf die Überholspur!'],
});

const li = s => `<li>${s}</li>`;

export function coachHTML(s, isMine) {
  if (!s || s.phase === 'lobby') return '';
  const cur = s.players[s.turn];
  const me = isMine(cur) ? cur : s.players.find(isMine);
  const out = [];
  const recent = s.log.slice(-3).map(logLine).map(x => `<div class="cl">${x}</div>`).join('');
  out.push(`<h5>${t('cJust')}</h5>${recent}`);
  const explain = [], options = [], tips = [];

  if (s.phase === 'order') {
    explain.push(t('cOrder'));
    if (me && s.order.eligible.includes(me.id) && s.order.rolls[me.id] == null) options.push(t('oOrderRoll'));
  } else if (s.phase === 'over') {
    return out.join('');
  } else if (!me) {
    explain.push(t('cNotYourTurn', { name: cur.name }));
  } else {
    // goal reminder
    if (me.track === 'rat') explain.push(t('cGoalRat', { pas: { m: passive(me) }, exp: { m: totalExpenses(me) }, gap: { m: Math.max(0, totalExpenses(me) - passive(me)) } }));
    else explain.push(t('cGoalFast', { dream: fastName(me.dream), cost: { m: dreamCost(s, me.dream) }, have: { m: me.fast.income - me.fast.start } }));
    if (me !== cur) explain.push(t('cNotYourTurn', { name: cur.name }));
    const card = cardOf(s.card);
    // market / stock card: everybody's selling options
    if (card && s.step === 'card') explainCard(s, me, cur, card, explain, options, tips);
    if (me === cur) explainStep(s, me, card, explain, options, tips);
  }
  if (explain.length) out.push(`<h5>${t('cExplain')}</h5>${explain.map(x => `<p>${x}</p>`).join('')}`);
  if (options.length) out.push(`<h5>${t('cOptions')}</h5><ul>${options.map(li).join('')}${me && me.track === 'rat' && s.phase === 'play' ? li(t('cAnytime')) : ''}</ul>`);
  if (tips.length) out.push(`<div class="ctip"><b>${t('cTip')}</b> ${tips.join(' ')}</div>`);
  return out.join('');
}

function explainCard(s, me, cur, card, explain, options, tips) {
  const mineAssets = me.assets.filter(a => sellable(card, a));
  switch (card.type) {
    case 'asset': {
      if (me !== cur) break;
      const down = buyCost(card);
      if (card.kind === 'land') explain.push(t('eLand'));
      else if (card.kind === 'gold') explain.push(t('eGold'));
      else if (card.kind === 'bond') explain.push(t('eBond', { cf: { m: card.cf }, down: { m: down } }));
      else if (card.cf < 0) explain.push(t('eAssetNeg', { cf: { m: card.cf } }));
      else {
        const loan = darlehen(card);
        const gap = Math.max(1, totalExpenses(me) - passive(me));
        explain.push(t('eAsset', {
          down: { m: down }, cf: { sm: card.cf }, roi: Math.round(card.cf * 1200 / down), months: Math.ceil(down / card.cf),
          pct: Math.min(100, Math.round(card.cf / gap * 100)),
          loanPart: loan ? { k: 'eLoanPart', p: { loan: { m: loan } } } : '',
        }));
      }
      if (me.cash < down) { const l = Math.ceil((down - me.cash) / 1000) * 1000; explain.push(t('eNeedLoan', { cash: { m: me.cash }, loan: { m: l }, int: { m: l / 10 } })); }
      if (!s.card.done) {
        options.push(t('oBuyAsset', { amt: { m: down } }));
        const d = decideBuy(s, me, card, 'hard');
        if (d.why) tips.push(t(d.why, d.params));
      }
      break;
    }
    case 'stock': {
      const st = STOCKS[card.sym];
      const [lo, hi] = st.range.match(/\d+/g).map(Number);
      const level = card.price <= lo + (hi - lo) * 0.2 ? 'lvlLow' : card.price >= lo + (hi - lo) * 0.65 ? 'lvlHigh' : 'lvlMid';
      explain.push(t('eStock', { name: card.sym, range: `${fmt(lo)} – ${fmt(hi)}`, price: { m: card.price }, level: { k: level } }));
      for (const a of mineAssets) {
        explain.push(t('eStockOwn', { n: a.shares, sym: a.sym, avg: { m: a.cost / a.shares }, amt: { m: card.price * a.shares - saleTax(me, card, a, a.shares).tax } }));
        options.push(t('oSellBtn'));
        const d = decideSell(s, me, card, a, 'hard'); if (d.why) tips.push(t(d.why, d.params));
      }
      if (me === cur && !s.card.done) {
        options.push(t('oBuyStock'));
        const d = decideBuy(s, me, card, 'hard'); if (d.why) tips.push(t(d.why, d.params));
      }
      break;
    }
    case 'split': explain.push(t('eSplit')); break;
    case 'sell':
      explain.push(t('eSell'));
      if (!mineAssets.length) explain.push(t('eSellNone'));
      for (const a of mineAssets) {
        explain.push(t('eSellMine', { asset: assetName(a), net: { sm: saleNet(me, card, a) }, cf: { m: a.cf } }));
        const d = decideSell(s, me, card, a, 'hard'); if (d.why) tips.push(t(d.why, d.params));
      }
      if (mineAssets.length) options.push(t('oSellBtn'));
      break;
    case 'pay': case 'payKids': if (me === cur) explain.push(t('eDoodad')); break;
    case 'finance': if (me === cur) explain.push(t('eDoodad'), t('eFinance')); break;
    case 'rentUp': if (me === cur) explain.push(t('eRent')); break;
    case 'cfAll': explain.push(t('eCfAll')); break;
    default: if (me === cur) explain.push(t('eEvent'));
  }
}

function explainStep(s, me, card, explain, options, tips) {
  switch (s.step) {
    case 'roll': {
      if (me.skip > 0) { options.push(t('oSkip')); break; }
      if (me.track === 'rat') {
        options.push(t('oRoll', { cf: { sm: cashflow(me) } }));
        if (me.charity > 0) options.push(t('oDice12'));
        const debt = debtToPay(me, 'hard');
        if (debt?.which === 'loan') tips.push(t('tipPayLoan', { amt: { m: debt.amount } }));
        else if (debt) tips.push(t('tipPayDebt', { debt: { k: 'debt_' + debt.which }, amt: { m: me.debts[debt.which].bal }, pay: { m: me.debts[debt.which].pay } }));
        if (passive(me) > totalExpenses(me)) tips.push(t('tipEscape'));
      } else options.push(t('oRollFast', { amt: { m: me.fast.income } }));
      break;
    }
    case 'deal':
      explain.push(t('eDeal', { cash: { m: me.cash } }));
      options.push(t('oSmall'), t('oBig'), t('oNoDeal'));
      tips.push(t(decideDeal(me, 'hard') === 'big' ? 'tipBig' : 'tipSmall'));
      break;
    case 'card': options.push(t('oEnd')); break;
    case 'charity': {
      const amt = Math.round(totalIncome(me) * 0.1);
      explain.push(t('eCharity', { amt: { m: amt } }));
      tips.push(t(decideCharity(me, 'hard') ? 'tipCharityYes' : 'tipCharityNo'));
      break;
    }
    case 'fast': {
      const sp = FAST[me.pos];
      if (sp.type === 'biz') explain.push(t('eFastBiz', { cost: { m: sp.cost }, cf: { m: sp.cf }, pct: Math.round(sp.cf / 500) }));
      if (sp.type === 'dream') explain.push(t('eFastDream', { cost: { m: dreamCost(s, me.pos) } }));
      if (sp.type === 'gamble') explain.push(t('eFastGamble', { text: fastText(me.pos) }));
      if (sp.type === 'charity') explain.push(t('eFastCharity', { cost: { m: sp.cost } }));
      tips.push(t(decideFast(s, me, 'hard') ? 'tipFastYes' : 'tipFastNo'));
      options.push(t('oEnd'));
      break;
    }
    case 'end': {
      const last = me.track === 'rat' ? RAT[me.pos] : null;
      if (last === 'payday') explain.push(t('ePayday', { cf: { sm: cashflow(me) } }));
      else if (last === 'baby') explain.push(t('eBaby', { per: { m: me.childPer }, kg: { m: KINDERGELD }, net: { sm: KINDERGELD - me.childPer } }));
      else if (last === 'downsized') explain.push(t('eFired'));
      else explain.push(t('eEndGeneric'));
      options.push(t('oEnd'));
      break;
    }
  }
}
