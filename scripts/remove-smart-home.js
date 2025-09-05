const sqlite3 = require('sqlite3').verbose();

function openDb() { return new sqlite3.Database('domains.db'); }
function dbRun(db, sql, params = []) { return new Promise((resolve, reject) => db.run(sql, params, function(e){ return e ? reject(e) : resolve(this); })); }

async function main() {
  const db = openDb();
  try {
    await dbRun(db, 'DELETE FROM competitor_stores WHERE niche_id = (SELECT id FROM niches WHERE name = ?)', ['smart home']);
    console.log('Deleted smart home competitors');
  } catch (e) {
    console.error('Failed to delete smart home competitors:', e.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();


