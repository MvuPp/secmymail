# SecMyMail

## Table of Contents
- [Introduction](#introduction)
- [Installation](#installation)
- [First Use](#first-use)
- [Features](#features)
  - [Address Book and Whitelist](#address-book-and-whitelist)
  - [Blacklist](#blacklist)
  - [Tag Management](#tag-management)

---

## Introduction
**SecMyMail** is an extension for the **Thunderbird** email client, developed in **JavaScript**. Its main goal is to identify and classify potentially suspicious emails based on their origin, the links they contain, or the attached files.

---

## Installation

Download the latest version from the [releases page](https://github.com/MvuPp/secmymail/-/releases):

1. Open Thunderbird.
2. Go to the **Add-ons** tab in the settings.
3. Click on **Debug Add-ons**.
4. Add a new add-on by selecting the `build.sh` file.
5. The extension is now installed and ready to use.

---

## First Use
Once the extension is activated:
- A new button appears on the Thunderbird toolbar.
- Click on it to access the SecMyMail home interface.
- Explore the different menus to configure the extension according to your needs.

---

## Features

- SecMyMail checks the domain of the sender's email address and compares it to a list of trusted domains and a list of malicious domains. If the domain is not in the trusted list, the email is marked as suspicious; if it is in the malicious list, the email is marked as dangerous.

- SecMyMail analyzes the email content and checks if the URLs in the email are reliable or not. If a URL is not in the trusted list, the email is marked as suspicious. It also detects hyperlinks that are different from the displayed URL.

- SecMyMail checks the extension of attached files and compares them to a list of dangerous file extensions. If the attachment is dangerous, the email is marked as dangerous.

### Address Book and Whitelist
- Allows adding domain names or email addresses considered as trusted.

#### Add an entry:
1. Select the type (email or domain).
2. Click on **Add**.
3. Enter the value in the text field.
4. Press **Enter** to validate.

#### Remove an entry:
- Hover over an existing entry and click on the red cross.

---

### Blacklist
- Allows adding domain names or email addresses considered as dangerous.

#### Add an entry:
1. Select the type (email or domain).
2. Click on **Add**.
3. Enter the value in the text field.
4. Press **Enter** to validate.

#### Remove an entry:
- Hover over an existing entry and click on the red cross.

---

### Tag Management
- Enable or disable tags for files, emails, and domains.
- Automatically move emails to specific folders for better organization.
- Customize the color of tags for simplified management.

#### Enable/Disable a tag:
1. Click on the button corresponding to the tag.
2. The button turns green if the tag is enabled, red if it is disabled.

#### Enable automatic email moving:
1. Click on the button near **Email Moving**.
2. Green = Enabled, Red = Disabled.

#### Change tag colors:
1. Go to **Tag Management** > **Change Colors**.
2. Select the color to change and choose a new color.

---

## Notes
- Feel free to check the user interface to explore other available options.

---

## Support
For any assistance, contact https://github.com/MvuPp/secmymail/issues.

## Authors

- [**MvuPp**]
- [**Schell Yanis**]
- [**Gauffeny Paul**]
- [**Desbrousses Victor**]