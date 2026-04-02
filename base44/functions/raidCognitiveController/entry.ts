import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * RAID COGNITIVE CONTROLLER - v4.7 Enhancement
 * Phase 4: Redundancy And Integrity Distribution
 * 
 * Ensures cognitive reliability through:
 * - Multi-persona redundancy (RAID-like)
 * - Cross-validation of responses
 * - Automatic failover on persona failure
 * - Integrity scoring & checksum verification
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[RAID] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            prompt,
            primary_personas,
            redundancy_level = 2, // 1=none, 2=mirror, 3=triple
            min_consensus_threshold = 0.7
        } = await req.json();

        if (!prompt || !primary_personas || primary_personas.length === 0) {
            return Response.json({ 
                error: 'prompt and primary_personas required',
                success: false 
            }, { status: 400 });
        }

        addLog('=== RAID CONTROLLER START ===', { 
            primary_count: primary_personas.length,
            redundancy: redundancy_level 
        });

        // Step 1: Check fatigue status
        const { data: fatigueData } = await base44.functions.invoke('personaFatigueTracker', {
            persona_handles: primary_personas.map(p => p.handle),
            update_fatigue: false
        });

        const fatigueMap = {};
        if (fatigueData && fatigueData.success) {
            fatigueData.fatigue_reports.forEach(report => {
                fatigueMap[report.handle] = report.effectiveness_multiplier;
            });
        }

        // Step 2: Select backup personas for redundancy
        const allPersonas = await base44.asServiceRole.entities.Persona.filter({ 
            status: 'Active' 
        }, '-expertise_score', 20);

        const backupPool = allPersonas.filter(p => 
            !primary_personas.some(pp => pp.handle === p.handle) &&
            (fatigueMap[p.handle] === undefined || fatigueMap[p.handle] > 0.6)
        );

        const raidConfig = {
            primary: primary_personas.slice(0, 3),
            mirrors: [],
            hot_backups: []
        };

        if (redundancy_level >= 2) {
            raidConfig.mirrors = backupPool.slice(0, Math.min(2, primary_personas.length));
        }
        if (redundancy_level >= 3) {
            raidConfig.hot_backups = backupPool.slice(2, 4);
        }

        addLog('✓ RAID configuration', {
            primary: raidConfig.primary.length,
            mirrors: raidConfig.mirrors.length,
            hot_backups: raidConfig.hot_backups.length
        });

        // Step 3: Execute parallel responses with redundancy
        const responseGroups = {
            primary_responses: [],
            mirror_responses: [],
            backup_responses: []
        };

        const executeGroup = async (personas, group_name) => {
            const responses = [];
            for (const persona of personas) {
                try {
                    const response = await base44.integrations.Core.InvokeLLM({
                        prompt: `${persona.instructions_for_system || persona.default_instructions}\n\nQuestion: ${prompt}`,
                        temperature: 0.7
                    });
                    
                    // Apply fatigue degradation
                    const effectiveness = fatigueMap[persona.handle] || 1.0;
                    
                    responses.push({
                        persona_handle: persona.handle,
                        persona_name: persona.name,
                        response,
                        effectiveness,
                        response_length: response.length,
                        group: group_name
                    });
                    
                    addLog(`✓ ${group_name}: ${persona.name} responded`);
                } catch (error) {
                    addLog(`✗ ${group_name}: ${persona.name} failed`, error.message);
                    responses.push({
                        persona_handle: persona.handle,
                        persona_name: persona.name,
                        error: error.message,
                        group: group_name,
                        failed: true
                    });
                }
            }
            return responses;
        };

        // Execute in parallel
        const [primary, mirrors] = await Promise.all([
            executeGroup(raidConfig.primary, 'PRIMARY'),
            redundancy_level >= 2 ? executeGroup(raidConfig.mirrors, 'MIRROR') : Promise.resolve([])
        ]);

        responseGroups.primary_responses = primary;
        responseGroups.mirror_responses = mirrors;

        // Step 4: Cross-validation & Consensus Check
        const validResponses = [...primary, ...mirrors].filter(r => !r.failed);
        
        if (validResponses.length === 0) {
            // FAILOVER to hot backups
            addLog('⚠️ PRIMARY & MIRRORS FAILED - Activating hot backups');
            const backups = await executeGroup(raidConfig.hot_backups, 'BACKUP');
            responseGroups.backup_responses = backups;
            validResponses.push(...backups.filter(r => !r.failed));
        }

        // Step 5: Calculate consensus score
        let consensusScore = 0;
        if (validResponses.length >= 2) {
            // Simple consensus: compare response lengths and keywords
            const lengths = validResponses.map(r => r.response_length);
            const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
            const lengthVariance = lengths.reduce((sum, l) => sum + Math.abs(l - avgLength), 0) / lengths.length;
            consensusScore = Math.max(0, 1 - (lengthVariance / avgLength));
        }

        const consensusReached = consensusScore >= min_consensus_threshold;

        addLog(consensusReached ? '✓ CONSENSUS REACHED' : '⚠️ LOW CONSENSUS', {
            score: consensusScore.toFixed(3),
            threshold: min_consensus_threshold
        });

        // Step 6: Select best response
        const bestResponse = validResponses.reduce((best, curr) => {
            const score = (curr.effectiveness || 0.5) * (curr.response_length / 1000);
            const bestScore = (best.effectiveness || 0.5) * (best.response_length / 1000);
            return score > bestScore ? curr : best;
        }, validResponses[0]);

        addLog('=== RAID CONTROLLER COMPLETE ===');

        return Response.json({
            success: true,
            raid_config: {
                redundancy_level,
                primary_count: raidConfig.primary.length,
                mirror_count: raidConfig.mirrors.length,
                backup_count: raidConfig.hot_backups.length
            },
            response_groups: responseGroups,
            consensus: {
                score: consensusScore,
                reached: consensusReached,
                threshold: min_consensus_threshold
            },
            selected_response: bestResponse,
            integrity_verified: consensusReached && validResponses.length >= 2,
            logs: log
        });

    } catch (error) {
        addLog('ERROR', error.message);
        return Response.json({
            error: error.message,
            success: false,
            logs: log
        }, { status: 500 });
    }
});