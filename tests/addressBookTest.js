import { fileURLToPath } from 'url';
import path from 'path';
import assert from 'assert';

// Obtenir le répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Stocker les données pour notre mock storage
let mockStorageData = {
  addressBookSync: {
    enabled: true,
    lastSync: '2025-06-19T10:30:00Z',
    contactCount: 150
  },
  emailWhitelist: ['safe@example.com', 'contact@trusted.org']
};

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
  addressBooks: {
    list: async () => {
      return [
        { id: 'personal', name: 'Personal Address Book' },
        { id: 'collected', name: 'Collected Addresses' }
      ];
    },
    get: async (id) => {
      if (id === 'personal') {
        return {
          id: 'personal',
          name: 'Personal Address Book',
          contacts: [
            { id: 'c1', properties: { PrimaryEmail: 'contact1@example.com' } },
            { id: 'c2', properties: { PrimaryEmail: 'contact2@example.com' } }
          ]
        };
      } else if (id === 'collected') {
        return {
          id: 'collected',
          name: 'Collected Addresses',
          contacts: [
            { id: 'c3', properties: { PrimaryEmail: 'contact3@example.org' } },
            { id: 'c4', properties: { PrimaryEmail: 'contact4@example.org' } }
          ]
        };
      }
      return null;
    }
  }
};

// Classe AddressBookManager pour les tests
class AddressBookManager {
  constructor() {
    this.initialized = false;
    this.syncState = {
      enabled: false,
      lastSync: null,
      contactCount: 0
    };
  }

  /**
   * Initialise le gestionnaire de carnet d'adresses
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.loadSyncState();
      this.initialized = true;
      console.log('[AddressBookManager] Initialisation terminée');
    } catch (error) {
      console.error('[AddressBookManager] Erreur initialisation:', error);
    }
  }

  /**
   * Charge l'état de synchronisation depuis le stockage
   */
  async loadSyncState() {
    try {
      const result = await browser.storage.local.get('addressBookSync');
      
      if (result && result.addressBookSync) {
        this.syncState = result.addressBookSync;
      } else {
        this.syncState = {
          enabled: false,
          lastSync: null,
          contactCount: 0
        };
      }
    } catch (error) {
      console.error('[AddressBookManager] Erreur chargement état sync:', error);
    }
  }

  /**
   * Sauvegarde l'état de synchronisation
   */
  async saveSyncState() {
    try {
      await browser.storage.local.set({
        addressBookSync: this.syncState
      });
      return true;
    } catch (error) {
      console.error('[AddressBookManager] Erreur sauvegarde état sync:', error);
      return false;
    }
  }

  /**
   * Récupère les carnets d'adresses
   */
  async getAddressBooks() {
    try {
      const books = await browser.addressBooks.list();
      return books;
    } catch (error) {
      console.error('[AddressBookManager] Erreur récupération carnets:', error);
      return [];
    }
  }

  /**
   * Récupère les contacts d'un carnet d'adresses
   */
  async listAddressBook(parentId) {
    try {
      const book = await browser.addressBooks.get(parentId);
      if (book && book.contacts) {
        return book.contacts;
      }
      return [];
    } catch (error) {
      console.error('[AddressBookManager] Erreur récupération contacts:', error);
      return [];
    }
  }

  /**
   * Récupère tous les contacts de tous les carnets
   */
  async getAllContacts() {
    try {
      const books = await this.getAddressBooks();
      let allEmails = [];
      
      for (const book of books) {
        const contacts = await this.listAddressBook(book.id);
        const emails = contacts
          .filter(contact => contact.properties && contact.properties.PrimaryEmail)
          .map(contact => contact.properties.PrimaryEmail);
        
        allEmails = [...allEmails, ...emails];
      }
      
      // Éliminer les doublons
      return [...new Set(allEmails)];
    } catch (error) {
      console.error('[AddressBookManager] Erreur récupération contacts:', error);
      return [];
    }
  }

  /**
   * Ajoute des emails à la liste blanche
   */
  async addToWhitelist(emails) {
    if (!emails || emails.length === 0) return false;
    
    try {
      // Récupérer la liste blanche existante
      const result = await browser.storage.local.get('emailWhitelist');
      let whitelist = result.emailWhitelist || [];
      
      // Ajouter les nouveaux emails (sans doublons)
      const newWhitelist = [...new Set([...whitelist, ...emails])];
      
      // Sauvegarder la liste mise à jour
      await browser.storage.local.set({ emailWhitelist: newWhitelist });
      return true;
    } catch (error) {
      console.error('[AddressBookManager] Erreur ajout à liste blanche:', error);
      return false;
    }
  }

  /**
   * Synchronise le carnet d'adresses avec la liste blanche
   */
  async syncAddressBook() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Récupérer tous les contacts
      const allEmails = await this.getAllContacts();
      
      if (allEmails.length > 0) {
        // Ajouter à la liste blanche
        await this.addToWhitelist(allEmails);
        
        // Mettre à jour l'état de synchronisation
        this.syncState.lastSync = new Date().toISOString();
        this.syncState.contactCount = allEmails.length;
        await this.saveSyncState();
        
        return {
          success: true,
          added: allEmails.length,
          lastSync: this.syncState.lastSync,
          contactCount: this.syncState.contactCount
        };
      }
      
