/**
 * Tags Manager - Gestion des tags SecMyMail - Basé sur tags.js existant
 */

import { storage, STORAGE_KEYS } from './storage.js';

class TagManager {
  constructor() {
    this.tagStates = {};
    this.initialized = false;
    this.tags = {}; // Cache des tags créés
    
    // Utiliser la même structure que votre tags.js existant
    this.tagsData = {
      "secmymail.expediteur_malveillant": {
        color: "#FF0000",
        tag: "Expéditeur Malveillant",
        default_color: "#FF0000"
      },
      "secmymail.expediteur_suspect": {
        color: "#FF8C00",
        tag: "Expéditeur Suspect",
        default_color: "#FF8C00"
      },
      "secmymail.expediteur_sur": {
        color: "#32CD32",
        tag: "Expéditeur Sûr",
        default_color: "#32CD32"
      },
      "secmymail.lien_malveillant": {
        color: "#FF0000",
        tag: "Lien Malveillant",
        default_color: "#FF0000"
      },
      "secmymail.lien_suspect": {
        color: "#FF8C00",
        tag: "Lien Suspect",
        default_color: "#FF8C00"
      },
      "secmymail.lien_sur": {
        color: "#32CD32",
        tag: "Lien Sûr",
        default_color: "#32CD32"
      },
      "secmymail.fichier_malveillant": {
        color: "#FF0000",
        tag: "Fichier Malveillant",
        default_color: "#FF0000"
      },
      "secmymail.fichier_suspect": {
        color: "#FF8C00",
        tag: "Fichier Suspect",
        default_color: "#FF8C00"
      },
      "secmymail.fichier_sur": {
        color: "#32CD32",
        tag: "Fichier Sûr",
        default_color: "#32CD32"
      }
    };
    
    console.log('[Tags] TagManager créé avec structure tags.js');
  }

  async initialize() {
    try {
      console.log('[Tags] Initialisation...');
      
      await this.initTags(); // Utiliser la méthode de votre tags.js
      await this.loadTagStates();
      await this.validateTagMapping();
      await this.checkMissingTags();
      await this.saveTagStates();
      
      this.initialized = true;
      const activeCount = Object.values(this.tagStates).filter(t => t.active !== false).length;
      console.log(`[Tags] ✓ Initialisé avec ${activeCount} tags configurés`);
      
      return true;
    } catch (error) {
      console.error('[Tags] Erreur initialisation:', error);
      return false;
    }
  }

  /**
   * Initialise les tags en fonction des données stockées - Adapté de tags.js
   */
  async initTags() {
    try {
      console.log('[Tags] Initialisation des tags via API Thunderbird...');
      
      // Vérifier si l'API tags existe
      if (!browser.messages.tags) {
        console.warn('[Tags] ⚠️ API browser.messages.tags non disponible');
        return;
      }
      
      const tagList = await browser.messages.tags.list();
      console.log(`[Tags] Tags existants trouvés: ${tagList.length}`);
      
      const tagDict = Object.fromEntries(tagList.map(tag => [tag.key, tag]));

      for (const [key, data] of Object.entries(this.tagsData)) {
        try {
          if (key in tagDict) {
            const existingTag = tagDict[key];
            // Vérifier si la couleur a changé
            if (existingTag.color !== data.color) {
              console.log(`[Tags] Mise à jour couleur du tag existant: ${key} (${existingTag.color} → ${data.color})`);
              // CORRECTION: Ne passer que la couleur, pas le label
              await browser.messages.tags.update(key, {
                color: data.color
              });
            } else {
              console.log(`[Tags] Tag ${key} déjà à jour`);
            }
            this.tags[key] = existingTag;
          } else {
            console.log(`[Tags] Création du nouveau tag: ${key}`);
            this.tags[key] = await browser.messages.tags.create(key, data.tag, data.color);
          }
        } catch (tagError) {
          console.warn(`[Tags] Erreur avec tag ${key}:`, tagError.message);
          // Continuer avec les autres tags
        }
      }

      console.log(`[Tags] ✓ Tags initialisés: ${Object.keys(this.tags).length} créés/mis à jour`);
      
    } catch (error) {
      console.error('[Tags] Erreur lors de l\'initialisation des tags:', error);
      // Ne pas faire échouer l'initialisation complète
    }
  }

