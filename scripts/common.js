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

/*
Ouvrir une autre fenêtre est le seul moyen pour que le changement de couleur prenne effet
C'est à cause de ce bug de Firefox/Thunderbird :
https://bugzilla.mozilla.org/show_bug.cgi?id=1378527
*/
const tagsButton = document.getElementById("tags-button");
if (tagsButton) {
    tagsButton.addEventListener("click", function() {
        browser.windows.create({
            url: 'tags.html',
            type: 'popup',
            width: 400,
            height: 600
        });
    });
}
    