      return {
        success: false,
        error: 'Aucun contact trouvé'
      };
    } catch (error) {
      console.error('[AddressBookManager] Erreur synchronisation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Active ou désactive la synchronisation automatique
   */
  async toggleSync(enabled) {
    try {
      this.syncState.enabled = enabled;
      
      // Si on active la synchronisation, synchroniser immédiatement
      if (enabled) {
        const syncResult = await this.syncAddressBook();
        await this.saveSyncState();
        return syncResult;
      } else {
        // Sinon, juste sauvegarder l'état
        await this.saveSyncState();
        return {
          success: true,
          enabled: false
        };
      }
    } catch (error) {
      console.error('[AddressBookManager] Erreur toggle sync:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Récupère l'état de synchronisation
   */
  getSyncState() {
    return this.syncState;
  }
}

// Classe AddressBookTest pour tester AddressBookManager
class AddressBookTest {
  constructor() {
    this.addressBookManager = new AddressBookManager();
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
        addressBookSync: {
          enabled: true,
          lastSync: '2025-06-19T10:30:00Z',
          contactCount: 150
        },
        emailWhitelist: ['safe@example.com', 'contact@trusted.org']
      };
      
      // Réinitialiser les mocks de browser si nécessaire
      browser.storage.local.get = async (key) => {
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
      };
      
      browser.storage.local.set = async (data) => {
        // Mettre à jour notre stockage simulé
        Object.keys(data).forEach(key => {
          mockStorageData[key] = JSON.parse(JSON.stringify(data[key]));
        });
        return {};
      };
      
      // Créer une nouvelle instance pour chaque test
      this.addressBookManager = new AddressBookManager();
    };
    
    await test('constructor should initialize with default values', () => {
      resetTestState();
      assert.strictEqual(this.addressBookManager.initialized, false, 'Should start uninitialized');
      assert.strictEqual(this.addressBookManager.syncState.enabled, false, 'Sync should be disabled by default');
      assert.strictEqual(this.addressBookManager.syncState.lastSync, null, 'Last sync should be null');
      assert.strictEqual(this.addressBookManager.syncState.contactCount, 0, 'Contact count should be 0');
    });
    
    await test('initialize should load sync state from storage', async () => {
      resetTestState();
      await this.addressBookManager.initialize();
      assert.strictEqual(this.addressBookManager.initialized, true, 'Should be initialized');
      assert.strictEqual(this.addressBookManager.syncState.enabled, true, 'Sync enabled should match storage');
      assert.strictEqual(this.addressBookManager.syncState.lastSync, '2025-06-19T10:30:00Z', 'Last sync should match storage');
      assert.strictEqual(this.addressBookManager.syncState.contactCount, 150, 'Contact count should match storage');
    });
    
    await test('loadSyncState should load state from storage', async () => {
      resetTestState();
      await this.addressBookManager.loadSyncState();
      assert.strictEqual(this.addressBookManager.syncState.enabled, true, 'Sync enabled should match storage');
      assert.strictEqual(this.addressBookManager.syncState.lastSync, '2025-06-19T10:30:00Z', 'Last sync should match storage');
      assert.strictEqual(this.addressBookManager.syncState.contactCount, 150, 'Contact count should match storage');
    });
    
    await test('loadSyncState should create default state if none exists', async () => {
      resetTestState();
      // Simuler un stockage vide
      delete mockStorageData.addressBookSync;
      
      await this.addressBookManager.loadSyncState();
      assert.strictEqual(this.addressBookManager.syncState.enabled, false, 'Sync enabled should be default');
      assert.strictEqual(this.addressBookManager.syncState.lastSync, null, 'Last sync should be null');
      assert.strictEqual(this.addressBookManager.syncState.contactCount, 0, 'Contact count should be 0');
    });
    
    await test('saveSyncState should save state to storage', async () => {
      resetTestState();
      this.addressBookManager.syncState = {
        enabled: false,
        lastSync: '2025-06-20T15:45:30Z',
        contactCount: 200
      };
      
      const result = await this.addressBookManager.saveSyncState();
      assert.strictEqual(result, true, 'Should return true on success');
      assert.deepStrictEqual(mockStorageData.addressBookSync, {
        enabled: false,
        lastSync: '2025-06-20T15:45:30Z',
        contactCount: 200
      }, 'Stored data should match sync state');
    });
    
    await test('getAddressBooks should return list of address books', async () => {
      resetTestState();
      const books = await this.addressBookManager.getAddressBooks();
      assert.strictEqual(books.length, 2, 'Should return 2 address books');
      assert.strictEqual(books[0].id, 'personal', 'First book should be personal');
      assert.strictEqual(books[1].id, 'collected', 'Second book should be collected');
    });
    
    await test('listAddressBook should return contacts from specific address book', async () => {
      resetTestState();
      const contacts = await this.addressBookManager.listAddressBook('personal');
      assert.strictEqual(contacts.length, 2, 'Should return 2 contacts');
      assert.strictEqual(contacts[0].properties.PrimaryEmail, 'contact1@example.com', 'Should return correct email');
    });
    
    await test('getAllContacts should return all email addresses', async () => {
      resetTestState();
      const emails = await this.addressBookManager.getAllContacts();
      assert.strictEqual(emails.length, 4, 'Should return 4 emails');
      assert.ok(emails.includes('contact1@example.com'), 'Should include email from personal book');
      assert.ok(emails.includes('contact3@example.org'), 'Should include email from collected book');
    });
    
    await test('addToWhitelist should add emails to whitelist', async () => {
      resetTestState();
      const newEmails = ['new1@example.com', 'new2@example.org'];
      const result = await this.addressBookManager.addToWhitelist(newEmails);
      
      assert.strictEqual(result, true, 'Should return true on success');
      
      // Vérifier que les emails ont été ajoutés au stockage
      const currentWhitelist = mockStorageData.emailWhitelist;
      assert.strictEqual(currentWhitelist.length, 4, 'Whitelist should have 4 emails');
      assert.ok(currentWhitelist.includes('new1@example.com'), 'Should include new email 1');
      assert.ok(currentWhitelist.includes('new2@example.org'), 'Should include new email 2');
    });
    
    await test('addToWhitelist should handle empty email list', async () => {
      resetTestState();
      const result = await this.addressBookManager.addToWhitelist([]);
      assert.strictEqual(result, false, 'Should return false for empty list');
      assert.strictEqual(mockStorageData.emailWhitelist.length, 2, 'Whitelist should remain unchanged');
    });
    
    await test('syncAddressBook should sync contacts to whitelist', async () => {
      resetTestState();
      await this.addressBookManager.initialize();
      
      const result = await this.addressBookManager.syncAddressBook();
      
      assert.strictEqual(result.success, true, 'Should return success');
      assert.strictEqual(result.added, 4, 'Should add 4 contacts');
      
      // Vérifier que les contacts ont été ajoutés à la liste blanche
      const currentWhitelist = mockStorageData.emailWhitelist;
      assert.strictEqual(currentWhitelist.length, 6, 'Whitelist should have 6 emails');
      assert.ok(currentWhitelist.includes('contact1@example.com'), 'Should include contact1');
      assert.ok(currentWhitelist.includes('contact2@example.com'), 'Should include contact2');
      assert.ok(currentWhitelist.includes('contact3@example.org'), 'Should include contact3');
      assert.ok(currentWhitelist.includes('contact4@example.org'), 'Should include contact4');
    });
    
    await test('syncAddressBook should handle empty contacts', async () => {
      resetTestState();
      await this.addressBookManager.initialize();
      
      // Simuler une liste de contacts vide
      const originalGet = browser.addressBooks.get;
      browser.addressBooks.get = async () => ({ contacts: [] });
      
      const result = await this.addressBookManager.syncAddressBook();
      assert.strictEqual(result.success, false, 'Should return failure');
      assert.strictEqual(result.error, 'Aucun contact trouvé', 'Should return appropriate error');
      
      // Restaurer la fonction originale
      browser.addressBooks.get = originalGet;
    });
    
    await test('toggleSync should enable sync and perform initial sync', async () => {
      resetTestState();
      await this.addressBookManager.initialize();
      this.addressBookManager.syncState.enabled = false;
      
      const result = await this.addressBookManager.toggleSync(true);
      
      assert.strictEqual(result.success, true, 'Should return success');
      assert.strictEqual(this.addressBookManager.syncState.enabled, true, 'Sync should be enabled');
      
      // Vérifier que les contacts ont été synchronisés
      const currentWhitelist = mockStorageData.emailWhitelist;
      assert.strictEqual(currentWhitelist.length, 6, 'Whitelist should be updated');
      assert.ok(currentWhitelist.includes('contact1@example.com'), 'Should include contact1');
    });
    
    await test('toggleSync should disable sync without performing sync', async () => {
      resetTestState();
      await this.addressBookManager.initialize();
      const previousLastSync = this.addressBookManager.syncState.lastSync;
      
      const result = await this.addressBookManager.toggleSync(false);
      assert.strictEqual(result.success, true, 'Should return success');
      assert.strictEqual(this.addressBookManager.syncState.enabled, false, 'Sync should be disabled');
      assert.strictEqual(this.addressBookManager.syncState.lastSync, previousLastSync, 'Last sync should not change');
    });
    
    await test('getSyncState should return current sync state', () => {
      resetTestState();
      this.addressBookManager.syncState = {
        enabled: true,
        lastSync: '2025-06-19T10:30:00Z',
        contactCount: 150
      };
      
      const state = this.addressBookManager.getSyncState();
      assert.strictEqual(state.enabled, true, 'Should return correct enabled state');
      assert.strictEqual(state.lastSync, '2025-06-19T10:30:00Z', 'Should return correct last sync');
      assert.strictEqual(state.contactCount, 150, 'Should return correct contact count');
    });
    
    console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed`);
  }
}

// Exécuter les tests
const tester = new AddressBookTest();
tester.runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});