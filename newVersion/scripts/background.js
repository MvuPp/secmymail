/**
 * Service Worker Background - SecMyMail Extension for Thunderbird
 * Version avec multithreading simulé - Threading natif compatible
 */

import { messageAnalyzer } from '../modules/analysis/message.js';
import { tagManager } from '../modules/core/tags.js';

/**
 * Gestionnaire de tâches asynchrones simulant le multithreading
 */
class TaskManager {
  constructor() {
    this.mailTasks = [];
    this.adminTasks = [];
    this.isMailProcessing = false;
    this.isAdminProcessing = false;
    this.taskId = 0;
  }

  // Ajouter une tâche mail
  addMailTask(task) {
    const taskWithId = { ...task, id: ++this.taskId, timestamp: Date.now() };
    this.mailTasks.push(taskWithId);
    this.scheduleMailProcessing();
    return taskWithId.id;
  }

  // Ajouter une tâche admin
  addAdminTask(task) {
    const taskWithId = { ...task, id: ++this.taskId, timestamp: Date.now() };
    this.adminTasks.push(taskWithId);
    this.scheduleAdminProcessing();
    return taskWithId.id;
  }

  // Traitement mail asynchrone
  async scheduleMailProcessing() {
    if (this.isMailProcessing || this.mailTasks.length === 0) return;
    
    this.isMailProcessing = true;
    
    // Traitement en micro-tâches pour éviter le blocage
    await new Promise(resolve => setTimeout(resolve, 0));
    
    try {
      while (this.mailTasks.length > 0) {
        const task = this.mailTasks.shift();
        await this.executeMailTask(task);
        
        // Yield control périodiquement
        if (this.mailTasks.length % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    } finally {
      this.isMailProcessing = false;
    }
  }

  // Traitement admin asynchrone
  async scheduleAdminProcessing() {
    if (this.isAdminProcessing || this.adminTasks.length === 0) return;
    
    this.isAdminProcessing = true;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    try {
      while (this.adminTasks.length > 0) {
        const task = this.adminTasks.shift();
        await this.executeAdminTask(task);
        
        // Les tâches admin sont plus rapides
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    } finally {
      this.isAdminProcessing = false;
    }
  }

  async executeMailTask(task) {
    try {
      console.log(`[Mail Task] 📧 Exécution: ${task.type}`);
      await task.handler(task.data);
    } catch (error) {
      console.error(`[Mail Task] Erreur:`, error);
    }
  }

  async executeAdminTask(task) {
    try {
      console.log(`[Admin Task] ⚙️ Exécution: ${task.type}`);
      const result = await task.handler(task.data);
      if (task.resolve) task.resolve(result);
    } catch (error) {
      console.error(`[Admin Task] Erreur:`, error);
      if (task.reject) task.reject(error);
    }
  }

  getStatus() {
    return {
      mailTasks: this.mailTasks.length,
      adminTasks: this.adminTasks.length,
      isMailProcessing: this.isMailProcessing,
      isAdminProcessing: this.isAdminProcessing
    };
  }
}

class BackgroundService {
  constructor() {
    // Gestionnaire de tâches multi-thread simulé
    this.taskManager = new TaskManager();
    
    // Threading séparé pour Mail et Admin
    this.mailThread = {
      messageQueue: [],
      processedMessages: new Set(),
      listenerActive: false
    };
    
    this.adminThread = {
      pendingActions: new Map()
    };
    
    this.initialized = false;
    this.initializationPromise = null;
    
    this.messageAnalyzer = messageAnalyzer;
    this.tagManager = tagManager;
    
    // Configuration
    this.processingConfig = {
      maxQueueSize: 100,
      processingDelay: 500,
      batchSize: 5,
      retryAttempts: 3,
      retryDelay: 2000
    };
    
    // Mapping des statuts vers les clés de tags
    this.TAG_MAPPING = {
      expediteur: {
        '-1': 'secmymail.expediteur_malveillant',
        '0': 'secmymail.expediteur_suspect',
        '1': 'secmymail.expediteur_sur'
      },
      liens: {
        '-1': 'secmymail.lien_malveillant',
        '0': 'secmymail.lien_suspect',
        '1': 'secmymail.lien_sur'
      },
      fichiers: {
        '-1': 'secmymail.fichier_malveillant',
        '0': 'secmymail.fichier_suspect',
        '1': 'secmymail.fichier_sur'
      }
    };
    
    console.log('[SecMyMail] BackgroundService créé avec TaskManager');
  }

  getTagKey(type, status) {
    return this.TAG_MAPPING[type]?.[status.toString()];
  }

  async initialize() {
    if (this.initialized) {
      console.log('[SecMyMail] ⚠️ Service déjà initialisé');
      return true;
    }

    if (this.initializationPromise) {
      console.log('[SecMyMail] ⏳ Initialisation en cours...');
      return await this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return await this.initializationPromise;
  }

  async _doInitialize() {
    try {
      console.log('[SecMyMail] 🚀 Initialisation avec TaskManager...');
      
      await this.initializeModules();
      await this.setupMailListener();
      
      this.initialized = true;
      console.log('[SecMyMail] ✅ Service initialisé - TaskManager actif');
      return true;
    } catch (error) {
      console.error('[SecMyMail] ❌ Erreur initialisation:', error);
      this.initializationPromise = null;
      return false;
    }
  }

  async initializeModules() {
    try {
      console.log('[SecMyMail] Initialisation des modules...');
      
      if (!this.tagManager.initialized) {
        await this.tagManager.initialize();
      }
      
      console.log('[SecMyMail] ✓ Modules initialisés');
    } catch (error) {
      console.error('[SecMyMail] Erreur initialisation modules:', error);
      throw error;
    }
  }

  // ==========================================
  // THREAD MAIL - Gestion des nouveaux mails
  // ==========================================

  async setupMailListener() {
    try {
      console.log('[SecMyMail] 📧 Configuration listener Mail...');
      
      // Nettoyer ancien listener
      if (this.mailThread.listenerActive && this.onNewMailHandler) {
        try {
          browser.messages.onNewMailReceived.removeListener(this.onNewMailHandler);
        } catch (error) {
          // Ignorer les erreurs de nettoyage
        }
      }
      
      // Configurer nouveau listener
      if (browser.messages && browser.messages.onNewMailReceived) {
        this.onNewMailHandler = this.handleNewMailReceived.bind(this);
        browser.messages.onNewMailReceived.addListener(this.onNewMailHandler);
        this.mailThread.listenerActive = true;
        
        console.log('[SecMyMail] ✅ Listener Mail configuré');
      } else {
        console.warn('[SecMyMail] ⚠️ API onNewMailReceived non disponible');
        this.mailThread.listenerActive = false;
      }
    } catch (error) {
      console.error('[SecMyMail] Erreur setup listener:', error);
      this.mailThread.listenerActive = false;
    }
  }

  async handleNewMailReceived(folder, messageList) {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[Mail Thread] 📧 ${messageList.messages.length} nouveaux mails dans ${folder.name}`);
      
      let addedCount = 0;
      
      for (const message of messageList.messages) {
        try {
          // Vérifications rapides
          if (this.mailThread.processedMessages.has(message.id)) {
            continue;
          }

          if (this.mailThread.messageQueue.some(item => item.messageId === message.id)) {
            continue;
          }

          // Vérification des tags existants
          try {
            const messageInfo = await browser.messages.get(message.id);
            const hasSecMyMailTags = messageInfo.tags?.some(tag => 
              typeof tag === 'string' && tag.startsWith('secmymail.')
            );
            
            if (hasSecMyMailTags) {
              this.mailThread.processedMessages.add(message.id);
              continue;
            }
          } catch (messageError) {
            // Continuer même si la vérification échoue
          }

          // Ajouter à la tâche mail via TaskManager
          this.taskManager.addMailTask({
            type: 'processMessage',
            data: {
              messageId: message.id,
              folder: folder.name,
              subject: message.subject,
              author: message.author,
              timestamp: timestamp
            },
            handler: this.processMessage.bind(this)
          });
          
          this.mailThread.processedMessages.add(message.id);
          addedCount++;
          
        } catch (error) {
          console.error(`[Mail Thread] Erreur ajout message ${message.id}:`, error);
        }
      }
      
      console.log(`[Mail Thread] 📊 ${addedCount} messages ajoutés au TaskManager`);
      
    } catch (error) {
      console.error('[Mail Thread] Erreur handleNewMailReceived:', error);
    }
  }

  async processMessage(messageData) {
    try {
      const { messageId, subject, author } = messageData;
      console.log(`[Mail Thread] 📊 Analyse: "${subject}" de ${author}`);
      
      const analysis = await this.messageAnalyzer.analyzeMessage(messageId);
      
      console.log(`[Mail Thread] Résultat: E:${analysis.expediteur} L:${analysis.liens} F:${analysis.fichiers}`);
      
      // Focus sur les liens
      if (analysis.details?.linkDetails?.count > 0) {
        const links = analysis.details.linkDetails.links;
        console.log(`[Mail Thread] 🔗 ${links.length} liens détectés`);
        
        if (analysis.liens <= 0) {
          console.warn(`[Mail Thread] 🚨 LIENS ${analysis.liens === -1 ? 'MALVEILLANTS' : 'SUSPECTS'} !`);
        }
      }
      
      await this.applyTagsToMessage(messageId, analysis);
      
    } catch (error) {
      console.error(`[Mail Thread] Erreur traitement message:`, error);
    }
  }

  async applyTagsToMessage(messageId, analysis) {
    try {
      const tagsToApply = [];
      
      // Tag expéditeur
      const expediteurStatus = analysis.expediteur ?? 0;
      const expediteurTagKey = this.getTagKey('expediteur', expediteurStatus);
      
      if (expediteurTagKey && this.tagManager.isTagEnabled(expediteurTagKey)) {
        tagsToApply.push({
          key: expediteurTagKey,
          reason: `Expéditeur (${expediteurStatus})`
        });
      }
      
      // Tag liens
      const liensStatus = analysis.liens ?? 0;
      const liensCount = analysis.details?.linkDetails?.count ?? 0;
      
      if (liensCount > 0) {
        const liensTagKey = this.getTagKey('liens', liensStatus);
        if (liensTagKey && this.tagManager.isTagEnabled(liensTagKey)) {
          tagsToApply.push({
            key: liensTagKey,
            reason: `Liens (${liensStatus}, count: ${liensCount})`
          });
        }
      }
      
      // Tag fichiers
      const fichiersStatus = analysis.fichiers ?? 0;
      const fichiersCount = analysis.details?.attachmentDetails?.count ?? 0;
      
      if (fichiersCount > 0) {
        const fichiersTagKey = this.getTagKey('fichiers', fichiersStatus);
        if (fichiersTagKey && this.tagManager.isTagEnabled(fichiersTagKey)) {
          tagsToApply.push({
            key: fichiersTagKey,
            reason: `Fichiers (${fichiersStatus}, count: ${fichiersCount})`
          });
        }
      }
      
      // Application des tags
      let successCount = 0;
      for (const { key: tagKey } of tagsToApply) {
        try {
          const success = await this.tagManager.applyTag(messageId, tagKey);
          if (success) successCount++;
        } catch (tagError) {
          console.error(`[Mail Thread] Erreur tag ${tagKey}:`, tagError);
        }
      }
      
      console.log(`[Mail Thread] 📊 Tags: ${successCount}/${tagsToApply.length} appliqués`);
      
    } catch (error) {
      console.error('[Mail Thread] Erreur application tags:', error);
    }
  }

  // ==========================================
  // THREAD ADMIN - Actions administratives
  // ==========================================

  executeAdminAction(action, params) {
    return new Promise((resolve, reject) => {
      this.taskManager.addAdminTask({
        type: action,
        data: { action, ...params }, // CORRECTION: Passer action et params correctement
        handler: this.handleAdminAction.bind(this),
        resolve,
        reject
      });
    });
  }

  async handleAdminAction(data) {
    const { action } = data;
    
    console.log(`[Admin Thread] 🔧 Exécution: ${action}`);
    
    switch (action) {
      case 'addToWhitelist':
        return await this.addToList('whitelist', data.type, data.value);
      
      case 'addToBlacklist':
        return await this.addToList('blacklist', data.type, data.value);
      
      case 'removeFromList':
        return await this.removeFromList(data.listType, data.type, data.value);
      
      case 'updateConfig':
        return await this.updateConfig(data.config);
      
      case 'toggleTag':
        return await this.tagManager.toggleTag(data.tagKey);
      
      case 'getLists':
        return await this.getAllLists();
      
      default:
        console.warn(`[Admin Thread] Action inconnue: ${action}`);
        return { success: false, error: 'Action inconnue' };
    }
  }

  // ==========================================
  // MÉTHODES UTILITAIRES
  // ==========================================

  async addToList(listType, type, value) {
    try {
      const storageKey = `${type}${listType.charAt(0).toUpperCase() + listType.slice(1)}`;
      const stored = await browser.storage.local.get([storageKey]);
      const currentList = stored[storageKey] || [];
      
      if (!currentList.includes(value)) {
        currentList.push(value);
        await browser.storage.local.set({ [storageKey]: currentList });
        
        console.log(`[Admin Thread] ✅ Ajouté à ${storageKey}: ${value}`);
        return { success: true, added: value, listSize: currentList.length };
      } else {
        return { success: false, error: 'Déjà présent', listSize: currentList.length };
      }
      
    } catch (error) {
      console.error(`[Admin Thread] Erreur ajout à la liste:`, error);
      return { success: false, error: error.message };
    }
  }

  async removeFromList(listType, type, value) {
    try {
      const storageKey = `${type}${listType.charAt(0).toUpperCase() + listType.slice(1)}`;
      const stored = await browser.storage.local.get([storageKey]);
      const currentList = stored[storageKey] || [];
      
      const index = currentList.indexOf(value);
      if (index > -1) {
        currentList.splice(index, 1);
        await browser.storage.local.set({ [storageKey]: currentList });
        
        console.log(`[Admin Thread] ✅ Supprimé de ${storageKey}: ${value}`);
        return { success: true, removed: value, listSize: currentList.length };
      } else {
        return { success: false, error: 'Non trouvé', listSize: currentList.length };
      }
      
    } catch (error) {
      console.error(`[Admin Thread] Erreur suppression de la liste:`, error);
      return { success: false, error: error.message };
    }
  }

  async updateConfig(newConfig) {
    try {
      await browser.storage.local.set(newConfig);
      
      if (newConfig.processingDelay) {
        this.processingConfig.processingDelay = newConfig.processingDelay;
      }
      if (newConfig.maxQueueSize) {
        this.processingConfig.maxQueueSize = newConfig.maxQueueSize;
      }
      
      console.log(`[Admin Thread] ✅ Configuration mise à jour`);
      return { success: true, config: newConfig };
      
    } catch (error) {
      console.error(`[Admin Thread] Erreur config:`, error);
      return { success: false, error: error.message };
    }
  }

  async getAllLists() {
    try {
      const keys = [
        'emailWhitelist', 'emailBlacklist',
        'domainWhitelist', 'domainBlacklist'
      ];
      
      const stored = await browser.storage.local.get(keys);
      
      const lists = {
        emailWhitelist: stored.emailWhitelist || [],
        emailBlacklist: stored.emailBlacklist || [],
        domainWhitelist: stored.domainWhitelist || [],
        domainBlacklist: stored.domainBlacklist || []
      };
      
      console.log(`[Admin Thread] 📋 Listes récupérées:`, {
        emailWhitelist: lists.emailWhitelist.length,
        emailBlacklist: lists.emailBlacklist.length,
        domainWhitelist: lists.domainWhitelist.length,
        domainBlacklist: lists.domainBlacklist.length
      });
      
      return { success: true, lists };
      
    } catch (error) {
      console.error(`[Admin Thread] Erreur récupération listes:`, error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // COMMUNICATION AVEC L'UI
  // ==========================================

  handleUIMessage(message) {
    return new Promise(async (resolve) => {
      try {
        console.log(`[SecMyMail] 📨 Message UI reçu:`, message.action);
        
        switch (message.action) {
          case 'getStats':
            const taskStatus = this.taskManager.getStatus();
            const stats = {
              mailQueue: taskStatus.mailTasks,
              adminQueue: taskStatus.adminTasks,
              mailProcessing: taskStatus.isMailProcessing,
              adminProcessing: taskStatus.isAdminProcessing,
              listenerActive: this.mailThread.listenerActive,
              initialized: this.initialized
            };
            resolve(stats);
            break;
          
          case 'ping':
            resolve({ 
              status: 'active',
              initialized: this.initialized,
              listenerActive: this.mailThread.listenerActive,
              timestamp: new Date().toISOString()
            });
            break;
          
          // Actions administratives via TaskManager
          default:
            try {
              // CORRECTION: Passer l'action et tous les paramètres du message
              const result = await this.executeAdminAction(message.action, message);
              resolve(result);
            } catch (error) {
              console.error(`[SecMyMail] Erreur action ${message.action}:`, error);
              resolve({ success: false, error: error.message });
            }
        }
      } catch (error) {
        console.error(`[SecMyMail] Erreur handleUIMessage:`, error);
        resolve({ success: false, error: error.message });
      }
    });
  }
}

// === INSTANCE GLOBALE UNIQUE ===
const backgroundService = new BackgroundService();

// === COMMUNICATION UI ===
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    const result = await backgroundService.handleUIMessage(message);
    return Promise.resolve(result);
  } catch (error) {
    console.error('[SecMyMail] Erreur communication UI:', error);
    return Promise.resolve({ success: false, error: error.message });
  }
});

// === GESTION ÉVÉNEMENTS ===
browser.runtime.onInstalled.addListener(async (details) => {
  console.log(`[SecMyMail] Extension ${details.reason}`);
  const success = await backgroundService.initialize();
  if (success) {
    console.log('[SecMyMail] 🎯 Extension prête - TaskManager actif');
  }
});

browser.runtime.onStartup.addListener(async () => {
  console.log('[SecMyMail] 🌅 Démarrage Thunderbird');
  await backgroundService.initialize();
});

// === DÉMARRAGE IMMÉDIAT ===
console.log('[SecMyMail] 🔥 Service Worker chargé - Version TaskManager');

(async () => {
  try {
    const success = await backgroundService.initialize();
    if (success) {
      console.log('[SecMyMail] 💚 Service prêt - Threading simulé actif');
    }
  } catch (error) {
    console.error('[SecMyMail] Erreur démarrage:', error);
  }
})();

// === FONCTIONS GLOBALES ===
globalThis.backgroundService = backgroundService;

// === MONITORING ===
setInterval(() => {
  const status = backgroundService.taskManager.getStatus();
  if (status.mailTasks > 0 || status.adminTasks > 0) {
    console.log(`[SecMyMail] 💓 Mail Tasks: ${status.mailTasks} | Admin Tasks: ${status.adminTasks} | Processing: M:${status.isMailProcessing} A:${status.isAdminProcessing}`);
  }
}, 60000);

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { backgroundService };
}