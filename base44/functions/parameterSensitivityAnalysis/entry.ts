import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const b44 = createClientFromRequest(req);
    if (!await b44.auth.me()) return Response.json({err:'unauth'}, {status:401});
    
    const {lookback_days=7} = await req.json();
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - lookback_days);
    
    const params = await b44.asServiceRole.entities.TunableParameter.list();
    const analysis = [];
    
    for (const p of params) {
      const history = p.adjustment_history || [];
      const recent = history.filter(h => new Date(h.timestamp) > cutoff);
      
      if (recent.length < 2) {
        analysis.push({
          parameter: p.parameter_name,
          sensitivity: 'unknown',
          avg_impact: 0,
          recommendation: 'Need more data'
        });
        continue;
      }
      
      const impacts = recent.map(h => Math.abs(h.resulting_spg_change || 0));
      const avg_impact = impacts.reduce((a,b) => a+b, 0) / impacts.length;
      
      const sensitivity = avg_impact > 0.05 ? 'high' : avg_impact > 0.02 ? 'medium' : 'low';
      
      let recommendation = '';
      if (sensitivity === 'high') {
        recommendation = 'Focus optimization here - high impact';
      } else if (sensitivity === 'low') {
        recommendation = 'Low priority - minimal impact';
      } else {
        recommendation = 'Moderate tuning potential';
      }
      
      analysis.push({
        parameter: p.parameter_name,
        sensitivity,
        avg_impact: avg_impact.toFixed(4),
        sample_size: recent.length,
        recommendation
      });
    }
    
    analysis.sort((a,b) => parseFloat(b.avg_impact) - parseFloat(a.avg_impact));
    
    return Response.json({
      analysis,
      lookback_days,
      high_impact_params: analysis.filter(a => a.sensitivity === 'high').map(a => a.parameter)
    });
    
  } catch(e) {
    return Response.json({err:e.message}, {status:500});
  }
});