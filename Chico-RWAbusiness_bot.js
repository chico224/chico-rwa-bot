// main_bot.js - Complete 100% Code WhatsApp Bot for Chico RWA Business
// Version: 1.3 (October 25, 2025)
// Description: Full integrated bot with Baileys (QR scan 1x), 30 async tasks (28 bounties >200$, 2 RWA scaling 10K-1M$/day after 1-2 months),
// French responses, multi-wallet support, graphs, user limit 30. No no-code – pure Node.js.
// Presents as "Chico Business RWA", credits Chico, includes numbers (+224669435463, +224661920519).
// Imports all 9 modules. Run `node main_bot.js` for live bot.

// Core Dependencies
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { Canvas, createCanvas } = require('canvas');
const Chart = require('chart.js/auto');
const fetch = require('node-fetch');
const math = require('mathjs');

// Imports Modules (All 9 Files)
const { BOT_CONFIG, API_CONFIG, GAINS_CONFIG, WALLET_CONFIG, SCHEDULE_CONFIG, RESPONSES_CONFIG } = require('./config');
const { BountyScanner } = require('./bounty_scanner');
const { YieldManager } = require('./yield_manager');
const { UserManager } = require('./user_manager');
const { AnalyticsReporter } = require('./analytics_reporter');
const { RWAStrategy } = require('./rwa_strategy');
const { TaskRouter } = require('./task_router');
const { PerformanceOptimizer } = require('./performance_optimizer');
const { AdminDashboard } = require('./dashboard_admin');

// Section 1: Main Bot Class (Full Integration)
class ChicoRWABot {
  constructor() {
    this.sock = null;
    this.userManager = new UserManager();
    this.taskRouter = new TaskRouter();
    this.performanceOptimizer = new PerformanceOptimizer();
    this.rwaStrategy = new RWAStrategy();
    this.yieldManager = new YieldManager();
    this.bountyScanner = new BountyScanner();
    this.analyticsReporter = new AnalyticsReporter();
    this.adminDashboard = new AdminDashboard();
    this.activeUsers = new Set();
    this.logFile = path.join(__dirname, 'chico_bot.log');
    this.isInitialized = false;
    this.logger = pino({ level: 'info' }, pino.destination({ dest: this.logFile, sync: false }));
    this.reconnectAttempts = 0;
    this.cronTask = null;
    this.cronLock = false;
    this.rateLimit = new Map();
    this.rateLimitWindowMs = 5000; // 5s
    this.rateLimitMax = 3; // max 3 messages par fenêtre
    this.maxActiveUsers = 30;
  }

  // Section 2: Logging (Unified)
  log(message, level = 'info', userId = 'system') {
    const entry = { userId, msg: message };
    try {
      if (typeof this.logger[level] === 'function') {
        this.logger[level](entry);
      } else {
        this.logger.info(entry);
      }
    } catch (_) {
      // Fallback minimal console log if logger fails
      console.log(`${new Date().toISOString()} [BOT-${level.toUpperCase()}] [User: ${userId}] : ${message}`);
    }
  }

  // Section 3: Initialization (All Modules)
  async initialize() {
    if (this.isInitialized) return;
    this.log('Initializing Chico RWA Bot...', 'info');
    this.userManager.initialize();
    this.taskRouter.initialize();
    this.performanceOptimizer.initialize();
    this.rwaStrategy.initialize();
    this.yieldManager.initialize();
    this.bountyScanner.initialize();
    this.analyticsReporter.initialize();
    this.adminDashboard.initialize();
    this.log('All modules initialized – Bot ready for 30 users, scaling 10k$/day', 'info');
    this.isInitialized = true;
  }

