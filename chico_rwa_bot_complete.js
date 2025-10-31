// ==================== CONFIG.JS ====================
const BOT_CONFIG = {
  botName: 'Chico RWA Bot Pro',
  version: '2.0',
  language: 'fr',
  maxUsers: 1000,
  tasksPerRun: 50,
  scheduleInterval: '*/5 * * * *',
  highValueThreshold: 200,
  maxBountyValue: 2000,
  monthlyTargetMin: 50000,
  monthlyTargetMax: 100000,
  adminCommission: 0.05,
  
  telegram: {
    enabled: true,
    botToken: '7929319720:AAEPVXKD2aa-vwvleMa-a0yymp94Jqymzgo',
    adminChatId: '6194728461',
    reportTime: '20:00',
    timezone: 'Africa/Conakry'
  },

  rwa: {
    enabled: true,
    minCapital: 500,
    maxCapital: 10000,
    tasksToReallocate: 3,
    totalTasks: 50,
    minTasksForBounties: 47,
    allocationStrategy: 'fixed',
    reallocationCheckInterval: 3600000,
    maxConcurrentTasks: 10,
    taskTimeout: 300000,
    retryAttempts: 3,
    maxDailySpend: 1000,
    stopLoss: 0.1,
    takeProfit: 0.3,
    enableAlerts: true,
    alertThresholds: {
      capital: 0.9,
      performance: 0.8,
      errorRate: 0.05
    },
    autoOptimize: true,
    optimizationInterval: 86400000,
    logLevel: 'info',
    logToFile: true,
    logFile: 'rwa_performance.log'
  },
  
  admin: {
    securityQuestions: {
      question1: "Quel est le nom de ta mère ?",
      answer1: "laouratou",
      question2: "Quel est le nom de ton père ?",
      answer2: "oumar barry et ibrahim sorry"
    },
    commissionWallet: ''
  }
};

const GAINS_CONFIG = {
  dailyProjection: { min: 1000, max: 2000 },
  weeklyProjection: { min: 7000, max: 14000 },
  monthlyProjection: { min: 30000, max: 60000 }
};

const RESPONSES_CONFIG = {
  success: {
    bounty: 'Bounty complétée avec succès ! Montant gagné: {amount}$',
    rwa: 'Investissement RWA réussi ! Montant investi: {amount}$'
  },
  error: {
    insufficientFunds: 'Fonds insuffisants pour cette opération',
    maxTasksReached: 'Nombre maximum de tâches atteint',
    invalidCommand: 'Commande invalide. Tapez /aide pour voir les commandes disponibles'
  }
};

