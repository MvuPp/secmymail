// import { updateTagValue, getTagsActive } from '../modules/tags.js';
// import { dossierActive, changeEtatDossier } from '../modules/dossier.js';


// document.addEventListener('DOMContentLoaded', async () => {
//     const radioButtons = document.querySelectorAll('.radioButton');

//     async function initializeRadioButtons() {
//         const tagsActive = await getTagsActive();
//         console.log(tagsActive);

//         radioButtons.forEach(button => {
//             const tagName = button.id;
//             let isActive = tagsActive[tagName];

//             if (tagName === 'dossier') {
//                 isActive = dossierActive[button.name].active;
//                 console.log(isActive);
//             }

//             if (isActive) {
//                 button.classList.add('active');
//                 button.style.backgroundColor = 'green';
//             } else {
//                 button.classList.remove('active');
//                 button.style.backgroundColor = 'red';
//             }
//         });
//     }

//     // Initialiser l'état des boutons radio
//     await initializeRadioButtons();

//     radioButtons.forEach(button => {
//         console.log(button);
//         button.addEventListener('click', async (event) => {
//             const button = event.target;
//             const isActive = button.classList.toggle('active');

//             if (isActive) {
//                 button.style.backgroundColor = 'green';
//             } else {
//                 button.style.backgroundColor = 'red';
//             }

//             await updateTagValue(tagName, undefined, isActive);

//             // const tagName = button.id;
//             // if (tagName === 'dossier') {
//             //     await changeEtatDossier(button.name, isActive);
//             // } else {
//             //     await updateTagValue(tagName, undefined, isActive);
//             // }
//         });
//     });
// });

document.addEventListener('DOMContentLoaded', () => {
    const radioButtons = document.querySelectorAll('.radioButton');

    async function init() {
        // Récupérer l'objet dossierActive depuis le localStorage
        const storedDossierActive = JSON.parse(localStorage.getItem('dossierActive')) || {};

        radioButtons.forEach(button => {
            const tagName = button.id;
            let isActive = false;

            if (tagName === 'dossier') {
                console.log(isActive);
                isActive = storedDossierActive[button.name]?.active;
                if (isActive) {
                    button.classList.add('active');
                    button.style.backgroundColor = 'green';
                }
            } else {
                // const tag = listTags.find(tag => tag.tag === tagName);
                // if (tag) {
                //     isActive = tag.ordinal;
                // }
                // if (isActive) {
                //     button.classList.add('active');
                //     button.style.backgroundColor = 'green';
                // } else {
                //     button.classList.remove('active');
                //     button.style.backgroundColor = 'red';
                // }
            }
        });
    }

    init();

    radioButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const button = event.target;
            const isActive = button.classList.toggle('active');

            if (isActive) {
                button.style.backgroundColor = 'green';
            } else {
                button.style.backgroundColor = 'red';
            }

            const tagName = button.id;
            if (tagName === 'dossier') {
                const storedDossierActive = JSON.parse(localStorage.getItem('dossierActive')) || {};
                storedDossierActive[button.name] = { active: isActive };
                localStorage.setItem('dossierActive', JSON.stringify(storedDossierActive));
                changeEtatDossier(button.name, isActive);
            } else {
                // const tag = listTags.find(tag => tag.tag === tagName);
                // if (tag) {
                //     tag.ordinal = isActive;
                // }
            }
        });
    });
});