  // Section 4: WhatsApp Connection (Baileys, QR 1x)
  async connect() {
    await this.initialize();
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    this.sock = makeWASocket({
      logger: pino({ level: 'silent' }),
      printQRInTerminal: true, // QR 1x only
      auth: state,
      browserDescription: ['Chico Business RWA', 'Chrome', '1.3'],
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        const delay = Math.min(30000, 1000 * 2 ** this.reconnectAttempts);
        this.log(`Connection closed. Reconnecting: ${shouldReconnect} in ${delay}ms`, 'warn');
        if (shouldReconnect) setTimeout(() => { this.reconnectAttempts++; this.connect(); }, delay);
      } else if (connection === 'open') {
        this.reconnectAttempts = 0;
        this.log('WhatsApp connected – Bot live for 30 users', 'info');
        this.startCronJobs();
      }
    });

    // Section 5: Message Handling (French, Full Features)
    this.sock.ev.on('messages.upsert', async (m) => {
      try {
        if (!m?.messages?.length) return;
        const msg = m.messages[0];
        if (msg?.key?.fromMe) return;

        const sender = msg?.key?.remoteJid;
        const text = this.getTextFromMessage(msg).trim();

        if (!sender) return;
        if (this.isGroupJid(sender)) return; // ignorer les groupes
        if (this.isRateLimited(sender)) {
          this.log(`Rate limited: ${sender}`, 'warn', sender);
          return;
        }

        // Enforce active user cap
        if (!this.activeUsers.has(sender)) {
          if (this.activeUsers.size >= this.maxActiveUsers) {
            await this.sock.sendMessage(sender, { text: 'Capacité atteinte. Réessaie plus tard.' });
            return;
          }
          this.activeUsers.add(sender);
        }

        this.userManager.addUser(sender);
        const state = this.userManager.getUserState(sender) || {};

        if (state.firstConnection) {
          const welcome = `Bienvenue chez ${BOT_CONFIG.botName} ! Je suis créé par Chico (contact : ${BOT_CONFIG.contactNumbers.join(' ou ')}) pour t'initier au business RWA et générer 1000-2000$/mois (scaling 10k$/jour après 2 mois). Envoie ton wallet 0x... pour commencer.`;
          await this.sock.sendMessage(sender, { text: welcome });
          this.log(`First connection for ${sender}`, 'info', sender);
          return;
        }

        if (/^0x[a-fA-F0-9]{40}$/i.test(text)) {
          if (this.userManager.setUserWallet(sender, text)) {
            const confirm = `Wallet enregistré ! Business RWA : ${RESPONSES_CONFIG.businessIntro}\nRevenus : ${RESPONSES_CONFIG.revenueFAQ}\nEnvoie "start" pour 30 tâches.`;
            await this.sock.sendMessage(sender, { text: confirm });
          } else {
            await this.sock.sendMessage(sender, { text: 'Wallet invalide – réessaye 0x...' });
          }
          return;
        }

        if (text.toLowerCase() === 'start') {
          this.log(`Start from ${sender}`, 'info', sender);
          await this.taskRouter.integrateRoutingInTasks(sender, this.sock, sender, true); // 30 tasks with scaling
          await this.sendGraph(sender);
          return;
        }

        if (text.toLowerCase() === 'help') {
          const help = [
            'Commandes disponibles:',
            '- 0x... : enregistrer un wallet EVM',
            '- start : lancer les 30 tâches',
            '- status : voir ton état (wallet, capital)',
            '- help : afficher cette aide',
          ].join('\n');
          await this.sock.sendMessage(sender, { text: help });
          return;
        }

        if (text.toLowerCase() === 'status') {
          const s = this.userManager.getSummary(sender);
          const msg = `Etat utilisateur:\n- Wallet: ${s.wallet}\n- Capital: ${s.capital}$\n- Première connexion: ${s.firstConnection ? 'oui' : 'non'}`;
          await this.sock.sendMessage(sender, { text: msg });
          return;
        }

        // Admin Commands (For Chico's Numbers)
        if (this.isAdminJid(sender) && text.toLowerCase().startsWith('admin ')) {
          await this.adminDashboard.handleAdminCommand(text.substring(6), this.sock, sender);
          return;
        }

        // Questions
        const response = this.userManager.handleQuestion(text, sender);
        await this.sock.sendMessage(sender, { text: response });
      } catch (err) {
        this.log(`Error handling message: ${err?.message || err}`, 'error');
      }
    });

