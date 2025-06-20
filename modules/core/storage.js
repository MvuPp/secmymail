/**
 * Module de gestion centralisée du stockage avec chiffrement AES-256-GCM
 */

const STORAGE_KEYS = {
  TAG_STATES: 'tagStates',
  EMAIL_WHITELIST: 'emailWhitelist',
  EMAIL_BLACKLIST: 'emailBlacklist',
  DOMAIN_WHITELIST: 'domainWhitelist',
  DOMAIN_BLACKLIST: 'domainBlacklist',
  FOLDER_SETTINGS: 'folderSettings',
  APP_SETTINGS: 'appSettings',
  AUTO_MOVE_OPTIONS: 'autoMoveOptions',
  AUTO_MOVE_STATS: 'autoMoveStats',
  ADDRESS_BOOK_SYNC: 'addressBookSync',
  LOGS: 'logs'
};

class StorageManager {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
    this.memoryDb = {};
    this.encryptionKey = null;
    this.initialized = false;
    this.ENCRYPTED_DB_KEY = 'secMyMailData';
    this.ENCRYPTION_KEY_STORAGE = 'secMyMailKey';
  }

  /**
   * Initialise le système de chiffrement et charge la base de données
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.loadOrGenerateKey();
      await this.loadEncryptedDatabase();
      this.initialized = true;
      console.log('[Storage] Système de chiffrement initialisé');
    } catch (error) {
      console.error('[Storage] Erreur initialisation chiffrement:', error);
      throw error;
    }
  }

  /**
   * Charge ou génère la clé de chiffrement
   */
  async loadOrGenerateKey() {
    try {
      const result = await browser.storage.local.get(this.ENCRYPTION_KEY_STORAGE);
      
      if (result[this.ENCRYPTION_KEY_STORAGE]) {
        // Clé existante
        const keyData = result[this.ENCRYPTION_KEY_STORAGE];
        this.encryptionKey = await crypto.subtle.importKey(
          'raw',
          new Uint8Array(keyData),
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );
        console.log('[Storage] Clé de chiffrement chargée');
      } else {
        // Générer nouvelle clé
        this.encryptionKey = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
        
        const exportedKey = await crypto.subtle.exportKey('raw', this.encryptionKey);
        await browser.storage.local.set({
          [this.ENCRYPTION_KEY_STORAGE]: Array.from(new Uint8Array(exportedKey))
        });
        console.log('[Storage] Nouvelle clé de chiffrement générée et sauvegardée');
      }
    } catch (error) {
      console.error('[Storage] Erreur gestion clé:', error);
      throw error;
    }
  }

  /**
   * Charge la base de données chiffrée
   */
  async loadEncryptedDatabase() {
    try {
      const result = await browser.storage.local.get(this.ENCRYPTED_DB_KEY);
      
      if (result[this.ENCRYPTED_DB_KEY]) {
        // Déchiffrer la base de données
        const encryptedData = result[this.ENCRYPTED_DB_KEY];
        const decryptedData = await this.decrypt(encryptedData);
        this.memoryDb = JSON.parse(decryptedData);
        console.log('[Storage] Base de données déchiffrée et chargée en mémoire');
      } else {
        // Première utilisation
        this.memoryDb = {};
        await this.saveEncryptedDatabase();
        console.log('[Storage] Nouvelle base de données initialisée');
      }
    } catch (error) {
      console.error('[Storage] Erreur chargement base de données:', error);
      this.memoryDb = {};
    }
  }

  /**
   * Sauvegarde la base de données chiffrée
   */
  async saveEncryptedDatabase() {
    try {
      const dataToEncrypt = JSON.stringify(this.memoryDb);
      const encryptedData = await this.encrypt(dataToEncrypt);
      
      await browser.storage.local.set({
        [this.ENCRYPTED_DB_KEY]: encryptedData
      });
      
      console.log('[Storage] Base de données chiffrée et sauvegardée');
    } catch (error) {
      console.error('[Storage] Erreur sauvegarde chiffrée:', error);
      throw error;
    }
  }

  /**
   * Chiffre des données avec AES-256-GCM
   */
  async encrypt(data) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encodedData
    );
    
    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encryptedData))
    };
  }

  /**
   * Déchiffre des données avec AES-256-GCM
   */
  async decrypt(encryptedData) {
    const iv = new Uint8Array(encryptedData.iv);
    const data = new Uint8Array(encryptedData.data);
    
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      data
    );
    
    return new TextDecoder().decode(decryptedData);
  }

  /**
   * Récupère des données depuis le storage avec cache et base de données chiffrée
   */
  async get(key, defaultValue = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Vérifier d'abord le cache mémoire
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    try {
      // Récupérer depuis la base de données mémoire chiffrée
      const value = this.memoryDb[key] ?? defaultValue;
      this.cache.set(key, value);
      return value;
    } catch (error) {
      console.error('[Storage] Erreur get:', error);
      return defaultValue;
    }
  }

  /**
   * Sauvegarde des données avec cache et base de données chiffrée
   */
  async set(key, value) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Mettre à jour la base de données mémoire
      this.memoryDb[key] = value;
      
      // Sauvegarder la base de données chiffrée
      await this.saveEncryptedDatabase();
      
      // Mettre à jour le cache
      this.cache.set(key, value);
      
      // Notifier les listeners
      if (this.listeners.has(key)) {
        this.listeners.get(key).forEach(callback => {
          try {
            callback(value);
          } catch (error) {
            console.error('[Storage] Erreur callback:', error);
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('[Storage] Erreur set:', error);
      return false;
    }
  }

  /**
   * Ajoute un listener pour un changement de clé
   */
  addListener(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
  }

  /**
   * Supprime un listener
   */
  removeListener(key, callback) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).delete(callback);
    }
  }

  /**
   * Vide le cache
   */
  clearCache() {
    this.cache.clear();
  }

  // Méthodes spécifiques pour les listes
  async addToList(listKey, item) {
    const list = await this.get(listKey, []);
    if (!list.includes(item)) {
      list.push(item);
      await this.set(listKey, list);
    }
    return list;
  }

  async removeFromList(listKey, item) {
    const list = await this.get(listKey, []);
    const index = list.indexOf(item);
    if (index > -1) {
      list.splice(index, 1);
      await this.set(listKey, list);
    }
    return list;
  }
}

// Instance singleton
const storage = new StorageManager();

export { storage, STORAGE_KEYS };