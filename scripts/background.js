/**
 * Récupère et filtre les comptes de messagerie.
 * @returns {Promise<Array<string>|null>} - Retourne une liste des IDs des comptes filtrés ou null en cas d'erreur.
 */
async function logAccounts() {
    try {
        const accounts = await browser.accounts.list();
        const filteredAccounts = accounts.filter(account => account.name.includes('@'));
        if (filteredAccounts.length > 0) {
            return filteredAccounts.map(account => account.id);
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des comptes :", error);
    }
    return null;
}

import { initTags, applyTagToMail } from '../modules/tags.js';
import { checkForNewMails } from '../modules/rechercheMails.js';
import { compareMails } from '../modules/comparaisonMail.js';
import { extractLinks, compareLinks } from '../modules/liens.js';
import { initFolders, moveMessages } from '../modules/dossier.js';

/**
 * Supprime les tags existants des messages.
 * @param {Array<Object>} result - La liste des messages.
 */
async function removeExistingTags(result) {
    for (const message of result) {
        await browser.messages.update(message.id, { tags: [] });
    }
}

/**
 * Affiche les listes de mails et applique les tags et actions nécessaires.
 */
async function displayMailLists() {
    const accountIds = await logAccounts();
    if (!accountIds) return;
    let tagCheck = false;
    await initFolders();

    // Fonction de vérification périodique des nouveaux mails
    const periodicCheck = async () => {
        for (const accountId of accountIds) {
            const result = await checkForNewMails(accountId);
            if (!tagCheck) {
                await removeExistingTags(result.newEmails);
                tagCheck = true;
            }
            for (const email of result.newEmails) {
                const mailStatus = await compareMails(email);

                // Vérification des contacts

                //Extraction des liens et comparaison
                const links = extractLinks(email.content);
                let linkStatus = 2;
                if (links.length !== 0) {
                    linkStatus = await compareLinks(links);
                    await applyTagToMail(email.id, linkStatus, "lien");
                }

                // Vérification des pièces jointes
                if (email.attachments === 1) {
                    await applyTagToMail(email.id, 1, "fichier");
                } else if (email.attachments === -1) {
                    await applyTagToMail(email.id, -1, "fichier");
                }

                // Vérification des contacts
                await applyTagToMail(email.id, mailStatus, "mail");
                
                // Vérification des mails malveillants et déplacement
                let type;
                let statusResult = [mailStatus, linkStatus, email.attachments];
                if (statusResult.includes(-1)) {
                    if (mailStatus === -1) {
                        type = "mail";
                    }
                    if (linkStatus === -1) {
                        type = "lien";
                    }
                    if (email.attachments === -1) {
                        type = "fichier";
                    }
                    await moveMessages([email.id], accountId + "://INBOX/Malicious", type);
                }
            }
        }
    };

    setInterval(periodicCheck, 6000);
}

initTags().then(() => {
    displayMailLists();
});

export { logAccounts };