  async loadTagStates() {
    try {
      console.log('[Tags] Chargement des états des tags...');
      
      const stored = await storage.get(STORAGE_KEYS.TAG_STATES);
      
      if (stored && Object.keys(stored).length > 0) {
        console.log('[Tags] États des tags chargés depuis le storage');
        this.tagStates = stored;
      } else {
        console.log('[Tags] Aucun état de tag trouvé, utilisation des valeurs par défaut');
        // Initialiser avec tous les tags actifs par défaut
        this.tagStates = {};
        for (const tagKey of Object.keys(this.tagsData)) {
          this.tagStates[tagKey] = {
            key: tagKey,
            label: this.tagsData[tagKey].tag,
            color: this.tagsData[tagKey].color,
            active: true
          };
        }
      }
      
      console.log(`[Tags] États des tags chargés: ${Object.keys(this.tagStates).length}`);
      
    } catch (error) {
      console.error('[Tags] Erreur chargement états tags:', error);
      // Valeurs par défaut en cas d'erreur
      this.tagStates = {};
      for (const tagKey of Object.keys(this.tagsData)) {
        this.tagStates[tagKey] = {
          key: tagKey,
          label: this.tagsData[tagKey].tag,
          color: this.tagsData[tagKey].color,
          active: true
        };
      }
    }
  }

  async saveTagStates() {
    try {
      await storage.set(STORAGE_KEYS.TAG_STATES, this.tagStates);
      console.log('[Tags] États des tags sauvegardés');
    } catch (error) {
      console.error('[Tags] Erreur sauvegarde états tags:', error);
    }
  }

  async validateTagMapping() {
    const requiredTags = Object.keys(this.tagsData);
    
    for (const tagKey of requiredTags) {
      if (!this.tagStates[tagKey]) {
        console.log(`[Tags] Tag manquant détecté: ${tagKey}`);
        this.tagStates[tagKey] = {
          key: tagKey,
          label: this.tagsData[tagKey].tag,
          color: this.tagsData[tagKey].color,
          active: true
        };
      }
    }
    
    console.log('[Tags] ✓ Validation du mapping terminée');
  }

  async checkMissingTags() {
    console.log('[Tags] Vérification des tags manquants...');
    
    const requiredTags = Object.keys(this.tagsData);
    const missingTags = [];
    
    for (const tagKey of requiredTags) {
      if (!this.tagStates[tagKey] || !this.tagStates[tagKey].active) {
        missingTags.push(tagKey);
      }
    }
    
    if (missingTags.length > 0) {
      console.log(`[Tags] Tags manquants trouvés: ${missingTags.length}`);
      
      for (const tagKey of missingTags) {
        this.tagStates[tagKey] = {
          key: tagKey,
          label: this.tagsData[tagKey].tag,
          color: this.tagsData[tagKey].color,
          active: true
        };
        console.log(`[Tags] Tag ${tagKey} configuré`);
      }
    } else {
      console.log('[Tags] Tous les tags sont déjà configurés');
    }
  }

  async getTagStates() {
    return this.tagStates;
  }

  /**
   * Vérifie si un tag est activé - Adapté de tags.js
   */
  isTagEnabled(tagKey) {
    try {
      return this.tagStates[tagKey]?.active !== false; // Par défaut activé
    } catch (error) {
      console.error('[Tags] Erreur lors de la vérification de l\'état du tag:', error);
      return true; // Par défaut activé en cas d'erreur
    }
  }

  /**
   * Application de tag adaptée de votre applyTagToMail - VERSION CORRIGÉE
   */
  async applyTag(messageId, tagKey) {
    try {
      console.log(`[Tags] Application du tag ${tagKey} sur message ${messageId}`);
      
      // Vérifier si le tag est activé
      if (!this.isTagEnabled(tagKey)) {
        console.warn(`[Tags] Le tag ${tagKey} est désactivé.`);
        return false;
      }

      // Vérifier si l'API tags est disponible
      if (!browser.messages.tags) {
        console.warn('[Tags] ⚠️ API tags non disponible, utilisation du fallback');
        return await this.applyTagFallback(messageId, tagKey);
      }

      try {
        // S'assurer que le tag existe
        const allTags = await browser.messages.tags.list();
        const tagExists = allTags.find(t => t.key === tagKey);

        if (!tagExists) {
          console.log(`[Tags] Création du tag manquant: ${tagKey}`);
          const tagDef = this.tagsData[tagKey];
          if (!tagDef) {
            console.error(`[Tags] Tag non défini dans tagsData: ${tagKey}`);
            return false;
          }
          await browser.messages.tags.create(tagKey, tagDef.tag, tagDef.color);
          console.log(`[Tags] ✓ Tag ${tagKey} créé`);
        }

        // Récupérer le message et ses tags actuels
        const message = await browser.messages.get(messageId);
        const existingTags = message.tags || [];

        console.log(`[Tags] Tags existants sur message ${messageId}:`, existingTags);

        if (!existingTags.includes(tagKey)) {
          existingTags.push(tagKey);
          await browser.messages.update(messageId, { tags: existingTags });
          
          console.log(`[Tags] ✓ Tag ${tagKey} ajouté. Nouveaux tags:`, existingTags);
          
          // Vérification post-application
          await new Promise(resolve => setTimeout(resolve, 200));
          const verifiedMessage = await browser.messages.get(messageId);
          const verifiedTags = verifiedMessage.tags || [];
          
          if (verifiedTags.includes(tagKey)) {
            console.log(`[Tags] ✅ Tag ${tagKey} appliqué et vérifié avec succès`);
            return true;
          } else {
            console.warn(`[Tags] ⚠️ Tag ${tagKey} non présent après vérification:`, verifiedTags);
            return false;
          }
        } else {
          console.log(`[Tags] Le message ${messageId} a déjà le tag ${tagKey}`);
          return true;
        }
        
      } catch (apiError) {
        console.error(`[Tags] Erreur API lors de l'application du tag ${tagKey}:`, apiError);
        return await this.applyTagFallback(messageId, tagKey);
      }
      
    } catch (error) {
      console.error(`[Tags] Erreur générale lors de l'application du tag ${tagKey}:`, error);
      return false;
    }
  }

