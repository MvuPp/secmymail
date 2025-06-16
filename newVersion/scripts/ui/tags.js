/**
 * Interface de gestion des tags
 */
class TagsUI {
  constructor() {
    this.tagManager = null;
    this.tagStates = {};
    this.init();
  }

  async init() {
    try {
      // Importer le TagManager depuis le background
      await this.loadTagManager();
      await this.loadTagStates();
      this.renderTags();
      this.setupEventListeners();
      console.log('[TagsUI] Interface initialisée');
    } catch (error) {
      console.error('[TagsUI] Erreur initialisation:', error);
    }
  }

  async loadTagManager() {
    try {
      // Récupérer les états des tags depuis le background
      const response = await browser.runtime.sendMessage({
        action: 'getTagStates'
      });
      
      if (response && response.success) {
        this.tagStates = response.data || {};
      }
    } catch (error) {
      console.error('[TagsUI] Erreur chargement TagManager:', error);
      // Utiliser les données par défaut
      this.tagStates = this.getDefaultTagStates();
    }
  }

  async loadTagStates() {
    try {
      const result = await browser.storage.local.get(['tagStates']);
      if (result.tagStates) {
        this.tagStates = result.tagStates;
      } else {
        this.tagStates = this.getDefaultTagStates();
      }
    } catch (error) {
      console.error('[TagsUI] Erreur chargement états:', error);
      this.tagStates = this.getDefaultTagStates();
    }
  }

  getDefaultTagStates() {
    return {
      "secmymail.expediteur_malveillant": {
        key: "secmymail.expediteur_malveillant",
        label: "🔴 Expéditeur Malveillant",
        color: "#FF0000",
        active: true
      },
      "secmymail.expediteur_suspect": {
        key: "secmymail.expediteur_suspect",
        label: "🟠 Expéditeur Suspect",
        color: "#FF8C00",
        active: true
      },
      "secmymail.expediteur_sur": {
        key: "secmymail.expediteur_sur",
        label: "🟢 Expéditeur Sûr",
        color: "#32CD32",
        active: true
      },
      "secmymail.lien_malveillant": {
        key: "secmymail.lien_malveillant",
        label: "🔴 Lien Malveillant",
        color: "#DC143C",
        active: true
      },
      "secmymail.lien_suspect": {
        key: "secmymail.lien_suspect",
        label: "🟠 Lien Suspect",
        color: "#FFA500",
        active: true
      },
      "secmymail.lien_sur": {
        key: "secmymail.lien_sur",
        label: "🟢 Lien Sûr",
        color: "#228B22",
        active: true
      },
      "secmymail.fichier_malveillant": {
        key: "secmymail.fichier_malveillant",
        label: "🔴 Fichier Malveillant",
        color: "#B22222",
        active: true
      },
      "secmymail.fichier_suspect": {
        key: "secmymail.fichier_suspect",
        label: "🟠 Fichier Suspect",
        color: "#DAA520",
        active: true
      },
      "secmymail.fichier_sur": {
        key: "secmymail.fichier_sur",
        label: "🟢 Fichier Sûr",
        color: "#2E8B57",
        active: true
      }
    };
  }

  renderTags() {
    this.renderCategoryTags('email-tags', [
      'secmymail.expediteur_malveillant',
      'secmymail.expediteur_suspect',
      'secmymail.expediteur_sur'
    ]);

    this.renderCategoryTags('link-tags', [
      'secmymail.lien_malveillant',
      'secmymail.lien_suspect',
      'secmymail.lien_sur'
    ]);

    this.renderCategoryTags('file-tags', [
      'secmymail.fichier_malveillant',
      'secmymail.fichier_suspect',
      'secmymail.fichier_sur'
    ]);
  }

  renderCategoryTags(containerId, tagKeys) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = tagKeys.map(tagKey => {
      const tagState = this.tagStates[tagKey];
      if (!tagState) return '';

      return `
        <div class="tag-item" data-tag="${tagKey}">
          <input type="color" 
                 class="color-picker" 
                 value="${tagState.color}" 
                 data-tag="${tagKey}"
                 title="Couleur du tag">
          <span class="tag-name">${tagState.label}</span>
          <label class="toggle-switch">
            <input type="checkbox" 
                   class="tag-toggle" 
                   data-tag="${tagKey}" 
                   ${tagState.active !== false ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      `;
    }).join('');
  }

  setupEventListeners() {
    // Navigation
    document.getElementById('back-btn')?.addEventListener('click', () => {
      window.history.back();
    });

    document.getElementById('home-btn')?.addEventListener('click', () => {
      window.location.href = 'popup.html';
    });

    // Sauvegarder
    document.getElementById('save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });

    // Réinitialiser
    document.getElementById('reset-settings')?.addEventListener('click', () => {
      this.resetSettings();
    });

    // Toggles des tags
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('tag-toggle')) {
        this.handleTagToggle(e.target);
      } else if (e.target.classList.contains('color-picker')) {
        this.handleColorChange(e.target);
      }
    });
  }

  handleTagToggle(toggle) {
    const tagKey = toggle.dataset.tag;
    const isActive = toggle.checked;
    
    if (this.tagStates[tagKey]) {
      this.tagStates[tagKey].active = isActive;
      console.log(`[TagsUI] Tag ${tagKey} ${isActive ? 'activé' : 'désactivé'}`);
    }
  }

  handleColorChange(colorPicker) {
    const tagKey = colorPicker.dataset.tag;
    const newColor = colorPicker.value;
    
    if (this.tagStates[tagKey]) {
      this.tagStates[tagKey].color = newColor;
      console.log(`[TagsUI] Couleur du tag ${tagKey} changée: ${newColor}`);
    }
  }

  async saveSettings() {
    try {
      // Sauvegarder dans le storage local
      await browser.storage.local.set({ tagStates: this.tagStates });
      
      // Notifier le background
      await browser.runtime.sendMessage({
        action: 'updateTagStates',
        data: this.tagStates
      });
      
      this.showMessage('Paramètres sauvegardés', 'success');
    } catch (error) {
      console.error('[TagsUI] Erreur sauvegarde:', error);
      this.showMessage('Erreur lors de la sauvegarde', 'error');
    }
  }

  async resetSettings() {
    try {
      this.tagStates = this.getDefaultTagStates();
      
      await browser.storage.local.set({ tagStates: this.tagStates });
      
      // Notifier le background
      await browser.runtime.sendMessage({
        action: 'updateTagStates',
        data: this.tagStates
      });
      
      this.renderTags();
      this.showMessage('Paramètres réinitialisés', 'success');
    } catch (error) {
      console.error('[TagsUI] Erreur réinitialisation:', error);
      this.showMessage('Erreur lors de la réinitialisation', 'error');
    }
  }

  showMessage(message, type = 'info') {
    // Utiliser le système de toast du fichier common.js si disponible
    if (window.SecMyMailUtils && window.SecMyMailUtils.Toast) {
      window.SecMyMailUtils.Toast.show(message, type);
    } else {
      // Créer un toast simple
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
      `;
      
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.remove();
      }, 3000);
    }
  }
}

// Initialiser
document.addEventListener('DOMContentLoaded', () => {
  new TagsUI();
});