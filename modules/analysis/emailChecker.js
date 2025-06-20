import { storage, STORAGE_KEYS } from '../core/storage.js';

/**
 * Module de vérification des emails
 * Version simplifiée qui se concentre uniquement sur les expéditeurs
 */
class EmailChecker {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Vérifie un email contre les listes blanches et noires
   */
  async checkEmail(email) {
    if (!email) return 0;

    const normalizedEmail = email.toLowerCase().trim();
    
    // Vérifier le cache
    if (this.cache.has(normalizedEmail)) {
      const cached = this.cache.get(normalizedEmail);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.result;
      }
    }

    try {
      // Récupérer uniquement les listes d'emails
      const [emailWhitelist, emailBlacklist] = await Promise.all([
        storage.get(STORAGE_KEYS.EMAIL_WHITELIST, []),
        storage.get(STORAGE_KEYS.EMAIL_BLACKLIST, [])
      ]);

      // Vérifier si les listes sont vides
      const allListsEmpty = emailWhitelist.length === 0 && emailBlacklist.length === 0;

      if (allListsEmpty) {
        console.log('[EmailChecker] Toutes les listes sont vides - Retour unverified');
        // Mettre en cache avec un statut non vérifié
        this.cache.set(normalizedEmail, {
          result: 0,
          timestamp: Date.now()
        });
        return 0; // Non vérifié
      }

      let result = 0; // Par défaut: inconnu

      // Vérifier d'abord la liste noire (priorité)
      if (this.isInEmailList(normalizedEmail, emailBlacklist)) {
        result = -1; // Malveillant
      }
      // Puis la liste blanche
      else if (this.isInEmailList(normalizedEmail, emailWhitelist)) {
        result = 1; // Sûr
      }

      // Mettre en cache
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

  /**
   * Vérifie si un email est dans une liste d'emails
   */
  isInEmailList(email, emailList) {
    if (!emailList || !Array.isArray(emailList)) {
      return false;
    }

    // Extraire le domaine pour les règles commençant par @
    const domain = email.split('@')[1];
    
    // Vérifier l'email exact
    if (emailList.includes(email)) {
      return true;
    }

    // Vérifier les règles de domaine (commençant par @)
    if (emailList.some(entry => entry.startsWith('@') && domain === entry.substring(1))) {
      return true;
    }

    // Vérifier les patterns wildcard
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

  /**
   * Force le rechargement des données (pour la synchronisation)
   */
  async refreshData() {
    this.clearCache();
    console.log('[EmailChecker] Cache vidé - données actualisées');
  }

  /**
   * Vide le cache pour un email spécifique
   */
  clearCacheForEmail(email) {
    this.cache.delete(email.toLowerCase().trim());
  }

  /**
   * Vide tout le cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export const emailChecker = new EmailChecker();