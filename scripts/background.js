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
    await initDossiers();

    const periodicCheck = async () => {

        for (const accountId of accountIds) {
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
                let type;

                /**
                 * A réfléchir si en meme temps que toutes ses vérif on rajoute ou pas une table pour chaque type de tag
                 * du moins où on stock les mails suspect, vérifié et non vérifié pour ne pas avoir à les rechercher à chaque fois dans tout les mails.
                 */

                if (mailStatus === -1 || linkStatus === -1 || email.piecesJointes === -1) {
                    if (mailStatus === -1) {
                        type = "mail";
                    }
                    if (linkStatus === -1) {
                        type = "lien";
                    }
                    if (email.piecesJointes === -1) {
                        type = "fichier";
                    }
                    await deplacerMessages([email.id], accountId + "://INBOX/Malicious", type);
                }else if (mailStatus === 1 || linkStatus === 1) {
                    if (mailStatus === 1) {
                        type = "mail";
                    }
                    if (linkStatus === 1) {
                        type = "lien";
                    }
                    await deplacerMessages([email.id], accountId + "://INBOX/Verified" , type);
                } else {
                    if (mailStatus === 0) {
                        type = "mail";
                    }
                    if (linkStatus === 0) {
                        type = "lien";
                    }
                    if (email.piecesJointes === 1) {
                        type = "fichier";
                    }
                    await deplacerMessages([email.id], accountId + "://INBOX/Unverified", type);
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