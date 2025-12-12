import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const b44 = createClientFromRequest(req);
    if (!await b44.auth.me()) return Response.json({err:'unauth'}, {status:401});
    
    const {benchmark_id, feedback_type='auto', user_rating} = await req.json();
    
    const bench = await b44.asServiceRole.entities.BenchmarkResult.get(benchmark_id);
    if (!bench) return Response.json({err:'not_found'}, {status:404});
    
    const spg = bench.global_score_performance || 0;
    const target = 0.90;
    const gap = target - spg;
    
    const feedback = {
      benchmark_id,
      spg_current: spg,
      spg_target: target,
      spg_gap: gap,
      status: spg >= target ? 'optimal' : spg >= 0.75 ? 'good' : 'needs_improvement',
      recommendations: []
    };
    
    if (gap > 0.1) {
      feedback.recommendations.push('Apply TACO_RL for cost reduction');
      feedback.recommendations.push('Enable SemanticCompression');
    }
    
    if (bench.mode_b_time_ms > 5000) {
      feedback.recommendations.push('Apply NanoSurge for latency');
    }
    
    if ((bench.quality_scores?.mode_b_ars_score || 0) < 0.9) {
      feedback.recommendations.push('Apply PromptWizard for quality');
    }
    
    if (user_rating) {
      feedback.user_feedback = {
        rating: user_rating,
        timestamp: new Date().toISOString()
      };
    }
    
    return Response.json(feedback);
    
  } catch(e) {
    return Response.json({err:e.message}, {status:500});
  }
});