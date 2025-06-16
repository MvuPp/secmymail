import { storage, STORAGE_KEYS } from '../core/storage.js';

/**
 * Module de vérification des liens
 */
class LinkChecker {
    constructor() {
        this.suspiciousDomains = [
            'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly',
            'short.link', 'tiny.cc', 'lnkd.in', 'buff.ly'
        ];
        
        this.dangerousTlds = [
            '.tk', '.ml', '.ga', '.cf', '.zip', '.exe', '.scr'
        ];
        
        this.homographChars = {
            'a': ['а', 'ⱥ', 'α'], 'e': ['е', 'ⱸ', 'є'], 'o': ['о', 'ο', '᧐'],
            'p': ['р', 'ρ', '⍴'], 'c': ['с', 'ϲ', '⊂'], 'x': ['х', 'χ', '×'],
            'y': ['у', 'ү', 'ȳ'], 'h': ['һ', 'ɦ', 'ħ'], 'i': ['і', 'ι', '1'],
            'j': ['ј', 'ϳ', 'ĳ'], 'l': ['ӏ', 'ⅼ', '1'], 'n': ['п', 'η', 'ո'],
            'r': ['г', 'ρ', 'ʁ'], 's': ['ѕ', 'σ', '$'], 't': ['т', 'τ', '†'],
            'v': ['ν', 'ѵ', '√'], 'w': ['ԝ', 'ω', 'ῳ'], 'z': ['ᴢ', 'ζ', '2']
        };

        // Ajouter les listes personnalisées
        this.whiteListDomains = [];
        this.blackListDomains = [];
        this.whiteListKey = 'domain-whitelist';
        this.blackListKey = 'domain-blacklist';
        
        // Charger les listes au démarrage
        this.loadCustomLists();
    }
    
    /**
     * Charge les listes personnalisées depuis le storage
     */
    async loadCustomLists() {
        try {
            const whiteListResult = await browser.storage.sync.get(this.whiteListKey);
            const blackListResult = await browser.storage.sync.get(this.blackListKey);
            
            // Correction du nom de variable (était whiteListDomaines au lieu de whiteListDomains)
            this.whiteListDomains = whiteListResult[this.whiteListKey] || [];
            this.blackListDomains = blackListResult[this.blackListKey] || [];
            
            console.log(`[LinkChecker] Listes chargées: ${this.whiteListDomains.length} blancs, ${this.blackListDomains.length} noirs`);
        } catch (error) {
            console.error('[LinkChecker] Erreur chargement listes:', error);
            this.whiteListDomains = [];
            this.blackListDomains = [];
        }
    }
    
    /**
     * Analyse les liens dans un message avec extraction complète
     */
    async analyzeLinks(content, htmlContent = '') {
        if (!content && !htmlContent) {
            return {
                count: 0,
                status: 0,
                risk: 'none',
                links: [],
                domains: []
            };
        }

        // Combiner le contenu texte et HTML
        const fullContent = `${content || ''} ${htmlContent || ''}`;
        
        // Extraire les liens et domaines
        const extracted = this.extractLinks(fullContent);
        
        if (extracted.urls.length === 0 && extracted.domains.length === 0) {
            return {
                count: 0,
                status: 0,
                risk: 'none', 
                links: [],
                domains: []
            };
        }

        const analyzedLinks = [];
        const analyzedDomains = [];
        let overallRisk = 0;

        // Analyser les URLs complètes
        for (const url of extracted.urls) {
            const analysis = await this.analyzeLink(url);
            analyzedLinks.push(analysis);

            // Déterminer le risque global
            if (analysis.risk === 'high') {
                overallRisk = -1; // Dangereux
            } else if (analysis.risk === 'medium' && overallRisk === 0) {
                overallRisk = 1; // Suspect
            }
        }

        // Analyser les domaines extraits
        for (const domain of extracted.domains) {
            const analysis = await this.analyzeDomainOnly(domain);
            analyzedDomains.push(analysis);

            // Déterminer le risque global
            if (analysis.risk === 'high') {
                overallRisk = -1; // Dangereux
            } else if (analysis.risk === 'medium' && overallRisk === 0) {
                overallRisk = 1; // Suspect
            }
        }

        // Appliquer la logique de comparaison des listes
        const listComparison = await this.compareLinks(extracted.domains);
        if (listComparison === -1) {
            overallRisk = -1; // Au moins un domaine en liste noire
        } else if (listComparison === 1 && overallRisk === 0) {
            // Tous les domaines sont en liste blanche
            overallRisk = 0; // Garder comme sûr
        }

        return {
            count: extracted.urls.length + extracted.domains.length,
            status: overallRisk,
            risk: this.getRiskLevel(overallRisk),
            links: analyzedLinks,
            domains: analyzedDomains,
            summary: this.generateSummary(analyzedLinks, analyzedDomains)
        };
    }

