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
        { name: 'BBQGuys', url: 'https://bbqguys.com', domain: 'bbqguys.com' },
        { name: 'Fire Pits Direct', url: 'https://firepitsdirect.com', domain: 'firepitsdirect.com' },
        { name: 'Fire Pit Surplus', url: 'https://firepitsurplus.com', domain: 'firepitsurplus.com' },
        { name: 'The Porch Swing Company', url: 'https://theporchswingcompany.com', domain: 'theporchswingcompany.com' },
        { name: 'All Things Barbecue', url: 'https://allthingsbarbecue.com', domain: 'allthingsbarbecue.com' }
      ],
      'fireplace': [
        { name: 'Fireplaces Direct', url: 'https://fireplacesdirect.com', domain: 'fireplacesdirect.com' },
        { name: 'Electric Fireplaces Direct', url: 'https://electricfireplacesdirect.com', domain: 'electricfireplacesdirect.com' },
        { name: 'Starfire Direct', url: 'https://starfiredirect.com', domain: 'starfiredirect.com' },
        { name: 'US Fireplace Store', url: 'https://usfireplacestore.com', domain: 'usfireplacestore.com' },
        { name: 'Electric Fireplaces Depot', url: 'https://electricfireplacesdepot.com', domain: 'electricfireplacesdepot.com' }
      ],
      'wellness': [
        { name: 'Recovery For Athletes', url: 'https://recoveryforathletes.com', domain: 'recoveryforathletes.com' },
        { name: 'My Sauna World', url: 'https://mysaunaworld.com', domain: 'mysaunaworld.com' },
        { name: 'Northern Saunas', url: 'https://northernsaunas.com', domain: 'northernsaunas.com' },
        { name: 'Secret Saunas', url: 'https://secretsaunas.com', domain: 'secretsaunas.com' },
        { name: 'The Sauna Heater', url: 'https://thesaunaheater.com', domain: 'thesaunaheater.com' }
      ],
      'golf': [
        { name: 'Shop Indoor Golf', url: 'https://shopindoorgolf.com', domain: 'shopindoorgolf.com' },
        { name: 'Rain or Shine Golf', url: 'https://rainorshinegolf.com', domain: 'rainorshinegolf.com' },
        { name: "Carl's Golfland", url: 'https://carlsgolfland.com', domain: 'carlsgolfland.com' },
        { name: 'Top Shelf Golf', url: 'https://topshelfgolf.com', domain: 'topshelfgolf.com' },
        { name: 'Golf Simulators For Home', url: 'https://golfsimulatorsforhome.com', domain: 'golfsimulatorsforhome.com' }
      ],
      'fitness': [
        { name: 'Strength Warehouse USA', url: 'https://strengthwarehouseusa.com', domain: 'strengthwarehouseusa.com' },
        { name: 'Fitness Factory', url: 'https://fitnessfactory.com', domain: 'fitnessfactory.com' },
        { name: 'Fitness Zone', url: 'https://fitnesszone.com', domain: 'fitnesszone.com' },
        { name: 'Marcy Pro', url: 'https://marcypro.com', domain: 'marcypro.com' },
        { name: 'Global Fitness', url: 'https://globalfitness.com', domain: 'globalfitness.com' }
      ],
      'home theater': [
        { name: 'Projector People', url: 'https://projectorpeople.com', domain: 'projectorpeople.com' },
        { name: '4Seating', url: 'https://4seating.com', domain: '4seating.com' },
        { name: 'HTMarket', url: 'https://htmarket.com', domain: 'htmarket.com' },
        { name: 'Theater Seat Store', url: 'https://theaterseatstore.com', domain: 'theaterseatstore.com' },
        { name: 'Upscale Audio', url: 'https://upscaleaudio.com', domain: 'upscaleaudio.com' }
      ],
      'kitchen': [
        { name: 'AJ Madison', url: 'https://ajmadison.com', domain: 'ajmadison.com' },
        { name: 'The Range Hood Store', url: 'https://therangehoodstore.com', domain: 'therangehoodstore.com' },
        { name: 'Premium Home Source', url: 'https://premiumhomesource.com', domain: 'premiumhomesource.com' },
        { name: 'Seattle Coffee Gear', url: 'https://seattlecoffeegear.com', domain: 'seattlecoffeegear.com' },
        { name: 'Majesty Coffee', url: 'https://majestycoffee.com', domain: 'majestycoffee.com' }
      ],
      'hvac': [
        { name: 'Heat & Cool', url: 'https://heatandcool.com', domain: 'heatandcool.com' },
        { name: 'Alpine Home Air', url: 'https://alpinehomeair.com', domain: 'alpinehomeair.com' },
        { name: 'Total Home Supply', url: 'https://totalhomesupply.com', domain: 'totalhomesupply.com' },
        { name: 'AC Wholesalers', url: 'https://acwholesalers.com', domain: 'acwholesalers.com' },
        { name: 'HVACQuick', url: 'https://hvacquick.com', domain: 'hvacquick.com' }
      ],
      'safes': [
        { name: 'Dean Safe', url: 'https://deansafe.com', domain: 'deansafe.com' },
        { name: 'The Safe Keeper', url: 'https://thesafekeeper.com', domain: 'thesafekeeper.com' },
        { name: 'NW Safe', url: 'https://nwsafe.com', domain: 'nwsafe.com' },
        { name: 'Safe & Vault Store', url: 'https://safeandvaultstore.com', domain: 'safeandvaultstore.com' },
        { name: 'Liberty Safe', url: 'https://libertysafe.com', domain: 'libertysafe.com' }
      ],
      'solar': [
        { name: 'Shop Solar Kits', url: 'https://shopsolarkits.com', domain: 'shopsolarkits.com' },
        { name: 'GoGreenSolar', url: 'https://gogreensolar.com', domain: 'gogreensolar.com' },
        { name: 'Wholesale Solar', url: 'https://wholesalesolar.com', domain: 'wholesalesolar.com' },
        { name: 'Mr. Solar', url: 'https://mrsolar.com', domain: 'mrsolar.com' },
        { name: 'Solar Power Supply', url: 'https://solarpowersupply.com', domain: 'solarpowersupply.com' }
      ],
      'drones': [
        { name: 'Dronefly', url: 'https://dronefly.com', domain: 'dronefly.com' },
        { name: 'Advexure', url: 'https://advexure.com', domain: 'advexure.com' },
        { name: 'Maverick Drone', url: 'https://maverickdrone.com', domain: 'maverickdrone.com' },
        { name: 'Drone Nerds', url: 'https://dronenerds.com', domain: 'dronenerds.com' },
        { name: 'Buy Drones Online', url: 'https://buydronesonline.com', domain: 'buydronesonline.com' }
      ],
      'generators': [
        { name: 'Generator Mart', url: 'https://generatormart.com', domain: 'generatormart.com' },
        { name: 'Electric Generators Direct', url: 'https://electricgeneratorsdirect.com', domain: 'electricgeneratorsdirect.com' },
        { name: 'Generator Supercenter', url: 'https://generatorsupercenter.com', domain: 'generatorsupercenter.com' },
        { name: 'Norwall', url: 'https://norwall.com', domain: 'norwall.com' },
        { name: 'AP Electric', url: 'https://apelectric.com', domain: 'apelectric.com' }
      ],
      'horse riding': [
        { name: 'Dover Saddlery', url: 'https://doversaddlery.com', domain: 'doversaddlery.com' },
        { name: 'SmartPak', url: 'https://smartpakequine.com', domain: 'smartpakequine.com' },
        { name: 'Chicks Saddlery', url: 'https://chicksaddlery.com', domain: 'chicksaddlery.com' },
        { name: 'HorseLoverZ', url: 'https://horseloverz.com', domain: 'horseloverz.com' },
        { name: 'State Line Tack', url: 'https://statelinetack.com', domain: 'statelinetack.com' }
      ],
      'sauna': [
        { name: 'The Sauna Place', url: 'https://saunaplace.com', domain: 'saunaplace.com' },
        { name: 'The Blissful Place', url: 'https://theblissfulplace.com', domain: 'theblissfulplace.com' },
        { name: 'Sauna King', url: 'https://saunaking.com', domain: 'saunaking.com' },
        { name: 'Almost Heaven Saunas', url: 'https://almostheaven.com', domain: 'almostheaven.com' },
        { name: 'Finnleo', url: 'https://finnleo.com', domain: 'finnleo.com' }
      ],
      'pizza oven': [
        { name: 'Pizza Ovens', url: 'https://pizzaovens.com', domain: 'pizzaovens.com' },
        { name: 'Patio & Pizza', url: 'https://patioandpizza.com', domain: 'patioandpizza.com' },
        { name: 'The Pizza Oven Shop', url: 'https://thepizzaovenshop.com', domain: 'thepizzaovenshop.com' },
        { name: 'WPPO', url: 'https://wppo.com', domain: 'wppo.com' },
        { name: 'Pizza Equipment Pros', url: 'https://pizzaequipmentpros.com', domain: 'pizzaequipmentpros.com' }
      ],
      'exercise equipment': [
        { name: 'Global Fitness', url: 'https://globalfitness.com', domain: 'globalfitness.com' },
        { name: 'Fitness Factory', url: 'https://fitnessfactory.com', domain: 'fitnessfactory.com' },
        { name: 'Gym Source', url: 'https://gymsource.com', domain: 'gymsource.com' },
        { name: 'Marcy Pro', url: 'https://marcypro.com', domain: 'marcypro.com' },
        { name: 'IRON COMPANY', url: 'https://ironcompany.com', domain: 'ironcompany.com' }
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


