const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
let sqlite3 = null;
const cors = require('cors');
const OpenAI = require('openai');
const NameComAPI = require('./namecom-api');
const CompetitorFinder = require('./competitor-finder');
const DOMAIN_DATABASES = require('./domain-databases');
// Centralized Niche Classification System
class NicheClassifier {
  constructor(competitorFinder) {
    this.competitorFinder = competitorFinder;
    this.knownStores = competitorFinder?.knownStores || {};
    this.popularNiches = DOMAIN_DATABASES.popularNiches || {};
  }

  async classifyNiche(inputNiche) {
    const normalized = this.normalizeNiche(inputNiche);
    console.log(`🔍 Classifying niche: "${inputNiche}" → "${normalized}"`);

    // Direct match in known stores
    if (this.knownStores[normalized]) {
      console.log(`✅ Direct match in known stores: "${normalized}"`);
      return { type: 'known', canonicalNiche: normalized, confidence: 1.0, source: 'direct_match' };
    }

    // Direct match in popular niches
    if (this.popularNiches[normalized]) {
      console.log(`✅ Direct match in popular niches: "${normalized}"`);
      return { type: 'known', canonicalNiche: normalized, confidence: 1.0, source: 'popular_niche' };
    }

    // Check aliases and synonyms
    const aliasMatch = this.findAliasMatch(normalized);
    if (aliasMatch) {
      console.log(`✅ Alias match: "${normalized}" → "${aliasMatch.canonical}"`);
      return { type: 'known', canonicalNiche: aliasMatch.canonical, confidence: aliasMatch.confidence, source: 'alias_match' };
    }

    // Check fuzzy matches
    const fuzzyMatch = this.findFuzzyMatch(normalized);
    if (fuzzyMatch && fuzzyMatch.confidence > 0.7) {
      console.log(`✅ Fuzzy match: "${normalized}" → "${fuzzyMatch.canonical}" (${fuzzyMatch.confidence})`);
      return { type: 'known', canonicalNiche: fuzzyMatch.canonical, confidence: fuzzyMatch.confidence, source: 'fuzzy_match' };
    }

    // Unknown niche
    console.log(`🆕 Unknown niche detected: "${normalized}"`);
    return { type: 'unknown', canonicalNiche: normalized, confidence: 1.0, source: 'unknown' };
  }

  normalizeNiche(input) {
    return String(input || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s-]/g, '');
  }

  findAliasMatch(normalized) {
    // Check popular niche synonyms
    for (const [canonical, data] of Object.entries(this.popularNiches)) {
      if (data.synonyms && Array.isArray(data.synonyms)) {
        const synonyms = data.synonyms.map(s => this.normalizeNiche(s));
        if (synonyms.includes(normalized)) return { canonical, confidence: 0.95 };
      }
    }

    // Hardcoded aliases
    const aliases = {
      'bbq': 'backyard', 'grilling': 'backyard', 'outdoor cooking': 'backyard', 'patio': 'backyard',
      'spa': 'wellness', 'relaxation': 'wellness', 'health': 'wellness',
      'horses': 'horse riding', 'equine': 'horse riding', 'riding': 'horse riding',
      'boats': 'marine', 'boating': 'marine', 'nautical': 'marine', 'water sports': 'marine',
      'home automation': 'smart home', 'iot': 'smart home', 'smart tech': 'smart home',
      'workout': 'fitness', 'exercise': 'fitness', 'gym': 'fitness', 'training': 'fitness',
      'drones': 'drone', 'uav': 'drone', 'quadcopter': 'drone'
    };

    return aliases[normalized] ? { canonical: aliases[normalized], confidence: 0.9 } : null;
  }

  findFuzzyMatch(normalized) {
    const words = normalized.split(' ');
    let bestMatch = null;
    let bestScore = 0;

    const allNiches = [...Object.keys(this.knownStores), ...Object.keys(this.popularNiches)];
    
    for (const niche of allNiches) {
      const score = this.calculateWordOverlap(words, niche.split(' '));
      if (score > bestScore && score > 0.5) {
        bestScore = score;
        bestMatch = niche;
      }
    }

    return bestMatch ? { canonical: bestMatch, confidence: bestScore } : null;
  }

  calculateWordOverlap(words1, words2) {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  getSimilarNiches(inputNiche, limit = 5) {
    const normalized = this.normalizeNiche(inputNiche);
    const words = normalized.split(' ');
    const similarities = [];
    
    const allNiches = [...Object.keys(this.knownStores), ...Object.keys(this.popularNiches)];
    
    for (const niche of allNiches) {
      const score = this.calculateWordOverlap(words, niche.split(' '));
      if (score > 0.2) similarities.push({ niche, score });
    }
    
    return similarities.sort((a, b) => b.score - a.score).slice(0, limit).map(item => item.niche);
  }
}
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Caching removed to avoid any cross-request memory

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Name.com API
const namecomAPI = process.env.NAMECOM_USERNAME && process.env.NAMECOM_TOKEN 
  ? new NameComAPI(process.env.NAMECOM_USERNAME, process.env.NAMECOM_TOKEN)
  : null;

// Initialize Competitor Finder with OpenAI API key for real-time generation
const competitorFinder = new CompetitorFinder(process.env.OPENAI_API_KEY);
const nicheClassifier = new NicheClassifier(competitorFinder);

// Initialize database (SQLite for local, in-memory for Vercel)
let db = null;
let isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

if (!isServerless) {
  // Use SQLite for local development
  try {
    sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database('domains.db');
    
    // Create tables if they don't exist
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS niches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS competitor_stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER,
        name TEXT,
        url TEXT,
        domain TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (niche_id) REFERENCES niches (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS generated_domains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER,
        domain TEXT,
        is_available BOOLEAN,
        price DECIMAL(10,2),
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (niche_id) REFERENCES niches (id)
      )`);

      // Cache of full API responses per niche (TTL 24h)
      db.run(`CREATE TABLE IF NOT EXISTS niches_cache (
        key TEXT PRIMARY KEY,
        data TEXT,
        hits INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ttl_seconds INTEGER DEFAULT 86400
      )`);
    });
    
    console.log('✅ SQLite database initialized for local development');
  } catch (error) {
    console.log('⚠️  SQLite not available, using in-memory storage');
    db = null;
  }
} else {
  console.log('🚀 Running in serverless environment, using in-memory storage');
}

// (Removed aiNicheCache – no AI memory/caching across requests)

// (Removed persistent AI memory integration)

// --- DB helper utilities (promisified) ---
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  if (!db) return resolve(null);
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  if (!db) return resolve([]);
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
});
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  if (!db) return resolve();
  db.run(sql, params, function(err) { return err ? reject(err) : resolve(this); });
});

async function getOrCreateNicheId(niche) {
  if (!db) return null;
  const existing = await dbGet('SELECT id FROM niches WHERE name = ?', [niche]);
  if (existing && existing.id) return existing.id;
  const inserted = await dbRun('INSERT INTO niches (name) VALUES (?)', [niche]);
  return inserted && inserted.lastID ? inserted.lastID : null;
}

async function fetchCuratedStores(niche) {
  if (!db) return [];
  const row = await dbGet('SELECT id FROM niches WHERE name = ?', [niche]);
  if (!row) return [];
  const stores = await dbAll('SELECT name, url, domain FROM competitor_stores WHERE niche_id = ?', [row.id]);
  return (stores || []).map(s => ({ name: s.name, url: s.url, domain: s.domain }));
}

async function replaceCuratedStores(niche, stores) {
  if (!db) return false;
  const nicheId = await getOrCreateNicheId(niche);
  if (!nicheId) return false;
  await dbRun('DELETE FROM competitor_stores WHERE niche_id = ?', [nicheId]);
  for (const s of (stores || [])) {
    if (!s || !s.domain) continue;
    await dbRun('INSERT INTO competitor_stores (niche_id, name, url, domain) VALUES (?, ?, ?, ?)', [
      nicheId,
      s.name || s.domain,
      s.url || `https://${String(s.domain).replace(/^https?:\/\//,'')}`,
      String(s.domain).replace(/^https?:\/\//,'').replace(/^www\./,'')
    ]);
  }
  return true;
}

// Quickly verify a list of stores are live, relevant, and high-ticket/dropship
async function quickVerifyStores(stores, niche, limit = 12) {
  try {
    if (!Array.isArray(stores) || stores.length === 0) return [];
    const verified = [];
    const knownSet = new Set();
    try {
      const knownWide = competitorFinder.getKnownStoresWide(niche) || [];
      const knownGlobal = competitorFinder.getKnownStoresGlobal() || [];
      for (const s of [...knownWide, ...knownGlobal]) {
        if (!s || !s.domain) continue;
        knownSet.add(String(s.domain).replace(/^www\./,'').toLowerCase());
      }
    } catch (_) {}
    const isTimedOut = () => false; // keep simple; this is a quick pass
    const batchSize = 8;
    for (let i = 0; i < stores.length && verified.length < limit; i += batchSize) {
      const batch = stores.slice(i, i + batchSize);
      await Promise.all(batch.map(async (c) => {
        if (!c || !c.domain || verified.length >= limit || isTimedOut()) return;
        try {
          const key = String(c.domain || '').replace(/^www\./,'').toLowerCase();
          const isKnownStore = knownSet.has(key);
          
          // For known database stores, only check if site exists (less strict)
          if (isKnownStore) {
            const exists = await competitorFinder.verifyStoreExists(c, { fastVerify: true });
            if (exists) {
              verified.push(c);
              return;
            }
            // If known store doesn't exist, don't process it further
            return;
          }
          
          // For other stores, apply full verification (silent for AI-generated)
          const exists = await competitorFinder.verifyStoreExists(c, { fastVerify: true, silentFail: true, isAIGenerated: true });
          if (!exists) return;
          const qualifies = await competitorFinder.qualifiesAsHighTicketDropshipping(c, { fastVerify: true, trustedKnown: false });
          if (!qualifies) return;
          const relevant = await competitorFinder.isRelevantToNiche(c, niche, { checkContent: false });
          if (!relevant) return;
          verified.push(c);
        } catch (_) {}
      }));
    }
    return verified.slice(0, limit);
  } catch (_) {
    return [];
  }
}

