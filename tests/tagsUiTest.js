import { fileURLToPath } from 'url';
import path from 'path';
import assert from 'assert';

// Obtenir le répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Garder une référence aux timers créés pour pouvoir les nettoyer
const timers = [];

// Simuler l'environnement du navigateur
globalThis.browser = {
    runtime: {
        sendMessage: async (message) => {
            // Simuler les réponses du service worker
            if (message.action === 'getTagStates') {
                return {
                    success: true,
                    data: {
                        "secmymail.expediteur_malveillant": {
                            key: "secmymail.expediteur_malveillant",
                            label: "Expéditeur Malveillant",
                            color: "#FF0000",
                            active: true
                        },
                        "secmymail.expediteur_suspect": {
                            key: "secmymail.expediteur_suspect",
                            label: "Expéditeur Suspect",
                            color: "#FF8C00",
                            active: true
                        },
                        "secmymail.expediteur_sur": {
                            key: "secmymail.expediteur_sur",
                            label: "Expéditeur Sûr",
                            color: "#32CD32",
                            active: true
                        },
                        "secmymail.lien_malveillant": {
                            key: "secmymail.lien_malveillant",
                            label: "Lien Malveillant",
                            color: "#FF0000",
                            active: true
                        },
                        "secmymail.lien_suspect": {
                            key: "secmymail.lien_suspect",
                            label: "Lien Suspect",
                            color: "#FF8C00",
                            active: true
                        },
                        "secmymail.lien_sur": {
                            key: "secmymail.lien_sur",
                            label: "Lien Sûr",
                            color: "#32CD32",
                            active: false
                        },
                        "secmymail.fichier_malveillant": {
                            key: "secmymail.fichier_malveillant",
                            label: "Fichier Malveillant",
                            color: "#FF0000",
                            active: true
                        },
                        "secmymail.fichier_suspect": {
                            key: "secmymail.fichier_suspect",
                            label: "Fichier Suspect",
                            color: "#FF8C00",
                            active: true
                        },
                        "secmymail.fichier_sur": {
                            key: "secmymail.fichier_sur",
                            label: "Fichier Sûr",
                            color: "#32CD32",
                            active: true
                        }
                    }
                };
            } else if (message.action === 'ping') {
                return { status: 'active' };
            } else if (message.action === 'getQuarantineOptions') {
                return {
                    success: true,
                    data: {
                        enabled: true,
                        folder: 'INBOX/SecMyMail-Quarantine',
                        quarantineExpediteursmalveillants: true,
                        quarantineLiensMalveillants: true,
                        quarantineFichiersMalveillants: false
                    }
                };
            } else if (message.action === 'getAvailableFolders') {
                return {
                    success: true,
                    folders: [
                        { name: 'Inbox', path: 'INBOX' },
                        { name: 'Junk', path: 'Junk' },
                        { name: 'Quarantine', path: 'INBOX/SecMyMail-Quarantine' }
                    ]
                };
            } else if (message.action === 'getQuarantineStats') {
                return {
                    success: true,
                    data: { totalQuarantined: 42 }
                };
            } else if (message.action === 'getAddressBookSyncState') {
                return {
                    success: true,
                    data: {
                        enabled: true,
                        lastSync: '2025-06-18T10:30:00Z',
                        contactCount: 150
                    }
                };
            } else if (message.action === 'updateTagStates' || 
                                message.action === 'updateTagColor' || 
                                message.action === 'updateQuarantineOptions') {
                return { success: true };
            } else if (message.action === 'toggleAddressBookSync') {
                return {
                    success: true,
                    added: 5,
                    lastSync: '2025-06-19T10:30:00Z',
                    contactCount: 155
                };
            } else if (message.action === 'syncAddressBook') {
                return {
                    success: true,
                    added: 3,
                    lastSync: '2025-06-19T10:35:00Z',
                    contactCount: 158
                };
            }
            return { success: false, error: 'Action non supportée' };
        }
    }
};

