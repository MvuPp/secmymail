/**
 * Module de gestion du carnet d'adresses
 * Permet de récupérer les contacts et de les ajouter à la liste blanche
 */

// Clés de stockage
const STORAGE_KEYS = {
  ADDRESS_BOOK_SYNC: 'addressBookSync',
  EMAIL_WHITELIST: 'emailWhitelist'
};

/**
 * Gestionnaire du carnet d'adresses
 */
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
      const result = await browser.storage.local.get(STORAGE_KEYS.ADDRESS_BOOK_SYNC);
      
      if (result && result[STORAGE_KEYS.ADDRESS_BOOK_SYNC]) {
        this.syncState = { ...this.syncState, ...result[STORAGE_KEYS.ADDRESS_BOOK_SYNC] };
      } else {
        await this.saveSyncState();
      }
      
      console.log('[AddressBookManager] État de synchronisation chargé:', this.syncState);
    } catch (error) {
      console.error('[AddressBookManager] Erreur chargement état:', error);
    }
  }

  /**
   * Sauvegarde l'état de synchronisation
   */
  async saveSyncState() {
    try {
      await browser.storage.local.set({ 
        [STORAGE_KEYS.ADDRESS_BOOK_SYNC]: this.syncState 
      });
      
      console.log('[AddressBookManager] État de synchronisation sauvegardé');
    } catch (error) {
      console.error('[AddressBookManager] Erreur sauvegarde état:', error);
    }
  }

  /**
   * Récupère les carnets d'adresses
   */
  async getAddressBooks() {
    try {
      const addressBooks = await browser.addressBooks.list();
      return addressBooks;
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
      const contacts = await browser.addressBooks.contacts.list(parentId);
      return contacts;
    } catch (error) {
      console.error(`[AddressBookManager] Erreur récupération contacts (${parentId}):`, error);
      return [];
    }
  }

    /**
     * Récupère tous les contacts de tous les carnets
     */
    async getAllContacts() {
        try {
            const addressBooks = await this.getAddressBooks();
            const allEmails = [];
            
            if (addressBooks && addressBooks.length > 0) {
            for (const book of addressBooks) {
                console.log(`[AddressBookManager] Traitement carnet: ${book.name}`);
                
                try {
                const contacts = await this.listAddressBook(book.id);
                console.log(`[AddressBookManager] ${contacts.length} contacts trouvés dans "${book.name}"`);
                
                if (contacts && contacts.length > 0) {
                    contacts.forEach(contact => {
                    // Extraire les emails depuis la vCard si disponible
                    if (contact.vCard) {
                        // Rechercher toutes les occurrences d'emails dans la vCard
                        const emailMatches = contact.vCard.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
                        
                        if (emailMatches) {
                        emailMatches.forEach(email => {
                            if (!allEmails.includes(email)) {
                            allEmails.push(email);
                            console.log(`[AddressBookManager] Email trouvé: ${email}`);
                            }
                        });
                        }
                    }
                    
                    // Rechercher également dans les propriétés du contact
                    if (contact.properties) {
                        Object.entries(contact.properties).forEach(([key, value]) => {
                        if (typeof value === 'string' && value.includes('@') && value.includes('.')) {
                            // Extraire l'email avec une regex simple
                            const emailMatch = value.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
                            if (emailMatch && !allEmails.includes(emailMatch[0])) {
                            allEmails.push(emailMatch[0]);
                            console.log(`[AddressBookManager] Email trouvé dans propriété ${key}: ${emailMatch[0]}`);
                            }
                        }
                        });
                    }
                    
                    // Chercher dans les champs PrimaryEmail et SecondEmail directement
                    ['PrimaryEmail', 'SecondEmail', 'email'].forEach(field => {
                        if (contact[field] && typeof contact[field] === 'string' && 
                            contact[field].includes('@') && !allEmails.includes(contact[field])) {
                        allEmails.push(contact[field]);
                        console.log(`[AddressBookManager] Email trouvé dans ${field}: ${contact[field]}`);
                        }
                    });
                    });
                }
                } catch (error) {
                console.error(`[AddressBookManager] Erreur traitement carnet "${book.name}":`, error);
                }
            }
            }
            
            console.log(`[AddressBookManager] ${allEmails.length} adresses email trouvées`);
            return allEmails;
        } catch (error) {
            console.error('[AddressBookManager] Erreur récupération contacts:', error);
            return [];
        }
    }

    /**
     * Ajoute des emails à la liste blanche
     */
    async addToWhitelist(emails) {
        if (!emails || emails.length === 0) return { added: 0 };
        
        try {
            // Récupérer la liste blanche actuelle
            const result = await browser.storage.local.get('emailWhitelist');
            let whitelist = result.emailWhitelist || [];
            
            let addedCount = 0;
            
            // Pour chaque email à ajouter
            for (const email of emails) {
            // Vérifier si l'email existe déjà dans l'un des formats
            const existsAsString = whitelist.includes(email);
            const existsAsObject = whitelist.some(item => 
                typeof item === 'object' && item.value === email
            );
            
            if (!existsAsString && !existsAsObject) {
                // Simplement ajouter l'email en tant que chaîne
                whitelist.push(email);
                addedCount++;
                console.log(`[AddressBookManager] Email ajouté à la liste blanche: ${email}`);
            }
            }
            
            if (addedCount > 0) {
            await browser.storage.local.set({ emailWhitelist: whitelist });
            console.log(`[AddressBookManager] ${addedCount} adresses ajoutées à la liste blanche`);
            } else {
            console.log('[AddressBookManager] Aucune nouvelle adresse à ajouter');
            }
            
            return { added: addedCount, total: whitelist.length };
        } catch (error) {
            console.error('[AddressBookManager] Erreur ajout à la liste blanche:', error);
            return { added: 0, error: error.message };
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
      
      // Si aucun contact trouvé
      if (allEmails.length === 0) {
        console.log('[AddressBookManager] Aucun contact trouvé');
        return { success: false, message: 'Aucun contact trouvé' };
      }
      
      // Ajouter les emails à la liste blanche
      const result = await this.addToWhitelist(allEmails);
      
      // Mettre à jour l'état de synchronisation
      this.syncState.lastSync = new Date().toISOString();
      this.syncState.contactCount = allEmails.length;
      await this.saveSyncState();
      
      return { 
        success: true, 
        added: result.added,
        total: result.total,
        contactCount: allEmails.length,
        lastSync: this.syncState.lastSync
      };
    } catch (error) {
      console.error('[AddressBookManager] Erreur synchronisation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Active ou désactive la synchronisation automatique
   */
  async toggleSync(enabled) {
    try {
      this.syncState.enabled = enabled;
      await this.saveSyncState();
      
      console.log(`[AddressBookManager] Synchronisation ${enabled ? 'activée' : 'désactivée'}`);
      
      // Si activé, effectuer une synchronisation immédiate
      if (enabled) {
        return await this.syncAddressBook();
      }
      
      return { success: true, enabled };
    } catch (error) {
      console.error('[AddressBookManager] Erreur activation/désactivation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupère l'état de synchronisation
   */
  getSyncState() {
    return this.syncState;
  }
}

// Instance singleton
const addressBookManager = new AddressBookManager();

export { addressBookManager };