let whiteListEmails = [];
let blackListEmails = [];
const whiteListKey = 'email-whitelist';
const blackListKey = 'email-blacklist';

browser.storage.sync.get(whiteListKey).then(result => {
    if (result[whiteListKey]) {
        whiteListEmails = result[whiteListKey];
    }
});

browser.storage.sync.get(blackListKey).then(result => {
    if (result[blackListKey]) {
        blackListEmails = result[blackListKey];
    }
});

/**
 * Compare l'email avec la liste blanche.
 * @param {Object} email - L'email à comparer.
 * @returns {Promise<boolean>} - Retourne true si l'email est dans la liste blanche, sinon false.
 */
async function compareWhiteList(email) {
    return whiteListEmails.some(item => item === email.sender);
}

/**
 * Compare l'email avec la liste noire.
 * @param {Object} email - L'email à comparer.
 * @returns {Promise<boolean>} - Retourne true si l'email est dans la liste noire, sinon false.
 */
async function compareBlackList(email) {
    return blackListEmails.some(item => item === email.sender);
}

/**
 * Compare l'email avec les listes blanche et noire.
 * @param {Object} email - L'email à comparer.
 * @returns {Promise<number>} - Retourne 1 si l'email est dans la liste blanche, -1 s'il est dans la liste noire, sinon 0.
 */
async function compareMails(email) {
    let result;
    let isWhiteListed = await compareWhiteList(email);
    let isBlackListed = await compareBlackList(email);

    if (isWhiteListed) {
        result = 1;
    } else if (isBlackListed) {
        result = -1;
    } else {
        result = 0;
    }
    return result;
}

export { compareWhiteList, compareBlackList, compareMails };