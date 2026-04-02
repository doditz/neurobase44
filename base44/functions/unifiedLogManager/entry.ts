import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * UNIFIED LOG MANAGER v1.0
 * Central logging service for all benchmark/test/optimization operations
 * Provides: create, query, aggregate, pin, version management
 */

Deno.serve(async (req) => {
    const internalLog = [];
    const addLog = (msg) => {
        internalLog.push(`[${new Date().toISOString()}] ${msg}`);
        console.log(`[UnifiedLog] ${msg}`);
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action = 'query' } = body;

        addLog(`Action: ${action}`);

        switch (action) {
            // CREATE LOG ENTRY
            case 'create': {
                const {
                    source_type,
                    source_id,
                    execution_context,
                    config_version,
                    question_version,
                    strategy_name,
                    parameters_snapshot,
                    metrics,
                    result_summary,
                    winner = 'n/a',
                    status = 'success',
                    tags = [],
                    detailed_logs = [],
                    error_message,
                    execution_duration_ms
                } = body;

                const logEntry = await base44.entities.UnifiedLog.create({
                    log_id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                    source_type,
                    source_id,
                    execution_context,
                    config_version: config_version || await getCurrentVersion(base44),
                    question_version,
                    strategy_name,
                    parameters_snapshot,
                    metrics,
                    result_summary,
                    winner,
                    status,
                    is_pinned: false,
                    tags,
                    detailed_logs,
                    error_message,
                    execution_duration_ms
                });

                addLog(`Created log: ${logEntry.log_id}`);
                return Response.json({ success: true, log_entry: logEntry, internal_log: internalLog });
            }

            // QUERY LOGS
            case 'query': {
                const {
                    source_type,
                    source_id,
                    config_version,
                    is_pinned,
                    status,
                    tags,
                    limit = 50,
                    include_metrics_only = false
                } = body;

                let filter = {};
                if (source_type) filter.source_type = source_type;
                if (source_id) filter.source_id = source_id;
                if (config_version) filter.config_version = config_version;
                if (is_pinned !== undefined) filter.is_pinned = is_pinned;
                if (status) filter.status = status;

                const logs = await base44.entities.UnifiedLog.filter(filter, '-created_date', limit);

                // Filter by tags if provided
                let filtered = logs;
                if (tags?.length) {
                    filtered = logs.filter(l => tags.some(t => l.tags?.includes(t)));
                }

                if (include_metrics_only) {
                    filtered = filtered.map(l => ({
                        id: l.id,
                        log_id: l.log_id,
                        source_type: l.source_type,
                        config_version: l.config_version,
                        metrics: l.metrics,
                        is_pinned: l.is_pinned,
                        pin_label: l.pin_label,
                        created_date: l.created_date
                    }));
                }

                return Response.json({ success: true, logs: filtered, count: filtered.length });
            }

            // AGGREGATE METRICS
            case 'aggregate': {
                const {
                    source_type,
                    config_version,
                    group_by = 'source_type',
                    date_from,
                    date_to
                } = body;

                let filter = {};
                if (source_type) filter.source_type = source_type;
                if (config_version) filter.config_version = config_version;

                const logs = await base44.entities.UnifiedLog.filter(filter, '-created_date', 500);

                // Date filtering
                let filtered = logs;
                if (date_from) {
                    filtered = filtered.filter(l => new Date(l.created_date) >= new Date(date_from));
                }
                if (date_to) {
                    filtered = filtered.filter(l => new Date(l.created_date) <= new Date(date_to));
                }

                // Group and aggregate
                const groups = {};
                filtered.forEach(log => {
                    const key = log[group_by] || 'unknown';
                    if (!groups[key]) {
                        groups[key] = {
                            count: 0,
                            total_spg: 0,
                            total_quality: 0,
                            total_latency: 0,
                            total_tokens: 0,
                            total_efficiency: 0,
                            passed: 0
                        };
                    }
                    const g = groups[key];
                    g.count++;
                    g.total_spg += log.metrics?.spg || 0;
                    g.total_quality += log.metrics?.quality || 0;
                    g.total_latency += log.metrics?.latency_ms || 0;
                    g.total_tokens += log.metrics?.tokens || 0;
                    g.total_efficiency += log.metrics?.efficiency || 0;
                    if (log.status === 'success') g.passed++;
                });

                // Calculate averages
                const aggregated = Object.entries(groups).map(([key, g]) => ({
                    group: key,
                    count: g.count,
                    avg_spg: g.count > 0 ? g.total_spg / g.count : 0,
                    avg_quality: g.count > 0 ? g.total_quality / g.count : 0,
                    avg_latency: g.count > 0 ? g.total_latency / g.count : 0,
                    avg_tokens: g.count > 0 ? g.total_tokens / g.count : 0,
                    avg_efficiency: g.count > 0 ? g.total_efficiency / g.count : 0,
                    pass_rate: g.count > 0 ? (g.passed / g.count) * 100 : 0
                }));

                // Global totals
                const totals = {
                    total_logs: filtered.length,
                    avg_spg: filtered.length > 0 ? filtered.reduce((s, l) => s + (l.metrics?.spg || 0), 0) / filtered.length : 0,
                    avg_quality: filtered.length > 0 ? filtered.reduce((s, l) => s + (l.metrics?.quality || 0), 0) / filtered.length : 0,
                    avg_latency: filtered.length > 0 ? filtered.reduce((s, l) => s + (l.metrics?.latency_ms || 0), 0) / filtered.length : 0,
                    pass_rate: filtered.length > 0 ? (filtered.filter(l => l.status === 'success').length / filtered.length) * 100 : 0
                };

                return Response.json({ success: true, aggregated, totals, groups_count: aggregated.length });
            }

            // PIN/UNPIN LOG
            case 'pin': {
                const { log_id, pin_label } = body;
                
                const logs = await base44.entities.UnifiedLog.filter({ log_id });
                if (logs.length === 0) {
                    return Response.json({ success: false, error: 'Log not found' }, { status: 404 });
                }

                await base44.entities.UnifiedLog.update(logs[0].id, {
                    is_pinned: true,
                    pin_label: pin_label || `Pinned ${new Date().toISOString()}`
                });

                return Response.json({ success: true, message: 'Log pinned' });
            }

            case 'unpin': {
                const { log_id } = body;
                
                const logs = await base44.entities.UnifiedLog.filter({ log_id });
                if (logs.length === 0) {
                    return Response.json({ success: false, error: 'Log not found' }, { status: 404 });
                }

                await base44.entities.UnifiedLog.update(logs[0].id, {
                    is_pinned: false,
                    pin_label: null
                });

                return Response.json({ success: true, message: 'Log unpinned' });
            }

            // GET PINNED LOGS
            case 'get_pinned': {
                const pinned = await base44.entities.UnifiedLog.filter({ is_pinned: true }, '-created_date', 20);
                return Response.json({ success: true, pinned, count: pinned.length });
            }

            // COMPARE VERSIONS
            case 'compare_versions': {
                const { version_a, version_b } = body;

                const [logsA, logsB] = await Promise.all([
                    base44.entities.UnifiedLog.filter({ config_version: version_a }, '-created_date', 100),
                    base44.entities.UnifiedLog.filter({ config_version: version_b }, '-created_date', 100)
                ]);

                const aggregate = (logs) => ({
                    count: logs.length,
                    avg_spg: logs.length > 0 ? logs.reduce((s, l) => s + (l.metrics?.spg || 0), 0) / logs.length : 0,
                    avg_quality: logs.length > 0 ? logs.reduce((s, l) => s + (l.metrics?.quality || 0), 0) / logs.length : 0,
                    avg_latency: logs.length > 0 ? logs.reduce((s, l) => s + (l.metrics?.latency_ms || 0), 0) / logs.length : 0,
                    avg_tokens: logs.length > 0 ? logs.reduce((s, l) => s + (l.metrics?.tokens || 0), 0) / logs.length : 0,
                    pass_rate: logs.length > 0 ? (logs.filter(l => l.status === 'success').length / logs.length) * 100 : 0
                });

                const statsA = aggregate(logsA);
                const statsB = aggregate(logsB);

                const deltas = {
                    spg_delta: statsB.avg_spg - statsA.avg_spg,
                    quality_delta: statsB.avg_quality - statsA.avg_quality,
                    latency_delta: statsB.avg_latency - statsA.avg_latency,
                    tokens_delta: statsB.avg_tokens - statsA.avg_tokens,
                    pass_rate_delta: statsB.pass_rate - statsA.pass_rate
                };

                return Response.json({
                    success: true,
                    version_a: { version: version_a, stats: statsA },
                    version_b: { version: version_b, stats: statsB },
                    deltas,
                    improvement: deltas.spg_delta > 0
                });
            }

            // CREATE NEW CONFIG VERSION
            case 'create_version': {
                const {
                    version_tag,
                    version_type,
                    description,
                    config_snapshot,
                    changelog = []
                } = body;

                // Get current active version as parent
                const activeVersions = await base44.entities.ConfigVersion.filter({ 
                    is_active: true, 
                    version_type 
                });
                const parentVersion = activeVersions[0]?.version_tag || null;

                // Deactivate current
                for (const v of activeVersions) {
                    await base44.entities.ConfigVersion.update(v.id, { is_active: false });
                }

                // Create new version
                const newVersion = await base44.entities.ConfigVersion.create({
                    version_tag,
                    version_type,
                    description,
                    config_snapshot,
                    parent_version: parentVersion,
                    is_active: true,
                    is_baseline: false,
                    changelog
                });

                addLog(`Created version: ${version_tag}`);
                return Response.json({ success: true, version: newVersion });
            }

            // LIST VERSIONS
            case 'list_versions': {
                const { version_type } = body;
                let filter = {};
                if (version_type) filter.version_type = version_type;

                const versions = await base44.entities.ConfigVersion.filter(filter, '-created_date', 50);
                return Response.json({ success: true, versions, count: versions.length });
            }

            // SET BASELINE VERSION
            case 'set_baseline': {
                const { version_tag } = body;
                
                const versions = await base44.entities.ConfigVersion.filter({ version_tag });
                if (versions.length === 0) {
                    return Response.json({ success: false, error: 'Version not found' }, { status: 404 });
                }

                // Clear other baselines of same type
                const sameType = await base44.entities.ConfigVersion.filter({ 
                    version_type: versions[0].version_type,
                    is_baseline: true
                });
                for (const v of sameType) {
                    await base44.entities.ConfigVersion.update(v.id, { is_baseline: false });
                }

                await base44.entities.ConfigVersion.update(versions[0].id, { is_baseline: true });
                return Response.json({ success: true, message: 'Baseline set' });
            }

            default:
                return Response.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
        }

    } catch (error) {
        addLog(`ERROR: ${error.message}`);
        console.error('[UnifiedLog] Error:', error);
        return Response.json({ 
            success: false, 
            error: error.message,
            internal_log: internalLog
        }, { status: 500 });
    }
});

async function getCurrentVersion(base44) {
    try {
        const active = await base44.entities.ConfigVersion.filter({ is_active: true, version_type: 'full_config' });
        return active[0]?.version_tag || 'v0.0.0';
    } catch {
        return 'v0.0.0';
    }
}