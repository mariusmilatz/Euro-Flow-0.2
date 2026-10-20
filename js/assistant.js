// Euro Flow – the coach 🐹: explains the card, what just happened and which options you have.
import { FAST, RAT, STOCKS, KINDERGELD } from './data.js';
import {
  cardOf, passive, escapeTarget, livingCosts, healthCost, totalIncome, cashflow, sellable, saleNet, saleTax, darlehen, buyCost, dreamCost,
  R, working, algAmount, BUILDINGS, IMMO, bausparOf,
} from './engine.js';
import { decideBuy, decideSell, decideDeal, decideCharity, debtToPay, decideFast, decideChoice, advisorWorth } from './bot.js';
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
  cGoalRat: ['Your goal: passive income bigger than your escape target (living costs + self-paid health insurance – salary taxes don’t count, because without a job you don’t pay them). Now: {pas} passive vs. {exp} target – you need {gap} more per month.', 'Dein Ziel: passives Einkommen größer als dein Ausstiegsziel (Lebenshaltung + selbst bezahlte Krankenversicherung – Lohnsteuer und Sozialabgaben zählen nicht, denn ohne Job zahlst du sie nicht). Jetzt: {pas} passiv gegen {exp} Ziel – es fehlen noch {gap} pro Monat.'],
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
  eFired: ['<b>Fired!</b> For the next 2 paydays you get unemployment benefit (Arbeitslosengeld I = 60 % of your net pay) instead of your salary. No taxes or social insurance on it, and your investments keep paying. That’s why passive income protects you.', '<b>Gekündigt!</b> Die nächsten 2 Zahltage bekommst du Arbeitslosengeld I (60 % vom Netto) statt Gehalt – ohne Steuern und Sozialabgaben, und deine Investitionen zahlen weiter. Darum schützt dich passives Einkommen.'],
  eEndGeneric: ['Your move is done. You can still take a loan or pay off debts, then end your turn.', 'Dein Zug ist erledigt. Du kannst noch Kredite aufnehmen oder Schulden ablösen, dann den Zug beenden.'],
  eFastBiz: ['A <b>business</b> on the fast track: pay {cost} once, earn +{cf} every Euro Flow Day. That gets you {pct} % of the way to the €50,000 goal.', 'Ein <b>Unternehmen</b> auf der Überholspur: einmal {cost} zahlen, jeden Euro-Flow-Tag +{cf}. Das bringt dich {pct} % näher ans 50.000-€-Ziel.'],
  eFastDream: ['Your <b>dream</b>! Buy it for {cost} and you win immediately.', 'Dein <b>Traum</b>! Kaufe ihn für {cost} und du gewinnst sofort.'],
  eFastDreamOther: ['Nobody has chosen this dream. You may buy it for {cost} just for fun – it does not win the game.', 'Diesen Traum hat niemand gewählt. Du kannst ihn für {cost} einfach so kaufen – er gewinnt aber nicht.'],
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
  jxPayday: ['Payday = salary + passive income − expenses. That is what the month really leaves over.', 'Zahltag = Gehalt + passives Einkommen − Ausgaben. So viel bleibt im Monat wirklich übrig.'],
  jxQuickSell: ['A quick sale: the agent found a buyer at once, but below market value, with agent fee, an early-repayment penalty on the mortgage and – inside the speculation period – tax on the profit. Selling on a market card or after the speculation period is usually cheaper.', 'Ein Schnellverkauf: Der Makler hat sofort einen Käufer gefunden, aber unter Marktwert, mit Maklerprovision, Vorfälligkeitsentschädigung aufs Darlehen und – innerhalb der Spekulationsfrist – Steuer auf den Gewinn. Über eine Marktkarte oder nach der Spekulationsfrist ist es meist günstiger.'],
  jxAutoLoan: ['There wasn’t enough cash, so the bank lent the rest. That loan now costs 10 % interest every month.', 'Das Bargeld reichte nicht, die Bank hat den Rest geliehen. Dieser Kredit kostet jetzt jeden Monat 10 % Zinsen.'],
  jxPays: ['Money went out without bringing anything back.', 'Geld ist rausgegangen, ohne etwas zurückzubringen.'],
  jxBuys: ['An asset was bought – from now on it pays its owner every payday.', 'Ein Vermögenswert wurde gekauft – ab jetzt bringt er seinem Besitzer jeden Zahltag Geld.'],
  jxSellsAsset: ['Sold: the bank loan is paid back from the price, taxes are due on quick profits, the rest is cash. The monthly income from it is gone.', 'Verkauft: Das Darlehen wird vom Preis abgelöst, auf schnelle Gewinne gibt es Steuern, der Rest ist Bargeld. Das monatliche Einkommen daraus fällt weg.'],
  jxSellsStock: ['Shares sold: the profit is sale price minus purchase price; profit above €1,000 a year is taxed.', 'Aktien verkauft: Gewinn = Verkaufspreis minus Kaufpreis; über 1.000 € im Jahr wird er versteuert.'],
  jxBaby: ['Higher monthly expenses – partly covered by Kindergeld.', 'Höhere monatliche Ausgaben – teilweise durch Kindergeld gedeckt.'],
  jxFired: ['Without a job only passive income keeps flowing. The player misses 2 turns.', 'Ohne Job fließt nur noch passives Einkommen. Der Spieler setzt 2 Runden aus.'],
  jxDonates: ['Giving back: for 3 turns this player can move faster with 2 dice.', 'Etwas zurückgeben: 3 Runden lang kann dieser Spieler mit 2 Würfeln schneller ziehen.'],
  jxEnterFast: ['Passive income now pays all the bills – this player no longer needs a job and plays the fast track.', 'Das passive Einkommen bezahlt jetzt alle Rechnungen – dieser Spieler braucht keinen Job mehr und spielt auf der Überholspur.'],
  jxReturnCash: ['Rule: the rat-race cash goes back to the bank – on the fast track you start with your buyout.', 'Regel: Das Bargeld aus dem Hamsterrad geht an die Bank zurück – auf der Überholspur startest du mit deiner Auszahlung.'],
  jxDreamMark: ['Landing on someone else’s dream makes it more expensive for them.', 'Wer auf dem Traum eines anderen landet, macht ihn für diesen teurer.'],
  jxBizFee: ['Owning businesses on the fast track pays twice: monthly income and €50,000 whenever someone lands there.', 'Unternehmen auf der Überholspur zahlen doppelt: monatliches Einkommen und 50.000 €, wenn jemand darauf landet.'],
  jxCfDay: ['Euro Flow Day: the fast-track payday.', 'Euro-Flow-Tag: der Zahltag auf der Überholspur.'],
  jxSplit: ['Same value, different number of shares.', 'Gleicher Wert, andere Anzahl Aktien.'],
  jxCfChange: ['The economy changed – so did the monthly income of these assets.', 'Die Wirtschaft hat sich verändert – und damit das monatliche Einkommen dieser Vermögenswerte.'],
  jxRentUp: ['Renters’ expenses went up permanently.', 'Die Ausgaben von Mietern sind dauerhaft gestiegen.'],
  jxFinance: ['Bought on credit: a new monthly payment lowers cash flow until it is paid off.', 'Auf Pump gekauft: Eine neue Monatsrate senkt den Cashflow, bis sie abbezahlt ist.'],
  jxGain: ['Extra cash – a good moment to invest it.', 'Extra Bargeld – ein guter Moment, es zu investieren.'],
  jxBankrupt: ['Expenses were bigger than income and the cash ran out. The bank takes the assets.', 'Die Ausgaben waren größer als das Einkommen und das Geld ist aus. Die Bank nimmt die Vermögenswerte.'],
  jxLoan: ['A loan gives cash now, but costs 10 % of it every month.', 'Ein Kredit bringt jetzt Geld, kostet aber jeden Monat 10 % davon.'],
  jxRepay: ['Debt paid off: lower monthly expenses from now on.', 'Schulden abgelöst: ab jetzt niedrigere monatliche Ausgaben.'],
  jxSkip: ['Missing a turn (fired or bankruptcy).', 'Runde aussetzen (Kündigung oder Insolvenz).'],
  jxLoseHalf: ['A fast-track obstacle: half the cash is gone.', 'Ein Hindernis auf der Überholspur: die Hälfte des Bargelds ist weg.'],
  jxDivorce: ['A fast-track obstacle: all cash is gone.', 'Ein Hindernis auf der Überholspur: das ganze Bargeld ist weg.'],
  jxBuysBiz: ['More Euro Flow Day income – one step closer to +€50,000.', 'Mehr Euro-Flow-Tag-Einkommen – ein Schritt näher an +50.000 €.'],
  jxGamble: ['A risky bet: big win or money lost.', 'Eine riskante Wette: großer Gewinn oder Geld weg.'],
  jxOrderTie: ['Same number – those players roll again.', 'Gleiche Zahl – diese Spieler würfeln nochmal.'],
  jxStarts: ['Highest roll starts; then play goes clockwise.', 'Die höchste Zahl beginnt; danach geht es im Uhrzeigersinn weiter.'],
  jxBuysDream: ['An extra dream – nice, but only your own dream ★ wins the game.', 'Ein zusätzlicher Traum – schön, aber nur dein eigener Traum ★ gewinnt.'],
  cOver: ['The game is over. Start a new game from the menu.', 'Das Spiel ist vorbei. Starte ein neues Spiel über das Menü.'],
  oWaitOrder: ['Wait until everyone has rolled.', 'Warte, bis alle gewürfelt haben.'],
  oWatch: ['Watch and learn from the other players’ moves.', 'Schau zu und lerne von den Zügen der anderen.'],
  oWait: ['Wait – it’s {name}’s turn.', 'Warten – {name} ist am Zug.'],
  oNothing: ['Nothing to do right now.', 'Gerade nichts zu tun.'],
  gTipOrder: ['Going first is a small advantage – but good decisions matter much more than the order.', 'Anfangen ist ein kleiner Vorteil – gute Entscheidungen zählen aber viel mehr als die Reihenfolge.'],
  gTip1: ['Small deals with positive cash flow are the safest start. Several small flats add up.', 'Kleine Deals mit positivem Cashflow sind der sicherste Start. Mehrere kleine Wohnungen summieren sich.'],
  gTip2: ['Keep some cash ready – a great big deal can appear at any moment.', 'Halte etwas Bargeld bereit – ein toller großer Deal kann jederzeit kommen.'],
  gTip3: ['Bank loans cost 10 % per month. Only borrow when the deal pays more than the interest, and repay fast.', 'Bankkredite kosten 10 % pro Monat. Leih dir nur Geld, wenn der Deal mehr bringt als die Zinsen, und tilge schnell.'],
  gTip4: ['Watch the market: selling a condo at a high price can pay for a whole apartment building.', 'Beobachte den Markt: Eine teuer verkaufte Wohnung kann ein ganzes Mehrfamilienhaus finanzieren.'],
  gTip5: ['Paying off expensive debt (credit card, instalments) lowers your expenses – and the finish line moves closer.', 'Teure Schulden ablösen (Kreditkarte, Ratenkäufe) senkt deine Ausgaben – und das Ziel rückt näher.'],
  gTip6: ['A low salary isn’t bad here: lower expenses mean you need less passive income to escape.', 'Ein niedriges Gehalt ist hier nicht schlimm: Niedrige Ausgaben heißen, du brauchst weniger passives Einkommen zum Ausstieg.'],
  gTipFast1: ['Buy the businesses with the highest monthly income first – they get you to +€50,000 fastest.', 'Kaufe zuerst die Unternehmen mit dem höchsten Monatseinkommen – so erreichst du +50.000 € am schnellsten.'],
  gTipFast2: ['Keep enough cash for your dream: the moment you land on it, you can win.', 'Halte genug Bargeld für deinen Traum bereit: Sobald du darauf landest, kannst du gewinnen.'],
  eCrypto: ['<b>Crypto</b> pays no income and swings wildly. German rule: held longer than 1 year (1 lap), gains are completely tax-free; before that, gains above €1,000 a year are taxed at your personal rate.', '<b>Krypto</b> bringt kein Einkommen und schwankt stark. Deutsche Regel: Nach über 1 Jahr Haltedauer (1 Runde) sind Gewinne komplett steuerfrei; davor werden Gewinne über 1.000 € im Jahr mit deinem persönlichen Steuersatz besteuert.'],
  eCoop: ['<b>Cooperative shares</b> are very safe and pay about 3 % ({cf}/month on {down}). Good for peace of mind, too small to escape with.', '<b>Genossenschaftsanteile</b> sind sehr sicher und bringen rund 3 % ({cf}/Monat auf {down}). Gut fürs Gewissen, zu klein für den Ausstieg.'],
  eImmoTax: ['German tax rule: if you sell this property at a profit within the speculation period (4 laps in the game, 10 years in real life), the gain is taxed at your personal rate. After that it is tax-free.', 'Deutsche Steuerregel: Verkaufst du diese Immobilie innerhalb der Spekulationsfrist (4 Runden im Spiel, 10 Jahre in echt) mit Gewinn, wird der Gewinn mit deinem persönlichen Steuersatz versteuert. Danach ist er steuerfrei.'],
  eDenkmal: ['<b>Listed building:</b> with a tax advisor you can write off 9 % per year instead of 2 % – the higher your tax rate, the more it saves.', '<b>Denkmalschutz:</b> Mit Steuerberater schreibst du 9 % pro Jahr ab statt 2 % – je höher dein Steuersatz, desto mehr sparst du.'],
  oBuyBauspar: ['<b>Buy with Bausparvertrag</b> – your Bauspar savings go into the deal plus a cheap building loan (1 %/month) instead of the 10 % bank loan.', '<b>Mit Bausparvertrag kaufen</b> – dein Bauspar-Guthaben fließt in den Kauf plus ein günstiges Bauspardarlehen (1 %/Monat) statt des Bankkredits zu 10 %.'],
  eEtfPlan: ['An <b>ETF savings plan</b> invests a fixed amount every payday into a fund of 1,500 companies. The index moves with every market space. You get 4 % of the value per year as passive income, so it slowly helps you escape. You can change, pause or sell it any time in your statement.', 'Ein <b>ETF-Sparplan</b> investiert jeden Zahltag einen festen Betrag in einen Fonds aus 1.500 Firmen. Der Index bewegt sich mit jedem Marktfeld. Du bekommst 4 % des Werts pro Jahr als passives Einkommen – das hilft langsam beim Ausstieg. Ändern, pausieren oder verkaufen kannst du jederzeit im Finanzbericht.'],
  oEtfPlan: ['<b>Start/increase the plan</b> – choose the amount per payday. It lowers your monthly cash, but the money is not gone: it is invested.', '<b>Sparplan starten/erhöhen</b> – wähle den Betrag pro Zahltag. Er senkt dein monatliches Bargeld, aber das Geld ist nicht weg: es ist investiert.'],
  eBauspar: ['A <b>Bausparvertrag</b> is a German classic: you save a fixed amount each payday. Once €3,000 is saved, it is ready and you can use it when buying a building: the savings go into the purchase and the building society lends up to twice as much at 1 % per month – much cheaper than the 10 % bank loan.', 'Ein <b>Bausparvertrag</b> ist ein deutscher Klassiker: Du sparst jeden Zahltag einen festen Betrag. Ab 3.000 € ist er zuteilungsreif und beim Immobilienkauf nutzbar: Das Guthaben fließt in den Kauf und die Bausparkasse leiht dir bis zum Doppelten zu 1 % pro Monat – viel günstiger als der Bankkredit zu 10 %.'],
  oBauspar: ['<b>Sign</b> the contract ({amt}/payday) or end your turn.', '<b>Abschließen</b> oder Zug beenden.'],
  eChoice: ['You decide. If you quit yourself, the job centre imposes a <b>Sperrzeit</b> of 12 weeks (here: 3 paydays) without unemployment benefit – but you then start a better-paid job. If you stay, it costs money now.', 'Du entscheidest. Kündigst du selbst, verhängt die Arbeitsagentur eine <b>Sperrzeit</b> von 12 Wochen (hier: 3 Zahltage) ohne Arbeitslosengeld – danach startest du aber einen besser bezahlten Job. Bleibst du, kostet es jetzt Geld.'],
  oChoice: ['<b>A) Quit</b> or <b>B) Stay</b>.', '<b>A) Kündigen</b> oder <b>B) Bleiben</b>.'],
  tipQuit: ['A pro would quit: you have enough cash to bridge 3 paydays, and +10 % salary pays off for the rest of the game.', 'Ein Profi würde kündigen: Du hast genug Bargeld für 3 Zahltage, und +10 % Gehalt lohnen sich für den Rest des Spiels.'],
  tipStay: ['A pro would stay: 3 paydays without income would hurt too much right now.', 'Ein Profi würde bleiben: 3 Zahltage ohne Einkommen täten gerade zu sehr weh.'],
  eRate: ['The <b>ECB</b> changed interest rates. Low rates make property more valuable (buyers pay more), high rates make it cheaper. It changes the prices on property buyer cards and the value of your property.', 'Die <b>EZB</b> hat die Zinsen geändert. Niedrige Zinsen machen Immobilien wertvoller (Käufer zahlen mehr), hohe Zinsen billiger. Das ändert die Preise auf Immobilien-Käuferkarten und den Wert deiner Immobilien.'],
  eIndex: ['The <b>World ETF</b> moved. Everyone with an ETF savings plan gains or loses. Crashes are normal – people who keep saving buy cheaply.', 'Der <b>Welt-ETF</b> hat sich bewegt. Alle mit ETF-Sparplan gewinnen oder verlieren. Crashs sind normal – wer weiter spart, kauft günstig.'],
  eBadTenant: ['<b>Rent nomad:</b> German tenant protection means an eviction takes months. During that time the property earns no rent – but the loan still has to be paid.', '<b>Mietnomade:</b> Wegen des deutschen Mieterschutzes dauert eine Räumung Monate. So lange bringt die Immobilie keine Miete – der Kredit muss trotzdem bezahlt werden.'],
  eAlg: ['You are <b>unemployed</b>: instead of your salary you get {amt} unemployment benefit for {n} more paydays. Your investments keep paying.', 'Du bist <b>arbeitslos</b>: Statt Gehalt bekommst du noch {n} Zahltage lang {amt} Arbeitslosengeld. Deine Investitionen zahlen weiter.'],
  eSperr: ['<b>Sperrzeit:</b> for {n} more paydays you get neither salary nor unemployment benefit. Then your new job starts.', '<b>Sperrzeit:</b> Noch {n} Zahltage bekommst du weder Gehalt noch Arbeitslosengeld. Dann beginnt dein neuer Job.'],
  tipAdvisor: ['Hire a tax advisor (in your statement): depreciation on your property would save you {amt}/month in income tax.', 'Beauftrage einen Steuerberater (im Finanzbericht): Die Abschreibung deiner Immobilien würde dir {amt}/Monat Lohnsteuer sparen.'],
  tipEtfYes: ['A pro would start a plan of about {amt} per payday – steady investing beats timing the market.', 'Ein Profi würde einen Sparplan über rund {amt} pro Zahltag starten – regelmäßig investieren schlägt Market-Timing.'],
  tipEtfNo: ['A pro would skip for now – your cash flow is small, keep the cash for deals.', 'Ein Profi würde jetzt passen – dein Cashflow ist klein, behalte das Geld für Deals.'],
  tipBausparYes: ['A pro would sign: it forces you to save and unlocks a cheap loan for your next property.', 'Ein Profi würde abschließen: Es zwingt zum Sparen und schaltet ein günstiges Darlehen für die nächste Immobilie frei.'],
  tipBausparNo: ['A pro would skip: right now the money works better in deals.', 'Ein Profi würde passen: Gerade arbeitet das Geld in Deals besser.'],
  tipCoop: ['Safe but only about 3 % – a pro skips it here.', 'Sicher, aber nur rund 3 % – ein Profi passt hier.'],
  tipCryptoBuy: ['A pro might buy a little with spare cash – a lottery ticket that is tax-free after 1 year.', 'Ein Profi kauft evtl. ein wenig mit freiem Geld – ein Los, das nach 1 Jahr steuerfrei ist.'],
  tipCryptoSkip: ['A pro would skip: very risky and you need the cash.', 'Ein Profi würde passen: sehr riskant, und du brauchst das Geld.'],
  tipUseBauspar: ['A pro would buy with the Bausparvertrag – a cheap loan instead of the 10 % bank loan.', 'Ein Profi würde mit dem Bausparvertrag kaufen – günstiges Darlehen statt Bankkredit zu 10 %.'],
  tipWaitTax: ['A pro would wait: selling now costs {tax} speculation tax – after the speculation period it is tax-free.', 'Ein Profi würde warten: Jetzt verkaufen kostet {tax} Spekulationssteuer – nach der Spekulationsfrist ist es steuerfrei.'],
  law: ['📜 German law: {ref}', '📜 Gesetz: {ref}'],
  tipEscape: ['Your passive income already beats your expenses – next turn you move to the fast track!', 'Dein passives Einkommen schlägt schon deine Ausgaben – nächsten Zug geht es auf die Überholspur!'],
});

