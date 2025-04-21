/**
 * Ici voir pour ajouter la fonctionnalité d'alerte en plus lors du clique sur un lien avant la redirection
 * la confirmation supplémentaire.
 */

/**
 * Extrait les liens d'un texte donné.
 * @param {string} text - Le texte contenant les liens.
 * @returns {Array<string>} - Retourne une liste des domaines extraits des liens.
 */
function extractLinks(text) {
    const urlRegex = /(?:(?:https?:\/\/)?(?:www\.)?)([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\/[^\s]*)?/g;

    const matches = [];
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
        matches.push(match[1].toLowerCase());
    }

    // Supprimer les doublons
    const uniqueDomains = [...new Set(matches)];

    return uniqueDomains;
}


let whiteListDomains = [];
let blackListDomains = [];
const whiteListKey = 'domain-whitelist';
const blackListKey = 'domain-blacklist';

browser.storage.sync.get(whiteListKey).then(result => {
    if (result[whiteListKey]) {
        whiteListDomains = result[whiteListKey];
    }
});

browser.storage.sync.get(blackListKey).then(result => {
    if (result[blackListKey]) {
        blackListDomains = result[blackListKey];
    }
});

/**
 * Compare le lien avec la liste blanche.
 * @param {string} link - Le lien à comparer.
 * @returns {Promise<boolean>} - Retourne true si le lien est dans la liste blanche, sinon false.
 */
async function compareWhiteList(link) {
    return whiteListDomains.some(item => link.startsWith(item));
}

/**
 * Compare le lien avec la liste noire.
 * @param {string} link - Le lien à comparer.
 * @returns {Promise<boolean>} - Retourne true si le lien est dans la liste noire, sinon false.
 */
async function compareBlackList(link) {
    return blackListDomains.some(item => link.startsWith(item));
}

/**
 * Compare les liens avec les listes blanche et noire.
 * @param {Array<string>} links - Les liens à comparer.
 * @returns {Promise<number>} - Retourne 1 si tous les liens sont dans la liste blanche, -1 si un lien est dans la liste noire, sinon 0.
 */
async function compareLinks(links) {
    let results = [];
    for (let link of links) {
        let isWhiteListed = await compareWhiteList(link);
        let isBlackListed = await compareBlackList(link);
        if (isWhiteListed) {
            results.push(1);
        } else if (isBlackListed) {
            results.push(-1);
        } else {
            results.push(0);
        }
    }

    if (results.includes(-1)) {
        return -1;
    } else if (results.includes(0)) {
        return 0;
    } else {
        return 1;
    }
}

export { extractLinks, compareLinks };