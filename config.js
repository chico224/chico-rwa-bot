// config.js - Central Configuration Module for Chico RWA Business Bot
// Version: 1.1 (October 22, 2025)
// Description: This file centralizes all configurations for Chico RWA Business Bot.
// It defines bot identity, user limits, API settings for high-level bounties (>200$),
// task scheduling, and gain projections (1000-2000$/month). All user-facing messages
// are in French, code/comments in English. Includes Chico's personal numbers (+224669435463, +224661920519)
// and credits Chico as creator. Designed for 10-file modular architecture.

// Core Dependencies
const fs = require('fs');
const path = require('path');

// Section 1: General Bot Configuration
const BOT_CONFIG = {
  botName: 'Chico Business RWA Pro', // Official bot name for user-facing messages
  creator: 'Chico', // Credited creator
  contactNumbers: ['+224669435463', '+224661920519'], // Chico's WhatsApp numbers
  version: '2.0', // Major version update
  language: 'fr', // All user messages in French
  maxUsers: 1000, // Increased user capacity
  tasksPerRun: 50, // 50 simultaneous async tasks
  scheduleInterval: '*/5 * * * *', // Cron: every 5 minutes for auto-runs
  highValueThreshold: 200, // Minimum bounty value
  maxBountyValue: 2000, // Maximum bounty value
  monthlyTargetMin: 50000, // Projection: 50,000-100,000$/month
  monthlyTargetMax: 100000,
  adminCommission: 0.05, // 5% de commission pour l'admin sur tous les revenus
  // Configuration Telegram
  telegram: {
    enabled: true,
    botToken: 'VOTRE_BOT_TOKEN', // À remplacer par votre token
    adminChatId: 'VOTRE_CHAT_ID', // Chat ID de l'admin
    reportTime: '20:00', // Heure d'envoi des rapports (format 24h)
    timezone: 'Africa/Conakry' // Fuseau horaire
  },

  // Configuration RWA avancée
  rwa: {
    // Activation et seuils
    enabled: true,
    minCapital: 500, // Seuil minimum pour activer le RWA (en $)
    maxCapital: 10000, // Capital maximum avant optimisation agressive
    
    // Gestion des tâches
    tasksToReallocate: 3, // Nombre de tâches RWA actives
    totalTasks: 50,       // Nombre total de tâches (47 bounties + 3 RWA)
    minTasksForBounties: 47, // Minimum de tâches bounties
    
    // Stratégie d'allocation
    allocationStrategy: 'fixed', // 'fixed' ou 'dynamic'
    reallocationCheckInterval: 3600000, // Vérification chaque heure (en ms)
    
    // Paramètres de performance
    maxConcurrentTasks: 10, // Nombre maximum de tâches parallèles
    taskTimeout: 300000,    // 5 minutes par tâche max
    retryAttempts: 3,       // Nombre de tentatives en cas d'échec
    
    // Sécurité
    maxDailySpend: 1000,    // Dépense quotidienne maximale (en $)
    stopLoss: 0.1,          // Arrêt des pertes à 10%
    takeProfit: 0.3,        // Prise de bénéfices à 30%
    
    // Monitoring et alertes
    enableAlerts: true,
    alertThresholds: {
      capital: 0.9,         // Alerte à 90% du capital max
      performance: 0.8,     // Alerte si perf < 80% de l'objectif
      errorRate: 0.05       // Alerte si >5% d'erreurs
    },
    
    // Optimisation automatique
    autoOptimize: true,     // Active l'optimisation automatique
    optimizationInterval: 86400000, // Toutes les 24h
    
    // Journalisation avancée
    logLevel: 'info',       // debug, info, warn, error
    logToFile: true,
    logFile: 'rwa_performance.log'
  },
  
  admin: {
    securityQuestions: {
      question1: "Quel est le nom de ta mère ?",
      answer1: "laouratou",
      question2: "Quel est le nom de ton père ?",
      answer2: "oumar barry"
    },
    commissionWallet: '',  // Sera défini lors de l'authentification
    contact: '+224669435463',
    commissionRate: 0.05  // 5% de commission
  },
  dailyOpportunities: { min: 300, max: 600 }, // Daily bounty opportunities
  weeklyOpportunities: { min: 1500, max: 3000 }, // Weekly projection
  introMessage: `Bienvenue chez ${BOT_CONFIG.botName} ! Je suis créé par Chico (contact : ${BOT_CONFIG.contactNumbers.join(' ou ')}) pour t'aider à générer 50,000-100,000$/mois avec les RWA (Real World Assets). RWA = tokenisation d'actifs réels (immobilier, Treasuries, baux miniers Guinée) sur blockchain pour liquidité et yields passifs. Marché 2025 : 24B$, projeté 16T$ 2030 (CAGR 72%). Stratégie : 70% stables Ondo (5-8% APY), 20% RealT immobilier, 10% Centrifuge crédit. Risques : Volatilité 20-30%, hacks – fais ton propre research (DYOR). Apps : WhatsApp, MetaMask/Trust Wallet, Gitcoin, Binance P2P, Ondo/RealT/Centrifuge.\nJe automatise 50 tâches high-level (>200$, senior dev/RWA) par run (async, gratuit). Tu gères les transactions manuelles (claims bounties, staking). Gains : Complète 1-2 tâches/jour (10-20h/semaine) pour 250-500$/jour ou 1,250-2,500$/semaine. Discussion privée 1:1. Envoie ton wallet 0x... pour personnaliser, ou pose des questions sur le business/revenus/RWA.`,
  errorMessage: 'Erreur technique – réessaye dans 5 min. Contacte Chico au +224669435463 ou +224661920519 si ça persiste.',
  capacityMessage: 'Bot gratuit limité à 1000 utilisateurs. Capacité atteinte – contacte Chico au +224669435463 ou +224661920519 pour accès prioritaire.',
};

