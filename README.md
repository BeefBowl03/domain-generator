# Domain Generator for High-Ticket Dropshipping

A sophisticated domain generation tool that analyzes competitor stores and generates premium domain suggestions for high-ticket dropshipping businesses.

## Features

- 🔍 **Competitor Analysis**: Automatically finds 5 real high-ticket dropshipping stores in your niche
- 📊 **Pattern Recognition**: Analyzes domain patterns using AI to understand successful naming conventions
- 🎯 **Smart Generation**: Uses ChatGPT to generate domain suggestions based on analyzed patterns
- 💰 **Availability Checking**: Integrates with Name.com API to check domain availability and pricing
- 🏆 **Quality Filtering**: Shows best recommendation plus 5 alternatives under $100
- 🔄 **Generate More**: Creates additional unique domains without duplicates
- 💾 **Database Storage**: Caches niche data for faster subsequent searches

## Quick Start

### 1. Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key
- Name.com API credentials (optional but recommended)

### 2. Installation

```bash
# Clone or download the project
cd domain-generator

# Install dependencies
npm install
```

### 3. Configuration

1. Copy `env.example` to `.env`:
```bash
cp env.example .env
```

2. Edit `.env` with your API keys:
```env
OPENAI_API_KEY=your_openai_api_key_here
NAMECOM_USERNAME=your_namecom_username
NAMECOM_TOKEN=your_namecom_api_token
```

### 4. Run the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Visit `http://localhost:3000` to use the domain generator.

## How It Works

1. **Enter Your Niche**: Input your business niche (e.g., "backyard", "marine", "horse riding")

2. **Competitor Discovery**: The system finds 5 real high-ticket dropshipping stores in your niche

3. **Pattern Analysis**: AI analyzes competitor domains to identify:
   - Common length patterns
   - Word count structures
   - Industry-specific terms
   - Niche keywords

4. **Domain Generation**: ChatGPT generates 50+ domain suggestions based on the patterns

5. **Availability Check**: Name.com API verifies which domains are available and under $100

6. **Smart Filtering**: Presents the best recommendation plus 5 alternatives

7. **Generate More**: Click to get 5 additional unique options

## API Endpoints

### POST `/api/generate-domains`
Generate domains for a specific niche.

**Request:**
```json
{
  "niche": "backyard"
}
```

**Response:**
```json
{
  "competitors": [...],
  "patterns": {...},
  "recommendation": {...},
  "alternatives": [...],
  "totalGenerated": 50,
  "totalAvailable": 12
}
```

### POST `/api/generate-more`
Generate additional domains avoiding duplicates.

**Request:**
```json
{
  "niche": "backyard",
  "excludeDomains": ["domain1.com", "domain2.com"]
}
```

## Configuration Options

### OpenAI Settings
- Model: GPT-4 (for best results)
- Temperature: 0.7 for creative domain generation
- Temperature: 0.3 for pattern analysis

### Domain Filtering
- Length: 7-20 characters
- Price: Under $100/year
- Structure: 2-3 words preferred
- No numbers or hyphens

### Database
- SQLite for local storage
- Caches niche data and competitor stores
- Tracks generated domains to avoid duplicates

## Customization

### Adding New Competitor Sources
Edit the `findCompetitorStores` function in `server.js` to integrate additional data sources:
- Google Custom Search API
- SimilarWeb API
- Manual competitor databases

### Modifying Generation Patterns
Adjust the ChatGPT prompts in `server.js` to change:
- Domain generation style
- Pattern analysis focus
- Quality scoring criteria

### Styling
Customize the UI by editing `public/styles.css`:
- Color schemes
- Layout adjustments
- Responsive breakpoints

## Troubleshooting

### Common Issues

1. **No competitors found**: Add manual competitor data for new niches
2. **No available domains**: Increase generation count or adjust filters
3. **API errors**: Check API key configuration and rate limits

### Debug Mode
Set `NODE_ENV=development` for detailed logging.

## Production Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=your_production_key
```

### Performance Optimization
- Enable domain caching
- Implement rate limiting
- Add error monitoring
- Scale with load balancers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For technical support or feature requests, please contact the development team.
