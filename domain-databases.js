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

    // High-Ticket Niche Terms (products $1000+)
    nicheTerms: {
        'backyard': [
            'yard', 'patio', 'garden', 'lawn', 'outdoor', 'deck', 'landscape', 
            'green', 'turf', 'grass', 'BBQ', 'grill', 'fire', 'backyard'
        ],
        'bbq': ['bbq', 'barbecue', 'grill', 'smoker', 'smoke', 'flame', 'char', 'cookout', 'fire'],
        'fire': ['fire', 'flame', 'ember', 'glow', 'warmth', 'hearth', 'camp', 'spark'],
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
            'yard', 'lawn', 'garden', 'patio', 'outdoor', 'landscape', 'deck', 
            'green', 'turf', 'grass', 'exterior', 'grounds', 'property', 'estate', 'courtyard'
        ],
        'bbq': ['barbecue', 'bbq', 'grill', 'grilling', 'smoker', 'smoke', 'cookout', 'pit', 'fire'],
        'fire': ['flame', 'ember', 'glow', 'warmth', 'hearth', 'campfire', 'fire'],
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
        'bbq': ['charcoal-only', 'tabletop-only', 'camp stoves'],
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
