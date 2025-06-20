import assert from 'assert';
import { attachmentChecker } from '../modules/analysis/attachmentChecker.js';

globalThis.browser = {
  storage: {
    local: {
      get: async (key) => {
        const result = {};
        if (key === 'dangerousExtensions' || key.includes('dangerousExtensions')) {
          result.dangerousExtensions = ['malware', 'trojan'];
        }
        if (key === 'safeExtensions' || key.includes('safeExtensions')) {
          result.safeExtensions = ['safe', 'trusted'];
        }
        return result;
      },
      set: async () => {}
    }
  }
};

globalThis.storage = {
  get: async (key, defaultValue) => {
    if (key === 'dangerousExtensions') {
      return ['malware', 'trojan'];
    }
    if (key === 'safeExtensions') {
      return ['safe', 'trusted'];
    }
    return defaultValue;
  },
  set: async () => {},
  addToList: async () => {},
  removeFromList: async () => {}
};

globalThis.STORAGE_KEYS = {
  DANGEROUS_EXTENSIONS: 'dangerousExtensions',
  SAFE_EXTENSIONS: 'safeExtensions'
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
  
  const resetAttachmentChecker = () => {
    attachmentChecker.clearCache();
  };
  
  await test('getFileExtension should extract file extensions correctly', () => {
    resetAttachmentChecker();
    
    assert.strictEqual(attachmentChecker.getFileExtension('document.pdf'), 'pdf', 'Should extract pdf extension');
    assert.strictEqual(attachmentChecker.getFileExtension('image.jpg'), 'jpg', 'Should extract jpg extension');
    assert.strictEqual(attachmentChecker.getFileExtension('archive.tar.gz'), 'gz', 'Should extract last extension in multi-extension files');
    assert.strictEqual(attachmentChecker.getFileExtension('noextension'), '', 'Should return empty string for no extension');
    assert.strictEqual(attachmentChecker.getFileExtension(''), '', 'Should handle empty strings');
    assert.strictEqual(attachmentChecker.getFileExtension('.hidden'), 'hidden', 'Should handle hidden files');
  });
  
  await test('getRiskLevel should return correct risk levels', () => {
    resetAttachmentChecker();
    
    assert.strictEqual(attachmentChecker.getRiskLevel(-1), 'high', 'Should return high for -1');
    assert.strictEqual(attachmentChecker.getRiskLevel(0), 'low', 'Should return low for 0');
    assert.strictEqual(attachmentChecker.getRiskLevel(1), 'medium', 'Should return medium for 1');
    assert.strictEqual(attachmentChecker.getRiskLevel(2), 'unknown', 'Should return unknown for unexpected values');
  });
  
  await test('analyzeExtension should classify extensions correctly', async () => {
    resetAttachmentChecker();
    
    const dangerousAnalysis = { extension: 'exe', risk: 'low', reasons: [], recommendations: [] };
    await attachmentChecker.analyzeExtension(dangerousAnalysis);
    assert.strictEqual(dangerousAnalysis.risk, 'high', 'Should classify exe as high risk');
    
    const suspiciousAnalysis = { extension: 'zip', risk: 'low', reasons: [], recommendations: [] };
    await attachmentChecker.analyzeExtension(suspiciousAnalysis);
    assert.strictEqual(suspiciousAnalysis.risk, 'medium', 'Should classify zip as medium risk');
    
    const safeAnalysis = { extension: 'jpg', risk: 'low', reasons: [], recommendations: [] };
    await attachmentChecker.analyzeExtension(safeAnalysis);
    assert.strictEqual(safeAnalysis.risk, 'low', 'Should classify jpg as low risk');
    
    const unknownAnalysis = { extension: 'xyz', risk: 'low', reasons: [], recommendations: [] };
    await attachmentChecker.analyzeExtension(unknownAnalysis);
    assert.strictEqual(unknownAnalysis.risk, 'medium', 'Should classify unknown extensions as medium risk');
    
    const customDangerousAnalysis = { extension: 'malware', risk: 'low', reasons: [], recommendations: [] };
    await attachmentChecker.analyzeExtension(customDangerousAnalysis);
    assert.strictEqual(customDangerousAnalysis.risk, 'high', 'Should classify custom dangerous extension as high risk');
    
    const customSafeAnalysis = { extension: 'safe', risk: 'medium', reasons: [], recommendations: [] };
    await attachmentChecker.analyzeExtension(customSafeAnalysis);
    assert.strictEqual(customSafeAnalysis.risk, 'low', 'Should classify custom safe extension as low risk');
  });
  
  await test('analyzeFileName should detect suspicious file names', () => {
    resetAttachmentChecker();
    
    const doubleExtensionAnalysis = { name: 'document.pdf.exe', extension: 'exe', risk: 'low', reasons: [], recommendations: [] };
    attachmentChecker.analyzeFileName(doubleExtensionAnalysis);
    assert.strictEqual(doubleExtensionAnalysis.risk, 'high', 'Should detect double extension as high risk');
    
    const malwareNameAnalysis = { name: 'invoice.exe', extension: 'exe', risk: 'low', reasons: [], recommendations: [] };
    attachmentChecker.analyzeFileName(malwareNameAnalysis);
    assert.strictEqual(malwareNameAnalysis.risk, 'high', 'Should detect common malware name as high risk');
    
    const nonAsciiAnalysis = { name: 'documenté.pdf', extension: 'pdf', risk: 'low', reasons: [], recommendations: [] };
    attachmentChecker.analyzeFileName(nonAsciiAnalysis);
    assert.strictEqual(nonAsciiAnalysis.risk, 'medium', 'Should detect non-ASCII characters as medium risk');
    
    const longNameAnalysis = { name: 'a'.repeat(101) + '.pdf', extension: 'pdf', risk: 'low', reasons: [], recommendations: [] };
    attachmentChecker.analyzeFileName(longNameAnalysis);
    assert.strictEqual(longNameAnalysis.risk, 'medium', 'Should detect very long names as medium risk');
    
    const normalNameAnalysis = { name: 'document.pdf', extension: 'pdf', risk: 'low', reasons: [], recommendations: [] };
    attachmentChecker.analyzeFileName(normalNameAnalysis);
    assert.strictEqual(normalNameAnalysis.risk, 'low', 'Should keep normal filenames as low risk');
  });
  
  await test('analyzeFileSize should analyze file sizes correctly', () => {
    resetAttachmentChecker();
    
    const smallExeAnalysis = { size: 500, extension: 'exe', risk: 'low', reasons: [], recommendations: [] };
    attachmentChecker.analyzeFileSize(smallExeAnalysis);
    assert.strictEqual(smallExeAnalysis.risk, 'high', 'Should classify small executable as high risk');
    
    const largeFileAnalysis = { size: 150 * 1024 * 1024, extension: 'zip', risk: 'low', reasons: [], recommendations: [] };
    attachmentChecker.analyzeFileSize(largeFileAnalysis);
    assert.strictEqual(largeFileAnalysis.risk, 'medium', 'Should classify very large files as medium risk');
    
    const emptyFileAnalysis = { size: 0, extension: 'txt', risk: 'low', reasons: [], recommendations: [] };
    attachmentChecker.analyzeFileSize(emptyFileAnalysis);
    assert.strictEqual(emptyFileAnalysis.risk, 'medium', 'Should classify empty files as medium risk');
    
    const normalFileAnalysis = { size: 1024 * 1024, extension: 'pdf', risk: 'low', reasons: [], recommendations: [] };
    attachmentChecker.analyzeFileSize(normalFileAnalysis);
    assert.strictEqual(normalFileAnalysis.risk, 'low', 'Should keep normal file sizes as low risk');
  });
  
  await test('analyzeMimeType should analyze MIME types correctly', () => {
    resetAttachmentChecker();
    
    const dangerousMimeAnalysis = { mimeType: 'application/x-msdownload', extension: 'exe', risk: 'low', reasons: [], recommendations: [] };
    attachmentChecker.analyzeMimeType(dangerousMimeAnalysis);
    assert.strictEqual(dangerousMimeAnalysis.risk, 'high', 'Should classify dangerous MIME types as high risk');
    
    const mismatchedAnalysis = { mimeType: 'image/jpeg', extension: 'pdf', risk: 'low', reasons: [], recommendations: [] };
    attachmentChecker.analyzeMimeType(mismatchedAnalysis);
    assert.strictEqual(mismatchedAnalysis.risk, 'medium', 'Should detect mismatched MIME type and extension');
    
    const matchingAnalysis = { mimeType: 'image/jpeg', extension: 'jpg', risk: 'low', reasons: [], recommendations: [] };
    attachmentChecker.analyzeMimeType(matchingAnalysis);
    assert.strictEqual(matchingAnalysis.risk, 'low', 'Should keep matching MIME types and extensions as low risk');
  });
  
  await test('generateSummary should create correct summary text', () => {
    resetAttachmentChecker();
    
    const mixedResults = [
      { risk: 'high' },
      { risk: 'medium' },
      { risk: 'low' },
      { risk: 'low' }
    ];
    const mixedSummary = attachmentChecker.generateSummary(mixedResults);
    assert(mixedSummary.includes('1 fichier(s) dangereux'), 'Summary should count high risk files');
    assert(mixedSummary.includes('1 fichier(s) suspects'), 'Summary should count medium risk files');
    assert(mixedSummary.includes('2 fichier(s) sûrs'), 'Summary should count low risk files');
    
    const safeResults = [
      { risk: 'low' },
      { risk: 'low' },
      { risk: 'low' }
    ];
    const safeSummary = attachmentChecker.generateSummary(safeResults);
    assert(safeSummary.includes('3 fichier(s) sûrs'), 'Summary should count only safe files');
    assert(!safeSummary.includes('dangereux'), 'Summary should not mention dangerous files when none exist');
  });
  
  await test('analyzeAttachment should analyze attachments correctly', async () => {
    resetAttachmentChecker();
    
    const dangerousAttachment = { name: 'malware.exe', size: 500, contentType: 'application/x-msdownload' };
    const dangerousResult = await attachmentChecker.analyzeAttachment(dangerousAttachment);
    assert.strictEqual(dangerousResult.risk, 'high', 'Should classify executable as high risk');
    assert.strictEqual(dangerousResult.extension, 'exe', 'Should extract correct extension');
    
    const suspiciousAttachment = { name: 'archive.zip', size: 150 * 1024 * 1024, contentType: 'application/zip' };
    const suspiciousResult = await attachmentChecker.analyzeAttachment(suspiciousAttachment);
    assert.strictEqual(suspiciousResult.risk, 'medium', 'Should classify large zip as medium risk');
    
    const safeAttachment = { name: 'document.pdf', size: 1024 * 1024, contentType: 'application/pdf' };
    const safeResult = await attachmentChecker.analyzeAttachment(safeAttachment);
    assert.strictEqual(safeResult.extension, 'pdf', 'Should extract correct extension');
    
    const cachedResult = await attachmentChecker.analyzeAttachment(safeAttachment);
    assert.deepStrictEqual(cachedResult, safeResult, 'Should return cached result for same attachment');
  });
  
  await test('analyzeAttachments should analyze multiple attachments', async () => {
    resetAttachmentChecker();
    
    const emptyResult = await attachmentChecker.analyzeAttachments([]);
    assert.strictEqual(emptyResult.count, 0, 'Should count zero attachments');
    assert.strictEqual(emptyResult.risk, 'none', 'Should have no risk for empty list');
    
    const attachments = [
      { name: 'document.pdf', size: 1024 * 1024, contentType: 'application/pdf' },
      { name: 'malware.exe', size: 500, contentType: 'application/x-msdownload' }
    ];
    const result = await attachmentChecker.analyzeAttachments(attachments);
    assert.strictEqual(result.count, 2, 'Should count correct number of attachments');
    assert.strictEqual(result.risk, 'high', 'Should take highest risk level');
    assert.strictEqual(result.details.length, 2, 'Should include all attachment details');
    assert(result.summary.includes('dangereux'), 'Summary should mention dangerous files');
  });
  
  await test('Cache methods should work correctly', () => {
    resetAttachmentChecker();
    
    attachmentChecker.cache.set('test', { result: 'data', timestamp: Date.now() });
    assert.strictEqual(attachmentChecker.cache.size, 1, 'Cache should contain one item');
    
    attachmentChecker.clearCache();
    assert.strictEqual(attachmentChecker.cache.size, 0, 'Cache should be empty after clearing');
  });
  
  console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed`);
};

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});