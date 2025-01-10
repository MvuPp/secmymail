let foldersWithMessages = [];
let previousMailCount = 0;
let previousEmails = [];

/**
 * Récupère et développe les sous-dossiers d'un dossier donné.
 * @param {string} folderId - L'ID du dossier parent.
 */
async function getAndExpandSubFolders(folderId) {
    try {
        const subFolders = await browser.folders.getSubFolders(folderId);
        for (const folder of subFolders) {
            try {
                const messageList = await browser.messages.list(folder.id);
                const messageCount = messageList.messages.length;

                if (messageCount > 0) {
                    foldersWithMessages.push({ folder: folder, messages: messageList.messages });
                }
            } catch (error) {
                console.error(`Erreur lors de la récupération des messages pour le dossier ${folder.name} :`, error);
            }

            const nestedFolders = await browser.folders.getSubFolders(folder.id);
            if (nestedFolders.length > 0) {
                await getAndExpandSubFolders(folder.id);
            }
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des sous-dossiers :", error);
    }
}

/**
 * Récupère le corps complet d'un message.
 * @param {string} messageId - L'ID du message.
 * @returns {Promise<Object>} - Retourne un objet contenant le corps du message et les pièces jointes.
 */
async function getFullMessageBody(messageId) {
    let fullMessage = await messenger.messages.getFull(messageId);
    let fullAttachments = await messenger.messages.listAttachments(messageId);

    function getBody(parts) {
        for (let part of parts) {
            if (part.contentType === "text/plain" && part.body) {
                return part.body.trim();
            } else if (part.parts) {
                let result = getBody(part.parts);
                if (result) {
                    return result.trim();
                }
            }
        }
        return null;
    }

    let body = getBody(fullMessage.parts);

    return { body, fullAttachments };
}

/**
 * Affiche les messages des dossiers sauvegardés.
 * @returns {Promise<Array<Object>>} - Retourne une liste d'objets contenant les informations des emails.
 */
async function displayMessagesFromSavedFolders() {
    let currentEmails = [];
    for (const folderWithMessages of foldersWithMessages) {
        const folder = folderWithMessages.folder;
        const messages = folderWithMessages.messages;

        for (const message of messages) {
            try {
                const messageHeader = await browser.messages.get(message.id);
                
                const emailMatch = messageHeader.author.match(/<(.+)>/);
                const email = emailMatch ? emailMatch[1] : messageHeader.author;
                
                // Vérification de l'extension de la pièces jointes
                let attachmentType = 0;
                const bodyData = await getFullMessageBody(message.id);
                const dangerousExtensions = ['test', 'exe', 'bat', 'com', 'cmd', 'scr', 'pif', 'cpl', 'js', 'jse', 'vbs', 'vbe', 'wsf', 'wsh', 'msi', 'msp', 'jar'];
                if (bodyData.fullAttachments.length > 0) {
                    attachmentType = 1;
                    for (const attachment of bodyData.fullAttachments) {
                        const extension = attachment.name.split('.').pop();
                        if (dangerousExtensions.includes(extension)) {
                            attachmentType = -1;
                        }
                    }
                }
                
                const emailInfo = {
                    id: message.id,
                    sender: email || "Inconnu",
                    subject: messageHeader.subject || "Sujet non défini",
                    date: messageHeader.date,
                    size: messageHeader.size,
                    content: bodyData.body || "Mail vide",
                    attachments: attachmentType,
                    folder: folder.name
                };

                currentEmails.push(emailInfo);
            } catch (error) {
                console.error(`Erreur lors de la récupération du message ID ${message.id} dans le dossier ${folder.name} :`, error);
            }
        }
    }

    return currentEmails;
}

/**
 * Explore les dossiers d'un compte donné.
 * @param {string} accountId - L'ID du compte.
 * @returns {Promise<Array<Object>>} - Retourne une liste d'objets contenant les informations des emails.
 */
async function exploreFolders(accountId) {
    try {
        foldersWithMessages = [];

        const accountDetails = await browser.accounts.get(accountId);
        const rootFolder = accountDetails.rootFolder;

        if (rootFolder) {
            await getAndExpandSubFolders(rootFolder.id);

            return await displayMessagesFromSavedFolders();
        } else {
            console.error(`Aucun dossier racine trouvé pour le compte avec ID ${accountId}`);
            return [];
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des détails du compte :", error);
        return [];
    }
}

/**
 * Vérifie la présence de nouveaux mails dans un compte donné.
 * @param {string} accountId - L'ID du compte.
 * @returns {Promise<Object>} - Retourne un objet contenant les nouveaux emails et leur nombre.
 */
async function checkForNewMails(accountId) {
    let newEmails = [];
    let newMailCount = 0;
    let result = await exploreFolders(accountId);

    if (previousMailCount - result.length < 0) {
        for (const currentEmail of result) {
            const previousEmail = previousEmails.find(email => email.id === currentEmail.id);
            if (!previousEmail) {
                newEmails.push(currentEmail);
                newMailCount++;
            }
        }
    
        previousEmails = result;
        previousMailCount = result.length;
    }

    return { newEmails, length: newMailCount };
}

/**
 * Revérifie tous les mails d'un compte donné.
 * @param {string} accountId - L'ID du compte.
 * @returns {Promise<Object>} - Retourne un objet contenant les nouveaux emails et leur nombre.
 */
async function checkForMails(accountId) {
    let newEmails = [];
    let newMailCount = 0;
    let result = await exploreFolders(accountId);

    for (const currentEmail of result) {
        const previousEmail = previousEmails.find(email => email.id === currentEmail.id);
        if (!previousEmail) {
            newEmails.push(currentEmail);
            newMailCount++;
        }
    }

    previousEmails = result;

    return { newEmails, length: newMailCount };
}

export { checkForNewMails, checkForMails };