const li = s => `<li>${s}</li>`;
const p_unemployed = p => p.alg > 0 || p.sperr > 0;

// Plain-language explanation for a log entry (shown under "What just happened")
const JX = {
  lPayday: 'jxPayday', lAutoLoan: 'jxAutoLoan', lQuickSell: 'jxQuickSell', lPays: 'jxPays', lBuys: 'jxBuys', lSellsAsset: 'jxSellsAsset', lSellsStock: 'jxSellsStock',
  lBaby: 'jxBaby', lFired: 'jxFired', lDonates: 'jxDonates', lEnterFast: 'jxEnterFast', lReturnCash: 'jxReturnCash',
  lDreamMark: 'jxDreamMark', lBizFee: 'jxBizFee', lCfDay: 'jxCfDay', lSplit: 'jxSplit', lCfChange: 'jxCfChange', lRentUp: 'jxRentUp',
  lFinance: 'jxFinance', lGain: 'jxGain', lBankrupt: 'jxBankrupt', lLoan: 'jxLoan', lRepayLoan: 'jxRepay', lRepayDebt: 'jxRepay',
  lSkipTurn: 'jxSkip', lLoseHalf: 'jxLoseHalf', lDivorce: 'jxDivorce', lBuysBiz: 'jxBuysBiz', lGambleWin: 'jxGamble', lGambleLose: 'jxGamble',
  lOrderTie: 'jxOrderTie', lStarts: 'jxStarts', lBuysDream: 'jxBuysDream',
};
const SKIP_JUST = new Set(['lOrderRoll', 'lProfIs', 'lOrderStart']);

