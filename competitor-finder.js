const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');

class CompetitorFinder {
    constructor(openaiApiKey) {
        this.openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
        this.knownStores = {
            'backyard': [
                { name: 'Pottery Barn Outdoor', url: 'https://potterybarn.com', domain: 'potterybarn.com' },
                { name: 'Williams Sonoma Home', url: 'https://williamssonoma.com', domain: 'williamssonoma.com' },
                { name: 'Restoration Hardware', url: 'https://rh.com', domain: 'rh.com' },
                { name: 'Frontgate', url: 'https://frontgate.com', domain: 'frontgate.com' },
                { name: 'Grandin Road', url: 'https://grandinroad.com', domain: 'grandinroad.com' }
            ],
            'firepit': [
                { name: 'Solo Stove', url: 'https://solostove.com', domain: 'solostove.com' },
                { name: 'Breeo', url: 'https://breeo.co', domain: 'breeo.co' },
                { name: 'Fire Pit Art', url: 'https://firepitart.com', domain: 'firepitart.com' },
                { name: 'The Outdoor Plus', url: 'https://theoutdoorplus.com', domain: 'theoutdoorplus.com' },
                { name: 'American Fire Glass', url: 'https://americanfireglass.com', domain: 'americanfireglass.com' }
            ],
            'barbecue': [
                { name: 'BBQ Guys', url: 'https://bbqguys.com', domain: 'bbqguys.com' },
                { name: 'Grill Parts America', url: 'https://grillpartsamerica.com', domain: 'grillpartsamerica.com' },
                { name: 'Napoleon Grills', url: 'https://napoleongrills.com', domain: 'napoleongrills.com' },
                { name: 'Pit Boss Grills', url: 'https://pitbossgrills.com', domain: 'pitbossgrills.com' },
                { name: 'Green Mountain Grills', url: 'https://greenmountaingrills.com', domain: 'greenmountaingrills.com' }
            ],
            'marine': [
                { name: 'West Marine', url: 'https://westmarine.com', domain: 'westmarine.com' },
                { name: 'Defender Marine', url: 'https://defender.com', domain: 'defender.com' },
                { name: 'Bass Pro Shops Marine', url: 'https://basspro.com', domain: 'basspro.com' },
                { name: 'Boaters World Marine', url: 'https://boatersworld.com', domain: 'boatersworld.com' },
                { name: 'MarineMax', url: 'https://marinemax.com', domain: 'marinemax.com' }
            ],
            'horse riding': [
                { name: 'Dover Saddlery', url: 'https://doversaddlery.com', domain: 'doversaddlery.com' },
                { name: 'SmartPak Equine', url: 'https://smartpakequine.com', domain: 'smartpakequine.com' },
                { name: 'Horse.com', url: 'https://horse.com', domain: 'horse.com' },
                { name: 'State Line Tack', url: 'https://statelinetack.com', domain: 'statelinetack.com' },
                { name: 'Riding Warehouse', url: 'https://ridingwarehouse.com', domain: 'ridingwarehouse.com' }
            ],
            'wellness': [
                { name: 'Thrive Market', url: 'https://thrivemarket.com', domain: 'thrivemarket.com' },
                { name: 'iHerb', url: 'https://iherb.com', domain: 'iherb.com' },
                { name: 'Bulletproof', url: 'https://bulletproof.com', domain: 'bulletproof.com' },
                { name: 'Goop', url: 'https://goop.com', domain: 'goop.com' },
                { name: 'Ritual', url: 'https://ritual.com', domain: 'ritual.com' }
            ],
            'outdoor': [
                { name: 'REI Co-op', url: 'https://rei.com', domain: 'rei.com' },
                { name: 'Backcountry', url: 'https://backcountry.com', domain: 'backcountry.com' },
                { name: 'Patagonia', url: 'https://patagonia.com', domain: 'patagonia.com' },
                { name: 'The North Face', url: 'https://thenorthface.com', domain: 'thenorthface.com' },
                { name: 'Outdoor Research', url: 'https://outdoorresearch.com', domain: 'outdoorresearch.com' }
            ],
            'adventure': [
                { name: 'REI Co-op', url: 'https://rei.com', domain: 'rei.com' },
                { name: 'Patagonia', url: 'https://patagonia.com', domain: 'patagonia.com' },
                { name: 'The North Face', url: 'https://thenorthface.com', domain: 'thenorthface.com' },
                { name: 'Arc\'teryx', url: 'https://arcteryx.com', domain: 'arcteryx.com' },
                { name: 'Black Diamond', url: 'https://blackdiamondequipment.com', domain: 'blackdiamondequipment.com' }
            ],
            'garage': [
                { name: 'Gladiator GarageWorks', url: 'https://gladiatorgarageworks.com', domain: 'gladiatorgarageworks.com' },
                { name: 'NewAge Products', url: 'https://newageproducts.com', domain: 'newageproducts.com' },
                { name: 'StoreWALL', url: 'https://storewall.com', domain: 'storewall.com' },
                { name: 'Garage Journal', url: 'https://garagejournal.com', domain: 'garagejournal.com' },
                { name: 'Flow Wall', url: 'https://flowwall.com', domain: 'flowwall.com' }
            ],
            'smart home': [
                { name: 'Nest', url: 'https://nest.com', domain: 'nest.com' },
                { name: 'Ring', url: 'https://ring.com', domain: 'ring.com' },
                { name: 'Ecobee', url: 'https://ecobee.com', domain: 'ecobee.com' },
                { name: 'August Home', url: 'https://august.com', domain: 'august.com' },
                { name: 'Lutron', url: 'https://lutron.com', domain: 'lutron.com' }
            ],
            'fitness': [
                { name: 'Rogue Fitness', url: 'https://roguefitness.com', domain: 'roguefitness.com' },
                { name: 'REP Fitness', url: 'https://repfitness.com', domain: 'repfitness.com' },
                { name: 'Titan Fitness', url: 'https://titanfitness.com', domain: 'titanfitness.com' },
                { name: 'American Barbell', url: 'https://americanbarbell.com', domain: 'americanbarbell.com' },
                { name: 'Fringe Sport', url: 'https://fringesport.com', domain: 'fringesport.com' }
            ],
            'automotive': [
                { name: 'Summit Racing', url: 'https://summitracing.com', domain: 'summitracing.com' },
                { name: 'JEGS', url: 'https://jegs.com', domain: 'jegs.com' },
                { name: 'AutoZone', url: 'https://autozone.com', domain: 'autozone.com' },
                { name: 'Advance Auto Parts', url: 'https://advanceautoparts.com', domain: 'advanceautoparts.com' },
                { name: 'Rock Auto', url: 'https://rockauto.com', domain: 'rockauto.com' }
            ],
            'jewelry': [
                { name: 'Blue Nile', url: 'https://bluenile.com', domain: 'bluenile.com' },
                { name: 'James Allen', url: 'https://jamesallen.com', domain: 'jamesallen.com' },
                { name: 'Brilliant Earth', url: 'https://brilliantearth.com', domain: 'brilliantearth.com' },
                { name: 'Ritani', url: 'https://ritani.com', domain: 'ritani.com' },
                { name: 'Clean Origin', url: 'https://cleanorigin.com', domain: 'cleanorigin.com' }
            ],
            'watches': [
                { name: 'Crown & Caliber', url: 'https://crownandcaliber.com', domain: 'crownandcaliber.com' },
                { name: 'Hodinkee Shop', url: 'https://shop.hodinkee.com', domain: 'shop.hodinkee.com' },
                { name: 'Chrono24', url: 'https://chrono24.com', domain: 'chrono24.com' },
                { name: 'Bob\'s Watches', url: 'https://bobswatches.com', domain: 'bobswatches.com' },
                { name: 'Tourneau', url: 'https://tourneau.com', domain: 'tourneau.com' }
            ],
            'home decor': [
                { name: 'West Elm', url: 'https://westelm.com', domain: 'westelm.com' },
                { name: 'CB2', url: 'https://cb2.com', domain: 'cb2.com' },
                { name: 'Article', url: 'https://article.com', domain: 'article.com' },
                { name: 'AllModern', url: 'https://allmodern.com', domain: 'allmodern.com' },
                { name: 'Design Within Reach', url: 'https://dwr.com', domain: 'dwr.com' }
            ],
            'kitchen': [
                { name: 'Williams Sonoma', url: 'https://williamssonoma.com', domain: 'williamssonoma.com' },
                { name: 'Sur La Table', url: 'https://surlatable.com', domain: 'surlatable.com' },
                { name: 'Crate & Barrel', url: 'https://crateandbarrel.com', domain: 'crateandbarrel.com' },
                { name: 'Chef\'s Catalog', url: 'https://chefscatalog.com', domain: 'chefscatalog.com' },
                { name: 'Cutlery and More', url: 'https://cutleryandmore.com', domain: 'cutleryandmore.com' }
            ],
            'baby': [
                { name: 'Pottery Barn Kids', url: 'https://potterybarnkids.com', domain: 'potterybarnkids.com' },
                { name: 'Babylist Store', url: 'https://store.babylist.com', domain: 'store.babylist.com' },
                { name: 'Maisonette', url: 'https://maisonette.com', domain: 'maisonette.com' },
                { name: 'Crate & Kids', url: 'https://crateandkids.com', domain: 'crateandkids.com' },
                { name: 'Giggle', url: 'https://giggle.com', domain: 'giggle.com' }
            ],
            'pet': [
                { name: 'Chewy', url: 'https://chewy.com', domain: 'chewy.com' },
                { name: 'Petco', url: 'https://petco.com', domain: 'petco.com' },
                { name: 'PetSmart', url: 'https://petsmart.com', domain: 'petsmart.com' },
                { name: 'BarkBox', url: 'https://barkbox.com', domain: 'barkbox.com' },
                { name: 'West Paw', url: 'https://westpaw.com', domain: 'westpaw.com' }
            ],
            'electronics': [
                { name: 'B&H Photo', url: 'https://bhphotovideo.com', domain: 'bhphotovideo.com' },
                { name: 'Adorama', url: 'https://adorama.com', domain: 'adorama.com' },
                { name: 'Newegg', url: 'https://newegg.com', domain: 'newegg.com' },
                { name: 'Best Buy', url: 'https://bestbuy.com', domain: 'bestbuy.com' },
                { name: 'Micro Center', url: 'https://microcenter.com', domain: 'microcenter.com' }
            ],
            'outdoor': [
                { name: 'REI Co-op', url: 'https://rei.com', domain: 'rei.com' },
                { name: 'Backcountry', url: 'https://backcountry.com', domain: 'backcountry.com' },
                { name: 'Moosejaw', url: 'https://moosejaw.com', domain: 'moosejaw.com' },
                { name: 'Outdoor Research', url: 'https://outdoorresearch.com', domain: 'outdoorresearch.com' },
                { name: 'Mountain Hardwear', url: 'https://mountainhardwear.com', domain: 'mountainhardwear.com' }
            ],
            'adventure': [
                { name: 'Patagonia', url: 'https://patagonia.com', domain: 'patagonia.com' },
                { name: 'The North Face', url: 'https://thenorthface.com', domain: 'thenorthface.com' },
                { name: 'Arc\'teryx', url: 'https://arcteryx.com', domain: 'arcteryx.com' },
                { name: 'Black Diamond', url: 'https://blackdiamondequipment.com', domain: 'blackdiamondequipment.com' },
                { name: 'Osprey Packs', url: 'https://osprey.com', domain: 'osprey.com' }
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
            'backyard': ['outdoor', 'patio', 'garden', 'yard'],
            'marine': ['boat', 'nautical', 'sailing', 'maritime'],
            'horse riding': ['equestrian', 'equine', 'horse', 'riding', 'horses'],
            'horse': ['horse riding', 'equestrian', 'equine'],
            'horses': ['horse riding', 'equestrian', 'equine'],
            'wellness': ['health', 'fitness', 'nutrition'],
            'smart home': ['home automation', 'iot', 'connected home'],
            'outdoor': ['adventure', 'camping', 'hiking'],
            'garage': ['automotive', 'workshop', 'storage'],
            'barbecue': ['grilling', 'bbq', 'outdoor cooking']
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
        const prompt = `Find 5 real, existing high-ticket dropshipping companies in the "${niche}" industry.

Requirements:
- Must be REAL companies that actually exist
- Focus on high-ticket items ($500+ products)  
- Premium/luxury positioning preferred
- Include major brands and specialized retailers
- NO made-up or fictional companies

Return a JSON array with this format:
[
  {
    "name": "Company Name",
    "url": "https://website.com", 
    "domain": "website.com",
    "description": "Brief description of what they sell"
  }
]

Examples of good responses:
- Jewelry: Tiffany & Co, Cartier, Blue Nile
- Tech: Apple, Microsoft, Best Buy
- Automotive: Tesla, BMW, Mercedes

Find real companies in the ${niche} space.`;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3
            });

            const content = response.choices[0].message.content.trim();
            let jsonStart = content.indexOf('[');
            let jsonEnd = content.lastIndexOf(']') + 1;
            
            if (jsonStart !== -1 && jsonEnd > jsonStart) {
                const jsonStr = content.substring(jsonStart, jsonEnd);
                const competitors = JSON.parse(jsonStr);
                
                // Validate and clean the response
                const validCompetitors = competitors
                    .filter(comp => comp.name && comp.url && comp.domain)
                    .slice(0, 5)
                    .map(comp => ({
                        name: comp.name,
                        url: comp.url.startsWith('http') ? comp.url : `https://${comp.url}`,
                        domain: comp.domain.replace('https://', '').replace('http://', '').replace('www.', '')
                    }));

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

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Method to verify if a competitor store actually exists
    async verifyStoreExists(store) {
        try {
            const response = await axios.head(store.url, { timeout: 5000 });
            return response.status === 200;
        } catch (error) {
            console.log(`Store ${store.domain} may not exist or is not accessible`);
            return false;
        }
    }

    // Method to get verified competitors (only those that actually exist)
    async getVerifiedCompetitors(niche) {
        const competitors = await this.findCompetitors(niche);
        const verifiedCompetitors = [];

        for (const competitor of competitors) {
            const exists = await this.verifyStoreExists(competitor);
            if (exists) {
                verifiedCompetitors.push(competitor);
            }
            
            // Stop once we have 5 verified competitors
            if (verifiedCompetitors.length >= 5) {
                break;
            }
        }

        return verifiedCompetitors;
    }
}

module.exports = CompetitorFinder;
