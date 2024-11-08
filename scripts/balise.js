import { updateTagValue } from '../modules/tags.js';

document.addEventListener('DOMContentLoaded', () => {
    
    const fichierButton = document.querySelector('.button:nth-of-type(1)');
    const mailButton = document.querySelector('.button:nth-of-type(2)');
    const domaineButton = document.querySelector('.button:nth-of-type(3)');

    const fichierList = document.getElementById('fichier-list');
    const mailList = document.getElementById('mail-list');
    const domaineList = document.getElementById('domaine-list');

    const colorInputs = document.querySelectorAll('.color-input');

    colorInputs.forEach(input => {
        input.addEventListener('input', (event) => {
            const color = event.target.value;
            updateTagValue(input.name, color, null);
        });
    });

    function hideAllLists() {
        fichierList.style.display = 'none';
        mailList.style.display = 'none';
        domaineList.style.display = 'none';
    }

    fichierButton.addEventListener('click', () => {
        const isVisible = fichierList.style.display === 'block';
        hideAllLists();
        fichierList.style.display = isVisible ? 'none' : 'block';
    });

    mailButton.addEventListener('click', () => {
        const isVisible = mailList.style.display === 'block';
        hideAllLists();
        mailList.style.display = isVisible ? 'none' : 'block';
    });

    domaineButton.addEventListener('click', () => {
        const isVisible = domaineList.style.display === 'block';
        hideAllLists();
        domaineList.style.display = isVisible ? 'none' : 'block';
    });

    hideAllLists();
});