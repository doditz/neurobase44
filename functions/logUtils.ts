import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * LogUtils - Système de logging centralisé pour Neuronas
 * Principe : Un seul module de log pour toutes les pages et fonctions
 * Web Dev 101 compliant
 */

export class LogManager {
    constructor() {
        this.logs = [];
        this.startTime = Date.now();
    }

    /**
     * Ajoute un message au log avec horodatage et niveau
     */
    add(message, level = 'INFO', metadata = {}) {
        const timestamp = Date.now() - this.startTime;
        const logEntry = {
            timestamp,
            level,
            message,
            metadata,
            iso_time: new Date().toISOString()
        };
        
        this.logs.push(logEntry);
        
        // Console output pour debugging (peut être désactivé en production)
        if (level === 'ERROR' || level === 'CRITICAL') {
            console.error(`[${timestamp}ms] [${level}] ${message}`, metadata);
        } else {
            console.log(`[${timestamp}ms] [${level}] ${message}`);
        }
        
        return logEntry;
    }

    info(message, metadata = {}) {
        return this.add(message, 'INFO', metadata);
    }

    debug(message, metadata = {}) {
        return this.add(message, 'DEBUG', metadata);
    }

    warning(message, metadata = {}) {
        return this.add(message, 'WARNING', metadata);
    }

    error(message, metadata = {}) {
        return this.add(message, 'ERROR', metadata);
    }

    critical(message, metadata = {}) {
        return this.add(message, 'CRITICAL', metadata);
    }

    system(message, metadata = {}) {
        return this.add(message, 'SYSTEM', metadata);
    }

    /**
     * Retourne tous les logs sous forme de tableau formaté pour sauvegarde
     */
    getFormattedLogs() {
        return this.logs.map(log => 
            `[${log.timestamp}ms] [${log.level}] ${log.message}${
                Object.keys(log.metadata).length > 0 ? ' | ' + JSON.stringify(log.metadata) : ''
            }`
        );
    }

    /**
     * Retourne les logs bruts (objets)
     */
    getRawLogs() {
        return this.logs;
    }

    /**
     * Filtre les logs par niveau
     */
    getLogsByLevel(level) {
        return this.logs.filter(log => log.level === level);
    }

    /**
     * Statistiques des logs
     */
    getStats() {
        const stats = {
            total: this.logs.length,
            by_level: {},
            duration_ms: Date.now() - this.startTime
        };

        this.logs.forEach(log => {
            stats.by_level[log.level] = (stats.by_level[log.level] || 0) + 1;
        });

        return stats;
    }

    /**
     * Clear logs (pour réinitialisation)
     */
    clear() {
        this.logs = [];
        this.startTime = Date.now();
    }
}

/**
 * Helper pour créer un LogManager depuis une requête (avec auth Base44)
 */
export async function createLogManager(req) {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        const logger = new LogManager();
        logger.info(`Session started for user: ${user.email}`);
        return { logger, user, base44 };
    } catch (error) {
        const logger = new LogManager();
        logger.warning('Session started without authentication');
        return { logger, user: null, base44 };
    }
}

/**
 * Helper pour sauvegarder les logs dans un BenchmarkResult
 */
export async function saveBenchmarkWithLogs(base44, benchmarkData, logger) {
    try {
        // Ajouter les logs au benchmarkData
        const dataWithLogs = {
            ...benchmarkData,
            full_debug_log: logger.getFormattedLogs(),
            log_stats: logger.getStats()
        };

        logger.system('Attempting to save benchmark result to database');
        
        const savedResult = await base44.asServiceRole.entities.BenchmarkResult.create(dataWithLogs);
        
        logger.system(`Benchmark saved successfully with ID: ${savedResult.id}`);
        
        return { success: true, result: savedResult };
    } catch (error) {
        logger.critical(`Failed to save benchmark: ${error.message}`, { 
            error: error.toString(),
            stack: error.stack 
        });
        
        return { 
            success: false, 
            error: error.message,
            logs: logger.getFormattedLogs()
        };
    }
}