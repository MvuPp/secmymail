/**
 * Fonctionnalité à venir : récupérer les contacts du carnet d'adresses et les ajouter à la liste blanche
 */

async function listAddressBook(parentId) {
    try {
        const contacts = await messenger.addressBooks.contacts.list(parentId);
        return contacts;
    } catch (error) {
        console.error(`Erreur lors de la récupération des contacts pour le carnet d'adresses ${parentId} :`, error);
        return null;
    }
}

async function getAddressBooks() {
    try {
        const addressBooks = await messenger.addressBooks.list();
        return addressBooks;
    } catch (error) {
        console.error("Erreur lors de la récupération des carnets d'adresses :", error);
        return null;
    }
}

async function getAllContacts() {
    const addressBooks = await getAddressBooks();
    const allEmails = [];
    if (addressBooks) {
        for (const book of addressBooks) {
            const contacts = await listAddressBook(book.id);
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

async function addWhiteList(emails) {
    const whitelistKey = 'whitelist';
    let whiteListEmails = [];

    const result = await browser.storage.sync.get(whitelistKey);
    if (result[whitelistKey]) {
        whiteListEmails = result[whitelistKey];
    }

    for (const email of emails) {
        const isWhiteListed = whiteListEmails.some(item => item.value === email);
        if (isWhiteListed) {
            console.log(`L'adresse ${email} est déjà dans la liste blanche.`);
        } else {
            whiteListEmails.push({ type: 'mail', value: email });
            await browser.storage.sync.set({ [whitelistKey]: whiteListEmails });
            console.log(`L'adresse ${email} a été ajoutée à la liste blanche.`);
        }
    }
}

// à tester
async function removeWhiteList(emails) {
    const whitelistKey = 'whitelist';
    let whiteListEmails = [];

    const result = await browser.storage.sync.get(whitelistKey);
    if (result[whitelistKey]) {
        whiteListEmails = result[whitelistKey];
    }

    for (const email of emails) {
        const index = whiteListEmails.findIndex(item => item.value === email);
        if (index !== -1) {
            whiteListEmails.splice(index, 1);
            await browser.storage.sync.set({ [whitelistKey]: whiteListEmails });
            console.log(`L'adresse ${email} a été retirée de la liste blanche.`);
        } else {
            console.log(`L'adresse ${email} n'est pas dans la liste blanche.`);
        }
    }
}

async function addressBookActive() {
    const allEmails = await getAllContacts();

    if (contactCheck < allEmails.length) {
        try {
            await addWhiteList(allEmails);
            contactCheck = allEmails.length;
        } catch (error) {
            console.error("Erreur lors de l'ajout des contacts à la liste blanche :", error);
        }
    } else if (contactCheck > allEmails.length) {
        try {
            await removeWhiteList(allEmails);
            contactCheck = allEmails.length;
        } catch (error) {
            console.error("Erreur lors de la suppression des contacts de la liste blanche :", error);
        }
    }
}

export { getAllContacts, addWhiteList, removeWhiteList, addressBookActive };