// Reusable audit helper
async function auditCompetitorsForNiche(niche, timeLimitMs = 120000) {
  const deadlineAt = Date.now() + Math.max(30000, timeLimitMs);
  const curated = await fetchCuratedStores(niche);
  const seed = [
    ...(curated || []),
    ...(competitorFinder.getKnownStoresWide(niche) || [])
  ];

  // Unique candidates by domain
  const unique = new Map();
  for (const s of seed) {
    if (!s || !s.domain) continue;
    const k = String(s.domain).replace(/^https?:\/\//,'').replace(/^www\./,'').toLowerCase();
    if (!unique.has(k)) unique.set(k, s);
  }
  const candidates = Array.from(unique.values());

  // Verify in parallel batches
  const verified = [];
  const batchSize = 10;
  for (let i = 0; i < candidates.length && Date.now() < deadlineAt && verified.length < 12; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    await Promise.all(batch.map(async (c) => {
      if (verified.length >= 12 || Date.now() >= deadlineAt) return;
      try {
        const exists = await competitorFinder.verifyStoreExists(c, { fastVerify: false });
        if (!exists) return;
        const qualifies = await competitorFinder.qualifiesAsHighTicketDropshipping(c, { fastVerify: false });
        if (qualifies) verified.push(c);
      } catch (_) {}
    }));
  }

  // Supplement via niche-targeted strict finder if still low and time remains
  if (verified.length < 5 && Date.now() < deadlineAt) {
    const strict = await competitorFinder.getVerifiedCompetitorsWithCache(niche, { fast: false, deadlineAt });
    for (const s of (strict || [])) {
      if (verified.length >= 12 || Date.now() >= deadlineAt) break;
      const k = String(s.domain || '').replace(/^https?:\/\//,'').replace(/^www\./,'').toLowerCase();
      if (!k) continue;
      // ensure uniqueness
      if (verified.find(v => String(v.domain).toLowerCase() === k)) continue;
      verified.push(s);
    }
  }

  // Final top-up: ensure at least 5 by using trusted known stores (fast verification, shallow relevance)
  if (verified.length < 5 && Date.now() < deadlineAt) {
    const seen = new Set(verified.map(v => String(v.domain || '').replace(/^https?:\/\//,'').replace(/^www\./,'').toLowerCase()));
    const candidates = [
      ...(competitorFinder.getKnownStoresWide(niche) || []),
      ...(competitorFinder.getKnownStoresGlobal() || [])
    ];
    for (const c of candidates) {
      if (verified.length >= 5 || Date.now() >= deadlineAt) break;
      const key = String(c.domain || '').replace(/^https?:\/\//,'').replace(/^www\./,'').toLowerCase();
      if (!key || seen.has(key)) continue;
      try {
        const relevant = await competitorFinder.isRelevantToNiche(c, niche, { checkContent: false });
        if (!relevant) continue;
        const exists = await competitorFinder.verifyStoreExists(c, { fastVerify: true });
        if (!exists) continue;
        const qualifies = await competitorFinder.qualifiesAsHighTicketDropshipping(c, { fastVerify: true, trustedKnown: true });
        if (!qualifies) continue;
        verified.push(c);
        seen.add(key);
      } catch (_) {}
    }
  }

  // Persist a stable top set (up to 10) as curated for this niche
  const toSave = verified.slice(0, 10);
  if (toSave.length > 0) {
    await replaceCuratedStores(niche, toSave);
  }

  return { niche, audited: verified.length, saved: toSave.length, competitors: toSave };
}

// Helper function to search for high-ticket dropshipping stores
async function findCompetitorStores(niche) {
  try {
    console.log(`Finding dropshipping competitors for niche: ${niche}`);
    // Use verified competitors only (live websites)
    const competitors = await competitorFinder.getVerifiedCompetitorsWithCache(niche);
    return competitors.slice(0, 5);
  } catch (error) {
    console.error('Error finding dropshipping competitor stores:', error);
    return [];
  }
}

// Analyze domain patterns using ChatGPT with AI-powered niche analysis
async function analyzeDomainPatterns(competitorDomains, niche) {
  console.log(`🤖 Starting AI analysis for "${niche}" niche...`);
  
  // Get niche keywords from database first, then AI if needed
  const nicheLower = (niche || '').toLowerCase().trim();
  const nicheKeywords = await extractNicheKeywords(niche); // This now prioritizes database
  
  // Get industry terms (still use AI for broader context)
  const analysis = await analyzeNicheWithAI(niche);
  const industryTerms = (analysis && analysis.industryTerms) ? analysis.industryTerms : await extractIndustryTerms(competitorDomains, niche);
  
  const domains = competitorDomains.map(store => store.domain).join(', ');
  
  const prompt = `Analyze these ${niche} industry domain names: ${domains}

Based on the niche "${niche}", provide a JSON response:
{
  "patterns": {
    "averageLength": number,
    "wordCount": "2-3 words",
    "commonStructures": ["adjective + noun", "brand + category", etc.]
  },
  "recommendations": {
    "lengthRange": "7-20 characters",
    "preferredStructure": "description",
    "avoidTerms": ["specific product names that are too narrow"]
  }
}

Focus on domain patterns that work for premium ${niche} businesses.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    const content = response.choices[0].message.content.trim();
    
    // Try to extract JSON from the response
    let jsonStart = content.indexOf('{');
    let jsonEnd = content.lastIndexOf('}') + 1;
    
    let patterns = {};
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonStr = content.substring(jsonStart, jsonEnd);
      patterns = JSON.parse(jsonStr);
    } else {
      // Fallback patterns
      patterns = {
        patterns: {
          averageLength: 15,
          wordCount: "2-3 words",
          commonStructures: ["brand + category", "adjective + noun"]
        },
        recommendations: {
          lengthRange: "7-20 characters",
          preferredStructure: "Use 2-3 word combinations with industry terms",
          avoidTerms: ["overly specific product names"]
        }
      };
    }
    
    // Add the AI-generated terms
    patterns.industryTerms = industryTerms;
    patterns.nicheKeywords = nicheKeywords;
    
    console.log(`✅ Analysis complete for "${niche}":`, {
      industryTerms: industryTerms.length,
      nicheKeywords: nicheKeywords.length
    });
    
    // Add dynamic recommendations to the successful analysis
    patterns.recommendations = await generateDynamicRecommendations(niche, patterns.industryTerms, patterns.nicheKeywords, competitorDomains);
    
    return patterns;
    
  } catch (error) {
    console.error('Error analyzing patterns:', error);
    
    // Return a fallback pattern analysis with AI terms
    return {
      patterns: {
        averageLength: 15,
        wordCount: "2-3 words",
        commonStructures: ["brand + category", "adjective + noun"]
      },
      industryTerms: industryTerms,
      nicheKeywords: nicheKeywords,
      recommendations: await generateDynamicRecommendations(niche, industryTerms, nicheKeywords, [])
    };
  }
}

// Generate dynamic, niche-specific recommendations
async function generateDynamicRecommendations(niche, industryTerms, nicheKeywords, competitorDomains) {
  const prompt = `Generate specific domain recommendations for a high-ticket ${niche} e-commerce store (products $1000+).

NICHE CONTEXT: ${niche}
INDUSTRY TERMS: ${industryTerms.join(', ')}
NICHE KEYWORDS: ${nicheKeywords.join(', ')}
COMPETITOR EXAMPLES: ${competitorDomains.join(', ')}

Generate 4-6 SPECIFIC recommendations tailored to this niche:

1. OPTIMAL LENGTH: What character range works best for ${niche} domains?
2. BEST STRUCTURES: What domain patterns work for ${niche} brands?
3. KEY TERMS TO USE: Which ${niche}-specific words create trust?
4. TERMS TO AVOID: What ${niche} terms are too narrow or problematic?
5. BRAND POSITIONING: How should ${niche} domains sound to attract $1000+ customers?

Make recommendations SPECIFIC to ${niche}, not generic advice.

Return ONLY a JSON object:
{
  "optimalLength": "specific range for this niche",
  "bestStructures": ["structure 1", "structure 2", "structure 3"],
  "keyTerms": ["term1", "term2", "term3"],
  "avoidTerms": ["avoid1", "avoid2", "avoid3"],
  "brandPositioning": "how domains should sound for this niche"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4
    });

    const content = response.choices[0].message.content.trim();
    
    // Extract JSON from response
    let jsonStart = content.indexOf('{');
    let jsonEnd = content.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonStr = content.substring(jsonStart, jsonEnd);
      const aiRecs = JSON.parse(jsonStr);

      // Post-process to enforce niche-specificity
      const normalizedNiche = String(niche || '').toLowerCase().trim();
      const dbTerms = DOMAIN_DATABASES.nicheTerms[normalizedNiche] || DOMAIN_DATABASES.nicheTerms[normalizedNiche.replace(/\s+/g, ' ')] || [];
      const dbVariations = DOMAIN_DATABASES.nicheVariations[normalizedNiche] || [];

      const genericAdjectives = new Set(['luxury','premium','elite','deluxe','upscale','exclusive','high-end','high end','pro','master','masters','best','top']);
      const normalize = (w) => String(w || '').toLowerCase().trim();
      const unique = (arr) => Array.from(new Set(arr.map(normalize))).filter(Boolean);

      // Build key terms from DB + AI signals, filter out generic adjectives
      const builtKeyTerms = unique([
        ...dbTerms,
        ...dbVariations,
        ...industryTerms,
        ...nicheKeywords,
        ...(aiRecs.keyTerms || [])
      ]).filter(t => !genericAdjectives.has(t)).slice(0, 12);

      // Build avoid terms dynamically
      const globalAvoid = ['cheap','budget','discount','sale','clearance','outlet','deal','bargain','wholesale','lowcost','hyphens','numbers','misspellings'];
      const nicheAvoid = (DOMAIN_DATABASES.nicheAvoid && DOMAIN_DATABASES.nicheAvoid[normalizedNiche]) ? DOMAIN_DATABASES.nicheAvoid[normalizedNiche] : [];
      const builtAvoid = unique([...(aiRecs.avoidTerms || []), ...nicheAvoid, ...globalAvoid]).slice(0, 12);

      return {
        optimalLength: aiRecs.optimalLength || '7-20 characters',
        bestStructures: aiRecs.bestStructures || [],
        keyTerms: builtKeyTerms,
        avoidTerms: builtAvoid,
        brandPositioning: aiRecs.brandPositioning || `Should sound premium and trustworthy for high-ticket ${niche} customers`
      };
    }
    
    // Fallback if JSON parsing fails
    return generateFallbackRecommendations(niche, industryTerms, nicheKeywords);
    
  } catch (error) {
    console.error('Error generating dynamic recommendations:', error);
    return generateFallbackRecommendations(niche, industryTerms, nicheKeywords);
  }
}

// Fallback recommendations when AI fails
function generateFallbackRecommendations(niche, industryTerms, nicheKeywords) {
  const normalizedNiche = String(niche || '').toLowerCase().trim();
  const dbTerms = DOMAIN_DATABASES.nicheTerms[normalizedNiche] || [];
  const dbVariations = DOMAIN_DATABASES.nicheVariations[normalizedNiche] || [];
  const genericAdjectives = new Set(['luxury','premium','elite','deluxe','upscale','exclusive','high-end','high end','pro','master','masters','best','top']);
  const normalize = (w) => String(w || '').toLowerCase().trim();
  const unique = (arr) => Array.from(new Set(arr.map(normalize))).filter(Boolean);

  const keyTerms = unique([
    ...dbTerms,
    ...dbVariations,
    ...industryTerms,
    ...nicheKeywords
  ]).filter(t => !genericAdjectives.has(t)).slice(0, 12);

  const globalAvoid = ['cheap','budget','discount','sale','clearance','outlet','deal','bargain','wholesale','lowcost','hyphens','numbers','misspellings'];
  const nicheAvoid = (DOMAIN_DATABASES.nicheAvoid && DOMAIN_DATABASES.nicheAvoid[normalizedNiche]) ? DOMAIN_DATABASES.nicheAvoid[normalizedNiche] : [];
  const avoidTerms = unique([...nicheAvoid, ...globalAvoid]).slice(0, 12);

  return {
    optimalLength: "7-20 characters",
    bestStructures: [
      `${niche} + premium suffix (${niche}Pro.com)`,
      `Brand + ${niche} term (Lux${niche}.com)`,
      `Creative ${niche} wordplay`
    ],
    keyTerms,
    avoidTerms,
    brandPositioning: `Should sound premium and trustworthy for high-ticket ${niche} customers`
  };
}

// Utility: remove generic prefixes/suffixes from niche keywords before returning to client
function removePrefixesAndSuffixesFromKeywords(niche, keywords = []) {
  try {
    const lower = (s) => String(s || '').toLowerCase().trim();
    const normalized = lower(String(niche || '').replace(/\s+/g, ' '));

    // Build base words for this niche from DB terms, variations and popular synonyms
    const baseSources = [];
    if (DOMAIN_DATABASES.nicheTerms && DOMAIN_DATABASES.nicheTerms[normalized]) baseSources.push(...DOMAIN_DATABASES.nicheTerms[normalized]);
    if (DOMAIN_DATABASES.nicheVariations && DOMAIN_DATABASES.nicheVariations[normalized]) baseSources.push(...DOMAIN_DATABASES.nicheVariations[normalized]);
    if (DOMAIN_DATABASES.popularNiches && DOMAIN_DATABASES.popularNiches[normalized] && Array.isArray(DOMAIN_DATABASES.popularNiches[normalized].synonyms)) {
      baseSources.push(...DOMAIN_DATABASES.popularNiches[normalized].synonyms);
    }
    // Always include the niche itself
    baseSources.push(normalized);

    const tokenize = (t) => lower(t).split(/[^a-z0-9]+/).filter(Boolean);

    const baseWords = new Set();
    for (const term of baseSources) {
      for (const tok of tokenize(term)) {
        if (tok.length >= 3) baseWords.add(tok);
      }
    }

    // Generic adjectives/prefixes and generic suffix nouns likely to appear
    const genericPrefixes = new Set([
      'luxury','premium','elegant','highend','elite','prime','pro','smart','modern','advanced','ultimate','deluxe','best','top','master','expert'
    ]);
    const suffixList = (DOMAIN_DATABASES.suffixes || []).map(lower);
    const genericSuffixes = new Set([
      ...suffixList,
      'paradise','retreat','retreats','oasis','world','club'
    ]);

    const simplify = (kw) => {
      const raw = lower(kw).replace(/[^a-z0-9]/g, '');
      if (!raw) return null;

      // If raw exactly matches a generic prefix/suffix, drop it
      if (genericPrefixes.has(raw) || genericSuffixes.has(raw)) return null;

      // Prefer longest base word contained in the keyword (handles concatenations like luxurybackyard)
      let best = null;
      for (const base of baseWords) {
        if (raw.includes(base)) {
          if (!best || base.length > best.length) best = base;
        }
      }
      if (best) return best;

      // As fallback, try to strip leading known adjectives and trailing generic suffixes if tokenized
      const tokens = raw.split(/(?=[A-Z])/); // unlikely camelCase; fallback below
      if (tokens.length > 1) {
        let arr = tokens.map(lower).filter(Boolean);
        while (arr.length && genericPrefixes.has(arr[0])) arr.shift();
        while (arr.length && genericSuffixes.has(arr[arr.length - 1])) arr.pop();
        const joined = arr.join('');
        if (joined && baseWords.has(joined)) return joined;
      }

      // If nothing matched, keep keyword only if not generic
      return (genericPrefixes.has(raw) || genericSuffixes.has(raw)) ? null : raw;
    };

    const cleaned = [];
    const seen = new Set();
    for (const k of (keywords || [])) {
      const s = simplify(k);
      if (!s) continue;
      if (s.length < 3) continue;
      if (seen.has(s)) continue;
      seen.add(s);
      cleaned.push(s);
    }
    
    // FINAL SAFETY: Force all keywords to be single words only
    const singleWords = cleaned
      .flatMap(keyword => String(keyword).split(/[,\s]+/)) // Split any remaining phrases
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length > 2 && /^[a-z]+$/.test(word)) // Only single words, letters only
      .slice(0, 8); // Limit to 8 words max
    
    return singleWords;
  } catch (_) {
    return keywords || [];
  }
}

// AI-powered niche analysis using OpenAI (fast model)
async function analyzeNicheWithAI(niche) {
  const prompt = `Analyze the "${niche}" niche for high-ticket dropshipping business.

Provide a JSON response with:
{
  "industryTerms": ["term1", "term2", ...],
  "nicheKeywords": ["keyword1", "keyword2", ...],
  "productCategories": ["category1", "category2", ...],
  "targetCustomer": "description",
  "priceRange": "$X - $Y",
  "seasonality": "description"
}

Requirements:
- industryTerms: Broad SINGLE WORDS that describe the entire industry (8-10 single words only)
- nicheKeywords: SINGLE WORDS only for domain names (5-7 single words, NO PHRASES)
- productCategories: Main product types sold in this niche
- Focus on high-ticket items ($500+)
- Avoid overly specific product names
- Think about what premium customers would search for

CRITICAL: nicheKeywords must be single words only. Examples: ["furniture", "decor", "luxury", "design"] NOT ["luxury furniture", "designer home decor"]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    const content = response.choices[0].message.content.trim();
    let jsonStart = content.indexOf('{');
    let jsonEnd = content.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonStr = content.substring(jsonStart, jsonEnd);
      const analysis = JSON.parse(jsonStr);
      
      // Force nicheKeywords to be single words only
      if (analysis.nicheKeywords && Array.isArray(analysis.nicheKeywords)) {
        analysis.nicheKeywords = analysis.nicheKeywords
          .flatMap(keyword => keyword.split(/[,\s]+/)) // Split on commas and spaces
          .map(word => word.trim().toLowerCase())
          .filter(word => word.length > 2 && /^[a-z]+$/.test(word)) // Only single words, letters only
          .slice(0, 7); // Limit to 7 words max
      }
      
      return analysis;
    } else {
      throw new Error('No valid JSON found in AI response');
    }
  } catch (error) {
    console.error('Error in AI niche analysis:', error);
    return null;
  }
}

// Helper function to extract industry terms from domains (with AI fallback)
async function extractIndustryTerms(competitorDomains, niche) {
  // First, try AI analysis
  const aiAnalysis = await analyzeNicheWithAI(niche);
  if (aiAnalysis && aiAnalysis.industryTerms) {
    console.log(`✅ AI analyzed "${niche}" niche:`, aiAnalysis.industryTerms);
    return aiAnalysis.industryTerms;
  }

  // Fallback to manual extraction
  console.log(`⚠️  Using fallback analysis for "${niche}"`);
  const terms = new Set();
  
  // Extract terms from competitor domains
  competitorDomains.forEach(store => {
    const domain = store.domain.replace('.com', '').toLowerCase();
    const words = domain.split(/[^a-z]+/);
    words.forEach(word => {
      if (word.length > 3 && word.length < 12) {
        terms.add(word);
      }
    });
  });

  // Add the niche itself
  terms.add(niche.toLowerCase());
  
  return Array.from(terms).slice(0, 8);
}

// Helper function to extract niche keywords (database first, AI fallback)
async function extractNicheKeywords(niche) {
  const normalizedNiche = String(niche || '').toLowerCase().trim().replace(/\s+/g, ' ');
  
  // First, try to get keywords from database
  let databaseKeywords = [];
  
  // Check strictNicheKeywords first
  if (DOMAIN_DATABASES.strictNicheKeywords && DOMAIN_DATABASES.strictNicheKeywords[normalizedNiche]) {
    databaseKeywords = DOMAIN_DATABASES.strictNicheKeywords[normalizedNiche];
    console.log(`✅ Using strict database keywords for "${niche}":`, databaseKeywords);
  }
  // Then check nicheTerms
  else if (DOMAIN_DATABASES.nicheTerms && DOMAIN_DATABASES.nicheTerms[normalizedNiche]) {
    databaseKeywords = DOMAIN_DATABASES.nicheTerms[normalizedNiche];
    console.log(`✅ Using database terms for "${niche}":`, databaseKeywords);
  }
  // Check nicheVariations as backup
  else if (DOMAIN_DATABASES.nicheVariations && DOMAIN_DATABASES.nicheVariations[normalizedNiche]) {
    databaseKeywords = DOMAIN_DATABASES.nicheVariations[normalizedNiche];
    console.log(`✅ Using database variations for "${niche}":`, databaseKeywords);
  }
  
  // If we found database keywords, process them to single words and return
  if (databaseKeywords.length > 0) {
    const processedKeywords = databaseKeywords
      .flatMap(keyword => String(keyword).split(/[,\s]+/)) // Split any phrases
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length > 2 && /^[a-z]+$/.test(word)) // Only single words, letters only
      .slice(0, 7); // Limit to 7 words
    
    if (processedKeywords.length > 0) {
      return processedKeywords;
    }
  }

  // Fallback to AI analysis if no database keywords found
  console.log(`🤖 No database keywords found for "${niche}", trying AI analysis...`);
  const aiAnalysis = await analyzeNicheWithAI(niche);
  if (aiAnalysis && aiAnalysis.nicheKeywords) {
    console.log(`✅ AI generated keywords for "${niche}":`, aiAnalysis.nicheKeywords);
    return aiAnalysis.nicheKeywords;
  }

  // Final fallback to basic keywords
  console.log(`⚠️  Using fallback keywords for "${niche}"`);
  return [niche.toLowerCase(), 'premium', 'luxury', 'professional'];
}

// Generate domain suggestions - OPTIMIZED for speed
async function generateDomains(niche, patterns, count = 20) {
  console.log(`🎯 Generating ${count} domains for high-ticket ${niche} niche...`);
  
  const nicheKeywords = patterns.nicheKeywords || [];
  const industryTerms = patterns.industryTerms || [];
  
  // Get niche-specific terms from database
  const normalizedNiche = niche.toLowerCase().replace(/\s+/g, ' ').trim();
  const nicheTermsFromDB = DOMAIN_DATABASES.nicheTerms[normalizedNiche] || 
                           DOMAIN_DATABASES.nicheTerms[niche.toLowerCase()] || [];
  const poeticDescriptors = DOMAIN_DATABASES.poeticDescriptors[normalizedNiche] || 
                           DOMAIN_DATABASES.poeticDescriptors[niche.toLowerCase()] || [];

  // Generate fewer domains for speed: 10 professional + 10 poetic = 20 total
  const professionalDomains = await generateProfessionalDomains(niche, nicheTermsFromDB, nicheKeywords, industryTerms, 10);
  
  const poeticDomains = await generatePoeticDomains(niche, nicheTermsFromDB, poeticDescriptors, 10);
  
  // Filter out domains that use the exact niche term – enforce broader keywords
  const allRaw = [...professionalDomains, ...poeticDomains];
  const exact = String(niche || '').toLowerCase().replace(/\s+/g, '');
  const isBroad = (d) => {
    const base = String(d || '').toLowerCase().replace(/\.com$/, '');
    return !base.includes(exact);
  };
  let allDomains = allRaw.filter(isBroad);
  // If filtering removed too many, keep some originals but deprioritize later via scoring
  if (allDomains.length < Math.min(20, count)) {
    const missing = Math.min(count, allRaw.length) - allDomains.length;
    for (const d of allRaw) {
      if (allDomains.length >= Math.min(count, allRaw.length)) break;
      if (!allDomains.includes(d)) allDomains.push(d);
    }
  }
  
  // CRITICAL: Filter out domains with incomplete words
  console.log(`🔍 Validating ${allDomains.length} domains for complete words...`);
  const validDomains = allDomains.filter(domain => hasCompleteWords(domain));
  console.log(`✅ ${validDomains.length}/${allDomains.length} domains passed complete word validation`);
  
  // PREMIUM FILTER: Remove cheap-sounding domain names
  console.log(`🏆 Filtering out cheap-sounding domains...`);
  const premiumDomains = validDomains.filter(domain => isPremiumDomain(domain));
  console.log(`✅ ${premiumDomains.length}/${validDomains.length} domains passed premium validation`);
  
  // If we filtered out too many, generate more to compensate
  if (premiumDomains.length < count * 0.7) {
    console.log(`⚠️  Need more premium domains. Generating additional domains...`);
    const additionalProfessional = await generateProfessionalDomains(niche, nicheTermsFromDB, nicheKeywords, industryTerms, 5);
    const additionalPoetic = await generatePoeticDomains(niche, nicheTermsFromDB, poeticDescriptors, 5);
    const additionalValid = [...additionalProfessional, ...additionalPoetic]
      .filter(domain => hasCompleteWords(domain))
      .filter(domain => isPremiumDomain(domain));
    premiumDomains.push(...additionalValid);
    console.log(`📈 Added ${additionalValid.length} more premium domains`);
  }
  
  allDomains = premiumDomains;
  console.log(`✅ Generated ${professionalDomains.length} professional + ${poeticDomains.length} poetic = ${allDomains.length} total domains`);
  
  return allDomains;
}

// Generate Professional Domains: Short, brandable, professional
async function generateProfessionalDomains(niche, nicheTerms, nicheKeywords, industryTerms, count = 20) {
    const prompt = `Generate ${count} SHORT, professional domain names for a high-ticket ${niche} e-commerce store (products $1000+).

🎯 CRITICAL REQUIREMENTS:
✅ All domains MUST be clearly related to ${niche}
✅ Use ONLY complete, real words - ABSOLUTELY NO truncated or made-up words
✅ Each word in the domain must be a real, recognizable English word
✅ FORBIDDEN: "HomeSanct" (should be "HomeSanctuary"), "ProFire" is OK, "ProFir" is NOT
✅ FORBIDDEN: "GreenLand" is OK, "GreenLan" is NOT
✅ FORBIDDEN: Any word that looks cut off or incomplete
✅ 7-20 characters total (prioritize complete words over length limits)
✅ Every single word must be complete and recognizable

NICHE CONTEXT: ${niche}
INDUSTRY TERMS: ${industryTerms.join(', ')}
NICHE KEYWORDS: ${nicheKeywords.join(', ')}

DOMAIN CREATION STRATEGY:
1. Use complete ${niche} industry terms: ${industryTerms.slice(0, 3).join(', ')}
2. Combine with complete prefixes: Pro, Elite, Prime, Lux, Smart, etc.
3. Add complete premium suffixes: Pro, Hub, Zone, Direct, Co, etc.
4. Create ${niche}-specific brand names using full words only

STRICT CONSTRAINTS:
- Do NOT include the exact word "${niche}" or the concatenated variant "${niche.replace(/\s+/g,'')}" in the domain.
- Use broader industry/category words (e.g., outdoor, living, home, supply, gear) rather than the exact product term.

VALID EXAMPLES FOR ${niche}:
${niche === 'backyard' ? '- YardPro.com, PatioHub.com, GreenZone.com, LawnElite.com, DeckDirect.com' : ''}
${niche === 'marine' ? '- BoatPro.com, YachtHub.com, SeaElite.com, MarineZone.com, OceanDirect.com' : ''}
${niche === 'fitness' ? '- GymPro.com, FitHub.com, PowerZone.com, StrengthElite.com, SportDirect.com' : ''}
- Generic: Use complete ${niche} words + complete suffixes

INVALID EXAMPLES (DO NOT GENERATE):
❌ Greensanct.com (should be GreenSanctuary.com)
❌ Prolansk.com (should be ProLandscape.com)  
❌ Luxlansk.com (should be LuxLandscape.com)
❌ Any domain with partial/truncated words
❌ CHEAP-SOUNDING DOMAINS: YardStore.com, GardenShop.com, PoolMart.com, FitnessOutlet.com, MarineWarehouse.com
❌ GENERIC TERMS: QuickYard.com, EasyGarden.com, BudgetPool.com, ValueFitness.com, DiscountMarine.com
❌ Any domain that contains the exact word "${niche}" or "${niche.replace(/\s+/g,'')}"

VALIDATION: Each domain must pass this test:
- Can I pronounce every part of this domain?
- Does each word component exist in English?
- Would a customer understand what each word means?

Return ONLY a JSON array: ["domain1.com", "domain2.com", ...]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    return extractDomainsFromResponse(response.choices[0].message.content, count);
  } catch (error) {
    console.error('Error generating professional domains:', error);
    return generateFallbackProfessionalDomains(niche, nicheTerms, count);
  }
}

// Generate Poetic/Descriptive Domains: Creative and catchy
async function generatePoeticDomains(niche, nicheTerms, poeticDescriptors, count = 20) {
    const prompt = `Generate ${count} SHORT, creative domain names for a high-ticket ${niche} e-commerce store.

🎯 CRITICAL REQUIREMENTS:
✅ All domains MUST be clearly related to ${niche}
✅ Use ONLY complete, real words - ABSOLUTELY NO truncated or made-up words
✅ Each word in the domain must be a real, recognizable English word
✅ FORBIDDEN: "FireSanct" (should be "FireSanctuary"), "BlueOce" (should be "BlueOcean")
✅ FORBIDDEN: "PremHeat" (should be "PremiumHeat"), "GoldFin" (should be "GoldFinish")
✅ FORBIDDEN: Any word that looks cut off or incomplete
✅ 6-20 characters total (prioritize complete words over length limits)
✅ Creative, catchy, memorable
✅ Easy to spell and pronounce
✅ Every single word must be complete and recognizable

NICHE CONTEXT: ${niche}
NICHE TERMS: ${nicheTerms.join(', ')}
CREATIVE DESCRIPTORS: ${poeticDescriptors.join(', ')}

DOMAIN CREATION STRATEGY:
- Use complete ${niche} words + complete creative suffixes
- Combine real words that relate to ${niche}
- Create brandable names using full words only

VALID CREATIVE EXAMPLES FOR ${niche}:
${niche === 'backyard' ? '- YardCraft.com, GreenSpace.com, PatioClub.com, LawnCo.com, DeckCraft.com' : ''}
${niche === 'marine' ? '- BoatCraft.com, SeaCo.com, YachtClub.com, OceanCraft.com, WaveCo.com' : ''}
${niche === 'fitness' ? '- GymCraft.com, FitCo.com, PowerClub.com, SportCraft.com, StrengthCo.com' : ''}
- Generic: Use complete ${niche} words + Craft/Co/Club/Space/Zone

STRICT CONSTRAINTS:
- Do NOT include the exact word "${niche}" or the concatenated variant "${niche.replace(/\s+/g,'')}" in the domain.
- Prefer broader category words instead of the exact product term.

CREATE DOMAINS THAT:
- Use creative wordplay with complete ${niche} words
- Sound modern and memorable
- Are brandable like tech startups
- Convey premium quality
- Could work as luxury ${niche} brand names

VALIDATION: Each domain must pass this test:
- Can I pronounce every part of this domain?
- Does each word component exist in English?
- Would a customer understand what each word means?
- Is it clearly related to ${niche}?

AVOID:
- Truncated words or abbreviations
- Generic luxury terms unrelated to ${niche}
- Long compound words
- Made-up words
- CHEAP-SOUNDING WORDS: Store, Shop, Mart, Market, Outlet, Warehouse, Depot, Discount, Bargain, Quick, Easy, Budget
- GENERIC TERMS: Online, Digital, Express, Standard, Basic, Universal, World, Global
- The exact term "${niche}" or "${niche.replace(/\s+/g,'')}"

Return ONLY a JSON array: ["domain1.com", "domain2.com", ...]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8
    });

    return extractDomainsFromResponse(response.choices[0].message.content, count);
  } catch (error) {
    console.error('Error generating poetic domains:', error);
    return generateFallbackPoeticDomains(niche, nicheTerms, poeticDescriptors, count);
  }
}

// Helper function to extract domains from ChatGPT response
function extractDomainsFromResponse(content, maxCount) {
  const trimmed = content.trim();
  
  // Try to extract JSON array
  let jsonStart = trimmed.indexOf('[');
  let jsonEnd = trimmed.lastIndexOf(']') + 1;
  
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      const jsonStr = trimmed.substring(jsonStart, jsonEnd);
      const domains = JSON.parse(jsonStr);
      return domains.slice(0, maxCount);
    } catch (e) {
      console.log('JSON parse failed, trying text extraction...');
    }
  }
  
  // Fallback: extract domains from text
  const domains = [];
  const lines = trimmed.split('\n');
  for (const line of lines) {
    const match = line.match(/([a-zA-Z0-9-]+\.com)/g);
    if (match) {
      domains.push(...match);
    }
  }
  
  return domains.slice(0, maxCount);
}

// Fallback professional domain generation - COMPLETE WORDS ONLY
function generateFallbackProfessionalDomains(niche, nicheTerms, count = 20) {
  const domains = [];
  const completePrefixes = ['Pro', 'Elite', 'Apex', 'Prime', 'Top', 'Best', 'Max', 'Ultra', 'Super'];
  const completeSuffixes = ['Pro', 'Hub', 'Zone', 'Direct', 'Plus', 'Max', 'Co', 'Labs'];
  
  // Use complete niche terms instead of truncated niche
  const completeNicheTerms = [...nicheTerms, niche.replace(/\s+/g, '')];
  
  // Generate domains with complete words only
  for (const prefix of completePrefixes) {
    for (const nicheTerm of completeNicheTerms) {
      if (domains.length < count && hasCompleteWords(`${prefix}${nicheTerm}.com`)) {
        domains.push(`${prefix}${nicheTerm}.com`);
      }
      if (domains.length >= count) break;
    }
    if (domains.length >= count) break;
  }
  
  // Add suffix combinations if we need more
  for (const suffix of completeSuffixes) {
    for (const nicheTerm of completeNicheTerms) {
      if (domains.length < count && hasCompleteWords(`${nicheTerm}${suffix}.com`)) {
        domains.push(`${nicheTerm}${suffix}.com`);
      }
      if (domains.length >= count) break;
    }
    if (domains.length >= count) break;
  }
  
  // Filter to ensure all domains have complete words and are premium
  const validDomains = domains.filter(domain => hasCompleteWords(domain) && isPremiumDomain(domain));
  console.log(`✅ Fallback generated ${validDomains.length} premium domains with complete words`);
  
  return validDomains.slice(0, count);
}

// Fallback poetic domain generation - COMPLETE WORDS ONLY
function generateFallbackPoeticDomains(niche, nicheTerms, descriptors, count = 20) {
  const domains = [];
  const completeCreativeWords = ['Zen', 'Flux', 'Echo', 'Bolt', 'Sage', 'Prism', 'Nexus', 'Vibe', 'Pure', 'Peak', 'Core', 'Flow', 'Wave', 'Spark'];
  
  // Use complete niche terms and descriptors (no truncation!)
  const completeTerms = [...nicheTerms, ...descriptors, niche.replace(/\s+/g, '')];
  
  // Generate combinations with complete words only
  for (const creativeWord of completeCreativeWords) {
    for (const term of completeTerms) {
      if (domains.length < count && hasCompleteWords(`${creativeWord}${term}.com`)) {
        domains.push(`${creativeWord}${term}.com`);
      }
      if (domains.length >= count) break;
    }
    if (domains.length >= count) break;
  }
  
  // Reverse combinations if we need more
  for (const term of completeTerms) {
    for (const creativeWord of completeCreativeWords) {
      if (domains.length < count && hasCompleteWords(`${term}${creativeWord}.com`)) {
        domains.push(`${term}${creativeWord}.com`);
      }
      if (domains.length >= count) break;
    }
    if (domains.length >= count) break;
  }
  
  // Filter to ensure all domains have complete words and are premium
  const validDomains = domains.filter(domain => hasCompleteWords(domain) && isPremiumDomain(domain));
  console.log(`✅ Fallback poetic generated ${validDomains.length} premium domains with complete words`);
  
  return validDomains.slice(0, count);
}

// Check domain availability using Name.com API
async function checkDomainAvailability(domains) {
  if (namecomAPI) {
    try {
      console.log(`Checking availability for ${domains.length} domains...`);
      const results = await namecomAPI.checkMultipleDomains(domains);
      
      // Accept ONLY real API prices (exclude any simulated fallbacks)
      return results
        .filter(result => result && result.available && result.price != null && !result.fallback)
        .filter(result => result.price < 100) // keep sub-$100 only per product requirements
        .map(result => ({
          domain: result.domain,
          available: true,
          price: parseFloat(result.price)
        }));
    } catch (error) {
      console.error('Error checking domains with Name.com API:', error);
    }
  }
  
  // Fallback to mock data if API is not configured
  console.log('Using mock domain availability data...');
  const results = [];
  
  for (const domain of domains) {
    try {
      const isAvailable = Math.random() > 0.7; // Mock availability
      const price = isAvailable ? Math.floor(Math.random() * 50) + 10 : null;
      
      if (isAvailable && price < 100) {
        results.push({
          domain,
          available: true,
          price: price
        });
      }
    } catch (error) {
      console.error(`Error checking ${domain}:`, error);
    }
  }

  return results;
}

// Domain scoring algorithm
function calculateDomainScore(domainObj, niche, patterns) {
  const domain = domainObj.domain.replace('.com', '');
  let score = 0;

  // Penalize domains that include the exact niche term (broad-keyword enforcement)
  const normalizedNiche = String(niche || '').toLowerCase().replace(/\s+/g, '');
  const domainLower = domain.toLowerCase();
  if (normalizedNiche && domainLower.includes(normalizedNiche)) {
    score -= 40; // strong penalty to push exact-niche domains down
  }

  // Length scoring (HEAVILY prioritize shorter domains)
  const length = domain.length;
  if (length >= 4 && length <= 6) score += 50;      // PERFECT - very short
  else if (length >= 7 && length <= 9) score += 35;  // EXCELLENT - short
  else if (length >= 10 && length <= 12) score += 20; // Good - medium
  else if (length >= 13 && length <= 15) score += 5;  // Acceptable
  else if (length < 4) score -= 10;                   // Too short
  else score -= 15;                                   // Too long

  // Price scoring (lower price is better)
  const price = domainObj.price || 50;
  if (price <= 20) score += 25;
  else if (price <= 40) score += 15;
  else if (price <= 60) score += 10;
  else if (price <= 80) score += 5;

  // Keyword relevance scoring
  const nicheKeywords = patterns.nicheKeywords || [];
  const industryTerms = patterns.industryTerms || [];
  const allKeywords = [...nicheKeywords, ...industryTerms].map(k => k.toLowerCase());
  
  for (const keyword of allKeywords) {
    if (domain.toLowerCase().includes(keyword)) {
      score += 15;
    }
  }

  // Premium word bonus
  const premiumWords = ['elite', 'premium', 'pro', 'expert', 'luxury', 'prime', 'apex', 'summit'];
  for (const word of premiumWords) {
    if (domain.toLowerCase().includes(word)) {
      score += 10;
    }
  }

  // Authority word bonus
  const authorityWords = ['hub', 'central', 'direct', 'source', 'supply', 'gear', 'craft'];
  for (const word of authorityWords) {
    if (domain.toLowerCase().includes(word)) {
      score += 8;
    }
  }

  // Brandability scoring (no hyphens, numbers, hard to spell)
  if (!/[-0-9]/.test(domain)) score += 10;
  if (!/[qxz]/.test(domain.toLowerCase())) score += 5; // Avoid hard letters
  
  // Memorability (repeated letters penalty, but not too harsh)
  const repeatedLetters = domain.match(/(.)\1{2,}/g);
  if (repeatedLetters) score -= 5;

  // Word count scoring (2-3 words is ideal)
  const wordCount = domain.split(/(?=[A-Z])/).length;
  if (wordCount === 2 || wordCount === 3) score += 15;
  else if (wordCount === 1) score += 5;

  return Math.max(0, score); // Ensure non-negative score
}

// Validate that domain uses only complete words (no truncated words)
function hasCompleteWords(domain) {
  const domainName = domain.replace('.com', '').toLowerCase();
  
  // Common incomplete word patterns to reject
  const incompletePatterns = [
    /sanct$/,     // HomeSanct -> should be Sanctuary
    /prem$/,      // PremHeat -> should be Premium  
    /prof$/,      // ProfFire -> should be Professional
    /elit$/,      // ElitFire -> should be Elite
    /luxu$/,      // LuxuHeat -> should be Luxury
    /mast$/,      // MastFire -> should be Master
    /supe$/,      // SupeFire -> should be Super
    /ulti$/,      // UltiFire -> should be Ultimate
    /exec$/,      // ExecFire -> should be Executive
    /adva$/,      // AdvaFire -> should be Advanced
    /plat$/,      // PlatFire -> should be Platinum
    /diam$/,      // DiamFire -> should be Diamond
    /sign$/,      // SignFire -> should be Signature
    /pres$/,      // PresFire -> should be Prestige
    /fini$/,      // FiniFire -> should be Finish
    /qual$/,      // QualFire -> should be Quality
    /solu$/,      // SoluFire -> should be Solution
    /syst$/,      // SystFire -> should be System
    /equi$/,      // EquiFire -> should be Equipment
    /mach$/,      // MachFire -> should be Machine
    /tech$/,      // TechFire -> should be Technology (but Tech is acceptable)
    /auto$/,      // AutoFire -> should be Automatic (but Auto is acceptable)
  ];
  
  // Check for incomplete patterns
  for (const pattern of incompletePatterns) {
    if (pattern.test(domainName)) {
      console.log(`❌ Rejected domain "${domain}" - contains incomplete word pattern: ${pattern}`);
      return false;
    }
  }
  
  // Check for very short "words" that might be truncated (less than 3 chars)
  const words = domainName.split(/(?=[A-Z])/); // Split on capital letters
  for (const word of words) {
    if (word.length > 0 && word.length < 3 && !/^(go|to|my|be|we|it|is|or|up|on|in|at|by|no)$/.test(word.toLowerCase())) {
      console.log(`❌ Rejected domain "${domain}" - contains very short word: "${word}"`);
      return false;
    }
  }
  
  return true;
}

// Filter out cheap-sounding domain names to maintain premium brand image
function isPremiumDomain(domain) {
  const domainName = domain.replace(/\.com$/i, '').toLowerCase();
  
  // List of cheap-sounding words that should be avoided in premium domains
  const cheapWords = [
    'store', 'shop', 'mart', 'market', 'outlet', 'warehouse', 'depot', 'center',
    'emporium', 'bazaar', 'plaza', 'mall', 'superstore', 'megastore', 'discount',
    'bargain', 'deal', 'sale', 'cheap', 'budget', 'value', 'economy', 'express',
    'quick', 'fast', 'instant', 'easy', 'simple', 'basic', 'standard', 'generic',
    'wholesale', 'bulk', 'mass', 'general', 'universal', 'common', 'regular'
  ];
  
  // Check if domain contains any cheap-sounding words
  for (const cheapWord of cheapWords) {
    if (domainName.includes(cheapWord)) {
      console.log(`❌ Rejected domain "${domain}" - contains cheap-sounding word: "${cheapWord}"`);
      return false;
    }
  }
  
  // Additional pattern checks for cheap-sounding combinations
  const cheapPatterns = [
    /\d+(store|shop|mart)$/i,           // Numbers + store/shop/mart (like "24store")
    /(get|buy|order)(your|my|the)?/i,   // Action words like "getyour", "buymy"
    /(all|any|every)(thing|one)/i,      // Generic words like "everything", "anyone"
    /^(the|a|an)[a-z]/i,               // Starting with articles
    /(world|global|international)$/i,   // Overly broad terms at the end
    /(online|web|net|digital)$/i        // Generic online terms at the end
  ];
  
  for (const pattern of cheapPatterns) {
    if (pattern.test(domainName)) {
      console.log(`❌ Rejected domain "${domain}" - matches cheap pattern: ${pattern}`);
      return false;
    }
  }
  
  console.log(`✅ Domain "${domain}" passed premium validation`);
  return true;
}

// Use ChatGPT to select the best 6 domains from available ones
async function selectBestDomainsWithAI(availableDomains, niche, patterns) {
  if (availableDomains.length === 0) {
    return [];
  }

  // If we have 6 or fewer domains, return all of them
  if (availableDomains.length <= 6) {
    return availableDomains;
  }

  const domainList = availableDomains.map(d => `${d.domain} ($${d.price})`).join('\n');
  
  const prompt = `You are selecting the best 6 domain names for a high-ticket ${niche} e-commerce store (products $1000+).

AVAILABLE DOMAINS:
${domainList}

SELECTION CRITERIA:
✅ Professional and trustworthy for high-ticket sales
✅ Memorable and brandable
✅ Easy to spell and pronounce
✅ Broad niche appeal (not product-specific)
✅ Premium positioning
✅ Consider price vs. quality ratio

TASK:
1. Select the BEST domain (the strongest overall choice)
2. Select 5 additional excellent alternatives
3. Prioritize quality over price, but consider value

Return ONLY a JSON array with the 6 selected domains in this format:
["domain1.com", "domain2.com", "domain3.com", "domain4.com", "domain5.com", "domain6.com"]

The first domain should be your TOP recommendation.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    const selectedDomainNames = extractDomainsFromResponse(response.choices[0].message.content, 6);
    
    // Map selected domain names back to full domain objects
    const selectedDomains = [];
    for (const domainName of selectedDomainNames) {
      const domainObj = availableDomains.find(d => d.domain === domainName);
      if (domainObj) {
        selectedDomains.push(domainObj);
      }
    }
    
    console.log(`✅ AI selected ${selectedDomains.length} domains from ${availableDomains.length} available`);
    return selectedDomains;
    
  } catch (error) {
    console.error('Error in AI domain selection:', error);
    
    // Fallback: use scoring algorithm
    const scoredDomains = availableDomains.map(domain => ({
      ...domain,
      score: calculateDomainScore(domain, niche, patterns)
    }));
    
    const sortedDomains = scoredDomains.sort((a, b) => b.score - a.score);
    return sortedDomains.slice(0, 6);
  }
}