export function coachHTML(s, isMine, justOpen = false) {
  if (!s || s.phase === 'lobby') return '';
  const cur = s.players[s.turn];
  const me = isMine(cur) ? cur : s.players.find(isMine);
  const explain = [], options = [], tips = [];

  // 1) What just happened – last events, each with a plain explanation
  let recent = s.log.filter(e => !SKIP_JUST.has(e[0]) || s.phase === 'order').slice(-4);
  if (!recent.length) recent = s.log.slice(-3);
  const just = recent.map(e => `<div class="cl">${logLine(e)}${JX[e[0]] ? `<small>${t(JX[e[0]])}</small>` : ''}</div>`).join('');

  // 2–4) meaning, options, tip
  if (s.phase === 'order') {
    explain.push(t('cOrder'));
    if (me && s.order.eligible.includes(me.id) && s.order.rolls[me.id] == null) options.push(t('oOrderRoll'));
    else options.push(t('oWaitOrder'));
    tips.push(t('gTipOrder'));
  } else if (s.phase === 'over') {
    explain.push(t('cOver'));
  } else if (!me) {
    explain.push(t('cNotYourTurn', { name: cur.name }));
    options.push(t('oWatch'));
  } else {
    if (me.track === 'rat') explain.push(t('cGoalRat', { pas: { m: passive(me) }, exp: { m: escapeTarget(me, s) }, gap: { m: Math.max(0, escapeTarget(me, s) - passive(me)) } }));
    else explain.push(t('cGoalFast', { dream: fastName(me.dream), cost: { m: dreamCost(s, me.dream) }, have: { m: me.fast.income - me.fast.start } }));
    const card = cardOf(s.card);
    if (me !== cur) { explain.push(t('cNotYourTurn', { name: cur.name })); options.push(t('oWait', { name: cur.name })); }
    if (card && s.step === 'card') explainCard(s, me, cur, card, explain, options, tips);
    if (me === cur) explainStep(s, me, card, explain, options, tips);
    const ref = card && s.step === 'card' ? lawForCard(card) : me === cur ? lawForStep(s, me) : '';
    if (ref) explain.push(t('law', { ref }));
    if (me.track === 'rat') options.push(t('cAnytime'));
    if (!tips.length) tips.push(generalTip(s, me));
  }
  return `<details class="cjust" ${justOpen ? 'open' : ''}><summary>${t('cJust')}</summary><div class="cjustlist">${just || `<div class="cl">–</div>`}</div></details>
    <h5>${t('cExplain')}</h5>${explain.map(x => `<p>${x}</p>`).join('')}
    <h5>${t('cOptions')}</h5><ul>${[...new Set(options)].map(li).join('') || li(t('oNothing'))}</ul>
    <div class="ctip"><b>${t('cTip')}</b> ${tips.join(' ') || t('gTip1')}</div>`;
}

