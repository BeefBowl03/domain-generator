const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');

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
            'hometheater': 'home theater',
            'pizzaoven': 'pizza oven',
            'exerciseequipment': 'exercise equipment',
            'smarthome': 'smart home',
            'homegym': 'fitness'
        };
        return aliases[n.replace(/\s+/g, '')] || n;
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
        
        // Add common related terms
        const relatedTerms = {
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
            // Map common synonyms so non-DB niches find neighbors
            'electronics': ['gadgets', 'tech', 'consumer electronics', 'smart devices', 'home electronics', 'audio video'],
            'gadgets': ['electronics', 'tech gadgets', 'consumer electronics', 'smart devices'],
            // Landscape synonyms should route to backyard ecosystems
            'landscape': ['backyard', 'garden', 'yard', 'lawn', 'patio', 'deck', 'landscaping'],
            'landscaping': ['backyard', 'garden', 'yard', 'lawn', 'patio', 'deck', 'landscape'],

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
            'gear': ['outdoor', 'equipment', 'tools', 'apparatus'],
            'survival': ['outdoor', 'tactical', 'emergency', 'prep'],
            'recreation': ['outdoor', 'activity', 'sport', 'leisure'],

            // Marine cluster
            'water': ['marine', 'ocean', 'sea', 'lake'],
            'fishing': ['marine', 'angling', 'tackle'],
            'navigation': ['marine', 'gps', 'compass', 'chart'],

            // Horse riding cluster
            'riding': ['horse riding', 'equestrian', 'horse'],
            'stable': ['horse riding', 'barn', 'arena', 'paddock'],
            'training': ['horse riding', 'dressage', 'jumping', 'competition'],

            // Home & living cluster (map to backyard/outdoor or kitchen where useful)
            'living': ['home decor', 'interior', 'design', 'decor'],
            'furniture': ['home decor', 'seating', 'table', 'storage'],
            'comfort': ['home decor', 'luxury', 'premium', 'quality'],
            'space': ['home decor', 'room', 'area', 'environment'],

            // Biohacking cluster → wellness
            'biohacking': ['wellness', 'optimization', 'enhancement', 'performance'],
            'recovery': ['wellness', 'regeneration', 'restoration', 'healing'],
            'monitoring': ['wellness', 'tracking', 'measurement', 'data'],
            'enhancement': ['wellness', 'improvement', 'upgrade', 'boost'],

            // E-vehicle cluster → garage/automotive
            'electric': ['garage', 'ev', 'battery', 'powered'],
            'vehicle': ['garage', 'car', 'bike', 'scooter'],
            'charging': ['garage', 'charger', 'station', 'power'],
            'mobility': ['garage', 'transport', 'travel', 'commute'],

            // Kitchen/appliances cluster
            'appliance': ['kitchen', 'equipment', 'machine', 'device'],
            'cooking': ['kitchen', 'baking', 'roasting', 'preparation'],
            'professional': ['kitchen', 'commercial', 'grade', 'quality']
        };

        if (relatedTerms[niche]) {
            relatedTerms[niche].forEach(term => variations.add(term));
        }

        return Array.from(variations);
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
        const headTimeout = fastVerify ? 1200 : 5000;
        const getTimeout = fastVerify ? 2500 : 9000;
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
        console.log(`Store not reachable: ${store.name} (${cleanDomain})`);
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
        const normalized = this.normalizeNiche(niche);
        return this.buildWideKnownCandidates(normalized);
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
            // 1) Use known stores for niche or variations without verification
            const fromKnown = [];
            if (this.knownStores[normalized]) fromKnown.push(...this.knownStores[normalized]);
            const variations = this.getNicheVariations(normalized);
            for (const v of variations) {
                if (fromKnown.length >= 5) break;
                if (this.knownStores[v]) {
                    for (const s of this.knownStores[v]) {
                        const key = (s.domain || '').replace(/^www\./, '').toLowerCase();
                        if (!seenDomains.has(key)) {
                            fromKnown.push(s);
                            seenDomains.add(key);
                            if (fromKnown.length >= 5) break;
                        }
                    }
                }
            }
            if (fromKnown.length >= 5) return fromKnown.slice(0, 5);

            // 2) Supplement with AI without verification (fast model)
            const ai = await this.searchOnlineCompetitors(niche);
            const combined = [...fromKnown];
            for (const comp of ai) {
                if (combined.length >= 5) break;
                const key = (comp.domain || '').replace(/^www\./, '').toLowerCase();
                if (!seenDomains.has(key)) {
                    combined.push(comp);
                    seenDomains.add(key);
                }
            }
            return combined.slice(0, 5);
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
                        const exists = await this.verifyStoreExists(c, { fastVerify: true });
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
}

module.exports = CompetitorFinder;
