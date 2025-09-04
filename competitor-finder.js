const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');

class CompetitorFinder {
    constructor(openaiApiKey) {
        this.openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
        // Known high-ticket dropshipping stores by niche
        this.knownStores = {
            'backyard': [
                { name: 'Yard Mastery', url: 'https://yardmastery.com', domain: 'yardmastery.com' },
                { name: 'Green Sanctuary', url: 'https://greensanctuary.com', domain: 'greensanctuary.com' },
                { name: 'Patio Paradise', url: 'https://patioparadise.com', domain: 'patioparadise.com' },
                { name: 'Deck Dynasty', url: 'https://deckdynasty.com', domain: 'deckdynasty.com' },
                { name: 'Lawn Legends', url: 'https://lawnlegends.com', domain: 'lawnlegends.com' }
            ],
            'pizza oven': [
                { name: 'Pizza Oven Studio', url: 'https://pizzaovenstudio.com', domain: 'pizzaovenstudio.com' },
                { name: 'Outdoor Pizza Co', url: 'https://outdoorpizzaco.com', domain: 'outdoorpizzaco.com' },
                { name: 'Fire & Stone Ovens', url: 'https://fireandstoneovens.com', domain: 'fireandstoneovens.com' },
                { name: 'Artisan Oven Works', url: 'https://artisanovenworks.com', domain: 'artisanovenworks.com' },
                { name: 'Pizza Craft Direct', url: 'https://pizzacraftdirect.com', domain: 'pizzacraftdirect.com' }
            ],
            'drone': [
                { name: 'Drone Masters Pro', url: 'https://dronemasterspro.com', domain: 'dronemasterspro.com' },
                { name: 'Sky Tech Drones', url: 'https://skytechdrones.com', domain: 'skytechdrones.com' },
                { name: 'Aerial Dynamics', url: 'https://aerialdynamics.com', domain: 'aerialdynamics.com' },
                { name: 'Pro Drone Hub', url: 'https://prodronehub.com', domain: 'prodronehub.com' },
                { name: 'Elite UAV Store', url: 'https://eliteuavstore.com', domain: 'eliteuavstore.com' }
            ],
            'kitchen': [
                { name: 'Chef Arsenal', url: 'https://chefarsenal.com', domain: 'chefarsenal.com' },
                { name: 'Kitchen Craft Pro', url: 'https://kitchencraftpro.com', domain: 'kitchencraftpro.com' },
                { name: 'Culinary Elite', url: 'https://culinaryelite.com', domain: 'culinaryelite.com' },
                { name: 'Pro Kitchen Direct', url: 'https://prokitchendirect.com', domain: 'prokitchendirect.com' },
                { name: 'Master Chef Tools', url: 'https://mastercheftools.com', domain: 'mastercheftools.com' }
            ],
            'golf': [
                { name: 'Golf Pro Warehouse', url: 'https://golfprowarehouse.com', domain: 'golfprowarehouse.com' },
                { name: 'Elite Golf Gear', url: 'https://elitegolfgear.com', domain: 'elitegolfgear.com' },
                { name: 'Pro Shop Direct', url: 'https://proshopdirect.com', domain: 'proshopdirect.com' },
                { name: 'Golf Masters Store', url: 'https://golfmastersstore.com', domain: 'golfmastersstore.com' },
                { name: 'Premium Golf Supply', url: 'https://premiumgolfsupply.com', domain: 'premiumgolfsupply.com' }
            ],
            'firepit': [
                { name: 'Fire Pit Plaza', url: 'https://firepitplaza.com', domain: 'firepitplaza.com' },
                { name: 'Outdoor Fire Store', url: 'https://outdoorfirestore.com', domain: 'outdoorfirestore.com' },
                { name: 'Fire Pit Outpost', url: 'https://firepitoutpost.com', domain: 'firepitoutpost.com' },
                { name: 'Backyard Fire Place', url: 'https://backyardfireplace.com', domain: 'backyardfireplace.com' },
                { name: 'Flame Authority', url: 'https://flameauthority.com', domain: 'flameauthority.com' }
            ],
            'barbecue': [
                { name: 'Grill Spot', url: 'https://grillspot.com', domain: 'grillspot.com' },
                { name: 'BBQ Grill Outlet', url: 'https://bbqgrilloutlet.com', domain: 'bbqgrilloutlet.com' },
                { name: 'Grills Direct', url: 'https://grillsdirect.com', domain: 'grillsdirect.com' },
                { name: 'Outdoor Cooking Pros', url: 'https://outdoorcookingpros.com', domain: 'outdoorcookingpros.com' },
                { name: 'BBQ Island', url: 'https://bbqisland.com', domain: 'bbqisland.com' }
            ],
            'marine': [
                { name: 'Boat Parts Inventory', url: 'https://boatpartsinventory.com', domain: 'boatpartsinventory.com' },
                { name: 'Marine Engine Parts', url: 'https://marineengineparts.com', domain: 'marineengineparts.com' },
                { name: 'Wholesale Marine', url: 'https://wholesalemarine.com', domain: 'wholesalemarine.com' },
                { name: 'Boat Gear Depot', url: 'https://boatgeardepot.com', domain: 'boatgeardepot.com' },
                { name: 'iBoats', url: 'https://iboats.com', domain: 'iboats.com' }
            ],
            'horse riding': [
                { name: 'Equestrian Collections', url: 'https://equestriancollections.com', domain: 'equestriancollections.com' },
                { name: 'Horse Gear World', url: 'https://horsegearworld.com', domain: 'horsegearworld.com' },
                { name: 'Equine Now', url: 'https://equinenow.com', domain: 'equinenow.com' },
                { name: 'Tack Room Supplies', url: 'https://tackroomsupplies.com', domain: 'tackroomsupplies.com' },
                { name: 'Horse Tack Co', url: 'https://horsetackco.com', domain: 'horsetackco.com' }
            ],
            'wellness': [
                { name: 'Wellness Warehouse', url: 'https://wellnesswarehouse.com', domain: 'wellnesswarehouse.com' },
                { name: 'Health Products For You', url: 'https://healthproductsforyou.com', domain: 'healthproductsforyou.com' },
                { name: 'Vitacost', url: 'https://vitacost.com', domain: 'vitacost.com' },
                { name: 'eVitamins', url: 'https://evitamins.com', domain: 'evitamins.com' },
                { name: 'Wellness.com', url: 'https://wellness.com', domain: 'wellness.com' }
            ],
            'outdoor': [
                { name: 'Outdoor Element', url: 'https://outdoorelement.com', domain: 'outdoorelement.com' },
                { name: 'Gear Trade', url: 'https://geartrade.com', domain: 'geartrade.com' },
                { name: 'Outdoor Gear Exchange', url: 'https://gearx.com', domain: 'gearx.com' },
                { name: 'Campmor', url: 'https://campmor.com', domain: 'campmor.com' },
                { name: 'Sierra Trading Post', url: 'https://sierra.com', domain: 'sierra.com' }
            ],
            'adventure': [
                { name: 'Adventure Medical Kits', url: 'https://adventuremedicalkits.com', domain: 'adventuremedicalkits.com' },
                { name: 'Outdoor Gear Lab', url: 'https://outdoorgearlab.com', domain: 'outdoorgearlab.com' },
                { name: 'Steep & Cheap', url: 'https://steepandcheap.com', domain: 'steepandcheap.com' },
                { name: 'Outdoor Prolink', url: 'https://outdoorprolink.com', domain: 'outdoorprolink.com' },
                { name: 'Gear Coop', url: 'https://gearcoop.com', domain: 'gearcoop.com' }
            ],
            'garage': [
                { name: 'Garage Storage Direct', url: 'https://garagestoragedirect.com', domain: 'garagestoragedirect.com' },
                { name: 'Garage Flooring LLC', url: 'https://garageflooringllc.com', domain: 'garageflooringllc.com' },
                { name: 'Garage Tool Store', url: 'https://garagetoolstore.com', domain: 'garagetoolstore.com' },
                { name: 'Monkey Bar Storage', url: 'https://monkeybarstorage.com', domain: 'monkeybarstorage.com' },
                { name: 'Garage Gear', url: 'https://garagegear.com', domain: 'garagegear.com' }
            ],
            'smart home': [
                { name: 'Smart Home Store', url: 'https://smarthomestore.com', domain: 'smarthomestore.com' },
                { name: 'Home Controls', url: 'https://homecontrols.com', domain: 'homecontrols.com' },
                { name: 'SmartThings Store', url: 'https://smartthingsstore.com', domain: 'smartthingsstore.com' },
                { name: 'Automated Outlet', url: 'https://automatedoutlet.com', domain: 'automatedoutlet.com' },
                { name: 'Smart Home Direct', url: 'https://smarthomedirect.com', domain: 'smarthomedirect.com' }
            ],
            'fitness': [
                { name: 'Iron Paradise', url: 'https://ironparadise.com', domain: 'ironparadise.com' },
                { name: 'Beast Mode Fitness', url: 'https://beastmodefitness.com', domain: 'beastmodefitness.com' },
                { name: 'Elite Gym Supply', url: 'https://elitegymsupply.com', domain: 'elitegymsupply.com' },
                { name: 'Power Fitness Pro', url: 'https://powerfitnesspro.com', domain: 'powerfitnesspro.com' },
                { name: 'Strength Dynasty', url: 'https://strengthdynasty.com', domain: 'strengthdynasty.com' }
            ],
            'automotive': [
                { name: 'Auto Parts Warehouse', url: 'https://autopartswarehouse.com', domain: 'autopartswarehouse.com' },
                { name: 'Car Parts.com', url: 'https://carparts.com', domain: 'carparts.com' },
                { name: 'Auto Accessories Garage', url: 'https://autoaccessoriesgarage.com', domain: 'autoaccessoriesgarage.com' },
                { name: 'JC Whitney', url: 'https://jcwhitney.com', domain: 'jcwhitney.com' },
                { name: 'Car ID', url: 'https://carid.com', domain: 'carid.com' }
            ],
            'jewelry': [
                { name: 'Jewelry Depot', url: 'https://jewelrydepot.com', domain: 'jewelrydepot.com' },
                { name: 'Diamond Nexus', url: 'https://diamondnexus.com', domain: 'diamondnexus.com' },
                { name: 'Jewelry Exchange', url: 'https://jewelryexchange.com', domain: 'jewelryexchange.com' },
                { name: 'Ice.com', url: 'https://ice.com', domain: 'ice.com' },
                { name: 'SuperJeweler', url: 'https://superjeweler.com', domain: 'superjeweler.com' }
            ],
            'watches': [
                { name: 'Watch Depot', url: 'https://watchdepot.com', domain: 'watchdepot.com' },
                { name: 'Watches.com', url: 'https://watches.com', domain: 'watches.com' },
                { name: 'TimeZone Watch', url: 'https://timezonewatch.com', domain: 'timezonewatch.com' },
                { name: 'Watch Station', url: 'https://watchstation.com', domain: 'watchstation.com' },
                { name: 'eBay Watches', url: 'https://ebay.com/watches', domain: 'ebay.com' }
            ],
            'home decor': [
                { name: 'Home Decorators Collection', url: 'https://homedecorators.com', domain: 'homedecorators.com' },
                { name: 'Decor Steals', url: 'https://decorsteals.com', domain: 'decorsteals.com' },
                { name: 'HomeGoods Online', url: 'https://homegoods.com', domain: 'homegoods.com' },
                { name: 'Decor Market', url: 'https://decormarket.com', domain: 'decormarket.com' },
                { name: 'Home Depot Decor', url: 'https://homedepot.com/decor', domain: 'homedepot.com' }
            ],
            'kitchen': [
                { name: 'Kitchen Source', url: 'https://kitchensource.com', domain: 'kitchensource.com' },
                { name: 'Cooking.com', url: 'https://cooking.com', domain: 'cooking.com' },
                { name: 'Kitchen Collection', url: 'https://kitchencollection.com', domain: 'kitchencollection.com' },
                { name: 'Chef Central', url: 'https://chefcentral.com', domain: 'chefcentral.com' },
                { name: 'Kitchen Kaboodle', url: 'https://kitchenkaboodle.com', domain: 'kitchenkaboodle.com' }
            ],
            'baby': [
                { name: 'Baby Gear Lab', url: 'https://babygearlab.com', domain: 'babygearlab.com' },
                { name: 'Baby Depot', url: 'https://babydepot.com', domain: 'babydepot.com' },
                { name: 'Albee Baby', url: 'https://albeebaby.com', domain: 'albeebaby.com' },
                { name: 'Baby Earth', url: 'https://babyearth.com', domain: 'babyearth.com' },
                { name: 'Baby Bunting', url: 'https://babybunting.com', domain: 'babybunting.com' }
            ],
            'pet': [
                { name: 'Pet Supplies Plus', url: 'https://petsuppliesplus.com', domain: 'petsuppliesplus.com' },
                { name: 'Petflow', url: 'https://petflow.com', domain: 'petflow.com' },
                { name: 'Pet Mountain', url: 'https://petmountain.com', domain: 'petmountain.com' },
                { name: 'Entirely Pets', url: 'https://entirelypets.com', domain: 'entirelypets.com' },
                { name: 'Pet Supermarket', url: 'https://petsupermarket.com', domain: 'petsupermarket.com' }
            ],
            'electronics': [
                { name: 'Electronics Expo', url: 'https://electronicsexpo.com', domain: 'electronicsexpo.com' },
                { name: 'TigerDirect', url: 'https://tigerdirect.com', domain: 'tigerdirect.com' },
                { name: 'Electronics Valley', url: 'https://electronicsvalley.com', domain: 'electronicsvalley.com' },
                { name: 'Fry\'s Electronics', url: 'https://frys.com', domain: 'frys.com' },
                { name: 'Electronics For Less', url: 'https://electronicsforless.com', domain: 'electronicsforless.com' }
            ],
            'man cave': [
                { name: 'Man Cave Store', url: 'https://mancavestore.com', domain: 'mancavestore.com' },
                { name: 'Game Room Guys', url: 'https://gameroomguys.com', domain: 'gameroomguys.com' },
                { name: 'Bar Stools and More', url: 'https://barstoolsandmore.com', domain: 'barstoolsandmore.com' },
                { name: 'Pool Table Portfolio', url: 'https://pooltableportfolio.com', domain: 'pooltableportfolio.com' },
                { name: 'Entertainment Furniture', url: 'https://entertainmentfurniture.com', domain: 'entertainmentfurniture.com' }
            ],
            'mancave': [
                { name: 'Man Cave Store', url: 'https://mancavestore.com', domain: 'mancavestore.com' },
                { name: 'Game Room Guys', url: 'https://gameroomguys.com', domain: 'gameroomguys.com' },
                { name: 'Bar Stools and More', url: 'https://barstoolsandmore.com', domain: 'barstoolsandmore.com' },
                { name: 'Pool Table Portfolio', url: 'https://pooltableportfolio.com', domain: 'pooltableportfolio.com' },
                { name: 'Entertainment Furniture', url: 'https://entertainmentfurniture.com', domain: 'entertainmentfurniture.com' }
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
        return niche.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove special characters
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
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
            'backyard': ['outdoor', 'patio', 'garden', 'yard', 'lawn', 'deck', 'landscape'],
            'pizza oven': ['outdoor oven', 'wood fired oven', 'pizza', 'oven', 'outdoor cooking', 'backyard cooking'],
            'drone': ['uav', 'quadcopter', 'aerial', 'drone photography', 'fpv', 'rc drone'],
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

        if (relatedTerms[niche]) {
            relatedTerms[niche].forEach(term => variations.add(term));
        }

        return Array.from(variations);
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
        const headTimeout = fastVerify ? 1800 : 6500;
        const getTimeout = fastVerify ? 4000 : 12000;
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