// ==================== SERVICES/TELEGRAM_SERVICE.JS ====================
class TelegramService {
  constructor() {
    this.botToken = BOT_CONFIG.telegram.botToken;
    this.adminChatId = BOT_CONFIG.telegram.adminChatId;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(chatId, text, parseMode = 'HTML') {
    try {
      const url = `${this.baseUrl}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode })
      });
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      return null;
    }
  }

  async sendPhoto(chatId, photoBuffer, caption = '') {
    try {
      const url = `${this.baseUrl}/sendPhoto`;
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', new Blob([photoBuffer]), 'chart.png');
      formData.append('caption', caption);
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la photo:', error);
      return null;
    }
  }

  async sendReport(chatId, reportData) {
    try {
      // Envoyer le texte du rapport
      const message = this.formatReportMessage(reportData);
      await this.sendMessage(chatId, message);

      // Envoyer chaque graphique
      for (const chart of reportData.charts) {
        await this.sendPhoto(chatId, chart.buffer, chart.title);
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du rapport:', error);
      return false;
    }
  }

  async sendAdminAlert(message, isCritical = false) {
    if (!this.adminChatId) return false;
    
    const prefix = isCritical ? '🚨 ALERTE CRITIQUE 🚨\n\n' : '⚠️ ALERTE ⚠️\n\n';
    return this.sendMessage(this.adminChatId, prefix + message);
  }

  formatReportMessage(report) {
    return `📊 <b>Rapport ${report.period}</b>\n\n` +
           `💰 Gains: ${report.stats.totalEarned.toFixed(2)}$\n` +
           `✅ Tâches: ${report.stats.completedTasks}/${report.stats.totalTasks}\n` +
           `📈 Taux de réussite: ${report.stats.successRate}%\n` +
           `🏆 Meilleure performance: ${report.stats.topPerformer || 'N/A'}`;
  }
}

// ==================== TASK_ROUTER.JS ====================
const path = require('path');
const fs = require('fs');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const math = require('mathjs');

// Configuration de Chart.js
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: 800,
  height: 400,
  backgroundColour: 'white'
});

class TaskRouter {
  constructor() {
    this.logFile = path.join(__dirname, BOT_CONFIG.rwa.logFile || 'task_router.log');
    this.bountyScanner = new BountyScanner();
    this.rwaStrategy = new RWAStrategy();
    this.userManager = new UserManager();
    this.telegramService = new TelegramService();
    this.marketAnalyzer = new MarketAnalyzer();
    
    // Configuration des tâches
    this.totalTasks = BOT_CONFIG.rwa.totalTasks || 50;
    this.bountyTasks = this.totalTasks - (BOT_CONFIG.rwa.tasksToReallocate || 3);
    this.rwaTasks = BOT_CONFIG.rwa.tasksToReallocate || 3;
    
    // Paramètres de performance
    this.maxConcurrentTasks = BOT_CONFIG.rwa.maxConcurrentTasks || 10;
    this.taskTimeout = BOT_CONFIG.rwa.taskTimeout || 300000;
    this.retryAttempts = BOT_CONFIG.rwa.retryAttempts || 3;
    
    // Suivi des performances
    this.performanceMetrics = {
      startTime: Date.now(),
      tasksCompleted: 0,
      tasksFailed: 0,
      totalEarned: 0,
      lastOptimization: null
    };
    
    // Planification des tâches
    this.setupPeriodicChecks();
    this.scheduleReports();
  }

  // ... autres méthodes du TaskRouter ...
  
  async sendReportToUser(userId, report) {
    if (!BOT_CONFIG.telegram?.enabled) {
      console.log(`[RAPPORT POUR ${userId}] Envoi désactivé`);
      return false;
    }

    try {
      const reportData = {
        period: report.period || 'quotidien',
        stats: {
          totalEarned: report.stats?.totalEarned || 0,
          completedTasks: report.stats?.tasksCompleted || 0,
          totalTasks: this.totalTasks,
          successRate: report.stats?.successRate || 0,
          topPerformer: report.stats?.topPerformer || 'Aucune donnée'
        },
        charts: []
      };

      if (report.charts) {
        for (const chart of report.charts) {
          if (chart instanceof Buffer) {
            reportData.charts.push({
              buffer: chart,
              title: chart.title || 'Graphique de performance'
            });
          }
        }
      }

      const chatId = userId === 'admin' 
        ? BOT_CONFIG.telegram.adminChatId 
        : await this.userManager.getUserTelegramId(userId);

      if (!chatId) {
        console.error(`Aucun chatId trouvé pour l'utilisateur ${userId}`);
        return false;
      }

      const result = await this.telegramService.sendReport(chatId, reportData);
      
      if (!result) {
        throw new Error('Échec de l\'envoi du rapport');
      }

      return true;
      
    } catch (error) {
      console.error(`Erreur lors de l'envoi du rapport à ${userId}:`, error);
      
      if (userId === 'admin') {
        await this.telegramService.sendAdminAlert(
          `Échec de l'envoi du rapport admin: ${error.message}`,
          true
        );
      }
      
      return false;
    }
  }
}

// ==================== SERVICES/MARKET_ANALYZER.JS ====================
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
    setInterval(() => this.updateMarketData(), 5 * 60 * 1000);
  }

  async updateMarketData() {
    try {
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
    // Simulation de données
    return {
      averageBounty: 450,
      trend: 'stable',
      highValueBounties: 12,
      successRate: 0.87
    };
  }

  async fetchRWAOpportunities() {
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
        count: Math.floor((capital * allocation.bounties) / 500) * 3
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
      .slice(0, 3);
  }
}

// ==================== COMMANDS/INDEX.JS ====================
class CommandHandler {
  constructor(taskRouter) {
    this.taskRouter = taskRouter;
    this.commands = {
      '/start': this.handleStart,
      '/stats': this.handleStats,
      '/alertes': this.handleAlerts,
      '/portefeuille': this.handleWallet,
      '/classement': this.handleRanking,
      '/aide': this.handleHelp
    };
  }

  async handleCommand(command, userId, args = []) {
    const handler = this.commands[command.split('@')[0]];
    if (handler) {
      return await handler.call(this, userId, args);
    }
    return "Commande inconnue. Tapez /aide pour voir les commandes disponibles.";
  }

  async handleStart(userId) {
    return `Bienvenue sur ${BOT_CONFIG.botName} !\n\n` +
           'Commandes disponibles :\n' +
           '/stats - Voir vos statistiques\n' +
           '/alertes - Gérer vos alertes\n' +
           '/portefeuille - Gérer votre portefeuille\n' +
           '/classement - Voir le classement\n' +
           '/aide - Afficher l\'aide';
  }

  async handleStats(userId) {
    const stats = await this.taskRouter.getUserStats(userId);
    return `📊 <b>Vos statistiques</b>\n\n` +
           `💰 Gains totaux: ${stats.totalEarned.toFixed(2)}$\n` +
           `✅ Tâches réussies: ${stats.completedTasks}/${stats.totalTasks}\n` +
           `📈 Taux de réussite: ${stats.successRate}%\n` +
           `🏆 Meilleure performance: ${stats.topPerformer || 'N/A'}`;
  }

