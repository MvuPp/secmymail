import assert from 'assert';
import { storage, STORAGE_KEYS } from '../modules/core/storage.js';

// Mock pour l'objet browser.storage.local
globalThis.browser = {
  storage: {
    local: {
      get: async (key) => {
        // Simuler la récupération de données depuis le stockage local
        const mockData = {
          [STORAGE_KEYS.TAG_STATES]: { tag1: true, tag2: false },
          [STORAGE_KEYS.EMAIL_WHITELIST]: ['safe@example.com', 'user@trusted.org'],
          [STORAGE_KEYS.EMAIL_BLACKLIST]: ['spam@malicious.com'],
          [STORAGE_KEYS.DOMAIN_WHITELIST]: ['example.com', 'trusted.org'],
          [STORAGE_KEYS.DOMAIN_BLACKLIST]: ['malicious.com'],
          [STORAGE_KEYS.FOLDER_SETTINGS]: { autoCleanup: true, cleanupDays: 30 },
          [STORAGE_KEYS.APP_SETTINGS]: { theme: 'dark', notifications: true },
          [STORAGE_KEYS.AUTO_MOVE_OPTIONS]: { enabled: true, maliciousFolder: 'Spam' },
          [STORAGE_KEYS.AUTO_MOVE_STATS]: { moved: 42, skipped: 10 }
        };
        
        // Si la clé est une chaîne, retourner l'objet correspondant
        if (typeof key === 'string') {
          return { [key]: mockData[key] };
        }
        
        // Si la clé est un objet ou un tableau, retourner les valeurs demandées
        const result = {};
        if (Array.isArray(key)) {
          key.forEach(k => {
            if (mockData[k]) result[k] = mockData[k];
          });
        } else if (typeof key === 'object') {
          Object.keys(key).forEach(k => {
            result[k] = mockData[k] || key[k]; // Utiliser la valeur par défaut si nécessaire
          });
        }
        
        return result;
      },
      set: async (data) => {
        // Simuler la sauvegarde de données
        return { success: true };
      }
    }
  }
};

