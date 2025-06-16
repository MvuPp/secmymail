/**
 * Module de gestion centralisée du stockage
 */

const STORAGE_KEYS = {
  TAG_STATES: 'tagStates',
  EMAIL_WHITELIST: 'emailWhitelist',
  EMAIL_BLACKLIST: 'emailBlacklist',
  DOMAIN_WHITELIST: 'domainWhitelist',
  DOMAIN_BLACKLIST: 'domainBlacklist',
  FOLDER_SETTINGS: 'folderSettings',
  APP_SETTINGS: 'appSettings'
};

class StorageManager {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
  }

  /**
   * Récupère des données depuis le storage avec cache
   */
  async get(key, defaultValue = null) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    try {
      const result = await browser.storage.local.get(key);
      const value = result[key] ?? defaultValue;
      this.cache.set(key, value);
      return value;
    } catch (error) {
      console.error('[Storage] Erreur get:', error);
      return defaultValue;
    }
  }

  /**
   * Sauvegarde des données avec cache et notification
   */
  async set(key, value) {
    try {
      await browser.storage.local.set({ [key]: value });
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