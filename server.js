const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const OpenAI = require('openai');
const NameComAPI = require('./namecom-api');
const CompetitorFinder = require('./competitor-finder');
const DOMAIN_DATABASES = require('./domain-databases');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Simple cache for generated domains to speed up "Generate More"
const domainCache = new Map();

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

// Initialize SQLite database
const db = new sqlite3.Database('domains.db');

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
});

// Helper function to search for high-ticket dropshipping stores
async function findCompetitorStores(niche) {
  try {
    console.log(`Finding competitors for niche: ${niche}`);
    const competitors = await competitorFinder.findCompetitors(niche);
    return competitors.slice(0, 5);
  } catch (error) {
    console.error('Error finding competitor stores:', error);
    return [];
  }
}

// Analyze domain patterns using ChatGPT with AI-powered niche analysis
async function analyzeDomainPatterns(competitorDomains, niche) {
  console.log(`🤖 Starting AI analysis for "${niche}" niche...`);
  
  // Get AI-powered niche analysis
  const industryTerms = await extractIndustryTerms(competitorDomains, niche);
  const nicheKeywords = await extractNicheKeywords(niche);
  
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
      model: "gpt-4",
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
5. PRICING STRATEGY: What price range to target for ${niche} domains?
6. BRAND POSITIONING: How should ${niche} domains sound to attract $1000+ customers?

Make recommendations SPECIFIC to ${niche}, not generic advice.

Return ONLY a JSON object:
{
  "optimalLength": "specific range for this niche",
  "bestStructures": ["structure 1", "structure 2", "structure 3"],
  "keyTerms": ["term1", "term2", "term3"],
  "avoidTerms": ["avoid1", "avoid2", "avoid3"],
  "pricingStrategy": "pricing advice for this niche",
  "brandPositioning": "how domains should sound for this niche"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4
    });

    const content = response.choices[0].message.content.trim();
    
    // Extract JSON from response
    let jsonStart = content.indexOf('{');
    let jsonEnd = content.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonStr = content.substring(jsonStart, jsonEnd);
      return JSON.parse(jsonStr);
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
  return {
    optimalLength: "4-12 characters (shorter is better)",
    bestStructures: [
      `${niche} + premium suffix (${niche}Pro.com)`,
      `Brand + ${niche} term (Lux${niche}.com)`,
      `Creative ${niche} wordplay`
    ],
    keyTerms: nicheKeywords.slice(0, 4),
    avoidTerms: ["overly specific products", "generic terms", "hard to spell words"],
    pricingStrategy: "Target $12-50 for standard domains, up to $100 for premium",
    brandPositioning: `Should sound premium and trustworthy for high-ticket ${niche} customers`
  };
}

// AI-powered niche analysis using OpenAI
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
- industryTerms: Broad terms that describe the entire industry (8-10 terms)
- nicheKeywords: Specific keywords for domain names (5-7 terms)
- productCategories: Main product types sold in this niche
- Focus on high-ticket items ($500+)
- Avoid overly specific product names
- Think about what premium customers would search for`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    const content = response.choices[0].message.content.trim();
    let jsonStart = content.indexOf('{');
    let jsonEnd = content.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonStr = content.substring(jsonStart, jsonEnd);
      return JSON.parse(jsonStr);
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

// Helper function to extract niche keywords (with AI integration)
async function extractNicheKeywords(niche) {
  // First, try to get keywords from AI analysis
  const aiAnalysis = await analyzeNicheWithAI(niche);
  if (aiAnalysis && aiAnalysis.nicheKeywords) {
    console.log(`✅ AI generated keywords for "${niche}":`, aiAnalysis.nicheKeywords);
    return aiAnalysis.nicheKeywords;
  }

  // Fallback to basic keywords
  console.log(`⚠️  Using fallback keywords for "${niche}"`);
  return [niche.toLowerCase(), 'premium', 'luxury', 'professional'];
}

// Generate domain suggestions - OPTIMIZED for speed
async function generateDomains(niche, patterns, count = 40) {
  console.log(`🎯 Generating ${count} domains for high-ticket ${niche} niche...`);
  
  const nicheKeywords = patterns.nicheKeywords || [];
  const industryTerms = patterns.industryTerms || [];
  
  // Get niche-specific terms from database
  const normalizedNiche = niche.toLowerCase().replace(/\s+/g, ' ').trim();
  const nicheTermsFromDB = DOMAIN_DATABASES.nicheTerms[normalizedNiche] || 
                           DOMAIN_DATABASES.nicheTerms[niche.toLowerCase()] || [];
  const poeticDescriptors = DOMAIN_DATABASES.poeticDescriptors[normalizedNiche] || 
                           DOMAIN_DATABASES.poeticDescriptors[niche.toLowerCase()] || [];

  // Generate fewer domains for speed: 20 professional + 20 poetic = 40 total
  const professionalDomains = await generateProfessionalDomains(niche, nicheTermsFromDB, nicheKeywords, industryTerms, 20);
  
  const poeticDomains = await generatePoeticDomains(niche, nicheTermsFromDB, poeticDescriptors, 20);
  
  const allDomains = [...professionalDomains, ...poeticDomains];
  console.log(`✅ Generated ${professionalDomains.length} professional + ${poeticDomains.length} poetic = ${allDomains.length} total domains`);
  
  return allDomains;
}

// Generate Professional Domains: Short, brandable, professional
async function generateProfessionalDomains(niche, nicheTerms, nicheKeywords, industryTerms, count = 20) {
    const prompt = `Generate ${count} SHORT, professional domain names for a high-ticket ${niche} e-commerce store (products $1000+).

