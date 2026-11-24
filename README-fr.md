# SecMyMail

## Table des matières

- [Introduction](#introduction)
- [Installation](#installation)
- [Première utilisation](#première-utilisation)
- [Fonctionnalités](#fonctionnalités)
  - [Carnet d’adresses et Whitelist](#carnet-dadresses-et-whitelist)
  - [Liste noire et Blacklist](#liste-noire-et-blacklist)
  - [Gestion des tags](#gestion-des-tags)

---

## Introduction

**SecMyMail** est une extension pour le client de messagerie **Thunderbird**, développée en **JavaScript**. Son objectif principal est d’identifier et de classer les e-mails potentiellement suspects en fonction de leur origine, des liens qu’ils contiennent ou des fichiers joints. 

---

## Installation

1. Téléchargez la dernière release depuis la [page des releases](https://github.com/MvuPp/secmymail/releases)
2. Allez dans `Add-ons et thèmes` dans les paramètres de Thunderbird.
3. Glissez y le fichier `secmymail.xpi`.

## Compilation

1. Clonez le dépôt :

   ```bash
   git clone https://github.com/MvuPp/secmymail.git
   cd secmymail
   ```

2. Exécutez le script de compilation :

   ```bash
   ./build.sh      # Linux / macOS
   build.bat       # Windows
   ```

3. Le fichier `secmymail.xpi` sera généré dans le répertoire `build`.

## Debug

1. Ouvrez Thunderbird.
2. Accédez à l’onglet des **modules complémentaires** dans les paramètres.
3. Cliquez sur **Déboguer des modules**.
4. Ajoutez un nouveau module en sélectionnant le fichier `manifest.json`.
5. L’extension est maintenant installée et prête à l’emploi.

---

## Première utilisation

Une fois l’extension activée :

- Un nouveau bouton apparaît sur la barre d’outils de Thunderbird.
- Cliquez dessus pour accéder à l’interface d’accueil de SecMyMail.
- Explorez les différents menus pour configurer l’extension selon vos besoins.

---

## Fonctionnalités

- SecMyMail vérifie le domaine de l'adresse email de l'expéditeur et le compare à une liste de domaines de confiance et une liste de domaines malveillants. Si le domaine n'est pas dans la liste de confiance, l'email est marqué comme suspect, s'il est dans la liste malveillante, l'email est marqué comme dangereux.

- SecMyMail analyse le contenu de l'email et vérifie si les URL dans l'email sont fiables ou non. Si une URL n'est pas dans la liste de confiance, l'email est marqué comme suspect. Il détecte également les hyperliens qui sont différents de l'URL affichée.

- SecMyMail vérifie l'extension des fichiers joints et les compare à une liste d'extensions de fichiers dangereuses. Si la pièce jointe est dangereuse, l'email est marqué comme dangereux.

### Carnet d’adresses et Whitelist

- Permet d’ajouter des noms de domaine ou des adresses e-mail considérées comme fiables.

#### Ajouter une donnée à la whitelist

1. Sélectionnez le type (e-mail ou domaine).
2. Cliquez sur **Ajouter**.
3. Saisissez la valeur dans le champ de texte.
4. Appuyez sur **Entrée** pour valider.

#### Supprimer une donnée de la whitelist

- Cliquez sur la poubelle à côté du domaine ou du l'e-mail concerné pour le supprimer.

---

### Liste noire et Blacklist

- Permet d’ajouter des noms de domaine ou des adresses e-mail considérées comme dangereuses.

#### Ajouter une donnée

1. Sélectionnez le type (e-mail ou domaine).
2. Cliquez sur **Ajouter**.
3. Saisissez la valeur dans le champ de texte.
4. Appuyez sur **Entrée** pour valider.

#### Supprimer une donnée

- Cliquez sur la poubelle à côté du domaine ou du l'e-mail concerné pour le supprimer.

---

### Gestion des tags

- Activez ou désactivez les tags pour les fichiers, les mails et les domaines.
- Déplacez automatiquement les mails dans des dossiers spécifiques pour un meilleur rangement.
- Personnalisez la couleur des tags pour une gestion simplifiée.

#### Activer/Désactiver un tag

1. Cliquez sur le bouton correspondant au tag.
2. Le bouton devient blanc sur fond vert si le tag est activé, et blanc sur fond gris s’il est désactivé.

#### Activer le déplacement automatique des mails

1. Cliquez sur le bouton près de **Activer le déplacement automatique**.
2. Vert = Activé, Gris = Désactivé.

#### Changer la couleur des tags

1. Allez dans **Gestion des tags**.
2. Plusieurs catégories de tags sont disponibles : **Expéditeur**, **Fichiers**, **Liens**.
3. Pour changer la couleur d'un tag, cliquez sur la couleur de la ligne correspondante puis sélectionnez la nouvelle couleur.

---

## Notes

- N'hésitez pas à consulter le manuel d'utilisation pour explorer d'autres options disponibles.

---

## Support

Pour toute question, ouvrez une [issue](https://github.com/MvuPp/secmymail/issues).

## Auteurs

Projet réalisé à l'ENSIBS (Université Bretagne Sud) par :

- [@MvuPp](https://github.com/MvuPp)
- Creplet Yanis
- Gauffeny Paul
- Desbrousses Victor
- Tucat Mathieu