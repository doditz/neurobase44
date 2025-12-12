import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const b44 = createClientFromRequest(req);
    if (!await b44.auth.me()) return Response.json({err:'unauth'}, {status:401});
    
    const {benchmark_id, adjustment_strategy='gradient_ascent', learning_rate=0.1} = await req.json();
    
    const bench = await b44.asServiceRole.entities.BenchmarkResult.get(benchmark_id);
    if (!bench) return Response.json({err:'not_found'}, {status:404});
    
    const params = await b44.asServiceRole.entities.TunableParameter.list();
    const spg = bench.global_score_performance || 0;
    
    const adjustments = [];
    
    for (const p of params) {
      let new_val = p.current_value;
      
      if (adjustment_strategy === 'gradient_ascent') {
        const grad = (1 - spg) * learning_rate;
        const dir = p.impact_on_quality === 'high' ? 1 : -1;
        new_val = p.current_value + (grad * p.adjustment_step * dir);
      } else if (adjustment_strategy === 'random_search') {
        new_val = p.min_bound + Math.random() * (p.max_bound - p.min_bound);
      }
      
      new_val = Math.max(p.min_bound, Math.min(p.max_bound, new_val));
      
      if (!p.is_continuous && p.discrete_values?.length) {
        new_val = p.discrete_values.reduce((prev, curr) => 
          Math.abs(curr - new_val) < Math.abs(prev - new_val) ? curr : prev
        );
      }
      
      if (new_val !== p.current_value && !p.is_locked) {
        await b44.asServiceRole.entities.TunableParameter.update(p.id, {
          current_value: new_val,
          last_adjusted: new Date().toISOString(),
          adjustment_history: [...(p.adjustment_history || []), {
            timestamp: new Date().toISOString(),
            old_value: p.current_value,
            new_value: new_val,
            reason: `SelfTune_${adjustment_strategy}`,
            resulting_spg_change: 0
          }]
        });
        
        adjustments.push({param:p.parameter_name, old:p.current_value, new:new_val});
      }
    }
    
    return Response.json({
      adjustments,
      strategy: adjustment_strategy,
      learning_rate,
      current_spg: spg
    });
    
  } catch(e) {
    return Response.json({err:e.message}, {status:500});
  }
});