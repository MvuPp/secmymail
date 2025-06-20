import { storage, STORAGE_KEYS } from './storage.js';

const LOG_MAX_DAYS = 30;

function getToday() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

async function loadLogs() {
    let logs = await storage.get(STORAGE_KEYS.LOGS, {});
    // Nettoyage des logs de plus de 30 jours
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - LOG_MAX_DAYS);
    for (const day in logs) {
        if (new Date(day) < cutoff) {
            delete logs[day];
        }
    }
    await storage.set(STORAGE_KEYS.LOGS, logs);
    return logs;
}

async function saveLogs(logs) {
    await storage.set(STORAGE_KEYS.LOGS, logs);
}

export async function writeLog(type, source, info) {
    const logs = await loadLogs();
    const today = getToday();
    if (!logs[today]) logs[today] = [];
    logs[today].push({
        date: new Date().toISOString(),
        type,
        source,
        info
    });
    await saveLogs(logs);
}

export async function getAllLogs() {
    // Toujours récupérer les logs directement depuis le stockage sécurisé
    return await storage.get(STORAGE_KEYS.LOGS, {});
}

export async function exportLogs() {
    const logs = await storage.get(STORAGE_KEYS.LOGS, {});
    let lines = [];
    
    // En-tête pour clarifier le format
    lines.push("# SecMyMail Logs Export");
    lines.push("# Format: DATE,TYPE,SOURCE,DETAILS");
    lines.push("# Generated: " + new Date().toISOString());
    lines.push("");
    
    // Traiter tous les logs par ordre chronologique
    Object.keys(logs).sort().forEach(day => {
        logs[day].forEach(entry => {
            // Nettoyer et échapper les données pour éviter les problèmes de format
            const cleanDate = (entry.date || '').replace(/,/g, ' ');
            const cleanType = (entry.type || '').replace(/,/g, ' ');
            const cleanSource = (entry.source || '').replace(/,/g, ' ');
            const cleanInfo = (entry.info || '').replace(/,/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
            
            // Format: DATE,TYPE,SOURCE,DETAILS
            lines.push(`${cleanDate},${cleanType},${cleanSource},${cleanInfo}`);
        });
    });
    
    const blob = new Blob([lines.join('\n')], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    return url;
}