// Euro Flow – Spieldaten (deutsches Steuer- & Sozialsystem, vereinfacht)

export const KINDERGELD = 255;          // € pro Kind und Monat
export const NK_RATE = 0.07;            // Kaufnebenkosten: Grunderwerbsteuer + Notar + Grundbuch
export const ABGELTUNG = 0.26375;       // 25 % Abgeltungsteuer + Soli
export const SPARERPAUSCHBETRAG = 1000; // pro Jahr (= 12 Zahltage)
export const SPEKU_RATE = 0.30;         // vereinfachter persönlicher Steuersatz bei Spekulationsgewinnen
export const SPEKU_IMMO = 120;          // 10 Jahre = 120 Zahltage
export const SPEKU_GOLD = 12;           // 1 Jahr = 12 Zahltage

export const COLORS = ['#e63946', '#2a9df4', '#2ec4b6', '#f4a261', '#9b5de5', '#ff70a6'];
export const COLOR_NAMES = ['Rot', 'Blau', 'Türkis', 'Orange', 'Lila', 'Pink'];

// ---------- Hamsterrad (innerer Kreis, 24 Felder, im Uhrzeigersinn ab START) ----------
export const RAT = [
  'deal', 'doodad', 'deal', 'charity', 'deal', 'payday', 'deal', 'market',
  'deal', 'doodad', 'deal', 'downsized', 'deal', 'payday', 'deal', 'market',
  'deal', 'doodad', 'deal', 'baby', 'deal', 'payday', 'deal', 'market',
];

export const RAT_INFO = {
  deal:      { lines: ['GROSSER DEAL', 'CHANCE', 'KLEINER DEAL'], fill: '#1e8a4a', ink: '#fff', name: 'Chance (Deal)' },
  doodad:    { lines: ['SCHNICK-', 'SCHNACK'], fill: '#2f6fd6', ink: '#fff', name: 'Schnickschnack' },
  market:    { lines: ['MARKT'], fill: '#c2185b', ink: '#fff', name: 'Markt' },
  payday:    { lines: ['ZAHLTAG!'], fill: '#f7c600', ink: '#3b2a00', name: 'Zahltag' },
  charity:   { lines: ['SPENDE'], fill: '#8a4fbf', ink: '#fff', name: 'Spende' },
  baby:      { lines: ['BABY!'], fill: '#f59cc4', ink: '#5a1236', name: 'Baby' },
  downsized: { lines: ['GEKÜN-', 'DIGT!'], fill: '#2d3436', ink: '#ff5e57', name: 'Gekündigt' },
};

// ---------- Berufe (Monatswerte in €) ----------
// debts: [Restschuld, Monatsrate]
export const PROFESSIONS = [
  { key: 'hausmeister', name: 'Hausmeister/in', salary: 2800, tax: 230, social: 590, socialLabel: 'Sozialversicherung', rent: 650, other: 620, childPer: 380, savings: 700,
    debts: { auto: [4000, 100], karte: [2000, 60], raten: [1000, 50] } },
  { key: 'pflege', name: 'Pflegefachkraft', salary: 3600, tax: 400, social: 760, socialLabel: 'Sozialversicherung', rent: 750, other: 750, childPer: 400, savings: 800,
    debts: { bafoeg: [6000, 80], auto: [5000, 120], karte: [2500, 70], raten: [1000, 50] } },
  { key: 'bus', name: 'Busfahrer/in', salary: 3100, tax: 300, social: 650, socialLabel: 'Sozialversicherung', rent: 700, other: 680, childPer: 380, savings: 600,
    debts: { auto: [4500, 110], karte: [2000, 60], raten: [1000, 50] } },
  { key: 'buero', name: 'Bürokaufmann/-frau', salary: 3300, tax: 340, social: 700, socialLabel: 'Sozialversicherung', rent: 720, other: 700, childPer: 390, savings: 900,
    debts: { auto: [5000, 120], karte: [3000, 80], raten: [1500, 60] } },
  { key: 'kfz', name: 'Kfz-Mechatroniker/in', salary: 3200, tax: 320, social: 670, socialLabel: 'Sozialversicherung', rent: 680, other: 650, childPer: 380, savings: 500,
    debts: { auto: [10000, 200], karte: [2500, 70], raten: [1500, 60] } },
  { key: 'polizei', name: 'Polizist/in (Beamte)', salary: 4000, tax: 560, social: 250, socialLabel: 'Private Krankenversicherung', rent: 800, other: 1150, childPer: 420, savings: 1000,
    debts: { auto: [7000, 150], karte: [3000, 80], raten: [1500, 60] } },
  { key: 'lehrer', name: 'Lehrer/in (verbeamtet)', salary: 4900, tax: 850, social: 300, socialLabel: 'Private Krankenversicherung', rent: 950, other: 1300, childPer: 450, savings: 1200,
    debts: { bafoeg: [8000, 100], auto: [9000, 180], karte: [3500, 90], raten: [2000, 70] } },
  { key: 'dev', name: 'Softwareentwickler/in', salary: 5500, tax: 1000, social: 1050, socialLabel: 'Sozialversicherung', rent: 1300, other: 1100, childPer: 480, savings: 2000,
    debts: { bafoeg: [8000, 100], karte: [5000, 120], raten: [3000, 100] } },
  { key: 'ing', name: 'Ingenieur/in', salary: 6000, tax: 1150, social: 1100, socialLabel: 'Sozialversicherung', rent: 0, other: 1000, childPer: 500, savings: 1500,
    debts: { baufi: [280000, 1400], bafoeg: [10000, 120], auto: [15000, 300], karte: [4000, 100], raten: [2000, 80] } },
  { key: 'anwalt', name: 'Rechtsanwalt/-anwältin', salary: 7500, tax: 1900, social: 1200, socialLabel: 'Sozialversicherung', rent: 0, other: 1200, childPer: 550, savings: 2500,
    debts: { baufi: [370000, 1800], auto: [18000, 350], karte: [5000, 130], raten: [2500, 90] } },
  { key: 'arzt', name: 'Ärztin/Arzt', salary: 9500, tax: 2600, social: 1300, socialLabel: 'Sozialversicherung', rent: 0, other: 1500, childPer: 650, savings: 3500,
    debts: { baufi: [480000, 2300], auto: [25000, 450], karte: [6000, 150], raten: [3000, 100] } },
  { key: 'pilot', name: 'Pilot/in', salary: 10500, tax: 3000, social: 1350, socialLabel: 'Sozialversicherung', rent: 0, other: 1600, childPer: 600, savings: 3000,
    debts: { baufi: [500000, 2400], auto: [28000, 500], karte: [6000, 160], raten: [3500, 120] } },
];

