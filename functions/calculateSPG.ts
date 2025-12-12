import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * CALCULATE SPG v4 - Enhanced Error Handling + Fallback Configuration
 * Returns detailed error information and creates default config if missing
 */

Deno.serve(async (req) => {
  try {
    const b44 = createClientFromRequest(req);
    const authUser = await b44.auth.me();
    if (!authUser) {
      return Response.json({
        success: false,
        err: 'unauth',
        message: 'Authentication required'
      }, {status: 401});
    }
    
    const body = await req.json();
    const benchmark_result_id = body?.benchmark_result_id;
    
    if (!benchmark_result_id) {
      return Response.json({
        success: false,
        err: 'no_id',
        message: 'benchmark_result_id is required',
        received: body
      }, {status: 400});
    }
    
    console.log(`[CalculateSPG] ========== START ==========`);
    console.log(`[CalculateSPG] Benchmark ID: ${benchmark_result_id}`);
    
    // ENHANCED RETRY LOGIC: 15 attempts with exponential backoff
    let bench = null;
    const maxRetries = 15;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[CalculateSPG] Attempt ${attempt}/${maxRetries}: Fetching benchmark...`);
        bench = await b44.asServiceRole.entities.BenchmarkResult.get(benchmark_result_id);
        
        if (bench) {
          console.log(`[CalculateSPG] ✅ Benchmark found on attempt ${attempt}`);
          console.log(`[CalculateSPG] Scenario: ${bench.scenario_name || 'N/A'}`);
          break;
        }
      } catch (error) {
        const errorMsg = error.message || 'Unknown error';
        console.log(`[CalculateSPG] ❌ Attempt ${attempt}/${maxRetries} failed: ${errorMsg}`);
        
        if (attempt < maxRetries) {
          const delay = Math.min(500 * Math.pow(2, attempt - 1), 30000);
          console.log(`[CalculateSPG] ⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!bench) {
      console.error(`[CalculateSPG] ❌❌❌ FATAL: Benchmark not found after ${maxRetries} retries`);
      return Response.json({
        success: false,
        err: 'not_found',
        message: `Entity BenchmarkResult with ID ${benchmark_result_id} not found after ${maxRetries} retries`,
        suggestion: 'Benchmark may not have been created. Check benchmarkOrchestrator logs.',
        benchmark_id: benchmark_result_id
      }, {status: 404});
    }
    
    // Load SPG configuration with FALLBACK
    console.log(`[CalculateSPG] Loading SPG configuration...`);
    const configs = await b44.asServiceRole.entities.SPGConfiguration.filter({is_active: true});
    let cfg = configs[0];
    
    if (!cfg) {
      console.warn('[CalculateSPG] ⚠️ No active SPG configuration found - creating default...');
      
      // CREATE DEFAULT CONFIGURATION
      try {
        cfg = await b44.asServiceRole.entities.SPGConfiguration.create({
          config_version: 'v1.0.0-default',
          is_active: true,
          quality_metrics: [
            {
              metric_name: 'relevance',
              source_field: 'relevance',
              normalization_method: 'minmax',
              normalization_bounds: {min: 0, max: 1},
              weight: 0.4
            },
            {
              metric_name: 'fidelity',
              source_field: 'fidelity',
              normalization_method: 'minmax',
              normalization_bounds: {min: 0, max: 1},
              weight: 0.3
            },
            {
              metric_name: 'ethics',
              source_field: 'ethics_score',
              normalization_method: 'minmax',
              normalization_bounds: {min: 0, max: 1},
              weight: 0.3
            }
          ],
          efficiency_metrics: [
            {
              metric_name: 'time',
              source_field: 'mode_b_time_ms',
              normalization_method: 'inverse',
              normalization_bounds: {min: 100, max: 60000},
              weight: 0.5,
              invert: true
            },
            {
              metric_name: 'tokens',
              source_field: 'mode_b_token_count',
              normalization_method: 'inverse',
              normalization_bounds: {min: 100, max: 10000},
              weight: 0.5,
              invert: true
            }
          ],
          complexity_metrics: [],
          category_weights: {
            quality: 0.6,
            efficiency: 0.4,
            complexity: 0.0
          },
          spg_formula_description: 'Default SPG formula: (Quality * 0.6) + (Efficiency * 0.4)',
          notes: 'Auto-generated default configuration'
        });
        
        console.log('[CalculateSPG] ✅ Default SPG configuration created');
      } catch (createError) {
        console.error('[CalculateSPG] ❌ Failed to create default config:', createError);
        return Response.json({
          success: false,
          err: 'no_cfg',
          message: 'No active SPG configuration found and failed to create default',
          suggestion: 'Manually create an SPGConfiguration entity with is_active=true',
          details: createError.message
        }, {status: 500});
      }
    }
    
    console.log(`[CalculateSPG] ✅ Configuration loaded: ${cfg.config_version || 'unknown'}`);
    console.log('[CalculateSPG] Calculating scores...');
    
    const normalize = (val, min, max, method='minmax') => {
      if (method === 'minmax') return Math.max(0, Math.min(1, (val - min) / (max - min)));
      if (method === 'inverse') return 1 / (1 + val);
      return val;
    };
    
    // QUALITY METRICS
    const q_scores = [];
    console.log('[CalculateSPG] --- Quality Metrics ---');
    
    const qualityScoresObj = bench.quality_scores || {};
    
    for (const m of (cfg.quality_metrics || [])) {
      const val = qualityScoresObj[m.source_field] || 0;
      const bounds = m.normalization_bounds || {min: 0, max: 1};
      const norm = normalize(val, bounds.min, bounds.max, m.normalization_method);
      q_scores.push(norm * m.weight);
      console.log(`[CalculateSPG]   ${m.metric_name}: ${val.toFixed(3)} -> ${norm.toFixed(3)} (weight: ${m.weight})`);
    }
    
    const q_score = q_scores.length > 0 ? q_scores.reduce((a,b) => a+b, 0) / q_scores.length : 0.5;
    console.log(`[CalculateSPG] Quality Score: ${q_score.toFixed(4)}`);
    
    // EFFICIENCY METRICS
    const e_scores = [];
    console.log('[CalculateSPG] --- Efficiency Metrics ---');
    
    for (const m of (cfg.efficiency_metrics || [])) {
      const val = bench[m.source_field] || 0;
      const bounds = m.normalization_bounds || {min: 100, max: 5000};
      let norm = normalize(val, bounds.min, bounds.max, m.normalization_method);
      if (m.invert) norm = 1 - norm;
      e_scores.push(norm * m.weight);
      console.log(`[CalculateSPG]   ${m.metric_name}: ${val.toFixed(0)} -> ${norm.toFixed(3)} (weight: ${m.weight})`);
    }
    
    const e_score = e_scores.length > 0 ? e_scores.reduce((a,b) => a+b, 0) / e_scores.length : 0.5;
    console.log(`[CalculateSPG] Efficiency Score: ${e_score.toFixed(4)}`);
    
    // COMPLEXITY METRICS
    const c_scores = [];
    console.log('[CalculateSPG] --- Complexity Metrics ---');
    
    for (const m of (cfg.complexity_metrics || [])) {
      const val = bench[m.source_field] || 0;
      const bounds = m.normalization_bounds || {min: 0, max: 1};
      const norm = normalize(val, bounds.min, bounds.max, m.normalization_method);
      c_scores.push(norm * m.weight);
      console.log(`[CalculateSPG]   ${m.metric_name}: ${val.toFixed(3)} -> ${norm.toFixed(3)} (weight: ${m.weight})`);
    }
    
    const c_score = c_scores.length > 0 ? c_scores.reduce((a,b) => a+b, 0) / c_scores.length : 0;
    console.log(`[CalculateSPG] Complexity Score: ${c_score.toFixed(4)}`);
    
    // CALCULATE SPG
    const w = cfg.category_weights;
    const spg = (q_score * w.quality) + (e_score * w.efficiency) + (c_score * w.complexity);
    
    console.log(`[CalculateSPG] === FINAL SPG: ${spg.toFixed(4)} ===`);
    console.log(`[CalculateSPG] Breakdown: Q=${q_score.toFixed(3)} (${w.quality}) + E=${e_score.toFixed(3)} (${w.efficiency}) + C=${c_score.toFixed(3)} (${w.complexity})`);
    
    // Update benchmark with SPG
    try {
      console.log('[CalculateSPG] Updating benchmark with SPG...');
      await b44.asServiceRole.entities.BenchmarkResult.update(benchmark_result_id, {
        global_score_performance: parseFloat(spg.toFixed(4)),
        spg_breakdown: {
          quality: parseFloat(q_score.toFixed(4)), 
          efficiency: parseFloat(e_score.toFixed(4)), 
          complexity: parseFloat(c_score.toFixed(4))
        }
      });
      console.log('[CalculateSPG] ✅ Benchmark updated successfully');
    } catch (updateError) {
      console.error('[CalculateSPG] ⚠️ Failed to update benchmark:', updateError.message);
      // Continue anyway, return the calculated SPG
    }
    
    console.log(`[CalculateSPG] ========== END ==========`);
    
    return Response.json({
      success: true,
      spg: parseFloat(spg.toFixed(4)),
      breakdown: {
        quality: parseFloat(q_score.toFixed(4)), 
        efficiency: parseFloat(e_score.toFixed(4)), 
        complexity: parseFloat(c_score.toFixed(4))
      },
      weights: w,
      benchmark_id: benchmark_result_id,
      config_version: cfg.config_version
    });
    
  } catch(e) {
    console.error('[CalculateSPG] ❌❌❌ FATAL ERROR:', e);
    return Response.json({
      success: false,
      err: e.message,
      stack: e.stack,
      stage: 'spg_calculation',
      details: 'Unexpected error during SPG calculation'
    }, {status: 500});
  }
});