/**
 * Récupère le corps complet d'un message.
 * @param {string} messageId - L'ID du message.
 * @returns {Promise<Object>} - Retourne un objet contenant le corps du message et les pièces jointes.
 */
async function getFullMessageBody(messageId) {
    const fullMessage = await browser.messages.getFull(messageId);
    const attachments = await browser.messages.listAttachments(messageId);

    function extractText(parts) {
        for (const part of parts) {
            if (part.contentType === "text/plain" && part.body) {
                return part.body.trim();
            } else if (part.parts) {
                const nested = extractText(part.parts);
                if (nested) return nested.trim();
            }
        }
        return null;
    }

    return {
        body: extractText(fullMessage.parts),
        fullAttachments: attachments
    };
}



/**
 * Récupère les informations détaillées d’un email à partir de son ID.
 * @param {number} messageId - L'ID du message.
 * @returns {Promise<Object|null>} - Retourne un objet contenant les infos de l'email ou null en cas d'erreur.
 */
async function getEmailDetailsById(messageId) {
    try {
        const messageHeader = await browser.messages.get(messageId);
        const bodyData = await getFullMessageBody(messageId);

        const emailMatch = messageHeader.author.match(/<(.+)>/);
        const email = emailMatch ? emailMatch[1] : messageHeader.author;

        // Vérification de l'extension de la pièce jointe
        let attachmentType = 0;
        const dangerousExtensions = ['test', 'exe', 'bat', 'com', 'cmd', 'scr', 'pif', 'cpl', 'js', 'jse', 'vbs', 'vbe', 'wsf', 'wsh', 'msi', 'msp', 'jar'];

        if (bodyData.fullAttachments.length > 0) {
            attachmentType = 1;
            for (const attachment of bodyData.fullAttachments) {
                const extension = attachment.name.split('.').pop().toLowerCase();
                if (dangerousExtensions.includes(extension)) {
                    attachmentType = -1;
                    break;
                }
            }
        }

        return {
            id: messageId,
            sender: email || "Inconnu",
            subject: messageHeader.subject || "Sujet non défini",
            date: messageHeader.date,
            size: messageHeader.size,
            content: bodyData.body || "Mail vide",
            attachments: attachmentType,
            folder: messageHeader.folder.name || "Dossier inconnu"
        };
    } catch (error) {
        console.error(`Erreur lors de la récupération du message ID ${messageId} :`, error);
        return null;
    }
}



async function getMailContent(messageId) {
    return getEmailDetailsById(messageId);
}

export { getMailContent };