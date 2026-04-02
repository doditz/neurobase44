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

        // OPTIMIZATION: Batch create all records first
        console.log(`[Gauntlet] Creating ${questions.length} result records...`);
        const resultRecords = [];
        
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const questionText = typeof question === 'string' ? question : question.question_text;
            const questionId = typeof question === 'string' ? `Q${i+1}` : (question.question_id || `Q${i+1}`);
            
            const record = await base44.asServiceRole.entities.GauntletResult.create({
                run_id: runId,
                question_id: questionId,
                question: questionText,
                status: 'pending',
                d2_config: d2Config
            });
            
            resultRecords.push({ ...record, questionText });
        }
        
        // PHASE 1: THE GAUNTLET (Sequential but optimized)
        console.log(`[Gauntlet] Starting Phase 1: Answering questions`);
        
        for (const record of resultRecords) {
            try {
                const startTime = Date.now();
                
                const response = await Promise.race([
                    base44.integrations.Core.InvokeLLM({
                        prompt: `${systemPrompt}\n\nQuestion: ${record.questionText}\n\nProvide a precise, objective answer:`,
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), 60000)
                    )
                ]);
                
                const timeTaken = Date.now() - startTime;
                
                await base44.asServiceRole.entities.GauntletResult.update(record.id, {
                    model_answer: response,
                    time_taken_ms: timeTaken,
                    status: 'answered'
                });
                
                record.model_answer = response;
                record.time_taken_ms = timeTaken;
                record.status = 'answered';
                
                console.log(`[Gauntlet] ${record.question_id}: ${timeTaken}ms`);
                
            } catch (error) {
                console.error(`[Gauntlet] Error ${record.question_id}:`, error.message);
                
                await base44.asServiceRole.entities.GauntletResult.update(record.id, {
                    status: error.message.includes('Timeout') ? 'timeout' : 'error',
                    error_message: error.message
                });
                
                record.status = 'error';
                record.error_message = error.message;
            }
        }
        
        // PHASE 2: THE JUDGMENT (Sequential)
        console.log(`[Gauntlet] Starting Phase 2: Judgment`);
        
        for (const record of resultRecords) {
            if (record.status !== 'answered') continue;
            
            try {
                const judgeResponse = await base44.integrations.Core.InvokeLLM({
                    prompt: `You are an objective judge evaluating AI responses.

Question: ${record.questionText}

Answer: ${record.model_answer}

Rate this answer on a scale of 1-10 based on:
- Accuracy: Is it factually correct?
- Logic: Is the reasoning sound?
- Conciseness: Is it clear and to the point?

Provide your response in this exact format:
Score: [number 1-10]
Reasoning: [brief explanation]`
                });
                
                const scoreMatch = judgeResponse.match(/Score:\s*(\d+)/i);
                const reasoningMatch = judgeResponse.match(/Reasoning:\s*(.+)/is);
                
                const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
                const reasoning = reasoningMatch ? reasoningMatch[1].trim() : judgeResponse;
                
                await base44.asServiceRole.entities.GauntletResult.update(record.id, {
                    judge_score: score,
                    judge_reasoning: reasoning,
                    status: 'judged'
                });
                
                record.judge_score = score;
                record.judge_reasoning = reasoning;
                record.status = 'judged';
                
                console.log(`[Gauntlet] ${record.question_id}: ${score}/10`);
                
            } catch (error) {
                console.error(`[Gauntlet] Judge error ${record.question_id}:`, error.message);
                
                await base44.asServiceRole.entities.GauntletResult.update(record.id, {
                    error_message: `Judge failed: ${error.message}`
                });
            }
        }
        
        // Calculate summary from in-memory records (avoid extra query)
        const judgedResults = resultRecords.filter(r => r.judge_score);
        const timedResults = resultRecords.filter(r => r.time_taken_ms);
        
        const summary = {
            total_questions: questions.length,
            answered: resultRecords.filter(r => r.status === 'answered' || r.status === 'judged').length,
            judged: resultRecords.filter(r => r.status === 'judged').length,
            timeouts: resultRecords.filter(r => r.status === 'timeout').length,
            errors: resultRecords.filter(r => r.status === 'error').length,
            average_score: judgedResults.length > 0 
                ? judgedResults.reduce((sum, r) => sum + r.judge_score, 0) / judgedResults.length 
                : 0,
            average_time_ms: timedResults.length > 0
                ? timedResults.reduce((sum, r) => sum + r.time_taken_ms, 0) / timedResults.length
                : 0
        };
        
        console.log(`[Gauntlet] COMPLETE:`, summary);
        
        return Response.json({
            success: true,
            run_id: runId,
            summary,
            results: resultRecords
        });
        
    } catch (error) {
        console.error('[Gauntlet] Fatal error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});