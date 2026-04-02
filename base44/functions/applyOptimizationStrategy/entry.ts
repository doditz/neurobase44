import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const b44 = createClientFromRequest(req);
    if (!await b44.auth.me()) return Response.json({err:'unauth'}, {status:401});
    
    const {strategy_id, current_config={}, exploration_rate=0.15} = await req.json();
    
    const strat = await b44.asServiceRole.entities.OptimizationStrategy.get(strategy_id);
    if (!strat) return Response.json({err:'strat_not_found'}, {status:404});
    
    const params = await b44.asServiceRole.entities.TunableParameter.list();
    const new_cfg = {...current_config};
    const explore = Math.random() < exploration_rate;
    
    for (const pname of (strat.associated_tunable_params || [])) {
      const p = params.find(pr => pr.parameter_name === pname);
      if (!p) continue;
      
      const curr = new_cfg[pname] || p.current_value;
      
      if (explore) {
        new_cfg[pname] = p.min_bound + Math.random() * (p.max_bound - p.min_bound);
      } else {
        const dir = Math.random() > 0.5 ? 1 : -1;
        const delta = p.adjustment_step * dir;
        new_cfg[pname] = Math.max(p.min_bound, Math.min(p.max_bound, curr + delta));
      }
      
      if (!p.is_continuous && p.discrete_values?.length) {
        const closest = p.discrete_values.reduce((prev, curr_val) => 
          Math.abs(curr_val - new_cfg[pname]) < Math.abs(prev - new_cfg[pname]) ? curr_val : prev
        );
        new_cfg[pname] = closest;
      }
    }
    
    const changes = Object.entries(new_cfg).filter(([k,v]) => v !== current_config[k]);
    
    return Response.json({
      new_config: new_cfg,
      changes: changes.map(([k,v]) => ({param:k, old:current_config[k], new:v})),
      strategy_applied: strat.strategy_name,
      exploration_mode: explore
    });
    
  } catch(e) {
    return Response.json({err:e.message}, {status:500});
  }
});