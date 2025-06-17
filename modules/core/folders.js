import { storage, STORAGE_KEYS } from './storage.js';

/**
 * Module de gestion des dossiers
 */
class FolderManager {
  constructor() {
    this.folders = new Map();
    this.accounts = new Map();
    this.initialized = false;
  }

  /**
   * Initialise le gestionnaire de dossiers
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.loadAccounts();
      await this.createSecurityFolders();
      this.initialized = true;
      console.log('[FolderManager] Initialisation terminée');
    } catch (error) {
      console.error('[FolderManager] Erreur initialisation:', error);
      throw error;
    }
  }

  /**
   * Charge les comptes de messagerie
   */
  async loadAccounts() {
    try {
      const accounts = await browser.accounts.list();
      
      for (const account of accounts) {
        if (account.type === 'imap' || account.type === 'pop3') {
          this.accounts.set(account.id, account);
          console.log(`[FolderManager] Compte chargé: ${account.name} (${account.id})`);
        }
      }
    } catch (error) {
      console.error('[FolderManager] Erreur chargement comptes:', error);
      throw error;
    }
  }

  /**
   * Crée les dossiers de sécurité pour tous les comptes
   */
  async createSecurityFolders() {
    const folderNames = ['Malicious', 'Quarantine', 'Suspicious'];
    
    for (const [accountId, account] of this.accounts) {
      try {
        await this.createFoldersForAccount(accountId, folderNames);
      } catch (error) {
        console.error(`[FolderManager] Erreur création dossiers pour ${account.name}:`, error);
      }
    }
  }

  /**
   * Crée les dossiers pour un compte spécifique
   */
  async createFoldersForAccount(accountId, folderNames) {
    try {
      // Récupérer les dossiers existants
      const existingFolders = await browser.folders.query({ accountId: accountId });
      const existingNames = existingFolders.map(f => f.name.toLowerCase());

      for (const folderName of folderNames) {
        if (!existingNames.includes(folderName.toLowerCase())) {
          try {
            // Créer le dossier à la racine du compte
            const rootFolder = existingFolders.find(f => f.type === 'inbox')?.parentId || accountId;
            await browser.folders.create(rootFolder, folderName);
            console.log(`[FolderManager] Dossier '${folderName}' créé pour le compte ${accountId}`);
          } catch (createError) {
            console.warn(`[FolderManager] Impossible de créer '${folderName}' pour ${accountId}:`, createError);
          }
        }
      }
    } catch (error) {
      console.error(`[FolderManager] Erreur création dossiers pour ${accountId}:`, error);
    }
  }

  /**
   * Trouve un dossier par nom et compte
   */
  async findFolder(accountId, folderName) {
    try {
      const folders = await browser.folders.query({ accountId: accountId });
      return folders.find(f => f.name.toLowerCase() === folderName.toLowerCase());
    } catch (error) {
      console.error(`[FolderManager] Erreur recherche dossier ${folderName}:`, error);
      return null;
    }
  }