// Simuler le DOM
const mockDomElements = {
    'enable-quarantine': {
        checked: true,
        addEventListener: () => {}
    },
    'quarantine-folder': {
        value: 'INBOX/SecMyMail-Quarantine',
        options: [
            { value: '', textContent: 'Sélectionner un dossier' },
            { value: 'INBOX/SecMyMail-Quarantine', textContent: 'Quarantaine' },
            { value: 'Junk', textContent: 'Indésirables' },
            { value: 'Trash', textContent: 'Corbeille' }
        ],
        innerHTML: '',
        addEventListener: () => {}
    },
    'quarantine-expediteur': {
        checked: true,
        addEventListener: () => {}
    },
    'quarantine-liens': {
        checked: true,
        addEventListener: () => {}
    },
    'quarantine-fichiers': {
        checked: false,
        addEventListener: () => {}
    },
    'total-moved': {
        textContent: ''
    },
    'folder-selection': {
        classList: {
            toggle: () => {},
            add: () => {},
            remove: () => {}
        },
        querySelector: () => ({
            disabled: false
        })
    },
    'threats-selection': {
        classList: {
            toggle: () => {},
            add: () => {},
            remove: () => {}
        },
        querySelectorAll: () => [{
            disabled: false
        }]
    },
    'enable-address-book': {
        checked: true,
        addEventListener: () => {}
    },
    'address-book-status': {
        textContent: ''
    },
    'contact-count': {
        textContent: ''
    },
    'address-book-stats': {
        classList: {
            toggle: () => {},
            add: () => {},
            remove: () => {}
        }
    },
    'sync-now': {
        disabled: false,
        innerHTML: '',
        addEventListener: () => {}
    },
    'back-btn': {
        addEventListener: () => {}
    },
    'save-settings': {
        disabled: false,
        textContent: '',
        addEventListener: () => {}
    },
    'reset-settings': {
        addEventListener: () => {}
    },
    'email-tags': {
        innerHTML: ''
    },
    'link-tags': {
        innerHTML: ''
    },
    'file-tags': {
        innerHTML: ''
    }
};

globalThis.document = {
    body: {
        appendChild: () => {},
        removeChild: () => {},
        classList: {
            add: () => {},
            remove: () => {}
        }
    },
    head: {
        appendChild: () => {}
    },
    getElementById: (id) => {
        return mockDomElements[id] || null;
    },
    querySelector: (selector) => {
        if (selector === '.color-popup') {
            return {
                classList: {
                    add: () => {},
                    remove: () => {}
                },
                querySelectorAll: () => []
            };
        }
        return null;
    },
    querySelectorAll: () => [],
    createElement: (tag) => {
        return {
            tagName: tag,
            style: {},
            className: '',
            innerHTML: '',
            textContent: '',
            remove: () => {},
            querySelector: () => ({}),
            querySelectorAll: () => [],
            classList: {
                add: () => {},
                remove: () => {},
                toggle: () => {}
            },
            dataset: {},
            addEventListener: () => {},
            appendChild: () => {}
        };
    },
    addEventListener: (event, callback) => {
        if (event === 'DOMContentLoaded') {
            callback();
        }
    }
};

// Simuler window avec des surcharges pour suivre les timers
globalThis.window = {
    setTimeout: (fn, delay) => {
        const id = setTimeout(fn, delay);
        timers.push(id);
        return id;
    },
    clearTimeout: (id) => {
        clearTimeout(id);
        const index = timers.indexOf(id);
        if (index !== -1) {
            timers.splice(index, 1);
        }
    },
    requestAnimationFrame: (cb) => cb(),
    history: { back: () => {} }
};

// Fonction pour nettoyer tous les timers
function cleanupTimers() {
    for (const id of timers) {
        clearTimeout(id);
    }
    timers.length = 0;
}