    return this.sock;
  }

  // Section 6: Graph Sending (ROI/Allo cation)
  async sendGraph(sender) {
    const canvas = createCanvas(400, 200);
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Début', 'Maintenant'],
        datasets: [{ label: 'Capital ($)', data: [0, (this.userManager.getUserState(sender) || {}).capital || 0], borderColor: 'green' }]
      },
      options: { plugins: { title: { display: true, text: 'Croissance Capital (Scaling 10k$/jour)' } } }
    });
    const buffer = canvas.toBuffer('image/png');
    await this.sock.sendMessage(sender, { image: buffer, caption: 'Graphique croissance par Chico Business RWA.' });
  }

  // Section 7: Cron Jobs (Auto-Runs + Optimization)
  startCronJobs() {
    if (this.cronTask) return;
    this.cronTask = cron.schedule(SCHEDULE_CONFIG.cronExpression, async () => {
      if (this.cronLock) return;
      this.cronLock = true;
      try {
        this.log('Auto-run cron with optimization', 'info');
        await this.taskRouter.integrateRoutingInTasks(BOT_CONFIG.phoneNumber, this.sock, BOT_CONFIG.phoneNumber, false); // Admin auto
        await this.performanceOptimizer.optimizePostTasks(BOT_CONFIG.phoneNumber, this.sock, BOT_CONFIG.phoneNumber, []);
        await this.adminDashboard.startDailySummaryCron(this.sock);
      } catch (e) {
        this.log(`Cron job error: ${e?.message || e}`, 'error');
      } finally {
        this.cronLock = false;
      }
    });
    this.log(`Cron started: Every 2H with scaling/optimization`, 'info');
  }

  // Section 8: Shutdown
  shutdown() {
    this.log('Shutdown: Clearing states', 'info');
    try { if (this.cronTask) this.cronTask.stop(); } catch (_) {}
    try { if (this.sock && typeof this.sock.end === 'function') this.sock.end(); } catch (_) {}
    try { this.logger.flush?.(); } catch (_) {}
    process.exit(0);
  }

  // Helpers
  getTextFromMessage(msg) {
    const m = msg?.message || {};
    if (m.conversation) return m.conversation;
    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
    if (m.imageMessage?.caption) return m.imageMessage.caption;
    if (m.videoMessage?.caption) return m.videoMessage.caption;
    if (m.buttonsResponseMessage?.selectedButtonId) return m.buttonsResponseMessage.selectedButtonId;
    if (m.listResponseMessage?.singleSelectReply?.selectedRowId) return m.listResponseMessage.singleSelectReply.selectedRowId;
    if (m.templateButtonReplyMessage?.selectedId) return m.templateButtonReplyMessage.selectedId;
    return '';
  }

  isAdminJid(senderJid) {
    try {
      const allowed = (BOT_CONFIG.contactNumbers || []).map((num) => {
        const digits = String(num).replace(/\D/g, '');
        return `${digits}@s.whatsapp.net`;
      });
      return allowed.includes(senderJid);
    } catch (_) {
      return false;
    }
  }

  isGroupJid(jid) {
    return typeof jid === 'string' && jid.endsWith('@g.us');
  }

  isRateLimited(jid) {
    const now = Date.now();
    const rec = this.rateLimit.get(jid) || { count: 0, start: now };
    if (now - rec.start > this.rateLimitWindowMs) {
      // reset window
      rec.count = 0;
      rec.start = now;
    }
    rec.count += 1;
    this.rateLimit.set(jid, rec);
    return rec.count > this.rateLimitMax;
  }
}

// Export
module.exports = { ChicoRWABot };

// Run
if (require.main === module) {
  const bot = new ChicoRWABot();
  process.on('SIGINT', () => bot.shutdown());
  process.on('SIGTERM', () => bot.shutdown());
  bot.connect();
}