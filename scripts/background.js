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


import { checkForNewMails } from '../modules/rechercheMails.js';
import { comparerMails } from '../modules/comparaisonMail.js';
import { extraireLiens, comparerLiens } from '../modules/liens.js';

async function displayMailLists() {
    const accounts = await logAccounts();
    const periodicCheck = async () => {
        const result = await checkForNewMails(accounts);
        for (const email of result.newEmails) {
            const mailStatus = await comparerMails(email);
            const links = extraireLiens(email.contenu);
            if (links.length !== 0) {
                const linkStatus = await comparerLiens(links);
                console.log("Nouveaux mails de : ", email.expediteur, " : ", mailStatus, " : ", linkStatus);
            }
        }
    };

    setInterval(periodicCheck, 600);
}

displayMailLists();
