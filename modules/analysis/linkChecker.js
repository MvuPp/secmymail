import { storage, STORAGE_KEYS } from '../core/storage.js';

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
    }

    async getDomainLists() {
        try {
            const keys = ['domainWhitelist', 'domainBlacklist'];
            const stored = await browser.storage.local.get(keys);
            
            const lists = {
                whiteList: stored.domainWhitelist || [],
                blackList: stored.domainBlacklist || []
            };
            
            console.log(`[LinkChecker] Listes domaines récupérées:`, {
                whiteList: lists.whiteList.length,
                blackList: lists.blackList.length
            });
            
            if (lists.whiteList.length > 0) {
                console.log(`[LinkChecker] Liste blanche:`, lists.whiteList);
            }
            if (lists.blackList.length > 0) {
                console.log(`[LinkChecker] Liste noire:`, lists.blackList);
            }
            
            return lists;
            
        } catch (error) {
            console.error(`[LinkChecker] Erreur récupération listes domaines:`, error);
            return {
                whiteList: [],
                blackList: []
            };
        }
    }
    
    async analyzeLinks(content, htmlContent = '') {
        console.log(`[LinkChecker] Début analyse des liens`);
        
        if (!content && !htmlContent) {
            console.log(`[LinkChecker] Aucun contenu à analyser`);
            return {
                count: 0,
                status: 0,
                risk: 'none',
                domains: []
            };
        }

        const fullContent = `${content || ''} ${htmlContent || ''}`;
        
        const domains = this.extractDomains(fullContent);
        console.log(`[LinkChecker] Domaines extraits:`, domains);
        
        if (domains.length === 0) {
            console.log(`[LinkChecker] Aucun domaine trouvé dans le contenu`);
            return {
                count: 0,
                status: 0,
                risk: 'none', 
                domains: []
            };
        }

        const analyzedDomains = [];
        const domainScores = [];

        for (const domain of domains) {
            const analysis = await this.analyzeDomainOnly(domain);
            analyzedDomains.push(analysis);

            const domainScore = this.convertRiskToScore(analysis.risk);
            domainScores.push(domainScore);
            console.log(`[LinkChecker] Score domaine ${domain}: ${analysis.risk} -> ${domainScore}`);
        }

        const finalScore = this.calculateFinalScore(domainScores);
        console.log(`[LinkChecker] Score final calculé: ${finalScore} (risk: ${this.getRiskLevel(finalScore)})`);
        console.log(`[LinkChecker] Détail scores:`, domainScores);

        const result = {
            count: domains.length,
            status: finalScore,
            risk: this.getRiskLevel(finalScore),
            domains: analyzedDomains,
            summary: this.generateSummary(analyzedDomains),
            domainScores: domainScores
        };

        console.log(`[LinkChecker] Analyse terminée:`, {
            count: result.count,
            status: result.status,
            risk: result.risk,
            summary: result.summary
        });

        return result;
    }
    
    convertRiskToScore(risk) {
        switch(risk) {
            case 'high':
                return -1;
            case 'medium':
                return 0;
            case 'low':
            case 'none':
                return 1;
            default:
                return 0;
        }
    }
    
    calculateFinalScore(domainScores) {
        if (domainScores.length === 0) {
            return 0;
        }
    
        if (domainScores.includes(-1)) {
            return -1;
        }
    
        if (domainScores.every(score => score === 1)) {
            return 1;
        }
    
        if (domainScores.every(score => score === 0)) {
            return 0;
        }
    
        return 0;
    }

    extractDomains(content) {
        const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,})/g;
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

    isValidDomain(domain) {
        const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
        return domainPattern.test(domain) && !domain.includes('..') && domain.length <= 253;
    }

    async analyzeDomainOnly(domain) {
        console.log(`[LinkChecker] Début analyse domaine: ${domain}`);
        
        const analysis = {
            domain: domain,
            type: 'domain',
            risk: 'low',
            reasons: [],
            recommendations: []
        };

        await this.checkCustomLists(analysis);
        if (analysis.risk === 'high' || analysis.risk === 'low') {
            console.log(`[LinkChecker] Analyse terminée par listes personnalisées: ${domain} -> ${analysis.risk}`);
            return analysis;
        }

        console.log(`[LinkChecker] Analyse heuristique pour: ${domain}`);
        this.analyzeDomain(analysis);
        
        console.log(`[LinkChecker] Résultat final pour ${domain}:`, {
            risk: analysis.risk,
            raisons: analysis.reasons,
            recommendations: analysis.recommendations
        });

        return analysis;
    }

    async compareWhiteList(domain) {
        const lists = await this.getDomainLists();
        const isWhitelisted = lists.whiteList.some(item => domain === item || domain.endsWith('.' + item));
        console.log(`[LinkChecker] Comparaison whitelist ${domain}:`, isWhitelisted);
        return isWhitelisted;
    }

    async compareBlackList(domain) {
        const lists = await this.getDomainLists();
        const isBlacklisted = lists.blackList.some(item => domain === item || domain.endsWith('.' + item));
        console.log(`[LinkChecker] Comparaison blacklist ${domain}:`, isBlacklisted);
        return isBlacklisted;
    }

    async compareLinks(domains) {
        if (!domains || domains.length === 0) {
            return 0;
        }
        
        const lists = await this.getDomainLists();
        
        let allWhitelisted = true;
        
        for (let domain of domains) {
            const isBlackListed = lists.blackList.some(item => 
                domain === item || domain.endsWith('.' + item)
            );
            
            if (isBlackListed) {
                console.log(`[LinkChecker] Domaine blacklisté trouvé: ${domain}`);
                return -1;
            }
            
            const isWhiteListed = lists.whiteList.some(item => 
                domain === item || domain.endsWith('.' + item)
            );
            
            if (!isWhiteListed) {
                allWhitelisted = false;
            } else {
                console.log(`[LinkChecker] Domaine whitelisté trouvé: ${domain}`);
            }
        }
        
        if (allWhitelisted && domains.length > 0) {
            console.log(`[LinkChecker] Tous les domaines sont whitelistés`);
            return 1;
        }
        
        console.log(`[LinkChecker] Domaines neutres (ni blacklistés ni tous whitelistés)`);
        return 0;
    }

    generateSummary(domains = []) {
        const totalCount = domains.length;
        if (totalCount === 0) return 'Aucun domaine détecté';

        const highRiskCount = domains.filter(item => item.risk === 'high').length;
        const mediumRiskCount = domains.filter(item => item.risk === 'medium').length;

        if (highRiskCount > 0) {
            return `${highRiskCount} domaine(s) dangereux détecté(s) sur ${totalCount}`;
        } else if (mediumRiskCount > 0) {
            return `${mediumRiskCount} domaine(s) suspect(s) détecté(s) sur ${totalCount}`;
        } else {
            return `${totalCount} domaine(s) analysé(s), aucun risque détecté`;
        }
    }

    async checkCustomLists(analysis) {
        const domain = analysis.domain;

        console.log(`[LinkChecker] Vérification domaine: ${domain}`);
        
        const lists = await this.getDomainLists();

        const isBlacklisted = lists.blackList.some(item => domain === item || domain.endsWith('.' + item));
        console.log(`[LinkChecker] Blacklist check pour ${domain}:`, isBlacklisted);
        
        if (isBlacklisted) {
            analysis.risk = 'high';
            analysis.reasons.push('Domaine dans la liste noire personnalisée');
            analysis.recommendations.push('Ne pas cliquer sur ce lien');
            console.log(`[LinkChecker] DOMAINE BLACKLISTÉ: ${domain} -> risk: high`);
            return;
        }

        const isWhitelisted = lists.whiteList.some(item => domain === item || domain.endsWith('.' + item));
        console.log(`[LinkChecker] Whitelist check pour ${domain}:`, isWhitelisted);
        
        if (isWhitelisted) {
            analysis.risk = 'low';
            analysis.reasons.push('Domaine dans la liste blanche personnalisée');
            console.log(`[LinkChecker] DOMAINE WHITELISTÉ: ${domain} -> risk: low`);
            return;
        }
        
        // Domaine non trouvé dans les listes personnalisées -> risque medium par défaut
        analysis.risk = 'medium';
        analysis.reasons.push('Domaine non référencé dans les listes personnalisées');
        console.log(`[LinkChecker] Domaine ${domain} non trouvé dans les listes personnalisées -> risk: medium`);
    }

    analyzeDomain(analysis) {
        const domain = analysis.domain;
        console.log(`[LinkChecker] Tests heuristiques sur: ${domain}`);

        if (this.suspiciousDomains.includes(domain)) {
            analysis.risk = 'medium';
            analysis.reasons.push('Service de raccourcissement d\'URL');
            analysis.recommendations.push('Vérifier la destination réelle avant de cliquer');
            console.log(`[LinkChecker] Domaine de raccourcissement détecté: ${domain}`);
        }

        for (const tld of this.dangerousTlds) {
            if (domain.endsWith(tld)) {
                analysis.risk = 'high';
                analysis.reasons.push(`Extension de domaine suspecte (${tld})`);
                analysis.recommendations.push('Éviter ce lien');
                console.log(`[LinkChecker] TLD dangereux détecté: ${domain} (${tld})`);
                break;
            }
        }

        if (this.containsHomographs(domain)) {
            analysis.risk = 'high';
            analysis.reasons.push('Caractères suspects détectés (possible typosquatting)');
            analysis.recommendations.push('Vérifier attentivement le nom de domaine');
            console.log(`[LinkChecker] Caractères homographes détectés: ${domain}`);
        }

        if (domain.length > 50) {
            analysis.risk = 'medium';
            analysis.reasons.push('Nom de domaine inhabituellement long');
            console.log(`[LinkChecker] Domaine long détecté: ${domain} (${domain.length} chars)`);
        }

        if (/\d{4,}/.test(domain)) {
            analysis.risk = 'medium';
            analysis.reasons.push('Domaine contenant beaucoup de chiffres');
            console.log(`[LinkChecker] Nombreux chiffres détectés: ${domain}`);
        }

        if (/-{2,}/.test(domain)) {
            analysis.risk = 'medium';
            analysis.reasons.push('Domaine avec tirets multiples');
            console.log(`[LinkChecker] Tirets multiples détectés: ${domain}`);
        }

        console.log(`[LinkChecker] Tests heuristiques terminés pour: ${domain} -> ${analysis.risk}`);
    }

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

    getRiskLevel(status) {
        if (status === -1) return 'high';
        if (status === 0) return 'medium';
        if (status === 1) return 'low';
        return 'none';
    }
}

const linkChecker = new LinkChecker();

export { linkChecker };