  async handleAlerts(userId, args) {
    return 'Fonctionnalité d\'alertes bientôt disponible !';
  }

  async handleWallet(userId) {
    const walletInfo = await this.taskRouter.getWalletInfo(userId);
    return `💼 <b>Votre portefeuille</b>\n\n` +
           `Solde disponible: ${walletInfo.balance.toFixed(2)}$\n` +
           `En attente: ${walletInfo.pending.toFixed(2)}$\n` +
           `Total gagné: ${walletInfo.totalEarned.toFixed(2)}$`;
  }

  async handleRanking() {
    const ranking = await this.taskRouter.getGlobalRanking();
    let message = '🏆 <b>Classement des meilleurs chasseurs</b>\n\n';
    
    ranking.forEach((user, index) => {
      message += `${index + 1}. ${user.name}: ${user.earnings.toFixed(2)}$\n`;
    });
    
    return message;
  }

  async handleHelp() {
    return '🆘 <b>Aide</b>\n\n' +
           'Commandes disponibles :\n' +
           '/start - Démarrer le bot\n' +
           '/stats - Voir vos statistiques\n' +
           '/alertes - Gérer vos alertes\n' +
           '/portefeuille - Gérer votre portefeuille\n' +
           '/classement - Voir le classement\n' +
           '/aide - Afficher ce message\n\n' +
           'Pour plus d\'aide, contactez le support.';
  }
}

// ==================== MAIN.JS ====================
class ChicoRWABot {
  constructor() {
    this.initializeServices();
    this.setupEventHandlers();
    this.startScheduledTasks();
  }

  initializeServices() {
    this.userManager = new UserManager();
    this.bountyScanner = new BountyScanner();
    this.rwaStrategy = new RWAStrategy();
    this.marketAnalyzer = new MarketAnalyzer();
    this.telegramService = new TelegramService();
    this.taskRouter = new TaskRouter();
    this.commandHandler = new CommandHandler(this.taskRouter);
  }

  setupEventHandlers() {
    process.on('message', async (message) => {
      if (message.type === 'command') {
        await this.handleCommand(message);
      }
    });
  }

  async handleCommand(message) {
    try {
      const { userId, command, args } = this.parseCommand(message.text);
      const response = await this.commandHandler.handleCommand(command, userId, args);
      await this.telegramService.sendMessage(userId, response);
    } catch (error) {
      console.error('Erreur lors du traitement de la commande:', error);
      await this.telegramService.sendMessage(
        message.chat.id,
        'Une erreur est survenue. Veuillez réessayer plus tard.'
      );
    }
  }

  startScheduledTasks() {
    setInterval(() => this.runScheduledTasks(), 5 * 60 * 1000);
  }

  async runScheduledTasks() {
    try {
      await this.bountyScanner.scanForBounties();
      await this.rwaStrategy.analyzeOpportunities();
      await this.sendDailyReports();
    } catch (error) {
      console.error('Erreur lors de l\'exécution des tâches planifiées:', error);
    }
  }

  async sendDailyReports() {
    const users = this.userManager.getActiveUsers();
    for (const user of users) {
      try {
        await this.sendUserReport(user.id);
      } catch (error) {
        console.error(`Erreur lors de l'envoi du rapport à l'utilisateur ${user.id}:`, error);
      }
    }
  }

  async sendUserReport(userId) {
    const stats = await this.taskRouter.getUserStats(userId);
    const report = this.formatReport(stats);
    await this.telegramService.sendMessage(userId, report);
  }

  parseCommand(text) {
    // Implémentation de l'analyse de commande
    const parts = text.trim().split(/\s+/);
    return {
      command: parts[0].toLowerCase(),
      args: parts.slice(1),
      raw: text
    };
  }

  formatReport(stats) {
    // Implémentation du formatage du rapport
    return `📊 <b>Rapport quotidien</b>\n\n` +
           `💰 Gains: ${stats.totalEarned.toFixed(2)}$\n` +
           `✅ Tâches: ${stats.completedTasks}/${stats.totalTasks}\n` +
           `📈 Taux de réussite: ${stats.successRate}%`;
  }
}

// Initialisation du bot
const bot = new ChicoRWABot();
console.log('Bot Chico RWA démarré avec succès !');

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('Erreur non gérée:', error);
  if (BOT_CONFIG.telegram.enabled) {
    telegramService.sendAdminAlert(
      `Erreur critique: ${error.message}`,
      true
    );
  }
});

// Gestion des promesses non gérées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesse non gérée:', reason);
});

// Export pour les tests
module.exports = {
  ChicoRWABot,
  TaskRouter,
  MarketAnalyzer,
  CommandHandler,
  TelegramService,
  BOT_CONFIG,
  GAINS_CONFIG,
  RESPONSES_CONFIG
};