// The German law behind a card or event (shown by the coach)
function lawForCard(c) {
  const T = c.title || '';
  switch (c.type) {
    case 'stock': return '§20, §32d EStG (Abgeltungsteuer), §20 Abs. 9 EStG (Sparerpauschbetrag)';
    case 'split': return '§20 Abs. 4a EStG';
    case 'etfplan': return '§20 InvStG (Teilfreistellung 30 %), §20 EStG';
    case 'bauspar': return 'Bausparkassengesetz (BauSparkG)';
    case 'choice': return '§159 SGB III (Sperrzeit bei Eigenkündigung)';
    case 'rentUp': return '§557b BGB (Indexmiete)';
    case 'badTenant': return '§543, §569 BGB (fristlose Kündigung), §940a ZPO (Räumung)';
    case 'cfAll': return c.kind === 'etw' ? '§556d BGB (Mietpreisbremse)' : c.kind === 'mfh' ? '§558 BGB (Mieterhöhung bis zur ortsüblichen Vergleichsmiete)' : '';
    case 'payIf': return /Heizung/.test(T) ? 'Gebäudeenergiegesetz (GEG)' : c.perAsset ? 'Grundsteuergesetz (GrStG)' : /Sonderumlage/.test(T) ? '§16, §28 WEG' : '';
    case 'pay': return /Rundfunk/.test(T) ? 'Rundfunkbeitragsstaatsvertrag' : /Steuererklärung/.test(T) ? '§152 AO (Verspätungszuschlag)' : /Geblitzt/.test(T) ? 'Bußgeldkatalog (BKatV)' : /TÜV/.test(T) ? '§29 StVZO (Hauptuntersuchung)' : '';
    case 'gain': return /Steuer/.test(T) ? '§9 EStG (Werbungskosten), §46 EStG' : '';
    case 'sell': return ['gold', 'crypto'].includes(c.kind) || IMMO.includes(c.kind) ? '§23 EStG (private Veräußerungsgeschäfte)' : c.kind === 'biz' ? '§16, §17 EStG' : '';
    case 'asset':
      if (c.afa) return '§7i EStG (Denkmal-AfA), §6 Abs. 1 Nr. 1a EStG (15-%-Grenze)';
      if (BUILDINGS.includes(c.kind)) return '§1 GrEStG (Grunderwerbsteuer), §7 Abs. 4 EStG (AfA), §23 EStG (Spekulationsfrist)';
      if (c.kind === 'land') return '§1 GrEStG, §23 EStG';
      if (c.kind === 'gold' || c.kind === 'crypto') return '§23 Abs. 1 Nr. 2 EStG (1 Jahr Haltefrist)';
      if (c.kind === 'coop') return 'Genossenschaftsgesetz (GenG)';
      if (c.kind === 'bond') return '§20 EStG';
      if (c.kind === 'biz') return '§230 HGB (stille Gesellschaft), §15 EStG';
      return '';
    default: return '';
  }
}
function lawForStep(s, me) {
  if (me.track !== 'rat' || s.step !== 'end' && s.step !== 'charity' && s.step !== 'roll') return '';
  const sp = RAT[me.pos];
  if (s.step === 'charity') return '§10b EStG (Spenden absetzbar)';
  if (s.step === 'roll') return me.alg > 0 ? '§136 SGB III (Arbeitslosengeld I)' : me.sperr > 0 ? '§159 SGB III (Sperrzeit)' : '§32a EStG (Einkommensteuertarif)';
  if (sp === 'downsized') return '§136, §149 SGB III (Arbeitslosengeld I, 60 %)';
  if (sp === 'baby') return '§66 EStG (Kindergeld)';
  if (sp === 'payday') return '§32a EStG, §3 SolzG (Soli-Freigrenze), SGB IV (Beitragsbemessungsgrenzen)';
  return '';
}

