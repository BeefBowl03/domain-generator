// Print all competitor stores per niche from SQLite for verification/auditing

const sqlite3 = require('sqlite3').verbose();

function openDb() { return new sqlite3.Database('domains.db'); }
function dbAll(db, sql, params = []) { return new Promise((resolve, reject) => db.all(sql, params, (e, r) => e ? reject(e) : resolve(r || []))); }

async function main() {
  const db = openDb();
  try {
    const rows = await dbAll(db, `
      SELECT n.name as niche, cs.name as store_name, cs.url as url, cs.domain as domain
      FROM competitor_stores cs
      JOIN niches n ON n.id = cs.niche_id
      ORDER BY n.name ASC, cs.name ASC
    `);

    const grouped = {};
    for (const r of rows) {
      if (!grouped[r.niche]) grouped[r.niche] = [];
      grouped[r.niche].push({ name: r.store_name, url: r.url, domain: r.domain });
    }

    // Human-readable counts
    console.log('Per-niche counts:');
    Object.keys(grouped).sort().forEach(n => console.log(`- ${n}: ${grouped[n].length}`));
    console.log('\nJSON detail by niche (for records):');
    console.log(JSON.stringify(grouped, null, 2));
  } catch (e) {
    console.error('Failed to read competitors:', e.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();


