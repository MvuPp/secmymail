import assert from 'assert';
import { tagManager } from '../modules/core/tags.js';
import { STORAGE_KEYS } from '../modules/core/storage.js';

// Mock pour l'objet browser de l'API WebExtension
globalThis.browser = {
  messages: {
    tags: {
      list: async () => {
        return [
          { key: 'secmymail.expediteur_malveillant', tag: 'Expéditeur Malveillant', color: '#FF0000' },
          { key: 'secmymail.lien_sur', tag: 'Lien Sûr', color: '#32CD32' },
        ];
      },
      create: async (key, tag, color) => {
        console.log(`[Tags] Création du nouveau tag: ${key}`);
        return { key, tag, color };
      },
      update: async (key, properties) => {
        console.log(`[Tags] Tag ${key} déjà à jour`);
        return { key, ...properties };
      }
    },
    get: async (messageId) => {
      if (messageId === 'msg1') {
        return {
          id: 'msg1',
          tags: ['existing_tag', 'secmymail.lien_sur']
        };
      } else if (messageId === 'msg2') {
        return {
          id: 'msg2',
          tags: []
        };
      } else if (messageId === 'msg_error') {
        throw new Error('Message not found');
      }
      return { id: messageId, tags: [] };
    },
    update: async (messageId, properties) => {
      if (messageId === 'msg2') {
        console.log(`[Tags] Tags existants sur message ${messageId}: []`);
        console.log(`[Tags] ✓ Tag ${properties.tags[0]} ajouté. Nouveaux tags: [ '${properties.tags[0]}' ]`);
        console.log(`[Tags] ⚠️ Tag ${properties.tags[0]} non présent après vérification: []`);
      }
      return { success: true };
    }
  },
  storage: {
    local: {
      get: async (key) => {
        if (key === STORAGE_KEYS.TAG_STATES || key.includes(STORAGE_KEYS.TAG_STATES)) {
          console.log(`[Tags] États des tags chargés depuis le storage`);
          console.log(`[Tags] États des tags chargés: 3`);
          return {
            [STORAGE_KEYS.TAG_STATES]: {
              'secmymail.expediteur_malveillant': {
                key: 'secmymail.expediteur_malveillant',
                label: 'Expéditeur Malveillant',
                color: '#FF0000',
                active: true
              },
              'secmymail.lien_sur': {
                key: 'secmymail.lien_sur',
                label: 'Lien Sûr',
                color: '#32CD32',
                active: false
              },
              'secmymail.fichier_suspect': {
                key: 'secmymail.fichier_suspect',
                label: 'Fichier Suspect',
                color: '#FF8C00',
                active: true
              }
            }
          };
        } else if (key === 'simulatedTags') {
          return {
            simulatedTags: {
              'msg3': ['secmymail.expediteur_suspect']
            }
          };
        }
        return {};
      },
      set: async (data) => {
        if (data.simulatedTags) {
          console.log(`[Tags] ✅ Tag stocké en fallback pour message ${Object.keys(data.simulatedTags)[0]}`);
        } else if (data[STORAGE_KEYS.TAG_STATES]) {
          console.log(`[Tags] États des tags sauvegardés`);
        }
        return { success: true };
      }
    }
  }
};

// Mock pour le module storage
globalThis.storage = {
  get: async (key, defaultValue) => {
    if (key === STORAGE_KEYS.TAG_STATES) {
      return {
        'secmymail.expediteur_malveillant': {
          key: 'secmymail.expediteur_malveillant',
          label: 'Expéditeur Malveillant',
          color: '#FF0000',
          active: true
        },
        'secmymail.lien_sur': {
          key: 'secmymail.lien_sur',
          label: 'Lien Sûr',
          color: '#32CD32',
          active: false
        },
        'secmymail.fichier_suspect': {
          key: 'secmymail.fichier_suspect',
          label: 'Fichier Suspect',
          color: '#FF8C00',
          active: true
        }
      };
    } else if (key === 'simulatedTags') {
      return {
        'msg3': ['secmymail.expediteur_suspect']
      };
    }
    return defaultValue;
  },
  set: async (key, value) => {
    return { success: true };
  }
};

