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
      await this.loadAddressBookState();
      this.renderTags();
      this.renderQuarantineOptions();
      this.renderAddressBookOptions();
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
        console.log('[TagsUI] Options de quarantaine chargées:', this.quarantineOptions);
      } else {
        this.quarantineOptions = this.getDefaultQuarantineOptions();
        console.warn('[TagsUI] Utilisation des options de quarantaine par défaut');
      }
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
        console.log(`[TagsUI] ${this.availableFolders.length} dossiers disponibles chargés`);
      } else {
        this.availableFolders = [];
        console.warn('[TagsUI] Aucun dossier disponible:', response?.error);
      }
    } catch (error) {
      console.error('[TagsUI] Erreur chargement dossiers:', error);
      this.availableFolders = [];
    }
  }

  /**
   * Charge l'état de synchronisation du carnet d'adresses
   */
  async loadAddressBookState() {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'getAddressBookSyncState'
      });
      
      if (response && response.success) {
        this.addressBookState = response.data;
        console.log('[TagsUI] État synchronisation carnet chargé:', this.addressBookState);
      } else {
        this.addressBookState = { enabled: false, lastSync: null, contactCount: 0 };
        console.warn('[TagsUI] Utilisation état carnet par défaut');
      }
    } catch (error) {
      console.error('[TagsUI] Erreur chargement état carnet:', error);
      this.addressBookState = { enabled: false, lastSync: null, contactCount: 0 };
    }
  }

  /**
   * Rend les options de quarantaine
   */
  renderQuarantineOptions() {
    try {
      // Toggle principal
      const enableToggle = document.getElementById('enable-quarantine');
      if (enableToggle) {
        enableToggle.checked = this.quarantineOptions.enabled || false;
        console.log(`[TagsUI] Statut déplacement automatique: ${enableToggle.checked ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
      }

      // Sélection du dossier
      const folderSelect = document.getElementById('quarantine-folder');
      if (folderSelect) {
        // Vider d'abord les options personnalisées pour éviter les doublons
        const defaultOptions = Array.from(folderSelect.options).filter(option => 
          ['', 'INBOX/SecMyMail-Quarantine', 'Junk', 'Trash'].includes(option.value)
        );
        folderSelect.innerHTML = '';
        
        // Réajouter les options par défaut
        defaultOptions.forEach(option => folderSelect.appendChild(option));
        
        // Ajouter les dossiers disponibles
        if (this.availableFolders && this.availableFolders.length > 0) {
          // Créer un groupe d'options pour les dossiers disponibles
          const optgroup = document.createElement('optgroup');
          optgroup.label = 'Dossiers disponibles';
          
          this.availableFolders.forEach(folder => {
            // Éviter les doublons
            if (!Array.from(folderSelect.options).some(opt => opt.value === folder.path)) {
              const option = document.createElement('option');
              option.value = folder.path;
              option.textContent = folder.name;
              optgroup.appendChild(option);
            }
          });
          
          if (optgroup.children.length > 0) {
            folderSelect.appendChild(optgroup);
          }
        }
        
        // Définir la valeur sélectionnée
        folderSelect.value = this.quarantineOptions.folder || '';
        console.log(`[TagsUI] Dossier de quarantaine: ${folderSelect.value}`);
      }

      // Checkboxes des types de menaces
      const expediteurCheck = document.getElementById('quarantine-expediteur');
      if (expediteurCheck) {
        expediteurCheck.checked = this.quarantineOptions.quarantineExpediteursmalveillants !== false;
      }

      const liensCheck = document.getElementById('quarantine-liens');
      if (liensCheck) {
        liensCheck.checked = this.quarantineOptions.quarantineLiensMalveillants !== false;
      }

      const fichiersCheck = document.getElementById('quarantine-fichiers');
      if (fichiersCheck) {
        fichiersCheck.checked = this.quarantineOptions.quarantineFichiersMalveillants !== false;
      }

      // Mise à jour de la visibilité
      this.updateOptionsVisibility();
    } catch (error) {
      console.error('[TagsUI] Erreur rendu options quarantaine:', error);
    }
  }

  /**
   * Rend les options du carnet d'adresses
   */
  renderAddressBookOptions() {
    try {
      // Toggle principal
      const enableToggle = document.getElementById('enable-address-book');
      if (enableToggle) {
        enableToggle.checked = this.addressBookState.enabled || false;
      }

      // Statistiques
      const statusElement = document.getElementById('address-book-status');
      if (statusElement) {
        if (this.addressBookState.lastSync) {
          const date = new Date(this.addressBookState.lastSync);
          statusElement.textContent = `Dernière synchronisation: ${date.toLocaleString()}`;
        } else {
          statusElement.textContent = 'Dernière synchronisation: jamais';
        }
      }

      const countElement = document.getElementById('contact-count');
      if (countElement) {
        countElement.textContent = this.addressBookState.contactCount || 0;
      }

      // Mise à jour de la visibilité
      this.updateAddressBookVisibility();
    } catch (error) {
      console.error('[TagsUI] Erreur rendu options carnet:', error);
    }
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
      
      // Désactiver ou activer les contrôles dans cette section
      const folderSelect = folderSection.querySelector('select');
      if (folderSelect) {
        folderSelect.disabled = !enabled;
      }
    }
    
    if (threatsSection) {
      threatsSection.classList.toggle('disabled', !enabled);
      
      // Désactiver ou activer les contrôles dans cette section
      const checkboxes = threatsSection.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.disabled = !enabled;
      });
    }
    
    console.log(`[TagsUI] Visibilité des options mise à jour (enabled=${enabled})`);
  }

  /**
   * Met à jour la visibilité des options du carnet d'adresses
   */
  updateAddressBookVisibility() {
    const enabled = document.getElementById('enable-address-book')?.checked || false;
    
    const statsSection = document.getElementById('address-book-stats');
    
    if (statsSection) {
      statsSection.classList.toggle('disabled', !enabled);
      
      // Désactiver ou activer le bouton
      const syncButton = document.getElementById('sync-now');
      if (syncButton) {
        syncButton.disabled = !enabled;
      }
    }
    
    console.log(`[TagsUI] Visibilité du carnet mise à jour (enabled=${enabled})`);
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

    // Options de quarantaine avec validation supplémentaire
    const enableToggle = document.getElementById('enable-quarantine');
    if (enableToggle) {
      enableToggle.addEventListener('change', (e) => {
        const newValue = e.target.checked;
        console.log(`[TagsUI] Changement état déplacement: ${newValue ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
        
        this.quarantineOptions.enabled = newValue;
        this.updateOptionsVisibility();
        this.saveQuarantineOptions();
        
        // Montrer un message approprié
        if (newValue) {
          this.showMessage('Déplacement automatique activé', 'success');
        } else {
          this.showMessage('Déplacement automatique désactivé', 'info');
        }
      });
    }

    const folderSelect = document.getElementById('quarantine-folder');
    if (folderSelect) {
      folderSelect.addEventListener('change', (e) => {
        const newValue = e.target.value;
        if (!newValue) {
          this.showMessage('Veuillez sélectionner un dossier valide', 'warning');
          return;
        }
        
        console.log(`[TagsUI] Changement dossier: ${newValue}`);
        this.quarantineOptions.folder = newValue;
        this.saveQuarantineOptions();
      });
    }

    // Ajouter des écouteurs d'événements pour les checkboxes de types de menaces
    const expediteurCheck = document.getElementById('quarantine-expediteur');
    if (expediteurCheck) {
      expediteurCheck.addEventListener('change', (e) => {
        this.quarantineOptions.quarantineExpediteursmalveillants = e.target.checked;
        console.log(`[TagsUI] Quarantaine expéditeurs: ${e.target.checked ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
        this.saveQuarantineOptions();
      });
    }

    const liensCheck = document.getElementById('quarantine-liens');
    if (liensCheck) {
      liensCheck.addEventListener('change', (e) => {
        this.quarantineOptions.quarantineLiensMalveillants = e.target.checked;
        console.log(`[TagsUI] Quarantaine liens: ${e.target.checked ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
        this.saveQuarantineOptions();
      });
    }

    const fichiersCheck = document.getElementById('quarantine-fichiers');
    if (fichiersCheck) {
      fichiersCheck.addEventListener('change', (e) => {
        this.quarantineOptions.quarantineFichiersMalveillants = e.target.checked;
        console.log(`[TagsUI] Quarantaine fichiers: ${e.target.checked ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
        this.saveQuarantineOptions();
      });
    }

    // Options de carnet d'adresses
    document.getElementById('enable-address-book')?.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      this.toggleAddressBookSync(enabled);
    });

    document.getElementById('sync-now')?.addEventListener('click', () => {
      this.syncAddressBookNow();
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
    
    // Ajouter un listener pour détecter si l'utilisateur quitte la page
    window.addEventListener('beforeunload', (e) => {
      if (this.isSaving) {
        e.preventDefault();
        e.returnValue = 'Des modifications sont en cours de sauvegarde. Voulez-vous vraiment quitter ?';
        return e.returnValue;
      }
    });
  }

  /**
   * Sauvegarde les options de quarantaine
   */
  async saveQuarantineOptions() {
    try {
      console.log('[TagsUI] 💾 Sauvegarde options quarantaine');
      
      // Vérifier que les données sont valides avant envoi
      if (this.quarantineOptions.enabled && !this.quarantineOptions.folder) {
        this.quarantineOptions.folder = 'INBOX/SecMyMail-Quarantine';
        document.getElementById('quarantine-folder').value = this.quarantineOptions.folder;
      }
      
      const response = await browser.runtime.sendMessage({
        action: 'updateQuarantineOptions',
        options: this.quarantineOptions // Corriger la clé en "options" au lieu de "data"
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

  /**
   * Active ou désactive la synchronisation du carnet d'adresses
   */
  async toggleAddressBookSync(enabled) {
    try {
      console.log(`[TagsUI] Changement synchronisation carnet: ${enabled ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
      
      this.updateAddressBookVisibility();
      
      const response = await browser.runtime.sendMessage({
        action: 'toggleAddressBookSync',
        enabled: enabled
      });
      
      if (response && response.success) {
        this.showMessage(`Synchronisation carnet ${enabled ? 'activée' : 'désactivée'}`, 'success');
        
        // Si c'est une activation avec synchronisation immédiate
        if (enabled && response.added !== undefined) {
          this.addressBookState = {
            enabled: true,
            lastSync: response.lastSync,
            contactCount: response.contactCount
          };
          this.renderAddressBookOptions();
          
          this.showMessage(`${response.added} contacts ajoutés à la liste blanche`, 'success');
        }
      } else {
        throw new Error(response?.error || 'Erreur activation/désactivation');
      }
    } catch (error) {
      console.error('[TagsUI] Erreur toggle synchronisation:', error);
      this.showMessage('Erreur activation/désactivation synchronisation', 'error');
      
      // Réinitialiser le toggle
      const enableToggle = document.getElementById('enable-address-book');
      if (enableToggle) {
        enableToggle.checked = !enabled;
      }
    }
  }

  /**
   * Déclenche une synchronisation immédiate du carnet d'adresses
   */
  async syncAddressBookNow() {
    try {
      console.log('[TagsUI] Synchronisation carnet demandée');
      
      // Désactiver le bouton pendant la synchronisation
      const syncButton = document.getElementById('sync-now');
      if (syncButton) {
        syncButton.disabled = true;
        syncButton.innerHTML = '<span class="btn-icon">⏳</span> Synchronisation...';
      }
      
      const response = await browser.runtime.sendMessage({
        action: 'syncAddressBook'
      });
      
      if (response && response.success) {
        this.addressBookState = {
          enabled: true,
          lastSync: response.lastSync,
          contactCount: response.contactCount
        };
        this.renderAddressBookOptions();
        
        this.showMessage(`${response.added} contacts ajoutés à la liste blanche`, 'success');
      } else {
        throw new Error(response?.error || response?.message || 'Erreur synchronisation');
      }
    } catch (error) {
      console.error('[TagsUI] Erreur synchronisation carnet:', error);
      this.showMessage('Erreur synchronisation carnet', 'error');
    } finally {
      // Réactiver le bouton
      const syncButton = document.getElementById('sync-now');
      if (syncButton) {
        syncButton.disabled = false;
        syncButton.innerHTML = '<span class="btn-icon">🔄</span> Synchroniser maintenant';
      }
    }
  }

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
  
      // Utiliser le label du tagState ou générer un label par défaut
      const label = tagState.label || this.getDefaultLabel(tagKey);
  
      return `
        <div class="tag-item" data-tag="${tagKey}">
          <button class="color-picker-btn" 
                  data-tag="${tagKey}"
                  style="background-color: ${tagState.color || '#666666'}"
                  title="Choisir la couleur du tag">
            <span class="color-dot"></span>
          </button>
          <span class="tag-name">${label}</span>
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
  
  /**
   * Génère un label par défaut basé sur la clé du tag
   */
  getDefaultLabel(tagKey) {
    const labelMap = {
      'secmymail.expediteur_malveillant': 'Expéditeur Malveillant',
      'secmymail.expediteur_suspect': 'Expéditeur Suspect',
      'secmymail.expediteur_sur': 'Expéditeur Sûr',
      'secmymail.lien_malveillant': 'Lien Malveillant',
      'secmymail.lien_suspect': 'Lien Suspect',
      'secmymail.lien_sur': 'Lien Sûr',
      'secmymail.fichier_malveillant': 'Fichier Malveillant',
      'secmymail.fichier_suspect': 'Fichier Suspect',
      'secmymail.fichier_sur': 'Fichier Sûr'
    };
    
    return labelMap[tagKey] || tagKey.replace('secmymail.', '').replace(/_/g, ' ');
  }

  updateSaveButton() {
    const saveButton = document.getElementById('save-settings');
    if (saveButton) {
      saveButton.disabled = this.isSaving;
      saveButton.textContent = this.isSaving ? 'Sauvegarde en cours...' : 'Sauvegarder les modifications';
    }
  }

  async manualSave() {
    try {
      console.log('[TagsUI] 💾 Sauvegarde manuelle');
      this.isSaving = true;
      this.updateSaveButton();
      
      // Sauvegarder les états des tags
      await this.saveTagStates();
      
      // Sauvegarder les options de quarantaine
      await this.saveQuarantineOptions();
      
      this.showMessage('Paramètres sauvegardés', 'success');
    } catch (error) {
      console.error('[TagsUI] Erreur sauvegarde manuelle:', error);
      this.showMessage('Erreur lors de la sauvegarde', 'error');
    } finally {
      this.isSaving = false;
      this.updateSaveButton();
    }
  }

  async resetToDefaults() {
    try {
      console.log('[TagsUI] 🔄 Réinitialisation');
      this.isSaving = true;
      this.updateSaveButton();
      
      // Reset des tags
      this.tagStates = this.getMinimalDefaultStates();
      await this.saveTagStates();
      
      // Reset des options quarantaine
      this.quarantineOptions = this.getDefaultQuarantineOptions();
      await this.saveQuarantineOptions();
      
      // Reset des options carnet d'adresses
      this.addressBookState = { enabled: false, lastSync: null, contactCount: 0 };
      await this.toggleAddressBookSync(false);
      
      // Recharger les options depuis le background
      await this.loadQuarantineOptions();
      
      // Rerender
      this.renderTags();
      this.renderQuarantineOptions();
      this.renderAddressBookOptions();
      
      this.showMessage('Paramètres réinitialisés', 'success');
      
    } catch (error) {
      console.error('[TagsUI] Erreur réinitialisation:', error);
      this.showMessage('Erreur lors de la réinitialisation', 'error');
    } finally {
      this.isSaving = false;
      this.updateSaveButton();
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
        return true;
      } else {
        console.error('[TagsUI] Erreur réponse sauvegarde tags:', response?.error);
        return false;
      }
    } catch (error) {
      console.error('[TagsUI] ❌ Erreur sauvegarde états tags:', error);
      return false;
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