const { BOT_CONFIG } = require('../config');
const telegramService = require('../services/telegram_service');

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
    // Implémentation de la gestion des alertes
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

module.exports = CommandHandler;