export const DEBT_LABELS = {
  baufi: 'Baufinanzierung (Eigenheim)',
  bafoeg: 'BAföG-Darlehen',
  auto: 'Autokredit',
  karte: 'Kreditkarte / Dispo',
  raten: 'Ratenkäufe (0 %-Finanzierung)',
};

// ---------- Aktien & ETFs (fiktiv) ----------
export const STOCKS = {
  AWK: { name: 'Autowerk AG', what: 'Autobauer', range: '5 – 30 €' },
  SOL: { name: 'Solaris Energie AG', what: 'Solar & Wind', range: '5 – 40 €' },
  PHN: { name: 'Pharma Nord AG', what: 'Arzneimittel', range: '5 – 40 €' },
  TEK: { name: 'Tekno Software SE', what: 'Software', range: '1 – 30 €' },
  WLT: { name: 'Welt-ETF', what: 'Indexfonds auf 1.500 Firmen weltweit', range: '10 – 30 €' },
};

const stock = (sym, price, text) => ({ type: 'stock', sym, price, title: `Aktie – ${STOCKS[sym].name}`, text });
const split = (sym, ratio, text) => ({ type: 'split', sym, ratio, title: `${ratio > 1 ? 'Aktiensplit' : 'Zusammenlegung'} – ${STOCKS[sym].name}`, text });

