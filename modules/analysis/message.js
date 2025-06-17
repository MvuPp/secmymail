/**
 * Analyseur de messages
 */
class MessageAnalyzer {
    constructor() {
        this.trustedDomains = [
            'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com',
            'protonmail.com', 'icloud.com', 'orange.fr', 'free.fr',
            'sfr.fr', 'laposte.net', 'wanadoo.fr'
        ];
    }

    /**
     * Récupère le corps complet d'un message (inspiré de rechercheMails.js)
     */
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
                body: content.text, // Pour compatibilité avec rechercheMails.js
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

    /**
     * Récupère les informations détaillées d'un email (inspiré de rechercheMails.js)
     */
    async getEmailDetailsById(messageId) {
        try {
            const messageHeader = await browser.messages.get(messageId);
            const bodyData = await this.getFullMessageBody(messageId);

            // Extraction de l'email comme dans rechercheMails.js
            const emailMatch = messageHeader.author.match(/<(.+)>/);
            const email = emailMatch ? emailMatch[1] : messageHeader.author;
            const expediteurName = emailMatch ? messageHeader.author.replace(/<[^>]+>/, '').trim() : '';

            // Extraction du domaine
            const domain = email.includes('@') ? email.split('@')[1] : '';

            // Analyse des pièces jointes comme dans rechercheMails.js
            const attachmentAnalysis = this.analyzeAttachmentsFromList(bodyData.fullAttachments);

            return {
                id: messageId,
                expediteur: {
                    email: email || "Inconnu",
                    name: expediteurName,
                    display: messageHeader.author,
                    domain: domain,
                    trustLevel: this.calculateTrustLevel(email, domain)
                },
                subject: messageHeader.subject || "Sujet non défini",
                date: messageHeader.date,
                size: messageHeader.size,
                content: {
                    body: bodyData.body || "Mail vide", // Pour compatibilité
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

    /**
     * Analyse les pièces jointes à partir de la liste (comme rechercheMails.js)
     */
    analyzeAttachmentsFromList(attachmentsList) {
        const dangerousExtensions = [
            'test', 'exe', 'bat', 'com', 'cmd', 'scr', 'pif', 'cpl', 'js', 'jse', 
            'vbs', 'vbe', 'wsf', 'wsh', 'msi', 'msp', 'jar', 'app', 'deb',
            'pkg', 'dmg', 'run', 'sh', 'ps1', 'php', 'py', 'rb', 'pl'
        ];

        const suspiciousExtensions = [
            'zip', 'rar', '7z', 'tar', 'gz', 'doc', 'docx', 'xls', 'xlsx',
            'ppt', 'pptx', 'pdf', 'rtf', 'odt', 'ods', 'odp'
        ];

        let attachmentStatus = 0; // Par défaut neutre
        const details = [];

        if (attachmentsList.length > 0) {
            for (const attachment of attachmentsList) {
                const extension = attachment.name.split('.').pop().toLowerCase();
                let risk = 0;
                let reasons = [];

                if (dangerousExtensions.includes(extension)) {
                    attachmentStatus = -1; // Malveillant
                    risk = -1;
                    reasons.push('Extension de fichier dangereuse');
                } else if (suspiciousExtensions.includes(extension)) {
                    if (attachmentStatus !== -1) attachmentStatus = 0; // Suspect si pas déjà malveillant
                    risk = 0;
                    reasons.push('Extension de fichier suspecte');
                } else {
                    if (attachmentStatus === 0 && risk === 0) attachmentStatus = 1; // Sûr si pas autre chose
                    risk = 1;
                    reasons.push('Extension de fichier sûre');
                }

                // Vérifier les doubles extensions
                if (attachment.name.match(/\.[^.]+\.[^.]+$/)) {
                    attachmentStatus = -1;
                    risk = -1;
                    reasons.push('Double extension détectée');
                }

                details.push({
                    name: attachment.name,
                    size: attachment.size,
                    contentType: attachment.contentType,
                    risk: risk,
                    reasons: reasons
                });
            }
            
            // Si aucun fichier malveillant ou suspect trouvé, considérer comme sûr
            if (attachmentStatus === 0 && attachmentsList.length > 0) {
                attachmentStatus = 1;
            }
        }

        return {
            count: attachmentsList.length,
            status: attachmentStatus, // -1: malveillant, 0: suspect, 1: sûr
            details: details
        };
    }

    /**
     * Analyse un message complet (méthode principale)
     */
    async analyzeMessage(messageId) {
        try {
            console.log(`[MessageAnalyzer] Analyse du message ${messageId}`);
            
            // Récupération des informations détaillées
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

            // Analyse des liens avec le contenu complet
            const linkAnalysis = await this.analyzeLinks(emailDetails.content.full, emailDetails.content.html);
            
            // Analyse de l'expéditeur
            const expediteurAnalysis = await this.analyzeExpediteur(emailDetails.expediteur);

            // Structure simplifiée pour background.js
            const result = {
                messageId: emailDetails.id,
                expediteur: expediteurAnalysis.status,  // -1, 0 ou 1
                liens: linkAnalysis.status,             // -1, 0 ou 1
                fichiers: emailDetails.attachments.analysis.status, // -1, 0 ou 1
                details: {
                    expediteurDetails: emailDetails.expediteur,
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

    /**
     * Calcule le niveau de confiance de l'expéditeur
     */
    calculateTrustLevel(email, domain) {
        if (!email || !domain) return 0; // Suspect par défaut

        // Vérifier les domaines de confiance
        if (this.trustedDomains.includes(domain.toLowerCase())) {
            return 1; // Sûr
        }

        // Vérifier les patterns suspects
        const suspiciousPatterns = [
            /[0-9]{4,}/, // Beaucoup de chiffres
            /[.-]{2,}/, // Caractères répétés
            /@[^.]+\.(tk|ml|ga|cf)$/, // Domaines gratuits suspects
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(email)) {
                return -1; // Malveillant
            }
        }

        return 0; // Suspect par défaut
    }

    /**
     * Analyse l'expéditeur avec emailChecker
     */
    async analyzeExpediteur(expediteur) {
        try {
            // Utiliser emailChecker pour analyser l'expéditeur
            const { emailChecker } = await import('./email-checker.js');
            const status = await emailChecker.checkEmail(expediteur.email);
            
            console.log(`[MessageAnalyzer] Expéditeur analysé: ${expediteur.email} -> statut: ${status}`);
            
            return {
                status: status, // -1: malveillant, 0: suspect, 1: sûr
                email: expediteur.email,
                domain: expediteur.domain,
                trustLevel: expediteur.trustLevel
            };
            
        } catch (error) {
            console.error('[MessageAnalyzer] Erreur analyse expéditeur:', error);
            return {
                status: expediteur.trustLevel || 0, // Utiliser trustLevel comme fallback
                email: expediteur.email,
                domain: expediteur.domain,
                trustLevel: expediteur.trustLevel || 0
            };
        }
    }

    /**
     * Analyse les liens du message
     */
    async analyzeLinks(textContent, htmlContent = '') {
        try {
            // Utiliser le LinkChecker pour analyser les liens
            const { linkChecker } = await import('./link-checker.js');
            const analysis = await linkChecker.analyzeLinks(textContent, htmlContent);
            
            console.log(`[MessageAnalyzer] Liens analysés: ${analysis.count} trouvés, statut: ${analysis.status}`);
            return analysis;
            
        } catch (error) {
            console.error('[MessageAnalyzer] Erreur analyse des liens:', error);
            return {
                count: 0,
                status: 0, // Suspect par défaut en cas d'erreur
                links: [],
                domains: []
            };
        }
    }

    /**
     * Méthode de compatibilité avec rechercheMails.js
     */
    async getMailContent(messageId) {
        const details = await this.getEmailDetailsById(messageId);
        return details;
    }
}

// Instance singleton
const messageAnalyzer = new MessageAnalyzer();

export { messageAnalyzer };