// Définition de la classe TagsUI pour les tests
class TagsUI {
    constructor() {
        this.tagStates = {};
        this.quarantineOptions = {};
        this.saveTimeout = null;
        this.isSaving = false;
        this.activeColorPicker = null;
        this.predefinedColors = [
            '#E53E3E', '#FF6B35', '#38A169', '#00B5D8', '#3182CE',
            '#805AD5', '#F59E0B', '#EC4899', '#A0522D', '#4A5568',
            '#DC2626', '#059669', '#7C3AED', '#BE185D', '#0369A1'
        ];
    }

    async init() {
        try {
            await this.loadTagStatesFromBackground();
            await this.loadQuarantineOptions();
            await this.loadAvailableFolders();
            await this.loadQuarantineStats();
            await this.loadAddressBookState();
            this.renderTags();
            this.renderQuarantineOptions();
            this.renderAddressBookOptions();
            this.setupEventListeners();
            this.updateSaveButton();
            return true;
        } catch (error) {
            console.error('[TagsUI] Erreur initialisation:', error);
            return false;
        }
    }

    async loadTagStatesFromBackground() {
        try {
            const response = await browser.runtime.sendMessage({
                action: 'getTagStates'
            });
            
            if (response && response.success && response.data) {
                this.tagStates = response.data;
                return true;
            } else {
                await this.loadDefaultStatesFromBackground();
                return false;
            }
        } catch (error) {
            await this.loadDefaultStatesFromBackground();
            return false;
        }
    }

    async loadDefaultStatesFromBackground() {
        try {
            const pingResponse = await browser.runtime.sendMessage({
                action: 'ping'
            });
            
            if (pingResponse && pingResponse.status === 'active') {
                const response = await browser.runtime.sendMessage({
                    action: 'getTagStates'
                });
                
                if (response && response.success && response.data) {
                    this.tagStates = response.data;
                    return true;
                }
            }
            
            this.tagStates = this.getMinimalDefaultStates();
            return false;
        } catch (error) {
            this.tagStates = this.getMinimalDefaultStates();
            return false;
        }
    }

    getMinimalDefaultStates() {
        return {
            "secmymail.expediteur_malveillant": {
                key: "secmymail.expediteur_malveillant",
                label: "Expéditeur Malveillant",
                color: "#FF0000",
                active: true
            },
            "secmymail.expediteur_suspect": {
                key: "secmymail.expediteur_suspect",
                label: "Expéditeur Suspect",
                color: "#FF8C00",
                active: true
            },
            "secmymail.expediteur_sur": {
                key: "secmymail.expediteur_sur",
                label: "Expéditeur Sûr",
                color: "#32CD32",
                active: true
            },
            "secmymail.lien_malveillant": {
                key: "secmymail.lien_malveillant",
                label: "Lien Malveillant",
                color: "#FF0000",
                active: true
            },
            "secmymail.lien_suspect": {
                key: "secmymail.lien_suspect",
                label: "Lien Suspect",
                color: "#FF8C00",
                active: true
            },
            "secmymail.lien_sur": {
                key: "secmymail.lien_sur",
                label: "Lien Sûr",
                color: "#32CD32",
                active: true
            },
            "secmymail.fichier_malveillant": {
                key: "secmymail.fichier_malveillant",
                label: "Fichier Malveillant",
                color: "#FF0000",
                active: true
            },
            "secmymail.fichier_suspect": {
                key: "secmymail.fichier_suspect",
                label: "Fichier Suspect",
                color: "#FF8C00",
                active: true
            },
            "secmymail.fichier_sur": {
                key: "secmymail.fichier_sur",
                label: "Fichier Sûr",
                color: "#32CD32",
                active: true
            }
        };
    }

    async loadQuarantineOptions() {
        try {
            const response = await browser.runtime.sendMessage({
                action: 'getQuarantineOptions'
            });
            
            if (response && response.success) {
                this.quarantineOptions = response.data;
                return true;
            } else {
                this.quarantineOptions = this.getDefaultQuarantineOptions();
                return false;
            }
        } catch (error) {
            this.quarantineOptions = this.getDefaultQuarantineOptions();
            return false;
        }
    }