// Section 2: API Configuration for Bounty Platforms (High-Level Focus)
const API_CONFIG = {
  gitcoin: {
    baseUrl: 'https://gitcoin.co/api/v0.1/bounties',
    keywords: 'RWA defi blockchain solidity ethereum', // Broader search terms
    minValue: 200, // Minimum bounty value
    maxValue: 2000, // Maximum bounty value
    limit: 5, // Increased limit
    network: 'mainnet',
    headers: {
      'User-Agent': 'ChicoRWA-Bot/2.0',
      'Accept': 'application/json',
    },
  },
  dework: {
    baseUrl: 'https://api.dework.xyz/v1/bounties',
    tags: 'RWA defi blockchain solidity ethereum',
    minValue: 200,
    maxValue: 2000,
    limit: 5,
    headers: {
      'Content-Type': 'application/json',
      'X-Source': 'ChicoRWA-Bot',
    },
  },
  layer3: {
    baseUrl: 'https://api.layer3.xyz/v1/quests',
    tags: 'RWA advanced senior',
    limit: 1,
    headers: {
      'Authorization': process.env.LAYER3_TOKEN || 'public-free-tier',
      'User-Agent': 'ChicoRWA-Bot/1.1',
    },
  },
  retryAttempts: 3, // Retry failed API calls
  timeout: 10000, // 10s timeout per request
  rateLimitDelay: 1000, // 1s delay between API calls to avoid bans
};

// Section 3: Gains Configuration (1000-2000$/Month Target)
const GAINS_CONFIG = {
  bountyMinValue: 200, // High-level bounties only
  yieldAPYMin: 5, // Min APY for stable RWA (Ondo)
  yieldAPYMax: 12, // Max APY for riskier assets (Centrifuge)
  monthlyProjection: { min: 1000, max: 2000 }, // Main target
  dailyProjection: { min: 33, max: 66 }, // Daily target
  weeklyProjection: { min: 250, max: 500 }, // Weekly target
  rwaAllocation: {
    ondoTreasuries: 70, // Stable assets
    realtImmobilier: 20, // Real estate
    centrifugeCredit: 10, // Private credit
  },
  risksDisclaimer: 'Risques RWA : Volatilité 20-30%, régulations, hacks. DYOR et commence petit (100$). Contacte Chico au +224669435463 ou +224661920519 pour conseils.',
};

// Section 4: Wallet and App Configuration
const WALLET_CONFIG = {
  supportedWallets: ['MetaMask', 'Trust Wallet', 'Rainbow', 'Ledger', 'Coinbase Wallet'],
  validationRegex: /^0x[a-fA-F0-9]{40}$/i,
  appsList: `Apps nécessaires (toutes gratuites) :\n1. WhatsApp : Interagir avec moi.\n2. MetaMask/Trust Wallet/etc. : Wallet EVM pour signer transactions.\n3. Gitcoin.co : Bounties high-level.\n4. Binance.com : P2P GNF -> USDT.\n5. Ondo.finance : Staking Treasuries.\n6. Realt.co : Immobilier fractionné.\n7. Centrifuge.io : Crédit privé.\nTélécharge via stores officiels.`, // Français
};

// Section 5: Scheduling and Task Configuration
const SCHEDULE_CONFIG = {
  cronExpression: '0 */2 * * *', // Every 2 hours
  batchSize: 30, // 30 simultaneous async tasks
  platformsRotation: ['gitcoin', 'dework', 'layer3'], // Diverse bounty sources
  logLevel: 'info', // Logging level
  logFile: path.join(__dirname, 'bot_logs.txt'), // Unified log file
};

