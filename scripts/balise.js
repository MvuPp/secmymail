document.addEventListener('DOMContentLoaded', () => {
    
    const fichierButton = document.querySelector('.button:nth-of-type(1)');
    const mailButton = document.querySelector('.button:nth-of-type(2)');
    const domaineButton = document.querySelector('.button:nth-of-type(3)');

    fichierButton.addEventListener('click', () => {
        window.location.href = './balises/fichier.html';
    });

    mailButton.addEventListener('click', () => {
        window.location.href = './balises/mail.html';
    });

    domaineButton.addEventListener('click', () => {
        window.location.href = './balises/domaine.html';
    });
});


