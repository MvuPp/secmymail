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

    // Récupérer l'objet dossierActive depuis le localStorage
    const storedEtatsBalises = JSON.parse(localStorage.getItem('etatBalises')) || {};
    console.log("storedEtatsBalises", storedEtatsBalises)
    console.log("get", localStorage.getItem('etatBalises'))

    radioButtons.forEach(button => {
        console.log("Handling " + button);

        if (storedEtatsBalises[button.name]?.active) {
            button.classList.add('active');
            button.style.backgroundColor = 'green';
        } else {
            button.classList.remove('active');
            button.style.backgroundColor = 'red';
        }

        button.addEventListener('click', (event) => {
            const button = event.target;
            const isActive = button.classList.toggle('active');

            button.style.backgroundColor = isActive ? 'green' : 'red';

            const storedDossierActive = JSON.parse(localStorage.getItem('etatBalises')) || {};
            storedDossierActive[button.name] = { active: isActive };
            localStorage.setItem('etatBalises', JSON.stringify(storedDossierActive));
            //changeEtatDossier(button.name, isActive);
        });
    });
});