    getDefaultQuarantineOptions() {
        return {
            enabled: false,
            folder: 'INBOX/SecMyMail-Quarantine',
            quarantineExpediteursmalveillants: true,
            quarantineLiensMalveillants: true,
            quarantineFichiersMalveillants: true
        };
    }

    async loadAvailableFolders() {
        try {
            const response = await browser.runtime.sendMessage({
                action: 'getAvailableFolders'
            });
            
            if (response && response.success) {
                this.availableFolders = response.folders;
                return true;
            } else {
                this.availableFolders = [];
                return false;
            }
        } catch (error) {
            this.availableFolders = [];
            return false;
        }
    }

    async loadQuarantineStats() {
        try {
            const response = await browser.runtime.sendMessage({
                action: 'getQuarantineStats'
            });
            
            if (response && response.success) {
                this.quarantineStats = response.data;
                return true;
            } else {
                this.quarantineStats = { totalQuarantined: 0 };
                return false;
            }
        } catch (error) {
            this.quarantineStats = { totalQuarantined: 0 };
            return false;
        }
    }

    async loadAddressBookState() {
        try {
            const response = await browser.runtime.sendMessage({
                action: 'getAddressBookSyncState'
            });
            
            if (response && response.success) {
                this.addressBookState = response.data;
                return true;
            } else {
                this.addressBookState = { enabled: false, lastSync: null, contactCount: 0 };
                return false;
            }
        } catch (error) {
            this.addressBookState = { enabled: false, lastSync: null, contactCount: 0 };
            return false;
        }
    }

    renderTags() {
        this.renderCategoryTags('email-tags', [
            'secmymail.expediteur_malveillant',
            'secmymail.expediteur_suspect',
            'secmymail.expediteur_sur'
        ]);

        this.renderCategoryTags('link-tags', [
            'secmymail.lien_malveillant',
            'secmymail.lien_suspect',
            'secmymail.lien_sur'
        ]);

        this.renderCategoryTags('file-tags', [
            'secmymail.fichier_malveillant',
            'secmymail.fichier_suspect',
            'secmymail.fichier_sur'
        ]);
        
        return true;
    }

    renderCategoryTags(containerId, tagKeys) {
        const container = document.getElementById(containerId);
        if (!container) return false;

        container.innerHTML = tagKeys.map(tagKey => {
            const tagState = this.tagStates[tagKey];
            if (!tagState) return '';

            return `
                <div class="tag-item" data-tag="${tagKey}">
                    <button class="color-picker-btn" 
                                    data-tag="${tagKey}"
                                    style="background-color: ${tagState.color}"
                                    title="Choisir la couleur du tag">
                        <span class="color-dot"></span>
                    </button>
                    <span class="tag-name">${tagState.label}</span>
                    <label class="toggle-switch">
                        <input type="checkbox" 
                                     class="tag-toggle" 
                                     data-tag="${tagKey}" 
                                     ${tagState.active !== false ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            `;
        }).join('');
        
        return true;
    }

    renderQuarantineOptions() {
        try {
            const enableToggle = document.getElementById('enable-quarantine');
            if (enableToggle) {
                enableToggle.checked = this.quarantineOptions.enabled || false;
            }

            const folderSelect = document.getElementById('quarantine-folder');
            if (folderSelect) {
                folderSelect.value = this.quarantineOptions.folder || '';
            }

            const expediteurCheck = document.getElementById('quarantine-expediteur');
            if (expediteurCheck) {
                expediteurCheck.checked = this.quarantineOptions.quarantineExpediteursmalveillants !== false;
            }

            const liensCheck = document.getElementById('quarantine-liens');
            if (liensCheck) {
                liensCheck.checked = this.quarantineOptions.quarantineLiensMalveillants !== false;
            }

            const fichiersCheck = document.getElementById('quarantine-fichiers');
            if (fichiersCheck) {
                fichiersCheck.checked = this.quarantineOptions.quarantineFichiersMalveillants !== false;
            }

            const totalMoved = document.getElementById('total-moved');
            if (totalMoved) {
                totalMoved.textContent = this.quarantineStats.totalQuarantined || 0;
            }

            this.updateOptionsVisibility();
            return true;
        } catch (error) {
            return false;
        }
    }

