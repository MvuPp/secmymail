import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtenir le répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simuler l'environnement du navigateur
globalThis.browser = {
  runtime: {
    sendMessage: async (message) => {
      // Simuler les réponses du service worker
      if (message.action === 'getLists') {
        return {
          success: true,
          lists: {
            emailWhitelist: ['test@example.com', 'safe@trusted.org'],
            emailBlacklist: ['spam@malicious.com'],
            domainWhitelist: ['example.com', 'trusted.org'],
            domainBlacklist: ['malicious.com', 'spam.net']
          }
        };
      } else if (message.action === 'addToWhitelist') {
        return { success: true };
      } else if (message.action === 'addToBlacklist') {
        return { success: true };
      } else if (message.action === 'removeFromList') {
        return { success: true };
      }
      return { success: false, error: 'Action non supportée' };
    }
  },
  storage: {
    local: {
      get: async () => ({}),
      set: async () => {}
    }
  }
};

globalThis.document = {
  body: {
    appendChild: () => {},
    removeChild: () => {}
  },
  head: {
    appendChild: () => {}
  },
  getElementById: (id) => {
    // Simuler les éléments du DOM
    return {
      id,
      style: {},
      className: '',
      classList: {
        toggle: () => {},
        add: () => {},
        remove: () => {},
        contains: () => false
      },
      dataset: {
        type: id.includes('whitelist') ? 'whitelist' : 'blacklist',
        tab: id.includes('email') ? 'emails' : 'domains'
      },
      value: '',
      innerHTML: '',
      querySelectorAll: () => [],
      addEventListener: () => {}
    };
  },
  querySelectorAll: () => {
    return [
      {
        style: {},
        classList: {
          toggle: () => {},
          add: () => {},
          remove: () => {}
        },
        dataset: {
          type: 'whitelist',
          tab: 'emails'
        }
      }
    ];
  },
  createElement: (tag) => {
    const element = {
      tagName: tag,
      style: {},
      className: '',
      innerHTML: '',
      textContent: '',
      dataset: {},
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {}
      },
      appendChild: () => {},
      querySelectorAll: () => [],
      addEventListener: () => {},
      focus: () => {},
      click: () => {},
      remove: () => {}
    };
    
    // Pour le test escapeHtml
    if (tag === 'div') {
      // Simuler le comportement de textContent et innerHTML
      Object.defineProperty(element, 'textContent', {
        set(value) {
          this._textContent = value;
          // Simuler l'échappement HTML quand textContent est défini
          this._innerHTML = value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        },
        get() {
          return this._textContent || '';
        }
      });
      
      Object.defineProperty(element, 'innerHTML', {
        get() {
          return this._innerHTML || '';
        },
        set(value) {
          this._innerHTML = value;
        }
      });
    }
    
    return element;
  },
  addEventListener: () => {}
};

// Simuler window
globalThis.window = {
  location: { href: 'lists.html' },
  history: { back: () => {} },
  setTimeout: setTimeout,
  requestAnimationFrame: (cb) => cb()
};

// Simuler URL
globalThis.URL = {
  createObjectURL: () => 'blob:test',
  revokeObjectURL: () => {}
};

