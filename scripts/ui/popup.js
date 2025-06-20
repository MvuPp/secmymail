import { writeLog } from "../../modules/core/logger.js";
/**
 * Interface principale du popup
 */
class PopupUI {
  constructor() {
    this.serviceWorkerStatus = 'Vérification...';
    this.stats = { totalProcessed: 0, malicious: 0, safe: 0, unknown: 0 };
    this.init();
  }

  async init() {
    try {
      this.setupEventListeners();
      await this.checkServiceWorker();
      await this.loadStats();
      this.updateDisplay();
      console.log('[PopupUI] Interface initialisée');
      writeLog('info', 'popup.js', 'Interface popup initialisée avec succès');
    } catch (error) {
      console.error('[PopupUI] Erreur initialisation:', error);
      writeLog('error', 'popup.js', `Erreur lors de l'initialisation de l'interface: ${error.message}`);
    }
  }

  /**
   * Configuration des listeners
   */
  setupEventListeners() {
    // Navigation vers les autres pages
    document.addEventListener('click', (event) => {
      // Gestion des boutons sans lien direct
      if (event.target.closest('.menu-button[data-action="stats"]')) {
        event.preventDefault();
        this.showStats();
      }
    });

    // Rafraîchissement périodique
    setInterval(() => {
      this.refreshData();
    }, 30000); // Toutes les 30 secondes
  }

  /**
   * Vérifie l'état du service worker
   */
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
      writeLog('error', 'popup.js', `Erreur lors de la vérification du service worker: ${error.message}`);
      this.serviceWorkerStatus = 'Erreur';
    }
  }

  /**
   * Charge les statistiques
   */
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
      writeLog('error', 'popup.js', `Erreur lors du chargement des statistiques: ${error.message}`);
    }
  }

  /**
   * Met à jour l'affichage
   */
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

  /**
   * Rafraîchit les données
   */
  async refreshData() {
    await Promise.all([
      this.checkServiceWorker(),
      this.loadStats()
    ]);
    this.updateDisplay();
  }

  /**
   * Affiche les statistiques détaillées
   */
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
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .stats-modal {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .stats-content h3 {
          margin: 0 0 1.5rem 0;
          text-align: center;
          color: var(--primary-color);
        }
        .stats-grid {
          display: grid;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          border-radius: 4px;
          background: #f8f9fa;
        }
        .stat-label {
          font-weight: 500;
        }
        .stat-value {
          font-weight: 600;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }
        .stat-safe { background: rgba(40, 167, 69, 0.1); color: #28a745; }
        .stat-danger { background: rgba(220, 53, 69, 0.1); color: #dc3545; }
        .stat-unknown { background: rgba(108, 117, 125, 0.1); color: #6c757d; }
      `;
      document.head.appendChild(modalStyles);
    }
  }
}

// Initialiser quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
  new PopupUI();
});