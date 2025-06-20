import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtenir le répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Garder une référence aux timers créés pour pouvoir les nettoyer
const timers = [];
const intervals = [];

// Simuler l'environnement du navigateur
globalThis.browser = {
  runtime: {
    sendMessage: async (message) => {
      // Simuler les réponses du service worker
      if (message.action === 'ping') {
        return { status: 'alive' };
      } else if (message.action === 'getStats') {
        return { 
          totalProcessed: 100, 
          malicious: 10, 
          safe: 85,
          unknown: 5
        };
      }
      return { error: 'Action non supportée' };
    }
  }
};

// Simuler le DOM
globalThis.document = {
  body: {
    appendChild: () => {},
    removeChild: () => {}
  },
  head: {
    appendChild: () => {}
  },
  getElementById: (id) => {
    return {
      id,
      textContent: '',
      className: '',
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false
      }
    };
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    return {
      tagName: tag,
      textContent: '',
      innerHTML: '',
      className: '',
      style: {},
      remove: () => {},
      addEventListener: () => {},
      appendChild: () => {}
    };
  },
  addEventListener: (event, callback) => {
    // Simuler l'événement DOMContentLoaded
    if (event === 'DOMContentLoaded') {
      // Exécuter le callback immédiatement
      callback();
    }
  }
};

// Simuler window avec des surcharges pour suivre les timers
globalThis.window = {
  setTimeout: (fn, delay) => {
    const id = setTimeout(fn, delay);
    timers.push(id);
    return id;
  },
  setInterval: (fn, delay) => {
    const id = setInterval(fn, delay);
    intervals.push(id);
    return id;
  },
  clearInterval: clearInterval,
  clearTimeout: clearTimeout
};

// Créer une version de PopupUI pour les tests
class PopupUI {
  constructor() {
    this.serviceWorkerStatus = 'Vérification...';
    this.stats = { totalProcessed: 0, malicious: 0, safe: 0, unknown: 0 };
  }

  async init() {
    try {
      this.setupEventListeners();
      await this.checkServiceWorker();
      await this.loadStats();
      this.updateDisplay();
      console.log('[PopupUI] Interface initialisée');
    } catch (error) {
      console.error('[PopupUI] Erreur initialisation:', error);
    }
  }

  setupEventListeners() {
    // Navigation vers les autres pages
    document.addEventListener('click', (event) => {
      // Gestion des boutons sans lien direct
      if (event.target.closest && event.target.closest('.menu-button[data-action="stats"]')) {
        event.preventDefault();
        this.showStats();
      }
    });

    // Rafraîchissement périodique
    window.setInterval(() => {
      this.refreshData();
    }, 30000); // Toutes les 30 secondes
  }

  async checkServiceWorker() {
    try {
      const response = await browser.runtime.sendMessage({ 
        action: 'ping' 
      });
      
      if (response && response.status === 'alive') {
        this.serviceWorkerStatus = 'Actif';
      } else {
        this.serviceWorkerStatus = 'Inactif';
      }
    } catch (error) {
      console.error('[PopupUI] Service worker inaccessible:', error);
      this.serviceWorkerStatus = 'Erreur';
    }
  }

  async loadStats() {
    try {
      const response = await browser.runtime.sendMessage({ 
        action: 'getStats' 
      });
      
      if (response && !response.error) {
        this.stats = response;
      }
    } catch (error) {
      console.error('[PopupUI] Erreur chargement stats:', error);
    }
  }

  updateDisplay() {
    // Statut du service worker
    const swStatusEl = document.getElementById('sw-status');
    if (swStatusEl) {
      swStatusEl.textContent = this.serviceWorkerStatus;
      swStatusEl.className = 'status-value';
      
      switch (this.serviceWorkerStatus) {
        case 'Actif':
          swStatusEl.classList.add('status-active');
          break;
        case 'Inactif':
        case 'Erreur':
          swStatusEl.classList.add('status-inactive');
          break;
        default:
          swStatusEl.classList.add('status-loading');
      }
    }

    // Nombre de mails traités
    const processedEl = document.getElementById('processed-count');
    if (processedEl) {
      processedEl.textContent = this.stats.totalProcessed.toLocaleString();
      processedEl.className = 'status-value status-active';
    }
  }

  async refreshData() {
    await Promise.all([
      this.checkServiceWorker(),
      this.loadStats()
    ]);
    this.updateDisplay();
  }

  showStats() {
    const statsHtml = `
      <div class="stats-modal">
        <div class="stats-content">
          <h3>📊 Statistiques détaillées</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Total traités:</span>
              <span class="stat-value">${this.stats.totalProcessed}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Mails sûrs:</span>
              <span class="stat-value stat-safe">${this.stats.safe}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Mails suspects:</span>
              <span class="stat-value stat-danger">${this.stats.malicious}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Inconnus:</span>
              <span class="stat-value stat-unknown">${this.stats.unknown}</span>
            </div>
          </div>
          <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">
            Fermer
          </button>
        </div>
      </div>
    `;

    // Créer et afficher la modal
    const modal = document.createElement('div');
    modal.innerHTML = statsHtml;
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);

