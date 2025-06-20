import { fileURLToPath } from 'url';
import path from 'path';
import assert from 'assert';

// Obtenir le répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simuler le stockage local
let mockStorageData = {
  autoMoveOptions: {
    enabled: true,
    folder: 'INBOX/SecMyMail-Quarantine',
    quarantineExpediteursmalveillants: true,
    quarantineLiensMalveillants: true,
    quarantineFichiersMalveillants: false
  },
  autoMoveStats: {
    totalQuarantined: 42
  }
};

// Simuler les dossiers de messagerie
const mockFolders = [
  { id: 'folder1', name: 'INBOX', path: 'INBOX', accountId: 'account1' },
  { id: 'folder2', name: 'SecMyMail-Quarantine', path: 'INBOX/SecMyMail-Quarantine', accountId: 'account1' },
  { id: 'folder3', name: 'Junk', path: 'Junk', accountId: 'account1' }
];

// Simuler l'environnement du navigateur
globalThis.browser = {
  storage: {
    local: {
      get: async (key) => {
        const result = {};
        if (typeof key === 'string') {
          if (mockStorageData[key] !== undefined) {
            result[key] = JSON.parse(JSON.stringify(mockStorageData[key]));
          }
        } else if (Array.isArray(key)) {
          key.forEach(k => {
            if (mockStorageData[k] !== undefined) {
              result[k] = JSON.parse(JSON.stringify(mockStorageData[k]));
            }
          });
        } else {
          // Si aucune clé n'est spécifiée, retourner tout
          Object.keys(mockStorageData).forEach(k => {
            result[k] = JSON.parse(JSON.stringify(mockStorageData[k]));
          });
        }
        return result;
      },
      set: async (data) => {
        // Mettre à jour notre stockage simulé
        Object.keys(data).forEach(key => {
          mockStorageData[key] = JSON.parse(JSON.stringify(data[key]));
        });
        return {};
      }
    }
  },
  folders: {
    query: async (criteria) => {
      return mockFolders.filter(folder => folder.accountId === criteria.accountId);
    },
    create: async (accountId, folderName) => {
      const newFolder = {
        id: `folder${mockFolders.length + 1}`,
        name: folderName,
        path: `INBOX/${folderName}`,
        accountId
      };
      mockFolders.push(newFolder);
      return newFolder;
    }
  },
  messages: {
    get: async (messageId) => {
      return {
        id: messageId,
        subject: 'Test Message',
        folder: {
          accountId: 'account1',
          path: 'INBOX'
        }
      };
    },
    move: async (messageIds, folderId) => {
      // Simuler le déplacement en retournant un succès
      return true;
    }
  }
};

// Classe AutoMoveManager pour les tests
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
      return true;
    } catch (error) {
      console.error('[AutoMoveManager] Erreur initialisation:', error);
      return false;
    }
  }

  /**
   * Charge les options depuis le stockage
   */
  async loadOptions() {
    try {
      const savedOptions = await browser.storage.local.get('autoMoveOptions');
      if (savedOptions && savedOptions.autoMoveOptions) {
        this.options = { ...this.options, ...savedOptions.autoMoveOptions };
        return true;
      } else {
        await browser.storage.local.set({ autoMoveOptions: this.options });
        return false;
      }
    } catch (error) {
      console.error('[AutoMoveManager] Erreur chargement options:', error);
      return false;
    }
  }

  /**
   * Charge les statistiques depuis le stockage
   */
  async loadStats() {
    try {
      const savedStats = await browser.storage.local.get('autoMoveStats');
      if (savedStats && savedStats.autoMoveStats) {
        this.stats = { ...this.stats, ...savedStats.autoMoveStats };
        return true;
      } else {
        await browser.storage.local.set({ autoMoveStats: this.stats });
        return false;
      }
    } catch (error) {
      console.error('[AutoMoveManager] Erreur chargement statistiques:', error);
      return false;
    }
  }

  /**
   * Met à jour les options
   */
  async updateOptions(newOptions) {
    try {
      this.options = { ...this.options, ...newOptions };
      await browser.storage.local.set({ autoMoveOptions: this.options });
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
      await browser.storage.local.set({ autoMoveStats: this.stats });
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
    
    await browser.storage.local.set({ autoMoveOptions: this.options });
    await browser.storage.local.set({ autoMoveStats: this.stats });
    
    console.log('[AutoMoveManager] Options et statistiques réinitialisées');
    return { success: true };
  }
}