    /**
     * Extrait les domaines du contenu (sans protocole)
     */
    extractDomains(content) {
        const domainRegex = /(?:^|\s|[^a-zA-Z0-9.-])([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,})(?:[^a-zA-Z0-9.-]|$)/g;
        const domains = new Set();
        let match;

        while ((match = domainRegex.exec(content)) !== null) {
            const domain = match[1].toLowerCase();
            if (this.isValidDomain(domain)) {
                domains.add(domain);
            }
        }

        return Array.from(domains);
    }

    /**
     * Valide qu'une chaîne est un domaine valide
     */
    isValidDomain(domain) {
        const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
        return domainPattern.test(domain) && !domain.includes('..') && domain.length <= 253;
    }

    /**
     * Analyse un domaine seul (sans URL complète)
     */
    async analyzeDomainOnly(domain) {
        const analysis = {
            domain: domain,
            type: 'domain',
            risk: 'low',
            reasons: [],
            recommendations: []
        };

        // Vérifier les listes personnalisées en premier
        await this.checkCustomLists(analysis);
        if (analysis.risk === 'high' || analysis.risk === 'low') {
            return analysis; // Stop si déjà déterminé par les listes
        }

        // Analyse du domaine
        this.analyzeDomain(analysis);

        return analysis;
    }

