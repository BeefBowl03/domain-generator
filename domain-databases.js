// Domain Generation Databases for High-Ticket E-commerce

const DOMAIN_DATABASES = {
    // Professional Domain Components
    prefixes: [
        'Pro', 'Elite', 'Prime', 'Ultimate', 'Premium', 'Expert', 'Master', 
        'Superior', 'Advanced', 'Executive', 'Platinum', 'Diamond', 'Gold',
        'Apex', 'Summit', 'Peak', 'Top', 'Leading', 'Premier', 'Select',
        'Signature', 'Prestige', 'Luxury', 'Deluxe', 'First', 'Alpha'
    ],

    suffixes: [
        'Pro', 'Direct', 'Zone', 'Hub', 'Base', 'HQ', 'Central', 'Source',
        'Supply', 'Depot', 'Works', 'Solutions', 'Systems', 'Group',
        'Company', 'Corp', 'Ventures', 'Partners', 'Associates', 'Collective',
        'Studio', 'Labs', 'Workshop', 'Factory', 'House', 'Store'
    ],

    // Popular niches with canonical categories and synonyms
    // Used to: (1) Prefer preloaded competitors first; (2) Enforce exactly 5 when in DB; (3) Provide suggestions on errors
    popularNiches: {
        'backyard': { synonyms: ['patio', 'garden', 'yard', 'lawn', 'landscape', 'deck'] },
        'pizza oven': { synonyms: ['outdoor oven', 'wood fired oven', 'backyard cooking'] },
        'marine': { synonyms: ['boat', 'nautical', 'sailing', 'yacht', 'ocean', 'sea'] },
        'fitness': { synonyms: ['gym', 'training', 'workout', 'strength', 'home gym'] },
        'drone': { synonyms: ['uav', 'quadcopter', 'aerial', 'fpv', 'drones'] },
        'kitchen': { synonyms: ['culinary', 'cookware', 'appliances'] },
        'golf': { synonyms: ['golfing', 'golf gear', 'golf clubs'] },
        'wellness': { synonyms: ['health', 'spa', 'recovery', 'sauna'] },
        'garage': { synonyms: ['workshop', 'automotive', 'storage'] },
        'smart home': { synonyms: ['home automation', 'iot', 'connected home'] },
        'fireplace': { synonyms: ['hearth', 'fire', 'electric fireplace', 'gas fireplace'] },
        'hvac': { synonyms: ['heating', 'cooling', 'air conditioning'] },
        'safes': { synonyms: ['safe', 'vault', 'gun safe'] },
        'solar': { synonyms: ['solar kits', 'solar power', 'photovoltaic'] },
        'generators': { synonyms: ['generator', 'backup power'] },
        'horse riding': { synonyms: ['equestrian', 'equine', 'horses'] },
        'sauna': { synonyms: ['infrared sauna', 'steam sauna'] },
        'home theater': { synonyms: ['theater seating', 'projector', 'audio'] },
        'man cave': { synonyms: ['mancave', 'den', 'retreat', 'hideout', 'sanctuary'] },
        'mancave': { synonyms: ['man cave', 'den', 'retreat', 'hideout', 'sanctuary'] }
    },

    // High-ticket physical product niche keywords (strict list used for UI display)
    strictNicheKeywords: {
        // BACKYARD NICHE
        'backyard': ['backyard', 'yard', 'patio', 'deck', 'outdoor', 'garden space', 'courtyard'],
        'bbq': ['bbq', 'barbecue', 'grill', 'grilling', 'smoker', 'charcoal', 'gas grill', 'outdoor cooking'],
        'fire': ['fire', 'fireplace', 'firepit', 'flame', 'bonfire', 'outdoor heater'],
        'pool': ['pool', 'spa', 'hot tub', 'swim', 'swimming pool', 'jacuzzi', 'backyard oasis'],
        'garden': ['garden', 'landscape', 'lawn', 'plant', 'vegetable patch', 'flower bed', 'shrubs', 'soil'],

        // SMART HOME NICHE
        'smart': ['smart', 'automated', 'connected', 'intelligent', 'AI-driven', 'IoT-enabled'],
        'home': ['home', 'house', 'residence', 'domestic', 'homestead', 'apartment'],
        'security': ['security', 'camera', 'alarm', 'monitoring', 'smart lock', 'doorbell camera', 'CCTV'],
        'lighting': ['lighting', 'lights', 'led', 'illumination', 'smart bulbs', 'dimmers', 'mood lighting'],
        'climate': ['climate', 'thermostat', 'heating', 'cooling', 'HVAC', 'air conditioning', 'smart thermostat'],

        // YARD EQUIPMENT NICHE  
        'yard': ['yard', 'lawn', 'garden', 'landscape', 'outdoor space', 'backlot'],
        'mower': ['mower', 'mowing', 'cutting', 'trimmer', 'lawnmower', 'weed whacker', 'edger'],
        'equipment': ['equipment', 'tools', 'machinery', 'gear', 'hardware'],
        'maintenance': ['maintenance', 'care', 'upkeep', 'repair', 'seasonal care'],

        // WELLNESS NICHE
        'wellness': ['wellness', 'health', 'wellbeing', 'recovery', 'self-care', 'holistic'],
        'massage': ['massage', 'therapy', 'relaxation', 'spa', 'deep tissue', 'aromatherapy'],
        'sauna': ['sauna', 'steam', 'infrared', 'heat', 'sweat therapy', 'detox'],
        'meditation': ['meditation', 'mindfulness', 'zen', 'calm', 'breathing', 'focus', 'guided meditation'],

        // FITNESS NICHE
        'fitness': ['fitness', 'gym', 'workout', 'exercise', 'training', 'HIIT', 'bodyweight'],
        'strength': ['strength', 'weight', 'power', 'muscle', 'resistance', 'lifting', 'barbell'],
        'cardio': ['cardio', 'running', 'cycling', 'endurance', 'rowing', 'aerobics', 'jump rope'],
        'equipment': ['equipment', 'machine', 'gear', 'apparatus', 'dumbbells', 'treadmill'],

        // GARAGE NICHE
        'garage': ['garage', 'workshop', 'storage', 'workspace', 'shed', 'man cave'],
        'tool': ['tool', 'tools', 'equipment', 'machinery', 'power tools', 'hand tools'],
        'automotive': ['automotive', 'car', 'vehicle', 'auto', 'mechanic', 'engine', 'tuning'],
        'organization': ['organization', 'storage', 'cabinet', 'rack', 'shelving', 'toolbox'],

        // OUTDOOR/ADVENTURE NICHE
        'outdoor': ['outdoor', 'adventure', 'camping', 'hiking', 'trekking', 'nature', 'expedition'],
        'gear': ['gear', 'equipment', 'tools', 'apparatus', 'backpack', 'tent', 'sleeping bag'],
        'survival': ['survival', 'tactical', 'emergency', 'prep', 'bushcraft', 'first aid'],
        'recreation': ['recreation', 'activity', 'sport', 'leisure', 'kayaking', 'climbing', 'exploration'],

        // MARINE NICHE
        'marine': ['marine', 'boat', 'yacht', 'vessel', 'sailing', 'nautical'],
        'water': ['water', 'ocean', 'sea', 'lake', 'river', 'waves', 'coastal'],
        'fishing': ['fishing', 'angling', 'catch', 'tackle', 'fly fishing', 'rod', 'bait'],
        'navigation': ['navigation', 'gps', 'compass', 'chart', 'sonar', 'radar'],

        // HORSE RIDING NICHE
        'horse': ['horse', 'equine', 'equestrian', 'riding', 'pony'],
        'riding': ['riding', 'saddle', 'bridle', 'tack', 'jodhpurs', 'reins'],
        'stable': ['stable', 'barn', 'arena', 'paddock', 'stall', 'hayloft'],
        'training': ['training', 'dressage', 'jumping', 'competition', 'horsemanship', 'eventing'],

        // HOME AND LIVING NICHE
        'living': ['living', 'interior', 'design', 'decor', 'aesthetics', 'home styling'],
        'furniture': ['furniture', 'seating', 'table', 'storage', 'sofa', 'cabinet', 'wardrobe'],
        'comfort': ['comfort', 'luxury', 'premium', 'quality', 'cozy', 'ergonomic'],
        'space': ['space', 'room', 'area', 'environment', 'floor plan', 'open concept'],

        // BIOHACKING NICHE
        'biohacking': ['biohacking', 'optimization', 'enhancement', 'performance', 'longevity', 'nootropics'],
        'recovery': ['recovery', 'regeneration', 'restoration', 'healing', 'rehab', 'muscle repair'],
        'monitoring': ['monitoring', 'tracking', 'measurement', 'data', 'wearables', 'biometrics'],
        'enhancement': ['enhancement', 'improvement', 'upgrade', 'boost', 'neuro-enhancement', 'supplements'],

        // E-VEHICLE NICHE
        'electric': ['electric', 'ev', 'battery', 'powered', 'plug-in', 'zero emission'],
        'vehicle': ['vehicle', 'car', 'bike', 'scooter', 'truck', 'e-mobility'],
        'charging': ['charging', 'charger', 'station', 'power', 'fast charging', 'supercharger'],
        'mobility': ['mobility', 'transport', 'travel', 'commute', 'rideshare', 'urban mobility'],

        // KITCHEN APPLIANCES NICHE
        'kitchen': ['kitchen', 'culinary', 'cooking', 'chef', 'cookware', 'kitchenware'],
        'appliance': ['appliance', 'equipment', 'machine', 'device', 'gadget'],
        'cooking': ['cooking', 'baking', 'roasting', 'preparation', 'grilling', 'frying', 'slow cooking'],
        'professional': ['professional', 'commercial', 'grade', 'quality', 'restaurant', 'industrial']
    },

    // High-Ticket Niche Terms (products $1000+)
    nicheTerms: {
        'backyard': [
            'yard', 'patio', 'garden', 'lawn', 'deck', 'landscape', 
            'green', 'turf', 'grass', 'BBQ', 'grill', 'fire', 'backyard'
        ],
        'bbq': ['bbq', 'barbecue', 'grill', 'smoker', 'smoke', 'flame', 'char', 'cookout', 'fire'],
        'fire': ['fire', 'flame', 'ember', 'glow', 'warmth', 'hearth', 'spark'],
        'pool': ['pool', 'spa', 'hot tub', 'swim', 'deck', 'tiles', 'patio'],
        'garden': ['garden', 'landscape', 'lawn', 'plant', 'bloom', 'grow', 'green'],
        'wellness': [
            'Wellness', 'Health', 'Vitality', 'Recovery', 'Therapy', 'Spa',
            'Rejuvenation', 'Healing', 'Restore', 'Balance'
        ],
        'massage': ['massage', 'therapy', 'relax', 'spa', 'soothe', 'recover'],
        'sauna': ['sauna', 'steam', 'infrared', 'heat', 'sweat'],
        'meditation': ['meditation', 'mindfulness', 'zen', 'calm', 'focus'],
        'horse riding': [
            'Equine', 'Horse', 'Riding', 'Equestrian', 'Stable', 'Ranch',
            'Saddle', 'Polo', 'Dressage', 'Show'
        ],
        'outdoor': [
            'Outdoor', 'Adventure', 'Expedition', 'Explorer', 'Wild', 'Trail',
            'Summit', 'Peak', 'Terrain', 'Wilderness'
        ],
        'marine': [
            'Marine', 'Nautical', 'Yacht', 'Boat', 'Ocean', 'Sea',
            'Harbor', 'Marina', 'Sailing', 'Naval'
        ],
        'smart home': [
            'Smart', 'Tech', 'Digital', 'Connected', 'Automated', 'Intelligent',
            'Innovation', 'Future', 'Advanced', 'Modern'
        ],
        'security': ['security', 'camera', 'alarm', 'monitor', 'access', 'lock'],
        'lighting': ['lighting', 'led', 'illumination', 'ambient', 'smart'],
        'climate': ['climate', 'thermostat', 'heating', 'cooling', 'air'],
        'garage': [
            'Garage', 'Workshop', 'Tool', 'Craft', 'Build', 'Mechanic',
            'Auto', 'Project', 'Maker', 'Storage'
        ],
        'man cave': [
            'Cave', 'Den', 'Retreat', 'Sanctuary', 'Hideout', 'Lounge',
            'Club', 'Bar', 'Game', 'Entertainment'
        ],
        'mancave': [
            'Cave', 'Den', 'Retreat', 'Sanctuary', 'Hideout', 'Lounge',
            'Club', 'Bar', 'Game', 'Entertainment'
        ],
        'fitness': [
            'Fitness', 'Gym', 'Training', 'Performance', 'Strength', 'Power',
            'Athletic', 'Sport', 'Muscle', 'Endurance'
        ],
        'strength': ['strength', 'weight', 'power', 'muscle'],
        'cardio': ['cardio', 'running', 'cycling', 'endurance'],
        'jewelry': [
            'Jewelry', 'Diamond', 'Gold', 'Luxury', 'Precious', 'Fine',
            'Elegant', 'Brilliant', 'Sparkle', 'Gem'
        ],
        'watches': [
            'Watch', 'Time', 'Luxury', 'Swiss', 'Premium', 'Timepiece',
            'Chronograph', 'Classic', 'Precision', 'Elite'
        ],
        'pizza oven': [
            'pizza', 'oven', 'fire', 'wood', 'stone', 'brick', 'outdoor', 
            'artisan', 'craft', 'flame', 'bake', 'cook'
        ],
        'drone': [
            'drone', 'aerial', 'sky', 'flight', 'pilot', 'camera', 'tech',
            'pro', 'fpv', 'racing', 'photography', 'video'
        ],
        'kitchen': [
            'kitchen', 'chef', 'cook', 'culinary', 'food', 'recipe', 'pro',
            'gourmet', 'master', 'craft', 'tools', 'gear'
        ],
        'golf': [
            'golf', 'swing', 'course', 'club', 'pro', 'master', 'green',
            'fairway', 'eagle', 'birdie', 'ace', 'tour'
        ]
    },

    // Niche variations - different ways of describing the same niche
    nicheVariations: {
        'backyard': [
            'yard', 'lawn', 'garden', 'patio', 'landscape', 'deck', 
            'green', 'turf', 'grass', 'exterior', 'grounds', 'property', 'estate', 'courtyard'
        ],
        'bbq': ['barbecue', 'bbq', 'grill', 'grilling', 'smoker', 'smoke', 'cookout', 'pit', 'fire'],
        'fire': ['flame', 'ember', 'glow', 'warmth', 'hearth', 'fire'],
        'pool': ['pool', 'hot tub', 'spa', 'swim', 'deck', 'patio'],
        'garden': ['garden', 'landscape', 'lawn', 'plant', 'green', 'bloom', 'grow'],
        'wellness': [
            'health', 'fitness', 'nutrition', 'recovery', 'therapy', 'spa', 'healing',
            'vitality', 'balance', 'mindfulness', 'meditation', 'holistic'
        ],
        'massage': ['massage', 'therapy', 'relaxation', 'spa'],
        'sauna': ['sauna', 'steam', 'infrared', 'heat'],
        'meditation': ['meditation', 'mindfulness', 'zen', 'calm'],
        'horse riding': [
            'equestrian', 'equine', 'horse', 'riding', 'horses', 'polo', 'dressage',
            'stable', 'ranch', 'saddle', 'show jumping'
        ],
        'smart home': [
            'home automation', 'iot', 'connected home', 'smart house', 'tech home',
            'automated', 'intelligent', 'digital home', 'future home'
        ],
        'security': ['security', 'camera', 'alarm', 'monitoring', 'surveillance'],
        'lighting': ['lighting', 'lights', 'led', 'illumination'],
        'climate': ['climate', 'thermostat', 'heating', 'cooling', 'hvac'],
        'marine': [
            'boat', 'nautical', 'sailing', 'maritime', 'yacht', 'ocean', 'sea',
            'harbor', 'marina', 'naval', 'boating'
        ],
        'garage': [
            'workshop', 'tool', 'automotive', 'storage', 'mechanic', 'craft',
            'maker', 'project', 'build', 'repair'
        ],
        'fitness': [
            'gym', 'training', 'workout', 'exercise', 'sport', 'athletic',
            'performance', 'strength', 'muscle', 'cardio', 'bodybuilding'
        ],
        'outdoor': [
            'adventure', 'camping', 'hiking', 'expedition', 'wilderness', 'trail',
            'explorer', 'nature', 'wild', 'terrain'
        ],
        'pizza oven': [
            'outdoor oven', 'wood fired oven', 'pizza', 'oven', 'outdoor cooking', 
            'backyard cooking', 'wood fire', 'stone oven', 'brick oven'
        ],
        'drone': [
            'uav', 'quadcopter', 'aerial', 'drone photography', 'fpv', 'rc drone',
            'unmanned aerial vehicle', 'multirotor', 'camera drone'
        ],
        'kitchen': [
            'culinary', 'cooking', 'chef', 'cookware', 'kitchen equipment', 
            'appliances', 'gourmet', 'food prep', 'professional kitchen'
        ],
        'golf': [
            'golfing', 'golf equipment', 'golf gear', 'golf clubs', 'golf accessories',
            'pro golf', 'golf pro shop', 'golf supplies'
        ]
    },

    // Creative descriptors for poetic domains
    poeticDescriptors: {
        'backyard': [
            'Bros', 'Buddies', 'Masters', 'Wizards', 'Gurus', 'Kings',
            'Paradise', 'Haven', 'Sanctuary', 'Oasis', 'Dreams', 'Bliss'
        ],
        'wellness': [
            'Wizards', 'Gurus', 'Masters', 'Angels', 'Warriors', 'Heroes',
            'Journey', 'Path', 'Quest', 'Revival', 'Awakening', 'Transformation'
        ],
        'horse riding': [
            'Legends', 'Champions', 'Masters', 'Elite', 'Dynasty', 'Heritage',
            'Spirit', 'Thunder', 'Grace', 'Majesty', 'Noble', 'Royal'
        ],
        'outdoor': [
            'Adventurers', 'Explorers', 'Rangers', 'Scouts', 'Legends', 'Heroes',
            'Quest', 'Journey', 'Expedition', 'Discovery', 'Freedom', 'Wild'
        ],
        'marine': [
            'Captains', 'Admirals', 'Navigators', 'Sailors', 'Legends', 'Masters',
            'Horizon', 'Voyage', 'Tide', 'Current', 'Deep', 'Blue'
        ],
        'smart home': [
            'Wizards', 'Geniuses', 'Masters', 'Innovators', 'Pioneers', 'Visionaries',
            'Future', 'Tomorrow', 'Next', 'Smart', 'Brilliant', 'Genius'
        ],
        'garage': [
            'Masters', 'Pros', 'Experts', 'Builders', 'Makers', 'Crafters',
            'Workshop', 'Factory', 'Lab', 'Studio', 'Forge', 'Works'
        ],
        'man cave': [
            'Dwellers', 'Kings', 'Masters', 'Legends', 'Bros', 'Club',
            'Hideout', 'Sanctuary', 'Den', 'Lair', 'Fortress', 'Kingdom'
        ],
        'mancave': [
            'Dwellers', 'Kings', 'Masters', 'Legends', 'Bros', 'Club',
            'Hideout', 'Sanctuary', 'Den', 'Lair', 'Fortress', 'Kingdom'
        ],
        'fitness': [
            'Warriors', 'Gladiators', 'Champions', 'Titans', 'Heroes', 'Legends',
            'Power', 'Force', 'Beast', 'Iron', 'Steel', 'Thunder'
        ],
        'jewelry': [
            'Elegance', 'Brilliance', 'Sparkle', 'Radiance', 'Glamour', 'Luxury',
            'Dreams', 'Desire', 'Passion', 'Romance', 'Beauty', 'Grace'
        ],
        'watches': [
            'Masters', 'Collectors', 'Connoisseurs', 'Elite', 'Legends', 'Heritage',
            'Precision', 'Craftsmanship', 'Legacy', 'Tradition', 'Excellence', 'Prestige'
        ]
    }
    ,
    // Niche-specific avoid terms to keep advice contextual
    nicheAvoid: {
        'backyard': ['mulch', 'hose', 'flowerpot', 'weedwhacker', 'plastic furniture'],
        'bbq': ['charcoal-only', 'tabletop-only', 'portable stoves'],
        'fire': ['matches', 'lighters', 'candles'],
        'pool': ['toys', 'floaties', 'goggles'],
        'garden': ['seeds bulk', 'fertilizer cheap'],
        'fitness': ['diet pills', 'cheap mats'],
        'marine': ['kayaks cheap', 'fishing bait'],
        'smart home': ['diy kits', 'hobby boards'],
        'garage': ['handheld gadgets', 'novelty items'],
        'pizza oven': ['portable mini', 'toy ovens'],
        'drone': ['toy drones', 'mini rc'],
        'kitchen': ['utensils cheap', 'gadgets novelty'],
        'golf': ['tees bulk', 'ball markers']
    }
};

module.exports = DOMAIN_DATABASES;
