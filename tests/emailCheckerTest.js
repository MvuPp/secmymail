import assert from 'assert';
import { emailChecker } from '../modules/analysis/emailChecker.js';

globalThis.browser = {
  storage: {
    local: {
      get: async (key) => {
        const result = {};
        if (key === 'emailWhitelist' || key.includes('emailWhitelist')) {
          result.emailWhitelist = ['safe@example.com', 'contact@trusted.org'];
        }
        if (key === 'emailBlacklist' || key.includes('emailBlacklist')) {
          result.emailBlacklist = ['spam@malicious.com', 'phishing@scam.net'];
        }
        return result;
      },
      set: async () => {}
    }
  }
};

globalThis.STORAGE_KEYS = {
  EMAIL_WHITELIST: 'emailWhitelist',
  EMAIL_BLACKLIST: 'emailBlacklist'
};

globalThis.storage = {
  get: async (key, defaultValue) => {
    if (key === STORAGE_KEYS.EMAIL_WHITELIST) {
      return ['safe@example.com', 'contact@trusted.org', '@trusted.org', 'user*@pattern.com'];
    }
    if (key === STORAGE_KEYS.EMAIL_BLACKLIST) {
      return ['spam@malicious.com', 'phishing@scam.net', '@evil.com', 'bad*@suspect.org'];
    }
    return defaultValue;
  },
  set: async () => {}
};

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
  
  await test('checkEmail should validate sender emails only', async () => {
    emailChecker.clearCache();
    
    const whitelistedResult = await emailChecker.checkEmail('safe@example.com');
    assert.strictEqual(whitelistedResult, 1, 'Whitelisted email should return 1 (safe)');
    
    const blacklistedResult = await emailChecker.checkEmail('spam@malicious.com');
    assert.strictEqual(blacklistedResult, -1, 'Blacklisted email should return -1 (malicious)');
    
    const unknownResult = await emailChecker.checkEmail('random@unknown.com');
    assert.strictEqual(unknownResult, 0, 'Unknown email should return 0 (unknown)');
    
    const emptyResult = await emailChecker.checkEmail('');
    assert.strictEqual(emptyResult, 0, 'Empty email should return 0');
  });
  
  await test('isInEmailList should handle patterns and domain rules', async () => {
    assert.strictEqual(
      emailChecker.isInEmailList('someone@trusted.org', ['@trusted.org']), 
      true, 
      'Domain rule should match any email from that domain'
    );
    
    assert.strictEqual(
      emailChecker.isInEmailList('user123@pattern.com', ['user*@pattern.com']), 
      true, 
      'Wildcard pattern should match'
    );
    
    assert.strictEqual(
      emailChecker.isInEmailList('different@pattern.com', ['user*@pattern.com']), 
      false, 
      'Non-matching pattern should return false'
    );
    
    assert.strictEqual(
      emailChecker.isInEmailList('test@example.com', []), 
      false, 
      'Empty list should return false'
    );
    
    assert.strictEqual(
      emailChecker.isInEmailList('test@example.com', null), 
      false, 
      'Null list should return false'
    );
  });
  
  await test('Cache should store and retrieve results correctly', async () => {
    emailChecker.clearCache();
    
    assert.strictEqual(emailChecker.cache.size, 0, 'Cache should be empty after clearing');
    
    await emailChecker.checkEmail('test@example.com');
    assert.strictEqual(emailChecker.cache.has('test@example.com'), true, 'Email should be added to cache');
    
    const cachedEntry = emailChecker.cache.get('test@example.com');
    assert.strictEqual(typeof cachedEntry.timestamp, 'number', 'Cache entry should have timestamp');
    assert.strictEqual(typeof cachedEntry.result, 'number', 'Cache entry should have result');
    
    const cachedResult = await emailChecker.checkEmail('test@example.com');
    assert.strictEqual(cachedResult, cachedEntry.result, 'Should return cached result');
    
    emailChecker.clearCacheForEmail('test@example.com');
    assert.strictEqual(emailChecker.cache.has('test@example.com'), false, 'Email should be removed from cache');
    
    await emailChecker.checkEmail('Case@Example.com');
    assert.strictEqual(emailChecker.cache.has('case@example.com'), true, 'Email should be normalized to lowercase');
    
    await emailChecker.refreshData();
    assert.strictEqual(emailChecker.cache.size, 0, 'Cache should be empty after refreshData');
  });
  
  console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed`);
};

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});