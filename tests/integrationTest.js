import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// tests/commonTest.test.js

// Obtenir le répertoire actuel en utilisant ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers les modules
const commonPath = path.join(__dirname, '..', 'scripts', 'common.js');
const linkCheckerPath = path.join(__dirname, '..', 'modules', 'analysis', 'linkChecker.js');

// Mock des API du navigateur et des dépendances
const setupGlobalMocks = () => {
  // Mock browser
  globalThis.browser = {
    storage: {
      local: {
        get: async (key) => {
          if (key === 'domainWhitelist') return { domainWhitelist: ['example.com', 'trusted-site.org'] };
          if (key === 'domainBlacklist') return { domainBlacklist: ['malicious.com', 'suspicious-site.net'] };
          return {};
        },
        set: async () => ({})
      },
      sync: {
        get: async () => ({}),
        set: async () => ({})
      }
    },
    runtime: {
      sendMessage: async () => ({ success: true })
    }
  };

  // Mock window
  globalThis.window = {
    SecMyMailUtils: {}
  };

  // Mock document
  globalThis.document = {
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn()
    },
    createElement: () => ({
      style: {},
      className: '',
      setAttribute: jest.fn(),
      appendChild: jest.fn(),
      remove: jest.fn(),
      parentNode: globalThis.document.body
    })
  };

  // Mock storage module
  globalThis.storage = {
    get: async (key, defaultValue) => {
      if (key === 'domainWhitelist') return ['example.com', 'trusted-site.org'];
      if (key === 'domainBlacklist') return ['malicious.com', 'suspicious-site.net'];
      return defaultValue || [];
    },
    set: async () => true,
    addToList: async () => true,
    removeFromList: async () => true
  };

  // Mock STORAGE_KEYS
  globalThis.STORAGE_KEYS = {
    DOMAIN_WHITELIST: 'domainWhitelist',
    DOMAIN_BLACKLIST: 'domainBlacklist'
  };
};

// Charger le common.js
const loadCommonModule = () => {
  const commonCode = fs.readFileSync(commonPath, 'utf8');
  // Évaluer le code pour définir les fonctions dans l'environnement global
  eval(commonCode);
  
  return window.SecMyMailUtils;
};

// Créer une version simplifiée de LinkChecker pour les tests
class MockLinkChecker {
  constructor() {
    this.whiteListDomains = [];
    this.blackListDomains = [];
    this.whiteListKey = STORAGE_KEYS.DOMAIN_WHITELIST;
    this.blackListKey = STORAGE_KEYS.DOMAIN_BLACKLIST;
  }

  async loadCustomLists() {
    this.whiteListDomains = await storage.get(this.whiteListKey, []);
    this.blackListDomains = await storage.get(this.blackListKey, []);
  }

  isValidDomain(domain) {
    return window.SecMyMailUtils.isValidDomain(domain);
  }

  async compareWhiteList(domain) {
    await this.loadCustomLists();
    return this.whiteListDomains.some(item => domain === item || domain.endsWith('.' + item));
  }

  async compareBlackList(domain) {
    await this.loadCustomLists();
    return this.blackListDomains.some(item => domain === item || domain.endsWith('.' + item));
  }
}

