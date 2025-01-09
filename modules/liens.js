/**
 * Ici voir pour ajouter la fonctionnalité d'alerte en plus lors du clique sur un lien avant la redirection
 * la confirmation supplémentaire.
 */

function extractLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

    const links = text.match(urlRegex) || [];

    return links.map(link => {
        if (link.startsWith("www.")) {
            link = "http://" + link;
        }
        try {
            const url = new URL(link);
            return url.hostname;
        } catch (e) {
            console.error(`Invalid URL: ${link}`);
            const domainMatch = link.match(/https?:\/\/([^\/\s]+)/);
            if (domainMatch) {
                return domainMatch[1];
            } else {
                console.error(`Unable to extract domain from: ${link}`);
                return null;
            }
        }
    }).filter(domain => domain !== null);
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

async function compareWhiteList(link) {
    return whiteListDomains.some(item => link.startsWith(item));
}

async function compareBlackList(link) {
    return blackListDomains.some(item => link.startsWith(item));
}

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