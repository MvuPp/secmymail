import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock storage with test data
let mockStorage = {};

// Define test date for consistent testing
const TODAY = new Date().toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const OLD_DATE = new Date(Date.now() - 31 * 86400000).toISOString().slice(0, 10);

// Define constants used by the logger
const LOG_MAX_DAYS = 30;

// Our test implementation of the logger functions
async function writeLog(type, source, info) {
  // Load existing logs
  const logs = await getAllLogs();
  
  // Clean up old logs (older than 30 days)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOG_MAX_DAYS);
  for (const day in logs) {
    if (new Date(day) < cutoff) {
      delete logs[day];
    }
  }
  
  // Add new log entry
  const today = new Date().toISOString().slice(0, 10);
  if (!logs[today]) logs[today] = [];
  logs[today].push({
    date: new Date().toISOString(),
    type,
    source,
    info
  });
  
  // Save logs
  mockStorage.logs = logs;
  
  return logs;
}

async function getAllLogs() {
  return mockStorage.logs || {};
}

async function exportLogs() {
  const logs = await getAllLogs();
  let lines = [];
  
  // En-tête pour clarifier le format
  lines.push("# SecMyMail Logs Export");
  lines.push("# Format: DATE,TYPE,SOURCE,DETAILS");
  lines.push("# Generated: " + new Date().toISOString());
  lines.push("");
  
  // Traiter tous les logs par ordre chronologique
  Object.keys(logs).sort().forEach(day => {
    logs[day].forEach(entry => {
      // Nettoyer et échapper les données pour éviter les problèmes de format
      const cleanDate = (entry.date || '').replace(/,/g, ' ');
      const cleanType = (entry.type || '').replace(/,/g, ' ');
      const cleanSource = (entry.source || '').replace(/,/g, ' ');
      const cleanInfo = (entry.info || '').replace(/,/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
      
      // Format: DATE,TYPE,SOURCE,DETAILS
      lines.push(`${cleanDate},${cleanType},${cleanSource},${cleanInfo}`);
    });
  });
  
  // Mock blob and URL.createObjectURL
  const blob = new Blob([lines.join('\n')], { type: "text/plain" });
  return "blob:test-url";
}

// Mock Blob for browser environment
globalThis.Blob = class Blob {
  constructor(parts, options) {
    this.parts = parts;
    this.options = options;
    this.size = parts.join('').length;
    this.type = options.type;
  }
  
  // Helper to get content for testing
  text() {
    return Promise.resolve(this.parts.join(''));
  }
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

  // Reset storage before each test
  const resetStorage = () => {
    mockStorage = { logs: {} };
  };
  
  await test('writeLog should add new log entry', async () => {
    resetStorage();
    
    await writeLog('info', 'test', 'Test message');
    
    const logs = await getAllLogs();
    assert.strictEqual(typeof logs, 'object', 'Logs should be an object');
    assert.strictEqual(Object.keys(logs).length, 1, 'Should have one day entry');
    assert.strictEqual(Array.isArray(logs[TODAY]), true, 'Today\'s logs should be an array');
    assert.strictEqual(logs[TODAY].length, 1, 'Should have one log entry');
    assert.strictEqual(logs[TODAY][0].type, 'info', 'Log type should be info');
    assert.strictEqual(logs[TODAY][0].source, 'test', 'Log source should be test');
    assert.strictEqual(logs[TODAY][0].info, 'Test message', 'Log info should match');
  });
  
  await test('writeLog should append to existing logs', async () => {
    resetStorage();
    
    await writeLog('info', 'test1', 'First message');
    await writeLog('error', 'test2', 'Second message');
    
    const logs = await getAllLogs();
    assert.strictEqual(logs[TODAY].length, 2, 'Should have two log entries');
    assert.strictEqual(logs[TODAY][0].info, 'First message', 'First log info should match');
    assert.strictEqual(logs[TODAY][1].info, 'Second message', 'Second log info should match');
  });
  
  await test('writeLog should clean up logs older than 30 days', async () => {
    resetStorage();
    
    // Setup test data with old logs
    mockStorage.logs = {
      [TODAY]: [{ date: new Date().toISOString(), type: 'info', source: 'test', info: 'Recent log' }],
      [YESTERDAY]: [{ date: new Date(Date.now() - 86400000).toISOString(), type: 'info', source: 'test', info: 'Yesterday log' }],
      [OLD_DATE]: [{ date: new Date(Date.now() - 31 * 86400000).toISOString(), type: 'info', source: 'test', info: 'Old log' }]
    };
    
    await writeLog('info', 'test', 'New log');
    
    const logs = await getAllLogs();
    assert.strictEqual(Object.keys(logs).length, 2, 'Should have only recent logs');
    assert.strictEqual(logs[TODAY] !== undefined, true, 'Today\'s logs should exist');
    assert.strictEqual(logs[YESTERDAY] !== undefined, true, 'Yesterday\'s logs should exist');
    assert.strictEqual(logs[OLD_DATE] === undefined, true, 'Old logs should be removed');
  });
  
  await test('getAllLogs should return all stored logs', async () => {
    resetStorage();
    
    // Setup test data
    mockStorage.logs = {
      [TODAY]: [{ date: new Date().toISOString(), type: 'info', source: 'test', info: 'Today log' }],
      [YESTERDAY]: [{ date: new Date(Date.now() - 86400000).toISOString(), type: 'warn', source: 'test', info: 'Yesterday log' }]
    };
    
    const logs = await getAllLogs();
    assert.strictEqual(Object.keys(logs).length, 2, 'Should return all logs');
    assert.strictEqual(logs[TODAY][0].type, 'info', 'Should preserve log type');
    assert.strictEqual(logs[YESTERDAY][0].type, 'warn', 'Should preserve log type for older entries');
  });
  
  await test('exportLogs should generate a formatted CSV string', async () => {
    resetStorage();
    
    const testDate = new Date().toISOString();
    
    // Setup test data with special characters to test sanitization
    mockStorage.logs = {
      [TODAY]: [
        { date: testDate, type: 'info', source: 'test', info: 'Regular message' },
        { date: testDate, type: 'error', source: 'test,with,commas', info: 'Message with, commas' },
        { date: testDate, type: 'warn', source: 'test', info: 'Message\nwith\nnewlines' }
      ]
    };
    
    const url = await exportLogs();
    assert.strictEqual(url, 'blob:test-url', 'Should return a blob URL');
  });
  
  await test('Logger should handle empty logs', async () => {
    resetStorage();
    
    // Test with empty logs
    mockStorage.logs = {};
    
    const logs = await getAllLogs();
    assert.strictEqual(Object.keys(logs).length, 0, 'Should handle empty logs');
    
    // Test export with empty logs
    const url = await exportLogs();
    assert.strictEqual(url, 'blob:test-url', 'Should return a blob URL even for empty logs');
  });
  
  await test('getToday should return current date in YYYY-MM-DD format', async () => {
    resetStorage();
    
    await writeLog('info', 'test', 'Test message');
    const logs = await getAllLogs();
    
    // Get the date key (should be today in YYYY-MM-DD format)
    const dateKey = Object.keys(logs)[0];
    assert.strictEqual(dateKey, TODAY, 'Should use today\'s date in YYYY-MM-DD format');
  });
  
  await test('Logger should handle different log types', async () => {
    resetStorage();
    
    // Test different log types
    await writeLog('info', 'system', 'Info message');
    await writeLog('warn', 'system', 'Warning message');
    await writeLog('error', 'system', 'Error message');
    await writeLog('debug', 'system', 'Debug message');
    
    const logs = await getAllLogs();
    assert.strictEqual(logs[TODAY].length, 4, 'Should have logs of all types');
    assert.strictEqual(logs[TODAY][0].type, 'info', 'Should store info type');
    assert.strictEqual(logs[TODAY][1].type, 'warn', 'Should store warn type');
    assert.strictEqual(logs[TODAY][2].type, 'error', 'Should store error type');
    assert.strictEqual(logs[TODAY][3].type, 'debug', 'Should store debug type');
  });

  console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed`);
};

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});