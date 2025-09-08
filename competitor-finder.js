const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');
const DOMAIN_DATABASES = require('./domain-databases');

class CompetitorFinder {
    constructor(openaiApiKey) {
        this.openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
        // Excluded major retailers
        this.excludedRetailers = new Set([
            'amazon.com', 'ebay.com', 'walmart.com', 'target.com',
            'wayfair.com', 'homedepot.com', 'lowes.com', 'costco.com',
            'alibaba.com', 'aliexpress.com', 'etsy.com', 'wish.com',
            'overstock.com', 'ikea.com', 'bestbuy.com', 'macys.com'
        ]);

        // Known private e-commerce stores by niche (curated)
        this.knownStores = {
            'backyard': [
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
            // Map Man Cave to Home Theater storefronts as canonical stores
            'man cave': [
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
            'embroidery': [
                { name: 'Sewing Machines Plus', url: 'https://www.sewingmachinesplus.com', domain: 'sewingmachinesplus.com' },
                { name: 'Embroidery Central', url: 'https://www.embroiderycentral.com', domain: 'embroiderycentral.com' },
                { name: 'Embroidery Designs', url: 'https://www.embroiderydesigns.com', domain: 'embroiderydesigns.com' },
                { name: 'Embroidery Machine Warehouse', url: 'https://www.embroiderymachinewarehouse.com', domain: 'embroiderymachinewarehouse.com' },
                { name: 'AllBrands', url: 'https://www.allbrands.com', domain: 'allbrands.com' }
            ],
            'smart home': [
                { name: 'Smarthome', url: 'https://smarthome.com', domain: 'smarthome.com' },
                { name: 'The Smartest House', url: 'https://thesmartesthouse.com', domain: 'thesmartesthouse.com' },
                { name: 'Home Controls', url: 'https://homecontrols.com', domain: 'homecontrols.com' },
                { name: 'A1 Security Cameras', url: 'https://www.a1securitycameras.com', domain: 'a1securitycameras.com' },
                { name: 'SpyTec Security', url: 'https://www.spytec.com', domain: 'spytec.com' }
            ],
            'marine': [
                { name: 'West Marine', url: 'https://www.westmarine.com', domain: 'westmarine.com' },
                { name: 'iBoats', url: 'https://www.iboats.com', domain: 'iboats.com' },
                { name: 'Wholesale Marine', url: 'https://www.wholesalemarine.com', domain: 'wholesalemarine.com' },
                { name: 'Fisheries Supply', url: 'https://www.fisheriessupply.com', domain: 'fisheriessupply.com' },
                { name: 'Defender Marine', url: 'https://www.defender.com', domain: 'defender.com' }
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
    }

    async findCompetitors(niche) {
        const normalizedNiche = this.normalizeNiche(niche);
        
        // First, try to find from known stores
        if (this.knownStores[normalizedNiche]) {
            console.log(`Found ${this.knownStores[normalizedNiche].length} known competitors for ${niche}`);
            return this.knownStores[normalizedNiche];
        }

        // If not found, try variations and related terms
        const variations = this.getNicheVariations(normalizedNiche);
        for (const variation of variations) {
            if (this.knownStores[variation]) {
                console.log(`Found competitors using variation "${variation}" for niche "${niche}"`);
                return this.knownStores[variation];
            }
        }

        // If still no matches, try to search online (placeholder for future implementation)
        console.log(`No known competitors found for "${niche}", using generic search...`);
        return await this.searchOnlineCompetitors(niche);
    }

    normalizeNiche(niche) {
        const n = String(niche || '').toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        // Map common no-space/alias variations to canonical niches
        const aliases = {
            'horseriding': 'horse riding',
            'hometheater': 'man cave',
            'hometheatre': 'man cave',
            'home theater': 'man cave',
            'home theatre': 'man cave',
            'pizzaoven': 'pizza oven',
            'exerciseequipment': 'exercise equipment',
            'smarthome': 'smart home',
            'homegym': 'fitness'
        };
        return aliases[n.replace(/\s+/g, '')] || n;
    }

    // Map any input niche to the closest known niche we have stores for
    mapToClosestKnownNiche(niche) {
        const input = this.normalizeNiche(niche);
        // 1) Direct known
        if (this.knownStores[input]) return input;

        // 2) Hard-coded synonym routing for common cases
        const hardMap = {
            'automotive': 'garage',
            'auto': 'garage',
            'cars': 'garage',
            'car': 'garage',
            'vehicles': 'garage',
            'vehicle': 'garage',
            'ev': 'garage',
            'charging': 'garage',
            'mancave': 'man cave',
            'man cave': 'man cave',
            'home theater': 'man cave',
            'home theatre': 'man cave',
            'entertainment': 'man cave',
            'media room': 'man cave',
            'media': 'man cave',
            'game room': 'man cave',
            'gameroom': 'man cave'
        };
        if (hardMap[input]) return hardMap[input];

        // 3) Check against DOMAIN_DATABASES.popularNiches synonyms
        try {
            const popular = DOMAIN_DATABASES && DOMAIN_DATABASES.popularNiches ? DOMAIN_DATABASES.popularNiches : {};
            const keys = Object.keys(popular);
            const lowerInput = String(input || '').toLowerCase();
            for (const key of keys) {
                const item = popular[key] || {};
                const synonyms = Array.isArray(item.synonyms) ? item.synonyms : [];
                const candidates = [key, ...(synonyms || [])].map(s => String(s || '').toLowerCase().trim());
                if (candidates.includes(lowerInput)) {
                    if (this.knownStores[key]) return key;
                }
            }
        } catch (_) {}

        // 4) Fuzzy contains match over knownStores keys
        const keys = Object.keys(this.knownStores || {});
        for (const key of keys) {
            if (input.includes(key) || key.includes(input)) return key;
        }

        // 5) Final cluster heuristics
        if (/(garage|auto|car|vehicle|ev|charge)/i.test(input)) return 'garage';
        if (/(garden|yard|patio|backyard|deck|landscape)/i.test(input)) return 'backyard';
        if (/(sauna|wellness|massage|meditation|recovery)/i.test(input)) return 'wellness';
        if (/(fitness|gym|exercise|strength|cardio)/i.test(input)) return 'fitness';
        if (/(kitchen|appliance|cooking|chef)/i.test(input)) return 'kitchen';
        if (/(projector|theater|theatre|seating|man\s*cave)/i.test(input)) return 'man cave';

        // 6) Fuzzy-best match across all known niches and their synonyms
        const best = this.bestMatchKnownNiche(input);
        if (best) return best;

        // Final safeguard: map to backyard cluster to avoid inventing categories
        return 'backyard';
    }

    // Compute Levenshtein distance between two strings
    levenshtein(a, b) {
        const s = String(a || '');
        const t = String(b || '');
        const m = s.length; const n = t.length;
        if (m === 0) return n; if (n === 0) return m;
        const dp = new Array(n + 1);
        for (let j = 0; j <= n; j++) dp[j] = j;
        for (let i = 1; i <= m; i++) {
            let prev = dp[0];
            dp[0] = i;
            for (let j = 1; j <= n; j++) {
                const temp = dp[j];
                const cost = s[i - 1] === t[j - 1] ? 0 : 1;
                dp[j] = Math.min(
                    dp[j] + 1,          // deletion
                    dp[j - 1] + 1,      // insertion
                    prev + cost          // substitution
                );
                prev = temp;
            }
        }
        return dp[n];
    }

    // Build best match against known niches (includes synonyms) using hybrid similarity
    bestMatchKnownNiche(niche) {
        try {
            const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
            const input = norm(niche);

            const candidates = [];
            const keys = Object.keys(this.knownStores || {});
            for (const key of keys) {
                candidates.push({ label: key, key });
            }
            try {
                const popular = DOMAIN_DATABASES && DOMAIN_DATABASES.popularNiches ? DOMAIN_DATABASES.popularNiches : {};
                for (const key of Object.keys(popular)) {
                    if (!this.knownStores[key]) continue; // only map to niches we actually have stores for
                    const syns = Array.isArray(popular[key].synonyms) ? popular[key].synonyms : [];
                    for (const s of syns) {
                        candidates.push({ label: String(s || ''), key });
                    }
                }
            } catch (_) {}

            if (candidates.length === 0) return null;

            // Tokenize for Jaccard similarity
            const tokens = (s) => new Set(norm(s).split(' ').filter(Boolean));
            const inputTokens = tokens(input);
            const jaccard = (aSet, bSet) => {
                let inter = 0; let union = new Set([...aSet, ...bSet]).size;
                for (const a of aSet) if (bSet.has(a)) inter++;
                return union === 0 ? 0 : inter / union;
            };

            let bestKey = null; let bestScore = -1;
            for (const cand of candidates) {
                const candStr = norm(cand.label).replace(/\s+/g, '');
                const inputStr = input.replace(/\s+/g, '');
                const dist = this.levenshtein(inputStr, candStr);
                const maxLen = Math.max(inputStr.length, candStr.length) || 1;
                const levSim = 1 - (dist / maxLen);
                const jacSim = jaccard(inputTokens, tokens(cand.label));
                const score = (0.7 * levSim) + (0.3 * jacSim);
                if (score > bestScore) {
                    bestScore = score;
                    bestKey = cand.key;
                }
            }
            return bestKey || null;
        } catch (_) {
            return null;
        }
    }

    getNicheVariations(niche) {
        const variations = new Set();
        
        // Add the original niche
        variations.add(niche);
        
        // Add singular/plural variations
        if (niche.endsWith('s')) {
            variations.add(niche.slice(0, -1));
        } else {
            variations.add(niche + 's');
        }
        
        // Add from central related terms map
        const relatedTerms = this.getRelatedTermsMap();
        if (relatedTerms[niche]) {
            relatedTerms[niche].forEach(term => variations.add(term));
        }

        return Array.from(variations);
    }

    // Centralized related terms map so routing and variations share the same source
    getRelatedTermsMap() {
        return {
            'backyard': ['patio', 'garden', 'yard', 'lawn', 'deck', 'landscape'],
            'pizza oven': ['outdoor oven', 'wood fired oven', 'pizza', 'oven', 'outdoor cooking', 'backyard cooking'],
            'drone': ['uav', 'quadcopter', 'aerial', 'drone photography', 'fpv', 'rc drone', 'quad', 'quads', 'multirotor'],
            'kitchen': ['culinary', 'cooking', 'chef', 'cookware', 'kitchen equipment', 'appliances'],
            'golf': ['golfing', 'golf equipment', 'golf gear', 'golf clubs', 'golf accessories'],
            'fitness': ['gym', 'workout', 'exercise', 'training', 'bodybuilding', 'strength'],
            'marine': ['boat', 'nautical', 'sailing', 'maritime'],
            'horse riding': ['equestrian', 'equine', 'horse', 'riding', 'horses'],
            'horse': ['horse riding', 'equestrian', 'equine'],
            'horses': ['horse riding', 'equestrian', 'equine'],
            'wellness': ['health', 'fitness', 'nutrition'],
            'smart home': ['home automation', 'iot', 'connected home'],
            'outdoor': ['adventure', 'camping', 'hiking'],
            'garage': ['automotive', 'workshop', 'storage'],
            'barbecue': ['grilling', 'bbq', 'outdoor cooking'],
            'man cave': ['mancave', 'den', 'entertainment', 'game room', 'home theater', 'basement'],
            'mancave': ['man cave', 'den', 'entertainment', 'game room', 'home theater', 'basement'],

            // Database-driven type words → canonical niches
            // Backyard cluster
            'bbq': ['barbecue', 'grill', 'grilling', 'smoker', 'fire'],
            'barbecue': ['bbq', 'grill', 'smoker', 'outdoor cooking', 'fire'],
            'fire': ['firepit', 'flame', 'hearth', 'backyard'],
            'pool': ['spa', 'hot tub', 'swim', 'deck', 'patio', 'backyard'],
            'garden': ['landscape', 'lawn', 'plant', 'yard'],
            'yard': ['lawn', 'garden', 'landscape', 'backyard'],
            'mower': ['mowing', 'cutting', 'trimmer', 'yard', 'lawn'],
            'equipment': ['tools', 'machinery', 'gear', 'equipment'],
            'maintenance': ['care', 'upkeep', 'service', 'maintenance'],

            // Smart home cluster
            'smart': ['smart home', 'home automation', 'iot', 'connected home', 'tech home'],
            'home': ['smart home', 'house', 'residence', 'domestic'],
            'security': ['smart home', 'camera', 'alarm', 'monitoring'],
            'lighting': ['smart home', 'lights', 'led', 'illumination'],
            'climate': ['smart home', 'thermostat', 'heating', 'cooling'],

            // Wellness cluster
            'wellness': ['health', 'wellbeing', 'recovery', 'therapy', 'spa'],
            'massage': ['wellness', 'therapy', 'relaxation', 'spa'],
            'sauna': ['wellness', 'steam', 'infrared', 'heat'],
            'meditation': ['wellness', 'mindfulness', 'zen', 'calm'],

            // Fitness cluster
            'fitness': ['gym', 'workout', 'exercise', 'training'],
            'strength': ['fitness', 'weight', 'power', 'muscle'],
            'cardio': ['fitness', 'running', 'cycling', 'endurance'],

            // Garage cluster
            'tool': ['garage', 'tools', 'equipment', 'machinery'],
            'automotive': ['garage', 'car', 'vehicle', 'auto'],
            'organization': ['garage', 'storage', 'cabinet', 'rack'],

            // Outdoor/adventure cluster
            'gear': ['outdoor', 'equipment', 'tools', 'apparatus', 'backyard'],
            'survival': ['outdoor', 'tactical', 'emergency', 'prep', 'backyard'],
            'recreation': ['outdoor', 'activity', 'sport', 'leisure', 'backyard'],

            // Marine cluster
            'water': ['marine', 'ocean', 'sea', 'lake'],
            'fishing': ['marine', 'angling', 'tackle'],
            'navigation': ['marine', 'gps', 'compass', 'chart'],

            // Horse riding cluster
            'riding': ['horse riding', 'equestrian', 'horse'],
            'stable': ['horse riding', 'barn', 'arena', 'paddock'],
            'training': ['horse riding', 'dressage', 'jumping', 'competition'],

            // Home & living cluster
            'living': ['home decor', 'interior', 'design', 'decor'],
            'furniture': ['home decor', 'seating', 'table', 'storage'],
            'comfort': ['home decor', 'luxury', 'premium', 'quality'],
            'space': ['home decor', 'room', 'area', 'environment'],

            // Biohacking cluster → wellness
            'biohacking': ['wellness', 'optimization', 'enhancement', 'performance', 'health', 'biohack'],
            'recovery': ['wellness', 'regeneration', 'restoration', 'healing', 'health'],
            'monitoring': ['wellness', 'tracking', 'measurement', 'data', 'health'],
            'enhancement': ['wellness', 'improvement', 'upgrade', 'boost', 'health'],

            // E-vehicle cluster → automotives
            'electric': ['garage', 'automotive', 'ev', 'battery', 'powered', 'vehicle', 'car'],
            'vehicle': ['garage', 'automotive', 'car', 'bike', 'scooter', 'auto', 'transport'],
            'charging': ['garage', 'automotive', 'charger', 'station', 'power', 'ev'],
            'mobility': ['garage', 'automotive', 'transport', 'travel', 'commute', 'vehicle'],

            // Kitchen/appliances cluster
            'appliance': ['kitchen/appliances', 'kitchen', 'equipment', 'machine', 'device', 'appliances'],
            'cooking': ['kitchen/appliances', 'kitchen', 'baking', 'roasting', 'preparation', 'appliances'],
            'professional': ['kitchen/appliances', 'kitchen', 'commercial', 'grade', 'quality', 'appliances']
        };
    }

    // Build a set of niche-related keywords (original + variations)
    buildNicheKeywordSet(niche) {
        const normalized = this.normalizeNiche(niche);
        const vars = this.getNicheVariations(normalized);
        const words = new Set();
        const addWord = (w) => {
            const t = String(w || '').toLowerCase().trim();
            if (t && t.length >= 3) words.add(t);
        };
        addWord(normalized);
        for (const v of vars) addWord(v);
        // Split multi-word variations into tokens
        for (const v of Array.from(words)) {
            v.split(/\s+/).forEach(addWord);
        }
        return words;
    }

    // Heuristic: is a store relevant to the given niche?
    async isRelevantToNiche(store, niche, options = {}) {
        const keywords = this.buildNicheKeywordSet(niche);
        const lower = (v) => String(v || '').toLowerCase();
        const fields = [lower(store && store.name), lower(store && store.domain), lower(store && store.url)];
        const anyHit = (str) => {
            for (const k of keywords) {
                if (str.includes(k)) return true;
            }
            return false;
        };
        // Shallow metadata check only (fast, no network)
        if (fields.some(Boolean) && fields.some(anyHit)) return true;
        // Optional: allow content fetch only if explicitly requested and shallow failed
        if (options.checkContent) {
            try {
                const { html } = await this.fetchHtmlVariants(store, { fastVerify: true });
                if (html && typeof html === 'string') {
                    const text = lower(html);
                    return anyHit(text);
                }
            } catch (_) {}
        }
        return false;
    }

    async searchOnlineCompetitors(niche) {
        if (!this.openai) {
            console.log(`❌ No OpenAI API available for "${niche}" - cannot generate real-time competitors`);
            return [];
        }

        console.log(`🤖 Generating real-time competitors for "${niche}" using AI...`);
        return await this.generateCompetitorsWithAI(niche);
    }

    async generateCompetitorsWithAI(niche) {
        const prompt = `Find 5 real, existing HIGH-TICKET, LUXURY DROPSHIPPING stores in the "${niche}" industry.

CRITICAL: Focus ONLY on dropshipping businesses, NOT traditional retailers or manufacturers.

Dropshipping Store Characteristics:
- They don't manufacture products themselves
- They sell products from suppliers/wholesalers
- Often have broad product catalogs from multiple suppliers
- Typically have longer shipping times (7-30 days)
- Focus on online sales with minimal physical presence
- Often use generic product photos from suppliers

Requirements:
- Must be REAL dropshipping stores that actually exist
- Focus on HIGH-TICKET items ($500+ products; preference for $1,000+)
- Premium/luxury positioning (brands that feel expensive and high value)
- AVOID: Amazon, Walmart, Target, Best Buy, manufacturer websites
- PREFER: Independent e-commerce stores, specialty online retailers
- EXCLUDE OEM/manufacturer DTC stores; include retailers that resell premium brands
- Look for stores with diverse product ranges typical of dropshipping

Examples of dropshipping business models:
- Online stores selling imported goods (electronics, home goods, etc.)
- Specialty retailers with curated product selections
- Direct-to-consumer brands that don't manufacture
- Online boutiques with multiple supplier relationships

Return a JSON array with this format:
[
  {
    "name": "Store Name (luxury/high-ticket)",
    "url": "https://website.com", 
    "domain": "website.com",
    "description": "Brief description focusing on their dropshipping model and high-ticket positioning"
  }
]

Find real dropshipping stores in the ${niche} space that sell high-ticket items.`;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3
            });

            const content = response.choices[0].message.content.trim();
            let jsonStart = content.indexOf('[');
            let jsonEnd = content.lastIndexOf(']') + 1;
            
            if (jsonStart !== -1 && jsonEnd > jsonStart) {
                const jsonStr = content.substring(jsonStart, jsonEnd);
                const competitors = JSON.parse(jsonStr);
                
                // Validate and clean the response, prioritizing dropshipping indicators
                const validCompetitors = competitors
                    .filter(comp => comp.name && comp.url && comp.domain)
                    .map(comp => ({
                        name: comp.name,
                        url: comp.url.startsWith('http') ? comp.url : `https://${comp.url}`,
                        domain: comp.domain.replace('https://', '').replace('http://', '').replace('www.', ''),
                        description: comp.description || '',
                        dropshippingScore: this.calculateDropshippingScore(comp)
                    }))
                    .sort((a, b) => b.dropshippingScore - a.dropshippingScore) // Sort by dropshipping score
                    .slice(0, 5);

                console.log(`✅ Generated ${validCompetitors.length} real competitors for "${niche}"`);
                return validCompetitors;
            } else {
                throw new Error('No valid JSON array found in AI response');
            }
        } catch (error) {
            console.error(`❌ Error generating AI competitors for "${niche}":`, error.message);
            return [];
        }
    }

    // Calculate dropshipping score based on store characteristics
    calculateDropshippingScore(store) {
        let score = 0;
        const name = (store.name || '').toLowerCase();
        const domain = (store.domain || '').toLowerCase();
        const description = (store.description || '').toLowerCase();
        const url = (store.url || '').toLowerCase();
        
        // Positive dropshipping indicators
        const dropshippingKeywords = [
            'warehouse', 'depot', 'outlet', 'direct', 'wholesale', 'supply', 'supplies',
            'gear', 'store', 'shop', 'mart', 'plaza', 'exchange', 'collection',
            'source', 'superstore', 'factory', 'express', 'plus', 'world'
        ];
        
        dropshippingKeywords.forEach(keyword => {
            if (name.includes(keyword)) score += 10;
            if (domain.includes(keyword)) score += 8;
            if (description.includes(keyword)) score += 5;
        });
        
        // Dropshipping business model indicators
        const businessModelKeywords = [
            'dropship', 'supplier', 'import', 'wholesale', 'distributor',
            'catalog', 'selection', 'variety', 'range', 'collection'
        ];
        
        businessModelKeywords.forEach(keyword => {
            if (description.includes(keyword)) score += 15;
            if (name.includes(keyword)) score += 10;
        });
        
        // Negative indicators (traditional retailers/manufacturers)
        const traditionalRetailerKeywords = [
            'corp', 'corporation', 'inc', 'llc', 'company', 'brand',
            'manufacturer', 'factory', 'mill', 'works'
        ];
        
        traditionalRetailerKeywords.forEach(keyword => {
            if (name.includes(keyword)) score -= 5;
            if (domain.includes(keyword)) score -= 3;
        });
        
        // Domain structure indicators (dropshipping stores often have descriptive domains)
        if (domain.includes('-')) score += 5; // Hyphenated domains common in dropshipping
        if (domain.length > 15) score += 3; // Longer descriptive domains
        
        // Generic top-level domains favor dropshipping
        if (domain.endsWith('.com')) score += 2;
        
        return Math.max(0, score);
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Method to verify if a competitor store actually exists (supports fast/thorough)
    async verifyStoreExists(store, options = {}) {
        const tryUrls = [];
        const cleanDomain = (store.domain || '').replace(/^https?:\/\//, '').replace(/^www\./, '');
        const baseUrl = (store.url || '').startsWith('http') ? store.url : `https://${cleanDomain}`;

        // Try different variants (more thorough)
        tryUrls.push(baseUrl);
        tryUrls.push(baseUrl.replace('https://', 'http://'));
        tryUrls.push(`https://www.${cleanDomain}`);
        tryUrls.push(`http://www.${cleanDomain}`);

        const fastVerify = !!options.fastVerify;
        const isUnknownNiche = !!options.unknownNiche; // More lenient for unknown niches
        const headTimeout = isUnknownNiche ? 3000 : (fastVerify ? 1200 : 5000);
        const getTimeout = isUnknownNiche ? 6000 : (fastVerify ? 2500 : 9000);
        const maxRedirects = fastVerify ? 1 : 2;

        for (const url of tryUrls) {
            try {
                // Prefer HEAD but fallback to GET on failure (timeouts configurable)
                const head = await axios.head(url, { timeout: headTimeout, validateStatus: () => true, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DomainVerifier/1.0)' } });
                if (head && head.status >= 200 && head.status < 400) return true;

                const get = await axios.get(url, { timeout: getTimeout, maxRedirects, validateStatus: () => true, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DomainVerifier/1.0)' } });
                if (get && get.status >= 200 && get.status < 400) return true;
            } catch (e) {
                // Continue trying other variants
            }
        }
        // Only log verification failures for known/database stores to reduce noise
        if (!options.silentFail && !options.isAIGenerated) {
            console.log(`Store not reachable: ${store.name} (${cleanDomain})`);
        }
        return false;
    }

    // Fetch HTML for URL variants (first successful, supports fast/thorough)
    async fetchHtmlVariants(store, options = {}) {
        const cleanDomain = (store.domain || '').replace(/^https?:\/\//, '').replace(/^www\./, '');
        const baseUrl = (store.url || '').startsWith('http') ? store.url : `https://${cleanDomain}`;
        const tryUrls = [
            baseUrl,
            baseUrl.replace('https://', 'http://'),
            `https://www.${cleanDomain}`,
            `http://www.${cleanDomain}`
        ];
        const fastVerify = !!options.fastVerify;
        const timeout = fastVerify ? 4000 : 12000;
        const maxRedirects = fastVerify ? 1 : 2;
        for (const url of tryUrls) {
            try {
                const res = await axios.get(url, { timeout, maxRedirects, validateStatus: () => true, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DomainVerifier/1.0)' } });
                if (res && res.status >= 200 && res.status < 400 && typeof res.data === 'string') {
                    return { html: res.data, finalUrl: url };
                }
            } catch (_) {}
        }
        return { html: null, finalUrl: null };
    }

    // Heuristic: does content indicate dropshipping model?
    contentSuggestsDropshipping(html) {
        if (!html) return false;
        const text = html.toLowerCase();
        const positives = [
            'authorized dealer', 'authorized reseller', 'official dealer', 'official reseller',
            'brands we carry', 'brands we stock', 'our brands', 'brand partners', 'dealer program',
            'ships directly from', 'ships from supplier', 'ships from manufacturer', 'direct from supplier',
            'drop ship', 'dropship', 'drop-ship', 'drop shipping', 'dropshipping',
            'lead time', 'built to order', 'made to order', 'factory direct', 'special order',
            'brand warranty', 'manufacturer warranty', 'multiple brands', 'wholesale', 'distributor'
        ];
        return positives.some(p => text.includes(p));
    }

    // Heuristic: does the site feature high-ticket pricing?
    extractMaxPrice(html) {
        if (!html) return 0;
        const priceRegex = /\$\s?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,6})(?:\.[0-9]{2})?/g; // capture dollar amounts
        let match; let max = 0;
        while ((match = priceRegex.exec(html)) !== null) {
            const raw = match[1].replace(/,/g, '');
            const val = parseInt(raw, 10);
            if (!Number.isNaN(val)) max = Math.max(max, val);
        }
        return max;
    }

    // Check both pricing and content to qualify as high-ticket dropshipping (supports fast/thorough)
    async qualifiesAsHighTicketDropshipping(store, options = {}) {
        const { html } = await this.fetchHtmlVariants(store, options);
        if (!html) return false;
        const maxPrice = this.extractMaxPrice(html);
        const hasInstallments = /affirm|klarna|afterpay|shop pay installments|pay over time/i.test(html);
        const highTicket = maxPrice >= 500 || hasInstallments;
        const dropshipHint = this.contentSuggestsDropshipping(html);
        // For trusted known stores, allow high-ticket OR dropship indicators
        if (options.trustedKnown) {
            return highTicket || dropshipHint;
        }
        // Otherwise require BOTH
        return highTicket && dropshipHint;
    }

    // Build a wide candidate list from known stores across niche variations
    buildWideKnownCandidates(normalizedNiche) {
        const variations = this.getNicheVariations(normalizedNiche);
        const added = new Set();
        const result = [];
        const addList = (list = []) => {
            for (const s of list) {
                if (!s || !s.domain) continue;
                const key = (s.domain || '').replace(/^www\./, '').toLowerCase();
                if (this.excludedRetailers && this.excludedRetailers.has(key)) continue;
                if (added.has(key)) continue;
                added.add(key);
                result.push(s);
            }
        };
        if (this.knownStores[normalizedNiche]) addList(this.knownStores[normalizedNiche]);
        for (const v of variations) {
            if (this.knownStores[v]) addList(this.knownStores[v]);
        }
        return result;
    }

    // Public: get wide known stores for niche and its variations (unique)
    getKnownStoresWide(niche) {
        const canonical = this.mapToClosestKnownNiche(niche);
        return this.buildWideKnownCandidates(canonical);
    }

    // Public: get known stores for EXACT normalized niche key only (no fuzzy mapping)
    getKnownStoresExact(niche) {
        const n = this.normalizeNiche(niche);
        const list = this.knownStores && this.knownStores[n] ? this.knownStores[n] : [];
        console.log(`🔍 getKnownStoresExact("${niche}") → normalized: "${n}" → found ${list.length} stores`);
        return Array.isArray(list) ? [...list] : [];
    }

    // Safe, deterministic routing of user input to a canonical niche we have stores for.
    // Only maps when we have an explicit synonym/alias, otherwise returns the input.
    async mapToCanonicalNicheSafe(niche) {
        const input = this.normalizeNiche(niche);
        if (!input) return input;

        // 1) Exact known
        if (this.knownStores && this.knownStores[input]) return input;

        // 2) Curated alias map (STRICT; no fuzzy contains)
        const aliasToCanonical = {
            'fire pit': 'backyard',
            'firepit': 'backyard',
            'fire pits': 'backyard',
            'bbq': 'backyard',
            'grill': 'backyard',
            'grilling': 'backyard',
            'outdoor kitchen': 'backyard',
            'garden': 'backyard',
            'patio': 'backyard',

            'home theater': 'man cave',
            'home theatre': 'man cave',
            'mancave': 'man cave',
            'man cave': 'man cave',

            'saunas': 'sauna',
            'sauna': 'sauna',

            'pizza ovens': 'pizza oven',
            'pizza oven': 'pizza oven',

            'exercise equipment': 'exercise equipment',
            'home gym': 'fitness',
            'strength': 'fitness',
            'muscle': 'fitness',
            'cardio': 'fitness',

            'hvac': 'hvac',
            'air conditioner': 'hvac',
            'air conditioning': 'hvac',

            'drones': 'drones',
            'drone': 'drones',

            'generators': 'generators',
            'generator': 'generators',

            'horse riding': 'horse riding',
            'equestrian': 'horse riding',

            'safes': 'safes',
            'safe': 'safes',

            'solar': 'solar',

            'wellness': 'wellness',
            'health': 'wellness',
            'recovery': 'wellness',
            'therapy': 'wellness',
            'massage': 'wellness',
            'meditation': 'wellness',
            'zen': 'wellness',
            'mindfulness': 'wellness',
            'calm': 'wellness',

            'kitchen': 'kitchen',
        };

        const canonical = aliasToCanonical[input] || null;
        if (canonical && this.knownStores && this.knownStores[canonical]) return canonical;

        // 2b) Priority synonyms/niches (lines 374-390) → canonical niche
        try {
            const priority = this.getPrioritySynonymsMap();
            const lower = input.toLowerCase();
            
            // Check if the search keyword matches any synonym in the arrays
            for (const [niche, synonyms] of Object.entries(priority)) {
                // Check if keyword matches the niche name itself
                if (niche.toLowerCase() === lower) {
                    return niche;
                }
                
                // Check if keyword matches any synonym in the array
                if (Array.isArray(synonyms)) {
                    for (const synonym of synonyms) {
                        if (String(synonym || '').toLowerCase().trim() === lower) {
                            return niche; // Return the canonical niche
                        }
                    }
                }
            }
        } catch (_) {}

        // 2c) Enhanced keyword-based mapping using domain databases
        try {
            const keywordMapped = this.mapNicheUsingDatabaseKeywords(input);
            if (keywordMapped && this.knownStores && this.knownStores[keywordMapped]) {
                return keywordMapped;
            }
        } catch (_) {}
        
        // 2d) AI-powered niche mapping analyzer (fallback)
        try {
            console.log(`🤖 Trying AI niche mapping for: "${input}"`);
            const aiMapped = await this.aiAnalyzeNicheMapping(input);
            if (aiMapped && this.knownStores && this.knownStores[aiMapped]) {
                console.log(`✅ AI mapped "${input}" → "${aiMapped}"`);
                return aiMapped;
            } else if (aiMapped) {
                console.log(`❌ AI mapped "${input}" → "${aiMapped}" but no stores found for that niche`);
            } else {
                console.log(`❌ AI mapping failed for "${input}"`);
            }
        } catch (error) {
            console.log(`❌ AI mapping error for "${input}":`, error.message);
        }

        // 3) Use DOMAIN_DATABASES.popularNiches synonyms, but require exact token/phrase match and known stores
        try {
            const popular = DOMAIN_DATABASES && DOMAIN_DATABASES.popularNiches ? DOMAIN_DATABASES.popularNiches : {};
            const lower = input.toLowerCase();
            for (const key of Object.keys(popular)) {
                if (!this.knownStores || !this.knownStores[key]) continue;
                const syns = Array.isArray(popular[key].synonyms) ? popular[key].synonyms : [];
                const phrases = new Set([key, ...syns].map(s => String(s || '').toLowerCase().trim()));
                if (phrases.has(lower)) return key;
            }
        } catch (_) {}

        // 4) Token voting based on broad cluster terms → canonical niches we actually support
        try {
            const tokenToCanonical = {
                // Backyard cluster
                'backyard': 'backyard', 'yard': 'backyard', 'garden': 'backyard', 'patio': 'backyard', 'deck': 'backyard', 'landscape': 'backyard',
                'bbq': 'backyard', 'barbecue': 'backyard', 'grill': 'backyard', 'smoker': 'backyard', 'fire': 'backyard', 'pool': 'backyard', 'landscaping': 'backyard',
                // Fitness cluster
                'fitness': 'fitness', 'gym': 'fitness', 'workout': 'fitness', 'exercise': 'fitness', 'training': 'fitness', 'strength': 'fitness', 'muscle': 'fitness', 'cardio': 'fitness', 'bodybuilding': 'fitness',
                // Wellness cluster
                'wellness': 'wellness', 'health': 'wellness', 'recovery': 'wellness', 'therapy': 'wellness', 'massage': 'wellness', 'meditation': 'wellness', 'zen': 'wellness', 'mindfulness': 'wellness', 'calm': 'wellness', 'sauna': 'sauna',
                // Smart home
                'smart': 'smart home', 'home': 'smart home', 'security': 'smart home', 'lighting': 'smart home', 'climate': 'smart home', 'thermostat': 'smart home', 'iot': 'smart home', 'electronics': 'smart home', 'gadgets': 'smart home', 'audio': 'smart home', 'video': 'smart home',
                // Man cave / home theater
                'theater': 'man cave', 'theatre': 'man cave', 'projector': 'man cave', 'seating': 'man cave',
                // Kitchen
                'kitchen': 'kitchen', 'appliance': 'kitchen', 'cooking': 'kitchen', 'chef': 'kitchen',
                // Marine
                'marine': 'marine', 'boat': 'marine', 'nautical': 'marine', 'sailing': 'marine', 'yacht': 'marine', 'water': 'marine', 'ocean': 'marine', 'sea': 'marine', 'lake': 'marine', 'fishing': 'marine', 'angling': 'marine', 'tackle': 'marine', 'navigation': 'marine', 'gps': 'marine', 'compass': 'marine', 'chart': 'marine',
                // Drones
                'drone': 'drones', 'drones': 'drones', 'uav': 'drones', 'quadcopter': 'drones', 'fpv': 'drones',
                // Safes
                'safe': 'safes', 'safes': 'safes', 'vault': 'safes',
                // Power
                'solar': 'solar', 'generator': 'generators', 'generators': 'generators',
                // HVAC
                'hvac': 'hvac', 'heating': 'hvac', 'cooling': 'hvac', 'air': 'hvac',
                // Outdoor/adventure
                'outdoor': 'outdoor', 'gear': 'outdoor', 'survival': 'outdoor', 'recreation': 'outdoor',
                // Equestrian
                'equestrian': 'horse riding', 'equine': 'horse riding', 'horse': 'horse riding', 'riding': 'horse riding', 'stable': 'horse riding', 'training': 'horse riding',
                // Home & living → route to backyard as a general home/outdoor category
                'living': 'backyard', 'furniture': 'backyard', 'comfort': 'backyard', 'space': 'backyard',
                // Biohacking → wellness
                'biohacking': 'wellness', 'recovery': 'wellness', 'monitoring': 'wellness', 'enhancement': 'wellness',
                // Garage organization
                'organization': 'garage', 'storage': 'garage',
                // Golf
                'golf': 'golf'
            };

            const tokens = String(input).split(/[^a-z0-9]+/i).map(t => t.trim().toLowerCase()).filter(Boolean);
            const scores = {};
            for (const t of tokens) {
                const canon = tokenToCanonical[t];
                if (!canon) continue;
                if (!this.knownStores || !this.knownStores[canon]) continue;
                scores[canon] = (scores[canon] || 0) + 1;
            }
            let best = null; let bestScore = 0;
            for (const [canon, score] of Object.entries(scores)) {
                if (score > bestScore) { bestScore = score; best = canon; }
            }
            if (best) return best;
        } catch (_) {}

        // 5) Default: do not remap to avoid unrelated categories
        return input;
    }

    // Priority synonyms map (exact phrases) — corresponds to lines 374–390
    getPrioritySynonymsMap() {
        return {
            'backyard': ['patio', 'garden', 'yard', 'lawn', 'deck', 'landscape'],
            'pizza oven': ['outdoor oven', 'wood fired oven', 'pizza', 'oven', 'outdoor cooking', 'backyard cooking'],
            'drone': ['uav', 'quadcopter', 'aerial', 'drone photography', 'fpv', 'rc drone', 'quad', 'quads', 'multirotor'],
            'kitchen': ['culinary', 'cooking', 'chef', 'cookware', 'kitchen equipment', 'appliances'],
            'golf': ['golfing', 'golf equipment', 'golf gear', 'golf clubs', 'golf accessories'],
            'fitness': ['gym', 'workout', 'exercise', 'training', 'bodybuilding', 'strength'],
            'marine': ['boat', 'nautical', 'sailing', 'maritime'],
            'horse riding': ['equestrian', 'equine', 'horse', 'riding', 'horses'],
            'horse': ['horse riding', 'equestrian', 'equine'],
            'horses': ['horse riding', 'equestrian', 'equine'],
            'wellness': ['health', 'fitness', 'nutrition'],
            'smart home': ['home automation', 'iot', 'connected home'],
            'outdoor': ['adventure', 'camping', 'hiking'],
            'garage': ['automotive', 'workshop', 'storage'],
            'barbecue': ['grilling', 'bbq', 'outdoor cooking'],
            'man cave': ['mancave', 'den', 'entertainment', 'game room', 'home theater', 'basement'],
            'mancave': ['man cave', 'den', 'entertainment', 'game room', 'home theater', 'basement']
        };
    }

    // Public: get all known stores across all niches (unique)
    getKnownStoresGlobal() {
        const unique = new Map();
        for (const key of Object.keys(this.knownStores)) {
            for (const s of (this.knownStores[key] || [])) {
                if (!s || !s.domain) continue;
                const k = (s.domain || '').replace(/^www\./, '').toLowerCase();
                if (this.excludedRetailers && this.excludedRetailers.has(k)) continue;
                if (!unique.has(k)) unique.set(k, s);
            }
        }
        return Array.from(unique.values());
    }

    // Last-resort: find at least one plausible competitor by scoring global known stores
    async getOneFallbackCompetitor(niche) {
        try {
            const keywords = Array.from(this.buildNicheKeywordSet(niche) || []);
            const lower = (v) => String(v || '').toLowerCase();
            const scoreFor = (store) => {
                const fields = [lower(store && store.name), lower(store && store.domain), lower(store && store.url)];
                let score = 0;
                for (const k of keywords) {
                    for (const f of fields) {
                        if (f && f.includes(k)) score += 2;
                    }
                }
                return score;
            };
            const candidates = this.getKnownStoresGlobal()
                .map(s => ({ s, score: scoreFor(s) }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 20)
                .map(x => x.s)
                .filter(c => this.isRelevantToNiche(c, niche, { checkContent: false }));

            // Pass 1: require relevance + high-ticket/dropship
            for (const c of candidates) {
                try {
                    const exists = await this.verifyStoreExists(c, { fastVerify: true, silentFail: options.silentFail });
                    if (!exists) continue;
                    const qualifies = await this.qualifiesAsHighTicketDropshipping(c, { fastVerify: true, trustedKnown: true });
                    if (!qualifies) continue;
                    const relevant = await this.isRelevantToNiche(c, niche, { checkContent: false });
                    if (!relevant) continue;
                    return c;
                } catch (_) {}
            }

            // Pass 2: drop relevance requirement, keep high-ticket/dropship
            for (const c of candidates) {
                try {
                    const exists = await this.verifyStoreExists(c, { fastVerify: true, silentFail: options.silentFail });
                    if (!exists) continue;
                    const qualifies = await this.qualifiesAsHighTicketDropshipping(c, { fastVerify: true, trustedKnown: true });
                    if (!qualifies) continue;
                    return c;
                } catch (_) {}
            }

            // Pass 3: return first reachable store (quality last resort)
            for (const c of candidates) {
                try {
                    const exists = await this.verifyStoreExists(c, { fastVerify: true, silentFail: options.silentFail });
                    if (exists) return c;
                } catch (_) {}
            }
        } catch (_) {}
        return null;
    }

    // Method to get verified competitors. Supports options:
    // - fast: boolean (skip verification)
    // - deadlineAt: timestamp ms (stop searching when time exceeded, return what we have)
    // - maxAttempts: number (cap AI attempts)
    async getVerifiedCompetitors(niche, options = {}) {
        const fast = !!options.fast;
        const verified = [];
        const seenDomains = new Set();
        const normalized = this.normalizeNiche(niche);
        const deadlineAt = typeof options.deadlineAt === 'number' ? options.deadlineAt : null;
        const isTimedOut = () => (deadlineAt && Date.now() >= deadlineAt);

        if (fast) {
            // Build a quick candidate list from exact/variation known stores
            const candidates = [];
            const pushUnique = (s) => {
                if (!s || !s.domain) return;
                const key = (s.domain || '').replace(/^www\./, '').toLowerCase();
                if (seenDomains.has(key)) return;
                seenDomains.add(key);
                candidates.push(s);
            };
            if (this.knownStores[normalized]) (this.knownStores[normalized] || []).forEach(pushUnique);
            const variations = this.getNicheVariations(normalized);
            for (const v of variations) {
                if (candidates.length >= 8) break; // cap
                if (this.knownStores[v]) (this.knownStores[v] || []).forEach(pushUnique);
            }

            // Supplement with a single quick AI pass
            try {
                const ai = await this.searchOnlineCompetitors(niche);
                for (const comp of ai) {
                    if (candidates.length >= 16) break;
                    pushUnique(comp);
                }
                // Also try a few niche variations in parallel within the time budget
                const varSlice = variations.slice(0, 4);
                const varResults = await Promise.all(varSlice.map(v => this.searchOnlineCompetitors(v)));
                for (const list of varResults) {
                    for (const comp of (list || [])) {
                        if (candidates.length >= 20) break;
                        pushUnique(comp);
                    }
                }
            } catch (_) {}

            // Fast verification: require site reachable AND dropship/high-ticket hints if possible
            const verifiedFast = [];
            const deadlineAtFast = typeof options.deadlineAt === 'number' ? options.deadlineAt : (Date.now() + 60000);
            const isTimedOutFast = () => Date.now() >= deadlineAtFast;
            const batchSizeFast = 6;
            for (let i = 0; i < candidates.length && !isTimedOutFast() && verifiedFast.length < 5; i += batchSizeFast) {
                const batch = candidates.slice(i, i + batchSizeFast);
                await Promise.all(batch.map(async (c) => {
                    if (verifiedFast.length >= 5 || isTimedOutFast()) return;
                    try {
                        const exists = await this.verifyStoreExists(c, { fastVerify: true, silentFail: options.silentFail });
                        if (!exists) return;
                        const qualifies = await this.qualifiesAsHighTicketDropshipping(c, { fastVerify: true, trustedKnown: true });
                        if (!qualifies) return;
                        // Enforce shallow relevance to the input niche
                        const relevant = await this.isRelevantToNiche(c, normalized, { checkContent: false });
                        if (!relevant) return;
                        verifiedFast.push(c);
                    } catch (_) {}
                }));
            }
            return verifiedFast.slice(0, 5);
        }

        const tryAdd = async (list = []) => {
            const candidates = [];
            for (const competitor of list) {
                if (!competitor || !competitor.domain) continue;
                const domainKey = competitor.domain.replace(/^www\./, '').toLowerCase();
                if (seenDomains.has(domainKey)) continue;
                candidates.push({ competitor, domainKey });
            }

            // Verify in parallel batches for speed (higher concurrency to meet deadline)
            const batchSize = 8;
            for (let i = 0; i < candidates.length; i += batchSize) {
                if (isTimedOut()) return verified.length >= 5; // time limit reached
                const batch = candidates.slice(i, i + batchSize);
                await Promise.all(batch.map(async ({ competitor, domainKey }) => {
                    if (verified.length >= 5) return;
                    if (isTimedOut()) return;
                    try {
                        const exists = await this.verifyStoreExists(competitor);
                        if (!exists) return;
                        const qualifies = await this.qualifiesAsHighTicketDropshipping(competitor);
                        if (qualifies) {
                            // Enforce niche relevance (shallow only for speed)
                            const relevant = await this.isRelevantToNiche(competitor, normalized, { checkContent: false });
                            if (!relevant) return;
                            verified.push(competitor);
                            seenDomains.add(domainKey);
                        }
                    } catch (_) {}
                }));
                if (verified.length >= 5) return true;
                if (isTimedOut()) return verified.length >= 1;
            }
            return verified.length >= 5;
        };

        // 1) Try wide known candidates first (parallel verification)
        const wideCandidates = this.buildWideKnownCandidates(normalized);
        if (await tryAdd(wideCandidates) || isTimedOut()) return verified.slice(0, 5);

        // 1b) Then try primary results from findCompetitors
        const initial = await this.findCompetitors(niche);
        if (await tryAdd(initial) || isTimedOut()) return verified.slice(0, 5);

        // 2) Supplement with AI for the same niche
        if (isTimedOut()) return verified.slice(0, 5);
        const ai = await this.searchOnlineCompetitors(niche);
        if (await tryAdd(ai) || isTimedOut()) return verified.slice(0, 5);

        // 3) Try niche variations with AI in parallel waves to beat the deadline
        const variations = this.getNicheVariations(normalized);
        const waveSize = 4;
        for (let i = 0; i < variations.length && !isTimedOut() && verified.length < 5; i += waveSize) {
            const wave = variations.slice(i, i + waveSize);
            const results = await Promise.all(wave.map(v => this.searchOnlineCompetitors(v)));
            for (const more of results) {
                if (await tryAdd(more) || isTimedOut()) break;
            }
        }

        // 4) Keep searching with repeated AI calls until we reach 5 or hit max attempts
        let extraAttempts = 0;
        const maxStrictAttempts = (options && options.maxAttempts) ? options.maxAttempts : 8;
        while (verified.length < 5 && extraAttempts < maxStrictAttempts && !isTimedOut()) {
            extraAttempts++;
            const moreMain = this.searchOnlineCompetitors(niche);
            const moreVars = Promise.all(variations.slice(0, 6).map(v => this.searchOnlineCompetitors(v)));
            const [mainRes, varsRes] = await Promise.all([moreMain, moreVars]);
            await tryAdd(mainRes);
            for (const list of varsRes) {
                if (verified.length >= 5 || isTimedOut()) break;
                await tryAdd(list);
            }
        }

        // 5) Last-chance fill before deadline using fast verification on global known stores
        if (verified.length < 5 && !isTimedOut()) {
            const candidates = this.getKnownStoresGlobal().filter(s => {
                const k = (s.domain || '').replace(/^www\./, '').toLowerCase();
                return !seenDomains.has(k);
            });
            const batchSize = 12;
            for (let i = 0; i < candidates.length && !isTimedOut() && verified.length < 5; i += batchSize) {
                const batch = candidates.slice(i, i + batchSize);
                await Promise.all(batch.map(async (c) => {
                    if (verified.length >= 5 || isTimedOut()) return;
                    const domainKey = (c.domain || '').replace(/^www\./, '').toLowerCase();
                    try {
                        const exists = await this.verifyStoreExists(c, { fastVerify: true, silentFail: options.silentFail });
                        if (!exists) return;
                        const qualifies = await this.qualifiesAsHighTicketDropshipping(c, { fastVerify: true, trustedKnown: true });
                        if (qualifies) {
                            // Enforce niche relevance when using global fallback (shallow only)
                            const relevant = await this.isRelevantToNiche(c, normalized, { checkContent: false });
                            if (!relevant) return;
                            verified.push(c);
                            seenDomains.add(domainKey);
                        }
                    } catch (_) {}
                }));
            }
        }

        return verified.slice(0, 5);
    }

    // Dynamic keyword mapping using ALL data from domain-databases.js
    mapNicheUsingDatabaseKeywords(searchTerm) {
        const lower = searchTerm.toLowerCase();
        const availableNiches = Object.keys(this.knownStores || {});
        
        // Build dynamic keyword-to-niche mapping from domain-databases.js
        const keywordToNicheMap = this.buildKeywordToNicheMapping();
        
        console.log(`📊 Built ${Object.keys(keywordToNicheMap).length} keyword mappings from domain-databases.js for "${searchTerm}"`);
        
        // Find matching keywords
        const matches = [];
        for (const [keyword, targetNiche] of Object.entries(keywordToNicheMap)) {
            // Only consider niches we actually have stores for
            if (!availableNiches.includes(targetNiche)) continue;
            
            if (keyword.toLowerCase().includes(lower) || lower.includes(keyword.toLowerCase())) {
                const score = keyword.toLowerCase() === lower ? 20 : 10;
                matches.push({ keyword, targetNiche, score });
                console.log(`🔗 Database keyword match: "${lower}" matches "${keyword}" → "${targetNiche}" (score: ${score})`);
            }
        }
        
        if (matches.length > 0) {
            // Sort by score (exact matches first, then by target niche)
            matches.sort((a, b) => b.score - a.score || a.targetNiche.localeCompare(b.targetNiche));
            const bestMatch = matches[0];
            console.log(`🎯 Database mapping result: "${searchTerm}" → "${bestMatch.targetNiche}" (score: ${bestMatch.score})`);
            return bestMatch.targetNiche;
        }
        
        console.log(`❌ No database keyword matches found for "${searchTerm}"`);
        return null;
    }
    
    // Build comprehensive keyword-to-niche mapping from domain-databases.js
    buildKeywordToNicheMapping() {
        const mapping = {};
        
        // Mapping from domain-databases categories to our known niches
        const categoryToKnownNiche = {
            // Direct matches
            'backyard': 'backyard',
            'wellness': 'wellness', 
            'fitness': 'fitness',
            'kitchen': 'kitchen',
            'marine': 'marine',
            'horse riding': 'horse riding',
            'smart home': 'smart home',
            'golf': 'golf',
            'drone': 'drones',
            'pizza oven': 'pizza oven',
            'sauna': 'sauna',
            
            // Sub-categories that map to parent niches
            'bbq': 'backyard',
            'fire': 'backyard', 
            'pool': 'backyard',
            'garden': 'backyard',
            'yard': 'backyard',
            'mower': 'backyard',
            'equipment': 'backyard',
            'maintenance': 'backyard',
            
            'security': 'smart home',
            'lighting': 'smart home', 
            'climate': 'smart home',
            'home': 'smart home',
            'smart': 'smart home',
            
            'massage': 'wellness',
            'meditation': 'wellness',
            'recovery': 'wellness',
            
            'strength': 'fitness',
            'cardio': 'fitness',
            
            'appliance': 'kitchen',
            'cooking': 'kitchen',
            'professional': 'kitchen',
            
            'water': 'marine',
            'fishing': 'marine',
            'navigation': 'marine',
            
            'horse': 'horse riding',
            'riding': 'horse riding',
            'stable': 'horse riding',
            'training': 'horse riding',
            
            'garage': 'backyard', // Map garage to backyard since we don't have garage niche
            'tool': 'backyard',
            'automotive': 'backyard',
            'organization': 'backyard',
            
            'outdoor': 'backyard', // Map outdoor to backyard
            'gear': 'backyard',
            'survival': 'backyard',
            'recreation': 'backyard',
            
            'man cave': 'man cave',
            
            'living': 'man cave', // Map home living to man cave
            'furniture': 'man cave',
            'comfort': 'man cave', 
            'space': 'man cave',
            
            'biohacking': 'wellness', // Map biohacking to wellness
            'monitoring': 'wellness',
            'enhancement': 'wellness',
            
            'electric': 'backyard', // Map e-vehicle to backyard (closest match)
            'vehicle': 'backyard',
            'charging': 'backyard',
            'mobility': 'backyard'
        };
        
        // Process all database structures
        const databases = {
            strictNicheKeywords: DOMAIN_DATABASES.strictNicheKeywords || {},
            nicheTerms: DOMAIN_DATABASES.nicheTerms || {},
            nicheVariations: DOMAIN_DATABASES.nicheVariations || {},
            popularNiches: DOMAIN_DATABASES.popularNiches || {}
        };
        
        // Extract keywords from each database
        for (const [dbName, db] of Object.entries(databases)) {
            for (const [category, data] of Object.entries(db)) {
                const targetNiche = categoryToKnownNiche[category];
                if (!targetNiche) continue; // Skip categories we can't map
                
                // Handle different data structures
                let keywords = [];
                if (Array.isArray(data)) {
                    keywords = data;
                } else if (data && data.synonyms && Array.isArray(data.synonyms)) {
                    keywords = data.synonyms;
                    // Also add the category name itself
                    keywords.push(category);
                } else if (typeof data === 'object' && data !== null) {
                    // Handle other object structures
                    keywords = Object.values(data).flat().filter(k => typeof k === 'string');
                }
                
                // Add all keywords to mapping
                keywords.forEach(keyword => {
                    if (typeof keyword === 'string' && keyword.trim()) {
                        mapping[keyword.toLowerCase().trim()] = targetNiche;
                    }
                });
                
                // Also add the category name itself
                mapping[category.toLowerCase()] = targetNiche;
            }
        }
        
        // Add some manual high-priority mappings that might be missed
        const manualMappings = {
            'bait': 'marine',
            'tackle': 'marine', 
            'rod': 'marine',
            'thermostat': 'smart home',
            'zen': 'wellness',
            'muscle': 'fitness',
            'projector': 'man cave',
            'seating': 'man cave',
            'theater': 'man cave',
            'theatre': 'man cave',
            'generator': 'generators',
            'generators': 'generators',
            'safe': 'safes',
            'safes': 'safes',
            'solar': 'solar',
            'hvac': 'hvac',
            'heating': 'hvac',
            'cooling': 'hvac',
            'fireplace': 'fireplace'
        };
        
        Object.assign(mapping, manualMappings);
        
        return mapping;
    }
    
    
    // AI-powered niche mapping analyzer (fallback when keyword mapping fails)
    async aiAnalyzeNicheMapping(searchTerm) {
        if (!this.openai) return null;
        
        try {
            const availableNiches = Object.keys(this.knownStores || {});
            console.log(`📊 Available niches for AI mapping:`, availableNiches.join(', '));
            if (availableNiches.length === 0) return null;

            // Build enhanced context from domain databases
            const contextExamples = [];
            for (const niche of availableNiches.slice(0, 8)) {
                const keywords = DOMAIN_DATABASES.strictNicheKeywords?.[niche] || 
                               DOMAIN_DATABASES.nicheTerms?.[niche] || 
                               DOMAIN_DATABASES.nicheVariations?.[niche] || [];
                if (keywords.length > 0) {
                    contextExamples.push(`- ${niche}: ${keywords.slice(0, 4).join(', ')}`);
                }
            }
            
            const prompt = `You are a niche mapping expert. Given a search term, determine which of the available niches it best matches.

Search term: "${searchTerm}"

Available niches: ${availableNiches.join(', ')}

Niche keywords context:
${contextExamples.join('\n')}

Rules:
1. Return ONLY the exact niche name from the available list
2. Consider semantic meaning and related keywords
3. Think about what products/services the search term relates to
4. If no good match exists, return "none"

Examples:
- "lawn mower" → "backyard" (lawn care is backyard-related)
- "projector" → "man cave" (home theater equipment)
- "cookware" → "kitchen" (cooking equipment)
- "thermostat" → "smart home" (home automation device)
- "massage chair" → "wellness" (health and recovery related)
- "boat anchor" → "marine" (boating equipment)

Niche:`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 50,
                temperature: 0.1
            });

            const result = response.choices[0]?.message?.content?.trim();
            console.log(`🤖 AI response for "${searchTerm}":`, result);
            
            // Validate that the result is actually one of our available niches
            if (result && result !== "none" && availableNiches.includes(result)) {
                console.log(`✅ AI mapped "${searchTerm}" → "${result}"`);
                return result;
            } else if (result && result !== "none") {
                console.log(`❌ AI returned "${result}" but it's not in available niches:`, availableNiches.join(', '));
            }
            
            return null;
        } catch (error) {
            console.log('AI niche mapping failed:', error.message);
            return null;
        }
    }

    // Dynamic Niche Caching System
    // Save successful unknown niche results to build knowledge base over time
    async saveDynamicNiche(originalNiche, canonicalNiche, competitors, metadata = {}) {
        if (!Array.isArray(competitors) || competitors.length === 0) return false;
        
        try {
            const sqlite3 = require('sqlite3').verbose();
            const db = new sqlite3.Database('./domains.db');
            
            // Create table if it doesn't exist
            await new Promise((resolve, reject) => {
                db.run(`CREATE TABLE IF NOT EXISTS dynamic_niches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    original_niche TEXT NOT NULL,
                    canonical_niche TEXT,
                    competitors TEXT NOT NULL,
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
                    use_count INTEGER DEFAULT 1,
                    success_rate REAL DEFAULT 1.0
                )`, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            // Save the niche data
            const competitorsJson = JSON.stringify(competitors);
            const metadataJson = JSON.stringify(metadata);
            
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT OR REPLACE INTO dynamic_niches 
                     (original_niche, canonical_niche, competitors, metadata, last_used) 
                     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [originalNiche.toLowerCase(), canonicalNiche, competitorsJson, metadataJson],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            
            db.close();
            console.log(`💾 Cached niche: "${originalNiche}" → "${canonicalNiche}" with ${competitors.length} competitors`);
            return true;
            
        } catch (error) {
            console.log('Failed to save dynamic niche:', error.message);
            return false;
        }
    }
    
    // Retrieve cached niche results
    async getCachedNiche(niche) {
        try {
            const sqlite3 = require('sqlite3').verbose();
            const db = new sqlite3.Database('./domains.db');
            
            const result = await new Promise((resolve, reject) => {
                db.get(
                    `SELECT * FROM dynamic_niches 
                     WHERE original_niche = ? 
                     ORDER BY last_used DESC LIMIT 1`,
                    [niche.toLowerCase()],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            
            if (result) {
                // Update usage stats
                await new Promise((resolve, reject) => {
                    db.run(
                        `UPDATE dynamic_niches 
                         SET last_used = CURRENT_TIMESTAMP, use_count = use_count + 1 
                         WHERE id = ?`,
                        [result.id],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
                
                db.close();
                
                const competitors = JSON.parse(result.competitors || '[]');
                const metadata = JSON.parse(result.metadata || '{}');
                
                console.log(`📋 Retrieved cached niche: "${niche}" (used ${result.use_count} times)`);
                return {
                    originalNiche: result.original_niche,
                    canonicalNiche: result.canonical_niche,
                    competitors,
                    metadata,
                    lastUsed: result.last_used,
                    useCount: result.use_count
                };
            }
            
            db.close();
            return null;
            
        } catch (error) {
            console.log('Failed to get cached niche:', error.message);
            return null;
        }
    }
    
    // Get all cached niches for admin/debugging
    async getAllCachedNiches() {
        try {
            const sqlite3 = require('sqlite3').verbose();
            const db = new sqlite3.Database('./domains.db');
            
            const results = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT original_niche, canonical_niche, use_count, last_used 
                     FROM dynamic_niches 
                     ORDER BY use_count DESC, last_used DESC`,
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    }
                );
            });
            
            db.close();
            return results || [];
            
        } catch (error) {
            console.log('Failed to get all cached niches:', error.message);
            return [];
        }
    }
    
    // Enhanced competitor search with caching
    async getVerifiedCompetitorsWithCache(niche, options = {}) {
        const normalizedNiche = this.normalizeNiche(niche);
        
        // 1. Check cache first
        const cached = await this.getCachedNiche(normalizedNiche);
        if (cached && cached.competitors.length > 0) {
            // Quick verify cached competitors are still live
            const verified = [];
            for (const competitor of cached.competitors.slice(0, 5)) {
                try {
                    const exists = await this.verifyStoreExists(competitor, { fastVerify: true, silentFail: true });
                    if (exists) {
                        verified.push({ ...competitor, source: 'cached' });
                    }
                } catch (_) {}
            }
            
            if (verified.length > 0) {
                console.log(`✅ Using ${verified.length} cached competitors for "${niche}"`);
                return verified;
            }
        }
        
        // 2. If no cache or cached results are stale, search fresh
        console.log(`🔍 Fresh search for "${niche}" (no valid cache)`);
        const freshResults = await this.getVerifiedCompetitors(niche, { ...options, silentFail: true });
        
        // 3. Cache successful results for future use
        if (freshResults && freshResults.length > 0) {
            const metadata = {
                searchTime: new Date().toISOString(),
                resultCount: freshResults.length,
                searchOptions: options
            };
            await this.saveDynamicNiche(normalizedNiche, normalizedNiche, freshResults, metadata);
        }
        
        return freshResults || [];
    }
}

module.exports = CompetitorFinder;
