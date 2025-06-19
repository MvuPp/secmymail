import { storage } from './storage.js';

const LOG_STORAGE_KEY = "secmymail_logs";
const LOG_MAX_DAYS = 30;

function getToday() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

async function loadLogs() {
    const logs = await storage.get(LOG_STORAGE_KEY, {});
    // Nettoyage des logs de plus de 30 jours
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - LOG_MAX_DAYS);
    for (const day in logs) {
        if (new Date(day) < cutoff) {
            delete logs[day];
        }
    }
    await storage.set(LOG_STORAGE_KEY, logs);
    return logs;
}

async function saveLogs(logs) {
    await storage.set(LOG_STORAGE_KEY, logs);
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
    return await loadLogs();
}

export async function exportLogs() {
    const logs = await getAllLogs();
    let lines = [];
    
    // En-tête pour clarifier le format
    lines.push("# SecMyMail Logs Export");
    lines.push("# Format: DATE,TYPE,SOURCE,DETAILS");
    lines.push("# Generated: " + new Date().toISOString());
    lines.push("");
    //
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