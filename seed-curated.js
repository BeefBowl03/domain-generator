const sqlite3 = require('sqlite3').verbose();

function openDb() {
  return new sqlite3.Database('domains.db');
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function getOrCreateNicheId(db, niche) {
  const row = await get(db, 'SELECT id FROM niches WHERE name = ?', [niche]);
  if (row && row.id) return row.id;
  const res = await run(db, 'INSERT INTO niches (name) VALUES (?)', [niche]);
  return res.lastID;
}

async function replaceCurated(db, niche, competitors) {
  const nicheId = await getOrCreateNicheId(db, niche);
  await run(db, 'DELETE FROM competitor_stores WHERE niche_id = ?', [nicheId]);
  for (const c of competitors) {
    if (!c || !c.domain) continue;
    const name = c.name || c.domain;
    const domain = String(c.domain).replace(/^https?:\/\//,'').replace(/^www\./,'');
    const url = c.url || `https://${domain}`;
    await run(db, 'INSERT INTO competitor_stores (niche_id, name, url, domain) VALUES (?, ?, ?, ?)', [nicheId, name, url, domain]);
  }
}

async function main() {
  const db = openDb();
  try {
    const curated = {
      firepit: [
        { name: 'Fire Pit Surplus', url: 'https://firepitsurplus.com', domain: 'firepitsurplus.com' },
        { name: 'Starfire Direct', url: 'https://starfiredirect.com', domain: 'starfiredirect.com' },
        { name: 'Woodland Direct', url: 'https://woodlanddirect.com', domain: 'woodlanddirect.com' },
        { name: 'BBQGuys', url: 'https://bbqguys.com', domain: 'bbqguys.com' },
        { name: 'Flame Authority', url: 'https://flameauthority.com', domain: 'flameauthority.com' }
      ],
      backyard: [
        { name: 'Outdoor Cooking Pros', url: 'https://outdoorcookingpros.com', domain: 'outdoorcookingpros.com' },
        { name: 'BBQGuys', url: 'https://bbqguys.com', domain: 'bbqguys.com' },
        { name: 'Woodland Direct', url: 'https://woodlanddirect.com', domain: 'woodlanddirect.com' },
        { name: 'PatioLiving', url: 'https://patioliving.com', domain: 'patioliving.com' },
        { name: 'Flame Authority', url: 'https://flameauthority.com', domain: 'flameauthority.com' }
      ]
    };

    for (const niche of Object.keys(curated)) {
      await replaceCurated(db, niche, curated[niche]);
      console.log(`Saved curated competitors for ${niche}: ${curated[niche].length}`);
    }
  } catch (e) {
    console.error('Seeding failed:', e.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();