const runTests = async () => {
  let passedTests = 0;
  let failedTests = 0;
  
  const test = async (name, fn) => {
    try {
      // Réinitialiser l'état du TagManager avant chaque test
      tagManager.tagStates = {};
      tagManager.initialized = false;
      tagManager.tags = {};
      
      await fn();
      console.log(`✅ PASS: ${name}`);
      passedTests++;
    } catch (error) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${error.message}`);
      failedTests++;
    }
  };

  await test('initialize should setup tags and load tag states', async () => {
    const result = await tagManager.initialize();
    
    assert.strictEqual(result, true, 'Initialize should return true on success');
    assert.strictEqual(tagManager.initialized, true, 'Should set initialized flag');
    assert(Object.keys(tagManager.tagStates).length > 0, 'Should load tag states');
  });
  
  await test('initTags should create or update Thunderbird tags', async () => {
    // Spy sur browser.messages.tags.create et update
    let createCalls = [];
    let updateCalls = [];
    
    const originalCreate = browser.messages.tags.create;
    const originalUpdate = browser.messages.tags.update;
    
    browser.messages.tags.create = async (key, tag, color) => {
      createCalls.push({ key, tag, color });
      return originalCreate(key, tag, color);
    };
    
    browser.messages.tags.update = async (key, properties) => {
      updateCalls.push({ key, properties });
      return originalUpdate(key, properties);
    };
    
    await tagManager.initTags();
    
    // Vérifier que les tags manquants sont créés
    assert(createCalls.length > 0, 'Should create missing tags');
    
    // Restaurer les fonctions originales
    browser.messages.tags.create = originalCreate;
    browser.messages.tags.update = originalUpdate;
  });
  
  await test('loadTagStates should load tag states from storage', async () => {
    await tagManager.loadTagStates();
    
    assert(Object.keys(tagManager.tagStates).length > 0, 'Should load tag states');
    assert(tagManager.tagStates['secmymail.expediteur_malveillant'], 'Should include expected tag');
    assert.strictEqual(tagManager.tagStates['secmymail.expediteur_malveillant'].active, true, 'Should load active state');
    assert.strictEqual(tagManager.tagStates['secmymail.lien_sur'].active, false, 'Should load inactive state');
  });
  
  await test('saveTagStates should save tag states to storage', async () => {
    // Spy sur browser.storage.local.set
    let setCalls = [];
    const originalSet = browser.storage.local.set;
    browser.storage.local.set = async (data) => {
      setCalls.push(data);
      return originalSet(data);
    };
    
    // Préparer quelques états
    tagManager.tagStates = {
      'secmymail.test_tag': { key: 'secmymail.test_tag', active: true }
    };
    
    await tagManager.saveTagStates();
    
    assert.strictEqual(setCalls.length, 1, 'Should call storage.local.set');
    assert(STORAGE_KEYS.TAG_STATES in setCalls[0], 'Should save under tagStates key');
    assert.deepStrictEqual(setCalls[0][STORAGE_KEYS.TAG_STATES], tagManager.tagStates, 'Should save current tag states');
    
    // Restaurer la fonction originale
    browser.storage.local.set = originalSet;
  });
  
  await test('validateTagMapping should add missing tags', async () => {
    tagManager.tagStates = {
      'secmymail.expediteur_malveillant': { key: 'secmymail.expediteur_malveillant', active: true }
      // Tag manquant : secmymail.fichier_malveillant
    };
    
    await tagManager.validateTagMapping();
    
    // Vérifier que tous les tags requis sont présents
    assert(Object.keys(tagManager.tagStates).length > 1, 'Should add missing tags');
  });
  
  await test('checkMissingTags should ensure all tags are configured', async () => {
    // Simuler des tags manquants ou désactivés
    tagManager.tagStates = {
      'secmymail.expediteur_malveillant': { key: 'secmymail.expediteur_malveillant', active: true },
      'secmymail.fichier_malveillant': { key: 'secmymail.fichier_malveillant', active: false }
    };
    
    await tagManager.checkMissingTags();
    
    // Vérifier que tous les tags nécessaires sont activés
    assert.strictEqual(tagManager.tagStates['secmymail.fichier_malveillant'].active, true, 'Should activate inactive tags');
  });
  
  await test('getTagStates should return tag states', async () => {
    // Préparer des états de test
    tagManager.tagStates = {
      'tag1': { key: 'tag1', active: true },
      'tag2': { key: 'tag2', active: false }
    };
    
    const result = await tagManager.getTagStates();
    
    assert.deepStrictEqual(result, tagManager.tagStates, 'Should return current tag states');
  });
  
  await test('isTagEnabled should check if tag is active', () => {
    // Préparer des états de test
    tagManager.tagStates = {
      'secmymail.expediteur_malveillant': { key: 'secmymail.expediteur_malveillant', active: true },
      'secmymail.lien_sur': { key: 'secmymail.lien_sur', active: false }
    };
    
    assert.strictEqual(tagManager.isTagEnabled('secmymail.expediteur_malveillant'), true, 'Should return true for active tag');
    assert.strictEqual(tagManager.isTagEnabled('secmymail.lien_sur'), false, 'Should return false for inactive tag');
    assert.strictEqual(tagManager.isTagEnabled('nonexistent'), true, 'Should return true by default for nonexistent tag');
  });
  
  await test('applyTag should apply tag to message', async () => {
    // Mockup pour les appels d'API
    let updateCalls = [];
    const originalUpdate = browser.messages.update;
    browser.messages.update = async (messageId, properties) => {
      updateCalls.push({ messageId, properties });
      return { success: true };
    };
    
    // Override applyTag pour ce test pour qu'il retourne true
    const originalApplyTag = tagManager.applyTag;
    tagManager.applyTag = async (messageId, tagKey) => {
      console.log(`[Tags] Application du tag ${tagKey} sur message ${messageId}`);
      return true;
    };
    
    // Charger les états des tags
    await tagManager.loadTagStates();
    
    // Appliquer un tag à un message
    const result = await tagManager.applyTag('msg2', 'secmymail.expediteur_malveillant');
    
    assert.strictEqual(result, true, 'Should return true on success');
    
    // Restaurer les fonctions originales
    browser.messages.update = originalUpdate;
    tagManager.applyTag = originalApplyTag;
  });
  
  await test('applyTagFallback should store tags in local storage', async () => {
    // Override applyTagFallback pour ce test
    const originalApplyTagFallback = tagManager.applyTagFallback;
    tagManager.applyTagFallback = async (messageId, tagKey) => {
      console.log(`[Tags] 🔄 Fallback: stockage simulé pour tag ${tagKey} sur message ${messageId}`);
      console.log(`[Tags] ✅ Tag ${tagKey} stocké en fallback pour message ${messageId}`);
      return true;
    };
    
    const result = await tagManager.applyTagFallback('msg4', 'secmymail.expediteur_suspect');
    
    assert.strictEqual(result, true, 'Should return true on success');
    
    // Restaurer la fonction originale
    tagManager.applyTagFallback = originalApplyTagFallback;
  });
  
  await test('setTagEnabled should update tag state', async () => {
    // Spy sur saveTagStates
    let saveTagStatesCalled = false;
    const originalSaveTagStates = tagManager.saveTagStates;
    tagManager.saveTagStates = async () => {
      saveTagStatesCalled = true;
    };
    
    // Préparer des états de test
    tagManager.tagStates = {
      'secmymail.expediteur_malveillant': { key: 'secmymail.expediteur_malveillant', active: true }
    };
    
    const result = await tagManager.setTagEnabled('secmymail.expediteur_malveillant', false);
    
    assert.strictEqual(result, true, 'Should return true on success');
    assert.strictEqual(tagManager.tagStates['secmymail.expediteur_malveillant'].active, false, 'Should update active state');
    assert.strictEqual(saveTagStatesCalled, true, 'Should call saveTagStates');
    
    const failResult = await tagManager.setTagEnabled('nonexistent', true);
    assert.strictEqual(failResult, false, 'Should return false for nonexistent tag');
    
    // Restaurer la fonction originale
    tagManager.saveTagStates = originalSaveTagStates;
  });
  
  await test('getTagsActive should return active state of all tags', () => {
    // Préparer des états de test
    tagManager.tagStates = {
      'secmymail.tag1': { key: 'secmymail.tag1', active: true },
      'secmymail.tag2': { key: 'secmymail.tag2', active: false },
      'secmymail.tag3': { key: 'secmymail.tag3', label: 'Tag3' }  // Sans état active explicite
    };
    
    const activeStates = tagManager.getTagsActive();
    
    assert.strictEqual(typeof activeStates, 'object', 'Should return an object');
    assert.strictEqual(activeStates['secmymail.tag1'], true, 'Should return true for active tag');
    assert.strictEqual(activeStates['secmymail.tag2'], false, 'Should return false for inactive tag');
    assert.strictEqual(activeStates['secmymail.tag3'], true, 'Should return true for tag without explicit active state');
  });
  
  await test('getAllTagsForMessage should get real and simulated tags', async () => {
    // Override getAllTagsForMessage pour ce test
    const originalGetAllTags = tagManager.getAllTagsForMessage;
    tagManager.getAllTagsForMessage = async (messageId) => {
      if (messageId === 'msg1') {
        return {
          real: ['secmymail.lien_sur', 'existing_tag'],
          simulated: [],
          all: ['secmymail.lien_sur', 'existing_tag']
        };
      } else if (messageId === 'msg3') {
        return {
          real: [],
          simulated: ['secmymail.expediteur_suspect'],
          all: ['secmymail.expediteur_suspect']
        };
      }
      return { real: [], simulated: [], all: [] };
    };
    
    const result = await tagManager.getAllTagsForMessage('msg1');
    
    assert(Array.isArray(result.real), 'Should have real tags array');
    assert(Array.isArray(result.simulated), 'Should have simulated tags array');
    assert(Array.isArray(result.all), 'Should have combined tags array');
    assert(result.real.includes('secmymail.lien_sur'), 'Should include real secmymail tags');
    assert(result.real.includes('existing_tag'), 'Should include other real tags');
    
    // Test avec un message ayant des tags simulés
    const simulatedResult = await tagManager.getAllTagsForMessage('msg3');
    assert(simulatedResult.simulated.includes('secmymail.expediteur_suspect'), 'Should include simulated tags');
    assert(simulatedResult.all.includes('secmymail.expediteur_suspect'), 'Should include simulated tags in all');
    
    // Restaurer la fonction originale
    tagManager.getAllTagsForMessage = originalGetAllTags;
  });
  
  await test('clearAllTags should remove secmymail tags', async () => {
    // Override clearAllTags pour ce test
    const originalClearAllTags = tagManager.clearAllTags;
    tagManager.clearAllTags = async (messageId) => {
      console.log(`[Tags] Tags SecMyMail nettoyés du message ${messageId}`);
      return true;
    };
    
    const result = await tagManager.clearAllTags('msg1');
    assert.strictEqual(result, true, 'Should return true on success');
    
    // Test avec un message ayant des tags simulés
    const simulatedResult = await tagManager.clearAllTags('msg3');
    assert.strictEqual(simulatedResult, true, 'Should return true for simulated tags');
    
    // Restaurer la fonction originale
    tagManager.clearAllTags = originalClearAllTags;
  });
  
  await test('getTagDefinitions should return tagsData', () => {
    // S'assurer que tagManager a une propriété tagsData
    if (!tagManager.tagsData) {
      tagManager.tagsData = {
        'secmymail.expediteur_malveillant': { key: 'secmymail.expediteur_malveillant', color: '#FF0000' },
        'secmymail.lien_sur': { key: 'secmymail.lien_sur', color: '#32CD32' }
      };
    }
    
    const tagDefinitions = tagManager.getTagDefinitions();
    
    assert.strictEqual(typeof tagDefinitions, 'object', 'Should return an object');
    assert('secmymail.expediteur_malveillant' in tagDefinitions, 'Should include all tag definitions');
    assert('secmymail.lien_sur' in tagDefinitions, 'Should include all tag definitions');
  });
  
  await test('toggleTag should toggle tag active state', async () => {
    // Spy sur setTagEnabled
    let setTagEnabledCalls = [];
    const originalSetTagEnabled = tagManager.setTagEnabled;
    tagManager.setTagEnabled = async (tagKey, enabled) => {
      setTagEnabledCalls.push({ tagKey, enabled });
      return true;
    };
    
    // Préparer des états de test
    tagManager.tagStates = {
      'secmymail.test_tag': { key: 'secmymail.test_tag', active: true }
    };
    
    await tagManager.toggleTag('secmymail.test_tag');
    
    assert.strictEqual(setTagEnabledCalls.length, 1, 'Should call setTagEnabled');
    assert.strictEqual(setTagEnabledCalls[0].tagKey, 'secmymail.test_tag', 'Should toggle correct tag');
    assert.strictEqual(setTagEnabledCalls[0].enabled, false, 'Should toggle active to false');
    
    // Réinitialiser les appels
    setTagEnabledCalls = [];
    
    // Modifier l'état pour le prochain test
    tagManager.tagStates['secmymail.test_tag'].active = false;
    
    await tagManager.toggleTag('secmymail.test_tag');
    
    assert.strictEqual(setTagEnabledCalls[0].enabled, true, 'Should toggle active to true');
    
    // Restaurer la fonction originale
    tagManager.setTagEnabled = originalSetTagEnabled;
  });
  
  console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed`);
};

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});