🎯 CRITICAL: All domains MUST be clearly related to ${niche}. Use ${niche} terms, concepts, or related words.

NICHE CONTEXT: ${niche}
INDUSTRY TERMS: ${industryTerms.join(', ')}
NICHE KEYWORDS: ${nicheKeywords.join(', ')}

REQUIREMENTS:
✅ 7-12 characters MAXIMUM (shorter is better)
✅ MUST relate to ${niche} industry/concepts
✅ Professional, trustworthy, premium feel
✅ Include ${niche}-related terms or concepts
✅ Target affluent ${niche} customers ($1000+ purchases)
✅ .com extension only

DOMAIN CREATION STRATEGY:
1. Use ${niche} industry terms: ${industryTerms.slice(0, 3).join(', ')}
2. Combine with premium prefixes: Pro, Elite, Prime, Lux, Smart, etc.
3. Add professional suffixes: Pro, Hub, Zone, Direct, etc.
4. Create ${niche}-specific brand names

NICHE-SPECIFIC EXAMPLES FOR ${niche}:
${niche === 'smart home' ? '- SmartHub.com, TechHome.com, HomeIQ.com, IoTPro.com, AutoHome.com' : ''}
${niche === 'marine' ? '- MarinePro.com, YachtHub.com, SeaElite.com, NavalPro.com, OceanHub.com' : ''}
${niche === 'backyard' ? '- YardPro.com, BackyardHub.com, GreenElite.com, PatioZone.com, YardZone.com' : ''}
${niche === 'wellness' ? '- WellPro.com, HealthHub.com, ZenElite.com, VitalZone.com, WellZone.com' : ''}
${niche === 'fitness' ? '- FitPro.com, GymElite.com, PowerHub.com, StrengthZone.com, FitZone.com' : ''}
${niche === 'garage' ? '- GaragePro.com, ToolHub.com, WorkZone.com, ShopElite.com, CraftHub.com' : ''}
${niche === 'aquarium' ? '- AquaPro.com, TankHub.com, FishElite.com, AquaZone.com, MarineHub.com' : ''}
- Generic: Use ${niche} + Pro/Elite/Hub/Zone combinations

IMPORTANT: Every domain must be recognizable as ${niche}-related!

Return ONLY a JSON array: ["domain1.com", "domain2.com", ...]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
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

🎯 CRITICAL: All domains MUST be clearly related to ${niche}. Use ${niche} terms, concepts, or creative wordplay.

NICHE CONTEXT: ${niche}
NICHE TERMS: ${nicheTerms.join(', ')}
CREATIVE DESCRIPTORS: ${poeticDescriptors.join(', ')}

REQUIREMENTS:
✅ 6-12 characters MAXIMUM (shorter is better)
✅ MUST relate to ${niche} industry/concepts
✅ Creative, catchy, memorable
✅ Can be playful, fun, or intriguing
✅ Easy to spell and pronounce
✅ Target affluent ${niche} customers
✅ .com extension only

