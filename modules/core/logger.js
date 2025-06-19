const LOG_STORAGE_KEY = "secmymail_logs";
const LOG_MAX_DAYS = 30;

function getToday() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

function loadLogs() {
    const logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || "{}");
    // Nettoyage des logs de plus de 30 jours
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - LOG_MAX_DAYS);
    for (const day in logs) {
        if (new Date(day) < cutoff) {
            delete logs[day];
        }
    }
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    return logs;
}

function saveLogs(logs) {
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
}

export function writeLog(type, source, info) {
    const logs = loadLogs();
    const today = getToday();
    if (!logs[today]) logs[today] = [];
    logs[today].push({
        date: new Date().toISOString(),
        type,
        source,
        info
    });
    saveLogs(logs);
}

export function getAllLogs() {
    return loadLogs();
}

export function exportLogs() {
    const logs = getAllLogs();
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