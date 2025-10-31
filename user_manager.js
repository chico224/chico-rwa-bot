'use strict';

const fs = require('fs');
const path = require('path');
let ethers = null;
try { ethers = require('ethers'); } catch (_) { /* optional dependency */ }

class UserManager {
  constructor() {
    this.users = new Map();
    this.dataDir = path.join(__dirname, 'data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this._initialized = false;
  }

  initialize() {
    if (this._initialized) return;
    try {
      if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
      if (fs.existsSync(this.usersFile)) {
        const raw = fs.readFileSync(this.usersFile, 'utf8');
        if (raw) {
          const obj = JSON.parse(raw);
          Object.entries(obj).forEach(([jid, state]) => {
            this.users.set(jid, state);
          });
        }
      }
    } catch (_) {
      // ignore read errors for MVP
    }
    this._initialized = true;
  }

  addUser(jid) {
    if (!this.users.has(jid)) {
      this.users.set(jid, { firstConnection: true, wallet: null, capital: 0 });
      this._save();
    }
  }

  getUserState(jid) {
    return this.users.get(jid);
  }

  setUserWallet(jid, wallet) {
    if (!this._isValidWallet(wallet)) return false;
    const state = this.getUserState(jid) || {};
    state.wallet = wallet;
    state.firstConnection = false;
    if (state.capital == null) state.capital = 0;
    this.users.set(jid, state);
    this._save();
    return true;
  }

  handleQuestion(text, jid) {
    const t = (text || '').trim().toLowerCase();
    if (!t) return 'Pose ta question sur le business RWA ou envoie "start".';
    if (t.includes('rwa')) return 'Le RWA consiste à tokeniser/structurer des actifs du monde réel avec des flux mesurables.';
    if (t.includes('wallet')) return 'Envoie une adresse 0x... (EVM) pour lier ton wallet.';
    return 'Demande reçue. Envoie "start" pour lancer les 30 tâches ou pose une autre question.';
  }

  _save() {
    try {
      const obj = Object.fromEntries(this.users.entries());
      fs.writeFileSync(this.usersFile, JSON.stringify(obj, null, 2), 'utf8');
    } catch (_) {
      // ignore write errors for MVP
    }
  }

  getSummary(jid) {
    const s = this.getUserState(jid) || {};
    return {
      wallet: s.wallet || 'non défini',
      capital: s.capital || 0,
      firstConnection: !!s.firstConnection,
    };
  }

  _isValidWallet(addr) {
    if (typeof addr !== 'string') return false;
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return false;
    // If ethers is available, enforce EIP-55 for mixed-case addresses, and accept all-lower for compatibility
    if (ethers && ethers.utils && typeof ethers.utils.getAddress === 'function') {
      try {
        const checksummed = ethers.utils.getAddress(addr);
        // Accept exact checksum match or all-lowercase input (to be user-friendly)
        return checksummed === addr || addr.toLowerCase() === addr;
      } catch (_) {
        return false;
      }
    }
    // Fallback: basic regex only
    return true;
  }
}

module.exports = { UserManager };
