function extraireLiens(text) {
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
            return null;
        }
    }).filter(domain => domain !== null);
}


let whiteListMails = [];
let blackListMails = [];
const whitelistKey = 'whitelist';
const blackListKey = 'blacklist';

browser.storage.sync.get(whitelistKey).then(result => {
    if (result[whitelistKey]) {
        whiteListMails = result[whitelistKey].filter(item => item.type === 'domaine');
    }
});

browser.storage.sync.get(blackListKey).then(result => {
    if (result[blackListKey]) {
        blackListMails = result[blackListKey].filter(item => item.type === 'domaine');
    }
});

async function comparerWhiteList(link) {
    return whiteListMails.some(item => link.startsWith(item.value));
}

async function comparerBlackList(link) {
    return blackListMails.some(item => link.startsWith(item.value));
}

async function comparerLiens(links) {
    let results = [];
    for (let link of links) {
        let isWhiteListed = await comparerWhiteList(link);
        let isBlackListed = await comparerBlackList(link);
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

export { extraireLiens, comparerLiens };