function generalTip(s, me) {
  if (me.track === 'fast') return t(s.seq % 2 ? 'gTipFast1' : 'gTipFast2');
  const debt = debtToPay(me, 'hard');
  if (debt?.which === 'loan') return t('tipPayLoan', { amt: { m: debt.amount } });
  if (me.loan > 0) return t('gTip3');
  const list = ['gTip1', 'gTip2', 'gTip3', 'gTip4', 'gTip5', 'gTip6'];
  return t(list[Math.floor(s.seq / 3) % list.length]);
}

function explainCard(s, me, cur, card, explain, options, tips) {
  const mineAssets = me.assets.filter(a => sellable(card, a));
  switch (card.type) {
    case 'asset': {
      if (me !== cur) break;
      const down = buyCost(card);
      if (card.kind === 'land') explain.push(t('eLand'));
      else if (card.kind === 'gold') explain.push(t('eGold'));
      else if (card.kind === 'crypto') explain.push(t('eCrypto'));
      else if (card.kind === 'coop') explain.push(t('eCoop', { cf: { m: card.cf }, down: { m: down } }));
      else if (card.kind === 'bond') explain.push(t('eBond', { cf: { m: card.cf }, down: { m: down } }));
      else if (card.cf < 0) explain.push(t('eAssetNeg', { cf: { m: card.cf } }));
      else {
        const loan = darlehen(card, s);
        const gap = Math.max(1, escapeTarget(me, s) - passive(me));
        explain.push(t('eAsset', {
          down: { m: down }, cf: { sm: card.cf }, roi: Math.round(card.cf * 1200 / down), months: Math.ceil(down / card.cf),
          pct: Math.min(100, Math.round(card.cf / gap * 100)),
          loanPart: loan ? { k: 'eLoanPart', p: { loan: { m: loan } } } : '',
        }));
      }
      if (BUILDINGS.includes(card.kind) && R(s).specTax) explain.push(t('eImmoTax'));
      if (card.afa) explain.push(t('eDenkmal'));
      if (me.cash < down) { const l = Math.ceil((down - me.cash) / 1000) * 1000; explain.push(t('eNeedLoan', { cash: { m: me.cash }, loan: { m: l }, int: { m: l / 10 } })); }
      const bs = bausparOf(me);
      if (bs && bs.ready && BUILDINGS.includes(card.kind) && !s.card.done) options.push(t('oBuyBauspar'));
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
        explain.push(t('eStockOwn', { n: a.shares, sym: a.sym, avg: { m: a.cost / a.shares }, amt: { m: card.price * a.shares - saleTax(me, card, a, a.shares, s).tax } }));
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
        explain.push(t('eSellMine', { asset: assetName(a), net: { sm: saleNet(me, card, a, s) }, cf: { m: a.cf } }));
        const d = decideSell(s, me, card, a, 'hard'); if (d.why) tips.push(t(d.why, d.params));
      }
      if (mineAssets.length) options.push(t('oSellBtn'));
      break;
    case 'pay': case 'payKids': if (me === cur) explain.push(t('eDoodad')); break;
    case 'finance': if (me === cur) explain.push(t('eDoodad'), t('eFinance')); break;
    case 'rentUp': if (me === cur) explain.push(t('eRent')); break;
    case 'cfAll': explain.push(t('eCfAll')); break;
    case 'etfplan':
      if (me !== cur) break;
      explain.push(t('eEtfPlan'));
      if (!s.card.done) { options.push(t('oEtfPlan')); const d = decideBuy(s, me, card, 'hard'); if (d.why) tips.push(t(d.why, d.params)); }
      break;
    case 'bauspar':
      if (me !== cur) break;
      explain.push(t('eBauspar'));
      if (!s.card.done) { options.push(t('oBauspar', { amt: { m: card.monthly } })); const d = decideBuy(s, me, card, 'hard'); if (d.why) tips.push(t(d.why, d.params)); }
      break;
    case 'choice':
      if (me !== cur) break;
      explain.push(t('eChoice'));
      if (!s.card.done) { options.push(t('oChoice')); tips.push(t(decideChoice(s, me, 'hard') === 'quit' ? 'tipQuit' : 'tipStay')); }
      break;
    case 'rate': explain.push(t('eRate')); break;
    case 'index': explain.push(t('eIndex')); break;
    case 'badTenant': explain.push(t('eBadTenant')); break;
    default: if (me === cur) explain.push(t('eEvent'));
  }
}

