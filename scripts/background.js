async function logAccounts() {
    try {
        const accounts = await browser.accounts.list();
        const account = accounts.find(account => account.name.includes('@'));
        if (account) {
            return account.id;
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des comptes :", error);
    }
    return null;
}

import { initTags, applyTagToMail } from '../modules/tags.js';
import { checkForNewMails } from '../modules/rechercheMails.js';
import { comparerMails } from '../modules/comparaisonMail.js';
import { extraireLiens, comparerLiens } from '../modules/liens.js';

async function removeExistingTags(result) {
    for (const message of result) {
        await browser.messages.update(message.id, { tags: [] });
    }
}

async function displayMailLists() {
    const accountId = await logAccounts();
    if (!accountId) return;
    let tagCheck = false;
    const periodicCheck = async () => {
        const result = await checkForNewMails(accountId);
        if (!tagCheck) {
            await removeExistingTags(result.newEmails);
            tagCheck = true;
        }
        for (const email of result.newEmails) {
            const mailStatus = await comparerMails(email);

            const links = extraireLiens(email.contenu);
            let linkStatus = 0;
            if (links.length !== 0) {
                linkStatus = await comparerLiens(links);
                await applyTagToMail(email.id, linkStatus, "lien");
            }

            if (email.piecesJointes.length > 0) {
                await applyTagToMail(email.id, null, "fichier");
            }

            await applyTagToMail(email.id, mailStatus, "mail");
        }
    };

    setInterval(periodicCheck, 600);
}

initTags().then(() => {
    displayMailLists();
});