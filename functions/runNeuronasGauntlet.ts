import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { questions, run_id } = await req.json();
        
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return Response.json({ 
                error: 'questions array is required and must not be empty' 
            }, { status: 400 });
        }

        const runId = run_id || `gauntlet_${Date.now()}`;
        const d2Config = { d2_stim: 0.2, d2_pin: 0.9 };
        
        const systemPrompt = `You are a precise, objective answering engine. Answer concisely and accurately.
D2 Configuration: Low Excitement (d2_stim=0.2), High Precision (d2_pin=0.9).
Focus on logical reasoning and factual accuracy.`;

        const results = [];
        
        // PHASE 1: THE GAUNTLET (Sequential Execution)
        console.log(`[Gauntlet] Starting Phase 1 for ${questions.length} questions`);
        
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const questionText = typeof question === 'string' ? question : question.question_text;
            const questionId = typeof question === 'string' ? `Q${i+1}` : question.question_id;
            
            console.log(`[Gauntlet] Processing question ${i+1}/${questions.length}: ${questionId}`);
            
            // Create initial result record
            const resultRecord = await base44.asServiceRole.entities.GauntletResult.create({
                run_id: runId,
                question_id: questionId,
                question: questionText,
                status: 'pending',
                d2_config: d2Config
            });
            
            try {
                // Call InvokeLLM with timeout handling
                const startTime = Date.now();
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
                
                const response = await Promise.race([
                    base44.integrations.Core.InvokeLLM({
                        prompt: `${systemPrompt}\n\nQuestion: ${questionText}\n\nProvide a precise, objective answer:`,
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), 60000)
                    )
                ]);
                
                clearTimeout(timeoutId);
                const timeTaken = Date.now() - startTime;
                
                // Update with answer
                await base44.asServiceRole.entities.GauntletResult.update(resultRecord.id, {
                    model_answer: response,
                    time_taken_ms: timeTaken,
                    status: 'answered'
                });
                
                results.push({ ...resultRecord, model_answer: response, time_taken_ms: timeTaken });
                console.log(`[Gauntlet] Question ${questionId} answered in ${timeTaken}ms`);
                
            } catch (error) {
                console.error(`[Gauntlet] Error on question ${questionId}:`, error.message);
                
                await base44.asServiceRole.entities.GauntletResult.update(resultRecord.id, {
                    status: error.message.includes('Timeout') ? 'timeout' : 'error',
                    error_message: error.message
                });
                
                results.push({ ...resultRecord, status: 'error', error_message: error.message });
            }
        }
        
        // PHASE 2: THE JUDGMENT
        console.log(`[Gauntlet] Starting Phase 2: Judgment`);
        
        for (const result of results) {
            if (result.status !== 'answered') {
                console.log(`[Gauntlet] Skipping judgment for ${result.question_id} (status: ${result.status})`);
                continue;
            }
            
            try {
                const judgePrompt = `You are an objective judge evaluating AI responses.

Question: ${result.question}

Answer: ${result.model_answer}

Rate this answer on a scale of 1-10 based on:
- Accuracy: Is it factually correct?
- Logic: Is the reasoning sound?
- Conciseness: Is it clear and to the point?

Provide your response in this exact format:
Score: [number 1-10]
Reasoning: [brief explanation]`;

                const judgeResponse = await base44.integrations.Core.InvokeLLM({
                    prompt: judgePrompt
                });
                
                // Parse score and reasoning
                const scoreMatch = judgeResponse.match(/Score:\s*(\d+)/i);
                const reasoningMatch = judgeResponse.match(/Reasoning:\s*(.+)/is);
                
                const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
                const reasoning = reasoningMatch ? reasoningMatch[1].trim() : judgeResponse;
                
                await base44.asServiceRole.entities.GauntletResult.update(result.id, {
                    judge_score: score,
                    judge_reasoning: reasoning,
                    status: 'judged'
                });
                
                console.log(`[Gauntlet] Judged ${result.question_id}: Score ${score}/10`);
                
            } catch (error) {
                console.error(`[Gauntlet] Judgment error for ${result.question_id}:`, error.message);
                
                await base44.asServiceRole.entities.GauntletResult.update(result.id, {
                    error_message: `Judgment failed: ${error.message}`
                });
            }
        }
        
        // Final summary
        const finalResults = await base44.asServiceRole.entities.GauntletResult.filter({
            run_id: runId
        });
        
        const summary = {
            total_questions: questions.length,
            answered: finalResults.filter(r => r.status === 'answered' || r.status === 'judged').length,
            judged: finalResults.filter(r => r.status === 'judged').length,
            timeouts: finalResults.filter(r => r.status === 'timeout').length,
            errors: finalResults.filter(r => r.status === 'error').length,
            average_score: finalResults
                .filter(r => r.judge_score)
                .reduce((sum, r) => sum + r.judge_score, 0) / 
                finalResults.filter(r => r.judge_score).length || 0,
            average_time_ms: finalResults
                .filter(r => r.time_taken_ms)
                .reduce((sum, r) => sum + r.time_taken_ms, 0) / 
                finalResults.filter(r => r.time_taken_ms).length || 0
        };
        
        console.log(`[Gauntlet] COMPLETE. Summary:`, summary);
        
        return Response.json({
            success: true,
            run_id: runId,
            summary,
            results: finalResults
        });
        
    } catch (error) {
        console.error('[Gauntlet] Fatal error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});