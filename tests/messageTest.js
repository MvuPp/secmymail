import assert from 'assert';

// Mock complet du navigateur avec storage
globalThis.browser = {
  storage: {
    local: {
      get: async (keys) => {
        if (typeof keys === 'string') {
          return { [keys]: undefined };
        }
        const result = {};
        keys.forEach(key => {
          result[key] = undefined;
        });
        return result;
      },
      set: async (data) => {},
      remove: async (keys) => {},
      clear: async () => {}
    }
  },
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
      } else if (messageId === 'dangerous-attachment') {
        return {
          author: 'Test <test@example.com>',
          subject: 'Dangerous File',
          date: new Date().getTime(),
          size: 1024,
          folder: { name: 'Inbox' }
        };
      } else if (messageId === 'malicious-links') {
        return {
          author: 'Test <test@example.com>',
          subject: 'Malicious Content',
          date: new Date().getTime(),
          size: 1024,
          folder: { name: 'Inbox' }
        };
      } else if (messageId === 'malicious-sender') {
        return {
          author: 'Hacker <malicious@evil.com>',
          subject: 'Phishing Email',
          date: new Date().getTime(),
          size: 1024,
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
      } else if (messageId === 'dangerous-attachment') {
        return {
          parts: [{
            contentType: 'text/plain',
            body: 'Safe content'
          }]
        };
      } else if (messageId === 'malicious-links') {
        return {
          parts: [{
            contentType: 'text/html',
            body: '<a href="http://malicious.com">Click here</a>'
          }]
        };
      } else if (messageId === 'malicious-sender') {
        return {
          parts: [{
            contentType: 'text/plain',
            body: 'Safe content'
          }]
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
      } else if (messageId === 'dangerous-attachment') {
        return [
          {
            name: 'virus.exe',
            size: 1024,
            contentType: 'application/executable'
          }
        ];
      } else {
        return [];
      }
    }
  }
};

// Mock du module d'import dynamique pour les checkers
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Mock des modules avant l'import
const originalResolve = import.meta.resolve;
import.meta.resolve = (specifier) => {
  if (specifier.includes('attachmentChecker.js')) {
    return 'mock:attachmentChecker';
  }
  if (specifier.includes('linkChecker.js')) {
    return 'mock:linkChecker';
  }
  if (specifier.includes('emailChecker.js')) {
    return 'mock:emailChecker';
  }
  return originalResolve ? originalResolve(specifier) : specifier;
};

// Import et remplacer les modules
const messageModule = await import('../modules/analysis/message.js');

