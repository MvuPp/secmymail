import { updateTagValue, getTagsActive } from '../modules/tags.js';

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