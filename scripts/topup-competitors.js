// Top up competitor_stores so each popular niche has at least 5 live stores

const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const DOMAIN_DATABASES = require('../domain-databases');

function openDb() { return new sqlite3.Database('domains.db'); }
function dbGet(db, sql, params = []) { return new Promise((resolve, reject) => db.get(sql, params, (e, r) => e ? reject(e) : resolve(r))); }
function dbAll(db, sql, params = []) { return new Promise((resolve, reject) => db.all(sql, params, (e, r) => e ? reject(e) : resolve(r || []))); }
function dbRun(db, sql, params = []) { return new Promise((resolve, reject) => db.run(sql, params, function(e){ return e ? reject(e) : resolve(this); })); }

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
  const row = await dbGet(db, 'SELECT id FROM niches WHERE name = ?', [niche]);
  if (row && row.id) return row.id;
  const res = await dbRun(db, 'INSERT INTO niches (name) VALUES (?)', [niche]);
  return res.lastID;
}

async function countForNiche(db, niche) {
  const row = await dbGet(db, `SELECT COUNT(*) as cnt FROM competitor_stores WHERE niche_id = (SELECT id FROM niches WHERE name = ?)`, [niche]);
  return row ? row.cnt : 0;
}

async function insertStore(db, niche, store) {
  const nicheId = await getOrCreateNicheId(db, niche);
  const domain = String(store.domain || '').replace(/^https?:\/\//,'').replace(/^www\./,'');
  const url = store.url || `https://${domain}`;
  const name = store.name || domain;
  await dbRun(db, 'INSERT INTO competitor_stores (niche_id, name, url, domain) VALUES (?, ?, ?, ?)', [nicheId, name, url, domain]);
}

async function isLive(domainOrUrl) {
  const clean = String(domainOrUrl).replace(/^https?:\/\//,'').replace(/^www\./,'');
  const urls = [
    `https://${clean}`,
    `http://${clean}`,
    `https://www.${clean}`,
    `http://www.${clean}`
  ];
  for (const u of urls) {
    try {
      const head = await axios.head(u, { timeout: 6000, validateStatus: () => true });
      // treat most non-5xx responses as live (403/401/405 common on HEAD)
      if (head && head.status >= 200 && head.status < 500) return true;
      const get = await axios.get(u, { timeout: 12000, maxRedirects: 2, validateStatus: () => true });
      if (get && get.status >= 200 && get.status < 500) return true;
    } catch (_) {}
  }
  return false;
}

function curatedCandidates() {
  return {
    'backyard': [
      { name: 'PatioLiving', url: 'https://patioliving.com', domain: 'patioliving.com' },
      { name: 'Patio Productions', url: 'https://www.patioproductions.com', domain: 'patioproductions.com' },
      { name: 'Starfire Direct', url: 'https://starfiredirect.com', domain: 'starfiredirect.com' },
      { name: 'Woodland Direct', url: 'https://woodlanddirect.com', domain: 'woodlanddirect.com' },
      { name: 'Fire Pit Surplus', url: 'https://firepitsurplus.com', domain: 'firepitsurplus.com' }
    ],
    'pizza oven': [
      { name: 'Patio & Pizza', url: 'https://www.patioandpizza.com', domain: 'patioandpizza.com' },
      { name: 'Woodland Direct', url: 'https://woodlanddirect.com', domain: 'woodlanddirect.com' },
      { name: 'BBQGuys', url: 'https://bbqguys.com', domain: 'bbqguys.com' },
      { name: 'Starfire Direct', url: 'https://starfiredirect.com', domain: 'starfiredirect.com' },
      { name: 'Outdoor Cooking Pros', url: 'https://outdoorcookingpros.com', domain: 'outdoorcookingpros.com' }
    ],
    'marine': [
      { name: 'Wholesale Marine', url: 'https://wholesalemarine.com', domain: 'wholesalemarine.com' },
      { name: 'iBoats', url: 'https://www.iboats.com', domain: 'iboats.com' },
      { name: 'Marine Parts Source', url: 'https://www.marinepartssource.com', domain: 'marinepartssource.com' },
      { name: 'Boat Lift Warehouse', url: 'https://boatliftwarehouse.com', domain: 'boatliftwarehouse.com' },
      { name: 'Great Lakes Skipper', url: 'https://www.greatlakesskipper.com', domain: 'greatlakesskipper.com' }
    ],
    'fitness': [
      { name: 'Rogue Fitness', url: 'https://www.roguefitness.com', domain: 'roguefitness.com' },
      { name: 'REP Fitness', url: 'https://www.repfitness.com', domain: 'repfitness.com' },
      { name: 'Titan Fitness', url: 'https://www.titan.fitness', domain: 'titan.fitness' },
      { name: 'Force USA', url: 'https://www.forceusa.com', domain: 'forceusa.com' },
      { name: 'American Barbell', url: 'https://americanbarbell.com', domain: 'americanbarbell.com' }
    ],
    'drone': [
      { name: 'GetFPV', url: 'https://www.getfpv.com', domain: 'getfpv.com' },
      { name: 'RaceDayQuads', url: 'https://www.racedayquads.com', domain: 'racedayquads.com' },
      { name: 'Pyrodrone', url: 'https://pyrodrone.com', domain: 'pyrodrone.com' },
      { name: 'HobbyKing', url: 'https://hobbyking.com', domain: 'hobbyking.com' },
      { name: 'UAV Direct', url: 'https://www.uavdirect.com', domain: 'uavdirect.com' }
    ],
    'kitchen': [
      { name: 'Surlatable', url: 'https://www.surlatable.com', domain: 'surlatable.com' },
      { name: 'Chef’s Resource', url: 'https://www.chefsresource.com', domain: 'chefsresource.com' },
      { name: 'Kitchensource', url: 'https://www.kitchensource.com', domain: 'kitchensource.com' },
      { name: 'WebstaurantStore', url: 'https://www.webstaurantstore.com', domain: 'webstaurantstore.com' },
      { name: 'Williams Sonoma', url: 'https://www.williams-sonoma.com', domain: 'williams-sonoma.com' }
    ],
    'golf': [
      { name: 'Rock Bottom Golf', url: 'https://www.rockbottomgolf.com', domain: 'rockbottomgolf.com' },
      { name: 'GlobalGolf', url: 'https://www.globalgolf.com', domain: 'globalgolf.com' },
      { name: 'TGW - The Golf Warehouse', url: 'https://www.tgw.com', domain: 'tgw.com' },
      { name: 'GolfDiscount', url: 'https://www.golfdiscount.com', domain: 'golfdiscount.com' },
      { name: 'Budget Golf', url: 'https://www.budgetgolf.com', domain: 'budgetgolf.com' }
    ],
    'wellness': [
      { name: 'Health Products For You', url: 'https://healthproductsforyou.com', domain: 'healthproductsforyou.com' },
      { name: 'RehabMart', url: 'https://www.rehabmart.com', domain: 'rehabmart.com' },
      { name: 'Vitality Medical', url: 'https://www.vitalitymedical.com', domain: 'vitalitymedical.com' },
      { name: 'ActiveForever', url: 'https://www.activeforever.com', domain: 'activeforever.com' },
      { name: '1800Wheelchair', url: 'https://www.1800wheelchair.com', domain: '1800wheelchair.com' }
    ],
    'garage': [
      { name: 'Garage Flooring LLC', url: 'https://garageflooringllc.com', domain: 'garageflooringllc.com' },
      { name: 'StoreYourBoard', url: 'https://www.storeyourboard.com', domain: 'storeyourboard.com' },
      { name: 'Flow Wall', url: 'https://www.flowwall.com', domain: 'flowwall.com' },
      { name: 'NewAge Products', url: 'https://newageproducts.com', domain: 'newageproducts.com' },
      { name: 'Wall Control', url: 'https://www.wallcontrol.com', domain: 'wallcontrol.com' }
    ],
    'smart home': [
      { name: 'Home Controls', url: 'https://www.homecontrols.com', domain: 'homecontrols.com' },
      { name: 'Aartech Canada', url: 'https://www.aartech.ca', domain: 'aartech.ca' },
      { name: 'Automated Outlet', url: 'https://www.automatedoutlet.com', domain: 'automatedoutlet.com' },
      { name: 'The Smartest House', url: 'https://www.thesmartesthouse.com', domain: 'thesmartesthouse.com' },
      { name: 'Matter Shop', url: 'https://shop.matter-smarthome.org', domain: 'matter-smarthome.org' }
    ],
    'firepit': [
      { name: 'Fire Pit Surplus', url: 'https://firepitsurplus.com', domain: 'firepitsurplus.com' },
      { name: 'Starfire Direct', url: 'https://starfiredirect.com', domain: 'starfiredirect.com' },
      { name: 'Woodland Direct', url: 'https://woodlanddirect.com', domain: 'woodlanddirect.com' },
      { name: 'The Fire Pit Store', url: 'https://www.thefirepitstore.com', domain: 'thefirepitstore.com' },
      { name: 'Modern Blaze', url: 'https://www.modernblaze.com', domain: 'modernblaze.com' },
      { name: 'Embers Living', url: 'https://www.embersliving.com', domain: 'embersliving.com' },
      { name: 'Hansen Wholesale', url: 'https://www.hansenwholesale.com', domain: 'hansenwholesale.com' },
      { name: 'eFireplaceStore', url: 'https://www.efireplacestore.com', domain: 'efireplacestore.com' },
      { name: 'Blazing Embers', url: 'https://blazingembers.com', domain: 'blazingembers.com' }
    ]
  };
}

async function topUp(db, niche, minCount = 5) {
  let count = await countForNiche(db, niche);
  if (count >= minCount) return { niche, added: 0, final: count };
  const candidates = curatedCandidates()[niche] || [];
  const existing = new Set((await dbAll(db, 'SELECT domain FROM competitor_stores WHERE niche_id = (SELECT id FROM niches WHERE name = ?)', [niche])).map(r => String(r.domain).toLowerCase()));
  let added = 0;
  for (const c of candidates) {
    if (await countForNiche(db, niche) >= minCount) break;
    const key = String(c.domain).replace(/^www\./,'').toLowerCase();
    if (existing.has(key)) continue;
    const live = await isLive(c.domain);
    if (!live) continue;
    await insertStore(db, niche, c);
    existing.add(key);
    added++;
  }
  count = await countForNiche(db, niche);
  return { niche, added, final: count };
}

async function main() {
  const db = openDb();
  try {
    await ensureTables(db);
    const niches = Object.keys(DOMAIN_DATABASES.popularNiches || {});
    const results = [];
    for (const n of niches) {
      const r = await topUp(db, n, 5);
      console.log(`- ${n}: added ${r.added}, total ${r.final}`);
      results.push(r);
    }
    console.log('\nJSON Summary:\n' + JSON.stringify({ results }, null, 2));
  } catch (e) {
    console.error('Top-up failed:', e.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();


