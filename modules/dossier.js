const folderData = {
    "Malicious": {
        active: true
    }
};

const folderActive = {
    "mail": {
        active: true
    },
    "link": {
        active: true
    },
    "file": {
        active: true
    }
}

import { logAccounts } from "../scripts/background.js";
const accounts = await logAccounts();
const account = accounts[0];

async function createFolder(folderId, childName) {
    try {
        const newFolder = await messenger.folders.create(folderId, childName);
        console.log(`Dossier créé : ${newFolder.name}`);
        return newFolder;
    } catch (error) {
        console.error(`Erreur lors de la création du dossier : ${error}`);
        return null;
    }
}

async function moveMessages(messageIds, folderId, type) {
    const storedFolderActive = JSON.parse(localStorage.getItem('etatBalises')) || {};

    try {
        if (storedFolderActive[type]?.active) {
            await messenger.messages.move(messageIds, folderId);
            //console.log(`Déplacement activé pour les ${type}s, le mail est déplacé vers le dossier : ${folderId}`);
        } else {
            console.error(`Déplacement désactivé pour les ${type}s, le mail n'est pas déplacé`);
        }
    } catch (error) {
        console.error(`Erreur lors du déplacement des messages : ${error}`);
    }
}

async function initFolders() {
    const storedFolderActive = JSON.parse(localStorage.getItem('etatBalises')) || {};
    for (const [key] of Object.entries(folderData)) {
        if (storedFolderActive[key]?.active) {
            await createFolder(account + "://INBOX", key);
        }
    }

    for (const [key] of Object.entries(folderActive)) {
        storedFolderActive[key] = { active: folderActive[key].active };
    }
    localStorage.setItem('etatBalises', JSON.stringify(storedFolderActive));
}

async function changeFolderState(folder, state) {
    if (state) await createFolder(account + "://INBOX", folder);
    else await deleteFolder(folder);
    console.log("changement d'état du dossier : ", folder);
}

async function deleteFolder(folder) {
    try {
        const value = account + "://INBOX/" + folder;
        await messenger.folders.delete(value);
        console.log(`Dossier supprimé : ${folder}`);
    } catch (error) {
        console.error(`Erreur lors de la suppression du dossier : ${error}`);
    }
}

export { createFolder, moveMessages, initFolders, changeFolderState, deleteFolder, folderData, folderActive };