import { storage, STORAGE_KEYS } from '../../modules/core/storage.js';

class LogsUI {
  constructor() {}

  async init() {
    try {
      await storage.initialize(); // S'assure que le stockage sécurisé est prêt
      this.setupEventListeners();
      await this.updateInterface();
    } catch (error) {
      this.showError('Erreur lors de l\'initialisation');
    }
  }

  setupEventListeners() {
    document.getElementById('back-btn')?.addEventListener('click', () => {
      window.history.length > 1 ? window.history.back() : window.location.href = 'popup.html';
    });

    document.getElementById('export-logs')?.addEventListener('click', () => this.exportLogs());

    document.getElementById('clear-current-logs')?.addEventListener('click', () => this.confirmClearLogs());
  }

  async updateInterface() {
    await this.renderLogs();
  }

  async getLogs() {
    try {
      await storage.initialize();
      return await storage.get(STORAGE_KEYS.LOGS, {});
    } catch {
      return {};
    }
  }

  async renderLogs() {
    const logs = await this.getLogs();
    const container = document.getElementById("logsList");
    container.innerHTML = "";

    if (!logs || Object.keys(logs).length === 0) {
      container.innerHTML = `<div class="empty-list"><span class="empty-icon">📝</span><p>Aucun log enregistré pour le moment.</p></div>`;
      return;
    }

    Object.keys(logs)
      .sort()
      .reverse()
      .forEach((day) => {
        const dayDiv = document.createElement("div");
        dayDiv.className = "log-day";
        dayDiv.innerHTML = `<h3>${day}</h3>`;
        logs[day].forEach((entry) => {
          const entryDiv = document.createElement("div");
          entryDiv.className = "log-entry";
          entryDiv.innerHTML = `
            <span class="log-date">${this.escapeHtml(entry.date)}</span>
            <span class="log-type">[${this.escapeHtml(entry.type)}]</span>
            <span class="log-source">[${this.escapeHtml(entry.source)}]</span>
            <span class="log-info">${this.escapeHtml(entry.info)}</span>
          `;
          dayDiv.appendChild(entryDiv);
        });
        container.appendChild(dayDiv);
      });
  }

  async exportLogs() {
    try {
      const logs = await this.getLogs();
      let lines = [];

      // En-tête pour clarifier le format
      lines.push("# SecMyMail Logs Export");
      lines.push("# Format: DATE,TYPE,SOURCE,DETAILS");
      lines.push("# Generated: " + new Date().toISOString());
      lines.push("");

      // Traiter tous les logs par ordre chronologique
      Object.keys(logs).sort().forEach(day => {
        logs[day].forEach(entry => {
          // Nettoyer et échapper les données pour éviter les problèmes de format
          const cleanDate = (entry.date || '').replace(/,/g, ' ');
          const cleanType = (entry.type || '').replace(/,/g, ' ');
          const cleanSource = (entry.source || '').replace(/,/g, ' ');
          const cleanInfo = (entry.info || '').replace(/,/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');

          // Format: DATE,TYPE,SOURCE,DETAILS
          lines.push(`${cleanDate},${cleanType},${cleanSource},${cleanInfo}`);
        });
      });

      // Créer le fichier avec l'extension .logs
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `secmymail-logs-${new Date().toISOString().split('T')[0]}.logs`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showSuccess('Logs exportés avec succès au format .logs');
    } catch (error) {
      console.error('Erreur lors de l\'export des logs:', error);
      this.showError('Erreur lors de l\'export des logs');
    }
  }

  confirmClearLogs() {
    // Création d'une pop-up de confirmation personnalisée
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    const popup = document.createElement('div');
    popup.className = 'popup-confirm';

    popup.innerHTML = `
      <h3>Vider les logs ?</h3>
      <p>Cette action supprimera définitivement tous les logs.<br>Voulez-vous continuer ?</p>
      <div class="popup-actions">
        <button class="btn btn-danger" id="confirm-clear-logs">Oui, vider</button>
        <button class="btn btn-secondary" id="cancel-clear-logs">Annuler</button>
      </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    document.getElementById('confirm-clear-logs').onclick = async () => {
      await storage.set(STORAGE_KEYS.LOGS, {});
      await this.renderLogs();
      document.body.removeChild(overlay);
    };

    document.getElementById('cancel-clear-logs').onclick = () => {
      document.body.removeChild(overlay);
    };
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showError(msg) {
    this.showMessage(msg, 'error');
  }

  showSuccess(msg) {
    this.showMessage(msg, 'success');
  }

  showMessage(message, type = 'info') {
    // Créer un conteneur de messages s'il n'existe pas
    let container = document.querySelector('.message-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'message-container';
      container.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        pointer-events: none; max-width: 350px;
      `;
      document.body.appendChild(container);
    }

    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;

    const colors = {
      success: '#28a745',
      error: '#dc3545',
      info: '#007bff',
      warning: '#ffc107'
    };

    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };

    messageEl.style.cssText = `
      background: ${colors[type] || colors.info}; color: white;
      padding: 15px 20px; margin-bottom: 10px; border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: auto;
      animation: slideInRight 0.3s ease-out; font-size: 14px;
      display: flex; align-items: center; gap: 10px;
      border-left: 4px solid rgba(255,255,255,0.3);
    `;

    messageEl.innerHTML = `
      <span style="font-size: 16px;">${icons[type] || icons.info}</span>
      <span>${message}</span>
    `;

    container.appendChild(messageEl);

    // Auto-suppression après 4 secondes
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
          if (messageEl.parentNode) messageEl.parentNode.removeChild(messageEl);
        }, 300);
      }
    }, 4000);
  }
}

// CSS pour les animations et styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }

  .log-entry {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    margin: 4px 0;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
    border-left: 3px solid #007bff;
    font-family: 'Courier New', monospace;
    font-size: 13px;
  }

  .log-date {
    color: #28a745;
    font-weight: 600;
    min-width: 160px;
  }

  .log-type {
    color: #ffc107;
    font-weight: 600;
    min-width: 80px;
  }

  .log-source {
    color: #17a2b8;
    font-weight: 600;
    min-width: 120px;
  }

  .log-info {
    color: #e9ecef;
    flex: 1;
    word-break: break-word;
  }

  .log-entry:hover {
    background: rgba(255,255,255,0.1);
  }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
  const logsUI = new LogsUI();
  logsUI.init();
});