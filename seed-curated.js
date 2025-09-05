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
      backyard: [
        { name: 'bbqguys.com', url: 'https://bbqguys.com', domain: 'bbqguys.com' },
        { name: 'firepitsdirect.com', url: 'https://firepitsdirect.com', domain: 'firepitsdirect.com' },
        { name: 'firepitsurplus.com', url: 'https://firepitsurplus.com', domain: 'firepitsurplus.com' },
        { name: 'theporchswingcompany.com', url: 'https://theporchswingcompany.com', domain: 'theporchswingcompany.com' },
        { name: 'allthingsbarbecue.com', url: 'https://allthingsbarbecue.com', domain: 'allthingsbarbecue.com' }
      ],
      'fireplace': [
        { name: 'fireplacesdirect.com', url: 'https://fireplacesdirect.com', domain: 'fireplacesdirect.com' },
        { name: 'electricfireplacesdirect.com', url: 'https://electricfireplacesdirect.com', domain: 'electricfireplacesdirect.com' },
        { name: 'starfiredirect.com', url: 'https://starfiredirect.com', domain: 'starfiredirect.com' },
        { name: 'usfireplacestore.com', url: 'https://usfireplacestore.com', domain: 'usfireplacestore.com' },
        { name: 'electricfireplacesdepot.com', url: 'https://electricfireplacesdepot.com', domain: 'electricfireplacesdepot.com' }
      ],
      'wellness': [
        { name: 'recoveryforathletes.com', url: 'https://recoveryforathletes.com', domain: 'recoveryforathletes.com' },
        { name: 'mysaunaworld.com', url: 'https://mysaunaworld.com', domain: 'mysaunaworld.com' },
        { name: 'northernsaunas.com', url: 'https://northernsaunas.com', domain: 'northernsaunas.com' },
        { name: 'secretsaunas.com', url: 'https://secretsaunas.com', domain: 'secretsaunas.com' },
        { name: 'thesaunaheater.com', url: 'https://thesaunaheater.com', domain: 'thesaunaheater.com' }
      ],
      'golf': [
        { name: 'shopindoorgolf.com', url: 'https://shopindoorgolf.com', domain: 'shopindoorgolf.com' },
        { name: 'rainorshinegolf.com', url: 'https://rainorshinegolf.com', domain: 'rainorshinegolf.com' },
        { name: 'carlsgolfland.com', url: 'https://carlsgolfland.com', domain: 'carlsgolfland.com' },
        { name: 'topshelfgolf.com', url: 'https://topshelfgolf.com', domain: 'topshelfgolf.com' },
        { name: 'golfsimulatorsforhome.com', url: 'https://golfsimulatorsforhome.com', domain: 'golfsimulatorsforhome.com' }
      ],
      'fitness': [
        { name: 'strengthwarehouseusa.com', url: 'https://strengthwarehouseusa.com', domain: 'strengthwarehouseusa.com' },
        { name: 'fitnessfactory.com', url: 'https://fitnessfactory.com', domain: 'fitnessfactory.com' },
        { name: 'fitnesszone.com', url: 'https://fitnesszone.com', domain: 'fitnesszone.com' },
        { name: 'marcypro.com', url: 'https://marcypro.com', domain: 'marcypro.com' },
        { name: 'globalfitness.com', url: 'https://globalfitness.com', domain: 'globalfitness.com' }
      ],
      'home theater': [
        { name: 'projectorpeople.com', url: 'https://projectorpeople.com', domain: 'projectorpeople.com' },
        { name: '4seating.com', url: 'https://4seating.com', domain: '4seating.com' },
        { name: 'htmarket.com', url: 'https://htmarket.com', domain: 'htmarket.com' },
        { name: 'theaterseatstore.com', url: 'https://theaterseatstore.com', domain: 'theaterseatstore.com' },
        { name: 'upscaleaudio.com', url: 'https://upscaleaudio.com', domain: 'upscaleaudio.com' }
      ],
      'kitchen': [
        { name: 'ajmadison.com', url: 'https://ajmadison.com', domain: 'ajmadison.com' },
        { name: 'therangehoodstore.com', url: 'https://therangehoodstore.com', domain: 'therangehoodstore.com' },
        { name: 'premiumhomesource.com', url: 'https://premiumhomesource.com', domain: 'premiumhomesource.com' },
        { name: 'seattlecoffeegear.com', url: 'https://seattlecoffeegear.com', domain: 'seattlecoffeegear.com' },
        { name: 'majestycoffee.com', url: 'https://majestycoffee.com', domain: 'majestycoffee.com' }
      ],
      'hvac': [
        { name: 'heatandcool.com', url: 'https://heatandcool.com', domain: 'heatandcool.com' },
        { name: 'alpinehomeair.com', url: 'https://alpinehomeair.com', domain: 'alpinehomeair.com' },
        { name: 'totalhomesupply.com', url: 'https://totalhomesupply.com', domain: 'totalhomesupply.com' },
        { name: 'acwholesalers.com', url: 'https://acwholesalers.com', domain: 'acwholesalers.com' },
        { name: 'hvacquick.com', url: 'https://hvacquick.com', domain: 'hvacquick.com' }
      ],
      'safes': [
        { name: 'deansafe.com', url: 'https://deansafe.com', domain: 'deansafe.com' },
        { name: 'thesafekeeper.com', url: 'https://thesafekeeper.com', domain: 'thesafekeeper.com' },
        { name: 'nwsafe.com', url: 'https://nwsafe.com', domain: 'nwsafe.com' },
        { name: 'safeandvaultstore.com', url: 'https://safeandvaultstore.com', domain: 'safeandvaultstore.com' },
        { name: 'libertysafe.com', url: 'https://libertysafe.com', domain: 'libertysafe.com' }
      ],
      'solar': [
        { name: 'shopsolarkits.com', url: 'https://shopsolarkits.com', domain: 'shopsolarkits.com' },
        { name: 'gogreensolar.com', url: 'https://gogreensolar.com', domain: 'gogreensolar.com' },
        { name: 'wholesalesolar.com', url: 'https://wholesalesolar.com', domain: 'wholesalesolar.com' },
        { name: 'mrsolar.com', url: 'https://mrsolar.com', domain: 'mrsolar.com' },
        { name: 'solarpowersupply.com', url: 'https://solarpowersupply.com', domain: 'solarpowersupply.com' }
      ],
      'drones': [
        { name: 'dronefly.com', url: 'https://dronefly.com', domain: 'dronefly.com' },
        { name: 'advexure.com', url: 'https://advexure.com', domain: 'advexure.com' },
        { name: 'maverickdrone.com', url: 'https://maverickdrone.com', domain: 'maverickdrone.com' },
        { name: 'dronenerds.com', url: 'https://dronenerds.com', domain: 'dronenerds.com' },
        { name: 'buydronesonline.com', url: 'https://buydronesonline.com', domain: 'buydronesonline.com' }
      ],
      'generators': [
        { name: 'generatormart.com', url: 'https://generatormart.com', domain: 'generatormart.com' },
        { name: 'electricgeneratorsdirect.com', url: 'https://electricgeneratorsdirect.com', domain: 'electricgeneratorsdirect.com' },
        { name: 'generatorsupercenter.com', url: 'https://generatorsupercenter.com', domain: 'generatorsupercenter.com' },
        { name: 'norwall.com', url: 'https://norwall.com', domain: 'norwall.com' },
        { name: 'apelectric.com', url: 'https://apelectric.com', domain: 'apelectric.com' }
      ],
      'horse riding': [
        { name: 'doversaddlery.com', url: 'https://doversaddlery.com', domain: 'doversaddlery.com' },
        { name: 'smartpakequine.com', url: 'https://smartpakequine.com', domain: 'smartpakequine.com' },
        { name: 'chicksaddlery.com', url: 'https://chicksaddlery.com', domain: 'chicksaddlery.com' },
        { name: 'horseloverz.com', url: 'https://horseloverz.com', domain: 'horseloverz.com' },
        { name: 'statelinetack.com', url: 'https://statelinetack.com', domain: 'statelinetack.com' }
      ],
      'sauna': [
        { name: 'saunaplace.com', url: 'https://saunaplace.com', domain: 'saunaplace.com' },
        { name: 'theblissfulplace.com', url: 'https://theblissfulplace.com', domain: 'theblissfulplace.com' },
        { name: 'saunaking.com', url: 'https://saunaking.com', domain: 'saunaking.com' },
        { name: 'almostheaven.com', url: 'https://almostheaven.com', domain: 'almostheaven.com' },
        { name: 'finnleo.com', url: 'https://finnleo.com', domain: 'finnleo.com' }
      ],
      'pizza oven': [
        { name: 'pizzaovens.com', url: 'https://pizzaovens.com', domain: 'pizzaovens.com' },
        { name: 'patioandpizza.com', url: 'https://patioandpizza.com', domain: 'patioandpizza.com' },
        { name: 'thepizzaovenshop.com', url: 'https://thepizzaovenshop.com', domain: 'thepizzaovenshop.com' },
        { name: 'wppo.com', url: 'https://wppo.com', domain: 'wppo.com' },
        { name: 'pizzaequipmentpros.com', url: 'https://pizzaequipmentpros.com', domain: 'pizzaequipmentpros.com' }
      ],
      'exercise equipment': [
        { name: 'globalfitness.com', url: 'https://globalfitness.com', domain: 'globalfitness.com' },
        { name: 'fitnessfactory.com', url: 'https://fitnessfactory.com', domain: 'fitnessfactory.com' },
        { name: 'gymsource.com', url: 'https://gymsource.com', domain: 'gymsource.com' },
        { name: 'marcypro.com', url: 'https://marcypro.com', domain: 'marcypro.com' },
        { name: 'ironcompany.com', url: 'https://ironcompany.com', domain: 'ironcompany.com' }
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


