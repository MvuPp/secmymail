let foldersWithMessages = [];
let previousMailCount = 0;
let previousEmails = [];

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

async function displayMessagesFromSavedFolders() {
    let currentEmails = [];
    for (const folderWithMessages of foldersWithMessages) {
        const folder = folderWithMessages.folder;
        const messages = folderWithMessages.messages;

        if (folder.name !== "Courrier entrant") {
            continue;
        }

        for (const message of messages) {
            try {
                const messageHeader = await browser.messages.get(message.id);
                
                const emailMatch = messageHeader.author.match(/<(.+)>/);
                const email = emailMatch ? emailMatch[1] : messageHeader.author;

                const emailInfo = {
                    id: message.id,
                    expediteur: email || "Inconnu",
                    objet: messageHeader.subject || "Sujet non défini",
                    date: messageHeader.date,
                    taille: messageHeader.size,
                    contenu: messageHeader.body || "Mail vide"
                };

                currentEmails.push(emailInfo);
            } catch (error) {
                console.error(`Erreur lors de la récupération du message ID ${message.id} dans le dossier ${folder.name} :`, error);
            }
        }
    }

    return currentEmails;
}

async function exploreFolders(accountId) {
    try {
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

async function checkForNewMails(accountId) {
    const currentEmails = await exploreFolders(accountId);
    let newEmails = [];
    let newMailCount = 0;
    for (const currentEmail of currentEmails) {
        const previousEmail = previousEmails.find(email => email.id === currentEmail.id);
        if (!previousEmail) {
            newEmails.push(currentEmail);
            newMailCount++;
        }
    }

    previousEmails = currentEmails;
    previousMailCount = currentEmails.length;

    return { newEmails, length: newMailCount };
}

export { checkForNewMails };