/**
 * Ici faut encore faire en sorte de pouvoir activer ou désactiver "dossierActive" si aucun est activé alors ne pas créer les dossiers
 * et si il y en a au moins 1 d'activé alors les créer.
 * 
 * Il faut donc faire une fonction qui permet de reprendre tout les mails existant et les déplacer comme on fait à l'initialisation
 * de l'app. Et ça pour chaque modif visuel comme par exemple l'ajout en whitelist ou blacklist d'un mail pendant que l'app est ouverte.
 * Il faut une méthode qui permet d'update tout et de tout vérif genre faire une recherche dans tout les mails de ceux qui correspondent 
 * à la dernière valeur ajouter en base de donnée
 */

const dossierData = {
    "Malicious": {
        active: true
    },
    "Verified": {
        active: true
    },
    "Unverified": {
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
    try {
        if (dossierActive[type].active) {
            await messenger.messages.move(messageIds, folderId);
            console.log(`Messages déplacés vers le dossier : ${folderId}`);
        }
    } catch (error) {
        console.error(`Erreur lors du déplacement des messages : ${error}`);
    }
}

async function initDossiers() {
    for (const [key] of Object.entries(dossierData)) {
        if (dossierData[key].active) await creerDossier(account + "://INBOX", key);
    }
}

async function changeEtatDossier(dossier, etat) {
    dossierData[dossier].active = etat;
    if (etat) await creerDossier(account + "://INBOX", dossier);
    else await supprimerDossier(dossier);
}

async function supprimerDossier(dossier) {
    try {
        value = account + "://INBOX/" + dossier;
        await messenger.folders.delete(value);
        console.log(`Dossier supprimé : ${dossier}`);
    } catch (error) {
        console.error(`Erreur lors de la suppression du dossier : ${error}`);
    }
}

export { creerDossier, deplacerMessages, initDossiers, changeEtatDossier, supprimerDossier, dossierData, dossierActive };