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
            console.error('Error generating domains:', error);
            this.showError('Failed to generate domains. Please try again.');
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
            console.error('Error generating more domains:', error);
            alert('Failed to generate more domains. Please try again.');
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
        document.getElementById('averageLength').textContent = patterns.patterns?.averageLength ? `${patterns.patterns.averageLength} characters` : '14 characters';
        document.getElementById('lengthRange').textContent = patterns.recommendations?.optimalLength || '7 - 20 characters';
        document.getElementById('wordCount').textContent = patterns.patterns?.wordCount || '2 words';
        
        // Industry terms as comma-separated list
        document.getElementById('industryTermsList').textContent = patterns.industryTerms?.join(', ') || 'No terms found';
        
        // Niche keywords as comma-separated list
        document.getElementById('nicheKeywordsList').textContent = patterns.nicheKeywords?.join(', ') || 'No keywords found';
        
        // Structure patterns
        const structures = patterns.patterns?.commonStructures || ['single word', 'two-word combination'];
        document.getElementById('structurePatterns').textContent = Array.isArray(structures) ? structures.join(', ') : structures;
        
        // Brand types
        document.getElementById('brandTypes').textContent = 'industry specific, compound';
        

        
        // Display dynamic recommendations
        this.displayDynamicRecommendations(patterns.recommendations, this.currentNiche || 'this niche');
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

    displayDynamicRecommendations(recommendations, niche) {
        if (!recommendations) return;

        // Update niche title
        document.getElementById('nicheTitle').textContent = niche.charAt(0).toUpperCase() + niche.slice(1);

        // Clear existing recommendations
        const container = document.getElementById('recommendationsContent');
        container.innerHTML = '';

        // Optimal Length
        if (recommendations.optimalLength) {
            const lengthItem = document.createElement('div');
            lengthItem.className = 'rec-item';
            lengthItem.innerHTML = `
                <i class="fas fa-ruler-horizontal"></i>
                <span><strong>Optimal Length:</strong> ${recommendations.optimalLength}</span>
            `;
            container.appendChild(lengthItem);
        }

        // Best Structures
        if (recommendations.bestStructures && recommendations.bestStructures.length > 0) {
            const structureItem = document.createElement('div');
            structureItem.className = 'rec-item';
            structureItem.innerHTML = `
                <i class="fas fa-layer-group"></i>
                <span><strong>Best Structures:</strong> ${recommendations.bestStructures.join(', ')}</span>
            `;
            container.appendChild(structureItem);
        }

        // Key Terms
        if (recommendations.keyTerms && recommendations.keyTerms.length > 0) {
            const keyTermsItem = document.createElement('div');
            keyTermsItem.className = 'rec-item';
            keyTermsItem.innerHTML = `
                <i class="fas fa-tags"></i>
                <span><strong>Key Terms:</strong> ${recommendations.keyTerms.join(', ')}</span>
            `;
            container.appendChild(keyTermsItem);
        }

        // Terms to Avoid
        if (recommendations.avoidTerms && recommendations.avoidTerms.length > 0) {
            const avoidItem = document.createElement('div');
            avoidItem.className = 'rec-item';
            avoidItem.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span><strong>Avoid:</strong> ${recommendations.avoidTerms.join(', ')}</span>
            `;
            container.appendChild(avoidItem);
        }


        // Brand Positioning
        if (recommendations.brandPositioning) {
            const brandItem = document.createElement('div');
            brandItem.className = 'rec-item';
            brandItem.innerHTML = `
                <i class="fas fa-crown"></i>
                <span><strong>Brand Positioning:</strong> ${recommendations.brandPositioning}</span>
            `;
            container.appendChild(brandItem);
        }

        // If no recommendations, show fallback
        if (container.children.length === 0) {
            container.innerHTML = `
                <div class="rec-item">
                    <i class="fas fa-lightbulb"></i>
                    <span>Focus on short, brandable domains that sound premium for ${niche} customers</span>
                </div>
            `;
        }
    }
}

// Initialize the domain generator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DomainGenerator();
});
