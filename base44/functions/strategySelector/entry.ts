import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const b44 = createClientFromRequest(req);
    if (!await b44.auth.me()) return Response.json({err:'unauth'}, {status:401});
    
    const {current_spg=0.5, iteration=1} = await req.json();
    
    const strats = await b44.asServiceRole.entities.OptimizationStrategy.filter({is_active:true});
    if (!strats.length) return Response.json({err:'no_strats'}, {status:404});
    
    const scored = strats.map(s => {
      let score = s.priority_level;
      const cond = s.activation_conditions || {};
      
      if (cond.spg_below && current_spg < cond.spg_below) score += 3;
      if (cond.iteration_above && iteration > cond.iteration_above) score += 2;
      if (s.cost_impact === 'reduces_cost') score += 2;
      
      return {strategy:s, score};
    });
    
    scored.sort((a,b) => b.score - a.score);
    
    return Response.json({
      selected_strategy: scored[0].strategy,
      score: scored[0].score,
      alternatives: scored.slice(1,3).map(s => s.strategy.strategy_name)
    });
    
  } catch(e) {
    return Response.json({err:e.message}, {status:500});
  }
});