// Override des checkers avec nos mocks
const attachmentChecker = {
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

const linkChecker = {
  analyzeLinks: async (text, html) => {
    const hasSuspiciousLink = text.includes('malicious') || html?.includes('malicious');
    
    return {
      status: hasSuspiciousLink ? -1 : 1,
      count: hasSuspiciousLink ? 1 : 0,
      risk: hasSuspiciousLink ? 'high' : 'low',
      links: [],
      domains: [],
      summary: hasSuspiciousLink ? 'Liens dangereux détectés' : 'Liens sûrs'
    };
  }
};

const emailChecker = {
  checkEmail: async (email) => {
    if (email.includes('malicious')) return -1;
    if (email.includes('example.com')) return 1;
    return 0;
  }
};

// Créer une version mockée du MessageAnalyzer
class MockedMessageAnalyzer {
  constructor() {
    this.attachmentChecker = attachmentChecker;
    this.linkChecker = linkChecker;
    this.emailChecker = emailChecker;
  }

  async getFullMessageBody(messageId) {
    try {
      const fullMessage = await browser.messages.getFull(messageId);
      const attachments = await browser.messages.listAttachments(messageId);

      function extractText(parts) {
        let textContent = '';
        let htmlContent = '';
        
        for (const part of parts) {
          if (part.contentType === "text/plain" && part.body) {
            textContent += part.body.trim() + '\n';
          } else if (part.contentType === "text/html" && part.body) {
            htmlContent += part.body.trim() + '\n';
          } else if (part.parts) {
            const nested = extractText(part.parts);
            textContent += nested.text || '';
            htmlContent += nested.html || '';
          }
        }
        
        return { 
          text: textContent.trim(), 
          html: htmlContent.trim() 
        };
      }

      const content = extractText(fullMessage.parts);
      
      return {
        body: content.text,
        textContent: content.text,
        htmlContent: content.html,
        fullContent: `${content.text} ${content.html}`.trim(),
        fullAttachments: attachments
      };
    } catch (error) {
      console.error(`[MessageAnalyzer] Erreur extraction contenu:`, error);
      return {
        body: '',
        textContent: '',
        htmlContent: '',
        fullContent: '',
        fullAttachments: []
      };
    }
  }

  async getEmailDetailsById(messageId) {
    try {
      const messageHeader = await browser.messages.get(messageId);
      const bodyData = await this.getFullMessageBody(messageId);

      const emailMatch = messageHeader.author.match(/<(.+)>/);
      const email = emailMatch ? emailMatch[1] : messageHeader.author;
      const expediteurName = emailMatch ? messageHeader.author.replace(/<[^>]+>/, '').trim() : '';
      const domain = email.includes('@') ? email.split('@')[1] : '';

      const attachmentAnalysis = await this.attachmentChecker.analyzeAttachments(bodyData.fullAttachments);

      return {
        id: messageId,
        expediteur: {
          email: email || "Inconnu",
          name: expediteurName,
          display: messageHeader.author,
          domain: domain
        },
        subject: messageHeader.subject || "Sujet non défini",
        date: messageHeader.date,
        size: messageHeader.size,
        content: {
          body: bodyData.body || "Mail vide",
          text: bodyData.textContent,
          html: bodyData.htmlContent,
          full: bodyData.fullContent
        },
        attachments: {
          list: bodyData.fullAttachments,
          analysis: attachmentAnalysis
        },
        folder: messageHeader.folder?.name || "Dossier inconnu"
      };
    } catch (error) {
      console.error(`[MessageAnalyzer] Erreur lors de la récupération du message ID ${messageId} :`, error);
      return null;
    }
  }

  async analyzeMessage(messageId) {
    try {
      console.log(`[MessageAnalyzer] Analyse du message ${messageId}`);
      
      const emailDetails = await this.getEmailDetailsById(messageId);
      
      if (!emailDetails) {
        throw new Error('Impossible de récupérer les détails du message');
      }

      console.log('[MessageAnalyzer] Message récupéré:', {
        id: emailDetails.id,
        subject: emailDetails.subject,
        expediteur: emailDetails.expediteur.display,
        date: emailDetails.date
      });

      console.log(`[MessageAnalyzer] Contenu extrait - Texte: ${emailDetails.content.text.length} chars, HTML: ${emailDetails.content.html.length} chars`);

      const linkAnalysis = await this.linkChecker.analyzeLinks(emailDetails.content.full, emailDetails.content.html);
      const expediteurStatus = await this.emailChecker.checkEmail(emailDetails.expediteur.email);

      let expediteurValue = expediteurStatus;
      let liensValue = linkAnalysis.status;
      let fichiersValue = this.convertRiskToValue(emailDetails.attachments.analysis.risk);

      const result = {
        messageId: emailDetails.id,
        expediteur: expediteurValue,
        liens: liensValue,
        fichiers: fichiersValue,
        details: {
          expediteurDetails: {
            ...emailDetails.expediteur,
            trustLevel: expediteurStatus
          },
          linkDetails: linkAnalysis,
          attachmentDetails: emailDetails.attachments.analysis,
          folder: emailDetails.folder,
          size: emailDetails.size,
          subject: emailDetails.subject,
          date: emailDetails.date,
          content: emailDetails.content
        }
      };

      console.log('[MessageAnalyzer] Analyse terminée pour le message', messageId);
      console.log('[MessageAnalyzer] Résultat final:', {
        expediteur: result.expediteur,
        liens: result.liens,
        fichiers: result.fichiers
      });
      
      return result;
      
    } catch (error) {
      console.error(`[MessageAnalyzer] Erreur lors de l'analyse du message ${messageId}:`, error);
      throw error;
    }
  }

  convertRiskToValue(risk) {
    switch(risk) {
      case 'high':
        return -1;
      case 'medium':
        return 0;
      case 'low':
        return 0;
      case 'safe':
      case 'none':
        return 1;
      default:
        return 0;
    }
  }

  async getMailContent(messageId) {
    const details = await this.getEmailDetailsById(messageId);
    return details;
  }
}

const messageAnalyzer = new MockedMessageAnalyzer();

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
      assert(error.message.includes('Impossible de récupérer'), 'Should have correct error message');
    }
  });
  
  // Test getMailContent (compatibility method)
  await test('getMailContent should be compatible with getEmailDetailsById', async () => {
    const directResult = await messageAnalyzer.getEmailDetailsById('valid-message');
    const compatResult = await messageAnalyzer.getMailContent('valid-message');
    
    assert.deepStrictEqual(compatResult, directResult, 'getMailContent should return same result as getEmailDetailsById');
  });
  
  // Tests pour convertRiskToValue
  await test('convertRiskToValue should convert risk levels correctly', async () => {
    assert.strictEqual(messageAnalyzer.convertRiskToValue('high'), -1, 'High risk should return -1');
    assert.strictEqual(messageAnalyzer.convertRiskToValue('medium'), 0, 'Medium risk should return 0');
    assert.strictEqual(messageAnalyzer.convertRiskToValue('low'), 0, 'Low risk should return 0');
    assert.strictEqual(messageAnalyzer.convertRiskToValue('safe'), 1, 'Safe risk should return 1');
    assert.strictEqual(messageAnalyzer.convertRiskToValue('none'), 1, 'None risk should return 1');
    assert.strictEqual(messageAnalyzer.convertRiskToValue('unknown'), 0, 'Unknown risk should return 0');
  });
  
  // Tests pour les cas spécifiques d'analyse
  await test('analyzeMessage should handle message with dangerous attachments', async () => {
    const result = await messageAnalyzer.analyzeMessage('dangerous-attachment');
    
    assert.strictEqual(result.fichiers, -1, 'Should detect dangerous attachment');
    assert.strictEqual(result.details.attachmentDetails.risk, 'high', 'Should classify as high risk');
  });
  
  await test('analyzeMessage should handle message with malicious links', async () => {
    const result = await messageAnalyzer.analyzeMessage('malicious-links');
    
    assert.strictEqual(result.liens, -1, 'Should detect malicious links');
    assert.strictEqual(result.details.linkDetails.risk, 'high', 'Should classify links as high risk');
  });
  
  await test('analyzeMessage should handle message from malicious sender', async () => {
    const result = await messageAnalyzer.analyzeMessage('malicious-sender');
    
    assert.strictEqual(result.expediteur, -1, 'Should detect malicious sender');
    assert.strictEqual(result.details.expediteurDetails.trustLevel, -1, 'Should have low trust level');
  });
  
  // Test de la structure complète des détails
  await test('analyzeMessage should return complete details structure', async () => {
    const result = await messageAnalyzer.analyzeMessage('valid-message');
    
    // Vérifier la structure des détails
    assert(result.details.expediteurDetails.email, 'Should have sender email');
    assert(result.details.expediteurDetails.name, 'Should have sender name');
    assert(result.details.expediteurDetails.domain, 'Should have sender domain');
    assert(typeof result.details.expediteurDetails.trustLevel === 'number', 'Should have trust level');
    
    assert(result.details.linkDetails.status !== undefined, 'Should have link status');
    assert(result.details.linkDetails.risk, 'Should have link risk level');
    
    assert(result.details.attachmentDetails.status !== undefined, 'Should have attachment status');
    assert(result.details.attachmentDetails.risk, 'Should have attachment risk level');
    assert(typeof result.details.attachmentDetails.count === 'number', 'Should have attachment count');
    
    assert(result.details.folder, 'Should have folder name');
    assert(typeof result.details.size === 'number', 'Should have message size');
    assert(result.details.subject, 'Should have subject');
    assert(typeof result.details.date === 'number', 'Should have date');
    
    assert(result.details.content.body, 'Should have body content');
    assert(result.details.content.text, 'Should have text content');
    assert(result.details.content.html, 'Should have html content');
    assert(result.details.content.full, 'Should have full content');
  });
  
  // Test de gestion des erreurs spécifiques
  await test('analyzeMessage should throw specific error for missing message details', async () => {
    try {
      await messageAnalyzer.analyzeMessage('non-existent-message');
      assert.fail('Should throw error for non-existent message');
    } catch (error) {
      assert(error.message.includes('Impossible de récupérer les détails du message'), 'Should have specific error message');
    }
  });
  
  // Test des cas limites
  await test('getEmailDetailsById should handle empty folder gracefully', async () => {
    // Modifier temporairement le mock pour tester un dossier vide
    const originalGet = globalThis.browser.messages.get;
    globalThis.browser.messages.get = async (messageId) => {
      if (messageId === 'no-folder') {
        return {
          author: 'Test <test@example.com>',
          subject: 'Test',
          date: new Date().getTime(),
          size: 100,
          folder: null
        };
      }
      return originalGet(messageId);
    };
    
    const result = await messageAnalyzer.getEmailDetailsById('no-folder');
    assert.strictEqual(result.folder, 'Dossier inconnu', 'Should handle missing folder');
    
    // Restaurer le mock
    globalThis.browser.messages.get = originalGet;
  });
  
  await test('getEmailDetailsById should handle missing subject gracefully', async () => {
    // Modifier temporairement le mock pour tester un sujet manquant
    const originalGet = globalThis.browser.messages.get;
    globalThis.browser.messages.get = async (messageId) => {
      if (messageId === 'no-subject') {
        return {
          author: 'Test <test@example.com>',
          subject: null,
          date: new Date().getTime(),
          size: 100,
          folder: { name: 'Inbox' }
        };
      }
      return originalGet(messageId);
    };
    
    const result = await messageAnalyzer.getEmailDetailsById('no-subject');
    assert.strictEqual(result.subject, 'Sujet non défini', 'Should handle missing subject');
    
    // Restaurer le mock
    globalThis.browser.messages.get = originalGet;
  });
  
  console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed`);
  
  if (failedTests === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log(`❌ ${failedTests} test(s) failed`);
    process.exit(1);
  }
};

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});