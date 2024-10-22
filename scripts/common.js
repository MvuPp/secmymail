// Script commun à toutes les pages

document.querySelectorAll('button[link]').forEach(function(button) {
    button.addEventListener('click', function() {
        window.location.href = this.getAttribute('link');
    });
});
    