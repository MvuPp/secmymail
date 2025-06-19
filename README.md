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

**SecMyMail** is an extension for the **Thunderbird** email client, developed in **JavaScript**. Its main objective is to identify and classify potentially suspicious emails based on their origin, the links they contain, or attached files.

---

## Installation

1. Download the latest release from the [releases page](https://github.com/MvuPp/secmymail/-/releases)
2. Go to `Add-ons and themes` in Thunderbird settings.
3. Drag and drop the `secmymail.xpi` file.

## Compilation

1. Clone the repository:

   ```bash
   git clone https://github.com/MvuPp/secmymail
   cd secmymail
   ```

2. Run the compilation script:

   ```bash
   ./build.sh
   ```

3. The `secmymail.xpi` file will be generated in the `build` directory.

## Debug

1. Open Thunderbird.
2. Go to the **add-ons** tab in settings.
3. Click on **Debug add-ons**.
4. Add a new add-on by selecting the `manifest.json` file.
5. The extension is now installed and ready to use.

---

## First Use

Once the extension is activated:

- A new button appears on the Thunderbird toolbar.
- Click on it to access the SecMyMail home interface.
- Explore the different menus to configure the extension according to your needs.

---

## Features

- SecMyMail checks the domain of the sender's email address and compares it to a list of trusted domains and a list of malicious domains. If the domain is not in the trusted list, the email is marked as suspicious. If it's in the malicious list, the email is marked as dangerous.

- SecMyMail analyzes the email content and checks if URLs in the email are reliable or not. If a URL is not in the trusted list, the email is marked as suspicious. It also detects hyperlinks that differ from the displayed URL.

- SecMyMail checks the extension of attached files and compares them to a list of dangerous file extensions. If the attachment is dangerous, the email is marked as dangerous.

### Address Book and Whitelist

- Allows adding domain names or email addresses considered trustworthy.

#### Add data to the whitelist

1. Select the type (email or domain).
2. Click **Add**.
3. Enter the value in the text field.
4. Press **Enter** to validate.

#### Remove data from the whitelist

- Hover over an existing entry and click the red cross.

---

### Blacklist

- Allows adding domain names or email addresses considered dangerous.

#### Add data

1. Select the type (email or domain).
2. Click **Add**.
3. Enter the value in the text field.
4. Press **Enter** to validate.

#### Remove data

- Hover over an existing entry and click the red cross.

---

### Tag Management

- Enable or disable tags for files, emails, and domains.
- Automatically move emails to specific folders for better organization.
- Customize tag colors for simplified management.

#### Enable/Disable a tag

1. Click the button corresponding to the tag.
2. The button becomes green if the tag is enabled, red if disabled.

#### Enable automatic email movement

1. Click the button next to **Email movement**.
2. Green = Enabled, Red = Disabled.

#### Change tag colors

1. Go to **Tag Management** > **Change colors**.
2. Select the color to modify and choose a new color.

---

## Notes

- Feel free to explore the user interface to discover other available options.

---

## Support

For any assistance, contact https://github.com/MvuPp/secmymail/issues.

## Authors

- [**MvuPp**]
- [**Schell Yanis**]
- [**Gauffeny Paul**]
- [**Desbrousses Victor**]
- [**Tucat Mathieu**]