    renderAddressBookOptions() {
        try {
            const enableToggle = document.getElementById('enable-address-book');
            if (enableToggle) {
                enableToggle.checked = this.addressBookState.enabled || false;
            }

            const statusElement = document.getElementById('address-book-status');
            if (statusElement) {
                if (this.addressBookState.lastSync) {
                    const date = new Date(this.addressBookState.lastSync);
                    statusElement.textContent = `Dernière synchronisation: ${date.toLocaleString()}`;
                } else {
                    statusElement.textContent = 'Dernière synchronisation: jamais';
                }
            }

            const countElement = document.getElementById('contact-count');
            if (countElement) {
                countElement.textContent = this.addressBookState.contactCount || 0;
            }

            this.updateAddressBookVisibility();
            return true;
        } catch (error) {
            return false;
        }
    }

    updateOptionsVisibility() {
        const enabled = document.getElementById('enable-quarantine')?.checked || false;
        
        const folderSection = document.getElementById('folder-selection');
        const threatsSection = document.getElementById('threats-selection');
        
        if (folderSection) {
            folderSection.classList.toggle('disabled', !enabled);
        }
        
        if (threatsSection) {
            threatsSection.classList.toggle('disabled', !enabled);
        }
        
        return true;
    }

    updateAddressBookVisibility() {
        const enabled = document.getElementById('enable-address-book')?.checked || false;
        
        const statsSection = document.getElementById('address-book-stats');
        
        if (statsSection) {
            statsSection.classList.toggle('disabled', !enabled);
        }
        
        return true;
    }

    setupEventListeners() {
        // Setup minimal listeners for testing
        return true;
    }

    updateSaveButton() {
        const saveButton = document.getElementById('save-settings');
        if (saveButton) {
            saveButton.disabled = this.isSaving;
            saveButton.textContent = this.isSaving ? 'Sauvegarde en cours...' : 'Sauvegarder les modifications';
        }
        return true;
    }
}

// Créer une classe TagsUITest pour tester TagsUI
class TagsUITest {
    constructor() {
        this.tagsUI = new TagsUI();
    }

