import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DYNAMIC PERSONA ADAPTER v1.0 - Real-Time Persona Monitoring & Adjustment
 * 
 * Monitors persona performance during debates and dynamically:
 * 1. Detects deviations from intended roles
 * 2. Adjusts persona instructions mid-debate
 * 3. Swaps out underperforming personas
 * 4. Introduces new personas when gaps detected
 */

Deno.serve(async (req) => {
    const logs = [];
    const log = (level, msg, data) => {
        const entry = `[${new Date().toISOString()}] [${level}] ${msg}`;
        logs.push(entry);
        console.log(`[DynamicAdapter] ${entry}`, data || '');
    };

    try {
        log('SYSTEM', '=== DYNAMIC PERSONA ADAPTER START ===');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized', logs }, { status: 401 });
        }

        const {
            current_personas,      // Array of currently active personas
            debate_history,        // All responses so far
            current_round,         // Which round we're in
            prompt,               // Original prompt
            archetype,            // Current archetype
            dominant_hemisphere,  // Current hemisphere
            agent_name = 'smas_debater'
        } = await req.json();

        log('INFO', `Analyzing ${current_personas.length} personas at round ${current_round}`);

        // STEP 1: ANALYZE PERSONA PERFORMANCE
        const performanceScores = [];
        
        for (const persona of current_personas) {
            const personaResponses = debate_history.filter(h => h.persona === persona.name);
            
            if (personaResponses.length === 0) {
                performanceScores.push({
                    persona: persona.name,
                    handle: persona.handle,
                    deviation_score: 0,
                    relevance_score: 0.5,
                    engagement_score: 0,
                    status: 'NO_RESPONSE',
                    needs_adjustment: false,
                    needs_removal: true
                });
                continue;
            }

            // Calculate metrics
            const lastResponse = personaResponses[personaResponses.length - 1].response;
            const responseLength = lastResponse.length;
            
            // Deviation detection: check if persona is following its instructions
            const deviationScore = await analyzeDeviation(
                base44,
                persona,
                lastResponse,
                prompt
            );
            
            // Relevance: how relevant is response to the prompt
            const relevanceScore = await analyzeRelevance(
                base44,
                lastResponse,
                prompt,
                debate_history
            );
            
            // Engagement: response length and contribution quality
            const engagementScore = Math.min(1.0, responseLength / 500);
            
            const needsAdjustment = deviationScore > 0.4 || relevanceScore < 0.5;
            const needsRemoval = deviationScore > 0.7 || (relevanceScore < 0.3 && current_round > 1);
            
            performanceScores.push({
                persona: persona.name,
                handle: persona.handle,
                deviation_score: deviationScore,
                relevance_score: relevanceScore,
                engagement_score: engagementScore,
                status: needsRemoval ? 'FAILING' : needsAdjustment ? 'DRIFTING' : 'OPTIMAL',
                needs_adjustment: needsAdjustment && !needsRemoval,
                needs_removal: needsRemoval
            });
        }

        log('SUCCESS', 'Performance analysis completed', { 
            failing: performanceScores.filter(p => p.status === 'FAILING').length,
            drifting: performanceScores.filter(p => p.status === 'DRIFTING').length,
            optimal: performanceScores.filter(p => p.status === 'OPTIMAL').length
        });

        // STEP 2: GENERATE ADJUSTMENTS
        const adjustments = [];
        
        for (const score of performanceScores) {
            if (score.needs_removal) {
                adjustments.push({
                    type: 'REMOVE',
                    persona: score.persona,
                    handle: score.handle,
                    reason: `Underperforming: deviation=${score.deviation_score.toFixed(2)}, relevance=${score.relevance_score.toFixed(2)}`
                });
            } else if (score.needs_adjustment) {
                const originalPersona = current_personas.find(p => p.name === score.persona);
                const adjustedInstructions = await generateAdjustedInstructions(
                    base44,
                    originalPersona,
                    debate_history,
                    score
                );
                
                adjustments.push({
                    type: 'ADJUST',
                    persona: score.persona,
                    handle: score.handle,
                    adjusted_instructions: adjustedInstructions,
                    reason: `Drifting from role: deviation=${score.deviation_score.toFixed(2)}`
                });
            }
        }

        // STEP 3: DETECT GAPS & SUGGEST NEW PERSONAS
        const gaps = await detectGaps(
            base44,
            debate_history,
            prompt,
            current_personas,
            archetype,
            dominant_hemisphere
        );
        
        for (const gap of gaps) {
            const newPersona = await findReplacementPersona(
                base44,
                gap,
                current_personas,
                agent_name
            );
            
            if (newPersona) {
                adjustments.push({
                    type: 'ADD',
                    persona: newPersona.name,
                    handle: newPersona.handle,
                    reason: `Gap detected: ${gap.description}`,
                    persona_data: newPersona
                });
            }
        }

        log('SUCCESS', `Generated ${adjustments.length} adjustment recommendations`);

        return Response.json({
            success: true,
            performance_scores: performanceScores,
            adjustments,
            summary: {
                total_personas: current_personas.length,
                failing: adjustments.filter(a => a.type === 'REMOVE').length,
                adjusting: adjustments.filter(a => a.type === 'ADJUST').length,
                adding: adjustments.filter(a => a.type === 'ADD').length
            },
            logs
        });

    } catch (error) {
        log('ERROR', `Fatal error: ${error.message}`, { stack: error.stack });
        return Response.json({
            success: false,
            error: error.message,
            logs
        }, { status: 500 });
    }
});

