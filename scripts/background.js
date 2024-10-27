let foldersWithMessages = [];

let emailData = [];

async function getAndExpandSubFolders(folderId) {
    try {
        const subFolders = await browser.folders.getSubFolders(folderId);
        console.log(`Sous-dossiers trouvés pour le dossier ID ${folderId} : ${subFolders.length}`);

        for (const folder of subFolders) {
            console.log(`Sous-dossier : ${folder.name}`);

            try {
                const messageList = await browser.messages.list(folder.id);
                const messageCount = messageList.messages.length;
                console.log(`Le dossier ${folder.name} contient ${messageCount} messages.`);

                if (messageCount > 0) {
                    foldersWithMessages.push({ folder: folder, messages: messageList.messages });
                }
            } catch (error) {
                console.error(`Erreur lors de la récupération des messages pour le dossier ${folder.name} :`, error);
            }

            const nestedFolders = await browser.folders.getSubFolders(folder.id);
            if (nestedFolders.length > 0) {
                console.log(`Dossier : ${folder.name} a ${nestedFolders.length} sous-dossiers supplémentaires.`);
                await getAndExpandSubFolders(folder.id);
            } else {
                console.log(`Dossier : ${folder.name} n'a pas de sous-dossiers supplémentaires.`);
            }
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des sous-dossiers :", error);
    }
}

async function displayMessagesFromSavedFolders() {
    for (const folderWithMessages of foldersWithMessages) {
        const folder = folderWithMessages.folder;
        const messages = folderWithMessages.messages;

        if (folder.name !== "Courrier entrant") {
            continue;
        }

        console.log(`Affichage des messages pour le dossier : ${folder.name}`);

        // Parcourir chaque message dans le dossier sauvegardé
        for (const message of messages) {
            try {
                const messageHeader = await browser.messages.get(message.id);
                
                const emailInfo = {
                    expéditeur: messageHeader.author || "Inconnu",
                    objet: messageHeader.subject || "Sujet non défini",
                    date: messageHeader.date,
                    taille: messageHeader.size,
                };

                emailData.push(emailInfo);

                console.log("Expéditeur :", emailInfo.expéditeur);
                console.log("Objet :", emailInfo.objet);
                console.log("Date :", emailInfo.date);
                console.log("Taille :", emailInfo.taille);
                console.log("----");
            } catch (error) {
                console.error(`Erreur lors de la récupération du message ID ${message.id} dans le dossier ${folder.name} :`, error);
            }
        }
    }

    console.log("Tableau des emails :", emailData);
}

async function exploreFolders(accountId) {
    try {
        const accountDetails = await browser.accounts.get(accountId);
        const rootFolder = accountDetails.rootFolder;

        if (rootFolder) {
            console.log(`Exploration des sous-dossiers pour le dossier racine : ${rootFolder.name}`);
            await getAndExpandSubFolders(rootFolder.id);

            await displayMessagesFromSavedFolders();
        } else {
            console.log(`Aucun dossier racine trouvé pour le compte avec ID ${accountId}`);
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des détails du compte :", error);
    }
}

exploreFolders("account1");
