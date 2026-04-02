import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * MEMORY CONTEXT SUMMARIZER
 * Long-term context summarization with flux_integral calculation
 * Implements ∫(∇Context × Attention) over time
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            conversation_id,
            summarize_threshold = 15,
            create_gc_memory = true,
            consolidate_tier_3 = true,
            enable_deep_analysis = true
        } = await req.json();

        if (!conversation_id) {
            return Response.json({ 
                success: false, 
                error: 'conversation_id required' 
            }, { status: 400 });
        }

        // Load all memories from this conversation
        const conversationMemories = await base44.entities.UserMemory.filter({
            conversation_id
        }, '-created_date');

        if (conversationMemories.length < summarize_threshold) {
            return Response.json({
                success: true,
                action: 'none',
                reason: `Only ${conversationMemories.length} memories (threshold: ${summarize_threshold})`
            });
        }

        // Calculate flux_integral: ∫(∇Context × Attention) dt
        let flux_integral = 0;
        
        for (let i = 1; i < conversationMemories.length; i++) {
            const prev = conversationMemories[i - 1];
            const curr = conversationMemories[i];
            
            // Gradient approximation
            const gradientContext = Math.abs(
                (curr.d2_modulation || 0.5) - (prev.d2_modulation || 0.5)
            );
            
            // Attention (average D2)
            const attention = ((curr.d2_modulation || 0.5) + (prev.d2_modulation || 0.5)) / 2;
            
            // Time delta (simplified to 1 unit per message)
            flux_integral += gradientContext * attention;
        }

        // Normalize flux_integral
        flux_integral = flux_integral / conversationMemories.length;

        // Generate summary using LLM
        const memoryContents = conversationMemories
            .map(m => m.memory_content)
            .join('\n');

        // Enhanced LLM summarization with deep analysis
        const summaryPrompt = enable_deep_analysis ? `You are a cognitive archivist analyzing conversation memory patterns. 

CONVERSATION MEMORIES (${conversationMemories.length} entries):
${memoryContents}

FLUX INTEGRAL: ${flux_integral.toFixed(3)} (context change dynamics)

Provide a comprehensive analysis:

1. **Main Themes** (3-5 core topics)
2. **Key Insights & Patterns** (recurring behaviors, preferences, learnings)
3. **Critical Context** (must-preserve facts, relationships, commitments)
4. **Semantic Keywords** (5-10 words for future retrieval)
5. **Emotional/Behavioral Patterns** (if applicable)
6. **Action Items or Commitments** (if any)

Structure this as a dense, information-rich summary optimized for long-term retrieval.` 
        : `Analyze and summarize this conversation's key learnings and patterns:

${memoryContents}

Provide:
1. Main themes (3-5 bullet points)
2. Key insights or patterns
3. Important context to preserve
4. Suggested memory key for future retrieval

Keep it concise but comprehensive.`;

        const summary = await base44.integrations.Core.InvokeLLM({
            prompt: summaryPrompt
        });

        // Create GC (Genius Central) harmonized memory
        let gcMemory = null;
        
        if (create_gc_memory) {
            const avgD2 = conversationMemories.reduce((sum, m) => sum + (m.d2_modulation || 0.5), 0) / conversationMemories.length;
            
            const leftCount = conversationMemories.filter(m => m.hemisphere === 'left').length;
            const rightCount = conversationMemories.filter(m => m.hemisphere === 'right').length;
            const totalHemi = leftCount + rightCount;
            
            const omega_avg = totalHemi > 0 ? leftCount / totalHemi : 0.5;
            
            gcMemory = await base44.entities.UserMemory.create({
                memory_key: `GC_${conversation_id}_summary`,
                memory_content: summary,
                memory_type: 'context',
                tier_level: 2,
                hemisphere: 'central',
                d2_modulation: avgD2,
                omega_t: omega_avg,
                flux_integral: flux_integral,
                source_database_tier: 'GC',
                compression_type: 'gzip',
                gc_integration_score: 0.9,
                conversation_id,
                context: `Auto-generated summary of ${conversationMemories.length} memories`,
                pruning_protection: flux_integral > 0.5,
                importance_score: flux_integral
            });
        }

        // TIER 3 CONSOLIDATION: Merge old L3/R3 memories
        let consolidatedMemories = [];
        if (consolidate_tier_3) {
            const l3Memories = await base44.entities.UserMemory.filter({
                tier_level: 3,
                hemisphere: 'left'
            }, '-created_date', 20);
            
            const r3Memories = await base44.entities.UserMemory.filter({
                tier_level: 3,
                hemisphere: 'right'
            }, '-created_date', 20);

            if (l3Memories.length > 10 || r3Memories.length > 10) {
                // Consolidate L3
                if (l3Memories.length > 10) {
                    const l3Content = l3Memories.slice(0, 10).map(m => m.memory_content).join('\n\n');
                    const l3Summary = await base44.integrations.Core.InvokeLLM({
                        prompt: `Consolidate these long-term analytical memories into a single coherent knowledge base entry. Preserve all critical facts and patterns:\n\n${l3Content}`
                    });

                    const l3Consolidated = await base44.entities.UserMemory.create({
                        memory_key: `L3_consolidated_${Date.now()}`,
                        memory_content: l3Summary,
                        memory_type: 'context',
                        tier_level: 3,
                        hemisphere: 'left',
                        d2_modulation: 0.9,
                        source_database_tier: 'L3',
                        compression_type: 'lzma',
                        pruning_protection: true,
                        importance_score: 0.95,
                        context: `Consolidated from ${l3Memories.slice(0, 10).length} L3 memories`
                    });

                    consolidatedMemories.push({ tier: 'L3', id: l3Consolidated.id });
                }

                // Consolidate R3
                if (r3Memories.length > 10) {
                    const r3Content = r3Memories.slice(0, 10).map(m => m.memory_content).join('\n\n');
                    const r3Summary = await base44.integrations.Core.InvokeLLM({
                        prompt: `Consolidate these long-term creative/intuitive memories into a single coherent narrative. Preserve emotional patterns and insights:\n\n${r3Content}`
                    });

                    const r3Consolidated = await base44.entities.UserMemory.create({
                        memory_key: `R3_consolidated_${Date.now()}`,
                        memory_content: r3Summary,
                        memory_type: 'context',
                        tier_level: 3,
                        hemisphere: 'right',
                        d2_modulation: 0.9,
                        source_database_tier: 'R3',
                        compression_type: 'lzma',
                        pruning_protection: true,
                        importance_score: 0.95,
                        context: `Consolidated from ${r3Memories.slice(0, 10).length} R3 memories`
                    });

                    consolidatedMemories.push({ tier: 'R3', id: r3Consolidated.id });
                }
            }
        }

        return Response.json({
            success: true,
            summary,
            flux_integral,
            gc_memory_id: gcMemory?.id,
            conversation_memories_summarized: conversationMemories.length,
            average_d2: gcMemory?.d2_modulation,
            omega_avg: gcMemory?.omega_t,
            tier_3_consolidation: {
                performed: consolidate_tier_3,
                consolidated_count: consolidatedMemories.length,
                details: consolidatedMemories
            }
        });

    } catch (error) {
        console.error('[MemoryContextSummarizer] Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});