// ============= HELPER FUNCTIONS =============

async function analyzeDeviation(base44, persona, response, prompt) {
    try {
        const instructions = persona.instructions_for_system || persona.default_instructions || '';
        
        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: `Analyze if this response follows the persona's intended role and instructions.

**Persona Instructions:**
${instructions}

**Persona Domain:** ${persona.domain}

**Response:**
${response.substring(0, 1000)}

**Original Prompt:**
${prompt.substring(0, 500)}

Rate the deviation from 0.0 (perfect adherence) to 1.0 (completely off-role).
Consider: domain expertise, instruction following, role consistency.

Respond with ONLY a number between 0.0 and 1.0.`,
            temperature: 0.3
        });

        const score = parseFloat(analysis.trim());
        return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (error) {
        console.error('Deviation analysis failed:', error);
        return 0.5;
    }
}

async function analyzeRelevance(base44, response, prompt, debateHistory) {
    try {
        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: `Rate the relevance of this response to the original question and debate context.

**Original Prompt:**
${prompt.substring(0, 500)}

**Recent Debate Context:**
${debateHistory.slice(-3).map(h => `[${h.persona}]: ${h.response.substring(0, 200)}`).join('\n')}

**Response to Evaluate:**
${response.substring(0, 1000)}

Rate from 0.0 (completely irrelevant) to 1.0 (highly relevant and on-topic).

Respond with ONLY a number between 0.0 and 1.0.`,
            temperature: 0.3
        });

        const score = parseFloat(analysis.trim());
        return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (error) {
        console.error('Relevance analysis failed:', error);
        return 0.5;
    }
}

async function generateAdjustedInstructions(base44, persona, debateHistory, performanceScore) {
    try {
        const personaResponses = debateHistory
            .filter(h => h.persona === persona.name)
            .map(h => h.response.substring(0, 300))
            .join('\n---\n');

        const adjusted = await base44.integrations.Core.InvokeLLM({
            prompt: `You are adjusting instructions for a persona that has drifted from its intended role.

**Original Persona:** ${persona.name} (${persona.domain})
**Original Instructions:**
${persona.instructions_for_system || persona.default_instructions}

**Performance Issues:**
- Deviation Score: ${performanceScore.deviation_score.toFixed(2)}
- Relevance Score: ${performanceScore.relevance_score.toFixed(2)}

**Recent Responses (showing drift):**
${personaResponses}

Generate CORRECTIVE instructions that:
1. Reinforce the persona's core domain and expertise
2. Redirect focus to the original role
3. Add explicit constraints to prevent further drift
4. Are concise (max 200 words)

Output ONLY the adjusted instructions, no preamble.`,
            temperature: 0.7
        });

        return adjusted.trim();
    } catch (error) {
        console.error('Instruction adjustment failed:', error);
        return persona.instructions_for_system || persona.default_instructions;
    }
}

async function detectGaps(base44, debateHistory, prompt, currentPersonas, archetype, hemisphere) {
    try {
        const currentDomains = currentPersonas.map(p => p.domain).join(', ');
        const recentDebate = debateHistory.slice(-5).map(h => 
            `[${h.persona}]: ${h.response.substring(0, 200)}`
        ).join('\n');

        const gapAnalysis = await base44.integrations.Core.InvokeLLM({
            prompt: `Analyze if there are critical perspective gaps in this debate.

**Original Question:**
${prompt.substring(0, 500)}

**Current Personas & Domains:**
${currentDomains}

**Recent Debate:**
${recentDebate}

**Context:** Archetype=${archetype}, Hemisphere=${hemisphere}

Identify up to 2 critical gaps (missing perspectives, expertise areas, or viewpoints needed).
Format as JSON array: [{"type": "domain|perspective|counter", "description": "...", "priority": 1-10}]

If no gaps, return: []`,
            temperature: 0.7,
            response_json_schema: {
                type: "object",
                properties: {
                    gaps: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                type: { type: "string" },
                                description: { type: "string" },
                                priority: { type: "number" }
                            }
                        }
                    }
                }
            }
        });

        return gapAnalysis.gaps || [];
    } catch (error) {
        console.error('Gap detection failed:', error);
        return [];
    }
}

async function findReplacementPersona(base44, gap, currentPersonas, agentName) {
    try {
        const currentHandles = currentPersonas.map(p => p.handle);
        
        const allPersonas = await base44.asServiceRole.entities.Persona.filter({
            status: 'Active',
            system: agentName === 'suno_prompt_architect' ? 'Suno' : 'SMAS'
        });

        // Filter out currently active personas
        const availablePersonas = allPersonas.filter(p => !currentHandles.includes(p.handle));

        if (availablePersonas.length === 0) return null;

        // Score each available persona for the gap
        const scored = availablePersonas.map(p => {
            const domainMatch = p.domain.toLowerCase().includes(gap.description.toLowerCase()) ? 0.5 : 0;
            const expertiseMatch = p.capabilities?.toLowerCase().includes(gap.description.toLowerCase()) ? 0.3 : 0;
            const priorityBonus = (p.priority_level || 5) / 20;
            
            return {
                persona: p,
                score: domainMatch + expertiseMatch + priorityBonus
            };
        });

        scored.sort((a, b) => b.score - a.score);
        
        return scored[0]?.score > 0.3 ? scored[0].persona : null;
    } catch (error) {
        console.error('Replacement persona search failed:', error);
        return null;
    }
}