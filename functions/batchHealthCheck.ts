import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Health check and cleanup for batch runs
 * - Detects stalled batch runs (running for > 15 minutes)
 * - Provides system status for batch operations
 * - Cleans up orphaned progress records
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action = 'check' } = await req.json().catch(() => ({}));

        if (action === 'cleanup') {
            // Clean up stalled batch runs
            const allProgress = await base44.asServiceRole.entities.BatchRunProgress.list('-created_date', 100);
            const now = Date.now();
            const STALE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
            
            let cleanedCount = 0;
            for (const progress of allProgress) {
                if (progress.status === 'running' && progress.start_time) {
                    const elapsed = now - new Date(progress.start_time).getTime();
                    if (elapsed > STALE_TIMEOUT) {
                        await base44.asServiceRole.entities.BatchRunProgress.update(progress.id, {
                            status: 'failed',
                            error_message: 'Batch run stalled (auto-cleaned after 15 minutes)',
                            end_time: new Date().toISOString()
                        });
                        cleanedCount++;
                    }
                }
            }

            return Response.json({
                success: true,
                action: 'cleanup',
                cleaned_count: cleanedCount
            });
        }

        // Default: health check
        const runningBatches = await base44.entities.BatchRunProgress.filter({ status: 'running' });
        const completedToday = await base44.entities.BatchRunProgress.filter({
            status: 'completed',
            start_time: { '$gte': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }
        });

        return Response.json({
            success: true,
            health: {
                running_batches: runningBatches.length,
                completed_today: completedToday.length,
                system_available: runningBatches.length === 0
            }
        });

    } catch (error) {
        console.error('[batchHealthCheck] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});