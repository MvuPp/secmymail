import { checkForNewMails } from '../modules/rechercheMails.js';
import { comparerMails } from '../modules/comparaisonMail.js';


async function displayMailLists() {
    const periodicCheck = async () => {
        const result = await checkForNewMails("account1");
        for (const email of result.newEmails) {
            const mailStatus = await comparerMails(email);
            console.log("Nouveaux mails de : ", email.expediteur, " : ", mailStatus);
        }
    };

    setInterval(periodicCheck, 600);
}

displayMailLists();