const runIntegrationTests = async () => {
  // Configuration
  setupGlobalMocks();
  const utils = loadCommonModule();
  const linkChecker = new MockLinkChecker();
  
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

  // Tests d'intégration
  await test('Intégration: validation de domaine avec LinkChecker', async () => {
    // Valider que la fonction isValidDomain de common.js et LinkChecker fonctionnent ensemble
    const validDomain = 'secure-example.com';
    const invalidDomain = 'invalid@domain.com';
    
    // Common.js validation
    assert.strictEqual(utils.isValidDomain(validDomain), true, 'Common.js devrait valider le domaine correct');
    assert.strictEqual(utils.isValidDomain(invalidDomain), false, 'Common.js devrait rejeter le domaine invalide');
    
    // LinkChecker utilise la validation de common.js
    assert.strictEqual(linkChecker.isValidDomain(validDomain), true, 'LinkChecker devrait valider le domaine correct');
    assert.strictEqual(linkChecker.isValidDomain(invalidDomain), false, 'LinkChecker devrait rejeter le domaine invalide');
    
    // Vérifier que LinkChecker peut extraire et valider des domaines
    const content = 'Visitez secure-example.com et aussi invalid@domain.com';
    const domains = content.match(/([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,})/g) || [];
    
    const validDomains = domains.filter(d => linkChecker.isValidDomain(d));
    assert.strictEqual(validDomains.length, 1, 'Seul le domaine valide devrait être extrait');
    assert.strictEqual(validDomains[0], 'secure-example.com', 'Le domaine extrait devrait être correct');
  });

  await test('Intégration: vérification des listes blanches et noires de domaines', async () => {
    // Tester l'intégration entre les listes et la vérification de domaines
    
    // Vérifier qu'un domaine en liste blanche est reconnu
    const whitelistedDomain = 'example.com';
    const isWhitelisted = await linkChecker.compareWhiteList(whitelistedDomain);
    assert.strictEqual(isWhitelisted, true, 'Le domaine devrait être reconnu en liste blanche');
    
    // Vérifier qu'un sous-domaine d'un domaine en liste blanche est reconnu
    const whitelistedSubdomain = 'sub.example.com';
    const isSubWhitelisted = await linkChecker.compareWhiteList(whitelistedSubdomain);
    assert.strictEqual(isSubWhitelisted, true, 'Le sous-domaine devrait être reconnu en liste blanche');
    
    // Vérifier qu'un domaine en liste noire est reconnu
    const blacklistedDomain = 'malicious.com';
    const isBlacklisted = await linkChecker.compareBlackList(blacklistedDomain);
    assert.strictEqual(isBlacklisted, true, 'Le domaine devrait être reconnu en liste noire');
    
    // Vérifier qu'un domaine non listé n'est reconnu dans aucune liste
    const unlisted = 'unknown-domain.com';
    const isUnlistedWhite = await linkChecker.compareWhiteList(unlisted);
    const isUnlistedBlack = await linkChecker.compareBlackList(unlisted);
    assert.strictEqual(isUnlistedWhite, false, 'Le domaine inconnu ne devrait pas être en liste blanche');
    assert.strictEqual(isUnlistedBlack, false, 'Le domaine inconnu ne devrait pas être en liste noire');
  });

  await test('Intégration: notifications Toast avec actions utilisateur', async () => {
    // Simuler une action utilisateur qui déclenche une notification Toast
    
    // Espionner la méthode appendChild pour vérifier la création du toast
    let toastCreated = false;
    const originalAppendChild = document.body.appendChild;
    document.body.appendChild = (el) => {
      if (el && el.className && el.className.includes('toast')) {
        toastCreated = true;
      }
      return el;
    };
    
    // Simuler l'ajout d'un domaine à une liste
    const simulateAddDomain = async () => {
      // Cette fonction simule l'ajout d'un domaine et affiche une notification
      const domain = 'new-domain.com';
      if (utils.isValidDomain(domain)) {
        await storage.addToList('domainWhitelist', domain);
        utils.Toast.success(`Le domaine ${domain} a été ajouté à la liste blanche`);
        return true;
      } else {
        utils.Toast.error(`Le domaine ${domain} n'est pas valide`);
        return false;
      }
    };
    
    const result = await simulateAddDomain();
    assert.strictEqual(result, true, 'L\'ajout du domaine devrait réussir');
    assert.strictEqual(toastCreated, true, 'Une notification toast devrait être créée');
    
    // Restaurer la fonction originale
    document.body.appendChild = originalAppendChild;
  });

  console.log(`\nTest d'intégration - Résumé: ${passedTests} réussis, ${failedTests} échoués`);
};

runIntegrationTests().catch(error => {
  console.error('Erreur d\'exécution des tests d\'intégration:', error);
  process.exit(1);
});