// ---------- KLEINE DEALS (max. 5.000 € Eigenkapital) ----------
export const SMALL = [
  stock('AWK', 1, 'Neuer Abgasskandal! Rückrufaktion für 2 Mio. Autos – die Aktie stürzt ab.'),
  stock('AWK', 5, 'Schwache Verkaufszahlen in China drücken den Kurs.'),
  stock('AWK', 10, 'Das neue E-Modell enttäuscht die Analysten.'),
  stock('AWK', 20, 'Rekordquartal – der Kurs zieht kräftig an.'),
  stock('AWK', 30, 'Übernahmegerüchte treiben die Aktie auf ein Allzeithoch.'),
  stock('SOL', 5, 'Förderprogramm gestrichen – Kurs bricht ein.'),
  stock('SOL', 10, 'Chinesische Billig-Module drücken die Margen.'),
  stock('SOL', 20, 'Großauftrag für einen Offshore-Windpark.'),
  stock('SOL', 40, 'Energiekrise: Alle wollen Solar – Rekordkurs!'),
  stock('PHN', 5, 'Zulassung für Hoffnungsträger-Medikament abgelehnt.'),
  stock('PHN', 10, 'Patent läuft aus, Generika drängen auf den Markt.'),
  stock('PHN', 20, 'Solide Zahlen, ruhiges Geschäft.'),
  stock('PHN', 40, 'Durchbruch bei Alzheimer-Studie – die Aktie explodiert.'),
  stock('TEK', 1, 'Hackerangriff legt alle Kunden lahm – Panikverkäufe.'),
  stock('TEK', 5, 'Der Gründer verlässt überraschend die Firma.'),
  stock('TEK', 10, 'KI-Produkt startet holprig.'),
  stock('TEK', 30, 'Großkunde aus den USA unterschreibt – Kursfeuerwerk.'),
  stock('WLT', 10, 'Weltweiter Börsencrash: auch der breite Index fällt.'),
  stock('WLT', 20, 'Ein ganz normales Börsenjahr.'),
  stock('WLT', 30, 'Weltwirtschaft brummt – Index auf Rekordhoch.'),
  split('AWK', 2, 'Die Autowerk-Aktie wird 2:1 gesplittet. Wer sie besitzt, hat jetzt doppelt so viele Aktien. Niemand darf jetzt kaufen oder verkaufen.'),
  split('TEK', 2, 'Tekno Software splittet 2:1. Aktionäre haben doppelt so viele Aktien.'),
  split('SOL', 0.5, 'Solaris Energie muss Aktien 1:2 zusammenlegen. Aktionäre haben nur noch halb so viele Aktien.'),
  { type: 'asset', kind: 'etw', name: 'Eigentumswohnung 2 Zi., Leipzig', price: 60000, down: 5000, cf: 160,
    title: 'Eigentumswohnung – Leipzig', text: 'Vermietete 2-Zimmer-Wohnung im sanierten Altbau. Der Eigentümer zieht zu seinen Kindern.' },
  { type: 'asset', kind: 'etw', name: 'Eigentumswohnung 1 Zi., Gelsenkirchen', price: 45000, down: 4000, cf: 120,
    title: 'Zwangsversteigerung – Gelsenkirchen', text: 'Kleine Wohnung aus einer Zwangsversteigerung. Mieter wohnt schon 12 Jahre drin.' },
  { type: 'asset', kind: 'etw', name: 'Eigentumswohnung 3 Zi., Magdeburg', price: 75000, down: 5000, cf: 200,
    title: 'Eigentumswohnung – Magdeburg', text: 'Erbengemeinschaft will schnell verkaufen. Gute Lage nahe der Uni.' },
  { type: 'asset', kind: 'etw', name: 'Eigentumswohnung 2 Zi., Chemnitz', price: 40000, down: 3000, cf: 90,
    title: 'Eigentumswohnung – Chemnitz', text: 'Günstige Wohnung, aber die Hausverwaltung ist schlecht organisiert.' },
  { type: 'asset', kind: 'etw', name: 'Apartment, Duisburg', price: 50000, down: 4000, cf: -40,
    title: 'Leerstehendes Apartment – Duisburg', text: 'Steht seit 8 Monaten leer. Vielleicht findest du einen Mieter – vielleicht nicht.' },
  { type: 'asset', kind: 'etw', name: 'Studentenapartment, Göttingen', price: 70000, down: 5000, cf: 220,
    title: 'Studentenapartment – Göttingen', text: 'Möbliertes Mikroapartment, immer vermietet. Verkäufer braucht Geld für die Scheidung.' },
  { type: 'asset', kind: 'land', name: 'Bauerwartungsland 1.000 m², Brandenburg', price: 5000, down: 5000, cf: 0,
    title: 'Grundstück – Brandenburg', text: 'Ackerland am Ortsrand. Wenn die Gemeinde es zu Bauland macht, steigt der Wert enorm.' },
  { type: 'asset', kind: 'gold', name: 'Krügerrand-Goldmünzen', units: 10, unitPrice: 400, cf: 0,
    title: 'Goldmünzen', text: 'Ein Sammler verkauft 10 Krügerrand-Münzen zu je 400 € (Notverkauf). Tipp: Physisches Gold ist nach 1 Jahr steuerfrei.' },
  { type: 'asset', kind: 'gold', name: 'Wiener Philharmoniker (Gold)', units: 5, unitPrice: 600, cf: 0,
    title: 'Goldmünzen', text: 'Erbstücke vom Großvater: 5 Goldmünzen zu je 600 €.' },
  { type: 'asset', kind: 'biz', code: 'automat', name: 'Snackautomaten am Bahnhof (2 Stk.)', price: 4000, down: 4000, cf: 140,
    title: 'Snackautomaten', text: 'Zwei Automaten mit festem Standort am Bahnhof. Befüllung einmal pro Woche.' },
  { type: 'asset', kind: 'biz', code: 'fotobox', name: 'Fotobox-Verleih', price: 5000, down: 5000, cf: 160,
    title: 'Fotobox-Verleih', text: 'Hochzeiten und Firmenfeiern – zwei Fotoboxen inklusive Website und Kundenstamm.' },
  { type: 'asset', kind: 'bond', name: 'Bundesanleihe (10 Jahre)', price: 5000, down: 5000, cf: 12,
    title: 'Bundesanleihe', text: 'Sicher wie die Bundesrepublik – aber nur rund 2,9 % Zinsen pro Jahr.' },
  { type: 'asset', kind: 'biz', code: 'p2p', name: 'Privatkredit an einen Handwerker', price: 3000, down: 3000, cf: 60,
    title: 'Privatkredit vergeben', text: 'Ein Malermeister braucht 3.000 € für einen neuen Transporter und zahlt dir 60 € Zinsen im Monat.' },
  { type: 'payIf', kinds: ['etw'], amount: 1500, title: 'Sonderumlage!', text: 'Die Eigentümerversammlung beschließt ein neues Dach. Wenn du eine Eigentumswohnung besitzt, zahle 1.500 €.' },
  { type: 'payIf', kinds: ['etw', 'haus', 'mfh'], amount: 800, title: 'Mieter zahlt nicht', text: 'Dein Mieter zahlt seit 2 Monaten nicht. Wenn du vermietete Immobilien besitzt, zahle 800 € für den Anwalt.' },
  { type: 'gain', amount: 1200, title: 'Steuererstattung!', text: 'Du hast endlich deine Steuererklärung gemacht (Werbungskosten, Homeoffice-Pauschale). Das Finanzamt erstattet 1.200 €.' },
];