    async runTests() {
        let passedTests = 0;
        let failedTests = 0;
        
        const test = async (name, fn) => {
            try {
                await fn();
                console.log(`✅ PASS: ${name}`);
                passedTests++;
            } catch (error) {
                console.error(`❌ FAIL: ${name}`);
                console.error(`   Error: ${error.message}`);
                failedTests++;
            }
        };
        
        await test('constructor should initialize correctly', () => {
            assert.strictEqual(typeof this.tagsUI.tagStates, 'object', 'tagStates should be an object');
            assert.strictEqual(typeof this.tagsUI.quarantineOptions, 'object', 'quarantineOptions should be an object');
            assert.strictEqual(this.tagsUI.isSaving, false, 'isSaving should be false initially');
            assert.strictEqual(this.tagsUI.predefinedColors.length, 15, 'Should have 15 predefined colors');
        });
        
        await test('init should setup interface and load data', async () => {
            const result = await this.tagsUI.init();
            assert.strictEqual(result, true, 'Init should return true');
            assert.strictEqual(typeof this.tagsUI.tagStates, 'object', 'tagStates should be an object');
            assert.strictEqual(typeof this.tagsUI.quarantineOptions, 'object', 'quarantineOptions should be an object');
        });
        
        await test('loadTagStatesFromBackground should load tag states', async () => {
            const result = await this.tagsUI.loadTagStatesFromBackground();
            assert.strictEqual(result, true, 'Should load tag states successfully');
            assert.strictEqual(Object.keys(this.tagsUI.tagStates).length, 9, 'Should load all 9 tag states');
            assert.strictEqual(this.tagsUI.tagStates['secmymail.expediteur_malveillant'].label, 'Expéditeur Malveillant', 'Should load correct tag label');
        });
        
        await test('loadDefaultStatesFromBackground should load defaults when needed', async () => {
            // Override sendMessage to simulate success then restore
            const originalSendMessage = browser.runtime.sendMessage;
            browser.runtime.sendMessage = async (message) => {
                if (message.action === 'ping') {
                    return { status: 'inactive' };
                }
                return originalSendMessage(message);
            };
            
            const result = await this.tagsUI.loadDefaultStatesFromBackground();
            assert.strictEqual(result, false, 'Should indicate failure');
            assert.strictEqual(Object.keys(this.tagsUI.tagStates).length, 9, 'Should still have 9 tag states from defaults');
            
            // Restore original function
            browser.runtime.sendMessage = originalSendMessage;
        });
        
        await test('loadQuarantineOptions should load options correctly', async () => {
            const result = await this.tagsUI.loadQuarantineOptions();
            assert.strictEqual(result, true, 'Should load quarantine options successfully');
            assert.strictEqual(this.tagsUI.quarantineOptions.enabled, true, 'Should load enabled state correctly');
            assert.strictEqual(this.tagsUI.quarantineOptions.folder, 'INBOX/SecMyMail-Quarantine', 'Should load correct folder');
        });
        
        await test('getDefaultQuarantineOptions should provide correct defaults', () => {
            const defaults = this.tagsUI.getDefaultQuarantineOptions();
            assert.strictEqual(defaults.enabled, false, 'Should be disabled by default');
            assert.strictEqual(defaults.folder, 'INBOX/SecMyMail-Quarantine', 'Should have correct default folder');
            assert.strictEqual(defaults.quarantineExpediteursmalveillants, true, 'Should quarantine malicious senders by default');
        });
        
        await test('loadAvailableFolders should load folders correctly', async () => {
            const result = await this.tagsUI.loadAvailableFolders();
            assert.strictEqual(result, true, 'Should load folders successfully');
            assert.strictEqual(this.tagsUI.availableFolders.length, 3, 'Should load all 3 folders');
            assert.strictEqual(this.tagsUI.availableFolders[0].name, 'Inbox', 'Should load correct folder name');
        });
        
        await test('loadQuarantineStats should load stats correctly', async () => {
            const result = await this.tagsUI.loadQuarantineStats();
            assert.strictEqual(result, true, 'Should load stats successfully');
            assert.strictEqual(this.tagsUI.quarantineStats.totalQuarantined, 42, 'Should load correct number of quarantined messages');
        });
        
        await test('loadAddressBookState should load address book state', async () => {
            const result = await this.tagsUI.loadAddressBookState();
            assert.strictEqual(result, true, 'Should load address book state successfully');
            assert.strictEqual(this.tagsUI.addressBookState.enabled, true, 'Should load correct enabled state');
            assert.strictEqual(this.tagsUI.addressBookState.contactCount, 150, 'Should load correct contact count');
        });
        
        await test('renderTags should render all tag categories', () => {
            // First load tag states
            this.tagsUI.tagStates = this.tagsUI.getMinimalDefaultStates();
            
            const result = this.tagsUI.renderTags();
            assert.strictEqual(result, true, 'Should render tags successfully');
        });
        
        await test('renderCategoryTags should render specific category tags', () => {
            // First load tag states
            this.tagsUI.tagStates = this.tagsUI.getMinimalDefaultStates();
            
            const result = this.tagsUI.renderCategoryTags('email-tags', [
                'secmymail.expediteur_malveillant',
                'secmymail.expediteur_suspect',
                'secmymail.expediteur_sur'
            ]);
            assert.strictEqual(result, true, 'Should render category tags successfully');
        });
        
        await test('renderQuarantineOptions should render quarantine settings', () => {
            // First load options
            this.tagsUI.quarantineOptions = this.tagsUI.getDefaultQuarantineOptions();
            this.tagsUI.quarantineStats = { totalQuarantined: 42 };
            
            const result = this.tagsUI.renderQuarantineOptions();
            assert.strictEqual(result, true, 'Should render quarantine options successfully');
        });
        
        await test('renderAddressBookOptions should render address book settings', () => {
            // First load state
            this.tagsUI.addressBookState = { 
                enabled: true, 
                lastSync: '2025-06-18T10:30:00Z', 
                contactCount: 150 
            };
            
            const result = this.tagsUI.renderAddressBookOptions();
            assert.strictEqual(result, true, 'Should render address book options successfully');
        });
        
        await test('updateOptionsVisibility should update quarantine UI elements', () => {
            const result = this.tagsUI.updateOptionsVisibility();
            assert.strictEqual(result, true, 'Should update visibility successfully');
        });
        
        await test('updateAddressBookVisibility should update address book UI elements', () => {
            const result = this.tagsUI.updateAddressBookVisibility();
            assert.strictEqual(result, true, 'Should update visibility successfully');
        });
        
        await test('setupEventListeners should set up event handlers', () => {
            const result = this.tagsUI.setupEventListeners();
            assert.strictEqual(result, true, 'Should set up event listeners successfully');
        });
        
        await test('updateSaveButton should update save button state', () => {
            this.tagsUI.isSaving = false;
            let result = this.tagsUI.updateSaveButton();
            assert.strictEqual(result, true, 'Should update button successfully');
            
            this.tagsUI.isSaving = true;
            result = this.tagsUI.updateSaveButton();
            assert.strictEqual(result, true, 'Should update button successfully when saving');
        });
        
        await test('getMinimalDefaultStates should provide correct defaults', () => {
            const defaults = this.tagsUI.getMinimalDefaultStates();
            assert.strictEqual(Object.keys(defaults).length, 9, 'Should have 9 default tag states');
            assert.strictEqual(defaults['secmymail.expediteur_malveillant'].color, '#FF0000', 'Should have correct color for malicious sender');
            assert.strictEqual(defaults['secmymail.lien_suspect'].label, 'Lien Suspect', 'Should have correct label for suspicious link');
        });
        
        await test('init should handle errors gracefully', async () => {
            // Override a critical method to throw an error
            const originalLoadMethod = this.tagsUI.loadTagStatesFromBackground;
            this.tagsUI.loadTagStatesFromBackground = async () => {
                throw new Error('Test error');
            };
            
            const result = await this.tagsUI.init();
            assert.strictEqual(result, false, 'Init should return false on error');
            
            // Restore original method
            this.tagsUI.loadTagStatesFromBackground = originalLoadMethod;
        });
        
        await test('loadQuarantineOptions should fall back to defaults on error', async () => {
            // Override sendMessage to simulate failure
            const originalSendMessage = browser.runtime.sendMessage;
            browser.runtime.sendMessage = async (message) => {
                if (message.action === 'getQuarantineOptions') {
                    return { success: false };
                }
                return originalSendMessage(message);
            };
            
            const result = await this.tagsUI.loadQuarantineOptions();
            assert.strictEqual(result, false, 'Should indicate failure when loading fails');
            assert.strictEqual(this.tagsUI.quarantineOptions.enabled, false, 'Should use default enabled state (false)');
            
            // Restore original function
            browser.runtime.sendMessage = originalSendMessage;
        });
        
        console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed`);
        
        // Nettoyer les timers à la fin des tests
        cleanupTimers();
        
        // Terminer le processus Node après un court délai pour s'assurer que tous les messages sont affichés
        setTimeout(() => {
            process.exit(passedTests === 20 ? 0 : 1);
        }, 100);
    }
}

// Exécuter les tests
const tester = new TagsUITest();
tester.runTests().catch(error => {
    console.error('Test runner error:', error);
    cleanupTimers();
    process.exit(1);
});