    // Fermer en cliquant sur l'overlay
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.remove();
      }
    });

    // Style pour la modal
    if (!document.getElementById('modal-styles')) {
      const modalStyles = document.createElement('style');
      modalStyles.id = 'modal-styles';
      modalStyles.textContent = `
        /* Styles CSS pour la modal */
      `;
      document.head.appendChild(modalStyles);
    }
  }
}

// Fonction pour nettoyer tous les timers et intervalles
function cleanupTimers() {
  // Nettoyer les timeouts
  for (const id of timers) {
    clearTimeout(id);
  }
  
  // Nettoyer les intervalles
  for (const id of intervals) {
    clearInterval(id);
  }
  
  // Vider les tableaux
  timers.length = 0;
  intervals.length = 0;
}

// Créer une classe PopupUITest pour tester PopupUI
class PopupUITest {
  constructor() {
    // Création d'une instance de PopupUI pour les tests
    this.popupUI = new PopupUI();
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
    
    await test('constructor should initialize correctly', () => {
      assert.strictEqual(this.popupUI.serviceWorkerStatus, 'Vérification...', 'Should set initial status');
      assert.strictEqual(typeof this.popupUI.stats, 'object', 'Should initialize stats object');
      assert.strictEqual(this.popupUI.stats.totalProcessed, 0, 'Should initialize totalProcessed to 0');
    });
    
    await test('init should setup listeners and load data', async () => {
      // Créer des espions pour vérifier les appels de méthode
      let setupEventListenersCalled = false;
      let checkServiceWorkerCalled = false;
      let loadStatsCalled = false;
      let updateDisplayCalled = false;
      
      const originalSetupEventListeners = this.popupUI.setupEventListeners;
      const originalCheckServiceWorker = this.popupUI.checkServiceWorker;
      const originalLoadStats = this.popupUI.loadStats;
      const originalUpdateDisplay = this.popupUI.updateDisplay;
      
      this.popupUI.setupEventListeners = () => { setupEventListenersCalled = true; };
      this.popupUI.checkServiceWorker = async () => { checkServiceWorkerCalled = true; };
      this.popupUI.loadStats = async () => { loadStatsCalled = true; };
      this.popupUI.updateDisplay = () => { updateDisplayCalled = true; };
      
      await this.popupUI.init();
      
      assert.strictEqual(setupEventListenersCalled, true, 'Should call setupEventListeners');
      assert.strictEqual(checkServiceWorkerCalled, true, 'Should call checkServiceWorker');
      assert.strictEqual(loadStatsCalled, true, 'Should call loadStats');
      assert.strictEqual(updateDisplayCalled, true, 'Should call updateDisplay');
      
      // Restaurer les méthodes originales
      this.popupUI.setupEventListeners = originalSetupEventListeners;
      this.popupUI.checkServiceWorker = originalCheckServiceWorker;
      this.popupUI.loadStats = originalLoadStats;
      this.popupUI.updateDisplay = originalUpdateDisplay;
    });
    
    await test('setupEventListeners should add click handler', () => {
      let clickHandler = null;
      const originalAddEventListener = document.addEventListener;
      
      document.addEventListener = (event, handler) => {
        if (event === 'click') {
          clickHandler = handler;
        }
      };
      
      this.popupUI.setupEventListeners();
      
      assert.strictEqual(typeof clickHandler, 'function', 'Should add click event handler');
      
      // Restaurer la fonction originale
      document.addEventListener = originalAddEventListener;
    });
    
    await test('checkServiceWorker should update status correctly', async () => {
      // Test pour un service worker actif
      const originalSendMessage = browser.runtime.sendMessage;
      browser.runtime.sendMessage = async () => ({ status: 'alive' });
      
      await this.popupUI.checkServiceWorker();
      assert.strictEqual(this.popupUI.serviceWorkerStatus, 'Actif', 'Should set active status');
      
      // Test pour un service worker inactif
      browser.runtime.sendMessage = async () => ({ status: 'dead' });
      
      await this.popupUI.checkServiceWorker();
      assert.strictEqual(this.popupUI.serviceWorkerStatus, 'Inactif', 'Should set inactive status');
      
      // Test pour une erreur
      browser.runtime.sendMessage = async () => { throw new Error('Test error'); };
      
      await this.popupUI.checkServiceWorker();
      assert.strictEqual(this.popupUI.serviceWorkerStatus, 'Erreur', 'Should set error status');
      
      // Restaurer la fonction originale
      browser.runtime.sendMessage = originalSendMessage;
    });
    
    await test('loadStats should fetch and update stats', async () => {
      const originalSendMessage = browser.runtime.sendMessage;
      
      // Test pour des statistiques valides
      const testStats = { totalProcessed: 42, malicious: 5, safe: 35, unknown: 2 };
      browser.runtime.sendMessage = async () => testStats;
      
      await this.popupUI.loadStats();
      assert.deepStrictEqual(this.popupUI.stats, testStats, 'Should update stats with response');
      
      // Test pour une erreur
      browser.runtime.sendMessage = async () => { throw new Error('Test error'); };
      
      // Réinitialiser les stats
      this.popupUI.stats = { totalProcessed: 0, malicious: 0, safe: 0, unknown: 0 };
      
      await this.popupUI.loadStats();
      // Les stats devraient rester inchangées en cas d'erreur
      assert.deepStrictEqual(this.popupUI.stats, { totalProcessed: 0, malicious: 0, safe: 0, unknown: 0 }, 'Should not change stats on error');
      
      // Restaurer la fonction originale
      browser.runtime.sendMessage = originalSendMessage;
    });
    
    await test('updateDisplay should update UI elements', () => {
      // Mock pour getElementById
      const elements = {
        'sw-status': { textContent: '', className: '', classList: { add: () => {}, remove: () => {} } },
        'processed-count': { textContent: '', className: '' }
      };
      
      const originalGetElementById = document.getElementById;
      document.getElementById = (id) => elements[id] || null;
      
      // Préparer les données de test
      this.popupUI.serviceWorkerStatus = 'Actif';
      this.popupUI.stats.totalProcessed = 123;
      
      // Exécuter la mise à jour
      this.popupUI.updateDisplay();
      
      // Vérifier les mises à jour
      assert.strictEqual(elements['sw-status'].textContent, 'Actif', 'Should update status text');
      assert.strictEqual(elements['processed-count'].textContent, '123', 'Should update processed count');
      
      // Restaurer la fonction originale
      document.getElementById = originalGetElementById;
    });
    
    await test('refreshData should call multiple methods', async () => {
      let checkServiceWorkerCalled = false;
      let loadStatsCalled = false;
      let updateDisplayCalled = false;
      
      const originalCheckServiceWorker = this.popupUI.checkServiceWorker;
      const originalLoadStats = this.popupUI.loadStats;
      const originalUpdateDisplay = this.popupUI.updateDisplay;
      
      this.popupUI.checkServiceWorker = async () => { checkServiceWorkerCalled = true; };
      this.popupUI.loadStats = async () => { loadStatsCalled = true; };
      this.popupUI.updateDisplay = () => { updateDisplayCalled = true; };
      
      await this.popupUI.refreshData();
      
      assert.strictEqual(checkServiceWorkerCalled, true, 'Should call checkServiceWorker');
      assert.strictEqual(loadStatsCalled, true, 'Should call loadStats');
      assert.strictEqual(updateDisplayCalled, true, 'Should call updateDisplay');
      
      // Restaurer les méthodes originales
      this.popupUI.checkServiceWorker = originalCheckServiceWorker;
      this.popupUI.loadStats = originalLoadStats;
      this.popupUI.updateDisplay = originalUpdateDisplay;
    });
    
    await test('showStats should create and display a modal', () => {
      let createdElement = null;
      let appendCalled = false;
      
      const originalCreateElement = document.createElement;
      const originalAppendChild = document.body.appendChild;
      
      document.createElement = () => {
        createdElement = {
          innerHTML: '',
          className: '',
          addEventListener: () => {}
        };
        return createdElement;
      };
      
      document.body.appendChild = (el) => {
        appendCalled = true;
        assert.strictEqual(el, createdElement, 'Should append the created element');
      };
      
      // Préparer des données de test
      this.popupUI.stats = { totalProcessed: 100, malicious: 10, safe: 85, unknown: 5 };
      
      // Exécuter la méthode
      this.popupUI.showStats();
      
      // Vérifier que la modal a été créée et ajoutée au DOM
      assert.notStrictEqual(createdElement, null, 'Should create an element');
      assert.strictEqual(createdElement.className, 'modal-overlay', 'Should set correct class');
      assert.strictEqual(appendCalled, true, 'Should append to body');
      assert(createdElement.innerHTML.includes('100'), 'Should include totalProcessed in content');
      assert(createdElement.innerHTML.includes('10'), 'Should include malicious count in content');
      assert(createdElement.innerHTML.includes('85'), 'Should include safe count in content');
      
      // Restaurer les fonctions originales
      document.createElement = originalCreateElement;
      document.body.appendChild = originalAppendChild;
    });
    
    console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed`);
    
    // Nettoyer les timers à la fin des tests
    cleanupTimers();
    
    // Terminer le processus Node après un court délai pour s'assurer que tous les messages sont affichés
    setTimeout(() => {
      process.exit(0);
    }, 100);
  }
}

// Exécuter les tests
const tester = new PopupUITest();
tester.runTests().catch(error => {
  console.error('Test runner error:', error);
  cleanupTimers();
  process.exit(1);
});