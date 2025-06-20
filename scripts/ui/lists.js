import { writeLog } from '../../modules/core/logger.js';
/**
 * Interface de gestion des listes blanches et noires - Adaptée au HTML existant
 */

// Import du StorageManager pour les opérations de stockage direct
let storage = null;
let STORAGE_KEYS = null;

// Initialiser le storage manager dynamiquement
(async () => {
  try {
    const storageModule = await import('../../modules/core/storage.js');
    storage = storageModule.storage;
    STORAGE_KEYS = storageModule.STORAGE_KEYS;
  } catch (error) {
    console.warn('[ListsUI] Impossible d\'importer StorageManager, utilisation fallback');
    writeLog('error', 'lists.js', 'Erreur lors de l\'import du StorageManager: ' + error.message);
  }
})();
class ListsUI {
  constructor() {
    this.emailWhitelist = [];
    this.emailBlacklist = [];
    this.domainWhitelist = [];
    this.domainBlacklist = [];
    this.currentListType = 'whitelist';
    this.currentTab = 'emails';
    this.isTransitioning = false;
    this.currentList = 'email-whitelist';
  }

  async init() {
    try {
      console.log('[ListsUI] 🚀 Initialisation...');
      
      await this.loadData();
      this.setupEventListeners();
      this.updateInterface();
      
      console.log('[ListsUI] ✅ Interface initialisée');
      writeLog('info', 'lists.js', 'Interface de gestion des listes initialisée avec succès');
    } catch (error) {
      console.error('[ListsUI] Erreur initialisation:', error);
      writeLog('error', 'lists.js', 'Erreur lors de l\'initialisation de l\'interface: ' + error.message);
      this.showError('Erreur lors de l\'initialisation');
    }
  }

  /**
   * Charge les données depuis le service worker
   */
  async loadData() {
    try {
      console.log('[ListsUI] 🔄 Chargement des données...');
      
      const response = await browser.runtime.sendMessage({
        action: 'getLists'
      });
      
      if (response && response.success) {
        this.emailWhitelist = response.lists.emailWhitelist || [];
        this.emailBlacklist = response.lists.emailBlacklist || [];
        this.domainWhitelist = response.lists.domainWhitelist || [];
        this.domainBlacklist = response.lists.domainBlacklist || [];
        
        console.log('[ListsUI] 📋 Données chargées:', {
          emailWhitelist: this.emailWhitelist.length,
          emailBlacklist: this.emailBlacklist.length,
          domainWhitelist: this.domainWhitelist.length,
          domainBlacklist: this.domainBlacklist.length
        });
        writeLog('info', 'lists.js', `Données chargées: 
          Email Whitelist: ${this.emailWhitelist.length}, 
          Email Blacklist: ${this.emailBlacklist.length}, 
          Domain Whitelist: ${this.domainWhitelist.length}, 
          Domain Blacklist: ${this.domainBlacklist.length}`);
      } else {
        throw new Error('Impossible de charger les données depuis le service worker');
      }

    } catch (error) {
      console.error('[ListsUI] ❌ Erreur chargement:', error);
      writeLog('error', 'lists.js', 'Erreur lors du chargement des données: ' + error.message);
      this.showError('Erreur lors du chargement des données');
      throw error;
    }
  }

  /**
   * Met à jour l'interface complète
   */
  updateInterface() {
    this.updateListTypeButtons();
    this.updateTabButtons();
    this.showCurrentPanel();
    this.displayCurrentList();
  }

  /**
   * Met à jour les boutons de type de liste
   */
  updateListTypeButtons() {
    document.querySelectorAll('.list-type-button').forEach(button => {
      const isActive = button.dataset.type === this.currentListType;
      button.classList.toggle('active', isActive);
    });
  }

  /**
   * Met à jour les boutons d'onglets
   */
  updateTabButtons() {
    document.querySelectorAll('.tab-button').forEach(button => {
      const isActive = button.dataset.tab === this.currentTab;
      button.classList.toggle('active', isActive);
    });
  }

