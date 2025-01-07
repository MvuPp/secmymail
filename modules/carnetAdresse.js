/**
 * Ici il faudrai ajouter sur la page whitelist.html un bouton pour actier ou désactiver cette fonctionnalité
 * ce qui veut dire si activer alors ajouter en whitelist sinon les supprimer de la whitelist.
 */

import { comparerWhiteList } from './comparaisonMail.js';

async function listeCarnetAdresse(parentId) {
    try {
        const contacts = await messenger.addressBooks.contacts.list(parentId);
        return contacts;
    } catch (error) {
        console.error(`Erreur lors de la récupération des contacts pour le carnet d'adresses ${parentId} :`, error);
        return null;
    }
}

async function obtenirCarnetsAdresses() {
    try {
        const addressBooks = await messenger.addressBooks.list();
        return addressBooks;
    } catch (error) {
        console.error("Erreur lors de la récupération des carnets d'adresses :", error);
        return null;
    }
}

async function recupererTousLesContacts() {
    const addressBooks = await obtenirCarnetsAdresses();
    const allEmails = [];
    if (addressBooks) {
        for (const book of addressBooks) {
            const contacts = await listeCarnetAdresse(book.id);
            if (contacts) {
                contacts.forEach(contact => {
                    const emailMatches = contact.vCard.match(/EMAIL[^:]*:([^@\s]+@[^@\s]+\.[^@\s]+)/gi);
                    if (emailMatches) {
                        emailMatches.forEach(email => {
                            const emailAddress = email.split(':')[1];
                            allEmails.push(emailAddress);
                        });
                    }
                });
            }
        }
    }
    return allEmails;
}

async function ajouterWhiteList(emails) {
    const whitelistKey = 'whitelist';
    let whiteListMails = [];

    const result = await browser.storage.sync.get(whitelistKey);
    if (result[whitelistKey]) {
        whiteListMails = result[whitelistKey];
    }

    for (const email of emails) {
        const isWhiteListed = whiteListMails.some(item => item.value === email);
        if (isWhiteListed) {
            console.log(`L'adresse ${email} est déjà dans la liste blanche.`);
        } else {
            whiteListMails.push({ type: 'mail', value: email });
            await browser.storage.sync.set({ [whitelistKey]: whiteListMails });
            console.log(`L'adresse ${email} a été ajoutée à la liste blanche.`);
        }
    }
}

// à tester
async function supprimerWhiteList(emails) {
    const whitelistKey = 'whitelist';
    let whiteListMails = [];

    const result = await browser.storage.sync.get(whitelistKey);
    if (result[whitelistKey]) {
        whiteListMails = result[whitelistKey];
    }

    for (const email of emails) {
        const index = whiteListMails.findIndex(item => item.value === email);
        if (index !== -1) {
            whiteListMails.splice(index, 1);
            await browser.storage.sync.set({ [whitelistKey]: whiteListMails });
            console.log(`L'adresse ${email} a été retirée de la liste blanche.`);
        } else {
            console.log(`L'adresse ${email} n'est pas dans la liste blanche.`);
        }
    }
}

async function carnetActive() {
    const allEmails = await recupererTousLesContacts();

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
}

export { recupererTousLesContacts, ajouterWhiteList, supprimerWhiteList, carnetActive};