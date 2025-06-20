import { messageAnalyzer } from '../modules/analysis/message.js';
import { tagManager } from '../modules/core/tags.js';
import { autoMoveManager } from '../modules/core/autoMove.js';
import { addressBookManager } from '../modules/core/addressBook.js';
import { storage, STORAGE_KEYS } from '../modules/core/storage.js';
import { writeLog } from '../modules/core/logger.js';

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
      writeLog('info', 'taskManager.js', `Exécution de la tâche mail: ${task.type} (${task.id})`);
      await task.handler(task.data);
    } catch (error) {
      console.error(`[Mail Task] Erreur:`, error);
      writeLog('error', 'taskManager.js', `Erreur lors de l'exécution de la tâche mail ${task.id}: ${error.message}`);
    }
  }

  async executeAdminTask(task) {
    try {
      console.log(`[Admin Task] ⚙️ Exécution: ${task.type}`);
      writeLog('info', 'taskManager.js', `Exécution de la tâche admin: ${task.type} (${task.id})`);
      const result = await task.handler(task.data);
      if (task.resolve) task.resolve(result);
    } catch (error) {
      console.error(`[Admin Task] Erreur:`, error);
      writeLog('error', 'taskManager.js', `Erreur lors de l'exécution de la tâche admin ${task.id}: ${error.message}`);
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
    
    // Cache des états des tags pour éviter les lectures répétées
    this.tagStatesCache = null;
    this.tagStatesCacheExpiry = 0;
    this.CACHE_DURATION = 30000;
    
    console.log('[SecMyMail] BackgroundService créé avec TaskManager');
    writeLog('info', 'background.js', 'BackgroundService créé avec TaskManager');
  }

  getTagKey(type, status) {
    return this.TAG_MAPPING[type]?.[status.toString()];
  }

  /**
   * Récupère les états des tags depuis le cache ou le storage
   */
  async getTagStates() {
    const now = Date.now();
    
    // Utiliser le cache si valide
    if (this.tagStatesCache && now < this.tagStatesCacheExpiry) {
      return this.tagStatesCache;
    }
    
    try {
      const result = await storage.get(STORAGE_KEYS.TAG_STATES);
      
      if (result) {
        this.tagStatesCache = result;
        this.tagStatesCacheExpiry = now + this.CACHE_DURATION;
        console.log('[SecMyMail] 📊 États des tags mis en cache');
        writeLog('info', 'background.js', 'États des tags récupérés depuis le storage et mis en cache');
        return this.tagStatesCache;
      } else {
        // Retourner les états par défaut si rien en storage
        const defaultStates = this.getDefaultTagStates();
        this.tagStatesCache = defaultStates;
        this.tagStatesCacheExpiry = now + this.CACHE_DURATION;
        return defaultStates;
      }
    } catch (error) {
      console.error('[SecMyMail] Erreur récupération états des tags:', error);
      writeLog('error', 'background.js', `Erreur lors de la récupération des états des tags: ${error.message}`);
      return this.getDefaultTagStates();
    }
  }

  /**
   * États par défaut des tags
   */
  getDefaultTagStates() {
    return {
      "secmymail.expediteur_malveillant": {
        color: "#FF0000",
        tag: "Expéditeur Malveillant",
        default_color: "#FF0000"
      },
      "secmymail.expediteur_suspect": {
        color: "#FF8C00",
        tag: "Expéditeur Suspect",
        default_color: "#FF8C00"
      },
      "secmymail.expediteur_sur": {
        color: "#32CD32",
        tag: "Expéditeur Sûr",
        default_color: "#32CD32"
      },
      "secmymail.lien_malveillant": {
        color: "#FF0000",
        tag: "Lien Malveillant",
        default_color: "#FF0000"
      },
      "secmymail.lien_suspect": {
        color: "#FF8C00",
        tag: "Lien Suspect",
        default_color: "#FF8C00"
      },
      "secmymail.lien_sur": {
        color: "#32CD32",
        tag: "Lien Sûr",
        default_color: "#32CD32"
      },
      "secmymail.fichier_malveillant": {
        color: "#FF0000",
        tag: "Fichier Malveillant",
        default_color: "#FF0000"
      },
      "secmymail.fichier_suspect": {
        color: "#FF8C00",
        tag: "Fichier Suspect",
        default_color: "#FF8C00"
      },
      "secmymail.fichier_sur": {
        color: "#32CD32",
        tag: "Fichier Sûr",
        default_color: "#32CD32"
      }
    };
  }

  /**
   * Vérifie si un tag est activé
   */
  async isTagEnabled(tagKey) {
    try {
      const tagStates = await this.getTagStates();
      const tagState = tagStates[tagKey];
      
      if (!tagState) {
        console.warn(`[SecMyMail] Tag inconnu: ${tagKey}`);
        return false;
      }
      
      const isEnabled = tagState.active !== false; // Par défaut true si non défini
      console.log(`[SecMyMail] 🏷️ Tag ${tagKey}: ${isEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
      writeLog('info', 'background.js', `Vérification du tag ${tagKey}: ${isEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
      
      return isEnabled;
    } catch (error) {
      console.error(`[SecMyMail] Erreur vérification tag ${tagKey}:`, error);
      writeLog('error', 'background.js', `Erreur lors de la vérification du tag ${tagKey}: ${error.message}`);
      return false; // En cas d'erreur, ne pas appliquer le tag
    }
  }

  /**
   * Invalide le cache des états des tags
   */
  invalidateTagStatesCache() {
    this.tagStatesCache = null;
    this.tagStatesCacheExpiry = 0;
    console.log('[SecMyMail] 🔄 Cache des états des tags invalidé');
    writeLog('info', 'background.js', 'Cache des états des tags invalidé');
  }

  async initialize() {
    if (this.initialized) {
      console.log('[SecMyMail] ⚠️ Service déjà initialisé');
      writeLog('info', 'background.js', 'Service déjà initialisé, aucune action nécessaire');
      return true;
    }

    if (this.initializationPromise) {
      console.log('[SecMyMail] ⏳ Initialisation en cours...');
      writeLog('info', 'background.js', 'Initialisation en cours, attente de la promesse');
      return await this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return await this.initializationPromise;
  }

  async _doInitialize() {
    try {
      console.log('[SecMyMail] 🚀 Initialisation avec TaskManager...');
      writeLog('info', 'background.js', 'Démarrage de l\'initialisation du service');
      
      await this.initializeModules();
      await this.setupMailListener();
      
      try {
        await autoMoveManager.initialize();
        console.log('[SecMyMail] ✅ AutoMoveManager initialisé');
        writeLog('info', 'background.js', 'AutoMoveManager initialisé avec succès');
      } catch (error) {
        console.error('[SecMyMail] ❌ Erreur initialisation AutoMoveManager:', error);
        writeLog('error', 'background.js', `Erreur lors de l'initialisation de AutoMoveManager: ${error.message}`);
      }

      try {
        await addressBookManager.initialize();
        console.log('[SecMyMail] ✅ AddressBookManager initialisé');
        writeLog('info', 'background.js', 'AddressBookManager initialisé avec succès');
      } catch (error) {
        console.error('[SecMyMail] ❌ Erreur initialisation AddressBookManager:', error);
        writeLog('error', 'background.js', `Erreur lors de l'initialisation de AddressBookManager: ${error.message}`);
      }
      
      this.initialized = true;
      console.log('[SecMyMail] ✅ Service initialisé - TaskManager actif');
      writeLog('info', 'background.js', 'Service initialisé avec succès - TaskManager actif');
      return true;
    } catch (error) {
      console.error('[SecMyMail] ❌ Erreur initialisation:', error);
      writeLog('error', 'background.js', `Erreur lors de l'initialisation du service: ${error.message}`);
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
      
      // Pré-charger les états des tags
      await this.getTagStates();
      
      console.log('[SecMyMail] ✓ Modules initialisés');
      writeLog('info', 'background.js', 'Modules initialisés avec succès');
    } catch (error) {
      console.error('[SecMyMail] Erreur initialisation modules:', error);
      writeLog('error', 'background.js', `Erreur lors de l'initialisation des modules: ${error.message}`);
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
        writeLog('info', 'background.js', 'Listener Mail configuré avec succès');
      } else {
        console.warn('[SecMyMail] ⚠️ API onNewMailReceived non disponible');
        writeLog('warning', 'background.js', 'API onNewMailReceived non disponible, listener non configuré');
        this.mailThread.listenerActive = false;
      }
    } catch (error) {
      console.error('[SecMyMail] Erreur setup listener:', error);
      writeLog('error', 'background.js', `Erreur lors de la configuration du listener Mail: ${error.message}`);
      this.mailThread.listenerActive = false;
    }
  }

  async handleNewMailReceived(folder, messageList) {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[Mail Thread] 📧 ${messageList.messages.length} nouveaux mails dans ${folder.name}`);
      writeLog('info', 'background.js', `Nouveaux mails reçus dans ${folder.name}: ${messageList.messages.length} messages`);
      
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
          writeLog('error', 'background.js', `Erreur lors de l'ajout du message ${message.id}: ${error.message}`);
        }
      }
      
      console.log(`[Mail Thread] 📊 ${addedCount} messages ajoutés au TaskManager`);
      writeLog('info', 'background.js', `Ajout de ${addedCount} messages au TaskManager pour traitement`);
      
    } catch (error) {
      console.error('[Mail Thread] Erreur handleNewMailReceived:', error);
      writeLog('error', 'background.js', `Erreur lors du traitement des nouveaux mails: ${error.message}`);
    }
  }

  async processMessage(messageData) {
    try {
      const { messageId, subject, author } = messageData;
      console.log(`[Mail Thread] 📊 Analyse: "${subject}" de ${author}`);
      writeLog('info', 'background.js', `Analyse du message ${messageId} - Sujet: "${subject}" de ${author}`);
      
      const analysis = await this.messageAnalyzer.analyzeMessage(messageId);
      
      console.log(`[Mail Thread] Résultat: E:${analysis.expediteur} L:${analysis.liens} F:${analysis.fichiers}`);
      writeLog('info', 'background.js', `Résultat analyse message ${messageId}: E:${analysis.expediteur} L:${analysis.liens} F:${analysis.fichiers}`);
      
      // Focus sur les liens
      if (analysis.details?.linkDetails?.count > 0) {
        const links = analysis.details.linkDetails.links;
        console.log(`[Mail Thread] 🔗 ${links.length} liens détectés`);
        writeLog('info', 'background.js', `Liens détectés dans le message ${messageId}: ${links.length} liens`);
        
        if (analysis.liens <= 0) {
          console.warn(`[Mail Thread] 🚨 LIENS ${analysis.liens === -1 ? 'MALVEILLANTS' : 'SUSPECTS'} !`);
          writeLog('warning', 'background.js', `Liens ${analysis.liens === -1 ? 'malveillants' : 'suspects'} détectés dans le message ${messageId}`);
        }
      }
      
      await this.applyTagsToMessage(messageId, analysis);
      await this.processMessageAutoMove(messageId, analysis);
      
    } catch (error) {
      console.error(`[Mail Thread] Erreur traitement message:`, error);
      writeLog('error', 'background.js', `Erreur lors du traitement du message ${messageData.messageId}: ${error.message}`);
    }
  }

  /**
   * Fonction pour traiter le déplacement automatique après analyse
   */
  async processMessageAutoMove(messageId, analysis) {
    if (!analysis || !messageId) return;
    
    try {
      console.log(`[Mail Thread] 🔒 Vérification déplacement automatique: ${messageId}`);
      writeLog('info', 'background.js', `Vérification du déplacement automatique pour le message ${messageId}`);
      
      // Vérifier s'il y a des menaces détectées
      if (analysis.expediteur === -1) {
        await autoMoveManager.moveMessageIfNeeded(messageId, 'expediteur_malveillant');
      }
      
      if (analysis.liens === -1) {
        await autoMoveManager.moveMessageIfNeeded(messageId, 'lien_malveillant');
      }
      
      if (analysis.fichiers === -1) {
        await autoMoveManager.moveMessageIfNeeded(messageId, 'fichier_malveillant');
      }
    } catch (error) {
      console.error(`[Mail Thread] Erreur déplacement automatique:`, error);
      writeLog('error', 'background.js', `Erreur lors du traitement du déplacement automatique pour le message ${messageId}: ${error.message}`);
    }
  }

  async applyTagsToMessage(messageId, analysis) {
    try {
      const tagsToApply = [];
      let totalTagsChecked = 0;
      let enabledTagsFound = 0;
      
      // Tag expéditeur
      const expediteurStatus = analysis.expediteur ?? 0;
      const expediteurTagKey = this.getTagKey('expediteur', expediteurStatus);
      
      if (expediteurTagKey) {
        totalTagsChecked++;
        const isEnabled = await this.isTagEnabled(expediteurTagKey);
        
        if (isEnabled) {
          enabledTagsFound++;
          tagsToApply.push({
            key: expediteurTagKey,
            reason: `Expéditeur (${expediteurStatus})`,
            category: 'expediteur'
          });
        } else {
          console.log(`[Mail Thread] 🚫 Tag expéditeur désactivé: ${expediteurTagKey}`);
          writeLog('warning', 'background.js', `Tag expéditeur désactivé: ${expediteurTagKey}`);
        }
      }
      
      // Tag liens
      const liensStatus = analysis.liens ?? 0;
      const liensCount = analysis.details?.linkDetails?.count ?? 0;
      
      if (liensCount > 0) {
        const liensTagKey = this.getTagKey('liens', liensStatus);
        if (liensTagKey) {
          totalTagsChecked++;
          const isEnabled = await this.isTagEnabled(liensTagKey);
          
          if (isEnabled) {
            enabledTagsFound++;
            tagsToApply.push({
              key: liensTagKey,
              reason: `Liens (${liensStatus}, count: ${liensCount})`,
              category: 'liens'
            });
          } else {
            console.log(`[Mail Thread] 🚫 Tag liens désactivé: ${liensTagKey}`);
            writeLog('warning', 'background.js', `Tag liens désactivé: ${liensTagKey}`);
          }
        }
      }
      
      // Tag fichiers
      const fichiersStatus = analysis.fichiers ?? 0;
      const fichiersCount = analysis.details?.attachmentDetails?.count ?? 0;
      
      if (fichiersCount > 0) {
        const fichiersTagKey = this.getTagKey('fichiers', fichiersStatus);
        if (fichiersTagKey) {
          totalTagsChecked++;
          const isEnabled = await this.isTagEnabled(fichiersTagKey);
          
          if (isEnabled) {
            enabledTagsFound++;
            tagsToApply.push({
              key: fichiersTagKey,
              reason: `Fichiers (${fichiersStatus}, count: ${fichiersCount})`,
              category: 'fichiers'
            });
          } else {
            console.log(`[Mail Thread] 🚫 Tag fichiers désactivé: ${fichiersTagKey}`);
            writeLog('warning', 'background.js', `Tag fichiers désactivé: ${fichiersTagKey}`);
          }
        }
      }
      
      console.log(`[Mail Thread] 📊 Vérification tags: ${enabledTagsFound}/${totalTagsChecked} activés`);
      writeLog('info', 'background.js', `Vérification des tags pour le message ${messageId}: ${enabledTagsFound}/${totalTagsChecked} activés`);
      
      // Application des tags activés uniquement
      let successCount = 0;
      for (const tagInfo of tagsToApply) {
        try {
          const success = await this.tagManager.applyTag(messageId, tagInfo.key);
          if (success) {
            successCount++;
            console.log(`[Mail Thread] ✅ Tag appliqué: ${tagInfo.key} (${tagInfo.category})`);
            writeLog('info', 'background.js', `Tag appliqué avec succès: ${tagInfo.key} (${tagInfo.category})`);
          } else {
            console.warn(`[Mail Thread] ⚠️ Échec application tag: ${tagInfo.key}`);
            writeLog('warning', 'background.js', `Échec de l'application du tag: ${tagInfo.key}`);
          }
        } catch (tagError) {
          console.error(`[Mail Thread] Erreur tag ${tagInfo.key}:`, tagError);
          writeLog('error', 'background.js', `Erreur lors de l'application du tag ${tagInfo.key}: ${tagError.message}`);
        }
      }
      
      if (tagsToApply.length === 0) {
        console.log(`[Mail Thread] 🏷️ Aucun tag à appliquer (tous désactivés ou non applicables)`);
        writeLog('info', 'background.js', 'Aucun tag à appliquer (tous désactivés ou non applicables)');
      } else {
        console.log(`[Mail Thread] 📊 Tags appliqués: ${successCount}/${tagsToApply.length} réussis`);
        writeLog('info', 'background.js', `Tags appliqués: ${successCount}/${tagsToApply.length} réussis`);
      }
      
    } catch (error) {
      console.error('[Mail Thread] Erreur application tags:', error);
      writeLog('error', 'background.js', `Erreur lors de l'application des tags: ${error.message}`);
    }
  }

  // ==========================================
  // THREAD ADMIN - Actions administratives
  // ==========================================

  executeAdminAction(action, params) {
    return new Promise((resolve, reject) => {
      this.taskManager.addAdminTask({
        type: action,
        data: { action, ...params },
        handler: this.handleAdminAction.bind(this),
        resolve,
        reject
      });
    });
  }

  async handleAdminAction(data) {
    const { action } = data;
    
    console.log(`[Admin Thread] 🔧 Exécution: ${action}`);
    writeLog('info', 'background.js', `Exécution de l'action admin: ${action}`);
    
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
      
      case 'updateTagStates':
        return await this.updateTagStates(data.data);
      
      case 'updateTagColor':
        return await this.updateTagColor(data.tagKey, data.color, data.oldColor);
      
      case 'getTagStates':
        return await this.getTagStatesForUI();
      
      case 'getLists':
        return await this.getAllLists();

      // ACTIONS DÉPLACEMENT AUTOMATIQUE
      case 'getQuarantineOptions':
        return { success: true, data: autoMoveManager.getOptions() };
      
      case 'updateQuarantineOptions':
        return await autoMoveManager.updateOptions(data.options);
      
      case 'resetQuarantineOptions':
        return await autoMoveManager.reset();
      
      case 'getAvailableFolders':
        return await this.getAvailableFolders();
      
      case 'ping':
        return { status: 'active', timestamp: Date.now() };
      
      case 'getAddressBookSyncState':
        return { success: true, data: addressBookManager.getSyncState() };
      
      case 'syncAddressBook':
        return await addressBookManager.syncAddressBook();
      
      case 'toggleAddressBookSync':
        return await addressBookManager.toggleSync(data.enabled);
      
      default:
        console.warn(`[Admin Thread] Action inconnue: ${action}`);
        return { success: false, error: 'Action inconnue' };
    }
  }

  /**
   * Récupère les dossiers disponibles
   */  
  async getAvailableFolders() {
    try {
      console.log('[Admin Thread] 📁 Récupération dossiers disponibles');
      writeLog('info', 'background.js', 'Récupération des dossiers disponibles');
      
      if (!browser.folders) {
        console.warn('[Admin Thread] API folders non disponible');
        writeLog('warning', 'background.js', 'API folders non disponible, récupération des dossiers impossible');
        return { success: false, error: 'API folders non disponible' };
      }
      
      const accounts = await browser.accounts.list();
      const allFolders = [];
      
      for (const account of accounts) {
        try {
          // Utiliser query au lieu de getSubFolders
          const folders = await browser.folders.query({ accountId: account.id });
          
          // Ajouter chaque dossier à la liste
          folders.forEach(folder => {
            allFolders.push({
              path: folder.path || folder.name,
              name: folder.name,
              type: folder.type,
              accountId: account.id
            });
          });
          
        } catch (accountError) {
          console.warn(`[Admin Thread] Erreur dossiers compte ${account.name}:`, accountError);
          writeLog('warning', 'background.js', `Erreur lors de la récupération des dossiers pour le compte ${account.name}: ${accountError.message}`);
        }
      }
      
      console.log(`[Admin Thread] 📁 ${allFolders.length} dossiers trouvés`);
      writeLog('info', 'background.js', `Dossiers disponibles récupérés: ${allFolders.length} dossiers`);
      return { success: true, folders: allFolders };
      
    } catch (error) {
      console.error('[Admin Thread] Erreur récupération dossiers:', error);
      writeLog('error', 'background.js', `Erreur lors de la récupération des dossiers: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Met à jour les états des tags et synchronise avec Thunderbird
   */
  async updateTagStates(newTagStates) {
    try {
      console.log('[Admin Thread] 🔄 Mise à jour des états des tags');
      writeLog('info', 'background.js', 'Mise à jour des états des tags');
      
      // Sauvegarder dans le storage
      await storage.set(STORAGE_KEYS.TAG_STATES, newTagStates);
      
      // Mettre à jour l'état local
      this.tagStates = { ...newTagStates };
      
      // Invalider le cache
      this.invalidateTagStatesCache();
      
      // Synchroniser les tags avec Thunderbird
      await this.syncTagsWithThunderbird(newTagStates);
      
      console.log('[Admin Thread] ✅ États des tags mis à jour et synchronisés');
      writeLog('info', 'background.js', 'États des tags mis à jour et synchronisés avec Thunderbird');
      return { success: true, synchronized: true };
      
    } catch (error) {
      console.error('[Admin Thread] ❌ Erreur mise à jour états des tags:', error);
      writeLog('error', 'background.js', `Erreur lors de la mise à jour des états des tags: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Synchronise les tags avec Thunderbird (couleurs et états)
   */
  async syncTagsWithThunderbird(tagStates) {
    try {
      console.log('[Admin Thread] 🔄 Synchronisation tags avec Thunderbird');
      writeLog('info', 'background.js', 'Synchronisation des tags avec Thunderbird');
      
      // Vérifier si l'API tags est disponible
      if (!browser.messages || !browser.messages.tags) {
        console.warn('[Admin Thread] ⚠️ API messages.tags non disponible');
        writeLog('warning', 'background.js', 'API messages.tags non disponible, synchronisation impossible');
        return { success: false, error: 'API tags non disponible' };
      }
      
      // Récupérer les tags existants dans Thunderbird
      const existingTags = await browser.messages.tags.list();
      console.log('[Admin Thread] 📋 Tags existants dans Thunderbird:', existingTags.length);
      writeLog('info', 'background.js', `Tags existants dans Thunderbird: ${existingTags.length} tags`);
      
      let updatedCount = 0;
      let createdCount = 0;
      
      // Traiter chaque tag de notre configuration
      for (const [tagKey, tagState] of Object.entries(tagStates)) {
        try {
          // Trouver le tag existant
          const existingTag = existingTags.find(tag => tag.key === tagKey);
          
          if (existingTag) {
            // Mettre à jour le tag existant si la couleur a changé
            if (existingTag.color !== tagState.color) {
              await browser.messages.tags.update(tagKey, {
                color: tagState.color
              });
              console.log(`[Admin Thread] 🎨 Tag mis à jour: ${tagKey} → ${tagState.color}`);
              writeLog('info', 'background.js', `Tag mis à jour: ${tagKey} → ${tagState.color}`);
              updatedCount++;
            } else {
              console.log(`[Admin Thread] 📋 Tag ${tagKey} déjà à jour (${tagState.color})`);
              writeLog('info', 'background.js', `Tag ${tagKey} déjà à jour (${tagState.color})`);
            }
          } else {
            // Créer le tag s'il n'existe pas
            const label = this.getTagLabel(tagKey);
            await browser.messages.tags.create(tagKey, label, tagState.color);
            console.log(`[Admin Thread] ➕ Tag créé: ${tagKey} (${tagState.color})`);
            writeLog('info', 'background.js', `Tag créé: ${tagKey} (${tagState.color})`);
            createdCount++;
          }
          
        } catch (tagError) {
          console.error(`[Admin Thread] ❌ Erreur traitement tag ${tagKey}:`, tagError);
          writeLog('error', 'background.js', `Erreur lors du traitement du tag ${tagKey}: ${tagError.message}`);
        }
      }
      
      console.log(`[Admin Thread] ✅ Synchronisation terminée: ${updatedCount} mis à jour, ${createdCount} créés`);
      writeLog('info', 'background.js', `Synchronisation des tags terminée: ${updatedCount} mis à jour, ${createdCount} créés`);
      return { 
        success: true, 
        updated: updatedCount, 
        created: createdCount 
      };
      
    } catch (error) {
      console.error('[Admin Thread] ❌ Erreur synchronisation Thunderbird:', error);
      writeLog('error', 'background.js', `Erreur lors de la synchronisation des tags avec Thunderbird: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Met à jour la couleur d'un tag spécifique
   */
  async updateTagColor(tagKey, newColor, oldColor = null) {
    try {
      console.log(`[Admin Thread] 🎨 Mise à jour couleur tag: ${tagKey} → ${newColor}`);
      writeLog('info', 'background.js', `Mise à jour de la couleur du tag ${tagKey} vers ${newColor}`);
      
      // Vérifier si le tag existe dans notre configuration
      if (!this.tagStates[tagKey]) {
        return { success: false, error: `Tag ${tagKey} non trouvé` };
      }
      
      // Utiliser l'API Thunderbird directement
      if (browser.messages && browser.messages.tags) {
        const existingTags = await browser.messages.tags.list();
        const existingTag = existingTags.find(tag => tag.key === tagKey);
        
        if (existingTag) {
          // Mettre à jour le tag existant - CORRECTION: seulement la couleur
          await browser.messages.tags.update(tagKey, {
            color: newColor
          });
          console.log(`[Admin Thread] ✅ Couleur tag mise à jour dans Thunderbird: ${tagKey} → ${newColor}`);
          writeLog('info', 'background.js', `Couleur du tag ${tagKey} mise à jour vers ${newColor}`);
        } else {
          // Créer le tag s'il n'existe pas
          const label = this.getTagLabel(tagKey);
          await browser.messages.tags.create(tagKey, label, newColor);
          console.log(`[Admin Thread] ✅ Tag créé dans Thunderbird: ${tagKey} (${label}, ${newColor})`);
          writeLog('info', 'background.js', `Tag ${tagKey} créé dans Thunderbird (${label}, ${newColor})`);
        }
        
        return { 
          success: true, 
          tagKey: tagKey, 
          newColor: newColor, 
          oldColor: oldColor,
          applied: true
        };
      } else {
        console.warn('[Admin Thread] ⚠️ API messages.tags non disponible');
        writeLog('warning', 'background.js', 'API messages.tags non disponible, mise à jour couleur impossible');
        return { 
          success: true, 
          warning: 'API tags non disponible',
          tagKey: tagKey, 
          newColor: newColor 
        };
      }
      
    } catch (error) {
      console.error(`[Admin Thread] ❌ Erreur mise à jour couleur tag ${tagKey}:`, error);
      writeLog('error', 'background.js', `Erreur lors de la mise à jour de la couleur du tag ${tagKey}: ${error.message}`);
      return { 
        success: false, 
        error: error.message, 
        tagKey: tagKey 
      };
    }
  }

  /**
   * Obtient le label d'un tag à partir de sa clé
   */
  getTagLabel(tagKey) {
    const labels = {
      'secmymail.expediteur_malveillant': 'SecMyMail: Expéditeur Malveillant',
      'secmymail.expediteur_suspect': 'SecMyMail: Expéditeur Suspect',
      'secmymail.expediteur_sur': 'SecMyMail: Expéditeur Sûr',
      'secmymail.lien_malveillant': 'SecMyMail: Lien Malveillant',
      'secmymail.lien_suspect': 'SecMyMail: Lien Suspect',
      'secmymail.lien_sur': 'SecMyMail: Lien Sûr',
      'secmymail.fichier_malveillant': 'SecMyMail: Fichier Malveillant',
      'secmymail.fichier_suspect': 'SecMyMail: Fichier Suspect',
      'secmymail.fichier_sur': 'SecMyMail: Fichier Sûr'
    };
    
    return labels[tagKey] || `SecMyMail: ${tagKey}`;
  }
  
  /**
   * Récupère les états des tags pour l'UI
   */
  async getTagStatesForUI() {
    try {
      const tagStates = await this.getTagStates();
      return { success: true, data: tagStates };
    } catch (error) {
      console.error('[Admin Thread] Erreur récupération états des tags:', error);
      writeLog('error', 'background.js', `Erreur lors de la récupération des états des tags: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // MÉTHODES UTILITAIRES
  // ==========================================

  async addToList(listType, type, value) {
    try {
      const storageKey = `${type}${listType.charAt(0).toUpperCase() + listType.slice(1)}`;
      const mapKey = {
        'emailWhitelist': STORAGE_KEYS.EMAIL_WHITELIST,
        'emailBlacklist': STORAGE_KEYS.EMAIL_BLACKLIST,
        'domainWhitelist': STORAGE_KEYS.DOMAIN_WHITELIST,
        'domainBlacklist': STORAGE_KEYS.DOMAIN_BLACKLIST
      }[storageKey];
      
      const currentList = await storage.get(mapKey, []);
      
      if (!currentList.includes(value)) {
        currentList.push(value);
        await storage.set(mapKey, currentList);
        
        console.log(`[Admin Thread] ✅ Ajouté à ${storageKey}: ${value}`);
        writeLog('info', 'background.js', `Ajouté à ${storageKey}: ${value}`);
        return { success: true, added: value, listSize: currentList.length };
      } else {
        return { success: false, error: 'Déjà présent', listSize: currentList.length };
      }
      
    } catch (error) {
      console.error(`[Admin Thread] Erreur ajout à la liste:`, error);
      writeLog('error', 'background.js', `Erreur lors de l'ajout à la liste ${storageKey}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async removeFromList(listType, type, value) {
    try {
      const storageKey = `${type}${listType.charAt(0).toUpperCase() + listType.slice(1)}`;
      const mapKey = {
        'emailWhitelist': STORAGE_KEYS.EMAIL_WHITELIST,
        'emailBlacklist': STORAGE_KEYS.EMAIL_BLACKLIST,
        'domainWhitelist': STORAGE_KEYS.DOMAIN_WHITELIST,
        'domainBlacklist': STORAGE_KEYS.DOMAIN_BLACKLIST
      }[storageKey];
      
      const currentList = await storage.get(mapKey, []);
      
      const index = currentList.indexOf(value);
      if (index > -1) {
        currentList.splice(index, 1);
        await storage.set(mapKey, currentList);
        
        console.log(`[Admin Thread] ✅ Supprimé de ${storageKey}: ${value}`);
        writeLog('info', 'background.js', `Supprimé de ${storageKey}: ${value}`);
        return { success: true, removed: value, listSize: currentList.length };
      } else {
        return { success: false, error: 'Non trouvé', listSize: currentList.length };
      }
      
    } catch (error) {
      console.error(`[Admin Thread] Erreur suppression de la liste:`, error);
      writeLog('error', 'background.js', `Erreur lors de la suppression de la liste ${storageKey}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async updateConfig(newConfig) {
    try {
      await storage.set('appConfig', newConfig);
      
      if (newConfig.processingDelay) {
        this.processingConfig.processingDelay = newConfig.processingDelay;
      }
      if (newConfig.maxQueueSize) {
        this.processingConfig.maxQueueSize = newConfig.maxQueueSize;
      }
      
      console.log(`[Admin Thread] ✅ Configuration mise à jour`);
      writeLog('info', 'background.js', 'Configuration mise à jour avec succès');
      return { success: true, config: newConfig };
      
    } catch (error) {
      console.error(`[Admin Thread] Erreur config:`, error);
      writeLog('error', 'background.js', `Erreur lors de la mise à jour de la configuration: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getAllLists() {
    try {
      const keys = [
        STORAGE_KEYS.EMAIL_WHITELIST,
        STORAGE_KEYS.EMAIL_BLACKLIST,
        STORAGE_KEYS.DOMAIN_WHITELIST,
        STORAGE_KEYS.DOMAIN_BLACKLIST
      ];
      
      const results = await Promise.all(keys.map(key => storage.get(key, [])));
      
      const lists = {
        emailWhitelist: results[0],
        emailBlacklist: results[1],
        domainWhitelist: results[2],
        domainBlacklist: results[3]
      };
      
      console.log(`[Admin Thread] 📋 Listes récupérées:`, {
        emailWhitelist: lists.emailWhitelist.length,
        emailBlacklist: lists.emailBlacklist.length,
        domainWhitelist: lists.domainWhitelist.length,
        domainBlacklist: lists.domainBlacklist.length
      });

      writeLog('info', 'background.js', `Listes récupérées: ${JSON.stringify({
        emailWhitelist: lists.emailWhitelist.length,
        emailBlacklist: lists.emailBlacklist.length,
        domainWhitelist: lists.domainWhitelist.length,
        domainBlacklist: lists.domainBlacklist.length
      })}`);
      
      return { success: true, lists };
      
    } catch (error) {
      console.error(`[Admin Thread] Erreur récupération listes:`, error);
      writeLog('error', 'background.js', `Erreur lors de la récupération des listes: ${error.message}`);
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
        writeLog('info', 'background.js', `Message UI reçu: ${message.action}`);
        
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
              const result = await this.executeAdminAction(message.action, message);
              resolve(result);
            } catch (error) {
              console.error(`[SecMyMail] Erreur action ${message.action}:`, error);
              writeLog('error', 'background.js', `Erreur lors de l'exécution de l'action ${message.action}: ${error.message}`);
              resolve({ success: false, error: error.message });
            }
        }
      } catch (error) {
        console.error(`[SecMyMail] Erreur handleUIMessage:`, error);
        writeLog('error', 'background.js', `Erreur lors du traitement du message UI: ${error.message}`);
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
    writeLog('error', 'background.js', `Erreur lors de la communication avec l'UI: ${error.message}`);
    return Promise.resolve({ success: false, error: error.message });
  }
});

// === GESTION ÉVÉNEMENTS ===
browser.runtime.onInstalled.addListener(async (details) => {
  console.log(`[SecMyMail] Extension ${details.reason}`);
  writeLog('info', 'background.js', `Extension installée: ${details.reason}`);
  const success = await backgroundService.initialize();
  if (success) {
    console.log('[SecMyMail] 🎯 Extension prête - TaskManager actif');
    writeLog('info', 'background.js', 'Extension prête - TaskManager actif');
  }
});

browser.runtime.onStartup.addListener(async () => {
  console.log('[SecMyMail] 🌅 Démarrage Thunderbird');
  writeLog('info', 'background.js', 'Démarrage Thunderbird');
  await backgroundService.initialize();
});

// === DÉMARRAGE IMMÉDIAT ===
console.log('[SecMyMail] 🔥 Service Worker chargé - Version TaskManager');


(async () => {
  try {
    const success = await backgroundService.initialize();
    if (success) {
      console.log('[SecMyMail] 💚 Service prêt - Threading simulé actif');
      writeLog('info', 'background.js', 'Service prêt - Threading simulé actif');
    }
  } catch (error) {
    console.error('[SecMyMail] Erreur démarrage:', error);
    writeLog('error', 'background.js', `Erreur lors du démarrage du service: ${error.message}`);
  }
})();

// === FONCTIONS GLOBALES ===
globalThis.backgroundService = backgroundService;

// === MONITORING ===
setInterval(() => {
  const status = backgroundService.taskManager.getStatus();
  if (status.mailTasks > 0 || status.adminTasks > 0) {
    console.log(`[SecMyMail] 💓 Mail Tasks: ${status.mailTasks} | Admin Tasks: ${status.adminTasks} | Processing: M:${status.isMailProcessing} A:${status.isAdminProcessing}`);
    writeLog('info', 'background.js', `Statut des tâches: Mail Tasks: ${status.mailTasks}, Admin Tasks: ${status.adminTasks}, Processing: M:${status.isMailProcessing} A:${status.isAdminProcessing}`);
  }
}, 600);

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { backgroundService };
} 