// ---------- GROSSE DEALS (ab 6.000 € Eigenkapital) ----------
export const BIG = [
  { type: 'asset', kind: 'haus', name: 'Reihenhaus, Hannover', price: 180000, down: 25000, cf: 250,
    title: 'Reihenhaus zur Vermietung', text: 'Vermietetes Reihenhaus mit kleinem Garten. Familie wohnt seit 5 Jahren drin.' },
  { type: 'asset', kind: 'haus', name: 'Doppelhaushälfte, Kassel', price: 150000, down: 20000, cf: 350,
    title: 'Doppelhaushälfte – Notverkauf', text: 'Wegen Scheidung muss schnell verkauft werden. Mieter zahlt zuverlässig.' },
  { type: 'asset', kind: 'haus', name: 'Einfamilienhaus mit Sanierungsstau, Saarland', price: 110000, down: 15000, cf: 100,
    title: 'Einfamilienhaus (Sanierungsfall)', text: 'Alte Ölheizung, Fenster aus den 80ern – aber günstig. Geduld zahlt sich aus.' },
  { type: 'asset', kind: 'haus', name: 'Einfamilienhaus, Bielefeld', price: 200000, down: 25000, cf: 400,
    title: 'Einfamilienhaus', text: 'Solides Haus in ruhiger Lage. Der Eigentümer zieht ins Pflegeheim.' },
  { type: 'asset', kind: 'mfh', name: 'Mehrfamilienhaus 4 WE, Dortmund', units: 4, price: 320000, down: 35000, cf: 900,
    title: 'Mehrfamilienhaus – 4 Wohnungen', text: 'Gepflegtes Haus aus den 60ern, alle Wohnungen vermietet. Finanzierung bereits zugesagt.' },
  { type: 'asset', kind: 'mfh', name: 'Mehrfamilienhaus 4 WE, Halle', units: 4, price: 240000, down: 30000, cf: 750,
    title: 'Mehrfamilienhaus – Zwangsverkauf', text: 'Eigentümer hat Steuerschulden beim Finanzamt. Unterlagen unvollständig.' },
  { type: 'asset', kind: 'mfh', name: 'Mehrfamilienhaus 4 WE, Wuppertal', units: 4, price: 280000, down: 30000, cf: 600,
    title: 'Mehrfamilienhaus – 4 Wohnungen', text: 'Liegt an einer lauten Straße, aber die Mieten sind stabil.' },
  { type: 'asset', kind: 'mfh', name: 'Altbau 8 WE, Chemnitz', units: 8, price: 450000, down: 50000, cf: 1700,
    title: 'Altbau mit 8 Wohnungen', text: 'Gründerzeit-Altbau, teilsaniert. Professionelle Hausverwaltung übernimmt alles.' },
  { type: 'asset', kind: 'mfh', name: 'Mehrfamilienhaus 8 WE, Bremen', units: 8, price: 600000, down: 70000, cf: 1900,
    title: 'Mehrfamilienhaus – 8 Wohnungen', text: 'Rentner-Ehepaar verkauft zum Gutachterwert. Komplette Unterlagen vorhanden.' },
  { type: 'asset', kind: 'mfh', name: 'Mehrfamilienhaus 8 WE, Gera', units: 8, price: 380000, down: 40000, cf: 1500,
    title: 'Mehrfamilienhaus – Paketverkauf', text: 'Ein Investor löst sein Portfolio auf und braucht schnell Liquidität.' },
  { type: 'asset', kind: 'mfh', name: 'Wohnblock 12 WE, Salzgitter', units: 12, price: 720000, down: 80000, cf: 2800,
    title: 'Wohnblock mit 12 Wohnungen', text: 'Großer Block, solide Mieter, Aufzug muss in 3 Jahren erneuert werden.' },
  { type: 'asset', kind: 'fewo', name: 'Ferienwohnung an der Ostsee', price: 220000, down: 30000, cf: 450,
    title: 'Ferienwohnung – Ostsee', text: 'Meerblick in Kühlungsborn. Im Sommer ausgebucht, im Winter leer.' },
  { type: 'asset', kind: 'gewerbe', name: 'Gewerbehalle mit Mieter', price: 400000, down: 50000, cf: 2100,
    title: 'Gewerbeimmobilie', text: 'Logistikhalle mit 10-Jahres-Mietvertrag an einen Paketdienst.' },
  { type: 'asset', kind: 'land', name: 'Ackerland 20 ha', price: 30000, down: 30000, cf: 0,
    title: 'Ackerland 20 Hektar', text: 'Kein Ertrag, aber in der Nähe ist ein Gewerbegebiet geplant.' },
  { type: 'asset', kind: 'biz', code: 'wasch', name: 'Waschstraße (4 Boxen)', price: 150000, down: 30000, cf: 1800,
    title: 'Waschstraße zu verkaufen', text: 'Gut laufende SB-Waschanlage an einer Hauptstraße. Der Besitzer geht in Rente.' },
  { type: 'asset', kind: 'biz', code: 'doener', name: 'Döner-Imbiss in Uni-Stadt', price: 80000, down: 20000, cf: 1200,
    title: 'Döner-Imbiss', text: 'Kult-Imbiss gegenüber der Mensa. Personal bleibt.' },
  { type: 'asset', kind: 'biz', code: 'baecker', name: 'Bäckerei-Filiale', price: 120000, down: 25000, cf: 1500,
    title: 'Bäckerei-Filiale', text: 'Filiale mit eigener Backstube, Stammkundschaft seit 30 Jahren.' },
  { type: 'asset', kind: 'biz', code: 'pizza', name: 'Pizzeria (Franchise)', price: 200000, down: 40000, cf: 2400,
    title: 'Pizza-Franchise', text: 'Franchise-Lizenz mit Lieferdienst. Der Franchisegeber hilft beim Start.' },
  { type: 'asset', kind: 'biz', code: 'burger', name: 'Stille Beteiligung: Burger-Laden', price: 30000, down: 30000, cf: 1000,
    title: 'Stille Beteiligung gesucht', text: 'Ein Burger-Laden will eine zweite Filiale eröffnen und sucht Kapital. Der Inhaber kauft dich evtl. später heraus.' },
  { type: 'asset', kind: 'biz', code: 'solar', name: 'Photovoltaik-Anlage (Scheunendach)', price: 90000, down: 15000, cf: 650,
    title: 'Photovoltaik-Anlage', text: 'Große PV-Anlage auf einem Bauernhof. Feste Einspeisevergütung nach EEG.' },
  { type: 'asset', kind: 'biz', code: 'spaeti', name: 'Späti in Berlin', price: 60000, down: 12000, cf: 900,
    title: 'Späti zu verkaufen', text: 'Spätkauf in Kreuzberg, bis 2 Uhr nachts offen.' },
  { type: 'payIf', kinds: ['mfh'], amount: 5000, title: 'Heizungsgesetz!', text: 'In einem Mehrfamilienhaus fällt die alte Gasheizung aus. Neue Wärmepumpe nötig: Wenn du ein Mehrfamilienhaus besitzt, zahle 5.000 €.' },
  { type: 'payIf', kinds: ['etw', 'haus', 'mfh', 'fewo'], amount: 1000, title: 'Mieter verwüstet Wohnung', text: 'Nach dem Auszug ist die Wohnung kaputt. Die Kaution reicht nicht. Wenn du vermietete Immobilien besitzt, zahle 1.000 €.' },
  { type: 'payIf', kinds: ['etw', 'haus', 'mfh', 'fewo', 'gewerbe', 'land'], amount: 300, perAsset: true, title: 'Grundsteuer-Reform', text: 'Die neue Grundsteuer kommt. Zahle 300 € für jede Immobilie, die du besitzt.' },
];

