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
            create_gc_memory = true
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

        const summaryPrompt = `Analyze and summarize this conversation's key learnings and patterns:

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

        return Response.json({
            success: true,
            summary,
            flux_integral,
            gc_memory_id: gcMemory?.id,
            conversation_memories_summarized: conversationMemories.length,
            average_d2: gcMemory?.d2_modulation,
            omega_avg: gcMemory?.omega_t
        });

    } catch (error) {
        console.error('[MemoryContextSummarizer] Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});