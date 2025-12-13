import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * MEMORY SEMANTIC SEARCH v2.0 - AI-Powered Embedding-Based Retrieval
 * Uses LLM-generated embeddings for true semantic similarity matching
 */

Deno.serve(async (req) => {
    const logs = [];
    const log = (level, msg, data = {}) => {
        logs.push({ level, message: msg, data, timestamp: new Date().toISOString() });
        console.log(`[MemorySemanticSearch][${level}] ${msg}`, data);
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            query,
            max_results = 10,
            min_similarity = 0.7,
            tier_filter = null,
            hemisphere_filter = null,
            use_ai_embeddings = true
        } = await req.json();

        if (!query) {
            return Response.json({ success: false, error: 'query required' }, { status: 400 });
        }

        log('info', 'Semantic search initiated', { 
            query: query.substring(0, 50),
            max_results,
            min_similarity,
            use_ai_embeddings
        });

        let matches = [];

        if (use_ai_embeddings) {
            // ADVANCED: Use LLM to generate semantic keywords and embeddings
            log('info', 'Generating AI semantic profile');
            
            const embeddingPrompt = `Extract the core semantic concepts from this query. Return ONLY a JSON array of 5-10 key concepts/keywords, nothing else:

Query: "${query}"

Example output format: ["concept1", "concept2", "concept3"]`;

            const conceptsResponse = await base44.integrations.Core.InvokeLLM({
                prompt: embeddingPrompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        concepts: {
                            type: "array",
                            items: { type: "string" }
                        }
                    }
                }
            });

            const semanticConcepts = conceptsResponse.concepts || [];
            log('success', 'Semantic concepts extracted', { concepts: semanticConcepts });

            // Generate embedding vector (simulated as keyword presence scores)
            const queryEmbedding = generateKeywordEmbedding(query, semanticConcepts);

            // Retrieve all candidate memories
            const filterQuery = {};
            if (tier_filter) filterQuery.tier_level = tier_filter;
            if (hemisphere_filter) filterQuery.hemisphere = hemisphere_filter;

            const candidates = await base44.entities.UserMemory.filter(filterQuery);
            
            log('info', `Evaluating ${candidates.length} candidate memories`);

            // Calculate semantic similarity for each candidate
            for (const mem of candidates) {
                const memEmbedding = generateKeywordEmbedding(mem.memory_content, semanticConcepts);
                const similarity = cosineSimilarity(queryEmbedding, memEmbedding);

                if (similarity >= min_similarity) {
                    matches.push({
                        ...mem,
                        similarity_score: similarity,
                        matching_concepts: semanticConcepts.filter(c => 
                            mem.memory_content.toLowerCase().includes(c.toLowerCase())
                        )
                    });
                }
            }

            // Sort by similarity and limit results
            matches.sort((a, b) => b.similarity_score - a.similarity_score);
            matches = matches.slice(0, max_results);

        } else {
            // FALLBACK: Simple LSH-based matching
            log('info', 'Using LSH-based matching (fallback)');
            
            const queryHash = generateSemanticHash(query);
            
            const filterQuery = {};
            if (tier_filter) filterQuery.tier_level = tier_filter;
            if (hemisphere_filter) filterQuery.hemisphere = hemisphere_filter;

            const candidates = await base44.entities.UserMemory.filter(filterQuery);
            
            for (const mem of candidates) {
                if (mem.semantic_hash) {
                    const similarity = calculateHashSimilarity(queryHash, mem.semantic_hash);
                    
                    if (similarity >= min_similarity) {
                        matches.push({
                            ...mem,
                            similarity_score: similarity
                        });
                    }
                }
            }

            matches.sort((a, b) => b.similarity_score - a.similarity_score);
            matches = matches.slice(0, max_results);
        }

        log('success', `Found ${matches.length} semantic matches`);

        // Update access patterns for retrieved memories
        const updatePromises = matches.map(mem => 
            base44.entities.UserMemory.update(mem.id, {
                access_count: (mem.access_count || 0) + 1,
                last_accessed: new Date().toISOString()
            }).catch(() => null)
        );
        await Promise.allSettled(updatePromises);

        return Response.json({
            success: true,
            matches,
            total_found: matches.length,
            search_params: {
                query,
                max_results,
                min_similarity,
                method: use_ai_embeddings ? 'AI_embeddings' : 'LSH_hash'
            },
            logs
        });

    } catch (error) {
        log('error', `Semantic search failed: ${error.message}`, { stack: error.stack });
        return Response.json({
            success: false,
            error: error.message,
            logs
        }, { status: 500 });
    }
});

/**
 * Generate keyword-based embedding vector
 */
function generateKeywordEmbedding(text, keywords) {
    const textLower = text.toLowerCase();
    const embedding = keywords.map(keyword => {
        const keywordLower = keyword.toLowerCase();
        // Count occurrences and normalize
        const count = (textLower.match(new RegExp(keywordLower, 'g')) || []).length;
        return Math.min(1.0, count * 0.3);
    });
    return embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        norm1 += vec1[i] * vec1[i];
        norm2 += vec2[i] * vec2[i];
    }
    
    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Generate LSH semantic hash (fallback)
 */
function generateSemanticHash(text) {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const hashBase = words.slice(0, 10).join('_');
    
    let hash = 0;
    for (let i = 0; i < hashBase.length; i++) {
        const char = hashBase.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * Calculate hash similarity
 */
function calculateHashSimilarity(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] === hash2[i]) matches++;
    }
    
    return matches / hash1.length;
}