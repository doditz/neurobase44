import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * PERSONA TEAM OPTIMIZER v3.0 - Agent-Aware Selection
 * - Filters personas by agent_name/system compatibility
 * - Prioritizes personas configured for specific agents
 * - Maintains backward compatibility with existing calls
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized', success: false }, { status: 401 });
        }

        // Parse and validate request
        let requestData;
        try {
            requestData = await req.json();
        } catch (parseError) {
            return Response.json({ 
                error: 'Invalid JSON payload', 
                success: false 
            }, { status: 400 });
        }

        const { 
            prompt, 
            agent_name = 'smas_debater',
            query_type,
            complexity_score = 0.5, 
            complexity,
            hemisphere = 'balanced',
            max_personas = 5,
            system = 'SMAS',
            archetype
        } = requestData;

        if (!prompt || typeof prompt !== 'string') {
            return Response.json({ 
                error: 'prompt required as string', 
                success: false,
                received: { prompt, type: typeof prompt }
            }, { status: 400 });
        }

        // Map agent_name to system filter
        const systemFilter = agent_name === 'suno_prompt_architect' ? 'Suno' : 
                           agent_name === 'smas_debater' ? 'SMAS' :
                           system;

        console.log(`[PersonaTeamOptimizer] Agent: ${agent_name}, System filter: ${systemFilter}`);

        // Fetch personas compatible with this agent/system
        let allPersonas;
        try {
            // First try to get personas for specific system, fallback to shared
            allPersonas = await base44.asServiceRole.entities.Persona.filter({
                status: 'Active',
                system: { "$in": [systemFilter, 'Shared'] }
            });
            
            console.log(`[PersonaTeamOptimizer] Found ${allPersonas.length} personas for system ${systemFilter}`);
            
            // If no personas found for this system, fallback to all active
            if (allPersonas.length === 0) {
                console.log(`[PersonaTeamOptimizer] No personas for ${systemFilter}, trying all active`);
                allPersonas = await base44.asServiceRole.entities.Persona.filter({
                    status: 'Active'
                });
            }
        } catch (personaError) {
            // Ultimate fallback
            try {
                allPersonas = await base44.asServiceRole.entities.Persona.filter({
                    status: 'Active'
                });
            } catch (fallbackError) {
                return Response.json({ 
                    error: 'Failed to fetch personas',
                    success: false,
                    details: fallbackError.message
                }, { status: 503 });
            }
        }

        if (allPersonas.length === 0) {
            return Response.json({ 
                error: 'No active personas found',
                success: false,
                agent_name,
                system_filter: systemFilter
            }, { status: 404 });
        }

        // Determine archetype based on prompt analysis
        const promptLower = prompt.toLowerCase();
        
        let detectedArchetype = archetype || query_type || 'analytical';
        
        // Enhanced detection for Suno
        if (agent_name === 'suno_prompt_architect' || systemFilter === 'Suno') {
            detectedArchetype = 'creative';
            console.log(`[PersonaTeamOptimizer] Suno agent detected, forcing creative archetype`);
        } else if (/creat|invent|imagin|innov|design|artis|music|song|lyric|composi/i.test(prompt)) {
            detectedArchetype = 'creative';
        } else if (/ethic|moral|right|wrong|fair|justice/i.test(prompt)) {
            detectedArchetype = 'ethical';
        } else if (/code|algorithm|technical|engineer|system|debug/i.test(prompt)) {
            detectedArchetype = 'technical';
        } else if (/cultur|tradition|diverse|perspective|worldview/i.test(prompt)) {
            detectedArchetype = 'cultural';
        } else if (/mathematic|equation|proof|theorem|group|algebr/i.test(prompt)) {
            detectedArchetype = 'mathematical';
        }

        // Score and rank personas
        const scoredPersonas = allPersonas.map(p => {
            let score = p.priority_level || 5;
            
            // Boost score for matching system
            if (p.system === systemFilter) {
                score += 5;
                console.log(`[PersonaTeamOptimizer] ${p.name}: +5 for matching system ${systemFilter}`);
            } else if (p.system === 'Shared') {
                score += 2;
                console.log(`[PersonaTeamOptimizer] ${p.name}: +2 for Shared system`);
            }
            
            // Hemisphere match
            if (hemisphere === 'left' && p.hemisphere === 'Left') score += 3;
            if (hemisphere === 'right' && p.hemisphere === 'Right') score += 3;
            if (hemisphere === 'balanced' && p.hemisphere === 'Central') score += 2;
            
            // Category match (enhanced for Suno)
            if (detectedArchetype === 'creative' && ['Creative', 'Innovator', 'Specialized'].includes(p.category)) {
                score += 4;
                console.log(`[PersonaTeamOptimizer] ${p.name}: +4 for creative category match`);
            }
            if (detectedArchetype === 'analytical' && ['Core', 'Theorist', 'Scientific'].includes(p.category)) score += 4;
            if (detectedArchetype === 'mathematical' && ['Scientific', 'Theorist'].includes(p.category)) score += 5;
            if (detectedArchetype === 'ethical' && ['Expert'].includes(p.category)) score += 4;
            if (detectedArchetype === 'technical' && ['Engineering', 'Scientific'].includes(p.category)) score += 4;
            if (detectedArchetype === 'cultural' && ['Specialized'].includes(p.category)) score += 3;
            
            // Expertise score
            score += (p.expertise_score || 0.5) * 5;
            
            // Complexity adjustment
            if (complexity_score > 0.7 && p.priority_level >= 7) score += 2;
            
            return { persona: p, score };
        });

        // Sort by score descending
        scoredPersonas.sort((a, b) => b.score - a.score);
        
        console.log(`[PersonaTeamOptimizer] Top 5 scored personas:`, 
            scoredPersonas.slice(0, 5).map(sp => ({ name: sp.persona.name, score: sp.score }))
        );
        
        // Select top personas up to max_personas
        const selectedPersonas = scoredPersonas.slice(0, max_personas).map(sp => sp.persona);

        // Ensure core personas for SMAS system
        if (systemFilter === 'SMAS') {
            const coreHandles = ['P001', 'P002', 'P003', 'P004', 'P005'];
            const corePersonas = allPersonas.filter(p => coreHandles.includes(p.handle));
            
            const finalPersonas = [...corePersonas];
            
            for (const p of selectedPersonas) {
                if (!finalPersonas.find(fp => fp.id === p.id)) {
                    finalPersonas.push(p);
                }
                if (finalPersonas.length >= max_personas) break;
            }
            
            return Response.json({
                success: true,
                team: finalPersonas,
                selected_personas: finalPersonas.map(p => ({
                    handle: p.handle,
                    name: p.name,
                    category: p.category,
                    hemisphere: p.hemisphere,
                    expertise_score: p.expertise_score,
                    domain: p.domain,
                    system: p.system
                })),
                archetype_detected: detectedArchetype,
                agent_name,
                system_filter: systemFilter,
                total_personas_selected: finalPersonas.length,
                reasoning: `Agent: ${agent_name}, System: ${systemFilter}, Archetype: ${detectedArchetype}, Hemisphere: ${hemisphere}, Complexity: ${complexity_score.toFixed(2)}`,
                selection_diversity: {
                    left_hemisphere: finalPersonas.filter(p => p.hemisphere === 'Left').length,
                    right_hemisphere: finalPersonas.filter(p => p.hemisphere === 'Right').length,
                    central_hemisphere: finalPersonas.filter(p => p.hemisphere === 'Central').length
                }
            });
        }

        // For non-SMAS systems (like Suno), just return top selections
        return Response.json({
            success: true,
            team: selectedPersonas,
            selected_personas: selectedPersonas.map(p => ({
                handle: p.handle,
                name: p.name,
                category: p.category,
                hemisphere: p.hemisphere,
                expertise_score: p.expertise_score,
                domain: p.domain,
                system: p.system
            })),
            archetype_detected: detectedArchetype,
            agent_name,
            system_filter: systemFilter,
            total_personas_selected: selectedPersonas.length,
            reasoning: `Agent: ${agent_name}, System: ${systemFilter}, Archetype: ${detectedArchetype}, Hemisphere: ${hemisphere}, Complexity: ${complexity_score.toFixed(2)}`,
            selection_diversity: {
                left_hemisphere: selectedPersonas.filter(p => p.hemisphere === 'Left').length,
                right_hemisphere: selectedPersonas.filter(p => p.hemisphere === 'Right').length,
                central_hemisphere: selectedPersonas.filter(p => p.hemisphere === 'Central').length
            }
        });

    } catch (error) {
        console.error('PersonaTeamOptimizer error:', error);
        return Response.json({ 
            error: error.message,
            success: false,
            stack: error.stack
        }, { status: 500 });
    }
});