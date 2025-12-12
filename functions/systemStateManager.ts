import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, mode, metadata = {}, force = false } = await req.json();
        
        if (!['benchmark_mode_active', 'auto_optimization_mode_active'].includes(mode)) {
            return Response.json({ error: 'Invalid mode' }, { status: 400 });
        }

        // CRITICAL: Ultra-aggressive auto-cleanup with shorter timeout
        const STALE_TIMEOUT = 2 * 60 * 1000; // 2 minutes (reduced from 5)
        const now = Date.now();
        let allStates = await base44.asServiceRole.entities.SystemState.list();
        
        for (const state of allStates) {
            if (state.is_active && state.started_at) {
                const elapsed = now - new Date(state.started_at).getTime();
                if (elapsed > STALE_TIMEOUT) {
                    console.log(`[AUTO-CLEANUP] Cleaning stale state: ${state.state_key} (${Math.round(elapsed/1000)}s old)`);
                    await base44.asServiceRole.entities.SystemState.update(state.id, {
                        is_active: false,
                        current_operation: `Auto-cleaned after ${Math.round(elapsed/1000)}s`,
                        progress_percentage: 0
                    });
                }
            }
        }

        // Re-fetch after cleanup
        const cleanedStates = await base44.asServiceRole.entities.SystemState.list();
        const currentState = cleanedStates.find(s => s.state_key === mode);
        const otherMode = mode === 'benchmark_mode_active' 
            ? 'auto_optimization_mode_active' 
            : 'benchmark_mode_active';
        const otherState = cleanedStates.find(s => s.state_key === otherMode);

        if (action === 'force_reset') {
            // Force reset all states
            console.log('[FORCE-RESET] Resetting all states');
            for (const state of cleanedStates) {
                if (state.is_active) {
                    await base44.asServiceRole.entities.SystemState.update(state.id, {
                        is_active: false,
                        current_operation: 'Force reset',
                        progress_percentage: 0
                    });
                }
            }

            return Response.json({
                success: true,
                action: 'force_reset',
                message: 'All system states reset'
            });
        }

        if (action === 'start') {
            // If force flag is set, override any conflicts
            if (force) {
                console.log(`[FORCE-START] Force starting ${mode}, ignoring conflicts`);
                
                // Kill all active states
                for (const state of cleanedStates) {
                    if (state.is_active) {
                        await base44.asServiceRole.entities.SystemState.update(state.id, {
                            is_active: false,
                            current_operation: 'Force-stopped for priority operation',
                            progress_percentage: 0
                        });
                    }
                }
                
                // Wait a bit
                await new Promise(resolve => setTimeout(resolve, 500));
            } else {
                // Normal conflict checking
                if (otherState?.is_active) {
                    const modeLabel = mode === 'benchmark_mode_active' ? 'Mode A/B Test' : 'Mode Auto-Optimisation';
                    const otherLabel = otherMode === 'benchmark_mode_active' ? 'Mode A/B Test' : 'Mode Auto-Optimisation';
                    
                    console.log(`[CONFLICT] Cannot start ${mode}, ${otherMode} is active`);
                    
                    return Response.json({ 
                        success: false,
                        error: 'conflict',
                        message: `Impossible de démarrer ${modeLabel}. ${otherLabel} est actif.`,
                        conflicting_mode: otherMode,
                        started_by: otherState.started_by,
                        started_at: otherState.started_at,
                        suggestion: 'Use force=true to override'
                    }, { status: 409 });
                }

                if (currentState?.is_active) {
                    const modeLabel = mode === 'benchmark_mode_active' ? 'Mode A/B Test' : 'Mode Auto-Optimisation';
                    
                    console.log(`[ALREADY-ACTIVE] ${mode} is already active`);
                    
                    return Response.json({ 
                        success: false,
                        error: 'already_active',
                        message: `${modeLabel} est déjà actif.`,
                        started_by: currentState.started_by,
                        started_at: currentState.started_at,
                        suggestion: 'Use force=true to override'
                    }, { status: 409 });
                }
            }

            const stateData = {
                state_key: mode,
                is_active: true,
                started_at: new Date().toISOString(),
                started_by: user.email,
                current_operation: metadata.operation || 'Démarrage...',
                progress_percentage: 0,
                metadata: metadata
            };

            if (currentState) {
                await base44.asServiceRole.entities.SystemState.update(currentState.id, stateData);
            } else {
                await base44.asServiceRole.entities.SystemState.create(stateData);
            }

            console.log(`[START] ${mode} started by ${user.email}${force ? ' (FORCED)' : ''}`);

            return Response.json({
                success: true,
                action: 'started',
                mode: mode,
                message: `${mode === 'benchmark_mode_active' ? 'Mode A/B Test' : 'Mode Auto-Optimisation'} démarré`
            });

        } else if (action === 'stop') {
            if (!currentState?.is_active) {
                console.log(`[STOP-SKIP] ${mode} is not active, nothing to stop`);
                return Response.json({ 
                    success: true,
                    action: 'stop',
                    message: 'Already stopped'
                });
            }

            await base44.asServiceRole.entities.SystemState.update(currentState.id, {
                is_active: false,
                current_operation: 'Terminé',
                progress_percentage: 100
            });

            console.log(`[STOP] ${mode} stopped`);

            return Response.json({
                success: true,
                action: 'stopped',
                mode: mode,
                message: `${mode === 'benchmark_mode_active' ? 'Mode A/B Test' : 'Mode Auto-Optimisation'} arrêté`
            });

        } else if (action === 'update_progress') {
            if (!currentState?.is_active) {
                console.log(`[UPDATE-SKIP] ${mode} is not active`);
                return Response.json({ 
                    success: true,
                    action: 'update_skipped',
                    message: `Cannot update progress for inactive mode`
                });
            }

            await base44.asServiceRole.entities.SystemState.update(currentState.id, {
                current_operation: metadata.operation || currentState.current_operation,
                progress_percentage: metadata.progress_percentage ?? currentState.progress_percentage,
                metadata: { ...currentState.metadata, ...metadata }
            });

            return Response.json({
                success: true,
                action: 'updated',
                mode: mode
            });

        } else if (action === 'check_status') {
            return Response.json({
                success: true,
                mode: mode,
                is_active: currentState?.is_active || false,
                state: currentState || null,
                other_mode_active: otherState?.is_active || false
            });

        } else {
            return Response.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('SystemStateManager error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});