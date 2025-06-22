import { attachmentChecker } from './attachmentChecker.js';
import { linkChecker } from './linkChecker.js';
import { emailChecker } from './emailChecker.js';

/**
 * Analyseur de messages
 */
class MessageAnalyzer {
    /**
     * Récupère le corps complet d'un message
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
                body: content.text, // Pour compatibilité
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
     * Récupère les informations détaillées d'un email
     */
    async getEmailDetailsById(messageId) {
        try {
            const messageHeader = await browser.messages.get(messageId);
            const bodyData = await this.getFullMessageBody(messageId);

            // Extraction de l'email
            const emailMatch = messageHeader.author.match(/<(.+)>/);
            const email = emailMatch ? emailMatch[1] : messageHeader.author;
            const expediteurName = emailMatch ? messageHeader.author.replace(/<[^>]+>/, '').trim() : '';

            // Extraction du domaine
            const domain = email.includes('@') ? email.split('@')[1] : '';

            // Utilisation de attachmentChecker pour l'analyse des pièces jointes
            const attachmentAnalysis = await attachmentChecker.analyzeAttachments(bodyData.fullAttachments);

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

            // Analyse des liens avec linkChecker
            const linkAnalysis = await linkChecker.analyzeLinks(emailDetails.content.full, emailDetails.content.html);
            
            // Analyse de l'expéditeur avec emailChecker
            const expediteurStatus = await emailChecker.checkEmail(emailDetails.expediteur.email);

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

    /**
     * Convertit les niveaux de risque textuels en valeurs numériques pour background.js
     * @param {string} risk - Niveau de risque ('high', 'medium', 'low', 'none')
     * @returns {number} - Valeur numérique (-1, 0, 1)
     */
    convertRiskToValue(risk) {
        switch(risk) {
            case 'high':
                return -1; // Malveillant
            case 'medium':
                return 0;  // Suspect
            case 'low':
                return 1;  // Sûr (extensions sûres)
            case 'safe':
            case 'none':
                return 0;  // Aucune pièce jointe
            default:
                return 0;  // Par défaut suspect
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