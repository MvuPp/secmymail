import { storage } from './storage.js';
import { folderManager } from './folders.js';

// Clés de stockage pour les options et statistiques
const STORAGE_KEYS = {
  AUTO_MOVE_OPTIONS: 'autoMoveOptions',
  AUTO_MOVE_STATS: 'autoMoveStats'
};

/**
 * Module de déplacement automatique des messages
 */
class AutoMoveManager {
  constructor() {
    this.options = {
      enabled: false,
      folder: 'INBOX/SecMyMail-Quarantine',
      quarantineExpediteursmalveillants: true,
      quarantineLiensMalveillants: true,
      quarantineFichiersMalveillants: true
    };
    this.stats = {
      totalQuarantined: 0
    };
    this.initialized = false;
  }

  /**
   * Initialise le gestionnaire de déplacement automatique
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.loadOptions();
      await this.loadStats();
      this.initialized = true;
      console.log('[AutoMoveManager] Initialisation terminée');
    } catch (error) {
      console.error('[AutoMoveManager] Erreur initialisation:', error);
    }
  }

  /**
   * Charge les options depuis le stockage
   */
  async loadOptions() {
    try {
      const savedOptions = await browser.storage.local.get(STORAGE_KEYS.AUTO_MOVE_OPTIONS);
      if (savedOptions && savedOptions[STORAGE_KEYS.AUTO_MOVE_OPTIONS]) {
        this.options = { ...this.options, ...savedOptions[STORAGE_KEYS.AUTO_MOVE_OPTIONS] };
      } else {
        await browser.storage.local.set({ [STORAGE_KEYS.AUTO_MOVE_OPTIONS]: this.options });
      }
      console.log('[AutoMoveManager] Options chargées:', this.options);
    } catch (error) {
      console.error('[AutoMoveManager] Erreur chargement options:', error);
    }
  }

  /**
   * Charge les statistiques depuis le stockage
   */
  async loadStats() {
    try {
      const savedStats = await browser.storage.local.get(STORAGE_KEYS.AUTO_MOVE_STATS);
      if (savedStats && savedStats[STORAGE_KEYS.AUTO_MOVE_STATS]) {
        this.stats = { ...this.stats, ...savedStats[STORAGE_KEYS.AUTO_MOVE_STATS] };
      } else {
        await browser.storage.local.set({ [STORAGE_KEYS.AUTO_MOVE_STATS]: this.stats });
      }
      console.log('[AutoMoveManager] Statistiques chargées:', this.stats);
    } catch (error) {
      console.error('[AutoMoveManager] Erreur chargement statistiques:', error);
    }
  }

  /**
   * Met à jour les options
   */
  async updateOptions(newOptions) {
    try {
      this.options = { ...this.options, ...newOptions };
      await browser.storage.local.set({ [STORAGE_KEYS.AUTO_MOVE_OPTIONS]: this.options });
      console.log('[AutoMoveManager] Options mises à jour:', this.options);
      return { success: true };
    } catch (error) {
      console.error('[AutoMoveManager] Erreur mise à jour options:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Incrémente le compteur de messages déplacés
   */
  async incrementStats() {
    try {
      this.stats.totalQuarantined++;
      await browser.storage.local.set({ [STORAGE_KEYS.AUTO_MOVE_STATS]: this.stats });
      return this.stats;
    } catch (error) {
      console.error('[AutoMoveManager] Erreur mise à jour statistiques:', error);
      return this.stats;
    }
  }

  /**
   * Récupère les statistiques
   */
  getStats() {
    return this.stats;
  }

  /**
   * Récupère les options
   */
  getOptions() {
    return this.options;
  }

  /**
   * Vérifie si un message doit être déplacé en fonction de son type
   */
  shouldMoveMessage(messageType) {
    if (!this.options.enabled) return false;

    switch (messageType) {
      case 'expediteur_malveillant':
        return this.options.quarantineExpediteursmalveillants;
      case 'lien_malveillant':
        return this.options.quarantineLiensMalveillants;
      case 'fichier_malveillant':
        return this.options.quarantineFichiersMalveillants;
      default:
        return false;
    }
  }

  /**
   * Déplace un message s'il correspond aux critères
   */
  async moveMessageIfNeeded(messageId, messageType) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.shouldMoveMessage(messageType)) {
      console.log(`[AutoMoveManager] Message ${messageId} non déplacé (type: ${messageType})`);
      return false;
    }

    try {
      // Récupérer les informations du message
      const message = await browser.messages.get(messageId);
      
      // Récupérer le dossier de destination
      const targetFolderPath = this.options.folder;
      
      // Si c'est un chemin complet, extraire juste le nom du dossier
      const targetFolderName = targetFolderPath.split('/').pop();
      
      // S'assurer que le dossier existe
      try {
        const folders = await browser.folders.query({ accountId: message.folder.accountId });
        let targetFolder = folders.find(f => f.name === targetFolderName);
        
        // Si le dossier n'existe pas, le créer
        if (!targetFolder) {
          console.log(`[AutoMoveManager] Création du dossier ${targetFolderName}`);
          targetFolder = await browser.folders.create(message.folder.accountId, targetFolderName);
        }
        
        // Déplacer le message
        await browser.messages.move([messageId], targetFolder.id);
        
        // Mettre à jour les statistiques
        await this.incrementStats();
        
        console.log(`[AutoMoveManager] Message ${messageId} déplacé vers ${targetFolderName} (type: ${messageType})`);
        return true;
      } catch (folderError) {
        // Essai de méthode alternative si l'API folders n'est pas disponible ou échoue
        try {
          // Déplacer directement en utilisant le chemin complet
          await browser.messages.move([messageId], this.options.folder);
          await this.incrementStats();
          console.log(`[AutoMoveManager] Message ${messageId} déplacé avec chemin complet (type: ${messageType})`);
          return true;
        } catch (moveError) {
          console.error(`[AutoMoveManager] Erreur déplacement alternatif:`, moveError);
          return false;
        }
      }
    } catch (error) {
      console.error(`[AutoMoveManager] Erreur déplacement message ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Réinitialise les options et statistiques
   */
  async reset() {
    this.options = {
      enabled: false,
      folder: 'INBOX/SecMyMail-Quarantine',
      quarantineExpediteursmalveillants: true,
      quarantineLiensMalveillants: true,
      quarantineFichiersMalveillants: true
    };
    
    this.stats = {
      totalQuarantined: 0
    };
    
    await browser.storage.local.set({ [STORAGE_KEYS.AUTO_MOVE_OPTIONS]: this.options });
    await browser.storage.local.set({ [STORAGE_KEYS.AUTO_MOVE_STATS]: this.stats });
    
    console.log('[AutoMoveManager] Options et statistiques réinitialisées');
    return { success: true };
  }
}

// Instance singleton
const autoMoveManager = new AutoMoveManager();

export { autoMoveManager };