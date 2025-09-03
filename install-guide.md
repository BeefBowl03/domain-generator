# Quick Start Guide - Domain Generator

## 🚀 Easy Setup (Windows)

1. **Double-click `start.bat`** - This will:
   - Create your `.env` file automatically
   - Install all dependencies
   - Start the server

2. **Add your API keys** when prompted:
   ```
   OPENAI_API_KEY=your_openai_key_here
   NAMECOM_USERNAME=your_namecom_username
   NAMECOM_TOKEN=your_namecom_token
   ```

3. **Open your browser** to: `http://localhost:3000`

## 🎯 Supported Niches

Your domain generator now supports **15+ niches** with real competitors:

### 🔥 **High-Ticket Categories:**
- **Firepit/Backyard** - Solo Stove, Breeo, Fire Pit Art
- **Marine** - West Marine, Defender Marine, Wholesale Marine  
- **Horse Riding** - Dover Saddlery, SmartPak Equine
- **Jewelry** - Blue Nile, James Allen, Brilliant Earth
- **Watches** - Crown & Caliber, Hodinkee Shop, Chrono24
- **Fitness** - Rogue Fitness, REP Fitness, Titan Fitness
- **Automotive** - Summit Racing, JEGS

### 🏠 **Home & Lifestyle:**
- **Smart Home** - SmartThings, Nest, Ring
- **Home Decor** - West Elm, CB2, Article
- **Kitchen** - Williams Sonoma, Sur La Table
- **Baby** - Pottery Barn Kids, Maisonette

### 🐾 **Other Categories:**
- **Pet** - Chewy, BarkBox, West Paw
- **Electronics** - B&H Photo, Adorama, Newegg
- **Wellness** - Thrive Market, iHerb
- **Outdoor/Adventure** - REI, Patagonia, The North Face

## ✨ **Features:**

- ✅ **Real Competitor Analysis** - All links work and lead to live websites
- ✅ **AI-Powered Domain Generation** - ChatGPT creates premium domain suggestions
- ✅ **Live Domain Checking** - Name.com API verifies availability and pricing
- ✅ **Smart Filtering** - Shows only domains under $100
- ✅ **Generate More** - Get additional unique options without duplicates
- ✅ **Mobile Responsive** - Works on all devices

## 🛠 **Manual Setup (Alternative)**

If you prefer manual setup:

```bash
npm install
copy env.example .env
# Edit .env with your API keys
node server.js
```

## 🎯 **How to Use:**

1. Enter any niche (e.g., "jewelry", "watches", "marine")
2. Click "Generate Domains"
3. Review competitor analysis and domain patterns
4. See your top recommendation + 5 alternatives
5. Click "Generate 5 More" for additional options

## 🔧 **Troubleshooting:**

- **Server won't start?** Make sure you have Node.js installed
- **No domains found?** Check your OpenAI API key in `.env`
- **Domain checking not working?** Verify Name.com credentials

## 📞 **Support:**

The system includes comprehensive error handling and fallbacks, so it should work even if some APIs are temporarily unavailable.