// Section 6: Response Configuration (French, Detailed for Business/Revenus)
const RESPONSES_CONFIG = {
  businessIntro: `Business RWA par Chico : Tokenise actifs réels (immobilier, obligations, baux miniers Guinée) en tokens blockchain pour liquidité et yields. Marché 2025 : 24B$, projeté 16T$ 2030 (CAGR 72%). Exemple : 100$ dans RealT = fraction d'appartement, rents USDC quotidiens. Stratégie Guinée : Bauxite via Centrifuge (8-12% APY). Bounties senior dev (Solidity/RWA) paient 200-500$. Gains : 1000-2000$/mois avec 1-2 tâches/jour. Contacte Chico au ${BOT_CONFIG.contactNumbers.join(' ou ')} pour questions.`,
  revenueFAQ: `Revenus réalistes : 1000-2000$/mois (33-66$/jour, 250-500$/semaine). Breakdown : 70% bounties high-level (5-10/mois à 200-400$), 30% yields RWA (5-10% APY). Ex : 1 bounty 300$ (3h) + stake 500$ Ondo = +25$/mois passif. Effort : 10-20h/semaine. Pas garanti – volatilité marché. Contacte Chico au ${BOT_CONFIG.contactNumbers.join(' ou ')}.`,
  risksFAQ: `Risques RWA : 1. Volatilité (20-30% drops). 2. Hacks (utilise multisig). 3. Régulations (Guinée OK 2025 via Tether). 4. Non-approbation bounties (DYOR). Mitigation : 70% stables, diversifie, commence petit. Contacte Chico au ${BOT_CONFIG.contactNumbers.join(' ou ')} pour conseils.`,
  appsFAQ: WALLET_CONFIG.appsList,
  guineeFAQ: `Guinée : Tokenise baux miniers (bauxite) via Centrifuge pour 8-12% APY. Tether 2025 facilite USDT stables. Utilise Orange Money/Binance P2P pour ramps GNF. Impôts : Déclare gains >10M GNF via Direction Impôts. Contacte Chico au ${BOT_CONFIG.contactNumbers.join(' ou ')}.`,
  intermediateFAQ: `Intermédiaires : Focus bounties >200$ (Solidity/RWA dev). Vise 5-10/mois pour 1000-2000$. Complète 1-2/jour (10-20h/semaine). Utilise templates auto fournis. Contacte Chico au ${BOT_CONFIG.contactNumbers.join(' ou ')} pour tips.`,
};

// Section 7: Validation and Initialization
function validateConfig() {
  const errors = [];
  // Validate max users
  if (BOT_CONFIG.maxUsers > 100 || BOT_CONFIG.maxUsers < 30) {
    errors.push('Max users must be exactly 30 for free tier');
  }
  // Validate contact numbers
  BOT_CONFIG.contactNumbers.forEach(num => {
    if (!num.match(/^\+224[0-9]{9}$/)) {
      errors.push(`Invalid contact number: ${num}`);
    }
  });
  // Validate bounty threshold
  if (GAINS_CONFIG.bountyMinValue < 200) {
    errors.push('Bounty threshold too low for high-level');
  }
  // Validate cron
  if (!SCHEDULE_CONFIG.cronExpression.match(/^\*\/2 \*/)) {
    errors.push('Invalid cron expression');
  }
  // Validate API configs
  if (!API_CONFIG.gitcoin.baseUrl.includes('gitcoin.co')) {
    errors.push('Invalid Gitcoin API URL');
  }

  if (errors.length > 0) {
    const errorLog = path.join(__dirname, 'config_errors.log');
    fs.appendFileSync(errorLog, `${new Date().toISOString()}: Validation failed - ${JSON.stringify(errors)}\n`);
    console.error('Config validation failed:', errors);
    process.exit(1);
  }

  // Set environment defaults
  API_CONFIG.gitcoin.headers['Authorization'] = process.env.GITCOIN_TOKEN || 'public-free';
  API_CONFIG.dework.headers['Authorization'] = process.env.DEWORK_TOKEN || 'public-free';
  API_CONFIG.layer3.headers['Authorization'] = process.env.LAYER3_TOKEN || 'public-free';

  // Log successful init
  const initLog = path.join(__dirname, 'config_init.log');
  fs.appendFileSync(initLog, `${new Date().toISOString()}: Config v${BOT_CONFIG.version} initialized for ${BOT_CONFIG.botName} by ${BOT_CONFIG.creator}. Contact: ${BOT_CONFIG.contactNumbers.join(', ')}\n`);
  console.log(`Config initialized: ${BOT_CONFIG.botName} v${BOT_CONFIG.version}`);
}

// Section 8: Exports for Modular Architecture
module.exports = {
  BOT_CONFIG,
  API_CONFIG,
  GAINS_CONFIG,
  WALLET_CONFIG,
  SCHEDULE_CONFIG,
  RESPONSES_CONFIG,
  validateConfig,
};

// Run validation on load
validateConfig();