  /**
   * Méthode de fallback pour l'application de tags
   */
  async applyTagFallback(messageId, tagKey) {
    try {
      console.log(`[Tags] 🔄 Fallback: stockage simulé pour tag ${tagKey} sur message ${messageId}`);
      
      const simulatedTags = await storage.get('simulatedTags', { simulatedTags: {} });
      if (!simulatedTags.simulatedTags) simulatedTags.simulatedTags = {};
      if (!simulatedTags.simulatedTags[messageId]) simulatedTags.simulatedTags[messageId] = [];
      
      if (!simulatedTags.simulatedTags[messageId].includes(tagKey)) {
        simulatedTags.simulatedTags[messageId].push(tagKey);
        await storage.set('simulatedTags', simulatedTags);
        
        console.log(`[Tags] ✅ Tag ${tagKey} stocké en fallback pour message ${messageId}`);
        return true;
      }
      
      console.log(`[Tags] Tag ${tagKey} déjà en fallback pour message ${messageId}`);
      return true;
      
    } catch (error) {
      console.error(`[Tags] Erreur fallback:`, error);
      return false;
    }
  }

  /**
   * Met à jour l'état d'activation d'un tag - Adapté de tags.js
   */
  async setTagEnabled(tagKey, enabled) {
    try {
      if (this.tagStates[tagKey]) {
        this.tagStates[tagKey].active = enabled;
        await this.saveTagStates();
        console.log(`[Tags] Tag ${tagKey} ${enabled ? 'activé' : 'désactivé'}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Tags] Erreur lors de la mise à jour de l\'état du tag:', error);
      return false;
    }
  }

  /**
   * Récupère l'état actif des tags - Adapté de tags.js
   */
  getTagsActive() {
    try {
      const activeStates = {};
      for (const [key, state] of Object.entries(this.tagStates)) {
        activeStates[key] = state.active !== false;
      }
      return activeStates;
    } catch (error) {
      console.error('[Tags] Erreur lors de la récupération des états des tags:', error);
      return {};
    }
  }

  /**
   * Méthode pour récupérer tous les tags (réels + simulés)
   */
  async getAllTagsForMessage(messageId) {
    try {
      const message = await browser.messages.get(messageId);
      const realTags = message.tags || [];
      
      // Récupérer les tags simulés
      const stored = await storage.get('simulatedTags');
      const simulatedTags = stored?.simulatedTags?.[messageId] || [];
      
      return {
        real: realTags,
        simulated: simulatedTags,
        all: [...realTags, ...simulatedTags]
      };
    } catch (error) {
      console.error(`[Tags] Erreur récupération tous tags:`, error);
      return { real: [], simulated: [], all: [] };
    }
  }

  async clearAllTags(messageId) {
    try {
      // Nettoyer les tags réels
      const message = await browser.messages.get(messageId);
      const currentTags = message.tags || [];
      const nonSecMyMailTags = currentTags.filter(tag => 
        !tag.toString().startsWith('secmymail.')
      );
      
      if (browser.messages.update) {
        await browser.messages.update(messageId, { tags: nonSecMyMailTags });
      }
      
      // Nettoyer les tags simulés
      const stored = await storage.get('simulatedTags');
      if (stored && stored.simulatedTags && stored.simulatedTags[messageId]) {
        delete stored.simulatedTags[messageId];
        await storage.set('simulatedTags', stored);
      }
      
      console.log(`[Tags] Tags SecMyMail nettoyés du message ${messageId}`);
      return true;
    } catch (error) {
      console.error(`[Tags] Erreur nettoyage tags:`, error);
      return false;
    }
  }

  getTagDefinitions() {
    return this.tagsData;
  }

  async toggleTag(tagKey) {
    if (this.tagStates[tagKey]) {
      const newState = !this.tagStates[tagKey].active;
      return await this.setTagEnabled(tagKey, newState);
    }
    return false;
  }
}

// Instance globale
const tagManager = new TagManager();

// Export
export { tagManager };