// API Routes

// Get or create niche
app.post('/api/niche', async (req, res) => {
  const { niche } = req.body;
  
  try {
    if (db) {
      // Use SQLite for local development
      db.get('SELECT * FROM niches WHERE name = ?', [niche], async (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        let nicheId;
        if (row) {
          nicheId = row.id;
        } else {
          // Create new niche
          db.run('INSERT INTO niches (name) VALUES (?)', [niche], function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            nicheId = this.lastID;
            res.json({ nicheId, niche });
          });
          return;
        }

        res.json({ nicheId, niche });
      });
    } else {
      // Serverless environment - just return a generated ID
      const nicheId = Math.floor(Math.random() * 1000000);
      res.json({ nicheId, niche });
    }
  } catch (error) {
    // COMPREHENSIVE ERROR LOGGING for troubleshooting
    const errorDetails = {
      timestamp: new Date().toISOString(),
      endpoint: '/api/niche',
      niche: niche,
      errorMessage: error.message,
      errorStack: error.stack,
      requestBody: req.body,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
    };
    
    console.error('❌ CRITICAL ERROR in /api/niche:', JSON.stringify(errorDetails, null, 2));
    console.error('Full error object:', error);
    
    res.status(500).json({ 
      error: error.message || 'An unexpected error occurred while processing niche',
      debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
});

// OLD isUnknownNiche function removed - replaced by centralized NicheClassifier

// Handle unknown niche workflow
async function handleUnknownNiche(niche) {
  console.log(`🔍 Processing unknown niche: "${niche}"`);
  
  // Step 1: AI analyze the niche
  console.log(`🤖 Step 1: AI analyzing "${niche}" to understand the niche...`);
  const nicheAnalysis = await analyzeUnknownNicheWithAI(niche);
  if (!nicheAnalysis) {
    throw new Error(`Failed to analyze unknown niche "${niche}"`);
  }
  
  // Step 2: Find popular stores related to the keyword
  console.log(`🏪 Step 2: Finding popular stores for "${niche}"...`);
  const relatedStores = await findStoresForUnknownNiche(niche, nicheAnalysis);
  
  // Double-check guarantee: This should never happen with the new fallback system
  if (relatedStores.length === 0) {
    console.error(`🚨 CRITICAL: Still no stores found after all fallbacks for "${niche}"`);
    throw new Error(`Unable to find any competitor stores for niche "${niche}". Please try a different search term.`);
  }
  
  // Step 3: Generate domains based on analysis (database + AI)
  console.log(`🎯 Step 3: Generating domains based on analysis...`);
  
  // Try to get database keywords first, then fall back to AI keywords
  const databaseKeywords = await extractNicheKeywords(niche);
  const finalKeywords = databaseKeywords.length > 0 ? databaseKeywords : (nicheAnalysis.nicheKeywords || []);
  
  const patterns = {
    industryTerms: nicheAnalysis.industryTerms || [],
    nicheKeywords: finalKeywords,
    patterns: {
      averageLength: 12,
      wordCount: "2-3 words",
      commonStructures: ["brand + category", "adjective + noun"]
    },
    recommendations: {
      lengthRange: "7-20 characters",
      preferredStructure: "Use industry terms with premium positioning",
      avoidTerms: ["cheap", "budget", "discount"]
    }
  };
  
  const generatedDomains = await generateDomains(niche, patterns, 25);
  
  // Step 4: Check availability with name.com
  console.log(`✅ Step 4: Checking domain availability...`);
  let availableDomains = await checkDomainAvailability(generatedDomains);
  
  // Ensure we have at least 6 domains
  let attempts = 0;
  while (availableDomains.length < 6 && attempts < 3) {
    attempts++;
    console.log(`🔄 Need more domains, generating additional batch (attempt ${attempts})...`);
    const moreDomains = await generateDomains(niche, patterns, 20);
    const moreAvailable = await checkDomainAvailability(moreDomains);
    const existing = new Set(availableDomains.map(d => d.domain));
    for (const d of moreAvailable) {
      if (!existing.has(d.domain)) availableDomains.push(d);
    }
  }
  
  // If still not enough, add mock domains
  if (availableDomains.length < 6) {
    const needed = 6 - availableDomains.length;
    const mockDomains = await generateDomains(niche, patterns, needed * 2);
    const mockAvailable = mockDomains.slice(0, needed).map((domain, i) => ({
      domain,
      available: true,
      price: 15 + i,
      currency: 'USD',
      mock: true
    }));
    availableDomains.push(...mockAvailable);
  }
  
  // Step 5: Select best domains
  const selectedDomains = await selectBestDomainsWithAI(availableDomains, niche, patterns);
  
  // Ensure exactly 6 domains
  if (selectedDomains.length < 6) {
    const chosen = new Set(selectedDomains.map(d => d.domain));
    for (const d of availableDomains) {
      if (selectedDomains.length >= 6) break;
      if (!chosen.has(d.domain)) selectedDomains.push(d);
    }
  }
  if (selectedDomains.length > 6) selectedDomains.splice(6);
  
  return {
    competitors: relatedStores,
    patterns,
    recommendation: selectedDomains[0],
    alternatives: selectedDomains.slice(1),
    totalGenerated: generatedDomains.length,
    totalAvailable: availableDomains.length,
    source: 'unknown_niche_analysis',
    nicheAnalysis
  };
}

// AI analysis for unknown niches
async function analyzeUnknownNicheWithAI(niche) {
  const prompt = `Analyze the "${niche}" niche for a high-ticket e-commerce business.

This appears to be an unknown or emerging niche. Please provide comprehensive analysis:

{
  "nicheCategory": "What broader category does this fall under?",
  "industryTerms": ["term1", "term2", ...],
  "nicheKeywords": ["keyword1", "keyword2", ...],
  "productCategories": ["category1", "category2", ...],
  "targetCustomer": "description of ideal customer",
  "priceRange": "$X - $Y for high-ticket items",
  "marketPotential": "assessment of market size and potential",
  "competitorTypes": "What types of businesses would sell in this niche?",
  "searchTerms": ["term1", "term2", ...] // Terms people might search for
}

Requirements:
- Focus on high-ticket items ($500+)
- Identify 8-10 SINGLE WORD industry terms that describe the broader market
- Provide 5-7 SINGLE WORDS only for domain names (NO PHRASES OR MULTI-WORD TERMS)
- Consider what premium customers would search for
- Think about what types of stores would sell these products

CRITICAL: nicheKeywords must be single words only. Examples: ["furniture", "decor", "luxury", "design"] NOT ["luxury furniture", "designer home decor"]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    const content = response.choices[0].message.content.trim();
    let jsonStart = content.indexOf('{');
    let jsonEnd = content.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonStr = content.substring(jsonStart, jsonEnd);
      const analysis = JSON.parse(jsonStr);
      
      // Force nicheKeywords to be single words only
      if (analysis.nicheKeywords && Array.isArray(analysis.nicheKeywords)) {
        analysis.nicheKeywords = analysis.nicheKeywords
          .flatMap(keyword => keyword.split(/[,\s]+/)) // Split on commas and spaces
          .map(word => word.trim().toLowerCase())
          .filter(word => word.length > 2 && /^[a-z]+$/.test(word)) // Only single words, letters only
          .slice(0, 7); // Limit to 7 words max
      }
      
      console.log(`✅ AI analyzed unknown niche "${niche}":`, analysis);
      return analysis;
    } else {
      throw new Error('No valid JSON found in AI response');
    }
  } catch (error) {
    console.error('Error in AI unknown niche analysis:', error);
    return null;
  }
}

// Verify that a store has working content (not just a parked domain or error page)
async function verifyStoreHasWorkingContent(store) {
  try {
    const cleanDomain = (store.domain || '').replace(/^https?:\/\//, '').replace(/^www\./, '');
    const baseUrl = (store.url || '').startsWith('http') ? store.url : `https://${cleanDomain}`;
    
    const response = await axios.get(baseUrl, {
      timeout: 8000,
      maxRedirects: 2,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DomainVerifier/1.0)' }
    });
    
    if (response.status < 200 || response.status >= 400) {
      return false;
    }
    
    const html = response.data;
    if (!html || typeof html !== 'string') {
      return false;
    }
    
    const htmlLower = html.toLowerCase();
    
    // Check for signs of a parked domain or error page
    const parkingSignals = [
      'domain for sale', 'this domain is for sale', 'buy this domain',
      'parked domain', 'domain parking', 'coming soon', 'under construction',
      'page not found', '404 error', '404 not found', 'server error',
      'temporarily unavailable', 'site unavailable', 'maintenance mode',
      'default web page', 'apache default', 'nginx default', 'iis default'
    ];
    
    for (const signal of parkingSignals) {
      if (htmlLower.includes(signal)) {
        console.log(`❌ Store ${store.domain} appears to be parked or error page: contains "${signal}"`);
        return false;
      }
    }
    
    // Check for positive signals of an actual e-commerce site
    const ecommerceSignals = [
      'add to cart', 'buy now', 'shop now', 'product', 'products', 'store',
      'price', 'shipping', 'checkout', 'catalog', 'category', 'categories',
      'search', 'cart', 'order', 'purchase', 'sale', 'deals'
    ];
    
    let ecommerceScore = 0;
    for (const signal of ecommerceSignals) {
      if (htmlLower.includes(signal)) {
        ecommerceScore++;
      }
    }
    
    // Must have at least 2 e-commerce signals and reasonable content length
    if (ecommerceScore >= 2 && html.length > 1000) {
      console.log(`✅ Store ${store.domain} has working e-commerce content (score: ${ecommerceScore})`);
      return true;
    }
    
    console.log(`❌ Store ${store.domain} lacks e-commerce signals (score: ${ecommerceScore}, length: ${html.length})`);
    return false;
    
  } catch (error) {
    console.log(`❌ Content verification failed for ${store.domain}:`, error.message);
    return false;
  }
}

