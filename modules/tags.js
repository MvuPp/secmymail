const tagsData = {
    "secmymail.verified_sender": {
        color: "#00FF00",
        tag: "Expediteur vérifié",
        active: true
    },
    "secmymail.unverified_sender": {
        color: "#FFFF00",
        tag: "Expediteur non vérifié",
        active: true
    },
    "secmymail.malicious_sender": {
        color: "#FF0000",
        tag: "Expediteur malveillant",
        active: true
    },
    "secmymail.verified_link": {
        color: "#00FF00",
        tag: "Lien vérifié",
        active: true
    },
    "secmymail.unverified_link": {
        color: "#FFFF00",
        tag: "Lien non vérifié",
        active: true
    },
    "secmymail.malicious_link": {
        color: "#FF0000",
        tag: "Lien malveillant",
        active: true
    },
    "secmymail.contained_file": {
        color: "#FFA500",
        tag: "Fichier joint",
        active: true
    },
    "secmymail.malicious_file": {
        color: "#FF0000",
        tag: "Fichier malveillant",
        active: true
    }
};

const tags = {};

/**
 * Initialise les tags en fonction des données stockées.
 */
async function initTags() {
    const tagList = await browser.messages.tags.list();
    const tagDict = Object.fromEntries(tagList.map(tag => [tag.key, tag]));

    for (const [key, data] of Object.entries(tagsData)) {
        if (key in tagDict) {
            const tag = tagDict[key];
            await browser.messages.tags.update(tag.key, {
                color: data.color,
                tag: data.tag
            });
            tags[key] = tag;
        } else {
            tags[key] = await browser.messages.tags.create(key, data.tag, data.color);
        }
    }

    // Stockage local de l'état actif des tags
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
        if (value === 1) tagKey = "secmymail.verified_sender";
        else if (value === 0) tagKey = "secmymail.unverified_sender";
        else if (value === -1) tagKey = "secmymail.malicious_sender";
    } else if (type === "lien") {
        if (value === 1) tagKey = "secmymail.verified_link";
        else if (value === 0) tagKey = "secmymail.unverified_link";
        else if (value === -1) tagKey = "secmymail.malicious_link";
    } else if (type === "fichier") {
        if (value === 1) tagKey = "secmymail.contained_file";
        else if (value === -1) tagKey = "secmymail.malicious_file";
    }

    if (!tagKey) {
        console.error("TagKey introuvable pour:", { mailId, value, type });
        return;
    }

    const storedFolderActive = JSON.parse(localStorage.getItem('etatBalises')) || {};
    if (!storedFolderActive[tagKey]?.active) {
        console.warn(`Le tag ${tagKey} est désactivé.`);
        return;
    }

    try {
        const allTags = await browser.messages.tags.list();
        const tagExists = allTags.find(t => t.key === tagKey);

        if (!tagExists) {
            const tagDef = tagsData[tagKey];
            if (!tagDef) throw new Error(`Tag non défini dans tagsData: ${tagKey}`);
            await browser.messages.tags.create(tagKey, tagDef.tag, tagDef.color);
        }

        const message = await browser.messages.get(mailId);
        const existingTags = message.tags || [];

        if (!existingTags.includes(tagKey)) {
            existingTags.push(tagKey);
            await browser.messages.update(mailId, { tags: existingTags });
            console.log(`Tag ${tagKey} appliqué au message ${mailId}`);
        } else {
            console.log(`Le message ${mailId} a déjà le tag ${tagKey}`);
        }
    } catch (error) {
        console.error(`Erreur lors de l'application du tag ${tagKey} :`, error);
    }
}

/**
 * Met à jour la valeur d'un tag.
 * @param {string} name - Le nom du tag.
 * @param {string} value - La nouvelle couleur (code hex).
 * @param {boolean} active - Nouvel état actif du tag.
 */
async function updateTagValue(name, value, active) {
    const tag = tags[name];

    if (value === undefined) value = tagsData[name].color;
    if (active === undefined) active = tagsData[name].active;

    if (tag) {
        await browser.messages.tags.update(tag.key, {
            color: value,
            tag: tag.tag
        });

        // Mettre à jour l'état actif localement
        const stored = JSON.parse(localStorage.getItem('etatBalises')) || {};
        if (!stored[name]) stored[name] = {};
        stored[name].active = active;
        localStorage.setItem('etatBalises', JSON.stringify(stored));
    }
}

/**
 * Récupère l'état actif des tags.
 * @returns {Promise<Object>} - Objet des états actifs des tags.
 */
async function getTagsActive() {
    const tagsActive = {};
    for (const [key, data] of Object.entries(tagsData)) {
        tagsActive[data.tag] = data.active;
    }
    return tagsActive;
}

export { initTags, applyTagToMail, updateTagValue, tagsData, getTagsActive };
