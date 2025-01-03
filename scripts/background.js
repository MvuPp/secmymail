async function logAccounts() {
    try {
        const accounts = await browser.accounts.list();
        const filteredAccounts = accounts.filter(account => account.name.includes('@'));
        console.log("Comptes mail trouvés :", filteredAccounts);
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
import { comparerMails } from '../modules/comparaisonMail.js';
import { extraireLiens, comparerLiens } from '../modules/liens.js';
import { recupererTousLesContacts, ajouterWhiteList, supprimerWhiteList } from '../modules/carnetAdresse.js';
import { initDossiers, deplacerMessages } from '../modules/dossier.js';

async function removeExistingTags(result) {
    for (const message of result) {
        await browser.messages.update(message.id, { tags: [] });
    }
}

async function displayMailLists() {
    const accountIds = await logAccounts();
    if (!accountIds) return;
    let tagCheck = false;
    let contactCheck = 0;

    const periodicCheck = async () => {
        const allEmails = await recupererTousLesContacts();
        console.log("Liste des contacts :", allEmails);

        if (contactCheck < allEmails.length) {
            try {
                await ajouterWhiteList(allEmails);
                contactCheck = allEmails.length;
            } catch (error) {
                console.error("Erreur lors de l'ajout des contacts à la liste blanche :", error);
            }
        } else if (contactCheck > allEmails.length) {
            try {
                await supprimerWhiteList(allEmails);
                contactCheck = allEmails.length;
            } catch (error) {
                console.error("Erreur lors de la suppression des contacts de la liste blanche :", error);
            }
        }

        for (const accountId of accountIds) {
            await initDossiers();
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

                if (email.piecesJointes === 1 ) {
                    await applyTagToMail(email.id, 1, "fichier");
                } else if (email.piecesJointes === -1) {
                    await applyTagToMail(email.id, -1, "fichier");
                }

                await applyTagToMail(email.id, mailStatus, "mail");

                if (mailStatus === -1 || linkStatus === -1 || email.piecesJointes === -1) {
                    await deplacerMessages([email.id], accountId + "://INBOX/Malicious");
                } else if (mailStatus === 1 || linkStatus === 1) {
                    await deplacerMessages([email.id], accountId + "://INBOX/Verified");
                } else {
                    await deplacerMessages([email.id], accountId + "://INBOX/Unverified");
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