// Find stores for unknown niche using AI - GUARANTEED to return at least 1 store
async function findStoresForUnknownNiche(niche, nicheAnalysis) {
  const searchTerms = [
    niche,
    ...(nicheAnalysis.searchTerms || []),
    ...(nicheAnalysis.industryTerms || []).slice(0, 3),
    ...(nicheAnalysis.productCategories || []).slice(0, 2)
  ];

  console.log(`🔍 Searching for stores using terms: ${searchTerms.slice(0, 5).join(', ')}`);
  
  const allStores = [];
  const seenDomains = new Set();
  
  // Search with multiple terms to get diverse results
  for (const term of searchTerms.slice(0, 4)) { // Increased from 3 to 4 for better coverage
    try {
      const stores = await competitorFinder.searchOnlineCompetitors(term);
      for (const store of stores) {
        if (store && store.domain) {
          const domainKey = String(store.domain).replace(/^www\./,'').toLowerCase();
          if (!seenDomains.has(domainKey)) {
            allStores.push({...store, searchTerm: term});
            seenDomains.add(domainKey);
          }
        }
      }
      if (allStores.length >= 15) break; // Increased target for better verification success
    } catch (error) {
      console.log(`Failed to search for stores with term "${term}":`, error.message);
    }
  }
  
  // Verify stores are relevant, live, and have working content
  let verifiedStores = await quickVerifyStores(allStores, niche, 8);
  
  // For unknown niches, do additional content verification on the top results
  if (verifiedStores.length > 0) {
    console.log(`🔍 Performing content verification on ${verifiedStores.length} stores...`);
    const contentVerifiedStores = [];
    for (const store of verifiedStores.slice(0, 5)) {
      try {
        const hasContent = await verifyStoreHasWorkingContent(store);
        if (hasContent) {
          contentVerifiedStores.push({...store, contentVerified: true});
        }
      } catch (_) {}
    }
    
    // Use content-verified stores if we found any, otherwise keep original
    if (contentVerifiedStores.length > 0) {
      console.log(`✅ ${contentVerifiedStores.length} stores passed content verification`);
      verifiedStores = contentVerifiedStores;
    } else {
      console.log(`⚠️ No stores passed content verification, keeping original ${verifiedStores.length} stores`);
    }
  }
  
  // GUARANTEE: If we have no verified stores, try fallback strategies
  if (verifiedStores.length === 0) {
    console.log(`⚠️ No verified stores found for "${niche}". Trying fallback strategies...`);
    
    // Fallback 1: Try broader category terms from AI analysis
    if (nicheAnalysis.nicheCategory) {
      try {
        console.log(`🔄 Fallback 1: Searching for "${nicheAnalysis.nicheCategory}" category stores...`);
        const categoryStores = await competitorFinder.searchOnlineCompetitors(nicheAnalysis.nicheCategory);
        const categoryVerified = await quickVerifyStores(categoryStores, niche, 3);
        if (categoryVerified.length > 0) {
          verifiedStores.push(...categoryVerified);
          console.log(`✅ Fallback 1 success: Found ${categoryVerified.length} category stores`);
        }
      } catch (error) {
        console.log(`❌ Fallback 1 failed:`, error.message);
      }
    }
    
    // Fallback 2: Use more thorough verification (ensure sites are truly working)
    if (verifiedStores.length === 0 && allStores.length > 0) {
      console.log(`🔄 Fallback 2: Using thorough verification to ensure working sites...`);
      for (const store of allStores.slice(0, 15)) { // Check more stores
        try {
          // Use thorough verification (not fastVerify) to ensure site is truly working
          const exists = await competitorFinder.verifyStoreExists(store, { 
            fastVerify: false, 
            silentFail: true, 
            unknownNiche: true // Use unknown niche timeouts
          });
          if (exists) {
            // Double-check: Try to fetch actual content to ensure it's a real working site
            const contentCheck = await verifyStoreHasWorkingContent(store);
            if (contentCheck) {
              verifiedStores.push({...store, fallbackVerification: true, contentVerified: true});
              console.log(`✅ Fallback 2 success: Found working store ${store.domain} with content`);
              if (verifiedStores.length >= 3) break; // Get at least 3 with fallback
            }
          }
        } catch (_) {}
      }
    }
    
    // Fallback 3: Use related known stores as examples if all else fails
    if (verifiedStores.length === 0) {
      console.log(`🔄 Fallback 3: Using related known stores as examples...`);
      try {
        // Try to find stores from related known niches based on AI analysis
        const relatedNiches = [];
        if (nicheAnalysis.industryTerms) {
          for (const term of nicheAnalysis.industryTerms.slice(0, 3)) {
            const relatedStores = competitorFinder.getKnownStoresWide(term) || [];
            if (relatedStores.length > 0) {
              relatedNiches.push(...relatedStores.slice(0, 2));
            }
          }
        }
        
        // If we found related stores, verify them thoroughly
        if (relatedNiches.length > 0) {
          console.log(`🔍 Verifying ${relatedNiches.length} related known stores...`);
          for (const store of relatedNiches.slice(0, 5)) {
            try {
              // First check if site exists
              const exists = await competitorFinder.verifyStoreExists(store, { 
                fastVerify: false, 
                silentFail: true 
              });
              if (exists) {
                // Then verify it has working content
                const contentCheck = await verifyStoreHasWorkingContent(store);
                if (contentCheck) {
                  verifiedStores.push({...store, relatedExample: true, contentVerified: true});
                  console.log(`✅ Fallback 3 success: Verified related store ${store.domain}`);
                  if (verifiedStores.length >= 2) break;
                }
              }
            } catch (error) {
              console.log(`❌ Failed to verify related store ${store.domain}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.log(`❌ Fallback 3 failed:`, error.message);
      }
    }
    
    // Fallback 4: Create a generic example store if absolutely nothing works
    if (verifiedStores.length === 0) {
      console.log(`🔄 Fallback 4: Creating generic example store...`);
      const genericStore = {
        name: `${niche.charAt(0).toUpperCase() + niche.slice(1)} Pro`,
        url: `https://${niche.toLowerCase().replace(/\s+/g, '')}pro.com`,
        domain: `${niche.toLowerCase().replace(/\s+/g, '')}pro.com`,
        description: `Professional ${niche} equipment and supplies`,
        genericExample: true
      };
      verifiedStores.push(genericStore);
      console.log(`✅ Fallback 4: Created generic example store`);
    }
  }
  
  console.log(`✅ GUARANTEED: Found ${verifiedStores.length} stores for unknown niche "${niche}"`);
  return verifiedStores.slice(0, 8); // Cap at 8 stores max
}

// Main domain generation endpoint
app.post('/api/generate-domains', async (req, res) => {
  const { niche } = req.body;
  
  try {
    console.log(`🔍 Processing niche request: ${niche}`);

    // STEP 1: Classify the niche using our centralized system
    const classification = await nicheClassifier.classifyNiche(niche);
    const canonicalNiche = classification.canonicalNiche;
    
    console.log(`🎯 Niche classification: ${classification.type} (confidence: ${classification.confidence}) → "${canonicalNiche}"`);

    // STEP 2: Handle based on classification
    if (classification.type === 'unknown') {
      console.log(`🆕 Processing unknown niche: "${canonicalNiche}"`);
      try {
        const unknownNicheResult = await handleUnknownNiche(canonicalNiche);
        return res.json(unknownNicheResult);
      } catch (error) {
        console.error(`❌ Unknown niche processing failed:`, error);
        return res.status(500).json({ 
          error: `Unable to process unknown niche "${niche}". Please try a more specific search term.`,
          suggestion: 'Try searching for a more specific product category or industry.'
        });
      }
    }
    
    // STEP 1: Check database first for similar/related niches - RETURN IMMEDIATELY if found
    console.log(`📊 Checking database for existing competitors...`);
    
    // Check exact niche first (mapped to canonical niche)
    const curated = await fetchCuratedStores(canonicalNiche);

    // Check ONLY exact niche key in known stores to avoid unrelated categories
    const knownStores = (competitorFinder.getKnownStoresExact
      ? competitorFinder.getKnownStoresExact(canonicalNiche)
      : (competitorFinder.getKnownStoresWide(canonicalNiche) || [])
    ).filter(s => {
      const key = String(s && s.domain || '').replace(/^www\./,'').toLowerCase();
      return !(competitorFinder.excludedRetailers && competitorFinder.excludedRetailers.has(key));
    });
    // Do NOT include fuzzy/direct cross-niche expansions to avoid irrelevant results
    
    // Combine database results (curated + known stores)
    const allDatabaseResults = [];
    const seenDomains = new Set();
    
    // Add curated stores (already verified and relevant)
    if (Array.isArray(curated)) {
      for (const store of curated) {
        if (store && store.domain) {
          const domainKey = String(store.domain).replace(/^www\./,'').toLowerCase();
          if (!seenDomains.has(domainKey)) {
            allDatabaseResults.push(store);
            seenDomains.add(domainKey);
          }
        }
      }
    }
    
    // Add known stores without filtering to ensure we keep curated lists intact
    for (const store of knownStores) {
      if (!store || !store.domain) continue;
      const domainKey = String(store.domain).replace(/^www\./,'').toLowerCase();
      if (seenDomains.has(domainKey)) continue;
      allDatabaseResults.push(store);
      seenDomains.add(domainKey);
    }
    
    // If we have 5+ database results, return immediately (no AI processing needed)
    if (allDatabaseResults.length >= 5) {
      console.log(`✅ Found ${allDatabaseResults.length} competitors in database - returning immediately!`);
      // Verify they're live and relevant before using them
      let competitors = await quickVerifyStores(allDatabaseResults.slice(0, 24), canonicalNiche, 12);
      if (!competitors || competitors.length === 0) {
        // As a fallback, try to get one store so UI isn't empty
        try {
          const one = competitorFinder.getOneFallbackCompetitor ? await competitorFinder.getOneFallbackCompetitor(canonicalNiche) : null;
          if (one) competitors = [one];
        } catch (_) {}
      }
      
      // Continue with domain generation using database results
      console.log('Analyzing domain patterns...');
      const patternsRaw = await analyzeDomainPatterns(competitors, canonicalNiche);
      const canonical = String(canonicalNiche || '').toLowerCase().trim().replace(/\s+/g,' ');
      const normalized = competitorFinder && typeof competitorFinder.normalizeNiche === 'function' ? competitorFinder.normalizeNiche(canonical) : canonical;
      const strict = DOMAIN_DATABASES.strictNicheKeywords && (DOMAIN_DATABASES.strictNicheKeywords[normalized] || DOMAIN_DATABASES.strictNicheKeywords[canonical]);
      const patterns = {
        ...patternsRaw,
        nicheKeywords: strict ? strict : removePrefixesAndSuffixesFromKeywords(canonicalNiche, patternsRaw && patternsRaw.nicheKeywords)
      };
      
      if (!patterns) {
        return res.status(500).json({ error: 'Failed to analyze domain patterns' });
      }

      console.log('Generating domain suggestions...');
      const generatedDomains = await generateDomains(canonicalNiche, patterns, 20);
      
      console.log('Checking domain availability...');
      let availableDomains = await checkDomainAvailability(generatedDomains);
      if (isServerless && availableDomains.length === 0 && !namecomAPI) {
        // Serverless fallback only when Name.com API is not configured
        availableDomains = generatedDomains.slice(0, 8).map((d, i) => ({ domain: d, available: true, price: 15 + i }));
      }
      
          // GUARANTEE exactly 6 available domains (1 top + 5 alternatives)
    let attempts = 0;
    const maxAttempts = 5; // Increased attempts to ensure we get 6 domains
    while (availableDomains.length < 6 && attempts < maxAttempts) {
      attempts++;
      console.log(`🎯 MUST have 6 domains! Currently have ${availableDomains.length}. Generating more (attempt ${attempts}/${maxAttempts})...`);
      const moreGenerated = await generateDomains(canonicalNiche, patterns, 25); // Generate more per attempt
      const moreAvailable = await checkDomainAvailability(moreGenerated);
      const existing = new Set(availableDomains.map(d => d.domain));
      for (const d of moreAvailable) {
        if (!existing.has(d.domain)) availableDomains.push(d);
      }
      console.log(`📊 Now have ${availableDomains.length} available domains after attempt ${attempts}`);
    }
      
      console.log(`Found ${availableDomains.length} available domains from ${generatedDomains.length} generated`);
      
      // If still no domains after all attempts, return error
      if (availableDomains.length === 0) {
        return res.status(400).json({ 
          error: 'No available domains found under $100. Try a different niche or check again later.',
          competitors,
          patterns,
          totalGenerated: generatedDomains.length,
          totalAvailable: 0
        });
      }
      
      // GUARANTEE exactly 6 domains - if we have less than 6, add mock domains
      if (availableDomains.length < 6) {
        console.log(`⚠️ Only found ${availableDomains.length} real domains. Adding mock domains to reach exactly 6 total.`);
        const needed = 6 - availableDomains.length;
        const mockDomains = await generateDomains(niche, patterns, needed * 3);
        const mockAvailable = mockDomains.slice(0, needed).map((domain, i) => ({
          domain,
          available: true,
          price: 15 + i,
          currency: 'USD',
          mock: true
        }));
        availableDomains.push(...mockAvailable);
        console.log(`✅ Now have exactly ${availableDomains.length} domains (${availableDomains.length - needed} real + ${needed} mock)`);
      }
      
      console.log('Using AI to select best 6 domains...');
      const selectedDomains = await selectBestDomainsWithAI(availableDomains, canonicalNiche, patterns);
      
      // GUARANTEE exactly 6 domains - this is mandatory
      if (selectedDomains.length < 6) {
        console.log(`🎯 AI selected only ${selectedDomains.length} domains. Adding more to reach exactly 6.`);
        const chosen = new Set(selectedDomains.map(d => d.domain));
        for (const d of availableDomains) {
          if (selectedDomains.length >= 6) break;
          if (!chosen.has(d.domain)) selectedDomains.push(d);
        }
      }
      
      // Ensure we have EXACTLY 6 domains, no more, no less
      if (selectedDomains.length > 6) {
        selectedDomains.splice(6); // Keep only first 6
      }
      
      if (selectedDomains.length === 0) {
        return res.status(400).json({ 
          error: `No suitable domains could be selected for "${niche}".`,
          suggestion: `Try a different niche or check again later.`
        });
      }

      const bestDomain = selectedDomains[0];
      const alternatives = selectedDomains.slice(1);

      return res.json({
        competitors,
        patterns,
        recommendation: bestDomain,
        alternatives,
        totalGenerated: generatedDomains.length,
        totalAvailable: availableDomains.length,
        source: 'database' // Indicate this came from database
      });
    }
    
    // FAST PATH: If we have ZERO database results, skip competitor crawling and use AI niche analysis directly
    if (allDatabaseResults.length === 0) {
      console.log('⚡ No database results found. Using fast niche-analysis-only path.');
      // Kick off a fast AI competitor search in parallel to display similar stores if possible
      const fastDeadlineAt = Date.now() + 60000; // ~60s budget
      const competitorsPromise = (async () => {
        try {
          return await competitorFinder.getVerifiedCompetitorsWithCache(canonicalNiche, { fast: true, deadlineAt: fastDeadlineAt, maxAttempts: 1 });
        } catch (_) {
          return [];
        }
      })();
      
      // 1) Analyze niche without competitor inputs
      console.log('Analyzing domain patterns (fast path)...');
      const patternsRaw = await analyzeDomainPatterns([], canonicalNiche);
      const canonical = String(canonicalNiche || '').toLowerCase().trim().replace(/\s+/g,' ');
      const normalized = competitorFinder && typeof competitorFinder.normalizeNiche === 'function' ? competitorFinder.normalizeNiche(canonical) : canonical;
      const strict = DOMAIN_DATABASES.strictNicheKeywords && (DOMAIN_DATABASES.strictNicheKeywords[normalized] || DOMAIN_DATABASES.strictNicheKeywords[canonical]);
      const patterns = {
        ...patternsRaw,
        nicheKeywords: strict ? strict : removePrefixesAndSuffixesFromKeywords(canonicalNiche, patternsRaw && patternsRaw.nicheKeywords)
      };
      if (!patterns) {
        return res.status(500).json({ error: 'Failed to analyze domain patterns (fast path)' });
      }
      
      // 2) Generate domains
      console.log('Generating domain suggestions (fast path)...');
      const generatedDomains = await generateDomains(canonicalNiche, patterns, 20);
      
      // 3) Check availability with retries to ensure we reach 6
      console.log('Checking domain availability (fast path)...');
      let availableDomains = await checkDomainAvailability(generatedDomains);
      let attempts = 0;
      const maxAttempts = 5;
      while (availableDomains.length < 6 && attempts < maxAttempts) {
        attempts++;
        const moreGenerated = await generateDomains(canonicalNiche, patterns, 25);
        const moreAvailable = await checkDomainAvailability(moreGenerated);
        const existing = new Set(availableDomains.map(d => d.domain));
        for (const d of moreAvailable) {
          if (!existing.has(d.domain)) availableDomains.push(d);
        }
        console.log(`📊 [Fast path] Available domains after attempt ${attempts}: ${availableDomains.length}`);
      }
      
      // If still fewer than 6, add mock domains to satisfy UI contract
      if (availableDomains.length < 6) {
        const needed = 6 - availableDomains.length;
        const mockDomains = await generateDomains(canonicalNiche, patterns, needed * 3);
        const mockAvailable = mockDomains.slice(0, needed).map((domain, i) => ({
          domain,
          available: true,
          price: 15 + i,
          currency: 'USD',
          mock: true
        }));
        availableDomains.push(...mockAvailable);
      }
      
      if (availableDomains.length === 0) {
        return res.status(400).json({ 
          error: 'No available domains found under $100. Try a different niche or check again later.',
          competitors: [],
          patterns,
          totalGenerated: generatedDomains.length,
          totalAvailable: 0
        });
      }
      
      // 4) Select best 6 from available
      console.log('Using AI to select best 6 domains (fast path)...');
      let selectedDomains = await selectBestDomainsWithAI(availableDomains, canonicalNiche, patterns);
      if (selectedDomains.length < 6) {
        const chosen = new Set(selectedDomains.map(d => d.domain));
        for (const d of availableDomains) {
          if (selectedDomains.length >= 6) break;
          if (!chosen.has(d.domain)) selectedDomains.push(d);
        }
      }
      if (selectedDomains.length > 6) selectedDomains.splice(6);
      
      const bestDomain = selectedDomains[0];
      const alternatives = selectedDomains.slice(1);
      // Try to include any fast competitor results that completed within the 15s budget
      const competitorsTimeout = new Promise(resolve => setTimeout(() => resolve([]), 60000));
      let competitors = await Promise.race([competitorsPromise, competitorsTimeout]);
      if ((!competitors || competitors.length === 0) && competitorFinder.getOneFallbackCompetitor) {
        try {
          const one = await competitorFinder.getOneFallbackCompetitor(canonicalNiche);
          if (one) competitors = [one];
        } catch (_) {}
      }
      return res.json({
        competitors: Array.isArray(competitors) ? competitors.slice(0, 12) : [],
        patterns,
        recommendation: bestDomain,
        alternatives,
        totalGenerated: generatedDomains.length,
        totalAvailable: availableDomains.length,
        source: 'ai_analysis'
      });
    }
    
    // Serverless shortcut: keep responses fast to avoid platform timeouts
    if (isServerless) {
      let competitors = allDatabaseResults.slice(0, 12);

      // If we don't have enough from curated/known, try a fast AI fallback
      if (competitors.length < 5) {
        try {
          const deadlineAt = Date.now() + 12000; // ~12s budget for serverless
          const aiFast = await competitorFinder.getVerifiedCompetitorsWithCache(canonicalNiche, { fast: true, deadlineAt, maxAttempts: 1 });
          const seen = new Set(competitors.map(c => String(c.domain || '').replace(/^www\./,'').toLowerCase()));
          for (const s of (aiFast || [])) {
            const k = String(s.domain || '').replace(/^www\./,'').toLowerCase();
            if (!k || seen.has(k)) continue;
            competitors.push(s);
            seen.add(k);
            if (competitors.length >= 12) break;
          }
        } catch (_) {}
      }

      // Quick verification: live + high-ticket dropshipping (fast timeouts)
      try {
        const deadlineAt = Date.now() + 12000; // ~12s total budget
        const isTimedOut = () => Date.now() >= deadlineAt;
        // Build known set for trustedKnown flag
        const knownSet = new Set();
        try {
          const knownWide = competitorFinder.getKnownStoresWide(canonicalNiche) || [];
          const knownGlobal = competitorFinder.getKnownStoresGlobal() || [];
          for (const s of [...knownWide, ...knownGlobal]) {
            if (!s || !s.domain) continue;
            knownSet.add(String(s.domain).replace(/^www\./,'').toLowerCase());
          }
        } catch (_) {}

        const verifyBatch = async (items) => {
          const verified = [];
          const batchSize = 8;
          for (let i = 0; i < items.length && !isTimedOut(); i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            await Promise.all(batch.map(async (c) => {
              if (isTimedOut()) return;
              try {
                const exists = await competitorFinder.verifyStoreExists(c, { fastVerify: true, silentFail: true, isAIGenerated: true });
                if (!exists) return;
                const key = String(c.domain || '').replace(/^www\./,'').toLowerCase();
                const qualifies = await competitorFinder.qualifiesAsHighTicketDropshipping(c, { fastVerify: true, trustedKnown: knownSet.has(key) });
                if (!qualifies) return;
                const relevant = await competitorFinder.isRelevantToNiche(c, canonicalNiche, { checkContent: false });
                if (!relevant) return;
                verified.push(c);
              } catch (_) {}
            }));
          }
          return verified;
        };

        const uniqueMap = new Map();
        for (const s of competitors) {
          if (!s || !s.domain) continue;
          const k = String(s.domain).replace(/^www\./,'').toLowerCase();
          if (!uniqueMap.has(k)) uniqueMap.set(k, s);
        }
        const verified = await verifyBatch(Array.from(uniqueMap.values()));
        if (Array.isArray(verified) && verified.length >= 1) {
          competitors = verified.slice(0, 12);
        }
      } catch (_) {}

      if (competitors.length === 0) {
        const similarNiches = nicheClassifier.getSimilarNiches(niche, 10);
        return res.status(400).json({ 
          error: `Unable to find dropshipping competitors for "${niche}" on serverless environment.`,
          suggestion: `Try a broader niche term.`,
          availableNiches: similarNiches
        });
      }

      console.log('Analyzing domain patterns...');
      const patternsRaw = await analyzeDomainPatterns(competitors, canonicalNiche);
      const canonical = String(canonicalNiche || '').toLowerCase().trim().replace(/\s+/g,' ');
      const normalized = competitorFinder && typeof competitorFinder.normalizeNiche === 'function' ? competitorFinder.normalizeNiche(canonical) : canonical;
      const strict = DOMAIN_DATABASES.strictNicheKeywords && (DOMAIN_DATABASES.strictNicheKeywords[normalized] || DOMAIN_DATABASES.strictNicheKeywords[canonical]);
      const patterns = {
        ...patternsRaw,
        nicheKeywords: strict ? strict : removePrefixesAndSuffixesFromKeywords(canonicalNiche, patternsRaw && patternsRaw.nicheKeywords)
      };
      if (!patterns) {
        return res.status(500).json({ error: 'Failed to analyze domain patterns' });
      }
      console.log('Generating domain suggestions...');
      const generatedDomains = await generateDomains(canonicalNiche, patterns, 20);
      console.log('Checking domain availability...');
      let availableDomains = await checkDomainAvailability(generatedDomains);
      if (availableDomains.length === 0 && !namecomAPI) {
        // Serverless fallback only when Name.com API is not configured
        availableDomains = generatedDomains.slice(0, 8).map((d, i) => ({ domain: d, available: true, price: 15 + i }));
      }
      if (availableDomains.length === 0) {
        return res.status(400).json({ 
          error: 'No available domains found under $100. Try a different niche or check again later.',
          competitors,
          patterns,
          totalGenerated: generatedDomains.length,
          totalAvailable: 0
        });
      }
      console.log('Using AI to select best 6 domains...');
      const selectedDomains = await selectBestDomainsWithAI(availableDomains, canonicalNiche, patterns);
      if (selectedDomains.length < 6) {
        const chosen = new Set(selectedDomains.map(d => d.domain));
        for (const d of availableDomains) {
          if (selectedDomains.length >= 6) break;
          if (!chosen.has(d.domain)) selectedDomains.push(d);
        }
      }
      const bestDomain = selectedDomains[0];
      const alternatives = selectedDomains.slice(1);
      return res.json({
        competitors,
        patterns,
        recommendation: bestDomain,
        alternatives,
        totalGenerated: generatedDomains.length,
        totalAvailable: availableDomains.length,
        source: 'database'
      });
    }

    // STEP 2: If insufficient database results, use AI generation with 2-minute timeout
    console.log(`⚡ Found ${allDatabaseResults.length} database results - need AI generation with 2-minute timeout`);
    
    const startTime = Date.now();
    const twoMinuteTimeout = 2 * 60 * 1000; // enforce 2 minutes everywhere as requested
    const deadlineAt = startTime + twoMinuteTimeout;
    
    let competitors = [...allDatabaseResults]; // Start with what we have
    
    // Background AI generation with timeout
    const aiGenerationPromise = (async () => {
      try {
        const strict = await competitorFinder.getVerifiedCompetitorsWithCache(canonicalNiche, { fast: false, deadlineAt });
        return strict || [];
      } catch (error) {
        console.log('AI generation error:', error.message);
        return [];
      }
    })();
    
    // Wait for AI results but respect 2-minute timeout
    const timeoutPromise = new Promise(resolve => {
      setTimeout(() => resolve([]), twoMinuteTimeout);
    });
    
    const aiResults = await Promise.race([aiGenerationPromise, timeoutPromise]);
    const elapsedTime = Date.now() - startTime;
    
    // Add AI results to competitors (avoiding duplicates)
    for (const store of aiResults) {
      if (store && store.domain) {
        const domainKey = String(store.domain).replace(/^www\./,'').toLowerCase();
        if (!seenDomains.has(domainKey)) {
          competitors.push(store);
          seenDomains.add(domainKey);
        }
      }
    }
    
    console.log(`⏱️ AI generation completed in ${Math.round(elapsedTime/1000)}s, found ${competitors.length} total competitors`);
    
    // Ensure we have at least 1 store (as requested)
    if (competitors.length === 0) {
      const similarNiches = nicheClassifier.getSimilarNiches(niche, 10);
      return res.status(400).json({ 
        error: `Unable to find dropshipping competitors for "${niche}". This could be because the niche is too specific or the AI couldn't find relevant high-ticket dropshipping stores.`,
        suggestion: `Try a broader niche term.`,
        availableNiches: similarNiches
      });
    }
    
    // Continue processing in background if we hit timeout but have some results
    if (elapsedTime >= twoMinuteTimeout && competitors.length >= 1) {
      console.log(`🔄 Continuing AI generation in background...`);
      // Continue the AI generation promise in background (don't await)
      aiGenerationPromise.then(backgroundResults => {
        console.log(`📋 Background AI generation found ${backgroundResults.length} additional competitors`);
        // Could optionally persist these results to database for future use
      }).catch(() => {
        // Silent fail for background processing
      });
    }

    // Persist verified competitors for brand-new niches (even if fewer than 5)
    try {
      const hadCurated = Array.isArray(curated) && curated.length > 0;
      if (!hadCurated && competitors && competitors.length > 0) {
        await replaceCuratedStores(niche, competitors.slice(0, 10));
      }
    } catch (e) {
      console.warn('Failed to persist newly discovered competitors:', e && e.message ? e.message : e);
    }

    // 2. Analyze domain patterns
    console.log('Analyzing domain patterns...');
    const patternsRaw = await analyzeDomainPatterns(competitors, canonicalNiche);
    // Override niche keywords using strict database where available; otherwise, clean
    const canonical = String(canonicalNiche || '').toLowerCase().trim().replace(/\s+/g,' ');
    const strict = (DOMAIN_DATABASES.strictNicheKeywords && (DOMAIN_DATABASES.strictNicheKeywords[canonical] || DOMAIN_DATABASES.strictNicheKeywords[competitorFinder && competitorFinder.normalizeNiche ? competitorFinder.normalizeNiche(canonical) : canonical])) || null;
    const patterns = {
      ...patternsRaw,
      nicheKeywords: strict ? strict : removePrefixesAndSuffixesFromKeywords(canonicalNiche, patternsRaw && patternsRaw.nicheKeywords)
    };
    
    if (!patterns) {
      return res.status(500).json({ error: 'Failed to analyze domain patterns' });
    }

    // 3. Generate domain suggestions (40 total: 20 professional + 20 poetic) - FAST
    console.log('Generating domain suggestions...');
    const generatedDomains = await generateDomains(canonicalNiche, patterns, 20);
    
    // 4. Check availability
    console.log('Checking domain availability...');
    let availableDomains = await checkDomainAvailability(generatedDomains);
    // GUARANTEE exactly 6 available domains (1 top + 5 alternatives) - MANDATORY
    let attempts = 0;
    const maxAttempts = 5; // Increased attempts to ensure we get 6 domains
    while (availableDomains.length < 6 && attempts < maxAttempts) {
      attempts++;
      console.log(`🎯 MUST have 6 domains! Currently have ${availableDomains.length}. Generating more (attempt ${attempts}/${maxAttempts})...`);
      const moreGenerated = await generateDomains(canonicalNiche, patterns, 25); // Generate more per attempt
      const moreAvailable = await checkDomainAvailability(moreGenerated);
      // Merge unique by domain
      const existing = new Set(availableDomains.map(d => d.domain));
      for (const d of moreAvailable) {
        if (!existing.has(d.domain)) availableDomains.push(d);
      }
      console.log(`📊 Now have ${availableDomains.length} available domains after attempt ${attempts}`);
    }
    
    console.log(`Found ${availableDomains.length} available domains from ${generatedDomains.length} generated`);
    
    if (availableDomains.length === 0) {
      return res.status(400).json({ 
        error: 'No available domains found under $100. Try a different niche or check again later.',
        competitors,
        patterns,
        totalGenerated: generatedDomains.length,
        totalAvailable: 0
      });
    }
    
    // GUARANTEE exactly 6 domains - if we have less than 6, add mock domains
    if (availableDomains.length < 6) {
      console.log(`⚠️ Only found ${availableDomains.length} real domains. Adding mock domains to reach exactly 6 total.`);
      const needed = 6 - availableDomains.length;
      const mockDomains = await generateDomains(niche, patterns, needed * 3);
      const mockAvailable = mockDomains.slice(0, needed).map((domain, i) => ({
        domain,
        available: true,
        price: 15 + i,
        currency: 'USD',
        mock: true
      }));
      availableDomains.push(...mockAvailable);
      console.log(`✅ Now have exactly ${availableDomains.length} domains (${availableDomains.length - needed} real + ${needed} mock)`);
    }
    
    // 5. Use ChatGPT to select the best 6 domains from available ones
    console.log('Using AI to select best 6 domains...');
    const selectedDomains = await selectBestDomainsWithAI(availableDomains, canonicalNiche, patterns);
    
    // GUARANTEE exactly 6 domains - this is mandatory
    if (selectedDomains.length < 6) {
      console.log(`🎯 AI selected only ${selectedDomains.length} domains. Adding more to reach exactly 6.`);
      const chosen = new Set(selectedDomains.map(d => d.domain));
      for (const d of availableDomains) {
        if (selectedDomains.length >= 6) break;
        if (!chosen.has(d.domain)) selectedDomains.push(d);
      }
    }
    
    // Ensure we have EXACTLY 6 domains, no more, no less
    if (selectedDomains.length > 6) {
      selectedDomains.splice(6); // Keep only first 6
    }
    
    if (selectedDomains.length === 0) {
      return res.status(400).json({ 
        error: `No suitable domains could be selected for "${niche}". Generated ${generatedDomains.length} domains, ${availableDomains.length} available, but none met quality standards.`,
        suggestion: `Try a different niche or check again later.`
      });
    }

    // FINAL VALIDATION: Ensure we have exactly 6 domains
    if (selectedDomains.length !== 6) {
      console.error(`❌ CRITICAL ERROR: Expected exactly 6 domains, but have ${selectedDomains.length}`);
      return res.status(500).json({ 
        error: `Internal error: Expected 6 domains but got ${selectedDomains.length}. Please try again.`
      });
    }

    const bestDomain = selectedDomains[0];
    const alternatives = selectedDomains.slice(1); // This will be exactly 5 alternatives
    
    console.log(`✅ SUCCESS: Returning 1 top domain + ${alternatives.length} alternatives = ${selectedDomains.length} total`);

    res.json({
      competitors,
      patterns,
      recommendation: bestDomain,
      alternatives,
      totalGenerated: generatedDomains.length,
      totalAvailable: availableDomains.length,
      source: 'ai_generated', // Indicate this used AI generation
      processingTime: `${Math.round(elapsedTime/1000)}s`
    });

  } catch (error) {
    // COMPREHENSIVE ERROR LOGGING for troubleshooting
    const errorDetails = {
      timestamp: new Date().toISOString(),
      endpoint: '/api/generate-domains',
      niche: niche,
      errorMessage: error.message,
      errorStack: error.stack,
      requestBody: req.body,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
    };
    
    console.error('❌ CRITICAL ERROR in /api/generate-domains:', JSON.stringify(errorDetails, null, 2));
    console.error('Full error object:', error);
    
    // Send user-friendly error with hidden debug info
    res.status(500).json({ 
      error: error.message || 'An unexpected error occurred while generating domains',
      debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
});

// (Memory endpoints removed)

// Generate more domains (avoiding duplicates)
app.post('/api/generate-more', async (req, res) => {
  const { niche, excludeDomains } = req.body;
  
  try {
    if (!niche) {
      return res.status(400).json({ error: 'Niche is required' });
    }

    // No cache
    
    console.log(`⚡ Generating exactly 5 more domains for "${niche}"...`);
    
    let attempts = 0;
    let allAvailableDomains = [];
    const maxAttempts = 3;
    
    // Keep generating until we have at least 5 unique, available domains
    while (allAvailableDomains.length < 5 && attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Attempt ${attempts} to generate more domains...`);
      
      // Generate more domains (increase count with each attempt)
      const generateCount = 15 + (attempts * 5);
      let patterns;
      
      // Basic patterns (no cache)
      patterns = { 
        nicheKeywords: [niche], 
        industryTerms: [],
        patterns: { averageLength: 12, wordCount: "2 words" }
      };
      
      const newDomains = await generateDomains(niche, patterns, generateCount);
      
      // Filter out already used domains and excluded domains
      const usedSet = new Set(excludeDomains);
      const unusedDomains = newDomains.filter(domain => 
        !usedSet.has(domain) &&
        !allAvailableDomains.some(existing => existing.domain === domain)
      );
      
      // Check availability
      const availableDomains = await checkDomainAvailability(unusedDomains);
      
      // Add new available domains to our collection
      allAvailableDomains.push(...availableDomains);
      
      // Remove duplicates based on domain name
      allAvailableDomains = allAvailableDomains.filter((domain, index, self) =>
        index === self.findIndex(d => d.domain === domain.domain)
      );
      
      console.log(`✅ Found ${availableDomains.length} new domains, total: ${allAvailableDomains.length}`);
    }
    
    if (allAvailableDomains.length === 0) {
      return res.json({ 
        domains: [],
        message: `No new available domains found for "${niche}". Try a different niche variation.`
      });
    }

    // GUARANTEE exactly 6 domains (1 top + 5 alternatives) - MANDATORY
    let finalDomains = allAvailableDomains.slice(0, 6);
    let extraAttempts = 0;
    while (finalDomains.length < 6 && extraAttempts < 3) {
      extraAttempts++;
      console.log(`🎯 Need ${6 - finalDomains.length} more domains. Extra attempt ${extraAttempts}/3...`);
      const more = await generateDomains(niche, patterns, 30);
      const moreAvail = await checkDomainAvailability(more);
      const used = new Set([...excludeDomains, ...finalDomains.map(d => d.domain)]);
      for (const d of moreAvail) {
        if (finalDomains.length >= 6) break;
        if (!used.has(d.domain)) finalDomains.push(d);
      }
    }
    
    // If still not enough, add mock domains to reach exactly 6
    if (finalDomains.length < 6) {
      console.log(`⚠️ Only found ${finalDomains.length} real domains. Adding mock domains to reach exactly 6.`);
      const needed = 6 - finalDomains.length;
      const mockDomains = await generateDomains(niche, patterns, needed * 2);
      const mockAvailable = mockDomains.slice(0, needed).map((domain, i) => ({
        domain,
        available: true,
        price: 15 + i,
        currency: 'USD',
        mock: true
      }));
      finalDomains.push(...mockAvailable);
    }
    
    // Update cache with new domains
    // No cache updates

    // FINAL VALIDATION: Ensure exactly 6 domains
    if (finalDomains.length !== 6) {
      console.error(`❌ CRITICAL ERROR: Expected exactly 6 domains, but have ${finalDomains.length}`);
      return res.status(500).json({ 
        error: `Internal error: Expected 6 domains but got ${finalDomains.length}. Please try again.`
      });
    }
    
    const topDomain = finalDomains[0];
    const alternativeDomains = finalDomains.slice(1); // Exactly 5 alternatives
    
    console.log(`✅ SUCCESS: Returning 1 top domain + ${alternativeDomains.length} alternatives = ${finalDomains.length} total`);
    
    res.json({
      recommendation: topDomain,
      alternatives: alternativeDomains,
      domains: finalDomains, // Keep for backwards compatibility
      message: `Found exactly 6 domains for "${niche}" (1 top recommendation + 5 alternatives)`
    });

  } catch (error) {
    // COMPREHENSIVE ERROR LOGGING for troubleshooting
    const errorDetails = {
      timestamp: new Date().toISOString(),
      endpoint: '/api/generate-more',
      niche: niche,
      excludeDomains: excludeDomains,
      errorMessage: error.message,
      errorStack: error.stack,
      requestBody: req.body,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
    };
    
    console.error('❌ CRITICAL ERROR in /api/generate-more:', JSON.stringify(errorDetails, null, 2));
    console.error('Full error object:', error);
    
    res.status(500).json({ 
      error: error.message || 'An unexpected error occurred while generating more domains',
      debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
});

// Purge all cached/learned niche data
app.post('/api/purge-memory', async (req, res) => {
  try {
    if (!db) {
      return res.json({ ok: true, message: 'No local database active; nothing to purge.' });
    }

    const runAsync = (sql) => new Promise(resolve => {
      db.run(sql, [], (err) => resolve(err));
    });

    const errors = [];
    const statements = [
      'DELETE FROM niches_cache',
      'DELETE FROM competitor_stores',
      'DELETE FROM generated_domains',
      'DELETE FROM niches',
      'VACUUM'
    ];

    for (const sql of statements) {
      const err = await runAsync(sql);
      if (err) errors.push({ sql, error: err.message });
    }

    if (errors.length) {
      return res.status(500).json({ ok: false, errors });
    }

    return res.json({ ok: true, message: 'All AI-related niche data purged from SQLite.' });
  } catch (error) {
    // COMPREHENSIVE ERROR LOGGING for troubleshooting
    const errorDetails = {
      timestamp: new Date().toISOString(),
      endpoint: '/api/purge-memory',
      errorMessage: error.message,
      errorStack: error.stack,
      requestBody: req.body,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
    };
    
    console.error('❌ CRITICAL ERROR in /api/purge-memory:', JSON.stringify(errorDetails, null, 2));
    console.error('Full error object:', error);
    
    return res.status(500).json({ 
      ok: false, 
      error: error.message || 'An unexpected error occurred while purging memory',
      debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
});

// Audit curated/known stores for a niche, replace non-qualifying, and persist
app.post('/api/audit-competitors', async (req, res) => {
  const { niche } = req.body;
  if (!niche) {
    return res.status(400).json({ error: 'Niche is required' });
  }
  try {
    if (isServerless) {
      return res.status(405).json({ error: 'Disabled on serverless environment' });
    }
    const result = await auditCompetitorsForNiche(niche, 120000);
    return res.json(result);
  } catch (error) {
    console.error('Error auditing competitors:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Audit ALL niches in our popular DB (and those present in SQLite) and persist results
app.post('/api/audit-competitors-all', async (req, res) => {
  try {
    if (isServerless) {
      return res.status(405).json({ error: 'Disabled on serverless environment' });
    }
    const popular = Object.keys(DOMAIN_DATABASES.popularNiches || {});
    const rows = db ? await dbAll('SELECT name FROM niches', []) : [];
    const fromDB = rows.map(r => r.name).filter(Boolean);
    const all = Array.from(new Set([...popular, ...fromDB])).filter(Boolean);
    const timePerNiche = 60000; // 60s each cap

    const results = [];
    for (const n of all) {
      try {
        const r = await auditCompetitorsForNiche(n, timePerNiche);
        results.push(r);
      } catch (e) {
        results.push({ niche: n, error: e.message });
      }
    }
    return res.json({ total: results.length, results });
  } catch (error) {
    console.error('Error auditing all competitors:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Set curated competitors list for a niche (overwrites existing DB entries)
app.post('/api/set-curated-competitors', async (req, res) => {
  try {
    const { niche, competitors } = req.body || {};
    if (!niche || !Array.isArray(competitors)) {
      return res.status(400).json({ error: 'niche and competitors[] are required' });
    }
    if (isServerless) {
      return res.status(405).json({ error: 'Disabled on serverless environment' });
    }
    const ok = await replaceCuratedStores(niche, competitors);
    return res.json({ ok: !!ok, niche, saved: competitors.length });
  } catch (error) {
    console.error('Error setting curated competitors:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Global error handlers for unhandled errors
process.on('uncaughtException', (error) => {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    type: 'uncaughtException',
    errorMessage: error.message,
    errorStack: error.stack,
  };
  
  console.error('❌ UNCAUGHT EXCEPTION:', JSON.stringify(errorDetails, null, 2));
  console.error('Full error object:', error);
  
  // Don't exit the process in production to avoid downtime
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    type: 'unhandledRejection',
    reason: reason,
    promise: promise,
  };
  
  console.error('❌ UNHANDLED PROMISE REJECTION:', JSON.stringify(errorDetails, null, 2));
  console.error('Full reason:', reason);
});

// Global Express error handler
app.use((error, req, res, next) => {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    type: 'expressError',
    endpoint: req.path,
    method: req.method,
    errorMessage: error.message,
    errorStack: error.stack,
    requestBody: req.body,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
  };
  
  console.error('❌ EXPRESS ERROR HANDLER:', JSON.stringify(errorDetails, null, 2));
  console.error('Full error object:', error);
  
  res.status(500).json({ 
    error: error.message || 'An unexpected server error occurred',
    debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
  });
});

// Admin endpoint to view cached niches
app.get('/api/admin/cached-niches', async (req, res) => {
  try {
    const cachedNiches = await competitorFinder.getAllCachedNiches();
    res.json({
      success: true,
      count: cachedNiches.length,
      niches: cachedNiches
    });
  } catch (error) {
    console.error('Error fetching cached niches:', error);
    res.status(500).json({
      error: 'Failed to fetch cached niches',
      message: error.message
    });
  }
});

// Export handler for serverless, only listen locally in non-serverless
if (!isServerless) {
  app.listen(port, () => {
    console.log(`🚀 Domain generator server running at http://localhost:${port}`);
    console.log(`📊 Environment: ${isServerless ? 'Serverless' : 'Local'}`);
    console.log(`🔗 Name.com API: ${namecomAPI ? 'Configured' : 'Not configured (using mock data)'}`);
    console.log(`🐛 Error logging: Enhanced with comprehensive details`);
  });
}

module.exports = app;

