import { checkForMails } from '../modules/rechercheMails.js';

const dossierData = {
    "Malicious": {
        active: true
    }
};

const dossierActive = {
    "mail": {
        active: true
    },
    "lien": {
        active: true
    },
    "fichier": {
        active: true
    }
}

import { logAccounts } from "../scripts/background.js";
const accounts = await logAccounts();
const account = accounts[0];

async function creerDossier(folderId, childName) {
    try {
        const newFolder = await messenger.folders.create(folderId, childName);
        console.log(`Dossier créé : ${newFolder.name}`);
        return newFolder;
    } catch (error) {
        console.error(`Erreur lors de la création du dossier : ${error}`);
        return null;
    }
}

async function deplacerMessages(messageIds, folderId, type) {
    const storedDossierActive = JSON.parse(localStorage.getItem('etatBalises')) || {};

    try {
        if (storedDossierActive[type]?.active) {
            await messenger.messages.move(messageIds, folderId);
            console.log(`Messages déplacés vers le dossier : ${folderId}`);
        }
    } catch (error) {
        console.error(`Erreur lors du déplacement des messages : ${error}`);
    }
}

async function initDossiers() {
    const storedDossierActive = JSON.parse(localStorage.getItem('etatBalises')) || {};
    for (const [key] of Object.entries(dossierData)) {
        if (storedDossierActive[key]?.active) {
            await creerDossier(account + "://INBOX", key);
        }
    }
}

async function changeEtatDossier(dossier, etat) {
    if (etat) await creerDossier(account + "://INBOX", dossier);
    else await supprimerDossier(dossier);
    console.log("changement d'état du dossier : ", dossier);
}

async function supprimerDossier(dossier) {
    try {
        const value = account + "://INBOX/" + dossier;
        await messenger.folders.delete(value);
        console.log(`Dossier supprimé : ${dossier}`);
    } catch (error) {
        console.error(`Erreur lors de la suppression du dossier : ${error}`);
    }
}

export { creerDossier, deplacerMessages, initDossiers, changeEtatDossier, supprimerDossier, dossierData, dossierActive };