function explainStep(s, me, card, explain, options, tips) {
  switch (s.step) {
    case 'roll': {
      if (me.skip > 0) { options.push(t('oSkip')); break; }
      if (me.track === 'rat') {
        options.push(t('oRoll', { cf: { sm: cashflow(me, s) } }));
        if (p_unemployed(me)) explain.push(t(me.alg > 0 ? 'eAlg' : 'eSperr', { amt: { m: algAmount(me, s) }, n: me.alg || me.sperr }));
        const adv = advisorWorth(s, me, 'hard');
        if (adv) tips.push(t('tipAdvisor', { amt: { m: adv } }));
        if (me.charity > 0) options.push(t('oDice12'));
        const debt = debtToPay(me, 'hard');
        if (debt?.which === 'loan') tips.push(t('tipPayLoan', { amt: { m: debt.amount } }));
        else if (debt) tips.push(t('tipPayDebt', { debt: { k: 'debt_' + debt.which }, amt: { m: me.debts[debt.which].bal }, pay: { m: me.debts[debt.which].pay } }));
        if (passive(me) > escapeTarget(me, s)) tips.push(t('tipEscape'));
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
      const amt = Math.round(totalIncome(me, s) * 0.1);
      explain.push(t('eCharity', { amt: { m: amt } }));
      tips.push(t(decideCharity(s, me, 'hard') ? 'tipCharityYes' : 'tipCharityNo'));
      break;
    }
    case 'fast': {
      const sp = FAST[me.pos];
      if (sp.type === 'biz') explain.push(t('eFastBiz', { cost: { m: sp.cost }, cf: { m: sp.cf }, pct: Math.round(sp.cf / 500) }));
      if (sp.type === 'dream') explain.push(t(me.dream === me.pos ? 'eFastDream' : 'eFastDreamOther', { cost: { m: dreamCost(s, me.pos) } }));
      if (sp.type === 'gamble') explain.push(t('eFastGamble', { text: fastText(me.pos) }));
      if (sp.type === 'charity') explain.push(t('eFastCharity', { cost: { m: sp.cost } }));
      tips.push(t(decideFast(s, me, 'hard') ? 'tipFastYes' : 'tipFastNo'));
      options.push(t('oEnd'));
      break;
    }
    case 'end': {
      const last = me.track === 'rat' ? RAT[me.pos] : null;
      if (last === 'payday') explain.push(t('ePayday', { cf: { sm: cashflow(me, s) } }));
      else if (last === 'baby') explain.push(t('eBaby', { per: { m: me.childPer }, kg: { m: KINDERGELD }, net: { sm: KINDERGELD - me.childPer } }));
      else if (last === 'downsized') explain.push(t('eFired'));
      else explain.push(t('eEndGeneric'));
      options.push(t('oEnd'));
      break;
    }
  }
}
