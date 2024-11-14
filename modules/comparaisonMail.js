let whiteListMails = [];
let blackListMails = [];
const whitelistKey = 'whitelist';
const blackListKey = 'blacklist';

browser.storage.sync.get(whitelistKey).then(result => {
    if (result[whitelistKey]) {
        whiteListMails = result[whitelistKey].filter(item => item.type === 'mail');
    }
});

browser.storage.sync.get(blackListKey).then(result => {
    if (result[blackListKey]) {
        blackListMails = result[blackListKey].filter(item => item.type === 'mail');
    }
});

async function comparerWhiteList(email) {
    return whiteListMails.some(item => item.value === email.expediteur);
}

async function comparerBlackList(email) {
    return blackListMails.some(item => item.value === email.expediteur);
}

async function comparerMails(email) {
    let result;
    let isWhiteListed = await comparerWhiteList(email);
    let isBlackListed = await comparerBlackList(email);

    if (isWhiteListed) {
        result = 1;
    } else if (isBlackListed) {
        result = -1;
    } else {
        result = 0;
    }
    return result;
}

export { comparerWhiteList, comparerBlackList, comparerMails };