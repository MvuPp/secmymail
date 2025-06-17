import { storage, STORAGE_KEYS } from '../core/storage.js';

/**
 * Module de vérification des emails
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
      // Récupérer les listes avec les BONNES clés
      const [emailWhitelist, emailBlacklist, domainWhitelist, domainBlacklist] = await Promise.all([
        storage.get(STORAGE_KEYS.EMAIL_WHITELIST, []),
        storage.get(STORAGE_KEYS.EMAIL_BLACKLIST, []),
        storage.get(STORAGE_KEYS.DOMAIN_WHITELIST, []),
        storage.get(STORAGE_KEYS.DOMAIN_BLACKLIST, [])
      ]);

      // NOUVEAU: Vérifier si toutes les listes sont vides
      const allListsEmpty = emailWhitelist.length === 0 && 
                           emailBlacklist.length === 0 && 
                           domainWhitelist.length === 0 && 
                           domainBlacklist.length === 0;

      if (allListsEmpty) {
        console.log('[EmailChecker] Toutes les listes sont vides - Retour unverified');
        // Mettre en cache avec un statut non vérifié
        this.cache.set(normalizedEmail, {
          result: 0,
          timestamp: Date.now()
        });
        return 0; // Non vérifié
      }

      // Créer les structures compatibles avec validation
      const trustedSenders = { 
        emails: Array.isArray(emailWhitelist) ? emailWhitelist : [], 
        domains: Array.isArray(domainWhitelist) ? domainWhitelist : [] 
      };
      const maliciousSenders = { 
        emails: Array.isArray(emailBlacklist) ? emailBlacklist : [], 
        domains: Array.isArray(domainBlacklist) ? domainBlacklist : [] 
      };

      let result = 0; // Par défaut: inconnu

      // Vérifier d'abord la liste malveillante (priorité)
      if (this.isInSendersList(normalizedEmail, maliciousSenders)) {
        result = -1; // Malveillant
      }
      // Puis la liste de confiance
      else if (this.isInSendersList(normalizedEmail, trustedSenders)) {
        result = 1; // Sûr
      }
      // Vérifications supplémentaires pour les emails inconnus
      else {
        result = await this.analyzeUnknownEmail(normalizedEmail);
      }

      // Mettre en cache
      this.cache.set(normalizedEmail, {
        result: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('[EmailChecker] Erreur vérification email:', error);
      return 0; // En cas d'erreur, considérer comme inconnu
    }
  }

  /**
   * CORRECTION: Analyse un email inconnu pour détecter des patterns suspects
   */
  async analyzeUnknownEmail(email) {
    const domain = email.split('@')[1];
    
    try {
      // CORRECTION: Utiliser les bonnes clés de storage
      const [trustedDomains, maliciousDomains] = await Promise.all([
        storage.get(STORAGE_KEYS.DOMAIN_WHITELIST, []),
        storage.get(STORAGE_KEYS.DOMAIN_BLACKLIST, [])
      ]);

      // CORRECTION: S'assurer que ce sont des tableaux
      const trustedDomainsArray = Array.isArray(trustedDomains) ? trustedDomains : [];
      const maliciousDomainsArray = Array.isArray(maliciousDomains) ? maliciousDomains : [];

      // Domaine explicitement malveillant
      if (maliciousDomainsArray.includes(domain)) {
        return -1; // Malveillant
      }

      // Domaine explicitement de confiance
      if (trustedDomainsArray.includes(domain)) {
        return 1; // Sûr
      }
      
      // Domaines temporaires connus
      const tempDomains = [
        'tempmail.org', '10minutemail.com', 'guerrillamail.com',
        'mailinator.com', 'yopmail.com', 'temp-mail.org',
        'throwaway.email', 'maildrop.cc', 'sharklasers.com'
      ];

      if (tempDomains.includes(domain)) {
        return -1; // Suspect
      }

      // Domaines avec des caractères suspects
      if (this.hasSuspiciousCharacters(domain)) {
        return -1; // Suspect
      }

      // TLD suspects
      const suspiciousTlds = ['tk', 'ml', 'ga', 'cf'];
      const tld = domain.split('.').pop();
      if (suspiciousTlds.includes(tld)) {
        return -1; // Suspect
      }

      return 0; // Inconnu mais pas suspect
      
    } catch (error) {
      console.error('[EmailChecker] Erreur analyse email inconnu:', error);
      return 0; // En cas d'erreur, retourner neutre
    }
  }

  /**
   * Vérifie si un email est dans une liste de senders (nouvelle structure)
   */
  isInSendersList(email, sendersList) {
    if (!sendersList || !sendersList.emails || !Array.isArray(sendersList.emails)) {
      return false;
    }

    const domain = email.split('@')[1];
    
    // Vérifier d'abord les emails exacts
    if (sendersList.emails.includes(email)) {
      return true;
    }

    // Vérifier les domaines dans la liste emails (si l'entrée commence par @)
    if (sendersList.emails.some(entry => entry.startsWith('@') && domain === entry.substring(1))) {
      return true;
    }

    // Vérifier les patterns wildcard dans emails
    if (sendersList.emails.some(entry => {
      if (entry.includes('*')) {
        const regex = new RegExp(entry.replace(/\*/g, '.*'));
        return regex.test(email);
      }
      return false;
    })) {
      return true;
    }

    // Vérifier les domaines (si la structure domains existe)
    if (sendersList.domains && Array.isArray(sendersList.domains)) {
      return sendersList.domains.includes(domain);
    }

    return false;
  }

  /**
   * Vérifie la présence de caractères suspects dans un domaine
   */
  hasSuspiciousCharacters(domain) {
    // Caractères homographes ou suspects
    const suspiciousChars = /[^\x00-\x7F]|[0-9]{4,}|\-{2,}|_{2,}/;
    return suspiciousChars.test(domain);
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