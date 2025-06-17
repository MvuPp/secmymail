import { storage, STORAGE_KEYS } from '../core/storage.js';

/**
 * Module de vérification des pièces jointes
 */
class AttachmentChecker {
  constructor() {
    this.dangerousExtensions = [
      // Exécutables Windows
      'exe', 'bat', 'com', 'cmd', 'scr', 'pif', 'cpl',
      // Scripts
      'js', 'jse', 'vbs', 'vbe', 'wsf', 'wsh', 'ps1',
      // Installateurs
      'msi', 'msp', 'app', 'deb', 'rpm', 'dmg',
      // Archives potentiellement dangereux
      'jar', 'war', 'ear',
      // Autres formats suspects
      'hta', 'url', 'lnk', 'reg', 'scf', 'test'
    ];

    this.suspiciousExtensions = [
      // Archives
      'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
      // Documents avec macros
      'doc', 'docm', 'xls', 'xlsm', 'ppt', 'pptm',
      // Autres formats à surveiller
      'iso', 'img', 'bin'
    ];

    this.safeExtensions = [
      // Images
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp',
      // Documents texte
      'txt', 'rtf', 'pdf',
      // Documents Office (sans macros)
      'docx', 'xlsx', 'pptx',
      // Audio/Vidéo
      'mp3', 'wav', 'mp4', 'avi', 'mov', 'wmv'
    ];

    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Analyse une liste de pièces jointes
   */
  async analyzeAttachments(attachments) {
    if (!attachments || attachments.length === 0) {
      return {
        count: 0,
        status: 0, // Aucune pièce jointe
        risk: 'none',
        details: []
      };
    }

    const results = [];
    let overallRisk = 0;

    for (const attachment of attachments) {
      const analysis = await this.analyzeAttachment(attachment);
      results.push(analysis);

      // Déterminer le risque global
      if (analysis.risk === 'high') {
        overallRisk = -1; // Dangereux
      } else if (analysis.risk === 'medium' && overallRisk === 0) {
        overallRisk = 1; // Suspect mais pas dangereux
      }
    }

    return {
      count: attachments.length,
      status: overallRisk,
      risk: this.getRiskLevel(overallRisk),
      details: results,
      summary: this.generateSummary(results)
    };
  }

  /**
   * Analyse une pièce jointe individuelle
   */
  async analyzeAttachment(attachment) {
    const cacheKey = `${attachment.name}_${attachment.size}`;
    
    // Vérifier le cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.result;
      }
    }

    const result = {
      name: attachment.name,
      size: attachment.size,
      extension: this.getFileExtension(attachment.name),
      mimeType: attachment.contentType || 'unknown',
      risk: 'low',
      reasons: [],
      recommendations: []
    };

    // Analyse de l'extension
    await this.analyzeExtension(result);

    // Analyse du nom de fichier
    this.analyzeFileName(result);

    // Analyse de la taille
    this.analyzeFileSize(result);

    // Analyse du type MIME
    this.analyzeMimeType(result);

    // Mettre en cache
    this.cache.set(cacheKey, {
      result: result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Analyse l'extension du fichier
   */
  async analyzeExtension(analysis) {
    const ext = analysis.extension.toLowerCase();

    if (this.dangerousExtensions.includes(ext)) {
      analysis.risk = 'high';
      analysis.reasons.push(`Extension dangereuse: .${ext}`);
      analysis.recommendations.push('Ne pas ouvrir ce fichier');
    } else if (this.suspiciousExtensions.includes(ext)) {
      analysis.risk = 'medium';
      analysis.reasons.push(`Extension suspecte: .${ext}`);
      analysis.recommendations.push('Vérifier le contenu avant ouverture');
    } else if (this.safeExtensions.includes(ext)) {
      analysis.reasons.push(`Extension sûre: .${ext}`);
    } else {
      analysis.risk = 'medium';
      analysis.reasons.push(`Extension inconnue: .${ext}`);
      analysis.recommendations.push('Extension non reconnue, prudence recommandée');
    }

    // Vérifier contre les listes personnalisées
    const customDangerous = await storage.get('dangerousExtensions', []);
    const customSafe = await storage.get('safeExtensions', []);

    if (customDangerous.includes(ext)) {
      analysis.risk = 'high';
      analysis.reasons.push('Extension dans la liste noire personnalisée');
    } else if (customSafe.includes(ext)) {
      analysis.risk = 'low';
      analysis.reasons.push('Extension dans la liste blanche personnalisée');
    }
  }

  /**
   * Analyse le nom du fichier
   */
  analyzeFileName(analysis) {
    const fileName = analysis.name.toLowerCase();

    // Patterns suspects
    const suspiciousPatterns = [
      /facture.*\.(exe|scr|bat)/i,
      /invoice.*\.(exe|scr|bat)/i,
      /document.*\.(exe|scr|bat)/i,
      /photo.*\.(exe|scr|bat)/i,
      /urgent.*\.(exe|scr|bat)/i,
      /\.pdf\.(exe|scr|bat)$/i,
      /\.jpg\.(exe|scr|bat)$/i,
      /\.(exe|scr|bat)\.pdf$/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fileName)) {
        analysis.risk = 'high';
        analysis.reasons.push('Nom de fichier suspect (double extension ou déguisement)');
        analysis.recommendations.push('Fichier potentiellement malveillant');
        break;
      }
    }

    // Noms de fichiers communs pour les malwares
    const malwareNames = [
      'invoice.exe', 'document.exe', 'photo.exe', 'video.exe',
      'update.exe', 'setup.exe', 'install.exe', 'patch.exe'
    ];

    if (malwareNames.includes(fileName)) {
      analysis.risk = 'high';
      analysis.reasons.push('Nom de fichier typique des malwares');
    }

    // Caractères suspects
    if (/[^\x00-\x7F]/.test(fileName)) {
      analysis.risk = 'medium';
      analysis.reasons.push('Nom de fichier contient des caractères non-ASCII');
    }

    // Nom très long (peut être une tentative d'obfuscation)
    if (fileName.length > 100) {
      analysis.risk = 'medium';
      analysis.reasons.push('Nom de fichier anormalement long');
    }
  }