  /**
   * Déplace un message vers un dossier spécifique
   */
  async moveMessage(messageId, targetFolderName) {
    try {
      // Récupérer les informations du message
      const message = await browser.messages.get(messageId);
      const accountId = message.folder.accountId;

      // Trouver le dossier cible
      const targetFolder = await this.findFolder(accountId, targetFolderName);
      
      if (!targetFolder) {
        throw new Error(`Dossier '${targetFolderName}' introuvable`);
      }

      // Déplacer le message
      await browser.messages.move([messageId], targetFolder);
      
      console.log(`[FolderManager] Message ${messageId} déplacé vers ${targetFolderName}`);
      return true;

    } catch (error) {
      console.error(`[FolderManager] Erreur déplacement message ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Déplace un message vers le dossier Malicious
   */
  async moveToMalicious(messageId) {
    return await this.moveMessage(messageId, 'Malicious');
  }

  /**
   * Déplace un message vers le dossier Quarantine
   */
  async moveToQuarantine(messageId) {
    return await this.moveMessage(messageId, 'Quarantine');
  }

  /**
   * Déplace un message vers le dossier Suspicious
   */
  async moveToSuspicious(messageId) {
    return await this.moveMessage(messageId, 'Suspicious');
  }

  /**
   * Copie un message vers un dossier
   */
  async copyMessage(messageId, targetFolderName) {
    try {
      const message = await browser.messages.get(messageId);
      const accountId = message.folder.accountId;
      const targetFolder = await this.findFolder(accountId, targetFolderName);
      
      if (!targetFolder) {
        throw new Error(`Dossier '${targetFolderName}' introuvable`);
      }

      await browser.messages.copy([messageId], targetFolder);
      console.log(`[FolderManager] Message ${messageId} copié vers ${targetFolderName}`);
      return true;

    } catch (error) {
      console.error(`[FolderManager] Erreur copie message ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Récupère les statistiques des dossiers de sécurité
   */
  async getSecurityFolderStats() {
    const stats = {
      malicious: 0,
      quarantine: 0,
      suspicious: 0,
      total: 0
    };

    try {
      for (const accountId of this.accounts.keys()) {
        const folders = ['Malicious', 'Quarantine', 'Suspicious'];
        
        for (const folderName of folders) {
          const folder = await this.findFolder(accountId, folderName);
          if (folder) {
            try {
              const messages = await browser.messages.query({ folder: folder });
              const count = messages.messages.length;
              stats[folderName.toLowerCase()] += count;
              stats.total += count;
            } catch (error) {
              console.warn(`[FolderManager] Erreur comptage messages ${folderName}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('[FolderManager] Erreur récupération statistiques:', error);
    }

    return stats;
  }

  /**
   * Nettoie les anciens messages des dossiers de sécurité
   */
  async cleanupSecurityFolders(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      for (const accountId of this.accounts.keys()) {
        const folders = ['Malicious', 'Quarantine', 'Suspicious'];
        
        for (const folderName of folders) {
          const folder = await this.findFolder(accountId, folderName);
          if (folder) {
            await this.cleanupFolder(folder, cutoffDate);
          }
        }
      }
    } catch (error) {
      console.error('[FolderManager] Erreur nettoyage dossiers:', error);
    }
  }

  /**
   * Nettoie un dossier spécifique
   */
  async cleanupFolder(folder, cutoffDate) {
    try {
      const messages = await browser.messages.query({ folder: folder });
      const messagesToDelete = [];

      for (const message of messages.messages) {
        if (message.date < cutoffDate) {
          messagesToDelete.push(message.id);
        }
      }

      if (messagesToDelete.length > 0) {
        await browser.messages.delete(messagesToDelete, true); // true = skip trash
        console.log(`[FolderManager] ${messagesToDelete.length} anciens messages supprimés de ${folder.name}`);
      }
    } catch (error) {
      console.error(`[FolderManager] Erreur nettoyage dossier ${folder.name}:`, error);
    }
  }

  /**
   * Récupère la configuration des dossiers
   */
  async getFolderSettings() {
    return await storage.get(STORAGE_KEYS.FOLDER_SETTINGS, {
      moveMalicious: false,
      moveQuarantine: false,
      moveSuspicious: false,
      autoCleanup: false,
      cleanupDays: 30
    });
  }

  /**
   * Met à jour la configuration des dossiers
   */
  async updateFolderSettings(settings) {
    const currentSettings = await this.getFolderSettings();
    const newSettings = { ...currentSettings, ...settings };
    await storage.set(STORAGE_KEYS.FOLDER_SETTINGS, newSettings);
    
    console.log('[FolderManager] Configuration mise à jour:', newSettings);
    return newSettings;
  }

  /**
   * Vérifie si un dossier existe
   */
  async folderExists(accountId, folderName) {
    const folder = await this.findFolder(accountId, folderName);
    return folder !== null;
  }

  /**
   * Crée un dossier s'il n'existe pas
   */
  async ensureFolderExists(accountId, folderName) {
    if (!(await this.folderExists(accountId, folderName))) {
      await this.createFoldersForAccount(accountId, [folderName]);
    }
  }

  /**
   * Récupère la liste des comptes
   */
  getAccounts() {
    return Array.from(this.accounts.values());
  }

  /**
   * Récupère un compte par ID
   */
  getAccount(accountId) {
    return this.accounts.get(accountId);
  }
}

// Instance singleton
const folderManager = new FolderManager();

export { folderManager };