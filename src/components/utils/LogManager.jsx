/**
 * THORVIS LOG MANAGER - Module Centralisé Unifié
 * Utilisable Frontend & Backend
 * Version: 2.0.0
 * 
 * Ce module fournit une interface de logging unifiée pour toute l'application.
 * Peut être utilisé côté frontend (React) et backend (Deno functions).
 * 
 * Usage Frontend:
 * import { LogManager } from '@/components/utils/LogManager';
 * const logger = new LogManager('ComponentName');
 * logger.info('Message', { metadata });
 * 
 * Usage Backend:
 * Copier cette classe directement dans les functions Deno
 */

export class LogManager {
    constructor(moduleName = 'System') {
        this.moduleName = moduleName;
        this.logs = [];
        this.startTime = Date.now();
        this.isClient = typeof window !== 'undefined';
    }

    _createEntry(level, message, metadata = {}) {
        const timestamp = Date.now() - this.startTime;
        const entry = {
            module: this.moduleName,
            timestamp,
            level,
            message,
            metadata,
            iso_time: new Date().toISOString()
        };
        
        this.logs.push(entry);
        
        const prefix = `[${timestamp}ms] [${this.moduleName}] [${level}]`;
        
        // Console output avec couleurs si disponible
        if (this.isClient) {
            const colors = {
                ERROR: 'color: #ef4444; font-weight: bold',
                CRITICAL: 'color: #dc2626; font-weight: bold; background: #fee2e2',
                WARNING: 'color: #f59e0b; font-weight: bold',
                SUCCESS: 'color: #10b981; font-weight: bold',
                INFO: 'color: #3b82f6',
                DEBUG: 'color: #6b7280',
                SYSTEM: 'color: #8b5cf6; font-weight: bold'
            };
            
            console.log(`%c${prefix}`, colors[level] || '', message, metadata);
        } else {
            // Backend console
            if (level === 'ERROR' || level === 'CRITICAL') {
                console.error(prefix, message, metadata);
            } else {
                console.log(prefix, message);
            }
        }
        
        return entry;
    }

    info(message, metadata = {}) {
        return this._createEntry('INFO', message, metadata);
    }

    debug(message, metadata = {}) {
        return this._createEntry('DEBUG', message, metadata);
    }

    warning(message, metadata = {}) {
        return this._createEntry('WARNING', message, metadata);
    }

    error(message, metadata = {}) {
        return this._createEntry('ERROR', message, metadata);
    }

    critical(message, metadata = {}) {
        return this._createEntry('CRITICAL', message, metadata);
    }

    system(message, metadata = {}) {
        return this._createEntry('SYSTEM', message, metadata);
    }

    success(message, metadata = {}) {
        return this._createEntry('SUCCESS', message, metadata);
    }

    // Méthodes de sauvegarde spécifiques
    logSaveAttempt(entityName, recordId) {
        this.system(`Attempting to save ${entityName}`, { recordId });
    }
    
    logSaveSuccess(entityName, recordId) {
        this.success(`${entityName} saved successfully`, { recordId });
    }
    
    logSaveFailure(entityName, error) {
        this.critical(`${entityName} save failed`, { 
            error: error.message, 
            stack: error.stack 
        });
    }

    // Méthodes d'analyse
    getFormattedLogs() {
        return this.logs.map(log => 
            `[${log.timestamp}ms] [${log.module}] [${log.level}] ${log.message}${
                Object.keys(log.metadata).length > 0 ? ' | ' + JSON.stringify(log.metadata) : ''
            }`
        );
    }

    getStats() {
        const stats = {
            module: this.moduleName,
            total: this.logs.length,
            by_level: {},
            duration_ms: Date.now() - this.startTime
        };
        
        this.logs.forEach(log => {
            stats.by_level[log.level] = (stats.by_level[log.level] || 0) + 1;
        });
        
        return stats;
    }

    export() {
        return {
            module: this.moduleName,
            logs: this.logs,
            stats: this.getStats(),
            formatted: this.getFormattedLogs()
        };
    }

    // Méthode de fusion avec d'autres logs
    mergeLogs(otherLogs = []) {
        if (Array.isArray(otherLogs)) {
            this.logs.push(...otherLogs);
        }
    }

    // Clear logs
    clear() {
        this.logs = [];
        this.startTime = Date.now();
    }
}

// Export par défaut pour compatibilité
export default LogManager;