// Classe AutoMoveTest pour tester AutoMoveManager
class AutoMoveTest {
  constructor() {
    this.autoMoveManager = new AutoMoveManager();
  }

  async runTests() {
    let passedTests = 0;
    let failedTests = 0;
    
    const test = async (name, fn) => {
      try {
        await fn();
        console.log(`✅ PASS: ${name}`);
        passedTests++;
      } catch (error) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Error: ${error.message}`);
        failedTests++;
      }
    };

    // Réinitialiser l'état de test pour chaque test
    const resetTestState = () => {
      // Réinitialiser le mockStorageData
      mockStorageData = {
        autoMoveOptions: {
          enabled: true,
          folder: 'INBOX/SecMyMail-Quarantine',
          quarantineExpediteursmalveillants: true,
          quarantineLiensMalveillants: true,
          quarantineFichiersMalveillants: false
        },
        autoMoveStats: {
          totalQuarantined: 42
        }
      };
      
      // Créer une nouvelle instance pour chaque test
      this.autoMoveManager = new AutoMoveManager();
    };
    
    await test('constructor should initialize with default values', () => {
      resetTestState();
      assert.strictEqual(this.autoMoveManager.initialized, false, 'Should start uninitialized');
      assert.strictEqual(this.autoMoveManager.options.enabled, false, 'Auto-move should be disabled by default');
      assert.strictEqual(this.autoMoveManager.options.folder, 'INBOX/SecMyMail-Quarantine', 'Default folder should be set');
      assert.strictEqual(this.autoMoveManager.stats.totalQuarantined, 0, 'Stats should start at 0');
    });
    
    await test('initialize should load settings and stats', async () => {
      resetTestState();
      const result = await this.autoMoveManager.initialize();
      assert.strictEqual(result, true, 'Initialize should return true on success');
      assert.strictEqual(this.autoMoveManager.initialized, true, 'Should be marked as initialized');
      assert.strictEqual(this.autoMoveManager.options.enabled, true, 'Should load enabled state from storage');
      assert.strictEqual(this.autoMoveManager.stats.totalQuarantined, 42, 'Should load stats from storage');
    });
    
    await test('loadOptions should load options from storage', async () => {
      resetTestState();
      const result = await this.autoMoveManager.loadOptions();
      assert.strictEqual(result, true, 'Should successfully load options');
      assert.strictEqual(this.autoMoveManager.options.enabled, true, 'Should load correct enabled state');
      assert.strictEqual(this.autoMoveManager.options.quarantineFichiersMalveillants, false, 'Should load correct file quarantine setting');
    });
    
    await test('loadOptions should use defaults if none in storage', async () => {
      resetTestState();
      delete mockStorageData.autoMoveOptions;
      
      const result = await this.autoMoveManager.loadOptions();
      assert.strictEqual(result, false, 'Should indicate no options were found');
      assert.strictEqual(this.autoMoveManager.options.enabled, false, 'Should use default enabled state');
      assert.strictEqual(this.autoMoveManager.options.quarantineFichiersMalveillants, true, 'Should use default file quarantine setting');
      
      // Vérifier que les valeurs par défaut ont été enregistrées
      assert.deepStrictEqual(mockStorageData.autoMoveOptions, {
        enabled: false,
        folder: 'INBOX/SecMyMail-Quarantine',
        quarantineExpediteursmalveillants: true,
        quarantineLiensMalveillants: true,
        quarantineFichiersMalveillants: true
      }, 'Should save default options to storage');
    });
    
    await test('loadStats should load stats from storage', async () => {
      resetTestState();
      const result = await this.autoMoveManager.loadStats();
      assert.strictEqual(result, true, 'Should successfully load stats');
      assert.strictEqual(this.autoMoveManager.stats.totalQuarantined, 42, 'Should load correct quarantine count');
    });
    
    await test('loadStats should use defaults if none in storage', async () => {
      resetTestState();
      delete mockStorageData.autoMoveStats;
      
      const result = await this.autoMoveManager.loadStats();
      assert.strictEqual(result, false, 'Should indicate no stats were found');
      assert.strictEqual(this.autoMoveManager.stats.totalQuarantined, 0, 'Should use default stats');
      
      // Vérifier que les valeurs par défaut ont été enregistrées
      assert.deepStrictEqual(mockStorageData.autoMoveStats, {
        totalQuarantined: 0
      }, 'Should save default stats to storage');
    });
    
    await test('updateOptions should update and save options', async () => {
      resetTestState();
      await this.autoMoveManager.initialize();
      
      const newOptions = {
        enabled: false,
        folder: 'INBOX/Custom-Folder'
      };
      
      const result = await this.autoMoveManager.updateOptions(newOptions);
      assert.strictEqual(result.success, true, 'Should return success');
      assert.strictEqual(this.autoMoveManager.options.enabled, false, 'Should update enabled state');
      assert.strictEqual(this.autoMoveManager.options.folder, 'INBOX/Custom-Folder', 'Should update folder path');
      
      // Les autres options devraient rester inchangées
      assert.strictEqual(this.autoMoveManager.options.quarantineExpediteursmalveillants, true, 'Should preserve other options');
      
      // Vérifier que les options ont été enregistrées
      assert.deepStrictEqual(mockStorageData.autoMoveOptions, {
        enabled: false,
        folder: 'INBOX/Custom-Folder',
        quarantineExpediteursmalveillants: true,
        quarantineLiensMalveillants: true,
        quarantineFichiersMalveillants: false
      }, 'Should save updated options to storage');
    });
    
    await test('incrementStats should increment counter and save', async () => {
      resetTestState();
      await this.autoMoveManager.initialize();
      
      const initialCount = this.autoMoveManager.stats.totalQuarantined;
      const updatedStats = await this.autoMoveManager.incrementStats();
      
      assert.strictEqual(updatedStats.totalQuarantined, initialCount + 1, 'Should increment count by 1');
      assert.strictEqual(this.autoMoveManager.stats.totalQuarantined, initialCount + 1, 'Should update instance stats');
      
      // Vérifier que les stats ont été enregistrées
      assert.strictEqual(mockStorageData.autoMoveStats.totalQuarantined, initialCount + 1, 'Should save updated stats to storage');
    });
    
    await test('getStats should return current stats', async () => {
      resetTestState();
      await this.autoMoveManager.initialize();
      
      const stats = this.autoMoveManager.getStats();
      assert.deepStrictEqual(stats, { totalQuarantined: 42 }, 'Should return correct stats');
    });
    
    await test('getOptions should return current options', async () => {
      resetTestState();
      await this.autoMoveManager.initialize();
      
      const options = this.autoMoveManager.getOptions();
      assert.strictEqual(options.enabled, true, 'Should return correct enabled state');
      assert.strictEqual(options.folder, 'INBOX/SecMyMail-Quarantine', 'Should return correct folder');
    });
    
    await test('shouldMoveMessage should correctly evaluate message types', async () => {
      resetTestState();
      await this.autoMoveManager.initialize();
      
      // With auto-move enabled
      assert.strictEqual(this.autoMoveManager.shouldMoveMessage('expediteur_malveillant'), true, 'Should move malicious sender');
      assert.strictEqual(this.autoMoveManager.shouldMoveMessage('lien_malveillant'), true, 'Should move malicious link');
      assert.strictEqual(this.autoMoveManager.shouldMoveMessage('fichier_malveillant'), false, 'Should not move malicious file (disabled in options)');
      assert.strictEqual(this.autoMoveManager.shouldMoveMessage('unknown_type'), false, 'Should not move unknown type');
      
      // With auto-move disabled
      await this.autoMoveManager.updateOptions({ enabled: false });
      assert.strictEqual(this.autoMoveManager.shouldMoveMessage('expediteur_malveillant'), false, 'Should not move anything when disabled');
      assert.strictEqual(this.autoMoveManager.shouldMoveMessage('lien_malveillant'), false, 'Should not move anything when disabled');
    });
    
    await test('moveMessageIfNeeded should move message when criteria met', async () => {
      resetTestState();
      await this.autoMoveManager.initialize();
      
      // Test avec un type qui devrait être déplacé
      const resultForMaliciousSender = await this.autoMoveManager.moveMessageIfNeeded('msg123', 'expediteur_malveillant');
      assert.strictEqual(resultForMaliciousSender, true, 'Should move malicious sender');
      assert.strictEqual(this.autoMoveManager.stats.totalQuarantined, 43, 'Should increment stats after move');
      
      // Test avec un type qui ne devrait pas être déplacé
      const resultForMaliciousFile = await this.autoMoveManager.moveMessageIfNeeded('msg456', 'fichier_malveillant');
      assert.strictEqual(resultForMaliciousFile, false, 'Should not move malicious file (disabled in options)');
      assert.strictEqual(this.autoMoveManager.stats.totalQuarantined, 43, 'Stats should remain unchanged');
    });
    
    await test('moveMessageIfNeeded should initialize if needed', async () => {
      resetTestState();
      
      const result = await this.autoMoveManager.moveMessageIfNeeded('msg123', 'expediteur_malveillant');
      assert.strictEqual(this.autoMoveManager.initialized, true, 'Should auto-initialize');
      assert.strictEqual(result, true, 'Should successfully move message after initialization');
    });
    
    await test('reset should restore default options and stats', async () => {
      resetTestState();
      await this.autoMoveManager.initialize();
      
      // Modifier les options et stats avant reset
      await this.autoMoveManager.updateOptions({ 
        enabled: true, 
        folder: 'INBOX/Custom-Folder'
      });
      await this.autoMoveManager.incrementStats();
      
      // Reset
      const result = await this.autoMoveManager.reset();
      assert.strictEqual(result.success, true, 'Reset should return success');
      
      // Vérifier que les options ont été réinitialisées
      assert.strictEqual(this.autoMoveManager.options.enabled, false, 'Should reset enabled state');
      assert.strictEqual(this.autoMoveManager.options.folder, 'INBOX/SecMyMail-Quarantine', 'Should reset folder path');
      assert.strictEqual(this.autoMoveManager.stats.totalQuarantined, 0, 'Should reset stats');
      
      // Vérifier le stockage
      assert.strictEqual(mockStorageData.autoMoveOptions.enabled, false, 'Should save reset options');
      assert.strictEqual(mockStorageData.autoMoveStats.totalQuarantined, 0, 'Should save reset stats');
    });
    
    await test('moveMessageIfNeeded should handle folder creation', async () => {
      resetTestState();
      await this.autoMoveManager.initialize();
      
      // Modifier les options pour utiliser un dossier qui n'existe pas
      await this.autoMoveManager.updateOptions({ 
        folder: 'INBOX/New-Quarantine-Folder'
      });
      
      // Simuler que le dossier n'existe pas puis est créé
      const originalQuery = browser.folders.query;
      let folderCreationCalled = false;
      
      browser.folders.query = async () => {
        return mockFolders.filter(f => f.name !== 'New-Quarantine-Folder');
      };
      
      const originalCreate = browser.folders.create;
      browser.folders.create = async (accountId, folderName) => {
        folderCreationCalled = true;
        const newFolder = {
          id: 'newFolder',
          name: folderName,
          path: `INBOX/${folderName}`,
          accountId
        };
        return newFolder;
      };
      
      const result = await this.autoMoveManager.moveMessageIfNeeded('msg123', 'expediteur_malveillant');
      
      assert.strictEqual(result, true, 'Should successfully move message');
      assert.strictEqual(folderCreationCalled, true, 'Should create folder when it does not exist');
      
      // Restaurer les fonctions originales
      browser.folders.query = originalQuery;
      browser.folders.create = originalCreate;
    });
    
    await test('moveMessageIfNeeded should handle fallback method', async () => {
      resetTestState();
      await this.autoMoveManager.initialize();
      
      // Simuler une erreur avec la première méthode, mais un succès avec la seconde
      const originalQuery = browser.folders.query;
      browser.folders.query = async () => {
        throw new Error('API folders non disponible');
      };
      
      let directMoveCalled = false;
      const originalMove = browser.messages.move;
      browser.messages.move = async (messageIds, targetPath) => {
        directMoveCalled = true;
        return true;
      };
      
      const result = await this.autoMoveManager.moveMessageIfNeeded('msg123', 'expediteur_malveillant');
      
      assert.strictEqual(result, true, 'Should successfully move message with fallback method');
      assert.strictEqual(directMoveCalled, true, 'Should call direct move method');
      assert.strictEqual(this.autoMoveManager.stats.totalQuarantined, 43, 'Should increment stats');
      
      // Restaurer les fonctions originales
      browser.folders.query = originalQuery;
      browser.messages.move = originalMove;
    });
    
    await test('moveMessageIfNeeded should handle complete failure', async () => {
      resetTestState();
      await this.autoMoveManager.initialize();
      
      // Simuler une erreur avec les deux méthodes
      const originalGet = browser.messages.get;
      browser.messages.get = async () => {
        throw new Error('Message not found');
      };
      
      const result = await this.autoMoveManager.moveMessageIfNeeded('msg123', 'expediteur_malveillant');
      
      assert.strictEqual(result, false, 'Should return false on complete failure');
      assert.strictEqual(this.autoMoveManager.stats.totalQuarantined, 42, 'Stats should remain unchanged');
      
      // Restaurer la fonction originale
      browser.messages.get = originalGet;
    });
    
    console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed`);
  }
}

// Exécuter les tests
const tester = new AutoMoveTest();
tester.runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});