  /**
   * Affiche le panneau actuel avec transitions
   */
  showCurrentPanel() {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    
    // Masquer tous les panneaux
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.style.display = 'none';
      panel.classList.remove('active');
    });
    
    // Afficher le panneau actuel
    const panelId = `${this.currentTab}-${this.currentListType}`;
    const activePanel = document.getElementById(panelId);
    
    if (activePanel) {
      activePanel.style.display = 'block';
      activePanel.classList.add('active');
      
      // Animation d'entrée
      activePanel.style.opacity = '0';
      activePanel.style.transform = 'translateY(20px)';
      
      requestAnimationFrame(() => {
        activePanel.style.transition = 'all 0.3s ease-out';
        activePanel.style.opacity = '1';
        activePanel.style.transform = 'translateY(0)';
        
        setTimeout(() => {
          activePanel.style.transition = '';
          this.isTransitioning = false;
        }, 300);
      });
    } else {
      console.error(`[ListsUI] Panneau non trouvé: ${panelId}`);
      writeLog('error', 'lists.js', `Panneau non trouvé: ${panelId}`);
      this.isTransitioning = false;
    }
    
    this.currentList = `${this.currentTab.slice(0, -1)}-${this.currentListType}`;
  }

  /**
   * Affiche la liste actuelle dans le bon conteneur
   * CORRECTION: Utilise les vrais IDs du HTML
   */
  displayCurrentList() {
    // Construire l'ID du container selon le format du HTML
    // Format HTML: "email-whitelist-container", "domain-blacklist-container", etc.
    const containerType = this.currentTab === 'emails' ? 'email' : 'domain';
    const containerId = `${containerType}-${this.currentListType}-container`;
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`[ListsUI] Container non trouvé: ${containerId}`);
      writeLog('error', 'lists.js', `Container non trouvé: ${containerId}`);
      return;
    }

    // IDs des éléments empty et items selon le format HTML
    const emptyId = `${containerType}-${this.currentListType}-empty`;
    const itemsId = `${containerType}-${this.currentListType}-items`;
    
    const emptyDiv = document.getElementById(emptyId);
    const itemsDiv = document.getElementById(itemsId);
    
    if (!emptyDiv || !itemsDiv) {
      console.error(`[ListsUI] Éléments non trouvés: ${emptyId} ou ${itemsId}`);
      writeLog('error', 'lists.js', `Éléments non trouvés: ${emptyId} ou ${itemsId}`);
      return;
    }

    const currentData = this.getCurrentListData();
    
    if (currentData.length === 0) {
      emptyDiv.style.display = 'block';
      itemsDiv.style.display = 'none';
    } else {
      emptyDiv.style.display = 'none';
      itemsDiv.style.display = 'block';
      this.renderListItems(itemsDiv, currentData);
    }
  }

  /**
   * Rendu des éléments de liste
   */
  renderListItems(container, data) {
    const itemsHTML = data.map((item, index) => `
      <div class="list-item" data-index="${index}" data-item="${this.escapeHtml(item)}">
        <div class="item-content">
          <span class="item-icon">${this.currentTab === 'emails' ? '📧' : '🌐'}</span>
          <span class="item-text" title="${this.escapeHtml(item)}">${this.escapeHtml(item)}</span>
          <span class="item-meta">
            <span class="item-type">${this.currentListType === 'whitelist' ? 'Autorisé' : 'Bloqué'}</span>
            <span class="item-date">${new Date().toLocaleDateString()}</span>
          </span>
        </div>
        <div class="item-actions">
          <button class="btn-remove" 
                  data-item="${this.escapeHtml(item)}"
                  data-index="${index}"
                  title="Supprimer ${this.escapeHtml(item)}">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = itemsHTML;
    
    // Animation d'entrée pour les éléments
    const items = container.querySelectorAll('.list-item');
    items.forEach((item, index) => {
      item.style.opacity = '0';
      item.style.transform = 'translateX(-20px)';
      item.style.transition = 'all 0.2s ease-out';
      
      setTimeout(() => {
        item.style.opacity = '1';
        item.style.transform = 'translateX(0)';
      }, index * 50);
    });
  }

  /**
   * Obtient les données de la liste actuelle
   */
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
  }

  /**
   * Configuration des listeners d'événements
   */
  setupEventListeners() {
    // Navigation
    document.getElementById('back-btn')?.addEventListener('click', () => {
      window.history.back();
    });

    document.getElementById('home-btn')?.addEventListener('click', () => {
      window.location.href = 'popup.html';
    });

    // Gestion globale des clics
    document.addEventListener('click', (event) => this.handleClick(event));
    
    // Gestion globale des touches Enter
    document.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') this.handleEnterKey(event);
    });

    // Actions globales
    document.getElementById('export-lists')?.addEventListener('click', () => this.exportLists());
    document.getElementById('import-lists')?.addEventListener('click', () => this.importLists());
    document.getElementById('clear-current-list')?.addEventListener('click', () => this.clearCurrentList());

    // Rafraîchissement automatique lors du retour de focus
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('[ListsUI] Page visible, rafraîchissement...');
        writeLog('info', 'lists.js', 'Page visible, rafraîchissement des données');
        setTimeout(() => this.forceRefresh(), 500);
      }
    });
  }

  /**
   * Gestion des clics
   */
  handleClick(event) {
    const target = event.target;

    if (this.isTransitioning) return;

    // Changement de type de liste (whitelist/blacklist)
    if (target.classList.contains('list-type-button') || target.closest('.list-type-button')) {
      const button = target.classList.contains('list-type-button') ? target : target.closest('.list-type-button');
      const newListType = button.dataset.type;
      
      if (newListType && newListType !== this.currentListType) {
        this.handleListTypeChange(newListType);
      }
      return;
    }

    // Changement d'onglet (emails/domains)
    if (target.classList.contains('tab-button') || target.closest('.tab-button')) {
      const button = target.classList.contains('tab-button') ? target : target.closest('.tab-button');
      const newTab = button.dataset.tab;
      
      if (newTab && newTab !== this.currentTab) {
        this.handleTabChange(newTab);
      }
      return;
    }

    // Boutons d'ajout spécifiques
    if (target.id && target.id.startsWith('add-')) {
      this.handleAddButtonClick(target.id);
      return;
    }

    // Boutons de suppression
    if (target.classList.contains('btn-remove')) {
      const item = target.dataset.item;
      if (item) {
        this.removeItem(item);
      }
      return;
    }
  }

  /**
   * Gestion de la touche Entrée
   */
  handleEnterKey(event) {
    const target = event.target;
    
    // Vérifier si c'est un input de liste
    if (target.classList.contains('list-input')) {
      const inputId = target.id;
      
      // Extraire le type et listType de l'ID de l'input
      // Format: "email-whitelist-input" ou "domain-blacklist-input"
      const parts = inputId.replace('-input', '').split('-');
      if (parts.length >= 2) {
        const type = parts[0]; // 'email' ou 'domain'
        const listType = parts[1]; // 'whitelist' ou 'blacklist'
        
        this.addCurrentItemFromInput(target, type, listType);
      }
    }
  }

  /**
   * Gestion des changements de type de liste
   */
  handleListTypeChange(newListType) {
    console.log(`[ListsUI] 📊 Changement vers: ${newListType}`);
    writeLog('info', 'lists.js', `Changement de type de liste vers: ${newListType}`);
    
    this.currentListType = newListType;
    this.updateInterface();
  }

  /**
   * Gestion des changements d'onglet
   */
  handleTabChange(newTab) {
    console.log(`[ListsUI] 📊 Changement d'onglet vers: ${newTab}`);
    writeLog('info', 'lists.js', `Changement d'onglet vers: ${newTab}`);
    
    this.currentTab = newTab;
    this.updateInterface();
  }

  /**
   * Gestion des boutons d'ajout spécifiques
   */
  handleAddButtonClick(buttonId) {
    // Extraire le type et la liste du bouton ID
    // Format: 'add-email-whitelist' -> type='email', listType='whitelist'
    const parts = buttonId.replace('add-', '').split('-');
    if (parts.length >= 2) {
      const type = parts[0]; // 'email' ou 'domain'
      const listType = parts[1]; // 'whitelist' ou 'blacklist'
      
      // Trouver l'input correspondant
      const inputId = `${type}-${listType}-input`;
      const input = document.getElementById(inputId);
      
      if (!input) {
        console.error(`[ListsUI] Input non trouvé: ${inputId}`);
        writeLog('error', 'lists.js', `Input non trouvé: ${inputId}`);
        this.showError('Erreur: input non trouvé');
        return;
      }
      
      this.addCurrentItemFromInput(input, type, listType);
    }
  }

  /**
   * Ajouter un élément depuis un input spécifique
   */  
  async addCurrentItemFromInput(input, type, listType) {
    try {
      const value = input.value.trim();
      
      if (!value) {
        this.showError('Veuillez saisir une valeur');
        this.showInputError(input);
        return;
      }

      // Validation selon le type
      if (type === 'email' && !this.validateEmail(value)) {
        this.showInputError(input);
        return;
      }
      
      if (type === 'domain' && !this.validateDomain(value)) {
        this.showInputError(input);
        return;
      }

      console.log(`[ListsUI] Ajout: ${value} à ${type}-${listType}`);
      writeLog('info', 'lists.js', `Ajout de ${value} à ${type}-${listType}`);
      
      // Désactiver le bouton pendant l'ajout
      const button = document.getElementById(`add-${type}-${listType}`);
      if (button) {
        button.disabled = true;
        button.textContent = 'Ajout...';
      }
      
      const response = await browser.runtime.sendMessage({
        action: listType === 'whitelist' ? 'addToWhitelist' : 'addToBlacklist',
        type: type,
        value: value
      });
      
      if (response && response.success) {
        console.log(`[ListsUI] ✅ Ajouté avec succès`);
        writeLog('info', 'lists.js', `Ajout réussi: ${value} à ${type}-${listType}`);
        
        // Recharger les données et mettre à jour l'interface
        await this.loadData();
        this.updateInterface();
        
        // Nettoyer l'input
        input.value = '';
        
        // Feedback visuel de succès
        this.showInputSuccess(input);
        this.showSuccess(`"${value}" ajouté avec succès`);
      } else {
        throw new Error(response?.error || 'Erreur inconnue');
      }
      
    } catch (error) {
      console.error('[ListsUI] Erreur ajout:', error);
      writeLog('error', 'lists.js', `Erreur lors de l'ajout: ${error.message}`);
      this.showError(`Erreur: ${error.message}`);
      this.showInputError(input);
    } finally {
      // Réactiver le bouton
      const button = document.getElementById(`add-${type}-${listType}`);
      if (button) {
        button.disabled = false;
        button.textContent = listType === 'whitelist' ? 'Ajouter' : 'Bloquer';
      }
    }
  }

  /**
   * Supprimer un élément
   */
  async removeItem(item) {
    const confirmed = await this.showConfirmDialog(`Supprimer "${item}" de la liste ?`);
    if (!confirmed) return;

    try {
      console.log(`[ListsUI] 🗑️ Suppression de: ${item}`);
      
      const response = await browser.runtime.sendMessage({
        action: 'removeFromList',
        listType: this.currentListType,
        type: this.currentTab.slice(0, -1), // 'emails' -> 'email'
        value: item
      });

      console.log(`[ListsUI] 📨 Réponse suppression:`, response);

      if (response && response.success) {
        console.log(`[ListsUI] ✅ Suppression réussie`);
        writeLog('info', 'lists.js', `Suppression réussie: ${item} de la liste ${this.currentListType}`);
        
        // Recharger les données et mettre à jour l'interface
        await this.loadData();
        this.updateInterface();
        
        this.showSuccess(`"${item}" supprimé avec succès`);
      } else {
        console.error(`[ListsUI] ❌ Erreur suppression:`, response);
        writeLog('error', 'lists.js', `Erreur lors de la suppression: ${response?.error || 'Erreur inconnue'}`);
        this.showError(response?.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('[ListsUI] Erreur suppression:', error);
      writeLog('error', 'lists.js', `Erreur lors de la suppression: ${error.message}`);
      this.showError(`Erreur de communication: ${error.message}`);
    }
  }

  /**
   * Force le rafraîchissement de l'interface
   */
  async forceRefresh() {
    try {
      console.log('[ListsUI] 🔄 Rafraîchissement forcé...');
      
      await this.loadData();
      this.updateInterface();
      
      this.showSuccess('Interface mise à jour');
      console.log('[ListsUI] ✅ Rafraîchissement terminé');
      writeLog('info', 'lists.js', 'Rafraîchissement forcé de l\'interface réussi');
    } catch (error) {
      console.error('[ListsUI] Erreur rafraîchissement:', error);
      writeLog('error', 'lists.js', 'Erreur lors du rafraîchissement de l\'interface: ' + error.message);
      this.showError('Erreur lors du rafraîchissement');
    }
  }

  /**
   * Vider la liste courante
   */
  async clearCurrentList() {
    const currentData = this.getCurrentListData();
    
    if (currentData.length === 0) {
      this.showError('La liste est déjà vide');
      return;
    }

    const listName = `${this.currentListType === 'whitelist' ? 'liste blanche' : 'liste noire'} des ${this.currentTab}`;
    const confirmed = await this.showConfirmDialog(
      `Vider complètement la ${listName} ?\n\nCette action supprimera ${currentData.length} élément(s) et ne peut pas être annulée.`
    );
    
    if (!confirmed) return;

    try {
      console.log(`[ListsUI] 🗑️ Vidage de la ${listName}...`);
      
      // Supprimer tous les éléments un par un
      const itemsToRemove = [...currentData];
      let removedCount = 0;
      
      for (const item of itemsToRemove) {
        try {
          const response = await browser.runtime.sendMessage({
            action: 'removeFromList',
            listType: this.currentListType,
            type: this.currentTab.slice(0, -1),
            value: item
          });
          
          if (response && response.success) {
            removedCount++;
          }
          writeLog('info', 'lists.js', `Suppression de ${item} réussie`);
        } catch (error) {
          console.error(`[ListsUI] Erreur suppression ${item}:`, error);
          writeLog('error', 'lists.js', `Erreur lors de la suppression de ${item}: ${error.message}`);
        }
      }

      // Recharger les données et mettre à jour l'interface
      await this.loadData();
      this.updateInterface();
      
      this.showSuccess(`Liste vidée : ${removedCount} élément(s) supprimé(s)`);
    } catch (error) {
      console.error('[ListsUI] Erreur vidage:', error);
      writeLog('error', 'lists.js', 'Erreur lors du vidage de la liste: ' + error.message);
      this.showError('Erreur lors du vidage de la liste');
    }
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * Feedback visuel de succès sur l'input
   */
  showInputSuccess(input) {
    input.style.borderColor = '#28a745';
    input.style.boxShadow = '0 0 0 3px rgba(40, 167, 69, 0.2)';
    
    setTimeout(() => {
      input.style.borderColor = '';
      input.style.boxShadow = '';
    }, 1500);
  }

  /**
   * Feedback visuel d'erreur sur l'input
   */
  showInputError(input) {
    input.style.borderColor = '#dc3545';
    input.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.2)';
    input.style.animation = 'shake 0.5s ease-in-out';
    
    setTimeout(() => {
      input.style.borderColor = '';
      input.style.boxShadow = '';
      input.style.animation = '';
    }, 2000);
  }

  /**
   * Valider une adresse email
   */
  validateEmail(email) {
    if (!email) {
      this.showError('Veuillez saisir une adresse email');
      return false;
    }
    if (!this.isValidEmail(email)) {
      this.showError('Format d\'adresse email invalide');
      return false;
    }
    return true;
  }

  /**
   * Valider un domaine
   */
  validateDomain(domain) {
    if (!domain) {
      this.showError('Veuillez saisir un nom de domaine');
      return false;
    }
    if (!this.isValidDomain(domain)) {
      this.showError('Format de domaine invalide');
      return false;
    }
    return true;
  }

  /**
   * Vérifier si email valide
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Vérifier si domaine valide
   */
  isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }

  /**
   * Échapper le HTML pour éviter les injections
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Exporter les listes au format JSON
   */
  async exportLists() {
    try {
      const data = {
        emailWhitelist: this.emailWhitelist,
        emailBlacklist: this.emailBlacklist,
        domainWhitelist: this.domainWhitelist,
        domainBlacklist: this.domainBlacklist,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `secmymail-lists-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showSuccess('Listes exportées avec succès');
    } catch (error) {
      console.error('[ListsUI] Erreur export:', error);
      this.showError('Erreur lors de l\'export des listes');
    }
  }

  /**
   * Importer des listes depuis un fichier JSON
   */
  importLists() {
    const input = document.getElementById('import-file-input');
    if (!input) {
      console.error('[ListsUI] Input d\'import non trouvé');
      writeLog('error', 'lists.js', 'Input d\'import non trouvé');
      return;
    }
    
    input.click();

    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!this.validateImportData(data)) {
          this.showError('Format de fichier invalide ou données corrompues');
          return;
        }

        const totalItems = (data.emailWhitelist?.length || 0) + 
                          (data.emailBlacklist?.length || 0) + 
                          (data.domainWhitelist?.length || 0) + 
                          (data.domainBlacklist?.length || 0);

        const confirmed = await this.showConfirmDialog(
          `Importer ${totalItems} élément(s) ?\n\nCela remplacera toutes les listes actuelles.\n\nCette action ne peut pas être annulée.`
        );
        
        if (!confirmed) return;

        // Sauvegarder directement dans le storage
        const importData = {
          emailWhitelist: data.emailWhitelist || [],
          emailBlacklist: data.emailBlacklist || [],
          domainWhitelist: data.domainWhitelist || [],
          domainBlacklist: data.domainBlacklist || []
        };

        // Utiliser le StorageManager si disponible, sinon utiliser browser.storage.local
        if (storage) {
          await storage.set(STORAGE_KEYS.EMAIL_WHITELIST, importData.emailWhitelist);
          await storage.set(STORAGE_KEYS.EMAIL_BLACKLIST, importData.emailBlacklist);
          await storage.set(STORAGE_KEYS.DOMAIN_WHITELIST, importData.domainWhitelist);
          await storage.set(STORAGE_KEYS.DOMAIN_BLACKLIST, importData.domainBlacklist);
        } else {
          await browser.storage.local.set(importData);
        }

        // Recharger les données et mettre à jour l'interface
        await this.loadData();
        this.updateInterface();
        
        this.showSuccess(`${totalItems} élément(s) importé(s) avec succès`);

      } catch (error) {
        console.error('[ListsUI] Erreur import:', error);
        if (error instanceof SyntaxError) {
          this.showError('Fichier JSON invalide');
        } else {
          this.showError('Erreur lors de l\'import du fichier');
        }
      }

      // Nettoyer l'input
      event.target.value = '';
    };
  }

  /**
   * Valider les données d'import
   */
  validateImportData(data) {
    return data && 
           typeof data === 'object' &&
           Array.isArray(data.emailWhitelist) &&
           Array.isArray(data.emailBlacklist) &&
           Array.isArray(data.domainWhitelist) &&
           Array.isArray(data.domainBlacklist);
  }

  /**
   * Afficher une boîte de dialogue de confirmation
   */
  async showConfirmDialog(message) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.6); display: flex;
        justify-content: center; align-items: center; z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        backdrop-filter: blur(2px);
      `;
      
      modal.innerHTML = `
        <div style="background: var(--surface-color, #2a2a2a); color: var(--text-color, white);
          padding: 30px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          max-width: 450px; width: 90%; text-align: center; border: 1px solid var(--border-color, #555);">
          <div style="font-size: 48px; color: var(--warning-color, #ffc107); margin-bottom: 20px;">⚠️</div>
          <h3 style="margin: 0 0 15px 0; color: var(--text-color, white); font-size: 18px; font-weight: 600;">Confirmer l'action</h3>
          <p style="margin-bottom: 25px; color: var(--text-muted, #ccc); font-size: 14px; line-height: 1.5; white-space: pre-line;">${message}</p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="confirm-yes" style="background: var(--danger-color, #dc3545); color: white; border: none;
              padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;
              transition: background-color 0.2s;">Confirmer</button>
            <button id="confirm-no" style="background: var(--secondary-color, #6c757d); color: white; border: none;
              padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;
              transition: background-color 0.2s;">Annuler</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      const handleClick = (result) => {
        document.body.removeChild(modal);
        resolve(result);
      };
      
      const yesBtn = modal.querySelector('#confirm-yes');
      const noBtn = modal.querySelector('#confirm-no');
      
      yesBtn.onclick = () => handleClick(true);
      noBtn.onclick = () => handleClick(false);
      modal.onclick = (e) => { if (e.target === modal) handleClick(false); };
      
      // Hover effects
      yesBtn.onmouseover = () => yesBtn.style.backgroundColor = '#c82333';
      yesBtn.onmouseout = () => yesBtn.style.backgroundColor = '#dc3545';
      noBtn.onmouseover = () => noBtn.style.backgroundColor = '#5a6268';
      noBtn.onmouseout = () => noBtn.style.backgroundColor = '#6c757d';
      
      // Focus sur le bouton Annuler par défaut
      noBtn.focus();
    });
  }

  /**
   * Afficher un message de succès
   */
  showSuccess(message) { 
    this.showMessage(message, 'success'); 
  }

  /**
   * Afficher un message d'erreur
   */
  showError(message) { 
    this.showMessage(message, 'error'); 
  }

  /**
   * Afficher un message toast
   */
  showMessage(message, type = 'info') {
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

// CSS pour les animations
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
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    50% { transform: translateX(5px); }
    75% { transform: translateX(-5px); }
  }
  
  .list-item {
    transition: all 0.2s ease-out;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 8px;
    background: var(--item-bg, rgba(255,255,255,0.05));
    border: 1px solid var(--item-border, rgba(255,255,255,0.1));
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .list-item:hover {
    background: var(--item-hover-bg, rgba(255,255,255,0.1));
    transform: translateX(5px);
  }
  
  .item-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }
  
  .item-icon {
    font-size: 18px;
    width: 24px;
    text-align: center;
  }
  
  .item-text {
    flex: 1;
    font-weight: 500;
    word-break: break-all;
    color: var(--text-color, white);
  }
  
  .item-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 11px;
    color: var(--text-muted, #999);
    gap: 2px;
    margin-right: 10px;
  }
  
  .item-type {
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 3px;
    background: var(--type-bg, rgba(255,255,255,0.1));
    font-size: 10px;
  }
  
  .item-date {
    font-size: 10px;
    opacity: 0.7;
  }
  
  .btn-remove {
    background: var(--danger-color, #dc3545);
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
    min-width: 40px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .btn-remove:hover {
    background: var(--danger-hover, #c82333);
    transform: scale(1.05);
  }
  
  .btn-remove:active {
    transform: scale(0.95);
  }
`;
document.head.appendChild(style);

// Initialiser l'interface au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  const listsUI = new ListsUI();
  listsUI.init();
});