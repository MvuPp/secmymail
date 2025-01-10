/**
 * Associe un bouton à une action de lien ou de popup.
 * @param {HTMLElement} button - Le bouton à associer.
 */
function linkButton(button) {
    if (button.hasAttribute("popup")) {
        button.addEventListener("click", function() {
            browser.windows.create({
                url: this.getAttribute("link"),
                type: "popup",
                width: parseInt(this.getAttribute("width")) || 400,
                height: parseInt(this.getAttribute("height")) || 600
            });
        });
    } else {
        button.addEventListener("click", function() {
            window.location.href = this.getAttribute("link");
        });
    }
}

document.querySelectorAll("button[link]").forEach(function(button) {
    linkButton(button);
});

/**
 * Trouve un template HTML par son nom.
 * @param {string} templateName - Le nom du template à trouver.
 * @returns {HTMLElement|null} - Retourne l'élément du template ou null s'il n'est pas trouvé.
 */
function findTemplate(templateName) {
    for (const node of document.querySelectorAll("div[template]")) {
        let template = node.getAttribute("template");
        if (template && template.endsWith(templateName)) {
            return node;
        }
    }
    return null;
}

/**
 * Charge un template HTML depuis une URL.
 * @param {string} url - L'URL du template à charger.
 * @returns {Promise<string>} - Retourne le contenu HTML du template.
 * @throws {Error} - Lance une erreur si le chargement échoue.
 */
async function loadHTMLTemplate(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load template: ${url}`);
    }
    return await response.text();
}

/**
 * Insère les templates HTML dans la page.
 */
async function insertTemplates() {
    const templates = document.querySelectorAll("div[template]");

    for (const template of templates) {
        const templateURL = template.getAttribute("template");
        try {
            template.innerHTML = await loadHTMLTemplate(templateURL);

            const scripts = template.querySelectorAll("script");
            scripts.forEach(oldScript => {
                const newScript = document.createElement("script");
                newScript.textContent = oldScript.textContent;
                if (oldScript.src) newScript.src = oldScript.src;
                if (oldScript.defer) newScript.defer = oldScript.defer;
                document.body.appendChild(newScript);
            });

        } catch (error) {
            console.error("Error loading template:", error);
        }
    }
}

/**
 * Gère le clic sur le bouton de retour.
 */
function handleBackArrowClick() {
    window.history.back();
}

/**
 * Gère le clic sur le bouton de fermeture.
 */
function handleCloseClick() {
    window.close();
}

/**
 * Gère le clic sur le bouton d'accueil.
 * @param {boolean} value - Indique si la redirection doit se faire vers '../popup.html' ou 'popup.html'.
 */
function handleHomeClick(value) {
    if (value) {
        window.location.href = '../popup.html';
    } else {
        window.location.href = 'popup.html';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const backArrowButton = document.getElementById('back_arrow');
    const closeButton = document.getElementById('close');
    const logoButton = document.getElementById('logo_popup');
    const homeButton = document.getElementById('logo');

    const currentPage = window.location.pathname.split('/').pop();
    const pagesToClose = ['domain-blacklist.html', 'domain-whitelist.html', 'email-blacklist.html', 'email-whitelist.html', 'tags.html'];

    if (backArrowButton) {
        backArrowButton.addEventListener('click', handleBackArrowClick);
    }

    if (closeButton && pagesToClose.includes(currentPage)) {
        closeButton.addEventListener('click', handleCloseClick);
    }

    if (logoButton) {
        logoButton.addEventListener('click', handleCloseClick);
    }

    if (homeButton) {
        homeButton.addEventListener('click', function(event) {
            if (homeButton.name === 'balise') {
                handleHomeClick(true);
            } else {
                handleHomeClick(false);
            }
        });
    }
});

window.addEventListener("DOMContentLoaded", insertTemplates);