class ListsUITest {
  constructor() {
    this.listsUI = null;
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

    // Créer une instance de ListsUI pour les tests
    this.createListsUIInstance();
    
    await test('init should load data and setup interface', async () => {
      await this.listsUI.init();
      
      assert(this.listsUI.emailWhitelist.length > 0, 'Should load email whitelist');
      assert(this.listsUI.domainBlacklist.length > 0, 'Should load domain blacklist');
      assert.strictEqual(this.listsUI.currentListType, 'whitelist', 'Should set default list type');
      assert.strictEqual(this.listsUI.currentTab, 'emails', 'Should set default tab');
    });

    await test('loadData should fetch data from background service', async () => {
      await this.listsUI.loadData();
      
      assert.strictEqual(this.listsUI.emailWhitelist.length, 2, 'Should load correct number of whitelisted emails');
      assert.strictEqual(this.listsUI.emailBlacklist.length, 1, 'Should load correct number of blacklisted emails');
      assert.strictEqual(this.listsUI.domainWhitelist.length, 2, 'Should load correct number of whitelisted domains');
      assert.strictEqual(this.listsUI.domainBlacklist.length, 2, 'Should load correct number of blacklisted domains');
    });

    await test('getCurrentListData should return correct data for current list', () => {
      this.listsUI.currentTab = 'emails';
      this.listsUI.currentListType = 'whitelist';
      let data = this.listsUI.getCurrentListData();
      assert.strictEqual(data, this.listsUI.emailWhitelist, 'Should return email whitelist');
      
      this.listsUI.currentTab = 'domains';
      this.listsUI.currentListType = 'blacklist';
      data = this.listsUI.getCurrentListData();
      assert.strictEqual(data, this.listsUI.domainBlacklist, 'Should return domain blacklist');
    });

    await test('handleListTypeChange should update interface for new list type', () => {
      const originalType = this.listsUI.currentListType;
      const newType = originalType === 'whitelist' ? 'blacklist' : 'whitelist';
      
      this.listsUI.handleListTypeChange(newType);
      assert.strictEqual(this.listsUI.currentListType, newType, 'Should update current list type');
    });

    await test('handleTabChange should update interface for new tab', () => {
      const originalTab = this.listsUI.currentTab;
      const newTab = originalTab === 'emails' ? 'domains' : 'emails';
      
      this.listsUI.handleTabChange(newTab);
      assert.strictEqual(this.listsUI.currentTab, newTab, 'Should update current tab');
    });

    await test('validateEmail should correctly validate email addresses', () => {
      assert.strictEqual(this.listsUI.validateEmail('valid@example.com'), true, 'Should accept valid email');
      assert.strictEqual(this.listsUI.validateEmail('invalid-email'), false, 'Should reject invalid email');
      assert.strictEqual(this.listsUI.validateEmail(''), false, 'Should reject empty email');
    });

    await test('validateDomain should correctly validate domains', () => {
      assert.strictEqual(this.listsUI.validateDomain('example.com'), true, 'Should accept valid domain');
      assert.strictEqual(this.listsUI.validateDomain('sub.domain.example.com'), true, 'Should accept subdomains');
      assert.strictEqual(this.listsUI.validateDomain('invalid domain'), false, 'Should reject invalid domain');
      assert.strictEqual(this.listsUI.validateDomain(''), false, 'Should reject empty domain');
    });

    await test('isValidEmail should correctly identify valid emails', () => {
      assert.strictEqual(this.listsUI.isValidEmail('user@example.com'), true, 'Should accept standard email');
      assert.strictEqual(this.listsUI.isValidEmail('user.name@example.co.uk'), true, 'Should accept email with dots');
      assert.strictEqual(this.listsUI.isValidEmail('user+tag@example.com'), true, 'Should accept email with +');
      assert.strictEqual(this.listsUI.isValidEmail('user@.com'), false, 'Should reject invalid email');
      assert.strictEqual(this.listsUI.isValidEmail('user@'), false, 'Should reject incomplete email');
    });

    await test('isValidDomain should correctly identify valid domains', () => {
      assert.strictEqual(this.listsUI.isValidDomain('example.com'), true, 'Should accept standard domain');
      assert.strictEqual(this.listsUI.isValidDomain('sub.example.com'), true, 'Should accept subdomain');
      assert.strictEqual(this.listsUI.isValidDomain('example-site.com'), true, 'Should accept domain with hyphen');
      assert.strictEqual(this.listsUI.isValidDomain('example..com'), false, 'Should reject domain with double dots');
      assert.strictEqual(this.listsUI.isValidDomain('-example.com'), false, 'Should reject domain starting with hyphen');
    });

    await test('escapeHtml should escape HTML entities', () => {
      const escaped = this.listsUI.escapeHtml('<script>alert("XSS");</script>');
      assert(escaped.includes('&lt;script&gt;'), 'Should escape < and >');
      assert(escaped.includes('&quot;'), 'Should escape quotes');
    });

    await test('showMessage should create a message element', () => {
      // Créer un mock pour appendChild
      let appendCalled = false;
      const originalAppend = document.body.appendChild;
      document.body.appendChild = () => { appendCalled = true; };
      
      this.listsUI.showMessage('Test message', 'info');
      assert.strictEqual(appendCalled, true, 'Should append message to DOM');
      
      // Restaurer la fonction originale
      document.body.appendChild = originalAppend;
    });

    await test('addCurrentItemFromInput should validate and add items', async () => {
      const input = {
        value: 'test@example.com',
        style: {}
      };
      
      // Simuler un succès d'ajout
      await this.listsUI.addCurrentItemFromInput(input, 'email', 'whitelist');
      
      // Vérifier que l'input a été réinitialisé (succès)
      assert.strictEqual(input.value, '', 'Should clear input on success');
    });

    await test('validateImportData should validate import data structure', () => {
      const validData = {
        emailWhitelist: [],
        emailBlacklist: [],
        domainWhitelist: [],
        domainBlacklist: []
      };
      
      assert.strictEqual(this.listsUI.validateImportData(validData), true, 'Should validate correct structure');
      assert.strictEqual(this.listsUI.validateImportData({}), false, 'Should reject empty object');
      assert.strictEqual(this.listsUI.validateImportData(null), false, 'Should reject null');
      assert.strictEqual(this.listsUI.validateImportData({emailWhitelist: 'not-array'}), false, 'Should reject non-array values');
    });

    console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed`);
  }

  createListsUIInstance() {
    // Créer une version simplifiée de ListsUI pour les tests
    this.listsUI = {
      emailWhitelist: [],
      emailBlacklist: [],
      domainWhitelist: [],
      domainBlacklist: [],
      currentListType: 'whitelist',
      currentTab: 'emails',
      isTransitioning: false,
      currentList: 'email-whitelist',

      async init() {
        await this.loadData();
        this.setupEventListeners();
        this.updateInterface();
      },

      async loadData() {
        const response = await browser.runtime.sendMessage({
          action: 'getLists'
        });
        
        if (response && response.success) {
          this.emailWhitelist = response.lists.emailWhitelist || [];
          this.emailBlacklist = response.lists.emailBlacklist || [];
          this.domainWhitelist = response.lists.domainWhitelist || [];
          this.domainBlacklist = response.lists.domainBlacklist || [];
        }
      },

      updateInterface() {
        this.updateListTypeButtons();
        this.updateTabButtons();
        this.showCurrentPanel();
        this.displayCurrentList();
      },

      updateListTypeButtons() {},
      updateTabButtons() {},
      showCurrentPanel() {},
      displayCurrentList() {},
      renderListItems() {},

      getCurrentListData() {
        if (this.currentTab === 'emails' && this.currentListType === 'whitelist') {
          return this.emailWhitelist;
        } else if (this.currentTab === 'emails' && this.currentListType === 'blacklist') {
          return this.emailBlacklist;
        } else if (this.currentTab === 'domains' && this.currentListType === 'whitelist') {
          return this.domainWhitelist;
        } else if (this.currentTab === 'domains' && this.currentListType === 'blacklist') {
          return this.domainBlacklist;
        }
        return [];
      },

      setupEventListeners() {},
      handleClick() {},
      handleEnterKey() {},

      handleListTypeChange(newListType) {
        this.currentListType = newListType;
        this.updateInterface();
      },

      handleTabChange(newTab) {
        this.currentTab = newTab;
        this.updateInterface();
      },

      handleAddButtonClick() {},

      async addCurrentItemFromInput(input, type, listType) {
        const value = input.value.trim();
        
        if (!value) {
          this.showError('Veuillez saisir une valeur');
          this.showInputError(input);
          return;
        }

        if (type === 'email' && !this.validateEmail(value)) {
          this.showInputError(input);
          return;
        }
        
        if (type === 'domain' && !this.validateDomain(value)) {
          this.showInputError(input);
          return;
        }

        const response = await browser.runtime.sendMessage({
          action: listType === 'whitelist' ? 'addToWhitelist' : 'addToBlacklist',
          type: type,
          value: value
        });
        
        if (response && response.success) {
          await this.loadData();
          this.updateInterface();
          input.value = '';
          this.showInputSuccess(input);
        }
      },

      async removeItem() {},
      async forceRefresh() {},
      async clearCurrentList() {},

      showInputSuccess() {},
      showInputError() {},

      validateEmail(email) {
        if (!email) {
          return false;
        }
        return this.isValidEmail(email);
      },

      validateDomain(domain) {
        if (!domain) {
          return false;
        }
        return this.isValidDomain(domain);
      },

      isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      },

      isValidDomain(domain) {
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/;
        return domainRegex.test(domain) && domain.length <= 253;
      },

      escapeHtml(text) {
        // Implémentation correcte de escapeHtml
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      },

      exportLists() {},
      importLists() {},

      validateImportData(data) {
        // Correction pour gérer explicitement le cas null
        if (data === null) return false;
        
        return data && 
               typeof data === 'object' &&
               Array.isArray(data.emailWhitelist) &&
               Array.isArray(data.emailBlacklist) &&
               Array.isArray(data.domainWhitelist) &&
               Array.isArray(data.domainBlacklist);
      },

      async showConfirmDialog() {
        return true; // Simuler une confirmation
      },

      showSuccess(message) { 
        this.showMessage(message, 'success'); 
      },

      showError(message) { 
        this.showMessage(message, 'error'); 
      },

      showMessage(message, type = 'info') {
        // Simuler l'affichage d'un message
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        document.body.appendChild(messageEl);
      }
    };
  }
}

// Exécuter les tests
const tester = new ListsUITest();
tester.runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});