// ---------- MARKT ----------
const sell = (kind, code, how, title, text) => ({ type: 'sell', kind, code, ...how, title, text });
export const MARKET = [
  sell('etw', null, { price: 90000 }, 'Käufer für Eigentumswohnung', 'Ein junges Paar sucht dringend eine Wohnung zur Eigennutzung und zahlt 90.000 € für jede Eigentumswohnung.'),
  sell('etw', null, { price: 65000 }, 'Käufer für Eigentumswohnung', 'Ein Kapitalanleger bietet 65.000 € für jede Eigentumswohnung.'),
  sell('etw', null, { price: 110000 }, 'Wohnungsnot!', 'Die Mieten in der Stadt explodieren. Käufer zahlen 110.000 € pro Eigentumswohnung.'),
  sell('haus', null, { price: 160000 }, 'Käufer für Häuser', 'Eine Familie sucht ein Haus und bietet 160.000 € pro Haus.'),
  sell('haus', null, { price: 240000 }, 'Bauzinsen fallen!', 'Alle wollen Eigentum. Käufer zahlen 240.000 € pro Haus.'),
  sell('haus', null, { price: 280000 }, 'Speckgürtel boomt', 'Großstädter ziehen aufs Land: 280.000 € pro Haus.'),
  sell('mfh', null, { perUnit: 50000 }, 'Wohnungsgesellschaft kauft', 'Eine große Wohnungsgesellschaft kauft Mehrfamilienhäuser für 50.000 € pro Wohnung.'),
  sell('mfh', null, { perUnit: 65000 }, 'Investor sucht Mehrfamilienhäuser', 'Ein Pensionsfonds zahlt 65.000 € pro Wohneinheit.'),
  sell('mfh', null, { perUnit: 80000 }, 'Aufteilung in Eigentumswohnungen', 'Ein Bauträger will Häuser aufteilen und zahlt 80.000 € pro Wohneinheit.'),
  sell('mfh', null, { perUnit: 40000 }, 'Schwacher Markt', 'Die Zinsen sind hoch. Ein Schnäppchenjäger bietet nur 40.000 € pro Wohneinheit.'),
  sell('land', null, { mult: 10 }, 'Grundstück wird Bauland!', 'Die Gemeinde weist ein Neubaugebiet aus. Käufer zahlen das 10-fache deines Kaufpreises für Grundstücke.'),
  sell('fewo', null, { price: 320000 }, 'Käufer für Ferienwohnungen', 'Ein Hotelier kauft Ferienwohnungen für 320.000 €.'),
  sell('gewerbe', null, { price: 600000 }, 'Fonds kauft Gewerbeimmobilien', 'Ein Immobilienfonds zahlt 600.000 € für Gewerbehallen.'),
  sell('gold', null, { perUnit: 1200 }, 'Goldrausch!', 'Krisenstimmung: Händler zahlen 1.200 € pro Goldmünze.'),
  sell('gold', null, { perUnit: 700 }, 'Goldpreis steigt', 'Händler zahlen 700 € pro Goldmünze.'),
  sell('biz', 'wasch', { price: 250000 }, 'Käufer für Waschstraße', 'Eine Kette kauft Waschstraßen für 250.000 €.'),
  sell('biz', 'doener', { price: 160000 }, 'Käufer für Döner-Imbiss', 'Eine Döner-Kette will expandieren und zahlt 160.000 €.'),
  sell('biz', 'baecker', { price: 200000 }, 'Großbäckerei kauft zu', 'Eine Großbäckerei bietet 200.000 € für Bäckerei-Filialen.'),
  sell('biz', 'pizza', { price: 350000 }, 'Franchisegeber kauft zurück', 'Der Franchisegeber zahlt 350.000 € für jede Pizzeria.'),
  sell('biz', 'burger', { price: 90000 }, 'Burger-Laden zahlt aus', 'Der Burger-Laden läuft super und kauft stille Teilhaber für 90.000 € heraus.'),
  sell('biz', 'solar', { price: 130000 }, 'Energieversorger kauft PV-Anlagen', 'Ein Stadtwerk zahlt 130.000 € für Photovoltaik-Anlagen.'),
  sell('biz', 'spaeti', { price: 110000 }, 'Käufer für Späti', 'Ein Kiosk-Unternehmer zahlt 110.000 € pro Späti.'),
  sell('biz', 'automat', { price: 12000 }, 'Automatenfirma kauft auf', 'Ein Automatenbetreiber zahlt 12.000 € für deine Snackautomaten.'),
  { type: 'cfAll', kind: 'mfh', perUnit: true, amount: 40, title: 'Mieterhöhung nach Mietspiegel', text: 'Der neue Mietspiegel erlaubt höhere Mieten. Jedes Mehrfamilienhaus bringt +40 € pro Wohneinheit mehr Cashflow (alle Spieler).' },
  { type: 'cfAll', kind: 'etw', amount: -50, title: 'Mietpreisbremse verschärft', text: 'Bei Neuvermietung darfst du weniger verlangen. Jede Eigentumswohnung bringt 50 € weniger Cashflow (alle Spieler).' },
  { type: 'cfAll', kind: 'biz', code: 'doener', amount: 400, title: 'Dönerpreis steigt auf 10 €', text: 'Inflation! Alle Döner-Imbisse machen +400 € mehr Cashflow im Monat (alle Spieler).' },
  { type: 'cfAll', kind: 'biz', code: 'baecker', amount: -300, title: 'Energiepreise steigen', text: 'Die Backöfen fressen Strom. Jede Bäckerei-Filiale −300 € Cashflow (alle Spieler).' },
  { type: 'payIf', kinds: ['etw', 'haus', 'mfh', 'fewo', 'gewerbe'], amount: 2000, title: 'Wasserrohrbruch', text: 'Nur wer diese Karte zieht: Wenn du Immobilien besitzt, zahle 2.000 € (Selbstbeteiligung der Versicherung).' },
  { type: 'payIf', kinds: ['biz'], amount: 1500, title: 'Betriebsprüfung light', text: 'Nur wer diese Karte zieht: Wenn du ein Unternehmen besitzt, kostet dich der Steuerberater 1.500 € extra.' },
  { type: 'gain', amount: 0, title: 'Ruhiger Markt', text: 'Nichts passiert. Die Märkte warten auf die nächste Zinsentscheidung der EZB.' },
];

