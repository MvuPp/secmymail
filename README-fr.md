# SecMyMail - Sécurisez votre boîte mail Thunderbird

SecMyMail est une extension Thunderbird qui aide les utilisateurs à reconnaître et éviter les emails de phishing.

## Installation

Téléchargez la dernière version depuis la [page des releases](https://github.com/MvuPp/secmymail/-/releases) et déposez le fichier `secmymail.xpi` dans le gestionnaire d'extensions de Thunderbird.

## Compilation

Pour compiler l'extension à partir du code source, clonez le dépôt et exécutez le script de compilation

```bash
git clone https://github.com/MvuPp/secmymail
cd secmymail
bash build.sh
```

Le script de compilation créera un fichier `.xpi` dans le répertoire [build](build).

## Fonctionnalités

### Vérification de Domaine

SecMyMail vérifie le domaine de l'adresse email de l'expéditeur et le compare à une liste de domaines de confiance et une liste de domaines malveillants. Si le domaine n'est pas dans la liste de confiance, l'email est marqué comme suspect, s'il est dans la liste malveillante, l'email est marqué comme dangereux.

### Vérification des URL

SecMyMail analyse le contenu de l'email et vérifie si les URL dans l'email sont fiables ou non. Si une URL n'est pas dans la liste de confiance, l'email est marqué comme suspect. Il détecte également les hyperliens qui sont différents de l'URL affichée.

### Vérification des Pièces Jointes

SecMyMail vérifie l'extension des fichiers joints et les compare à une liste d'extensions de fichiers dangereuses. Si la pièce jointe est dangereuse, l'email est marqué comme dangereux.

## Auteurs

- [**MvuPp**]
- [**Schell Yanis**]
- [**Gauffeny Paul**]
- [**Desbrousses Victor**]
