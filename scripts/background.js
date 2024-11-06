// Code pour récupérer les comptes Thunderbird pour recup l'id
/*
if (browser.accounts) {
    async function logAccounts() {
        try {
            const accounts = await browser.accounts.list();
            console.log("Liste des comptes Thunderbird :");
            accounts.forEach(account => {
                console.log(`Nom : ${account.name}, ID : ${account.id}, Type : ${account.type}`);
            });
        } catch (error) {
            console.error("Erreur lors de la récupération des comptes :", error);
        }
    }
    logAccounts();
} else {
    console.error("L'API browser.accounts n'est pas disponible.");
}
*/


import { checkForNewMails } from '../modules/rechercheMails.js';
import { comparerMails } from '../modules/comparaisonMail.js';
import { extraireLiens, comparerLiens } from '../modules/liens.js';

async function displayMailLists() {
    const periodicCheck = async () => {
        const result = await checkForNewMails("account3");
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
