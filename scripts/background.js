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


const tagsData = {
    "secmymail.verified_sender": {
        color: "#00FF00",
        tag: "Expediteur vérifié",
    },
    "secmymail.malicious_sender": {
        color: "#FF0000",
        tag: "Expediteur malveillant",
    },
    "secmymail.malicious_link": {
        color: "#FF0000",
        tag: "Lien malveillant",
    },
}

const tags = {}

async function init() {

    // Initialize tags
    let tagList = await browser.messages.tags.list();
    let tagDict = Object.fromEntries(tagList.map(tag => [tag.key, tag]));

    for (let [key, data] of Object.entries(tagsData)) {
        if (key in tagDict) {
            let tag = tagDict[key];
            browser.messages.tags.update(tag.key, {color: data.color, tag: data.tag});
            tags[key] = tag;
        } else {
            tags[key] = await browser.messages.tags.create(key, data.tag, data.color);
        }
    }
}


console.log("I'm here")
async function handleMail(folder, message) {
    console.log("Detected new mail in folder", folder, "with subject", message.subject);
    //TODO: Apply all checks to the email
}

async function handleAllExistingEmails() {
    let allExistingEmails = (await browser.messages.query({})).messages;
    for (let email of allExistingEmails) {
        handleMail(email.folder, email);
    }
}



browser.messages.onNewMailReceived.addListener((folder, messages) => {
    let message = messages[0];
    handleMail(folder, message);
});



init().then(() => {
    handleAllExistingEmails();
});