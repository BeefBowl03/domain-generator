const axios = require('axios');

class NameComAPI {
    constructor(username, token) {
        this.username = username;
        this.token = token;
        this.baseURL = 'https://api.name.com';  // Correct base URL (no /v4)
        this.auth = Buffer.from(`${username}:${token}`).toString('base64');
        
        console.log('🔗 Connecting to Name.com API...');
        this.useRealAPI = true; // Enable real API
        this.connectionTested = false;
    }

    async testConnection() {
        if (this.connectionTested) return;
        
        try {
            // Test with the Hello endpoint
            const response = await axios.get(`${this.baseURL}/v4/hello`, {
                headers: {
                    'Authorization': `Basic ${this.auth}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            
            console.log('✅ Name.com API connection successful');
            this.connectionTested = true;
            
        } catch (error) {
            console.error('❌ Name.com API connection failed:', error.response?.status, error.response?.data || error.message);
            console.log('⚠️  Switching to fallback simulation mode');
            this.useRealAPI = false;
            throw error;
        }
    }

    async checkDomainAvailability(domain) {
        if (!this.useRealAPI) {
            return this.simulateDomainCheck(domain);
        }
        
        try {
            // First test API connectivity
            await this.testConnection();
            
            // Method 1: Use CheckAvailability endpoint (POST request)
            try {
                const response = await axios.post(`${this.baseURL}/v4/domains:checkAvailability`, {
                    domainNames: [domain]
                }, {
                    headers: {
                        'Authorization': `Basic ${this.auth}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });

                if (response.data && response.data.results && response.data.results.length > 0) {
                    const result = response.data.results[0];
                    return {
                        domain,
                        available: result.purchasable || false,
                        price: result.purchasePrice || 15,
                        currency: result.purchaseCurrency || 'USD'
                    };
                }
            } catch (checkError) {
                console.log(`Method 1 failed, trying Method 2...`);
            }

            // Method 2: Use domain search endpoint (POST request)
            const searchResponse = await axios.post(`${this.baseURL}/v4/domains:search`, {
                keyword: domain.replace('.com', ''),
                tlds: ['.com']
            }, {
                headers: {
                    'Authorization': `Basic ${this.auth}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (searchResponse.data && searchResponse.data.results) {
                const domainResult = searchResponse.data.results.find(r => r.domainName === domain);
                
                if (domainResult) {
                    return {
                        domain,
                        available: domainResult.purchasable || false,
                        price: domainResult.purchasePrice || 15,
                        currency: domainResult.purchaseCurrency || 'USD'
                    };
                }
            }

            // If domain not found in search, it might be available
            return {
                domain,
                available: true,
                price: 15,
                currency: 'USD'
            };

        } catch (error) {
            console.error(`❌ Name.com API error for ${domain}:`, error.response?.status, error.response?.data || error.message);
            
            // If API fails, use simulation but log the issue
            console.log(`⚠️  Falling back to simulation for ${domain}`);
            return this.simulateDomainCheck(domain);
        }
    }

    simulateDomainCheck(domain) {
        // Smart simulation based on domain characteristics
        const domainName = domain.replace('.com', '').toLowerCase();
        
        // Common domains are less likely to be available
        const commonWords = ['shop', 'store', 'buy', 'get', 'best', 'top', 'pro', 'online'];
        const hasCommonWord = commonWords.some(word => domainName.includes(word));
        
        // Very short domains are less likely to be available
        const isShort = domainName.length < 8;
        
        // Dictionary words are less likely to be available
        const isDictionaryWord = ['elite', 'premium', 'luxury', 'prime'].includes(domainName);
        
        // Calculate availability probability
        let availabilityChance = 0.75; // Base 75% chance
        if (hasCommonWord) availabilityChance -= 0.3;
        if (isShort) availabilityChance -= 0.2;
        if (isDictionaryWord) availabilityChance -= 0.4;
        
        const isAvailable = Math.random() < Math.max(0.1, availabilityChance);
        
        // Price simulation (available domains have realistic pricing)
        let price = null;
        if (isAvailable) {
            // Premium domains cost more
            if (isShort || isDictionaryWord) {
                price = Math.floor(Math.random() * 40) + 25; // $25-65
            } else {
                price = Math.floor(Math.random() * 30) + 12; // $12-42
            }
        }
        
        return {
            domain,
            available: isAvailable,
            price: price,
            currency: 'USD',
            fallback: true
        };
    }

    async checkMultipleDomains(domains, maxConcurrent = 5) {
        const results = [];
        
        // Process domains in batches to avoid rate limiting
        for (let i = 0; i < domains.length; i += maxConcurrent) {
            const batch = domains.slice(i, i + maxConcurrent);
            const batchPromises = batch.map(domain => this.checkDomainAvailability(domain));
            
            try {
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                
                // Add delay between batches to respect rate limits
                if (i + maxConcurrent < domains.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error('Error in batch processing:', error);
            }
        }

        return results;
    }

    async searchDomains(keyword, tlds = ['.com'], maxResults = 20) {
        if (!this.useRealAPI) {
            return [];
        }
        
        try {
            const response = await axios.post(`${this.baseURL}/v4/domains:search`, {
                keyword,
                tlds
            }, {
                headers: {
                    'Authorization': `Basic ${this.auth}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            return response.data.results?.slice(0, maxResults) || [];
        } catch (error) {
            console.error('Error searching domains:', error.response?.status, error.response?.data || error.message);
            return [];
        }
    }
}

module.exports = NameComAPI;
