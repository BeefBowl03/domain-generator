// Audit and persist working competitor stores for all niches
// Runs outside the HTTP server to directly update SQLite

const sqlite3 = require('sqlite3').verbose();
const CompetitorFinder = require('../competitor-finder');
const DOMAIN_DATABASES = require('../domain-databases');
require('dotenv').config();

function openDb() {
  return new sqlite3.Database('domains.db');
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) { return err ? reject(err) : resolve(this); });
  });
}

async function ensureTables(db) {
  await dbRun(db, `CREATE TABLE IF NOT EXISTS niches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await dbRun(db, `CREATE TABLE IF NOT EXISTS competitor_stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    niche_id INTEGER,
    name TEXT,
    url TEXT,
    domain TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (niche_id) REFERENCES niches (id)
  )`);
}

async function getOrCreateNicheId(db, niche) {
  const existing = await dbGet(db, 'SELECT id FROM niches WHERE name = ?', [niche]);
  if (existing && existing.id) return existing.id;
  const inserted = await dbRun(db, 'INSERT INTO niches (name) VALUES (?)', [niche]);
  return inserted && inserted.lastID ? inserted.lastID : null;
}

async function fetchCuratedStores(db, niche) {
  const row = await dbGet(db, 'SELECT id FROM niches WHERE name = ?', [niche]);
  if (!row) return [];
  const stores = await dbAll(db, 'SELECT name, url, domain FROM competitor_stores WHERE niche_id = ?', [row.id]);
  return (stores || []).map(s => ({ name: s.name, url: s.url, domain: s.domain }));
}

async function replaceCuratedStores(db, niche, stores) {
  const nicheId = await getOrCreateNicheId(db, niche);
  if (!nicheId) return false;
  await dbRun(db, 'DELETE FROM competitor_stores WHERE niche_id = ?', [nicheId]);
  for (const s of (stores || [])) {
    if (!s || !s.domain) continue;
    await dbRun(db, 'INSERT INTO competitor_stores (niche_id, name, url, domain) VALUES (?, ?, ?, ?)', [
      nicheId,
      s.name || s.domain,
      s.url || `https://${String(s.domain).replace(/^https?:\/\//,'')}`,
      String(s.domain).replace(/^https?:\/\//,'').replace(/^www\./,'')
    ]);
  }
  return true;
}

async function auditCompetitorsForNiche(db, competitorFinder, niche, timeLimitMs = 60000) {
  const deadlineAt = Date.now() + Math.max(30000, timeLimitMs);
  const curated = await fetchCuratedStores(db, niche);
  const seed = [
    ...(curated || []),
    ...(competitorFinder.getKnownStoresWide(niche) || [])
  ];

  const unique = new Map();
  for (const s of seed) {
    if (!s || !s.domain) continue;
    const k = String(s.domain).replace(/^https?:\/\//,'').replace(/^www\./,'').toLowerCase();
    if (!unique.has(k)) unique.set(k, s);
  }
  const candidates = Array.from(unique.values());

  const verified = [];
  const batchSize = 10;
  for (let i = 0; i < candidates.length && Date.now() < deadlineAt && verified.length < 12; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    await Promise.all(batch.map(async (c) => {
      if (verified.length >= 12 || Date.now() >= deadlineAt) return;
      try {
        const exists = await competitorFinder.verifyStoreExists(c, { fastVerify: false });
        if (!exists) return;
        const qualifies = await competitorFinder.qualifiesAsHighTicketDropshipping(c, { fastVerify: false });
        if (qualifies) verified.push(c);
      } catch (_) {}
    }));
  }

  if (verified.length < 5 && Date.now() < deadlineAt) {
    const strict = await competitorFinder.getVerifiedCompetitors(niche, { fast: false, deadlineAt });
    for (const s of (strict || [])) {
      if (verified.length >= 12 || Date.now() >= deadlineAt) break;
      const k = String(s.domain || '').replace(/^https?:\/\//,'').replace(/^www\./,'').toLowerCase();
      if (!k) continue;
      if (verified.find(v => String(v.domain).toLowerCase() === k)) continue;
      verified.push(s);
    }
  }

  // Last-chance fill using trusted known stores with fast verification and shallow relevance
  if (verified.length < 5 && Date.now() < deadlineAt) {
    const seen = new Set(verified.map(v => String(v.domain || '').replace(/^https?:\/\//,'').replace(/^www\./,'').toLowerCase()));
    const candidates2 = [
      ...(competitorFinder.getKnownStoresWide(niche) || []),
      ...(competitorFinder.getKnownStoresGlobal() || [])
    ];
    for (const c of candidates2) {
      if (verified.length >= 5 || Date.now() >= deadlineAt) break;
      const key = String(c.domain || '').replace(/^https?:\/\//,'').replace(/^www\./,'').toLowerCase();
      if (!key || seen.has(key)) continue;
      try {
        const relevant = await competitorFinder.isRelevantToNiche(c, niche, { checkContent: false });
        if (!relevant) continue;
        const exists = await competitorFinder.verifyStoreExists(c, { fastVerify: true });
        if (!exists) continue;
        const qualifies = await competitorFinder.qualifiesAsHighTicketDropshipping(c, { fastVerify: true, trustedKnown: true });
        if (!qualifies) continue;
        verified.push(c);
        seen.add(key);
      } catch (_) {}
    }
  }

  const toSave = verified.slice(0, 10);
  if (toSave.length > 0) {
    await replaceCuratedStores(db, niche, toSave);
  }
  return { niche, audited: verified.length, saved: toSave.length, competitors: toSave };
}

async function main() {
  const db = openDb();
  try {
    await ensureTables(db);
    const competitorFinder = new CompetitorFinder(process.env.OPENAI_API_KEY);

    const popular = Object.keys(DOMAIN_DATABASES.popularNiches || {});
    const rows = await dbAll(db, 'SELECT name FROM niches', []);
    const fromDB = rows.map(r => r.name).filter(Boolean);
    const all = Array.from(new Set([ ...popular, ...fromDB ])).filter(Boolean);
    if (all.length === 0) {
      console.log('No niches found to audit. Add some niches first.');
      return;
    }

    const results = [];
    for (const n of all) {
      process.stdout.write(`Auditing "${n}"... `);
      try {
        const r = await auditCompetitorsForNiche(db, competitorFinder, n, 60000);
        results.push(r);
        console.log(`done. saved=${r.saved}, audited=${r.audited}`);
      } catch (e) {
        console.log(`error: ${e.message}`);
        results.push({ niche: n, error: e.message });
      }
    }

    console.log('\nPer-niche saved counts:');
    for (const n of all) {
      const row = await dbGet(db, `SELECT COUNT(*) as cnt FROM competitor_stores WHERE niche_id = (SELECT id FROM niches WHERE name = ?)`, [n]);
      const cnt = row ? row.cnt : 0;
      console.log(`- ${n}: ${cnt}`);
    }

    // Output JSON summary for programmatic use
    const summary = { total: results.length, results };
    console.log('\nJSON Summary:\n' + JSON.stringify(summary, null, 2));
  } finally {
    db.close();
  }
}

main().catch(e => {
  console.error('Audit failed:', e);
  process.exit(1);
});