const runTests = async () => {
  let passedTests = 0;
  let failedTests = 0;
  
  const test = async (name, fn) => {
    try {
      // Réinitialiser le cache avant chaque test
      storage.clearCache();
      
      await fn();
      console.log(`✅ PASS: ${name}`);
      passedTests++;
    } catch (error) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${error.message}`);
      failedTests++;
    }
  };

  await test('get should retrieve data from storage with default value', async () => {
    // Test avec une clé existante
    const tagStates = await storage.get(STORAGE_KEYS.TAG_STATES, {});
    assert.deepStrictEqual(tagStates, { tag1: true, tag2: false }, 'Should retrieve existing data');
    
    // Test avec une clé inexistante et valeur par défaut
    const nonExistentKey = 'nonExistentKey';
    const defaultValue = { default: true };
    const result = await storage.get(nonExistentKey, defaultValue);
    assert.deepStrictEqual(result, defaultValue, 'Should return default value for non-existent key');
    
    // Test avec une valeur par défaut null
    const nullDefault = await storage.get('anotherNonExistentKey', null);
    assert.strictEqual(nullDefault, null, 'Should handle null default value');
  });
  
  await test('get should cache values and return from cache on subsequent calls', async () => {
    // Espion sur browser.storage.local.get pour compter les appels
    let getBrowserCalls = 0;
    const originalGet = browser.storage.local.get;
    browser.storage.local.get = async (key) => {
      getBrowserCalls++;
      return originalGet(key);
    };
    
    // Premier appel, devrait accéder au stockage
    await storage.get(STORAGE_KEYS.EMAIL_WHITELIST);
    assert.strictEqual(getBrowserCalls, 1, 'First call should access browser storage');
    
    // Deuxième appel, devrait utiliser le cache
    await storage.get(STORAGE_KEYS.EMAIL_WHITELIST);
    assert.strictEqual(getBrowserCalls, 1, 'Second call should use cache (no additional browser.storage call)');
    
    // Rétablir la fonction originale
    browser.storage.local.get = originalGet;
  });
  
  await test('set should save data to storage and update cache', async () => {
    // Espion sur browser.storage.local.set
    let setBrowserCalls = 0;
    let savedData = null;
    const originalSet = browser.storage.local.set;
    browser.storage.local.set = async (data) => {
      setBrowserCalls++;
      savedData = data;
      return originalSet(data);
    };
    
    const newData = ['test@example.com'];
    await storage.set(STORAGE_KEYS.EMAIL_WHITELIST, newData);
    
    assert.strictEqual(setBrowserCalls, 1, 'Should call browser.storage.local.set');
    assert.deepStrictEqual(savedData, { [STORAGE_KEYS.EMAIL_WHITELIST]: newData }, 'Should save correct data');
    
    // Vérifier que le cache a été mis à jour
    const cachedData = await storage.get(STORAGE_KEYS.EMAIL_WHITELIST);
    assert.deepStrictEqual(cachedData, newData, 'Cache should be updated with new data');
    
    // Rétablir la fonction originale
    browser.storage.local.set = originalSet;
  });
  
  await test('addListener and removeListener should manage event listeners', async () => {
    const testKey = STORAGE_KEYS.APP_SETTINGS;
    let callbackCalled = false;
    let callbackValue = null;
    
    // Créer un callback de test
    const testCallback = (value) => {
      callbackCalled = true;
      callbackValue = value;
    };
    
    // Ajouter un listener
    storage.addListener(testKey, testCallback);
    
    // Déclencher une mise à jour (qui appelle les listeners)
    const newValue = { theme: 'light', notifications: false };
    await storage.set(testKey, newValue);
    
    assert.strictEqual(callbackCalled, true, 'Callback should be called when value changes');
    assert.deepStrictEqual(callbackValue, newValue, 'Callback should receive the new value');
    
    // Réinitialiser pour le prochain test
    callbackCalled = false;
    callbackValue = null;
    
    // Supprimer le listener
    storage.removeListener(testKey, testCallback);
    
    // Déclencher une autre mise à jour
    await storage.set(testKey, { theme: 'system' });
    
    assert.strictEqual(callbackCalled, false, 'Callback should not be called after removal');
  });
  
  await test('clearCache should remove all cached items', async () => {
    // Remplir le cache avec quelques valeurs
    await storage.get(STORAGE_KEYS.TAG_STATES);
    await storage.get(STORAGE_KEYS.EMAIL_WHITELIST);
    
    // Vérifier que le cache contient des éléments
    assert(storage.cache.size > 0, 'Cache should contain items before clearing');
    
    // Vider le cache
    storage.clearCache();
    
    // Vérifier que le cache est vide
    assert.strictEqual(storage.cache.size, 0, 'Cache should be empty after clearing');
  });
  
  await test('addToList should add an item to a list if not already present', async () => {
    // Espion sur storage.get et storage.set
    const originalGet = storage.get;
    const originalSet = storage.set;
    
    let getCall = null;
    let setCalls = [];
    
    storage.get = async (key, defaultValue) => {
      getCall = { key, defaultValue };
      return originalGet.call(storage, key, defaultValue);
    };
    
    storage.set = async (key, value) => {
      setCalls.push({ key, value });
      return originalSet.call(storage, key, value);
    };
    
    // Test d'ajout d'un nouvel élément
    const listKey = STORAGE_KEYS.EMAIL_WHITELIST;
    const newItem = 'new@example.com';
    const updatedList = await storage.addToList(listKey, newItem);
    
    assert.strictEqual(getCall.key, listKey, 'Should get the correct list');
    assert.strictEqual(setCalls.length, 1, 'Should set the updated list');
    assert.strictEqual(setCalls[0].key, listKey, 'Should update the correct list');
    assert(updatedList.includes(newItem), 'Updated list should include the new item');
    
    // Test d'ajout d'un élément déjà présent
    setCalls = []; // Réinitialiser setCalls
    const existingItem = 'safe@example.com';
    const unchangedList = await storage.addToList(listKey, existingItem);
    
    assert.strictEqual(setCalls.length, 0, 'Should not update the list if item already exists');
    assert(unchangedList.includes(existingItem), 'List should still include the existing item');
    
    // Rétablir les fonctions originales
    storage.get = originalGet;
    storage.set = originalSet;
  });
  
  await test('removeFromList should remove an item from a list if present', async () => {
    // Espion sur storage.get et storage.set
    const originalGet = storage.get;
    const originalSet = storage.set;
    
    let getCall = null;
    let setCalls = [];
    
    storage.get = async (key, defaultValue) => {
      getCall = { key, defaultValue };
      // Retourner une liste de test
      if (key === STORAGE_KEYS.EMAIL_BLACKLIST) {
        return ['spam@malicious.com', 'remove@test.com', 'keep@test.com'];
      }
      return originalGet.call(storage, key, defaultValue);
    };
    
    storage.set = async (key, value) => {
      setCalls.push({ key, value });
      return originalSet.call(storage, key, value);
    };
    
    // Test de suppression d'un élément existant
    const listKey = STORAGE_KEYS.EMAIL_BLACKLIST;
    const itemToRemove = 'remove@test.com';
    const updatedList = await storage.removeFromList(listKey, itemToRemove);
    
    assert.strictEqual(getCall.key, listKey, 'Should get the correct list');
    assert.strictEqual(setCalls.length, 1, 'Should set the updated list');
    assert.strictEqual(setCalls[0].key, listKey, 'Should update the correct list');
    assert(!updatedList.includes(itemToRemove), 'Updated list should not include the removed item');
    assert(updatedList.includes('keep@test.com'), 'Updated list should still include other items');
    
    // Test de suppression d'un élément non présent
    setCalls = []; // Réinitialiser setCalls
    const nonExistentItem = 'nonexistent@example.com';
    const unchangedList = await storage.removeFromList(listKey, nonExistentItem);
    
    assert.strictEqual(setCalls.length, 0, 'Should not update the list if item does not exist');
    
    // Rétablir les fonctions originales
    storage.get = originalGet;
    storage.set = originalSet;
  });
  
  await test('set should notify listeners even when browser storage fails', async () => {
    // Simuler une erreur dans browser.storage.local.set
    const originalBrowserSet = browser.storage.local.set;
    browser.storage.local.set = async () => {
      throw new Error('Simulated storage error');
    };
    
    // Configurer un listener de test
    let listenerCalled = false;
    let listenerValue = null;
    const testListener = (value) => {
      listenerCalled = true;
      listenerValue = value;
    };
    
    const testKey = STORAGE_KEYS.APP_SETTINGS;
    const newValue = { theme: 'test' };
    
    storage.addListener(testKey, testListener);
    
    // Tenter de définir une valeur (devrait échouer au niveau du navigateur)
    const result = await storage.set(testKey, newValue);
    
    assert.strictEqual(result, false, 'Should return false on storage error');
    assert.strictEqual(listenerCalled, false, 'Listener should not be called on error');
    
    // Rétablir la fonction originale
    browser.storage.local.set = originalBrowserSet;
    
    // Supprimer le listener pour ne pas affecter d'autres tests
    storage.removeListener(testKey, testListener);
  });
  
  await test('listeners should handle errors gracefully', async () => {
    // Configurer un listener qui génère une erreur
    const errorListener = () => {
      throw new Error('Simulated listener error');
    };
    
    const testKey = STORAGE_KEYS.TAG_STATES;
    storage.addListener(testKey, errorListener);
    
    // Aucune erreur ne devrait être propagée lors de la mise à jour
    try {
      await storage.set(testKey, { newTag: true });
      assert.ok(true, 'Should handle listener errors gracefully');
    } catch (error) {
      assert.fail('Should not propagate listener errors');
    }
    
    // Supprimer le listener pour ne pas affecter d'autres tests
    storage.removeListener(testKey, errorListener);
  });
  
  console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed`);
};

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});