// ---------- SCHNICKSCHNACK (Doodads) ----------
const pay = (amount, title, text) => ({ type: 'pay', amount, title, text });
export const DOODADS = [
  pay(1200, 'Neues Smartphone', 'Dein altes Handy hat einen Sprung. Das neue Modell muss es sein: 1.200 €.'),
  pay(1800, 'Pauschalurlaub Mallorca', 'Eine Woche All-inclusive. Du hast es dir verdient! Zahle 1.800 €.'),
  pay(450, 'Oktoberfest-Wochenende', 'Zugticket, Hotel, Maß Bier zu 15 €. Zahle 450 €.'),
  pay(150, 'Geblitzt!', '31 km/h zu schnell in der Stadt. Bußgeld 150 € plus 1 Punkt in Flensburg.'),
  pay(230, 'Rundfunkbeitrag-Nachzahlung', 'Der Beitragsservice hat dich gefunden. Zahle 230 €.'),
  pay(900, 'TÜV fällig', 'Bremsen und Auspuff müssen neu, sonst keine Plakette. Zahle 900 €.'),
  pay(480, 'Fitnessstudio-Jahresvertrag', 'Du gehst bestimmt jede Woche hin. Zahle 480 €.'),
  pay(700, 'Hochzeit der besten Freundin', 'Geschenk, Outfit, Hotel und Junggesellenabschied: 700 €.'),
  pay(300, 'Konzertkarten', 'Deine Lieblingsband spielt in der Arena. Zwei Tickets: 300 €.'),
  pay(350, 'Zahnarzt', 'Professionelle Zahnreinigung und eine Füllung – die Kasse zahlt nicht alles. 350 €.'),
  pay(600, 'Steuerberater', 'Die Rechnung für die Steuererklärung kommt: 600 €.'),
  pay(250, 'Lieferdienst-Monat', 'Jeden Abend Sushi und Pizza bestellt. 250 € weg.'),
  pay(550, 'Spielekonsole', 'Die neue Konsole plus zwei Spiele: 550 €.'),
  pay(800, 'Weihnachtsgeschenke', 'Familie, Freunde, Wichteln im Büro: 800 €.'),
  pay(650, 'Waschmaschine kaputt', 'Die alte läuft aus. Neue Maschine inklusive Anschluss: 650 €.'),
  pay(900, 'Neue Golfschläger', 'Dein Chef spielt Golf. Du jetzt auch. 900 €.'),
  pay(500, 'Tierarzt', 'Der Hund hat eine Socke gefressen. OP: 500 €.'),
  pay(200, 'Abo-Falle', 'Streaming, Musik, Cloud, App-Abos … du zahlst 200 € für Dinge, die du nie nutzt.'),
  pay(1100, 'Designer-Sneaker & Jacke', 'Shopping-Tour in der Innenstadt: 1.100 €.'),
  pay(400, 'Junggesellenabschied', 'Ein Wochenende in Hamburg auf der Reeperbahn: 400 €.'),
  { type: 'payKids', amount: 300, title: 'Klassenfahrt', text: 'Wenn du Kinder hast: Zahle 300 € pro Kind für die Klassenfahrt.' },
  { type: 'payKids', amount: 250, title: 'Kita-Zuzahlung', text: 'Wenn du Kinder hast: Essensgeld und Ausflüge – 250 € pro Kind.' },
  { type: 'finance', debt: 'raten', amount: 2000, pay: 70, title: 'Neuer Fernseher auf Raten', text: '65 Zoll, „0 % Finanzierung“! Ratenkauf +2.000 € Schulden, +70 €/Monat Ausgaben.' },
  { type: 'finance', debt: 'raten', amount: 1500, pay: 50, title: 'Küchenmaschine auf Raten', text: 'Die Küchenmaschine kocht fast von allein. Ratenkauf +1.500 €, +50 €/Monat.' },
  { type: 'finance', debt: 'karte', amount: 3000, pay: 90, title: 'E-Bike mit Kreditkarte', text: 'Ein schickes E-Bike – per Kreditkarte bezahlt. +3.000 € Kartenschulden, +90 €/Monat.' },
  { type: 'finance', debt: 'auto', amount: 8000, pay: 180, title: 'Neues Auto', text: 'Der Händler macht ein „super Angebot“. Autokredit +8.000 €, +180 €/Monat.' },
  { type: 'rentUp', amount: 80, title: 'Indexmiete steigt', text: 'Dein Mietvertrag ist an die Inflation gekoppelt. Wenn du zur Miete wohnst: Miete +80 €/Monat.' },
  { type: 'rentUp', amount: 120, title: 'Umzug in größere Wohnung', text: 'Ihr braucht mehr Platz. Wenn du zur Miete wohnst: Miete +120 €/Monat.' },
];

