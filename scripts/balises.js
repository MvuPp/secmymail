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

            console.log("button.name", button.name)

            const storedDossierActive = JSON.parse(localStorage.getItem('etatBalises')) || {};
            storedDossierActive[button.name] = { active: isActive };
            localStorage.setItem('etatBalises', JSON.stringify(storedDossierActive));
            //changeEtatDossier(button.name, isActive);
        });
    });
});

