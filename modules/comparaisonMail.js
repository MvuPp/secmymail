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

async function compareWhiteList(email) {
    return whiteListEmails.some(item => item === email.sender);
}

async function compareBlackList(email) {
    return blackListEmails.some(item => item === email.sender);
}

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