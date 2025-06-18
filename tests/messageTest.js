import assert from 'assert';

globalThis.browser = {
  messages: {
    get: async (messageId) => {
      if (messageId === 'valid-message') {
        return {
          author: 'Sender Name <sender@example.com>',
          subject: 'Test Email Subject',
          date: new Date().getTime(),
          size: 12345,
          folder: { name: 'Inbox' }
        };
      } else if (messageId === 'no-author-email') {
        return {
          author: 'Sender Name',
          subject: 'No Email Address',
          date: new Date().getTime(),
          size: 5000,
          folder: { name: 'Inbox' }
        };
      } else if (messageId === 'empty-message') {
        return {
          author: '',
          subject: '',
          date: new Date().getTime(),
          size: 0,
          folder: { name: 'Inbox' }
        };
      } else {
        throw new Error('Message not found');
      }
    },
    getFull: async (messageId) => {
      if (messageId === 'valid-message') {
        return {
          parts: [
            {
              contentType: 'text/plain',
              body: 'This is plain text content'
            },
            {
              contentType: 'text/html',
              body: '<p>This is HTML content</p>'
            }
          ]
        };
      } else if (messageId === 'nested-message') {
        return {
          parts: [
            {
              contentType: 'multipart/alternative',
              parts: [
                {
                  contentType: 'text/plain',
                  body: 'Nested plain text'
                },
                {
                  contentType: 'text/html',
                  body: '<p>Nested HTML</p>'
                }
              ]
            }
          ]
        };
      } else if (messageId === 'empty-message') {
        return {
          parts: []
        };
      } else {
        throw new Error('Message not found');
      }
    },
    listAttachments: async (messageId) => {
      if (messageId === 'valid-message') {
        return [
          {
            name: 'document.pdf',
            size: 12345,
            contentType: 'application/pdf'
          }
        ];
      } else if (messageId === 'with-attachments') {
        return [
          {
            name: 'document.pdf',
            size: 12345,
            contentType: 'application/pdf'
          },
          {
            name: 'image.jpg',
            size: 54321,
            contentType: 'image/jpeg'
          }
        ];
      } else {
        return [];
      }
    }
  }
};

globalThis.storage = {
  get: async (key, defaultValue) => defaultValue,
  set: async () => {},
  addToList: async () => {},
  removeFromList: async () => {}
};

globalThis.attachmentChecker = {
  analyzeAttachments: async (attachments) => {
    if (attachments.length === 0) {
      return { status: 1, count: 0, risk: 'none', details: [], summary: 'Aucune pièce jointe' };
    }
    
    const hasDangerous = attachments.some(a => a.name.endsWith('.exe'));
    
    return {
      status: hasDangerous ? -1 : 1,
      count: attachments.length,
      risk: hasDangerous ? 'high' : 'low',
      details: attachments.map(a => ({
        name: a.name,
        size: a.size,
        risk: a.name.endsWith('.exe') ? 'high' : 'low'
      })),
      summary: hasDangerous ? 'Pièces jointes dangereuses détectées' : 'Pièces jointes sûres'
    };
  }
};

globalThis.linkChecker = {
  analyzeLinks: async (text, html) => {
    const hasSuspiciousLink = text.includes('malicious') || html?.includes('malicious');
    
    return {
      status: hasSuspiciousLink ? -1 : 1,
      count: 1,
      risk: hasSuspiciousLink ? 'high' : 'low',
      links: [],
      domains: [],
      summary: hasSuspiciousLink ? 'Liens dangereux détectés' : 'Liens sûrs'
    };
  }
};

globalThis.emailChecker = {
  checkEmail: async (email) => {
    if (email.includes('malicious')) return -1;
    if (email.includes('example.com')) return 1;
    return 0;
  }
};