// ---------- ÜBERHOLSPUR (äußerer Ring, 36 Felder, im Uhrzeigersinn ab oben links) ----------
const biz = (name, cost, cf) => ({ type: 'biz', name, cost, cf });
const dream = (name, cost, icon) => ({ type: 'dream', name, cost, icon });
export const FAST = [
  { type: 'cfday', name: 'EURO-FLOW-TAG' },
  biz('Biergarten in München', 150000, 6000),
  dream('Weltreise – 1 Jahr', 150000, '🌍'),
  biz('Döner-Kette mit 5 Filialen', 100000, 3500),
  { type: 'lawsuit', name: 'KLAGE!', text: 'Abmahnung und Klage: Du verlierst die Hälfte deines Bargelds.' },
  biz('Windpark-Beteiligung Nordsee', 300000, 11000),
  dream('Chalet in den Alpen', 300000, '🏔️'),
  { type: 'gamble', name: 'Software-Start-up', cost: 25000, need: 6, payout: 500000, text: 'Investiere 25.000 €. Würfle eine 6 und das Start-up geht an die Börse: +500.000 €.' },
  biz('Fitnessstudio-Kette', 200000, 7500),
  { type: 'cfday', name: 'EURO-FLOW-TAG' },
  dream('Segelyacht im Mittelmeer', 250000, '⛵'),
  biz('Autowerkstatt (Meisterbetrieb)', 120000, 4500),
  { type: 'divorce', name: 'SCHEIDUNG!', text: 'Zugewinnausgleich: Du verlierst dein gesamtes Bargeld.' },
  biz('Pflegeheim mit 60 Plätzen', 400000, 14000),
  dream('Schloss in Brandenburg', 400000, '🏰'),
  { type: 'charity', name: 'STIFTUNG GRÜNDEN', cost: 100000, text: 'Gründe eine Stiftung für 100.000 € und wähle für den Rest des Spiels 1, 2 oder 3 Würfel.' },
  biz('Brauerei in Franken', 250000, 9000),
  dream('Formel-1-Saison im VIP-Bereich', 200000, '🏎️'),
  { type: 'cfday', name: 'EURO-FLOW-TAG' },
  biz('Solarpark in Bayern', 200000, 7000),
  { type: 'gamble', name: 'Patent: E-Auto-Akku', cost: 20000, need: 5, payout: 250000, text: 'Investiere 20.000 €. Würfle 5 oder 6 und ein Autobauer kauft das Patent: +250.000 €.' },
  dream('Eigene Kunstsammlung', 120000, '🖼️'),
  { type: 'audit', name: 'BETRIEBS­PRÜFUNG!', text: 'Das Finanzamt prüft: Nachzahlung der Hälfte deines Bargelds.' },
  biz('Weingut an der Mosel', 180000, 6000),
  dream('Kinderhospiz unterstützen', 100000, '💛'),
  biz('Wohnanlage mit 60 Wohnungen', 500000, 18000),
  biz('Coworking-Space Berlin', 125000, 4000),
  { type: 'cfday', name: 'EURO-FLOW-TAG' },
  dream('Heli-Skiing in Kanada', 90000, '🚁'),
  biz('Netz aus E-Ladesäulen', 350000, 12500),
  { type: 'lawsuit', name: 'KLAGE!', text: 'Produkthaftungsklage: Du verlierst die Hälfte deines Bargelds.' },
  biz('Kita-Träger (3 Kitas)', 160000, 5500),
  dream('Oldtimer-Sammlung', 160000, '🚗'),
  biz('Mittelständischer Zulieferer', 450000, 16000),
  { type: 'gamble', name: 'Kinofilm produzieren', cost: 50000, need: 5, payout: 400000, text: 'Investiere 50.000 € in einen Kinofilm. Würfle 5 oder 6 und er wird ein Hit: +400.000 €.' },
  biz('Bäckerei-Kette (8 Filialen)', 220000, 8000),
];

export const FAST_INFO = {
  cfday:   { fill: '#f7c600', ink: '#3b2a00' },
  biz:     { fill: '#1e8a4a', ink: '#fff' },
  dream:   { fill: '#c6ecfb', ink: '#123a4d' },
  lawsuit: { fill: '#2d3436', ink: '#ff5e57' },
  divorce: { fill: '#2d3436', ink: '#ff5e57' },
  audit:   { fill: '#2d3436', ink: '#ff5e57' },
  charity: { fill: '#8a4fbf', ink: '#fff' },
  gamble:  { fill: '#0f6b5c', ink: '#fff' },
};

export const DREAM_INDEXES = FAST.map((f, i) => f.type === 'dream' ? i : -1).filter(i => i >= 0);
