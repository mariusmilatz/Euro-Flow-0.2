// Euro Flow – German income tax & social insurance (2025 values, simplified).
// §32a EStG tariff, Soli with Freigrenze, church tax, employee social insurance with contribution caps.

// Income tax on yearly taxable income (§32a EStG, 2025)
export function tarif(x) {
  x = Math.floor(Math.max(0, x));
  if (x <= 12096) return 0;
  if (x <= 17443) { const y = (x - 12096) / 10000; return Math.floor((932.3 * y + 1400) * y); }
  if (x <= 68480) { const z = (x - 17443) / 10000; return Math.floor((176.64 * z + 2397) * z + 1015.13); }
  if (x <= 277825) return Math.floor(0.42 * x - 10911.92);
  return Math.floor(0.45 * x - 18918.79);
}

// Solidarity surcharge: only above the Freigrenze (since 2021 most employees pay none)
export function soli(tax) {
  if (tax <= 19950) return 0;
  return Math.min(0.055 * tax, 0.119 * (tax - 19950));
}

// Employee share of social insurance per month (2025)
export function social(gross, hasKids) {
  const rvav = Math.min(gross, 8050) * (0.093 + 0.013);          // pension + unemployment
  const pv = hasKids ? 0.018 : 0.024;                             // care (childless surcharge)
  const kvpv = Math.min(gross, 5512.5) * (0.0855 + pv);           // health (incl. avg. Zusatzbeitrag) + care
  return { total: Math.round(rvav + kvpv), rv: Math.min(gross, 8050) * 0.093, kv: Math.min(gross, 5512.5) * 0.0855, pv: Math.min(gross, 5512.5) * pv };
}

// Yearly taxable income from a monthly gross salary
export function taxable(gross, opts = {}) {
  const yearGross = gross * 12;
  let vorsorge;
  if (opts.pkv) vorsorge = opts.pkv * 12 * 0.8;                   // civil servants: basic PKV share deductible
  else { const sv = social(gross, opts.hasKids); vorsorge = (sv.rv + sv.kv * 0.96 + sv.pv) * 12; }
  return Math.max(0, yearGross - 1230 - 36 - vorsorge - (opts.afa || 0));
}

// Full monthly payroll: { tax, soli, church, social, mrate }
export function payroll(gross, opts = {}) {
  if (!gross) return { tax: 0, soli: 0, church: 0, social: 0, mrate: 0, x: 0 };
  const x = taxable(gross, opts);
  const est = tarif(x);
  const so = soli(est);
  const church = opts.church ? est * opts.church : 0;
  const mrate = (tarif(x + 1000) - est) / 1000;
  return {
    tax: Math.round(est / 12), soli: Math.round(so / 12), church: Math.round(church / 12),
    social: opts.pkv ? opts.pkv : social(gross, opts.hasKids).total, mrate, x,
  };
}

// Monthly tax saved by writing off `afaYear` € of depreciation (AfA) against the salary
export function afaSaving(gross, afaYear, opts = {}) {
  if (!gross || !afaYear) return 0;
  const a = payroll(gross, opts), b = payroll(gross, { ...opts, afa: afaYear });
  return Math.max(0, (a.tax + a.soli + a.church) - (b.tax + b.soli + b.church));
}
