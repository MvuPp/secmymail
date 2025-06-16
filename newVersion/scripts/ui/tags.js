/**
 * Interface de gestion des tags - Version simplifiée
 */
class TagsUI {
  constructor() {
    this.tagManager = null;
    this.tagStates = {};
    this.quarantineOptions = {};
    this.saveTimeout = null;
    this.isSaving = false;
    this.activeColorPicker = null;
    this.predefinedColors = [
      '#E53E3E', '#FF6B35', '#38A169', '#00B5D8', '#3182CE',
      '#805AD5', '#F59E0B', '#EC4899', '#A0522D', '#4A5568',
      '#DC2626', '#059669', '#7C3AED', '#BE185D', '#0369A1'
    ];
    this.init();
  }

  async init() {
    try {
      await this.loadTagStatesFromBackground();
      await this.loadQuarantineOptions();
      await this.loadAvailableFolders();
      await this.loadQuarantineStats();
      this.renderTags();
      this.renderQuarantineOptions();
      this.setupEventListeners();
      this.updateSaveButton();
      console.log('[TagsUI] Interface simplifiée initialisée');
    } catch (error) {
      console.error('[TagsUI] Erreur initialisation:', error);
    }
  }

  /**
   * Charge les options de quarantaine
   */
  async loadQuarantineOptions() {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'getQuarantineOptions'
      });
      
      if (response && response.success) {
        this.quarantineOptions = response.data;
      } else {
        this.quarantineOptions = this.getDefaultQuarantineOptions();
      }
      
      console.log('[TagsUI] Options de quarantaine chargées');
    } catch (error) {
      console.error('[TagsUI] Erreur chargement options quarantaine:', error);
      this.quarantineOptions = this.getDefaultQuarantineOptions();
    }
  }

  /**
   * Options par défaut simplifiées
   */
  getDefaultQuarantineOptions() {
    return {
      enabled: false,
      folder: 'INBOX/SecMyMail-Quarantine',
      quarantineExpediteursmalveillants: true,
      quarantineLiensMalveillants: true,
      quarantineFichiersMalveillants: true
    };
  }

  /**
   * Charge les dossiers disponibles
   */
  async loadAvailableFolders() {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'getAvailableFolders'
      });
      
      if (response && response.success) {
        this.availableFolders = response.folders;
      } else {
        this.availableFolders = [];
      }
    } catch (error) {
      console.error('[TagsUI] Erreur chargement dossiers:', error);
      this.availableFolders = [];
    }
  }

  /**
   * Charge les statistiques
   */
  async loadQuarantineStats() {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'getQuarantineStats'
      });
      
      if (response && response.success) {
        this.quarantineStats = response.data;
      } else {
        this.quarantineStats = { totalQuarantined: 0 };
      }
    } catch (error) {
      console.error('[TagsUI] Erreur chargement stats:', error);
      this.quarantineStats = { totalQuarantined: 0 };
    }
  }

  /**
   * Rend les options de quarantaine
   */
  renderQuarantineOptions() {
    // Toggle principal
    const enableToggle = document.getElementById('enable-quarantine');
    if (enableToggle) {
      enableToggle.checked = this.quarantineOptions.enabled;
    }

    // Sélection du dossier
    const folderSelect = document.getElementById('quarantine-folder');
    if (folderSelect) {
      // Ajouter les dossiers disponibles
      if (this.availableFolders && this.availableFolders.length > 0) {
        this.availableFolders.forEach(folder => {
          if (!Array.from(folderSelect.options).some(opt => opt.value === folder.path)) {
            const option = document.createElement('option');
            option.value = folder.path;
            option.textContent = folder.name;
            folderSelect.appendChild(option);
          }
        });
      }
      
      folderSelect.value = this.quarantineOptions.folder || '';
    }

    // Checkboxes des types de menaces
    const expediteurCheck = document.getElementById('quarantine-expediteur');
    if (expediteurCheck) {
      expediteurCheck.checked = this.quarantineOptions.quarantineExpediteursmalveillants;
    }

    const liensCheck = document.getElementById('quarantine-liens');
    if (liensCheck) {
      liensCheck.checked = this.quarantineOptions.quarantineLiensMalveillants;
    }

    const fichiersCheck = document.getElementById('quarantine-fichiers');
    if (fichiersCheck) {
      fichiersCheck.checked = this.quarantineOptions.quarantineFichiersMalveillants;
    }

    // Statistiques
    const totalMoved = document.getElementById('total-moved');
    if (totalMoved) {
      totalMoved.textContent = this.quarantineStats.totalQuarantined || 0;
    }

    // Mise à jour de la visibilité
    this.updateOptionsVisibility();
  }

  /**
   * Met à jour la visibilité des options
   */
  updateOptionsVisibility() {
    const enabled = document.getElementById('enable-quarantine')?.checked || false;
    
    const folderSection = document.getElementById('folder-selection');
    const threatsSection = document.getElementById('threats-selection');
    
    if (folderSection) {
      folderSection.classList.toggle('disabled', !enabled);
    }
    
    if (threatsSection) {
      threatsSection.classList.toggle('disabled', !enabled);
    }
  }

  setupEventListeners() {
    // Navigation
    document.getElementById('back-btn')?.addEventListener('click', () => {
      window.history.back();
    });

    // Actions
    document.getElementById('save-settings')?.addEventListener('click', () => {
      this.manualSave();
    });

    document.getElementById('reset-settings')?.addEventListener('click', () => {
      this.resetToDefaults();
    });

    // Options de quarantaine
    document.getElementById('enable-quarantine')?.addEventListener('change', (e) => {
      this.quarantineOptions.enabled = e.target.checked;
      this.updateOptionsVisibility();
      this.saveQuarantineOptions();
    });

    document.getElementById('quarantine-folder')?.addEventListener('change', (e) => {
      this.quarantineOptions.folder = e.target.value;
      this.saveQuarantineOptions();
    });

    document.getElementById('quarantine-expediteur')?.addEventListener('change', (e) => {
      this.quarantineOptions.quarantineExpediteursmalveillants = e.target.checked;
      this.saveQuarantineOptions();
    });

    document.getElementById('quarantine-liens')?.addEventListener('change', (e) => {
      this.quarantineOptions.quarantineLiensMalveillants = e.target.checked;
      this.saveQuarantineOptions();
    });

    document.getElementById('quarantine-fichiers')?.addEventListener('change', (e) => {
      this.quarantineOptions.quarantineFichiersMalveillants = e.target.checked;
      this.saveQuarantineOptions();
    });

    // Tags (délégation d'événements)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('color-picker-btn') || e.target.closest('.color-picker-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const button = e.target.classList.contains('color-picker-btn') ? e.target : e.target.closest('.color-picker-btn');
        this.showColorPopup(button);
      }
      else if (e.target.classList.contains('color-option')) {
        e.preventDefault();
        e.stopPropagation();
        this.handleColorSelection(e.target);
      }
      else if (e.target.classList.contains('color-popup-close')) {
        e.preventDefault();
        e.stopPropagation();
        this.hideColorPopup();
      }
      else if (!e.target.closest('.color-popup') && document.querySelector('.color-popup')) {
        this.hideColorPopup();
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('tag-toggle')) {
        this.handleTagToggle(e.target);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.querySelector('.color-popup')) {
        this.hideColorPopup();
      }
    });
  }

  /**
   * Sauvegarde les options de quarantaine
   */
  async saveQuarantineOptions() {
    try {
      console.log('[TagsUI] 💾 Sauvegarde options quarantaine');
      
      const response = await browser.runtime.sendMessage({
        action: 'updateQuarantineOptions',
        data: this.quarantineOptions
      });
      
      if (response && response.success) {
        console.log('[TagsUI] ✅ Options quarantaine sauvegardées');
        this.showMessage('Options de déplacement sauvegardées', 'success');
      } else {
        throw new Error(response?.error || 'Erreur sauvegarde options');
      }
      
    } catch (error) {
      console.error('[TagsUI] ❌ Erreur sauvegarde options quarantaine:', error);
      this.showMessage('Erreur sauvegarde des options', 'error');
    }
  }

  // ... (conserver toutes les autres méthodes pour les tags comme loadTagStatesFromBackground, getMinimalDefaultStates, renderTags, etc.) ...

  /**
   * Charge les états des tags depuis le background service
   */
  async loadTagStatesFromBackground() {
    try {
      console.log('[TagsUI] Chargement des états depuis le background...');
      
      const response = await browser.runtime.sendMessage({
        action: 'getTagStates'
      });
      
      if (response && response.success && response.data) {
        this.tagStates = response.data;
        console.log('[TagsUI] États des tags chargés depuis le background');
      } else {
        console.warn('[TagsUI] Échec chargement depuis background, utilisation des valeurs par défaut');
        await this.loadDefaultStatesFromBackground();
      }
    } catch (error) {
      console.error('[TagsUI] Erreur chargement depuis background:', error);
      await this.loadDefaultStatesFromBackground();
    }
  }

  async loadDefaultStatesFromBackground() {
    try {
      const pingResponse = await browser.runtime.sendMessage({
        action: 'ping'
      });
      
      if (pingResponse && pingResponse.status === 'active') {
        const response = await browser.runtime.sendMessage({
          action: 'getTagStates'
        });
        
        if (response && response.success && response.data) {
          this.tagStates = response.data;
          console.log('[TagsUI] États par défaut récupérés du background');
          return;
        }
      }
      
      this.tagStates = this.getMinimalDefaultStates();
      console.warn('[TagsUI] Utilisation des états minimaux locaux');
      
    } catch (error) {
      console.error('[TagsUI] Erreur chargement états par défaut:', error);
      this.tagStates = this.getMinimalDefaultStates();
    }
  }

  getMinimalDefaultStates() {
    return {
      "secmymail.expediteur_malveillant": {
        key: "secmymail.expediteur_malveillant",
        label: "Expéditeur Malveillant",
        color: "#FF0000",
        active: true
      },
      "secmymail.expediteur_suspect": {
        key: "secmymail.expediteur_suspect",
        label: "Expéditeur Suspect",
        color: "#FF8C00",
        active: true
      },
      "secmymail.expediteur_sur": {
        key: "secmymail.expediteur_sur",
        label: "Expéditeur Sûr",
        color: "#32CD32",
        active: true
      },
      "secmymail.lien_malveillant": {
        key: "secmymail.lien_malveillant",
        label: "Lien Malveillant",
        color: "#FF0000",
        active: true
      },
      "secmymail.lien_suspect": {
        key: "secmymail.lien_suspect",
        label: "Lien Suspect",
        color: "#FF8C00",
        active: true
      },
      "secmymail.lien_sur": {
        key: "secmymail.lien_sur",
        label: "Lien Sûr",
        color: "#32CD32",
        active: true
      },
      "secmymail.fichier_malveillant": {
        key: "secmymail.fichier_malveillant",
        label: "Fichier Malveillant",
        color: "#FF0000",
        active: true
      },
      "secmymail.fichier_suspect": {
        key: "secmymail.fichier_suspect",
        label: "Fichier Suspect",
        color: "#FF8C00",
        active: true
      },
      "secmymail.fichier_sur": {
        key: "secmymail.fichier_sur",
        label: "Fichier Sûr",
        color: "#32CD32",
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
          <button class="color-picker-btn" 
                  data-tag="${tagKey}"
                  style="background-color: ${tagState.color}"
                  title="Choisir la couleur du tag">
            <span class="color-dot"></span>
          </button>
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

  updateSaveButton() {
    // Logique de mise à jour du bouton de sauvegarde
  }

  manualSave() {
    // Sauvegarde manuelle
    this.showMessage('Paramètres sauvegardés', 'success');
  }

  async resetToDefaults() {
    try {
      console.log('[TagsUI] 🔄 Réinitialisation');
      
      // Reset des tags
      this.tagStates = this.getMinimalDefaultStates();
      
      // Reset des options quarantaine
      this.quarantineOptions = this.getDefaultQuarantineOptions();
      
      // Sauvegarder
      await this.saveQuarantineOptions();
      
      // Rerender
      this.renderTags();
      this.renderQuarantineOptions();
      
      this.showMessage('Paramètres réinitialisés', 'success');
      
    } catch (error) {
      console.error('[TagsUI] Erreur réinitialisation:', error);
      this.showMessage('Erreur lors de la réinitialisation', 'error');
    }
  }

  showMessage(message, type = 'info') {
    console.log(`[TagsUI] 📢 ${message} (${type})`);
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const bgColor = {
      'success': '#28a745',
      'error': '#dc3545',
      'warning': '#ffc107',
      'info': '#007bff'
    }[type] || '#007bff';
    
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: ${type === 'warning' ? 'black' : 'white'};
      font-weight: 600;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      background: ${bgColor};
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Méthodes pour les couleurs (à conserver pour la fonctionnalité des tags)
  createColorPopup() {
    const popup = document.createElement('div');
    popup.className = 'color-popup';
    popup.innerHTML = `
      <div class="color-popup-header">
        <h4>Choisir une couleur</h4>
        <button class="color-popup-close">&times;</button>
      </div>
      <div class="color-popup-grid">
        ${this.predefinedColors.map(color => 
          `<div class="color-option" style="background-color: ${color}" data-color="${color}"></div>`
        ).join('')}
      </div>
    `;
    return popup;
  }

  showColorPopup(colorButton) {
    this.hideColorPopup();
    
    const popup = this.createColorPopup();
    document.body.appendChild(popup);
    
    const currentColor = colorButton.style.backgroundColor || colorButton.dataset.color;
    const currentColorHex = this.rgbToHex(currentColor);
    
    const colorOptions = popup.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
      if (option.dataset.color === currentColorHex) {
        option.classList.add('selected');
      }
    });
    
    this.positionPopup(popup, colorButton);
    
    requestAnimationFrame(() => {
      popup.classList.add('show');
    });
    
    this.activeColorPicker = {
      popup: popup,
      button: colorButton,
      element: colorButton
    };
    
    document.body.classList.add('color-picking');
    console.log('[TagsUI] 🎨 Popup couleur ouverte pour', colorButton.dataset.tag);
  }

  positionPopup(popup, colorButton) {
    const buttonRect = colorButton.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    let left = buttonRect.left + buttonRect.width / 2 - popupRect.width / 2;
    let top = buttonRect.bottom + 8;
    
    if (left + popupRect.width > viewport.width - 16) {
      left = viewport.width - popupRect.width - 16;
    }
    if (left < 16) {
      left = 16;
    }
    
    if (top + popupRect.height > viewport.height - 16) {
      top = buttonRect.top - popupRect.height - 8;
    }
    
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  hideColorPopup() {
    const existingPopup = document.querySelector('.color-popup');
    if (existingPopup) {
      existingPopup.classList.remove('show');
      setTimeout(() => {
        existingPopup.remove();
      }, 200);
    }
    
    this.activeColorPicker = null;
    document.body.classList.remove('color-picking');
    console.log('[TagsUI] 🎨 Popup couleur fermée');
  }

  async handleColorSelection(colorOption) {
    if (!this.activeColorPicker) return;
    
    const newColor = colorOption.dataset.color;
    const tagKey = this.activeColorPicker.button.dataset.tag;
    const oldColor = this.tagStates[tagKey]?.color;
    
    console.log(`[TagsUI] 🎨 Changement couleur: ${tagKey} ${oldColor} → ${newColor}`);
    
    this.tagStates[tagKey].color = newColor;
    
    this.activeColorPicker.element.style.backgroundColor = newColor;
    
    this.hideColorPopup();
    
    await this.saveColorChange(tagKey, newColor, oldColor);
  }

  async saveColorChange(tagKey, newColor, oldColor) {
    try {
      console.log(`[TagsUI] 💾 Sauvegarde couleur via background: ${tagKey}`);
      
      const updateStatesResponse = await browser.runtime.sendMessage({
        action: 'updateTagStates',
        data: this.tagStates
      });
      
      if (!updateStatesResponse || !updateStatesResponse.success) {
        throw new Error(updateStatesResponse?.error || 'Échec updateTagStates');
      }
      
      const updateColorResponse = await browser.runtime.sendMessage({
        action: 'updateTagColor',
        tagKey: tagKey,
        color: newColor,
        oldColor: oldColor
      });
      
      if (updateColorResponse && updateColorResponse.success) {
        console.log('[TagsUI] ✅ Couleur appliquée dans Thunderbird');
        this.showMessage(`Couleur mise à jour: ${newColor}`, 'success');
      } else if (updateColorResponse && updateColorResponse.warning) {
        console.warn('[TagsUI] ⚠️ Couleur sauvegardée mais pas appliquée:', updateColorResponse.warning);
        this.showMessage('Couleur sauvegardée', 'warning');
      } else {
        console.warn('[TagsUI] ⚠️ Échec application couleur Thunderbird:', updateColorResponse?.error);
        this.showMessage('Couleur sauvegardée', 'warning');
      }
      
      console.log('[TagsUI] ✅ Couleur sauvegardée avec succès');
      
    } catch (error) {
      console.error(`[TagsUI] ❌ Erreur sauvegarde couleur:`, error);
      
      this.tagStates[tagKey].color = oldColor;
      const element = this.activeColorPicker?.element;
      if (element) {
        element.style.backgroundColor = oldColor;
      }
      
      this.showMessage('Erreur lors de la sauvegarde', 'error');
    }
  }

  handleTagToggle(toggleInput) {
    const tagKey = toggleInput.dataset.tag;
    const isEnabled = toggleInput.checked;
    
    if (this.tagStates[tagKey]) {
      this.tagStates[tagKey].active = isEnabled;
      console.log(`[TagsUI] 🏷️ Toggle tag: ${tagKey} → ${isEnabled ? 'activé' : 'désactivé'}`);
      
      this.saveTagStates();
    }
  }

  async saveTagStates() {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'updateTagStates',
        data: this.tagStates
      });
      
      if (response && response.success) {
        console.log('[TagsUI] ✅ États des tags sauvegardés');
      }
    } catch (error) {
      console.error('[TagsUI] ❌ Erreur sauvegarde états tags:', error);
    }
  }

  rgbToHex(rgb) {
    if (rgb.startsWith('#')) return rgb;
    
    const result = rgb.match(/\d+/g);
    if (!result || result.length < 3) return rgb;
    
    return "#" + ((1 << 24) + (parseInt(result[0]) << 16) + (parseInt(result[1]) << 8) + parseInt(result[2])).toString(16).slice(1);
  }
}

// Initialiser
document.addEventListener('DOMContentLoaded', () => {
  console.log('[TagsUI] 🚀 Initialisation interface simplifiée');
  new TagsUI();
});