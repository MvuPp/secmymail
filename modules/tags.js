const tagsData = {
    "secmymail.verified_sender": {
        default_color: "#00FF00",
        tag: "Expediteur vérifié",
        active: true
    },
    "secmymail.unverified_sender": {
        default_color: "#FFFF00",
        tag: "Expediteur non vérifié",
        active: true
    },
    "secmymail.malicious_sender": {
        default_color: "#FF0000",
        tag: "Expediteur malveillant",
        active: true
    },
    "secmymail.verified_link": {
        default_color: "#00FF00",
        tag: "Lien vérifié",
        active: true
    },
    "secmymail.unverified_link": {
        default_color: "#FFFF00",
        tag: "Lien non vérifié",
        active: true
    },
    "secmymail.malicious_link": {
        default_color: "#FF0000",
        tag: "Lien malveillant",
        active: true
    },
    "secmymail.contained_file": {
        default_color: "#FFA500",
        tag: "Fichier joint",
        active: true
    },
    "secmymail.malicious_file": {
        default_color: "#FF0000",
        tag: "Fichier malveillant",
        active: true
    }
};

const tags = {};

/**
 * Initialise les tags en fonction des données stockées.
 */
async function initTags() {
    let tagList = await browser.messages.tags.list();
    let tagDict = Object.fromEntries(tagList.map(tag => [tag.key, tag]));

    for (let [key, data] of Object.entries(tagsData)) {
        if (key in tagDict) {
            let tag = tagDict[key];
            await browser.messages.tags.update(tag.key, { color: data.color, tag: data.tag });
            tags[key] = tag;
        } else {
            tags[key] = await browser.messages.tags.create(key, data.tag, data.color);
        }
    }

    const storedFolderActive = JSON.parse(localStorage.getItem('etatBalises')) || {};
    for (const [key] of Object.entries(tagsData)) {
        storedFolderActive[key] = { active: tagsData[key].active };
    }
    localStorage.setItem('etatBalises', JSON.stringify(storedFolderActive));
}

/**
 * Applique un tag à un mail.
 * @param {string} mailId - L'ID du mail.
 * @param {number} value - La valeur du tag (1 pour vérifié, 0 pour non vérifié, -1 pour malveillant).
 * @param {string} type - Le type de tag (mail, lien, fichier).
 */
async function applyTagToMail(mailId, value, type) {
    let tagKey;

    if (type === "mail") {
        if (value === 1) {
            tagKey = "secmymail.verified_sender";
        } else if (value === 0) {
            tagKey = "secmymail.unverified_sender";
        } else if (value === -1) {
            tagKey = "secmymail.malicious_sender";
        }
    } else if (type === "lien") {
        if (value === 1) {
            tagKey = "secmymail.verified_link";
        } else if (value === 0) {
            tagKey = "secmymail.unverified_link";
        } else if (value === -1) {
            tagKey = "secmymail.malicious_link";
        }
    } else if (type === "fichier") {
        if (value === -1) {
            tagKey = "secmymail.malicious_file";
        } else if (value === 1) {
            tagKey = "secmymail.contained_file";
        }
    }

    // Vérification de l'état actif du tag et application du tag
    const storedFolderActive = JSON.parse(localStorage.getItem('etatBalises')) || {};
    if (tagKey && storedFolderActive[tagKey].active && tags[tagKey]) {
        let message = await browser.messages.get(mailId);
        let existingTags = message.tags || [];
        if (!existingTags.includes(tagKey)) {
            existingTags.push(tagKey);
            await browser.messages.update(mailId, { tags: existingTags });
            //console.log(`Le tags ${tagKey} est bien activé, le tag est appliqué au mail ID: ${mailId}`);
        } else {
            // console.log(`Tag already exists: ${tags[tagKey].tag} for mail ID: ${mailId}`);
        }
    } else {
        console.error(`Le tags ${tagKey} n'existe pas ou n'est pas actif`);
    }
}

/**
 * Met à jour la valeur d'un tag.
 * @param {string} name - Le nom du tag.
 * @param {string} value - La nouvelle valeur du tag.
 * @param {boolean} active - L'état actif du tag.
 */
async function updateTagValue(name, value, active) {
    let tag = tags[name];

    if (value === undefined) {
        value = tagsData[name].default_color;
    } else if (active === undefined) { 
        active = tagsData[name].active;
    }

    if (tag) {
        await browser.messages.tags.update(tag.key, { default_color: value, tag: tag.tag, active: active });
    }
}

/**
 * Récupère l'état actif des tags.
 * @returns {Promise<Object>} - Retourne un objet contenant les tags et leur état actif.
 */
async function getTagsActive() {
    const tagsActive = {};
    for (let [key, data] of Object.entries(tagsData)) {
        tagsActive[data.tag] = data.active;
    }
    return tagsActive;
}

export { initTags, applyTagToMail, updateTagValue, tagsData, getTagsActive };