    /**
     * Extrait les liens d'un contenu (basé sur liens.js mais amélioré)
     */
    extractLinks(content) {
        // Pattern principal pour les URLs complètes et domaines
        const urlRegex = /(?:(?:https?:\/\/)?(?:www\.)?)([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\/[^\s]*)?/g;
        
        // Patterns additionnels pour différents types de liens
        const linkPatterns = [
            // URLs complètes
            /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi,
            // URLs sans protocole (commençant par www)
            /www\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s<>"{}|\\^`[\]]*[/\w]/gi,
            // URLs dans les attributs HTML
            /(?:href|src)=["']([^"']+)["']/gi
        ];

        const links = new Set();
        const domains = new Set();

        // Extraire les domaines avec le pattern principal
        let match;
        while ((match = urlRegex.exec(content)) !== null) {
            domains.add(match[1].toLowerCase());
        }

        // Extraire les URLs complètes
        for (const pattern of linkPatterns) {
            const matches = content.match(pattern) || [];
            for (let matchStr of matches) {
                // Nettoyer le match
                if (matchStr.includes('href=') || matchStr.includes('src=')) {
                    const urlMatch = matchStr.match(/["']([^"']+)["']/);
                    if (urlMatch) {
                        matchStr = urlMatch[1];
                    }
                }
                
                // Ajouter le protocole si manquant
                if (matchStr.startsWith('www.')) {
                    matchStr = 'https://' + matchStr;
                }
                
                try {
                    const url = new URL(matchStr);
                    links.add(url);
                    domains.add(url.hostname.toLowerCase());
                } catch (error) {
                    // URL invalide, ignorer
                }
            }
        }

        return {
            urls: Array.from(links),
            domains: Array.from(domains)
        };
    }

    /**
     * Compare avec la liste blanche (basé sur liens.js)
     */
    async compareWhiteList(domain) {
        await this.loadCustomLists(); // Recharger pour avoir les dernières données
        return this.whiteListDomains.some(item => domain.includes(item) || item.includes(domain));
    }

    /**
     * Compare avec la liste noire (basé sur liens.js)
     */
    async compareBlackList(domain) {
        await this.loadCustomLists(); // Recharger pour avoir les dernières données
        return this.blackListDomains.some(item => domain.includes(item) || item.includes(domain));
    }

    /**
     * Compare les liens avec les listes (basé sur liens.js)
     */
    async compareLinks(domains) {
        let results = [];
        
        for (let domain of domains) {
            let isWhiteListed = await this.compareWhiteList(domain);
            let isBlackListed = await this.compareBlackList(domain);
            
            if (isBlackListed) {
                results.push(-1);
            } else if (isWhiteListed) {
                results.push(1);
            } else {
                results.push(0);
            }
        }

        // Logique de liens.js
        if (results.includes(-1)) {
            return -1; // Au moins un lien dangereux
        } else if (results.includes(0)) {
            return 0; // Au moins un lien inconnu
        } else {
            return 1; // Tous les liens sont sûrs
        }
    }

    /**
     * Génère un résumé de l'analyse (amélioré)
     */
    generateSummary(links, domains = []) {
        const totalCount = links.length + domains.length;
        if (totalCount === 0) return 'Aucun lien détecté';

        const highRiskCount = [...links, ...domains].filter(item => item.risk === 'high').length;
        const mediumRiskCount = [...links, ...domains].filter(item => item.risk === 'medium').length;

        if (highRiskCount > 0) {
            return `${highRiskCount} lien(s) dangereux détecté(s) sur ${totalCount}`;
        } else if (mediumRiskCount > 0) {
            return `${mediumRiskCount} lien(s) suspect(s) détecté(s) sur ${totalCount}`;
        } else {
            return `${totalCount} lien(s) analysé(s), aucun risque détecté`;
        }
    }

    /**
     * Analyse un lien individuel
     */
    async analyzeLink(url) {
        const analysis = {
            url: url.href,
            domain: url.hostname,
            protocol: url.protocol,
            path: url.pathname,
            risk: 'low',
            reasons: [],
            recommendations: []
        };

        // Vérifier les listes personnalisées en premier
        await this.checkCustomLists(analysis);
        if (analysis.risk === 'high') {
            return analysis; // Stop si en liste noire
        }

        // Analyser les différents composants
        this.analyzeProtocol(analysis);
        this.analyzeDomain(analysis);
        this.analyzeUrl(analysis);
        this.analyzeParameters(analysis, url);

        return analysis;
    }

    /**
     * Vérifie contre les listes personnalisées (mise à jour)
     */
    async checkCustomLists(analysis) {
        const domain = analysis.domain;

        // Vérifier la blacklist (priorité)
        if (await this.compareBlackList(domain)) {
            analysis.risk = 'high';
            analysis.reasons.push('Domaine dans la liste noire personnalisée');
            analysis.recommendations.push('Ne pas cliquer sur ce lien');
            return;
        }

        // Vérifier la whitelist
        if (await this.compareWhiteList(domain)) {
            analysis.risk = 'low';
            analysis.reasons.push('Domaine dans la liste blanche personnalisée');
            return;
        }
        
        // Continuer avec les vérifications par défaut...
    }

    /**
     * Analyse le domaine
     */
    analyzeDomain(analysis) {
        const domain = analysis.domain;

        // Vérifier les domaines de raccourcissement d'URL
        if (this.suspiciousDomains.includes(domain)) {
            analysis.risk = 'medium';
            analysis.reasons.push('Service de raccourcissement d\'URL');
            analysis.recommendations.push('Vérifier la destination réelle avant de cliquer');
        }

        // Vérifier les TLD dangereux
        for (const tld of this.dangerousTlds) {
            if (domain.endsWith(tld)) {
                analysis.risk = 'high';
                analysis.reasons.push(`Extension de domaine suspecte (${tld})`);
                analysis.recommendations.push('Éviter ce lien');
                break;
            }
        }

        // Vérifier les caractères homographes
        if (this.containsHomographs(domain)) {
            analysis.risk = 'high';
            analysis.reasons.push('Caractères suspects détectés (possible typosquatting)');
            analysis.recommendations.push('Vérifier attentivement le nom de domaine');
        }

        // Vérifier la longueur excessive
        if (domain.length > 50) {
            analysis.risk = 'medium';
            analysis.reasons.push('Nom de domaine inhabituellement long');
        }

        // Vérifier les patterns suspects
        if (/\d{4,}/.test(domain)) {
            analysis.risk = 'medium';
            analysis.reasons.push('Domaine contenant beaucoup de chiffres');
        }

        if (/-{2,}/.test(domain)) {
            analysis.risk = 'medium';
            analysis.reasons.push('Domaine avec tirets multiples');
        }
    }

    /**
     * Analyse l'URL complète
     */
    analyzeUrl(analysis) {
        const url = analysis.url;

        // Vérifier les URLs très longues
        if (url.length > 200) {
            analysis.risk = 'medium';
            analysis.reasons.push('URL inhabituellement longue');
        }

        // Vérifier les caractères encodés suspects
        if (/%[0-9a-f]{2}/gi.test(url)) {
            const decodedUrl = decodeURIComponent(url);
            if (decodedUrl !== url && /[<>"'&]/.test(decodedUrl)) {
                analysis.risk = 'high';
                analysis.reasons.push('URL contient des caractères encodés suspects');
            }
        }

        // Vérifier les extensions de fichiers dans l'URL
        const suspiciousExtensions = /\.(exe|bat|com|scr|pif|vbs|js)(\?|$)/i;
        if (suspiciousExtensions.test(url)) {
            analysis.risk = 'high';
            analysis.reasons.push('URL pointe vers un fichier potentiellement dangereux');
        }
    }

    /**
     * Analyse le protocole
     */
    analyzeProtocol(analysis) {
        if (analysis.protocol === 'http:') {
            analysis.risk = 'medium';
            analysis.reasons.push('Connexion non sécurisée (HTTP)');
            analysis.recommendations.push('Préférer les sites HTTPS');
        }

        if (!['http:', 'https:', 'ftp:', 'ftps:'].includes(analysis.protocol)) {
            analysis.risk = 'high';
            analysis.reasons.push(`Protocole inhabituel (${analysis.protocol})`);
        }
    }

    /**
     * Analyse les paramètres URL
     */
    analyzeParameters(analysis, url) {
        const params = url.searchParams;
        
        // Vérifier les paramètres suspects
        const suspiciousParams = ['cmd', 'exec', 'eval', 'system', 'shell'];
        for (const param of params.keys()) {
            if (suspiciousParams.includes(param.toLowerCase())) {
                analysis.risk = 'high';
                analysis.reasons.push(`Paramètre suspect détecté: ${param}`);
                break;
            }
        }

        // Vérifier les redirections multiples
        const redirectParams = ['redirect', 'url', 'goto', 'link', 'target'];
        for (const param of params.keys()) {
            if (redirectParams.includes(param.toLowerCase())) {
                analysis.risk = 'medium';
                analysis.reasons.push('Possible redirection détectée');
                analysis.recommendations.push('Vérifier la destination finale');
                break;
            }
        }
    }

    /**
     * Vérifie la présence de caractères homographes
     */
    containsHomographs(domain) {
        for (const [latin, homographs] of Object.entries(this.homographChars)) {
            for (const homograph of homographs) {
                if (domain.includes(homograph)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Détermine le niveau de risque
     */
    getRiskLevel(status) {
        if (status < 0) return 'high';
        if (status > 0) return 'medium';
        return 'low';
    }

    /**
     * Raccourcit une URL pour l'affichage
     */
    shortenUrl(url, maxLength = 50) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength - 3) + '...';
    }
}

// Instance singleton
const linkChecker = new LinkChecker();

export { linkChecker };