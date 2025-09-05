const sqlite3 = require('sqlite3').verbose();

function openDb() { return new sqlite3.Database('domains.db'); }
function dbRun(db, sql, params = []) { return new Promise((resolve, reject) => db.run(sql, params, function(e){ return e ? reject(e) : resolve(this); })); }
function dbGet(db, sql, params = []) { return new Promise((resolve, reject) => db.get(sql, params, (e, r) => e ? reject(e) : resolve(r))); }

async function getOrCreateNicheId(db, niche) {
  const row = await dbGet(db, 'SELECT id FROM niches WHERE name = ?', [niche]);
  if (row && row.id) return row.id;
  const res = await dbRun(db, 'INSERT INTO niches (name) VALUES (?)', [niche]);
  return res.lastID;
}

async function main() {
  const db = openDb();
  try {
    const nicheId = await getOrCreateNicheId(db, 'smart home');
    await dbRun(db, 'DELETE FROM competitor_stores WHERE niche_id = ?', [nicheId]);
    await dbRun(db, 'INSERT INTO competitor_stores (niche_id,name,url,domain) VALUES (?,?,?,?)', [nicheId, 'Smart Home Luxury', 'https://smarthomeluxury.com/', 'smarthomeluxury.com']);
    await dbRun(db, 'INSERT INTO competitor_stores (niche_id,name,url,domain) VALUES (?,?,?,?)', [nicheId, 'Home Controls', 'https://www.homecontrols.com/', 'homecontrols.com']);
    console.log('Inserted 2 smart home competitors');
  } catch (e) {
    console.error('Failed to insert smart home competitors:', e.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