NICHE-SPECIFIC CREATIVE EXAMPLES FOR ${niche}:
${niche === 'smart home' ? '- TechNest.com, SmartDen.com, ConnectCo.com, IoTopia.com, AutoMate.com' : ''}
${niche === 'marine' ? '- SeaCraft.com, WavePro.com, OceanIQ.com, YachtCo.com, MarineX.com' : ''}
${niche === 'backyard' ? '- YardCo.com, GreenSpace.com, PatioIQ.com, BackyardX.com, YardCraft.com' : ''}
${niche === 'wellness' ? '- ZenCo.com, WellCraft.com, VitalIQ.com, HealthX.com, WellSpace.com' : ''}
${niche === 'fitness' ? '- FitCraft.com, PowerCo.com, StrengthX.com, GymIQ.com, FitSpace.com' : ''}
${niche === 'garage' ? '- ToolCraft.com, WorkCo.com, ShopIQ.com, CraftX.com, MakerSpace.com' : ''}
${niche === 'aquarium' ? '- AquaCraft.com, TankCo.com, FishIQ.com, AquaX.com, MarineSpace.com' : ''}
- Generic: Use creative ${niche} + Craft/Co/IQ/X/Space combinations

CREATE DOMAINS THAT:
- Use creative wordplay related to ${niche}
- Sound modern and memorable
- Are brandable like tech startups
- Convey premium quality in few letters
- Could work as luxury ${niche} brand names

AVOID:
- Generic luxury terms (Luxora, Veluxe, etc.)
- Long compound words
- Domains unrelated to ${niche}

IMPORTANT: Every domain must be recognizable as ${niche}-related!

Return ONLY a JSON array: ["domain1.com", "domain2.com", ...]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
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

// Fallback professional domain generation - SHORT domains
function generateFallbackProfessionalDomains(niche, nicheTerms, count = 20) {
  const domains = [];
  const shortPrefixes = ['Pro', 'Elite', 'Apex', 'Zen', 'Lux', 'Prime'];
  const shortSuffixes = ['x', 'o', 'a', 'i', 'us', 'ex'];
  const nicheShort = niche.substring(0, 4); // First 4 letters of niche
  
  // Generate short professional domains
  for (const prefix of shortPrefixes) {
    if (domains.length < count/2) {
      domains.push(`${prefix}${nicheShort}.com`);
    }
  }
  
  for (const suffix of shortSuffixes) {
    if (domains.length < count) {
      domains.push(`${nicheShort}${suffix}.com`);
    }
  }
  
  return domains.slice(0, count);
}

// Fallback poetic domain generation - SHORT creative domains
function generateFallbackPoeticDomains(niche, nicheTerms, descriptors, count = 20) {
  const domains = [];
  const shortWords = ['Zen', 'Flux', 'Echo', 'Bolt', 'Sage', 'Prism', 'Nexus', 'Vibe'];
  const nicheShort = niche.substring(0, 4);
  
  // Generate short creative domains
  for (const word of shortWords) {
    if (domains.length < count/2) {
      domains.push(`${word}.com`);
    }
    if (domains.length < count) {
      domains.push(`${nicheShort}${word}.com`);
    }
  }
  
  return domains.slice(0, count);
}

// Check domain availability using Name.com API
async function checkDomainAvailability(domains) {
  if (namecomAPI) {
    try {
      console.log(`Checking availability for ${domains.length} domains...`);
      const results = await namecomAPI.checkMultipleDomains(domains);
      
      // Filter for available domains under $100
      return results
        .filter(result => result.available && result.price && result.price < 100)
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
      model: "gpt-4",
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
    // Check if niche exists
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
        });
      }

      res.json({ nicheId, niche });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Main domain generation endpoint
