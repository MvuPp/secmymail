// Script commun à toutes les pages

// Button links
function linkButton(button) {
    button.addEventListener("click", function() {
        window.location.href = this.getAttribute("link");
    });
}
document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll("button[link]").forEach(function(button) {
        linkButton(button);
    });
});
document.querySelectorAll("button[link]").forEach(function(button) {
    linkButton(button);
});


// Templates

function findTemplate(templateName) {
    for (const node of document.querySelectorAll("div[template]")) {
        let template = node.getAttribute("template");
        if (template && template.endsWith(templateName)) {
            return node;
        }
    }
    return null;
}

async function loadHTMLTemplate(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load template: ${url}`);
    }
    return await response.text();
}

async function insertTemplates() {
    const templates = document.querySelectorAll("div[template]");

    for (const template of templates) {
        const templateURL = template.getAttribute("template");
        try {
            template.innerHTML = await loadHTMLTemplate(templateURL);

            // Scripts in the template are not executed, so we need to manually add them to the page
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

window.addEventListener("DOMContentLoaded", insertTemplates);

    