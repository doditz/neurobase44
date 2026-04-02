import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PERSONA FATIGUE TRACKER - v4.7 Enhancement
 * Phase 4: Tracks and applies cognitive fatigue to personas
 * 
 * Implements realistic performance degradation:
 * - Recent activation frequency tracking
 * - Exponential fatigue accumulation
 * - Recovery over time
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[FatigueTracker] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            persona_handles,
            update_fatigue = true,
            recovery_window_hours = 24
        } = await req.json();

        if (!persona_handles || !Array.isArray(persona_handles)) {
            return Response.json({ 
                error: 'persona_handles array required',
                success: false 
            }, { status: 400 });
        }

        addLog('=== FATIGUE TRACKING START ===', { personas: persona_handles.length });

        const now = Date.now();
        const recoveryWindow = recovery_window_hours * 3600 * 1000;
        const fatigueReports = [];

        for (const handle of persona_handles) {
            const personas = await base44.asServiceRole.entities.Persona.filter({ handle });
            
            if (personas.length === 0) {
                addLog(`⚠️ Persona not found: ${handle}`);
                continue;
            }

            const persona = personas[0];
            const lastActivated = persona.last_activated ? new Date(persona.last_activated).getTime() : 0;
            const timeSinceActivation = now - lastActivated;
            
            // Calculate recovery (exponential decay)
            const recoveryFactor = Math.min(1.0, timeSinceActivation / recoveryWindow);
            const currentFatigue = (persona.fatigue_factor || 0) * (1 - recoveryFactor * 0.5);
            
            // Calculate new fatigue increment
            const activationFrequency = persona.recent_activation_frequency || 0;
            const fatigueIncrement = 0.05 + (activationFrequency * 0.02); // 0.05 base + frequency penalty
            
            const newFatigue = Math.min(1.0, currentFatigue + fatigueIncrement);
            
            // Performance degradation formula
            const effectivenessMultiplier = 1.0 - (newFatigue * 0.4); // Max 40% degradation
            
            addLog(`Persona ${persona.name}`, {
                current_fatigue: currentFatigue.toFixed(3),
                new_fatigue: newFatigue.toFixed(3),
                effectiveness: (effectivenessMultiplier * 100).toFixed(1) + '%',
                time_since_use: (timeSinceActivation / 3600000).toFixed(1) + 'h'
            });

            fatigueReports.push({
                handle,
                name: persona.name,
                fatigue_before: currentFatigue,
                fatigue_after: newFatigue,
                effectiveness_multiplier: effectivenessMultiplier,
                recent_activations: activationFrequency,
                hours_since_last_use: timeSinceActivation / 3600000
            });

            // Update persona if requested
            if (update_fatigue) {
                await base44.asServiceRole.entities.Persona.update(persona.id, {
                    fatigue_factor: newFatigue,
                    recent_activation_frequency: activationFrequency + 1,
                    last_activated: new Date().toISOString()
                });
                addLog(`✓ Updated ${persona.name} fatigue`);
            }
        }

        // Identify fatigued personas
        const highlyFatigued = fatigueReports.filter(p => p.fatigue_after > 0.7);
        const recommendations = [];

        if (highlyFatigued.length > 0) {
            recommendations.push({
                type: 'REST_REQUIRED',
                personas: highlyFatigued.map(p => p.name),
                message: `${highlyFatigued.length} persona(s) highly fatigued - consider rotation`
            });
        }

        addLog('=== FATIGUE TRACKING COMPLETE ===');

        return Response.json({
            success: true,
            fatigue_reports: fatigueReports,
            recommendations,
            avg_fatigue: fatigueReports.reduce((sum, p) => sum + p.fatigue_after, 0) / fatigueReports.length,
            highly_fatigued_count: highlyFatigued.length,
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