app.post('/api/generate-domains', async (req, res) => {
  const { niche } = req.body;
  
  try {
    // 1. Find competitor stores
    console.log(`Finding competitor stores for: ${niche}`);
    const competitors = await findCompetitorStores(niche);
    
    if (competitors.length === 0) {
      return res.status(400).json({ 
        error: `Unable to find competitors for "${niche}". This could be because the niche is too specific or the AI couldn't find relevant high-ticket companies.`,
        suggestion: `Try a broader niche term or one of our pre-loaded categories for guaranteed results.`,
        availableNiches: [
          'firepit', 'backyard', 'marine', 'horse riding', 'jewelry', 'watches', 
          'fitness', 'automotive', 'home decor', 'kitchen', 'baby', 'pet', 
          'electronics', 'wellness', 'outdoor', 'adventure', 'garage', 'smart home'
        ]
      });
    }

    // 2. Analyze domain patterns
    console.log('Analyzing domain patterns...');
    const patterns = await analyzeDomainPatterns(competitors, niche);
    
    if (!patterns) {
      return res.status(500).json({ error: 'Failed to analyze domain patterns' });
    }

    // 3. Generate domain suggestions (40 total: 20 professional + 20 poetic) - FAST
    console.log('Generating domain suggestions...');
    const generatedDomains = await generateDomains(niche, patterns, 40);
    
    // 4. Check availability
    console.log('Checking domain availability...');
    const availableDomains = await checkDomainAvailability(generatedDomains);
    
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
    
    // 5. Use ChatGPT to select the best 6 domains from available ones
    console.log('Using AI to select best 6 domains...');
    const selectedDomains = await selectBestDomainsWithAI(availableDomains, niche, patterns);
    
    if (selectedDomains.length === 0) {
      return res.status(400).json({ 
        error: `No suitable domains could be selected for "${niche}". Generated ${generatedDomains.length} domains, ${availableDomains.length} available, but none met quality standards.`,
        suggestion: `Try a different niche or check again later.`,
        availableNiches: [
          'firepit', 'backyard', 'marine', 'horse riding', 'jewelry', 'watches', 
          'fitness', 'automotive', 'home decor', 'kitchen', 'baby', 'pet', 
          'electronics', 'wellness', 'outdoor', 'adventure', 'garage', 'smart home'
        ]
      });
    }

    const bestDomain = selectedDomains[0];
    const alternatives = selectedDomains.slice(1);

    // Cache the generated domains for faster "Generate More"
    const cacheKey = niche.toLowerCase().trim();
    if (!domainCache.has(cacheKey)) {
      domainCache.set(cacheKey, {
        allGenerated: [],
        usedDomains: new Set(),
        patterns,
        competitors
      });
    }
    
    const cache = domainCache.get(cacheKey);
    cache.allGenerated.push(...generatedDomains);
    selectedDomains.forEach(d => cache.usedDomains.add(d.domain));

    res.json({
      competitors,
      patterns,
      recommendation: bestDomain,
      alternatives,
      totalGenerated: generatedDomains.length,
      totalAvailable: availableDomains.length
    });

  } catch (error) {
    console.error('Error generating domains:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate more domains (avoiding duplicates)
app.post('/api/generate-more', async (req, res) => {
  const { niche, excludeDomains } = req.body;
  
  try {
    if (!niche) {
      return res.status(400).json({ error: 'Niche is required' });
    }

    const cacheKey = niche.toLowerCase().trim();
    let cache = domainCache.get(cacheKey);
    
    if (!cache) {
      // No cache, use lightweight generation
      console.log(`⚡ No cache found for "${niche}", generating fresh...`);
      const patterns = { nicheKeywords: [niche], industryTerms: [] };
      const generated = await generateDomains(niche, patterns, 20);
      const available = await checkDomainAvailability(generated);
      const filtered = available.filter(d => !excludeDomains.includes(d.domain));
      
      return res.json({
        domains: filtered.slice(0, 5)
      });
    }

    // Generate only 20 new domains for speed
    console.log(`⚡ Fast generating 20 more domains for "${niche}"...`);
    const newDomains = await generateDomains(niche, cache.patterns, 20);
    
    // Filter out already used domains and excluded domains
    const unusedDomains = newDomains.filter(domain => 
      !cache.usedDomains.has(domain) && !excludeDomains.includes(domain)
    );
    
    // Check availability
    const availableDomains = await checkDomainAvailability(unusedDomains);
    
    if (availableDomains.length === 0) {
      return res.json({ 
        domains: [],
        message: `No new available domains found for "${niche}". Try refreshing.`
      });
    }

    // Update cache with new domains
    cache.allGenerated.push(...newDomains);
    availableDomains.forEach(d => cache.usedDomains.add(d.domain));

    res.json({
      domains: availableDomains.slice(0, 5)
    });

  } catch (error) {
    console.error('Error generating more domains:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Domain generator server running at http://localhost:${port}`);
});
