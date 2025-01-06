import { updateTagValue, getTagsActive } from '../modules/tags.js';
import { dossierActive } from '../modules/dossier.js';

/**
 * La il reste a faire l'initialisation des boutons radio pour activer les tag ou non 
 * et pareil pour le dossier fin le déplacement des mails dans les dossiers.
 * 
 * Et faire en sorte que quand tu en modifie l'état d'un bouton avec le clique ça modifie bien en base de donnée
 * et que ça réactualise le tout en focntion de la nouvelle base de donnée. (comme pour les couleurs que ce soit en temps réel)
 * 
 * Et à la limite faire une table en base de donnée (browser.storage.local) pour chaque type de tag comme mes dossiers c'est à dire
 * comme ça si on modifie juste pour les mails suspect ça ne révérifie pas TOUT mais juste les mails suspect.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const radioButtons = document.querySelectorAll('.radioButton');
    // Fonction pour initialiser l'état des boutons radio
    async function initializeRadioButtons() {
        const tagsActive = await getTagsActive();
        console.log(tagsActive);

        radioButtons.forEach(button => {
            const tagName = button.id;
            const isActive = tagsActive[tagName];

            if (isActive) {
                button.classList.add('active');
                button.style.backgroundColor = 'green';
            } else {
                button.classList.remove('active');
                button.style.backgroundColor = 'red';
            }
        });
    }

    // Initialiser l'état des boutons radio
    await initializeRadioButtons();

    // Ajouter des écouteurs d'événements pour les boutons radio
    radioButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
            const button = event.target;
            const isActive = button.classList.toggle('active');
            const tagName = button.id;

            if (isActive) {
                button.style.backgroundColor = 'green';
            } else {
                button.style.backgroundColor = 'red';
            }

            await browser.messages.tags.update(tagName, { active: isActive });
            await updateTagValue(tagName, undefined, isActive);
        });
    });
});