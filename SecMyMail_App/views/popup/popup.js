document.addEventListener('DOMContentLoaded', () => {
    const boutonBalise = document.getElementById('boutonBalise');

    if (boutonBalise) {
        boutonBalise.addEventListener('click', () => {
            console.log('Bouton balise cliqué');
            window.location.href = '../balise/balise.html';
        });
    } else {
        console.error('Élément avec l\'ID "boutonBalise" non trouvé.');
    }
});