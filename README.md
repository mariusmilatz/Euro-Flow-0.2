# 🐹 Euro Flow 0.2 – Raus aus dem Hamsterrad

Ein Online-Brettspiel über Geld, Vermögen und das **deutsche Steuer- und Sozialsystem**.
Spielprinzip wie bei klassischen Cashflow-Brettspielen: Kaufe Vermögenswerte, bis dein passives Einkommen
größer ist als deine Ausgaben – dann geht es vom Hamsterrad auf die Überholspur.

## ▶️ Jetzt spielen (ein Klick)

**https://mariusmilatz.github.io/Euro-Flow-0.2/**

Läuft im Browser auf Mac, PC, Tablet und Handy – nichts installieren.

- **Online:** „Spiel erstellen“ → Link kopieren → an Freunde schicken. Sie öffnen den Link, geben ihren Namen ein, fertig.
- **Lokal:** „Lokal spielen“ → alle Spieler an einem Bildschirm.
- Der Spielstand wird beim Host automatisch gespeichert („Letztes Spiel fortsetzen“).

## 🇩🇪 Was ist deutsch daran?

| Original-Idee | Euro Flow |
|---|---|
| Dollar | Euro |
| Steuern (eine Zeile) | Lohnsteuer & Soli + Sozialversicherung (Beamte: private KV) |
| Hauskredit für alle | Die meisten wohnen zur **Miete** (kann man nicht abbezahlen, Indexmiete steigt) |
| School Loan | **BAföG-Darlehen** |
| Credit Card / Retail Debt | **Dispo/Kreditkarte**, **0 %-Finanzierung** |
| Baby kostet nur | Baby kostet – bringt aber **255 € Kindergeld** |
| Downsized | **Gekündigt:** Arbeitslosengeld I (60 % vom Netto) federt ab |
| Haus kaufen | + **7 % Kaufnebenkosten** (Grunderwerbsteuer, Notar, Grundbuch) |
| Gewinne steuerfrei | **Spekulationsfrist** 10 Jahre (Immobilien) / 1 Jahr (Gold), **Abgeltungsteuer 26,375 %** auf Aktiengewinne mit **1.000 € Sparerpauschbetrag** pro Jahr |
| Bankruptcy | **Privatinsolvenz** |
| Fast Track | **Überholspur** mit Biergarten, Windpark, Weingut an der Mosel, Betriebsprüfung … |

12 deutsche Berufe (Hausmeister/in bis Pilot/in), ~40 kleine Deals, ~25 große Deals, ~30 Marktkarten, ~28 Schnickschnack-Karten.

## Technik

Reines HTML/CSS/JavaScript, kein Build-Schritt. Online-Spiel über WebRTC (PeerJS): Der Browser des Hosts hält den
Spielstand, alle anderen verbinden sich direkt – kein eigener Server nötig. Gehostet über GitHub Pages.

```
index.html      Startseite, Lobby, Spieloberfläche
css/style.css   Design
js/data.js      Berufe, Karten, Spielfelder (hier Zahlen anpassen!)
js/engine.js    Spielregeln
js/board.js     Spielbrett (SVG)
js/net.js       Online-Verbindung
js/main.js      Oberfläche
```

Lokal testen: `python3 -m http.server` im Ordner starten und `http://localhost:8000` öffnen.

*Euro Flow ist ein eigenständiges Lernspiel. Alle Firmen und Zahlen sind fiktiv bzw. vereinfacht – keine Steuer- oder Anlageberatung.*
