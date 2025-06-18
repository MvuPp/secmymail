import assert from 'assert';
import { linkChecker } from '../modules/analysis/linkChecker.js';

globalThis.browser = {
  storage: {
    local: {
      get: async (key) => {
        const result = {};
        if (key === 'domainWhitelist' || key.includes('domainWhitelist')) {
          result.domainWhitelist = ['example.com', 'trusted.org'];
        }
        if (key === 'domainBlacklist' || key.includes('domainBlacklist')) {
          result.domainBlacklist = ['malicious.com', 'spam.net'];
        }
        return result;
      },
      set: async () => {}
    }
  }
};

globalThis.STORAGE_KEYS = {
  DOMAIN_WHITELIST: 'domainWhitelist',
  DOMAIN_BLACKLIST: 'domainBlacklist'
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
  
  const resetLinkChecker = async () => {
    linkChecker.whiteListDomains = [];
    linkChecker.blackListDomains = [];
    await linkChecker.loadCustomLists();
  };
  
  await resetLinkChecker();
  
  await test('extractDomains should extract valid domains', () => {
    const domains = linkChecker.extractDomains('Visit example.com and test.org');
    assert(domains.includes('example.com'), 'Should extract example.com');
    assert(domains.includes('test.org'), 'Should extract test.org');
  });
  
  await test('isValidDomain should validate correctly', () => {
    assert(linkChecker.isValidDomain('example.com') === true, 'example.com should be valid');
    assert(linkChecker.isValidDomain('test-domain.org') === true, 'test-domain.org should be valid');
    assert(linkChecker.isValidDomain('invalid..com') === false, 'invalid..com should be invalid');
  });
  
  await test('extractLinks should extract URLs and domains', () => {
    const result = linkChecker.extractLinks('Visit https://example.com and www.test.org');
    assert(result.domains.includes('example.com'), 'Should extract example.com domain');
    assert(result.domains.includes('test.org'), 'Should extract test.org domain');
  });
  
  await test('shortenUrl should truncate long URLs', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(100);
    const shortened = linkChecker.shortenUrl(longUrl, 30);
    assert(shortened.length === 30, 'Should be 30 characters long');
    assert(shortened.endsWith('...'), 'Should end with ...');
  });
  
  await test('containsHomographs should detect confusable characters', () => {
    assert(linkChecker.containsHomographs('example.com') === false, 'Regular domain should be safe');
    
    const originalHomographChars = { ...linkChecker.homographChars };
    linkChecker.homographChars = { 'a': ['а'] };
    
    assert(linkChecker.containsHomographs('exаmple.com') === true, 'Should detect Cyrillic character');
    
    linkChecker.homographChars = originalHomographChars;
  });
  
  await test('getRiskLevel should return correct risk levels', () => {
    assert(linkChecker.getRiskLevel(-1) === 'high', 'Negative should be high risk');
    assert(linkChecker.getRiskLevel(0) === 'low', 'Zero should be low risk');
    assert(linkChecker.getRiskLevel(1) === 'medium', 'Positive should be medium risk');
  });
  
  await test('loadCustomLists should load lists from storage', async () => {
    await resetLinkChecker();
    assert(linkChecker.whiteListDomains.includes('example.com'), 'Should load whitelist');
    assert(linkChecker.blackListDomains.includes('malicious.com'), 'Should load blacklist');
  });
  
  await test('compareWhiteList should check domains correctly', async () => {
    await resetLinkChecker();
    assert(await linkChecker.compareWhiteList('example.com') === true, 'Should match exact domain');
    assert(await linkChecker.compareWhiteList('subdomain.example.com') === true, 'Should match subdomain');
    assert(await linkChecker.compareWhiteList('other.com') === false, 'Should not match different domain');
  });
  
  await test('compareBlackList should check domains correctly', async () => {
    await resetLinkChecker();
    assert(await linkChecker.compareBlackList('malicious.com') === true, 'Should match exact domain');
    assert(await linkChecker.compareBlackList('subdomain.malicious.com') === true, 'Should match subdomain');
    assert(await linkChecker.compareBlackList('safe.com') === false, 'Should not match different domain');
  });
  
  await test('compareLinks should evaluate domain lists', async () => {
    await resetLinkChecker();
    
    const blacklistedDomains = ['example.com', 'malicious.com'];
    assert((await linkChecker.compareLinks(blacklistedDomains)) === -1, 'Should return -1 for blacklisted domains');
    
    const whitelistedDomains = ['example.com', 'trusted.org'];
    assert((await linkChecker.compareLinks(whitelistedDomains)) === 1, 'Should return 1 for all whitelisted domains');
    
    const mixedDomains = ['example.com', 'unknown.com'];
    assert((await linkChecker.compareLinks(mixedDomains)) === 0, 'Should return 0 for mixed domains');
  });
  
  await test('analyzeLink should analyze URLs correctly', async () => {
    const url = new URL('https://example.com/path?param=value');
    const analysis = await linkChecker.analyzeLink(url);
    
    assert(analysis.url === 'https://example.com/path?param=value', 'Should preserve URL');
    assert(analysis.domain === 'example.com', 'Should extract domain');
    assert(analysis.protocol === 'https:', 'Should extract protocol');
    assert(analysis.path === '/path', 'Should extract path');
    assert(analysis.risk !== undefined, 'Should assess risk');
  });
  
  await test('analyzeDomainOnly should analyze domains correctly', async () => {
    const analysis = await linkChecker.analyzeDomainOnly('example.com');
    
    assert(analysis.domain === 'example.com', 'Should preserve domain');
    assert(analysis.type === 'domain', 'Should set type to domain');
    assert(analysis.risk !== undefined, 'Should assess risk');
    assert(Array.isArray(analysis.reasons), 'Should have reasons array');
    assert(Array.isArray(analysis.recommendations), 'Should have recommendations array');
  });
  
  await test('analyzeDomain should detect suspicious domains', () => {
    const shortenerAnalysis = { domain: 'bit.ly', risk: 'low', reasons: [], recommendations: [] };
    linkChecker.analyzeDomain(shortenerAnalysis);
    assert(shortenerAnalysis.risk === 'medium', 'URL shortener should be medium risk');
    
    const tldAnalysis = { domain: 'malware.tk', risk: 'low', reasons: [], recommendations: [] };
    linkChecker.analyzeDomain(tldAnalysis);
    assert(tldAnalysis.risk === 'high', 'Dangerous TLD should be high risk');
  });
  
  await test('analyzeProtocol should detect insecure protocols', () => {
    const httpAnalysis = { protocol: 'http:', risk: 'low', reasons: [], recommendations: [] };
    linkChecker.analyzeProtocol(httpAnalysis);
    assert(httpAnalysis.risk === 'medium', 'HTTP should be medium risk');
    
    const unusualAnalysis = { protocol: 'data:', risk: 'low', reasons: [], recommendations: [] };
    linkChecker.analyzeProtocol(unusualAnalysis);
    assert(unusualAnalysis.risk === 'high', 'Unusual protocol should be high risk');
  });
  
  await test('analyzeUrl should detect suspicious URL patterns', () => {
    const longUrl = { 
      url: 'https://example.com/' + 'a'.repeat(200), 
      risk: 'low', 
      reasons: [],
      recommendations: []
    };
    linkChecker.analyzeUrl(longUrl);
    assert(longUrl.risk === 'medium', 'Long URL should be medium risk');
    
    const exeUrl = { 
      url: 'https://example.com/file.exe', 
      risk: 'low', 
      reasons: [],
      recommendations: []
    };
    linkChecker.analyzeUrl(exeUrl);
    assert(exeUrl.risk === 'high', 'Executable URL should be high risk');
    
    const encodedUrl = { 
      url: 'https://example.com/%3Cscript%3E', 
      risk: 'low', 
      reasons: [],
      recommendations: []
    };
    linkChecker.analyzeUrl(encodedUrl);
    assert(encodedUrl.risk === 'high', 'URL with encoded script tags should be high risk');
  });
  
  await test('analyzeParameters should detect suspicious parameters', () => {
    const url = new URL('https://example.com/?exec=command');
    const analysis = { risk: 'low', reasons: [], recommendations: [] };
    linkChecker.analyzeParameters(analysis, url);
    assert(analysis.risk === 'high', 'Suspicious parameter should be high risk');
    
    const redirectUrl = new URL('https://example.com/?redirect=https://other.com');
    const redirectAnalysis = { risk: 'low', reasons: [], recommendations: [] };
    linkChecker.analyzeParameters(redirectAnalysis, redirectUrl);
    assert(redirectAnalysis.risk === 'medium', 'Redirect parameter should be medium risk');
  });
  
  await test('analyzeLinks should analyze complete content', async () => {
    const content = 'Check this link: https://example.com/page and also this one: http://bit.ly/12345';
    const result = await linkChecker.analyzeLinks(content);
    
    assert(result.count > 0, 'Should find links in content');
    assert(result.links.length > 0, 'Should analyze links');
    assert(result.risk !== undefined, 'Should assess overall risk');
    assert(typeof result.summary === 'string', 'Should generate summary');
  });
  
  await test('analyzeLinks should analyze HTML content', async () => {
    const htmlContent = '<a href="https://example.com">Link</a> <img src="https://images.com/pic.jpg">';
    const result = await linkChecker.analyzeLinks('', htmlContent);
    
    assert(result.count > 0, 'Should find links in HTML content');
    assert(result.domains.some(d => d.domain === 'example.com'), 'Should extract domains from HTML');
    assert(result.domains.some(d => d.domain === 'images.com'), 'Should extract domains from image sources');
  });
  
  await test('generateSummary should provide appropriate summary', () => {
    const highRiskLinks = [{ risk: 'high' }, { risk: 'medium' }, { risk: 'low' }];
    const highRiskSummary = linkChecker.generateSummary(highRiskLinks);
    assert(highRiskSummary.includes('dangereux'), 'Should warn about dangerous links');
    
    const mediumRiskLinks = [{ risk: 'medium' }, { risk: 'low' }];
    const mediumRiskSummary = linkChecker.generateSummary(mediumRiskLinks);
    assert(mediumRiskSummary.includes('suspect'), 'Should warn about suspicious links');
    
    const lowRiskLinks = [{ risk: 'low' }, { risk: 'low' }];
    const lowRiskSummary = linkChecker.generateSummary(lowRiskLinks);
    assert(lowRiskSummary.includes('aucun risque'), 'Should indicate no risk');
  });
  
  console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed`);
};

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});