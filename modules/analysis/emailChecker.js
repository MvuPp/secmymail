import { storage, STORAGE_KEYS } from '../core/storage.js';

class EmailChecker {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000;
  }

  async checkEmail(email) {
    if (!email) return 0;

    const normalizedEmail = email.toLowerCase().trim();
    
    if (this.cache.has(normalizedEmail)) {
      const cached = this.cache.get(normalizedEmail);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.result;
      }
    }

    try {
      const keys = ['emailWhitelist', 'emailBlacklist'];
      const stored = await browser.storage.local.get(keys);
      
      const emailWhitelist = stored.emailWhitelist || [];
      const emailBlacklist = stored.emailBlacklist || [];

      const allListsEmpty = emailWhitelist.length === 0 && emailBlacklist.length === 0;

      if (allListsEmpty) {
        console.log('[EmailChecker] Toutes les listes sont vides - Retour unverified');
        this.cache.set(normalizedEmail, {
          result: 0,
          timestamp: Date.now()
        });
        return 0;
      }

      let result = 0;

      if (this.isInEmailList(normalizedEmail, emailBlacklist)) {
        result = -1;
      }
      else if (this.isInEmailList(normalizedEmail, emailWhitelist)) {
        result = 1;
      }

      this.cache.set(normalizedEmail, {
        result: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('[EmailChecker] Erreur vérification email:', error);
      return 0;
    }
  }

  isInEmailList(email, emailList) {
    if (!emailList || !Array.isArray(emailList)) {
      return false;
    }

    const domain = email.split('@')[1];
    
    if (emailList.includes(email)) {
      return true;
    }

    if (emailList.some(entry => entry.startsWith('@') && domain === entry.substring(1))) {
      return true;
    }

    if (emailList.some(entry => {
      if (entry.includes('*')) {
        const regex = new RegExp(entry.replace(/\*/g, '.*'));
        return regex.test(email);
      }
      return false;
    })) {
      return true;
    }

    return false;
  }

  async refreshData() {
    this.clearCache();
    console.log('[EmailChecker] Cache vidé - données actualisées');
  }

  clearCacheForEmail(email) {
    this.cache.delete(email.toLowerCase().trim());
  }

  clearCache() {
    this.cache.clear();
  }
}

export const emailChecker = new EmailChecker();