import { messageAnalyzer } from '../modules/analysis/message.js';

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
  
  // Test getFullMessageBody
  await test('getFullMessageBody should extract text and html content correctly', async () => {
    const result = await messageAnalyzer.getFullMessageBody('valid-message');
    
    assert.strictEqual(result.textContent, 'This is plain text content', 'Should extract plain text content');
    assert.strictEqual(result.htmlContent, '<p>This is HTML content</p>', 'Should extract HTML content');
    assert.strictEqual(result.body, 'This is plain text content', 'Should set body for compatibility');
    assert.strictEqual(result.fullContent, 'This is plain text content <p>This is HTML content</p>', 'Should combine text and HTML content');
    assert(Array.isArray(result.fullAttachments), 'Should include attachments as array');
    assert.strictEqual(result.fullAttachments.length, 1, 'Should have one attachment');
  });
  
  await test('getFullMessageBody should handle nested content correctly', async () => {
    const result = await messageAnalyzer.getFullMessageBody('nested-message');
    
    assert.strictEqual(result.textContent, 'Nested plain text', 'Should extract nested plain text');
    assert.strictEqual(result.htmlContent, '<p>Nested HTML</p>', 'Should extract nested HTML');
  });
  
  await test('getFullMessageBody should handle empty messages gracefully', async () => {
    const result = await messageAnalyzer.getFullMessageBody('empty-message');
    
    assert.strictEqual(result.textContent, '', 'Should return empty text for empty message');
    assert.strictEqual(result.htmlContent, '', 'Should return empty HTML for empty message');
    assert.strictEqual(result.fullAttachments.length, 0, 'Should have no attachments');
  });
  
  await test('getFullMessageBody should handle error gracefully', async () => {
    const result = await messageAnalyzer.getFullMessageBody('non-existent-message');
    
    assert.strictEqual(result.textContent, '', 'Should return empty text on error');
    assert.strictEqual(result.htmlContent, '', 'Should return empty HTML on error');
    assert.strictEqual(result.fullAttachments.length, 0, 'Should have empty attachments on error');
  });
  
  // Test getEmailDetailsById
  await test('getEmailDetailsById should extract email details correctly', async () => {
    const result = await messageAnalyzer.getEmailDetailsById('valid-message');
    
    assert.strictEqual(result.id, 'valid-message', 'Should set correct ID');
    assert.strictEqual(result.expediteur.email, 'sender@example.com', 'Should extract sender email');
    assert.strictEqual(result.expediteur.name, 'Sender Name', 'Should extract sender name');
    assert.strictEqual(result.expediteur.domain, 'example.com', 'Should extract sender domain');
    assert.strictEqual(result.subject, 'Test Email Subject', 'Should extract subject');
    assert(result.content.body, 'Should have body content');
    assert(Array.isArray(result.attachments.list), 'Should have attachments list');
    assert.strictEqual(result.folder, 'Inbox', 'Should extract folder name');
  });
  
  await test('getEmailDetailsById should handle missing email in author', async () => {
    const result = await messageAnalyzer.getEmailDetailsById('no-author-email');
    
    assert.strictEqual(result.expediteur.email, 'Sender Name', 'Should use full author as email when no email found');
    assert.strictEqual(result.expediteur.name, '', 'Should have empty name when no email pattern found');
    assert.strictEqual(result.expediteur.domain, '', 'Should have empty domain when no email found');
  });
  
  await test('getEmailDetailsById should handle error gracefully', async () => {
    const result = await messageAnalyzer.getEmailDetailsById('non-existent-message');
    
    assert.strictEqual(result, null, 'Should return null on error');
  });
  
  // Test analyzeMessage
  await test('analyzeMessage should perform complete analysis correctly', async () => {
    const result = await messageAnalyzer.analyzeMessage('valid-message');
    
    assert.strictEqual(result.messageId, 'valid-message', 'Should set correct message ID');
    assert.strictEqual(typeof result.expediteur, 'number', 'Should have expediteur trust level');
    assert.strictEqual(typeof result.liens, 'number', 'Should have liens status');
    assert.strictEqual(typeof result.fichiers, 'number', 'Should have fichiers status');
    assert(result.details, 'Should include details object');
    assert(result.details.expediteurDetails, 'Should include expediteur details');
    assert(result.details.linkDetails, 'Should include link details');
    assert(result.details.attachmentDetails, 'Should include attachment details');
  });
  
  await test('analyzeMessage should handle error gracefully', async () => {
    try {
      await messageAnalyzer.analyzeMessage('non-existent-message');
      assert.fail('Should throw an error for non-existent message');
    } catch (error) {
      assert(error instanceof Error, 'Should throw error for invalid message ID');
    }
  });
  
  // Test getMailContent (compatibility method)
  await test('getMailContent should be compatible with getEmailDetailsById', async () => {
    const directResult = await messageAnalyzer.getEmailDetailsById('valid-message');
    const compatResult = await messageAnalyzer.getMailContent('valid-message');
    
    assert.deepStrictEqual(compatResult, directResult, 'getMailContent should return same result as getEmailDetailsById');
  });
  
  console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed`);
};

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});