  /**
   * Analyse la taille du fichier
   */
  analyzeFileSize(analysis) {
    const size = analysis.size;

    // Fichiers exécutables très petits (suspects)
    if (this.dangerousExtensions.includes(analysis.extension) && size < 1024) {
      analysis.risk = 'high';
      analysis.reasons.push('Fichier exécutable anormalement petit');
    }

    // Fichiers très volumineux
    if (size > 100 * 1024 * 1024) { // 100MB
      analysis.risk = 'medium';
      analysis.reasons.push('Fichier très volumineux (>100MB)');
      analysis.recommendations.push('Vérifier la légitimité du fichier');
    }

    // Fichiers de taille 0
    if (size === 0) {
      analysis.risk = 'medium';
      analysis.reasons.push('Fichier vide (0 octets)');
    }
  }

  /**
   * Analyse le type MIME
   */
  analyzeMimeType(analysis) {
    const mimeType = analysis.mimeType;
    const ext = analysis.extension;

    // Types MIME dangereux
    const dangerousMimes = [
      'application/x-msdownload',
      'application/x-executable',
      'application/x-winexe',
      'application/x-msdos-program',
      'application/x-bat',
      'application/x-sh'
    ];

    if (dangerousMimes.includes(mimeType)) {
      analysis.risk = 'high';
      analysis.reasons.push(`Type MIME dangereux: ${mimeType}`);
    }

    // Incohérence entre extension et type MIME
    const mimeExtensionMap = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'application/pdf': ['pdf'],
      'text/plain': ['txt'],
      'application/zip': ['zip']
    };

    for (const [mime, extensions] of Object.entries(mimeExtensionMap)) {
      if (mimeType === mime && !extensions.includes(ext)) {
        analysis.risk = 'medium';
        analysis.reasons.push(`Incohérence entre extension (.${ext}) et type MIME (${mime})`);
        break;
      }
    }
  }

  /**
   * Génère un résumé de l'analyse
   */
  generateSummary(results) {
    const counts = {
      high: results.filter(r => r.risk === 'high').length,
      medium: results.filter(r => r.risk === 'medium').length,
      low: results.filter(r => r.risk === 'low').length
    };

    let summary = '';
    if (counts.high > 0) {
      summary += `${counts.high} fichier(s) dangereux. `;
    }
    if (counts.medium > 0) {
      summary += `${counts.medium} fichier(s) suspects. `;
    }
    if (counts.low > 0) {
      summary += `${counts.low} fichier(s) sûrs.`;
    }

    return summary.trim();
  }

  /**
   * Récupère l'extension d'un fichier
   */
  getFileExtension(filename) {
    if (!filename || !filename.includes('.')) return '';
    return filename.split('.').pop().toLowerCase();
  }

  /**
   * Détermine le niveau de risque global
   */
  getRiskLevel(status) {
    switch (status) {
      case -1: return 'high';
      case 1: return 'medium';
      case 0: return 'low';
      default: return 'unknown';
    }
  }

  /**
   * Ajoute une extension à la liste personnalisée
   */
  async addToCustomList(extension, listType) {
    const key = listType === 'dangerous' ? 'dangerousExtensions' : 'safeExtensions';
    await storage.addToList(key, extension.toLowerCase());
    this.clearCache();
  }

  /**
   * Supprime une extension de la liste personnalisée
   */
  async removeFromCustomList(extension, listType) {
    const key = listType === 'dangerous' ? 'dangerousExtensions' : 'safeExtensions';
    await storage.removeFromList(key, extension.toLowerCase());
    this.clearCache();
  }

  /**
   * Vide le cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Récupère les statistiques des pièces jointes
   */
  async getStats() {
    const stats = await storage.get('attachmentStats', {
      totalAnalyzed: 0,
      dangerous: 0,
      suspicious: 0,
      safe: 0,
      blocked: 0
    });
    return stats;
  }

  /**
   * Met à jour les statistiques
   */
  async updateStats(analysisResults) {
    const stats = await this.getStats();
    
    stats.totalAnalyzed += analysisResults.count;
    
    for (const result of analysisResults.details) {
      switch (result.risk) {
        case 'high':
          stats.dangerous++;
          break;
        case 'medium':
          stats.suspicious++;
          break;
        case 'low':
          stats.safe++;
          break;
      }
    }

    await storage.set('attachmentStats', stats);
  }
}

// Instance singleton
const attachmentChecker = new AttachmentChecker();

export { attachmentChecker };