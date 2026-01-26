/**
 * NEURONAS UNIFIED LOGGER - SINGLE SOURCE OF TRUTH
 * 
 * This is THE ONLY logger to use across the entire application.
 * Frontend & Backend compatible.
 * 
 * Usage:
 * import { logger, createLogger, saveToUnifiedLog } from '@/components/core/NeuronasLogger';
 * 
 * // Quick usage (global singleton)
 * logger.info('Message', { data });
 * 
 * // Module-specific logger
 * const myLogger = createLogger('MyModule');
 * myLogger.info('Message');
 * 
 * // Save session logs to UnifiedLog entity
 * await saveToUnifiedLog(myLogger, { source_type: 'benchmark', metrics: {...} });
 */

class NeuronasLoggerClass {
    constructor(moduleName = 'System') {
        this.moduleName = moduleName;
        this.logs = [];
        this.startTime = Date.now();
        this.sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    }

    _createEntry(level, message, metadata = {}) {
        const timestamp = Date.now() - this.startTime;
        const entry = {
            id: `${this.sessionId}-${this.logs.length}`,
            module: this.moduleName,
            timestamp,
            level,
            message,
            metadata,
            iso_time: new Date().toISOString()
        };
        
        this.logs.push(entry);
        
        // Console output with colors (browser) or plain (backend)
        const prefix = `[${timestamp}ms] [${this.moduleName}] [${level}]`;
        
        if (typeof window !== 'undefined') {
            const colors = {
                ERROR: 'color: #ef4444; font-weight: bold',
                CRITICAL: 'color: #dc2626; font-weight: bold; background: #fee2e2',
                WARNING: 'color: #f59e0b; font-weight: bold',
                SUCCESS: 'color: #10b981; font-weight: bold',
                INFO: 'color: #3b82f6',
                DEBUG: 'color: #6b7280',
                SYSTEM: 'color: #8b5cf6; font-weight: bold'
            };
            console.log(`%c${prefix}`, colors[level] || '', message, Object.keys(metadata).length ? metadata : '');
        } else {
            if (level === 'ERROR' || level === 'CRITICAL') {
                console.error(prefix, message, metadata);
            } else {
                console.log(prefix, message);
            }
        }
        
        return entry;
    }

    // Standard log levels
    info(message, metadata = {}) { return this._createEntry('INFO', message, metadata); }
    debug(message, metadata = {}) { return this._createEntry('DEBUG', message, metadata); }
    warning(message, metadata = {}) { return this._createEntry('WARNING', message, metadata); }
    error(message, metadata = {}) { return this._createEntry('ERROR', message, metadata); }
    critical(message, metadata = {}) { return this._createEntry('CRITICAL', message, metadata); }
    system(message, metadata = {}) { return this._createEntry('SYSTEM', message, metadata); }
    success(message, metadata = {}) { return this._createEntry('SUCCESS', message, metadata); }

    // Specialized logging helpers
    startOperation(name) {
        return this.system(`=== ${name} START ===`, { operation: name });
    }
    
    endOperation(name, result = {}) {
        return this.system(`=== ${name} END ===`, { 
            operation: name, 
            duration_ms: Date.now() - this.startTime,
            ...result 
        });
    }

    saveAttempt(entity, id) {
        return this.system(`Saving ${entity}`, { entity, id });
    }
    
    saveSuccess(entity, id) {
        return this.success(`${entity} saved`, { entity, id });
    }
    
    saveFailure(entity, error) {
        return this.critical(`${entity} save failed`, { 
            entity, 
            error: error?.message || error,
            stack: error?.stack 
        });
    }

    // Data extraction
    getFormattedLogs() {
        return this.logs.map(log => 
            `[${log.timestamp}ms] [${log.module}] [${log.level}] ${log.message}${
                Object.keys(log.metadata).length > 0 ? ' | ' + JSON.stringify(log.metadata) : ''
            }`
        );
    }

    getRawLogs() {
        return this.logs;
    }

    getByLevel(level) {
        return this.logs.filter(log => log.level === level);
    }

    getStats() {
        const stats = {
            sessionId: this.sessionId,
            module: this.moduleName,
            total: this.logs.length,
            duration_ms: Date.now() - this.startTime,
            by_level: {}
        };
        
        this.logs.forEach(log => {
            stats.by_level[log.level] = (stats.by_level[log.level] || 0) + 1;
        });
        
        return stats;
    }

    export() {
        return {
            sessionId: this.sessionId,
            module: this.moduleName,
            logs: this.logs,
            stats: this.getStats(),
            formatted: this.getFormattedLogs()
        };
    }

    // Merge logs from another logger
    merge(otherLogger) {
        if (otherLogger?.logs) {
            this.logs.push(...otherLogger.logs);
        }
    }

    // Search
    search(query) {
        const q = query.toLowerCase();
        return this.logs.filter(log => 
            log.message.toLowerCase().includes(q) ||
            JSON.stringify(log.metadata).toLowerCase().includes(q)
        );
    }

    // Clear
    clear() {
        this.logs = [];
        this.startTime = Date.now();
        this.sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    }
}

// Global singleton instance
let globalLogger = null;

/**
 * Get the global logger singleton
 */
export function getLogger() {
    if (!globalLogger) {
        globalLogger = new NeuronasLoggerClass('Global');
    }
    return globalLogger;
}

/**
 * Create a new logger for a specific module
 */
export function createLogger(moduleName) {
    return new NeuronasLoggerClass(moduleName);
}

/**
 * Save logger contents to UnifiedLog entity via backend function
 * @param {NeuronasLoggerClass} loggerInstance - The logger to save
 * @param {Object} logData - Additional data for UnifiedLog
 */
export async function saveToUnifiedLog(loggerInstance, logData = {}) {
    try {
        const { base44 } = await import('@/api/base44Client');
        
        const payload = {
            action: 'create',
            source_type: logData.source_type || 'system_diagnostic',
            source_id: logData.source_id || loggerInstance.sessionId,
            execution_context: logData.execution_context || loggerInstance.moduleName,
            config_version: logData.config_version,
            strategy_name: logData.strategy_name,
            parameters_snapshot: logData.parameters_snapshot,
            metrics: logData.metrics || {},
            result_summary: logData.result_summary || `${loggerInstance.moduleName} completed`,
            winner: logData.winner || 'n/a',
            status: logData.status || 'success',
            tags: logData.tags || [],
            detailed_logs: loggerInstance.getFormattedLogs(),
            error_message: logData.error_message,
            execution_duration_ms: Date.now() - loggerInstance.startTime
        };

        const { data } = await base44.functions.invoke('unifiedLogManager', payload);
        
        if (data?.success) {
            loggerInstance.success('Logs saved to UnifiedLog', { log_id: data.log_entry?.log_id });
        }
        
        return data;
    } catch (error) {
        console.error('[NeuronasLogger] Failed to save to UnifiedLog:', error);
        return { success: false, error: error.message };
    }
}

// Convenience export of global logger
export const logger = getLogger();

// Default export for simpler imports
export default NeuronasLoggerClass;