const axios = require('axios');
const { BOT_CONFIG } = require('../config');

class TelegramService {
  constructor() {
    this.baseUrl = `https://api.telegram.org/bot${BOT_CONFIG.telegram.botToken}`;
    this.adminChatId = BOT_CONFIG.telegram.adminChatId;
  }

  // Envoyer un message texte
  async sendMessage(chatId, text, options = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message Telegram:', error.message);
      return null;
    }
  }

  // Envoyer une photo (graphique)
  async sendPhoto(chatId, photoBuffer, caption = '') {
    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', {
        value: photoBuffer,
        options: {
          filename: 'graphique.png',
          contentType: 'image/png'
        }
      });
      
      if (caption) {
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
      }

      const response = await axios.post(
        `${this.baseUrl}/sendPhoto`,
        formData,
        {
          headers: formData.getHeaders()
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la photo:', error.message);
      return null;
    }
  }

  // Envoyer un rapport complet avec graphiques
  async sendReport(chatId, reportData) {
    try {
      // Envoyer le texte du rapport
      await this.sendMessage(chatId, this.formatReportText(reportData));
      
      // Envoyer chaque graphique
      for (const chart of reportData.charts) {
        await this.sendPhoto(chatId, chart.buffer, chart.title);
        // Attente pour éviter le flood
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du rapport:', error);
      return false;
    }
  }

  // Formater le texte du rapport
  formatReportText(report) {
    const { period, stats } = report;
    const date = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `📊 <b>RAPPORT ${period.toUpperCase()}</b> 📊\n` +
           `📅 ${date}\n\n` +
           `💰 <b>Revenus</b>: ${stats.totalEarned.toFixed(2)}$\n` +
           `✅ <b>Tâches réussies</b>: ${stats.completedTasks}/${stats.totalTasks} (${stats.successRate}%)\n` +
           `🏆 <b>Meilleure performance</b>: ${stats.topPerformer}\n` +
           `🔄 <b>Prochain rapport</b>: Demain à ${BOT_CONFIG.telegram.reportTime}`;
  }

  // Envoyer une alerte à l'admin
  async sendAdminAlert(message, critical = false) {
    if (!this.adminChatId) return;
    
    const prefix = critical ? '🚨 <b>ALERTE CRITIQUE</b> 🚨\n\n' : '⚠️ <b>ALERTE</b> ⚠️\n\n';
    return this.sendMessage(this.adminChatId, prefix + message);
  }
}

module.exports = new TelegramService();
