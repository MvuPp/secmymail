# SecMyMail - Secure your Thunderbird mailbox

SecMyMail is a Thunderbird add-on that helps users to recognize and avoid phishing emails.

[Readme disponible en français](README-fr.md)

## Installation

Download the latest release from the [releases page](https://github.com/MvuPp/secmymail/-/releases) and drop the `secmymail.xpi` file into Thunderbird's add-on manager.

## Build

To build the add-on from source, clone the repository and run the build script

```bash
git clone https://github.com/MvuPp/secmymail
cd secmymail
bash build.sh
```

The build script will create a `.xpi` file in the [build](build) directory.

## Features

### Domain Verification

SecMyMail checks the domain of the sender's email address and compares it to a list of trusted domains and a list of malicious domains. If the domain is not in the trusted list, the email is marked as suspicious, if it is in the malicious list, the email is marked as dangerous.

### URL Verification

SecMyMail analyzes the mail content and checks if the URLs in the email are trustable or not. If a URL is not in the trusted list, the email is marked as suspicious. It also detects hyperlinks that are differents from the displayed URL.

### Attachment Verification

SecMyMail checks the file extension of the attachments and compares it to a list of dangerous file extensions. If the attachment is dangerous, the email is marked as dangerous.

## Authors

- [**MvuPp**]
- [**Schell Yanis**]
- [**Gauffeny Paul**]
- [**Desbrousses Victor**]
