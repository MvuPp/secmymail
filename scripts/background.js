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
import { getMailContent } from '../modules/rechercheMails.js';
import { compareMails } from '../modules/comparaisonMail.js';
import { extractLinks, compareLinks } from '../modules/liens.js';
import { initFolders, moveMessages } from '../modules/dossier.js';

/**
 * Supprime les tags existants d'un message.
 * @param {number} messageId - L'ID du message.
 */
async function removeTagsFromMessage(messageId) {
    await browser.messages.update(messageId, { tags: [] });
}

/**
 * Traite un message entrant.
 * @param {Object} message - Le message à traiter.
 * @param {string} accountId - L’ID du compte associé.
 */
async function processNewMail(message, accountId) {
    await removeTagsFromMessage(message.id);

    const content = await getMailContent(message.id);
    const mailStatus = await compareMails(content);
    console.log(content);

    const links = extractLinks(content.content);
    let linkStatus = 2;
    if (links.length !== 0) {
        linkStatus = await compareLinks(links);
        await applyTagToMail(message.id, linkStatus, "lien");
    }

    console.log(content.attachments);
    if (content.attachments === 1) {
        console.log("fichier")
        await applyTagToMail(message.id, 1, "fichier");
    } else if (content.attachments === -1) {
        await applyTagToMail(message.id, -1, "fichier");
    }

    await applyTagToMail(message.id, mailStatus, "mail");

    const statusResult = [mailStatus, linkStatus, content.attachments];
    console.log(statusResult);
    if (statusResult.includes(-1)) {
        let type;
        if (mailStatus === -1) type = "mail";
        else if (linkStatus === -1) type = "lien";
        else if (content.attachments === -1) type = "fichier";
        await moveMessages([message.id], accountId + "://INBOX/Malicious", type);
    }
}


initTags()
initFolders()

browser.messages.onNewMailReceived.addListener(async (folder, messages) => {
    const accountId = folder.accountId;
    console.log("vazy marche");

    for (const message in messages.messages) {
        await processNewMail(messages.messages[message], accountId);
    }
});

export { logAccounts };