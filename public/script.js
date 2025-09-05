class DomainGenerator {
    constructor() {
        this.currentNiche = '';
        this.usedDomains = new Set();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const nicheInput = document.getElementById('nicheInput');
        const generateBtn = document.getElementById('generateBtn');
        const generateMoreBtn = document.getElementById('generateMoreBtn');
        const retryBtn = document.getElementById('retryBtn');

        // Enter key support
        nicheInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.generateDomains();
            }
        });

        generateBtn.addEventListener('click', () => this.generateDomains());
        generateMoreBtn.addEventListener('click', () => this.generateMoreDomains());
        retryBtn.addEventListener('click', () => this.resetAndRetry());
    }

    async generateDomains() {
        const niche = document.getElementById('nicheInput').value.trim();
        this.currentNiche = niche;
        
        if (!niche) {
            alert('Please enter a niche');
            return;
        }
        this.usedDomains.clear();
        this.showLoading();

        try {
            const response = await fetch('/api/generate-domains', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ niche })
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle specific error with available niches
                if (data.availableNiches) {
                    this.showErrorWithNiches(data.error, data.availableNiches, data.suggestion);
                } else {
                    this.showError(data.error || 'Failed to generate domains. Please try again.');
                }
                return;
            }

            this.displayResults(data);
            
            // Track used domains
            if (data.recommendation) {
                this.usedDomains.add(data.recommendation.domain);
            }
            data.alternatives?.forEach(domain => {
                this.usedDomains.add(domain.domain);
            });

        } catch (error) {
            console.error('❌ Error generating domains:', error);
            
            // Enhanced error handling with more context
            let errorMessage = 'Failed to generate domains. Please try again.';
            
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                errorMessage = errorData.error || errorMessage;
                
                // Log detailed error information for troubleshooting
                console.error('🔍 Detailed error info:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    errorData: errorData,
                    niche: niche,
                    timestamp: new Date().toISOString()
                });
                
                // In development, show debug info
                if (errorData.debug) {
                    console.error('🐛 Debug information:', errorData.debug);
                    errorMessage += `\n\nDEBUG INFO:\nEndpoint: ${errorData.debug.endpoint}\nTimestamp: ${errorData.debug.timestamp}\nError: ${errorData.debug.errorMessage}`;
                }
            }
            
            this.showError(errorMessage);
        }
    }

    async generateMoreDomains() {
        if (!this.currentNiche) return;

        const generateMoreBtn = document.getElementById('generateMoreBtn');
        const originalText = generateMoreBtn.innerHTML;
        generateMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateMoreBtn.disabled = true;

        try {
            const response = await fetch('/api/generate-more', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    niche: this.currentNiche,
                    excludeDomains: Array.from(this.usedDomains)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.addMoreDomains(data.domains);
            
            // Track new domains
            data.domains?.forEach(domainObj => {
                this.usedDomains.add(domainObj.domain);
            });

        } catch (error) {
            console.error('❌ Error generating more domains:', error);
            
            // Enhanced error handling with more context
            let errorMessage = 'Failed to generate more domains. Please try again.';
            
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                errorMessage = errorData.error || errorMessage;
                
                // Log detailed error information for troubleshooting
                console.error('🔍 Detailed error info:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    errorData: errorData,
                    niche: this.currentNiche,
                    excludedDomains: Array.from(this.usedDomains),
                    timestamp: new Date().toISOString()
                });
                
                // In development, show debug info
                if (errorData.debug) {
                    console.error('🐛 Debug information:', errorData.debug);
                }
            }
            
            alert(errorMessage);
        } finally {
            generateMoreBtn.innerHTML = originalText;
            generateMoreBtn.disabled = false;
        }
    }

    showLoading() {
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('errorSection').classList.add('hidden');
        document.getElementById('loadingSection').classList.remove('hidden');
    }

    displayResults(data) {
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('errorSection').classList.add('hidden');
        
        // Display competitors
        this.displayCompetitors(data.competitors);
        
        // Display patterns
        this.displayPatterns(data.patterns);

        // Display best domain
        this.displayBestDomain(data.recommendation);
        
        // Display alternatives
        this.displayAlternatives(data.alternatives);
        
        document.getElementById('resultsSection').classList.remove('hidden');
    }

    displayCompetitors(competitors) {
        const competitorsList = document.getElementById('competitorsList');
        competitorsList.innerHTML = '';

        // Ensure we always display exactly 5 competitors (or all if less than 5)
        const displayCompetitors = competitors.slice(0, 5);

        displayCompetitors.forEach(competitor => {
            const competitorItem = document.createElement('div');
            competitorItem.className = 'competitor-item';
            competitorItem.innerHTML = `
                <a href="${competitor.url}" target="_blank" rel="noopener noreferrer">
                    ${competitor.name}
                </a>
                <div class="domain">${competitor.domain}</div>
            `;
            competitorsList.appendChild(competitorItem);
        });
    }

    displayPatterns(patterns) {
        if (!patterns) return;

        // Update the compact layout format
        const avgLenRaw = patterns.patterns?.averageLength;
        const avgLen = (typeof avgLenRaw === 'number') ? Math.round(avgLenRaw) : null;
        document.getElementById('averageLength').textContent = (avgLen !== null) ? `${avgLen} characters` : '14 characters';
        document.getElementById('lengthRange').textContent = patterns.recommendations?.optimalLength || '7 - 20 characters';
        document.getElementById('wordCount').textContent = patterns.patterns?.wordCount || '2 words';
        
        // Industry terms display removed from frontend per user request
        
        // Niche keywords as comma-separated list
        document.getElementById('nicheKeywordsList').textContent = patterns.nicheKeywords?.join(', ') || 'No keywords found';
        
        // Structure patterns (fixed two-alternative template)
        const structureTemplate = [
            'prefix + niche keyword + suffix',
            'niche keyword + descriptive word'
        ];
        document.getElementById('structurePatterns').textContent = structureTemplate.join('  |  ');
        
        // Brand Positioning moved under Domain Patterns
        const brandPos = patterns.recommendations?.brandPositioning || `Should sound premium and trustworthy for high-ticket ${this.currentNiche || 'niche'} customers`;
        const brandPosEl = document.getElementById('brandPositioning');
        if (brandPosEl) brandPosEl.textContent = brandPos;
    }

    displayBestDomain(bestDomain) {
        const bestDomainContainer = document.getElementById('bestDomain');
        
        if (bestDomain) {
            bestDomainContainer.innerHTML = `
                <div class="domain-name">${bestDomain.domain}</div>
                <div class="domain-price">$${bestDomain.price}/year</div>
            `;
        } else {
            bestDomainContainer.innerHTML = `
                <div class="domain-name">No domains available</div>
                <div class="domain-price">Try a different niche</div>
            `;
        }
    }

    displayAlternatives(alternatives) {
        const alternativesList = document.getElementById('alternativesList');
        alternativesList.innerHTML = '';

        if (alternatives && alternatives.length > 0) {
            alternatives.forEach(domain => {
                const domainItem = document.createElement('div');
                domainItem.className = 'domain-item';
                domainItem.innerHTML = `
                    <div class="domain-name">${domain.domain}</div>
                    <div class="domain-price">$${domain.price}/year</div>
                `;
                alternativesList.appendChild(domainItem);
            });
        } else {
            alternativesList.innerHTML = `
                <div class="domain-item">
                    <div class="domain-name">No alternative domains found</div>
                    <div class="domain-price">Try generating more options</div>
                </div>
            `;
        }
    }

    addMoreDomains(newDomains) {
        const alternativesList = document.getElementById('alternativesList');
        
        if (newDomains && newDomains.length > 0) {
            newDomains.forEach(domain => {
                const domainItem = document.createElement('div');
                domainItem.className = 'domain-item';
                domainItem.style.animation = 'slideUp 0.6s ease-out';
                domainItem.innerHTML = `
                    <div class="domain-name">${domain.domain}</div>
                    <div class="domain-price">$${domain.price}/year</div>
                `;
                alternativesList.appendChild(domainItem);
            });
        } else {
            // Show message if no more domains found
            const messageItem = document.createElement('div');
            messageItem.className = 'domain-item';
            messageItem.style.opacity = '0.7';
            messageItem.innerHTML = `
                <div class="domain-name">No more unique domains found</div>
                <div class="domain-price">Try a different niche variation</div>
            `;
            alternativesList.appendChild(messageItem);
        }
    }

    showError(message) {
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorSection').classList.remove('hidden');
    }

    showErrorWithNiches(message, availableNiches, suggestion = null) {
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
        
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.innerHTML = `
            <p style="margin-bottom: 1rem;">${message}</p>
            ${suggestion ? `<p style="margin-bottom: 1.5rem; color: #cccccc; font-style: italic;">${suggestion}</p>` : ''}
            <div style="text-align: left;">
                <h4 style="color: #ffd700; margin-bottom: 1rem;">Pre-loaded Niches (Guaranteed Results):</h4>
                <div class="niche-suggestions">
                    ${availableNiches.map(niche => 
                        `<span class="niche-tag" onclick="document.getElementById('nicheInput').value='${niche}'; document.getElementById('generateBtn').click();">${niche}</span>`
                    ).join('')}
                </div>
            </div>
        `;
        
        document.getElementById('errorSection').classList.remove('hidden');
    }

    resetAndRetry() {
        document.getElementById('errorSection').classList.add('hidden');
        document.getElementById('nicheInput').focus();
    }

    // Removed recommendations card rendering; Brand Positioning is now shown under patterns
}

// Initialize the domain generator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DomainGenerator();
});
