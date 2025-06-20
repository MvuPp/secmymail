import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtenir le répertoire actuel en utilisant ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Comme common.js utilise window et document, nous devons les simuler
globalThis.window = {
  SecMyMailUtils: {}
};

globalThis.document = {
  body: {
    appendChild: () => {},
    removeChild: () => {}
  },
  createElement: () => {
    return {
      style: {},
      className: '',
      parentNode: document.body
    };
  }
};

// Chemin correct vers common.js (remonter d'un niveau depuis le dossier tests)
const commonPath = path.join(__dirname, '..', 'scripts', 'common.js');
const commonCode = fs.readFileSync(commonPath, 'utf8');
// Nous évaluons le code pour qu'il définisse les fonctions dans l'environnement global
eval(commonCode);

// On récupère les fonctions depuis l'objet global
const {
  debounce,
  throttle,
  isValidEmail,
  isValidDomain,
  formatNumber,
  formatDate,
  Toast,
  LoadingManager
} = window.SecMyMailUtils;

const runTests = async () => {
  let passedTests = 0;
  let failedTests = 0;
  
  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passedTests++;
    } catch (error) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${error.message}`);
      failedTests++;
    }
  };
  
  await test('debounce should delay function execution', async () => {
    let calls = 0;
    const func = () => { calls++; };
    const debouncedFunc = debounce(func, 50);
    
    // Appels multiples rapides
    debouncedFunc();
    debouncedFunc();
    debouncedFunc();
    
    assert.strictEqual(calls, 0, 'Function should not be called immediately');
    
    // Attendre que le délai passe
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.strictEqual(calls, 1, 'Function should be called once after delay');
  });
  
  await test('throttle should limit function calls', async () => {
    let calls = 0;
    const func = () => { calls++; };
    const throttledFunc = throttle(func, 50);
    
    // Appels multiples rapides
    throttledFunc();
    throttledFunc();
    throttledFunc();
    
    assert.strictEqual(calls, 1, 'Function should be called once immediately');
    
    // Attendre que le délai passe
    await new Promise(resolve => setTimeout(resolve, 100));
    throttledFunc();
    assert.strictEqual(calls, 2, 'Function should be called again after delay');
  });
  
  await test('isValidEmail should validate email addresses correctly', () => {
    assert.strictEqual(isValidEmail('user@example.com'), true, 'Valid email should return true');
    assert.strictEqual(isValidEmail('user.name@example.co.uk'), true, 'Valid email with subdomain should return true');
    assert.strictEqual(isValidEmail('user+tag@example.com'), true, 'Valid email with + tag should return true');
    
    assert.strictEqual(isValidEmail('user@'), false, 'Incomplete email should return false');
    assert.strictEqual(isValidEmail('user@.com'), false, 'Invalid domain should return false');
    assert.strictEqual(isValidEmail('@example.com'), false, 'Missing username should return false');
    assert.strictEqual(isValidEmail('user@example'), false, 'Missing TLD should return false');
    assert.strictEqual(isValidEmail(''), false, 'Empty string should return false');
    assert.strictEqual(isValidEmail('not an email'), false, 'Non-email string should return false');
  });
  
  await test('isValidDomain should validate domains correctly', () => {
    assert.strictEqual(isValidDomain('example.com'), true, 'Valid domain should return true');
    assert.strictEqual(isValidDomain('sub.example.com'), true, 'Valid subdomain should return true');
    assert.strictEqual(isValidDomain('example-site.com'), true, 'Domain with hyphen should return true');
    assert.strictEqual(isValidDomain('xn--80aswg.xn--p1ai'), true, 'IDN domain should return true');
    
    assert.strictEqual(isValidDomain('example..com'), false, 'Double dot should return false');
    assert.strictEqual(isValidDomain('-example.com'), false, 'Starting with hyphen should return false');
    assert.strictEqual(isValidDomain('example-.com'), false, 'Ending with hyphen should return false');
    assert.strictEqual(isValidDomain('ex@mple.com'), false, 'Invalid characters should return false');
    assert.strictEqual(isValidDomain(''), false, 'Empty string should return false');
    
    // Test for max length (domain name <= 253 characters)
    const longDomain = 'a'.repeat(250) + '.com';
    assert.strictEqual(isValidDomain(longDomain), false, 'Too long domain should return false');
  });
  
    await test('formatNumber should format numbers with separators', () => {
      const formatted1000 = formatNumber(1000);
      assert(formatted1000.includes('1') && formatted1000.includes('000'), 'Should format 1000 correctly');
      
      const formatted1M = formatNumber(1000000);
      assert(formatted1M.includes('1') && formatted1M.includes('000') && formatted1M.includes('000'), 'Should format 1,000,000 correctly');
      
      const formattedDecimal = formatNumber(1234.56);
      assert(formattedDecimal.includes('1') && formattedDecimal.includes('234') && formattedDecimal.includes('56'), 'Should format decimal numbers correctly');
      
      assert.strictEqual(formatNumber(0), '0', 'Should format 0 correctly');
      
      const formattedNegative = formatNumber(-1000);
      assert(formattedNegative.includes('-') && formattedNegative.includes('1') && formattedNegative.includes('000'), 'Should format negative numbers correctly');
    });
  
  await test('formatDate should format dates correctly', () => {
    // Création d'une date de test (2023-01-15 14:30:00)
    const testDate = new Date(2023, 0, 15, 14, 30, 0);
    const formatted = formatDate(testDate);
    
    assert(formatted.includes('15'), 'Formatted date should include day');
    assert(formatted.includes('janv.'), 'Formatted date should include month');
    assert(formatted.includes('2023'), 'Formatted date should include year');
    assert(formatted.includes('14:30'), 'Formatted date should include time');
  });
  
  await test('Toast methods should exist', () => {
    assert.strictEqual(typeof Toast.show, 'function', 'Toast.show should be a function');
    assert.strictEqual(typeof Toast.success, 'function', 'Toast.success should be a function');
    assert.strictEqual(typeof Toast.error, 'function', 'Toast.error should be a function');
    assert.strictEqual(typeof Toast.warning, 'function', 'Toast.warning should be a function');
    assert.strictEqual(typeof Toast.info, 'function', 'Toast.info should be a function');
    
    // Mock document.body.appendChild pour vérifier si Toast crée des éléments
    let appendCalled = false;
    const originalAppendChild = document.body.appendChild;
    document.body.appendChild = () => { appendCalled = true; };
    
    Toast.show('Test message');
    assert.strictEqual(appendCalled, true, 'Toast.show should append an element to the DOM');
    
    // Restore original function
    document.body.appendChild = originalAppendChild;
  });
  
  await test('LoadingManager methods should work correctly', () => {
    assert.strictEqual(typeof LoadingManager.show, 'function', 'LoadingManager.show should be a function');
    assert.strictEqual(typeof LoadingManager.hide, 'function', 'LoadingManager.hide should be a function');
    
    // Création d'un élément de test
    const element = {
      disabled: false,
      textContent: 'Original Text',
      dataset: {},
      classList: {
        add: (className) => { element.className = className; },
        remove: (className) => { element.className = ''; }
      }
    };
    
    // Test de LoadingManager.show
    LoadingManager.show(element, 'Loading...');
    assert.strictEqual(element.disabled, true, 'Element should be disabled');
    assert.strictEqual(element.textContent, 'Loading...', 'Text should be changed');
    assert.strictEqual(element.dataset.originalText, 'Original Text', 'Original text should be stored');
    assert.strictEqual(element.className, 'loading', 'Loading class should be added');
    
    // Test de LoadingManager.hide
    LoadingManager.hide(element);
    assert.strictEqual(element.disabled, false, 'Element should be enabled');
    assert.strictEqual(element.textContent, 'Original Text', 'Text should be restored');
    assert.strictEqual(element.className, '', 'Loading class should be removed');
    assert.strictEqual(element.dataset.originalText, undefined, 'Dataset property should be deleted');
    
    // Test avec un élément null
    LoadingManager.show(null);
    LoadingManager.hide(null);
    assert.ok(true, 'Should not throw errors with null elements');
  });
  
  console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed`);
};

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});