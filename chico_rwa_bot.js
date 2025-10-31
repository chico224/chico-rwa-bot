// config.js
require('dotenv').config();

module.exports = {
  BOT_CONFIG: {
    botName: 'Chico Business RWA',
    creator: 'Chico',
    contactNumbers: ['+224669435463', '+224661920519'],
    version: '2.0',
    language: 'fr',
    maxUsers: 30,
    tasksPerRun: 5,
    scheduleInterval: '0 */2 * * *',
    highValueThreshold: 200,
    monthlyTargetMin: 10000,
    monthlyTargetMax: 100000
  },
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN || 'TON_TOKEN_ICI'
};

// logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;

// bot.js
const { Telegraf, Scenes, session } = require('telegraf');
const { BOT_CONFIG } = require('./config');
const UserManager = require('./managers/UserManager');
const BountyScanner = require('./services/BountyScanner');
const YieldManager = require('./services/YieldManager');
const logger = require('./logger');

class ChicoRWABot {
  constructor(token) {
    this.bot = new Telegraf(token);
    this.userManager = new UserManager();
    this.bountyScanner = new BountyScanner();
    this.yieldManager = new YieldManager();
    
    this.setupMiddlewares();
    this.setupCommands();
    this.setupListeners();
    this.setupErrorHandling();
  }

  setupMiddlewares() {
    this.bot.use(session());
    this.bot.use(async (ctx, next) => {
      ctx.config = BOT_CONFIG;
      ctx.logger = logger;
      await next();
    });
  }

  setupCommands() {
    this.bot.command('start', this.handleStart.bind(this));
    this.bot.command('help', this.handleHelp.bind(this));
    this.bot.command('wallet', this.handleWallet.bind(this));
    this.bot.command('bounties', this.handleBounties.bind(this));
    this.bot.command('yield', this.handleYield.bind(this));
  }

  // ... autres méthodes

  async handleStart(ctx) {
    try {
      const chatId = ctx.chat.id;
      logger.info(`Nouvel utilisateur: ${chatId}`);
      
      const userAdded = await this.userManager.addUser(chatId);
      if (!userAdded) {
        return ctx.reply(BOT_CONFIG.capacityMessage);
      }

      await ctx.replyWithMarkdown(BOT_CONFIG.introMessage);
      await this.bountyScanner.runBountyScan(ctx, 3);
    } catch (error) {
      logger.error('Erreur dans handleStart:', error);
      ctx.reply(BOT_CONFIG.errorMessage);
    }
  }

  // ... autres gestionnaires de commandes

  setupErrorHandling() {
    this.bot.catch((error) => {
      logger.error('Erreur du bot:', error);
    });

    process.on('unhandledRejection', (error) => {
      logger.error('Unhandled Rejection:', error);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  launch() {
    this.bot.launch()
      .then(() => {
        logger.info(`🤖 ${BOT_CONFIG.botName} démarré - Version ${BOT_CONFIG.version}`);
        logger.info(`📞 Contact: ${BOT_CONFIG.contactNumbers.join(' / ')}`);
      })
      .catch((error) => {
        logger.error('Erreur au démarrage du bot:', error);
        process.exit(1);
      });
  }
}

module.exports = ChicoRWABot;