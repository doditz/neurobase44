/**
 * THORVIS LOG MANAGER - Module Centralisé de Logging
 * 
 * Module unique pour tous les logs système.
 * Utilisable partout: backend functions, orchestrators, pages frontend.
 * 
 * Usage:
 * import { LogManager } from '@/functions/logManager';
 * const logger = new LogManager('MyModule');
 * logger.info('Message', { metadata });
 */

export class LogManager {
    constructor(moduleName = 'System') {
        this.moduleName = moduleName;
        this.logs = [];
        this.startTime = Date.now();
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
        
        // Console output
        const prefix = `[${timestamp}ms] [${this.moduleName}] [${level}]`;
        if (level === 'ERROR' || level === 'CRITICAL') {
            console.error(prefix, message, metadata);
        } else {
            console.log(prefix, message);
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

    // Récupération des logs formatés
    getFormattedLogs() {
        return this.logs.map(log => 
            `[${log.timestamp}ms] [${log.module}] [${log.level}] ${log.message}${
                Object.keys(log.metadata).length > 0 ? ' | ' + JSON.stringify(log.metadata) : ''
            }`
        );
    }

    // Statistiques
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

    // Export pour sauvegarde
    export() {
        return {
            module: this.moduleName,
            logs: this.logs,
            stats: this.getStats(),
            formatted: this.getFormattedLogs()
        };
    }

    // Logs par niveau
    getByLevel(level) {
        return this.logs.filter(log => log.level === level);
    }

    // Recherche dans les logs
    search(query) {
        const q = query.toLowerCase();
        return this.logs.filter(log => 
            log.message.toLowerCase().includes(q) ||
            JSON.stringify(log.metadata).toLowerCase().includes(q)
        );
    }
}

// Export singleton pour usage simple
let globalLogger = null;

export function getGlobalLogger(moduleName = 'Global') {
    if (!globalLogger) {
        globalLogger = new LogManager(moduleName);
    }
    return globalLogger;
}

export function resetGlobalLogger() {
    globalLogger = null;
}

// Helper pour diagnostic benchmark
export function createBenchmarkLogger(sessionId) {
    const logger = new LogManager(`Benchmark_${sessionId}`);
    
    logger.logBenchmarkStart = (question, mode) => {
        logger.system(`=== BENCHMARK START ===`, { question, mode, sessionId });
    };
    
    logger.logBenchmarkEnd = (result) => {
        logger.system(`=== BENCHMARK END ===`, { 
            success: result.success,
            spg: result.spg,
            duration_ms: Date.now() - logger.startTime
        });
    };
    
    logger.logModeExecution = (mode, time_ms, tokens) => {
        logger.info(`Mode ${mode} completed`, { time_ms, tokens });
    };
    
    logger.logSaveAttempt = (benchmarkId) => {
        logger.system(`Attempting to save benchmark`, { benchmarkId });
    };
    
    logger.logSaveSuccess = (benchmarkId) => {
        logger.success(`Benchmark saved successfully`, { benchmarkId });
    };
    
    logger.logSaveFailure = (error) => {
        logger.critical(`Benchmark save failed`, { error: error.message, stack: error.stack });
    };
    
    return logger;
}