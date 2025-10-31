const axios = require('axios');
const { BOT_CONFIG } = require('../config');

class MarketAnalyzer {
  constructor() {
    this.marketData = {
      lastUpdate: null,
      trends: {},
      opportunities: []
    };
    this.initialize();
  }

  async initialize() {
    await this.updateMarketData();
    // Mise à jour toutes les 5 minutes
    setInterval(() => this.updateMarketData(), 5 * 60 * 1000);
  }

  async updateMarketData() {
    try {
      // Récupération des données de marché
      const [bountyTrends, rwaOpportunities] = await Promise.all([
        this.fetchBountyTrends(),
        this.fetchRWAOpportunities()
      ]);

      this.marketData = {
        lastUpdate: new Date(),
        trends: bountyTrends,
        opportunities: rwaOpportunities,
        lastError: null
      };
    } catch (error) {
      console.error('Erreur lors de la mise à jour des données de marché:', error);
      this.marketData.lastError = error.message;
    }
  }

  async fetchBountyTrends() {
    // Simulation de données - À remplacer par un appel API réel
    return {
      averageBounty: 450,
      trend: 'stable',
      highValueBounties: 12,
      successRate: 0.87
    };
  }

  async fetchRWAOpportunities() {
    // Simulation d'opportunités RWA
    return [
      {
        id: 'rwa-001',
        name: 'Immobilier Paris',
        expectedReturn: 0.12,
        risk: 'moyen',
        minInvestment: 1000,
        duration: '6 mois'
      },
      {
        id: 'rwa-002',
        name: 'Prêts PME',
        expectedReturn: 0.18,
        risk: 'élevé',
        minInvestment: 500,
        duration: '12 mois'
      }
    ];
  }

  getOptimalAllocation(capital, riskProfile = 'modéré') {
    // Logique d'allocation optimale basée sur le capital et le profil de risque
    const profiles = {
      'conservateur': { bounties: 0.8, rwa: 0.2 },
      'modéré': { bounties: 0.6, rwa: 0.4 },
      'dynamique': { bounties: 0.4, rwa: 0.6 },
      'agressif': { bounties: 0.2, rwa: 0.8 }
    };

    const allocation = profiles[riskProfile] || profiles['modéré'];
    
    return {
      bounties: {
        amount: capital * allocation.bounties,
        count: Math.floor((capital * allocation.bounties) / 500) * 3 // 3 tâches par 500$
      },
      rwa: {
        amount: capital * allocation.rwa,
        opportunities: this.getBestRWAOpportunities(capital * allocation.rwa)
      }
    };
  }

  getBestRWAOpportunities(availableCapital) {
    return this.marketData.opportunities
      .filter(opp => opp.minInvestment <= availableCapital)
      .sort((a, b) => b.expectedReturn - a.expectedReturn)
      .slice(0, 3); // Top 3 opportunités
  }

  getMarketAnalysis() {
    return {
      lastUpdate: this.marketData.lastUpdate,
      bountyTrends: this.marketData.trends,
      topOpportunities: this.marketData.opportunities.slice(0, 3),
      recommendation: this.generateRecommendation()
    };
  }

  generateRecommendation() {
    const { trends, opportunities } = this.marketData;
    
    if (trends.trend === 'hausse' && opportunities.length > 0) {
      return {
        action: 'augmenter',
        asset: 'bounties',
        reason: 'Marché des bounties en hausse',
        confidence: 0.8
      };
    }
    
    return {
      action: 'maintenir',
      asset: 'mix',
      reason: 'Marché stable',
      confidence: 0.6
    };
  }
}

module.exports = new MarketAnalyzer();
