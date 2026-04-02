
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * ENSEMBLE PREDICTION ENGINE - Méthodes d'Ensemble pour Prédiction Robuste
 * Combine plusieurs modèles (statistiques, série temporelle, pattern matching)
 */

Deno.serve(async (req) => {
    const logs = [];
    const addLog = (msg) => {
        logs.push(`[${Date.now()}] ${msg}`);
        console.log(`[EnsembleEngine] ${msg}`);
    };

    try {
        addLog('=== ENSEMBLE PREDICTION ENGINE START ===');
        
        const base44 = createClientFromRequest(req);

        const { 
            metric_name,
            lookback_window = 100,
            prediction_horizon = 24,
            ensemble_methods = ['statistical', 'exponential_smoothing', 'pattern_matching', 'autoregressive'],
            dynamic_threshold_adjustment = true,
            enable_proactive_alerts = true
        } = await req.json();

        const ensembleResults = {
            metric_name,
            timestamp: new Date().toISOString(),
            individual_predictions: [],
            ensemble_prediction: null,
            confidence_score: 0,
            method_weights: {},
            correlation_analysis: {},
            dynamic_thresholds: {}
        };

        // 1. CHARGER LES DONNÉES HISTORIQUES
        addLog(`Loading historical data for ${metric_name}...`);
        let timeSeriesData = [];
        
        try {
            if (metric_name === 'spg') {
                const benchmarks = await base44.asServiceRole.entities.BenchmarkResult.list('-created_date', lookback_window);
                timeSeriesData = benchmarks
                    .filter(b => b.global_score_performance !== null && b.global_score_performance !== undefined)
                    .map(b => ({
                        timestamp: new Date(b.created_date).getTime(),
                        value: b.global_score_performance,
                        metadata: { benchmark_id: b.id }
                    }))
                    .sort((a, b) => a.timestamp - b.timestamp);
            } else if (metric_name === 'token_usage') {
                const usage = await base44.asServiceRole.entities.ResourceUsage.list('-created_date', lookback_window);
                timeSeriesData = usage
                    .filter(u => u.tokens_used_estimated)
                    .map(u => ({
                        timestamp: new Date(u.created_date).getTime(),
                        value: u.tokens_used_estimated,
                        metadata: { operation_type: u.operation_type }
                    }))
                    .sort((a, b) => a.timestamp - b.timestamp);
            }

            addLog(`Loaded ${timeSeriesData.length} data points`);
        } catch (error) {
            addLog(`ERROR loading data: ${error.message}`);
            return Response.json({
                success: false,
                error: `Failed to load time series data: ${error.message}`
            }, { status: 500 });
        }

        if (timeSeriesData.length < 20) {
            return Response.json({
                success: false,
                error: 'Insufficient data for ensemble prediction (need at least 20 points)'
            });
        }

        const values = timeSeriesData.map(d => d.value);
        const timestamps = timeSeriesData.map(d => d.timestamp);

        // 2. MÉTHODE 1: STATISTICAL LINEAR REGRESSION
        if (ensemble_methods.includes('statistical')) {
            addLog('Running statistical linear regression...');
            const statPrediction = linearRegressionPredict(values, prediction_horizon);
            
            ensembleResults.individual_predictions.push({
                method: 'statistical_linear_regression',
                prediction: statPrediction.prediction,
                confidence: statPrediction.r_squared,
                trend_direction: statPrediction.slope > 0 ? 'increasing' : 'decreasing',
                slope: statPrediction.slope,
                details: `R²=${statPrediction.r_squared.toFixed(3)}`
            });
            addLog(`Statistical: prediction=${statPrediction.prediction.toFixed(4)}, R²=${statPrediction.r_squared.toFixed(3)}`);
        }

        // 3. MÉTHODE 2: EXPONENTIAL SMOOTHING (simule ARIMA)
        if (ensemble_methods.includes('exponential_smoothing')) {
            addLog('Running exponential smoothing...');
            const esPrediction = exponentialSmoothingPredict(values, prediction_horizon);
            
            ensembleResults.individual_predictions.push({
                method: 'exponential_smoothing',
                prediction: esPrediction.prediction,
                confidence: esPrediction.confidence,
                trend_component: esPrediction.trend,
                seasonal_component: esPrediction.seasonal,
                details: `α=${esPrediction.alpha.toFixed(2)}, β=${esPrediction.beta.toFixed(2)}`
            });
            addLog(`Exp Smoothing: prediction=${esPrediction.prediction.toFixed(4)}, confidence=${esPrediction.confidence.toFixed(3)}`);
        }

        // 4. MÉTHODE 3: PATTERN MATCHING (simule LSTM)
        if (ensemble_methods.includes('pattern_matching')) {
            addLog('Running pattern matching...');
            const pmPrediction = patternMatchingPredict(values, prediction_horizon);
            
            ensembleResults.individual_predictions.push({
                method: 'pattern_matching',
                prediction: pmPrediction.prediction,
                confidence: pmPrediction.confidence,
                similar_patterns_found: pmPrediction.matches_found,
                pattern_strength: pmPrediction.pattern_strength,
                details: `Found ${pmPrediction.matches_found} similar patterns`
            });
            addLog(`Pattern Match: prediction=${pmPrediction.prediction.toFixed(4)}, matches=${pmPrediction.matches_found}`);
        }

        // 5. MÉTHODE 4: AUTOREGRESSIVE (AR model)
        if (ensemble_methods.includes('autoregressive')) {
            addLog('Running autoregressive model...');
            const arPrediction = autoregressivePredict(values, prediction_horizon);
            
            ensembleResults.individual_predictions.push({
                method: 'autoregressive',
                prediction: arPrediction.prediction,
                confidence: arPrediction.confidence,
                lag_order: arPrediction.lag_order,
                details: `AR(${arPrediction.lag_order}) model`
            });
            addLog(`Autoregressive: prediction=${arPrediction.prediction.toFixed(4)}, lag=${arPrediction.lag_order}`);
        }

        // 6. CALCULER LES POIDS DYNAMIQUES BASÉS SUR LA CONFIANCE
        addLog('Calculating dynamic ensemble weights...');
        const totalConfidence = ensembleResults.individual_predictions.reduce((sum, p) => sum + p.confidence, 0);
        
        ensembleResults.individual_predictions.forEach(pred => {
            const weight = pred.confidence / totalConfidence;
            ensembleResults.method_weights[pred.method] = weight;
        });

        // 7. PRÉDICTION D'ENSEMBLE (weighted average)
        const ensemblePredictionValue = ensembleResults.individual_predictions.reduce((sum, pred) => {
            const weight = ensembleResults.method_weights[pred.method];
            return sum + (pred.prediction * weight);
        }, 0);

        // Calculer la confiance d'ensemble (variance-weighted)
        const predictionVariance = ensembleResults.individual_predictions.reduce((sum, pred) => {
            const weight = ensembleResults.method_weights[pred.method];
            return sum + weight * Math.pow(pred.prediction - ensemblePredictionValue, 2);
        }, 0);

        const ensembleConfidence = Math.max(0, 1 - Math.sqrt(predictionVariance) / Math.abs(ensemblePredictionValue || 1));

        ensembleResults.ensemble_prediction = {
            value: ensemblePredictionValue,
            confidence: ensembleConfidence,
            variance: predictionVariance,
            std_dev: Math.sqrt(predictionVariance),
            confidence_interval_95: {
                lower: ensemblePredictionValue - 1.96 * Math.sqrt(predictionVariance),
                upper: ensemblePredictionValue + 1.96 * Math.sqrt(predictionVariance)
            }
        };

        addLog(`Ensemble prediction: ${ensemblePredictionValue.toFixed(4)} (confidence: ${ensembleConfidence.toFixed(3)})`);

        // 8. ANALYSE DE CORRÉLATION AVEC ANOMALIES
        addLog('Performing correlation analysis with anomalies...');
        try {
            const anomalies = await base44.asServiceRole.entities.AnomalyDetection.list('-detected_at', 100);
            
            // Corréler les anomalies avec les valeurs de la série temporelle
            const anomalyTimestamps = anomalies.map(a => new Date(a.detected_at).getTime());
            const correlationWindow = 60 * 60 * 1000; // 1 hour window
            
            let correlatedPoints = 0;
            let totalAnomalies = 0;
            
            for (const anomaly of anomalies) {
                const anomalyTime = new Date(anomaly.detected_at).getTime();
                
                // Trouver les points de données proches de cette anomalie
                const nearbyPoints = timeSeriesData.filter(d => 
                    Math.abs(d.timestamp - anomalyTime) < correlationWindow
                );
                
                if (nearbyPoints.length > 0) {
                    correlatedPoints += nearbyPoints.length;
                    totalAnomalies++;
                }
            }

            const correlationStrength = totalAnomalies > 0 ? correlatedPoints / (totalAnomalies * 5) : 0;

            ensembleResults.correlation_analysis = {
                anomalies_found: anomalies.length,
                correlated_anomalies: totalAnomalies,
                correlation_strength: Math.min(correlationStrength, 1.0),
                impact_on_confidence: correlationStrength > 0.5 ? 'high' : correlationStrength > 0.3 ? 'medium' : 'low',
                anomaly_adjusted_confidence: ensembleConfidence * (1 - correlationStrength * 0.3)
            };

            addLog(`Correlation: ${totalAnomalies} anomalies correlated, strength=${correlationStrength.toFixed(3)}`);
        } catch (error) {
            addLog(`Correlation analysis skipped: ${error.message}`);
        }

        // 9. CALCUL DE SEUILS DYNAMIQUES
        const currentValue = values[values.length - 1];
        const percentageChange = ((ensemblePredictionValue - currentValue) / currentValue) * 100;
        
        if (dynamic_threshold_adjustment) {
            addLog('Computing dynamic alert thresholds...');
            
            // Baseline statique
            let criticalThreshold = metric_name === 'spg' ? 0.85 : 0; // Default for spg, 0 for others
            let warningThreshold = metric_name === 'spg' ? 0.90 : 0; // Default for spg, 0 for others

            if (metric_name !== 'spg') { // For token_usage or other metrics
                try {
                    const baselines = await base44.asServiceRole.entities.PerformanceBaseline.filter({
                        metric_name: metric_name,
                        is_active: true
                    });
                    
                    if (baselines.length > 0) {
                        const baseline = baselines[0];
                        criticalThreshold = baseline.threshold_upper || baseline.threshold_lower || 0; // Assuming upper for critical
                        warningThreshold = baseline.percentile_95 || baseline.percentile_5 || criticalThreshold * 0.9; // Assuming 95th percentile for warning
                        addLog(`Found baseline for ${metric_name}: critical=${criticalThreshold}, warning=${warningThreshold}`);
                    } else {
                        addLog(`No active baseline found for ${metric_name}, using default thresholds if any, or 0.`);
                    }
                } catch (error) {
                    addLog(`ERROR fetching baseline for ${metric_name}: ${error.message}`);
                }
            }

            // Adjust thresholds if they are still 0 (no baseline found for non-spg)
            if (criticalThreshold === 0 && warningThreshold === 0) {
                 // Fallback to a percentage of current value if no specific baseline/default
                 criticalThreshold = currentValue * 1.5; // Example: 50% increase from current as critical
                 warningThreshold = currentValue * 1.2;  // Example: 20% increase from current as warning
                 addLog(`Using fallback thresholds based on current value for ${metric_name}: critical=${criticalThreshold}, warning=${warningThreshold}`);
            }

            // Adjustment dynamique basé sur variance et corrélation
            // Variance: Higher std_dev relative to current value suggests more volatility, increasing adjustment
            const varianceFactor = ensembleResults.ensemble_prediction.std_dev / Math.abs(currentValue || 1);
            // Correlation: Stronger correlation with anomalies means more risk, increasing adjustment
            const correlationFactor = ensembleResults.correlation_analysis?.correlation_strength || 0;
            
            // If high variance or high correlation with anomalies = potentially stricter/higher thresholds
            // The adjustment factor will increase the thresholds (e.g., if current values are approaching them)
            // Or make them wider/more conservative if the metric is 'good' (like SPG where higher is better)
            // For metrics where higher is bad (like token_usage), a higher adjustment factor means the threshold moves *up*
            // For metrics where lower is bad (like SPG), a higher adjustment factor means the threshold moves *down* (more strict)
            // Let's assume for now, for simplicity, we adjust 'upwards' or 'outwards' from the safe zone.

            const adjustmentBase = 1 + (varianceFactor * 0.5) + (correlationFactor * 0.2); // Example weights
            const adjustmentFactor = Math.min(Math.max(adjustmentBase, 0.9), 1.5); // Clamp between 0.9 and 1.5

            // Apply adjustment based on metric type
            let adjustedCritical, adjustedWarning;
            if (metric_name === 'spg') { // For SPG, lower value is worse, so adjustment factor makes threshold lower
                adjustedCritical = criticalThreshold / adjustmentFactor;
                adjustedWarning = warningThreshold / adjustmentFactor;
            } else { // For token_usage, higher value is worse, so adjustment factor makes threshold higher
                adjustedCritical = criticalThreshold * adjustmentFactor;
                adjustedWarning = warningThreshold * adjustmentFactor;
            }
            
            ensembleResults.dynamic_thresholds = {
                critical_threshold: criticalThreshold,
                warning_threshold: warningThreshold,
                adjusted_critical: adjustedCritical,
                adjusted_warning: adjustedWarning,
                adjustment_factor: adjustmentFactor,
                reasoning: `Adjusted by ${((adjustmentFactor - 1) * 100).toFixed(1)}% due to variance (${varianceFactor.toFixed(3)}) and correlation (${correlationFactor.toFixed(3)})`
            };

            addLog(`Dynamic thresholds: critical=${ensembleResults.dynamic_thresholds.adjusted_critical.toFixed(3)}, warning=${ensembleResults.dynamic_thresholds.adjusted_warning.toFixed(3)}`);
        }

        // 10. DÉTERMINER SI C'EST UNE PRÉDICTION À RISQUE
        const riskAssessment = {
            current_value: currentValue,
            predicted_value: ensemblePredictionValue,
            percentage_change: percentageChange,
            risk_level: Math.abs(percentageChange) > 20 ? 'high' : 
                        Math.abs(percentageChange) > 10 ? 'medium' : 'low',
            trend_direction: percentageChange > 0 ? 'increasing' : 'decreasing',
            prediction_reliability: ensembleConfidence > 0.7 ? 'high' : 
                                   ensembleConfidence > 0.5 ? 'medium' : 'low',
            dynamic_thresholds: ensembleResults.dynamic_thresholds // Add dynamic thresholds here
        };

        addLog(`Risk assessment: ${riskAssessment.risk_level} (${percentageChange.toFixed(1)}% change)`);

        return Response.json({
            success: true,
            ensemble_results: ensembleResults,
            risk_assessment: riskAssessment,
            recommendation: generateRecommendation(riskAssessment, ensembleResults),
            logs
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`);
        console.error('[EnsembleEngine] Fatal error:', error);
        
        return Response.json({
            success: false,
            error: error.message,
            logs
        }, { status: 500 });
    }
});

// HELPER FUNCTIONS

function linearRegressionPredict(values, horizon) {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    // Handle cases where denominator might be zero (e.g., all x values are same)
    const denominator = (n * sumX2 - sumX * sumX);
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const intercept = (sumY - slope * sumX) / n;
    
    const yMean = sumY / n;
    const ssTotal = values.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = values.reduce((sum, yi, i) => {
        const predicted = slope * x[i] + intercept;
        return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const r_squared = ssTotal !== 0 ? Math.max(0, 1 - (ssResidual / ssTotal)) : 0; // Avoid division by zero
    
    const prediction = slope * (n + horizon - 1) + intercept;
    
    return { prediction, slope, intercept, r_squared };
}

function exponentialSmoothingPredict(values, horizon) {
    // Double Exponential Smoothing (Holt's method)
    const alpha = 0.3; // niveau smoothing
    const beta = 0.1;  // trend smoothing
    
    let level = values[0];
    let trend = 0;
    
    for (let i = 1; i < values.length; i++) {
        const previousLevel = level;
        level = alpha * values[i] + (1 - alpha) * (level + trend);
        trend = beta * (level - previousLevel) + (1 - beta) * trend;
    }
    
    const prediction = level + horizon * trend;
    
    // Calculer confiance basée sur la stabilité du trend
    // Using a smaller window for recent trends to make confidence more reactive
    const trendLookback = Math.min(10, values.length); 
    const recentTrends = [];
    let tempLevel = values[Math.max(0, values.length - trendLookback)];
    let tempTrend = 0;
    
    for (let i = Math.max(1, values.length - trendLookback + 1); i < values.length; i++) {
        const prevLevel = tempLevel;
        tempLevel = alpha * values[i] + (1 - alpha) * (tempLevel + tempTrend);
        tempTrend = beta * (tempLevel - prevLevel) + (1 - beta) * tempTrend;
        recentTrends.push(tempTrend);
    }
    
    const trendVariance = recentTrends.length > 0 ?
        recentTrends.reduce((sum, t) => sum + Math.pow(t - trend, 2), 0) / recentTrends.length : 0;
    
    // Scaling factor for confidence. Adjust if confidence is too low/high in general.
    const confidence = Math.max(0, 1 - Math.sqrt(trendVariance) * 5); // Multiplied by 5, was 10
    
    return {
        prediction,
        confidence,
        trend,
        seasonal: 0, // No seasonal component in simple Holt's
        alpha,
        beta
    };
}

function patternMatchingPredict(values, horizon) {
    // Chercher des patterns similaires dans l'historique
    const windowSize = Math.min(10, Math.floor(values.length / 4));
    
    if (windowSize === 0 || values.length < windowSize + horizon) {
        // Not enough data for pattern matching, return a fallback prediction
        const recentAvg = values.length > 0 ? values.slice(-5).reduce((s, v) => s + v, 0) / Math.min(5, values.length) : 0;
        return {
            prediction: recentAvg,
            confidence: 0.3, // Lower confidence for fallback
            matches_found: 0,
            pattern_strength: 0
        };
    }

    const currentPattern = values.slice(-windowSize);
    
    const matches = [];
    
    for (let i = 0; i < values.length - windowSize - horizon; i++) {
        const candidatePattern = values.slice(i, i + windowSize);
        
        // Calculer similarité (normalized correlation)
        const similarity = calculatePatternSimilarity(currentPattern, candidatePattern);
        
        if (similarity > 0.7) {
            // Pattern similaire trouvé, regarder ce qui s'est passé après
            const futureValue = values[i + windowSize + horizon - 1]; // Value at the prediction horizon from matched pattern
            matches.push({
                similarity,
                future_value: futureValue,
                index: i
            });
        }
    }
    
    if (matches.length === 0) {
        // Pas de match, utiliser la moyenne récente
        const recentAvg = values.slice(-5).reduce((s, v) => s + v, 0) / 5;
        return {
            prediction: recentAvg,
            confidence: 0.5,
            matches_found: 0,
            pattern_strength: 0
        };
    }
    
    // Weighted average basé sur la similarité
    const totalSimilarity = matches.reduce((sum, m) => sum + m.similarity, 0);
    const prediction = matches.reduce((sum, m) => sum + m.future_value * (m.similarity / totalSimilarity), 0);
    
    const avgSimilarity = totalSimilarity / matches.length;
    
    return {
        prediction,
        confidence: avgSimilarity,
        matches_found: matches.length,
        pattern_strength: avgSimilarity
    };
}

function calculatePatternSimilarity(pattern1, pattern2) {
    if (pattern1.length !== pattern2.length || pattern1.length === 0) return 0;
    
    // Normalize patterns
    const mean1 = pattern1.reduce((s, v) => s + v, 0) / pattern1.length;
    const mean2 = pattern2.reduce((s, v) => s + v, 0) / pattern2.length;
    
    const std1 = Math.sqrt(pattern1.reduce((s, v) => s + Math.pow(v - mean1, 2), 0) / pattern1.length);
    const std2 = Math.sqrt(pattern2.reduce((s, v) => s + Math.pow(v - mean2, 2), 0) / pattern2.length);
    
    // If standard deviation is zero for either pattern, it means all values are the same.
    // If both are constant and equal, correlation is 1. If constant but different, or one constant and other not, correlation is undefined/0.
    if (std1 === 0 || std2 === 0) {
        return (std1 === 0 && std2 === 0 && mean1 === mean2) ? 1 : 0;
    }
    
    const norm1 = pattern1.map(v => (v - mean1) / std1);
    const norm2 = pattern2.map(v => (v - mean2) / std2);
    
    // Pearson correlation
    const correlation = norm1.reduce((sum, v, i) => sum + v * norm2[i], 0) / norm1.length;
    
    return Math.max(0, correlation); // Only positive correlations are considered "similar" patterns
}

function autoregressivePredict(values, horizon) {
    // AR model avec ordre automatique
    const maxLag = Math.min(10, Math.floor(values.length / 3));
    if (maxLag < 1) { // Not enough data for AR model
        const recentAvg = values.length > 0 ? values.slice(-5).reduce((s, v) => s + v, 0) / Math.min(5, values.length) : 0;
        return {
            prediction: recentAvg,
            confidence: 0.3, // Lower confidence for fallback
            lag_order: 0
        };
    }

    let bestLag = 1;
    let bestR2 = 0;
    
    for (let lag = 1; lag <= maxLag; lag++) {
        const r2 = calculateARModelR2(values, lag);
        if (r2 > bestR2) {
            bestR2 = r2;
            bestLag = lag;
        }
    }
    
    // Fallback if no good lag found or R2 is very low
    if (bestR2 < 0.1 && maxLag > 0) { // If best R2 is too low, perhaps use a simple average or a very short lag
        bestLag = 1; // Default to lag 1
    } else if (maxLag === 0) { // Should be caught by initial maxLag check, but for safety
        const recentAvg = values.length > 0 ? values.slice(-5).reduce((s, v) => s + v, 0) / Math.min(5, values.length) : 0;
        return { prediction: recentAvg, confidence: 0.3, lag_order: 0 };
    }

    // Calculate coefficients AR
    const coefficients = estimateARCoefficients(values, bestLag);
    
    // Predict next 'horizon' values iteratively
    let currentValues = [...values];
    let predictedValue = 0;
    for (let h = 0; h < horizon; h++) {
        let nextPredictionStep = 0;
        for (let i = 0; i < bestLag; i++) {
            if (currentValues.length - 1 - i >= 0) { // Ensure index is valid
                nextPredictionStep += coefficients[i] * currentValues[currentValues.length - 1 - i];
            }
        }
        currentValues.push(nextPredictionStep); // Add predicted value to series for next step
        predictedValue = nextPredictionStep;
    }
    
    const confidence = Math.min(bestR2, 0.95); // Cap confidence at 0.95
    
    return {
        prediction: predictedValue,
        confidence,
        lag_order: bestLag
    };
}

function calculateARModelR2(values, lag) {
    if (values.length <= lag) return 0;
    
    // X will be [Y_t-1, Y_t-2, ..., Y_t-lag]
    // y will be [Y_t]
    const X = [];
    const y = [];
    
    for (let i = lag; i < values.length; i++) {
        const row = [];
        for (let j = 0; j < lag; j++) {
            row.push(values[i - j - 1]);
        }
        X.push(row);
        y.push(values[i]);
    }
    
    if (X.length === 0 || y.length === 0) return 0;
    
    const yMean = y.reduce((s, v) => s + v, 0) / y.length;
    const ssTotal = y.reduce((s, v) => s + Math.pow(v - yMean, 2), 0);
    
    if (ssTotal === 0) return 0;
    
    const coeffs = estimateARCoefficients(values, lag);
    
    let ssResidual = 0;
    for (let i = 0; i < X.length; i++) {
        let predicted = 0;
        for (let j = 0; j < lag; j++) {
            predicted += coeffs[j] * X[i][j];
        }
        ssResidual += Math.pow(y[i] - predicted, 2);
    }
    
    return Math.max(0, 1 - ssResidual / ssTotal);
}

function estimateARCoefficients(values, lag) {
    // Simplified OLS estimation for AR coefficients (can be improved with true OLS matrix methods)
    // This current implementation is a very basic approximation for each lag term independently.
    // A more robust solution would involve solving a system of linear equations (e.g., Durbin-Watson, Levinson-Durbin algorithm).

    const coeffs = new Array(lag).fill(0);
    
    for (let j = 0; j < lag; j++) {
        let sumXY = 0;
        let sumX2 = 0;
        
        // Sum products for Y_t and Y_t-(j+1)
        for (let i = lag; i < values.length; i++) { // Start from lag to ensure Y_t-j-1 is valid
            const x = values[i - (j + 1)]; // Y_t-j-1
            const y = values[i];             // Y_t
            sumXY += x * y;
            sumX2 += x * x;
        }
        
        // This is a simplified coefficient for each lag, not truly multi-variate OLS
        // For a more accurate AR(p) model, we'd need to solve for all p coefficients simultaneously.
        coeffs[j] = sumX2 > 0 ? sumXY / sumX2 : 0; 
    }

    // Normalizing coefficients to sum to 1 (optional, depends on AR model specifics)
    const sumCoeffs = coeffs.reduce((s, c) => s + c, 0);
    if (sumCoeffs !== 0) {
        // coeffs = coeffs.map(c => c / sumCoeffs); // Uncomment if coefficients should sum to 1
    }
    
    return coeffs;
}

function generateRecommendation(risk, ensemble) {
    const recommendations = [];
    
    if (risk.risk_level === 'high') {
        recommendations.push('⚠️ High risk detected - immediate action recommended');
        if (risk.trend_direction === 'decreasing') {
            recommendations.push('Performance trending downward - consider emergency optimization');
        } else if (risk.trend_direction === 'increasing') { // For metrics like token_usage where increase is bad
            recommendations.push('Resource usage spiking - review and optimize immediately');
        }
    }
    
    if (risk.prediction_reliability === 'low') {
        recommendations.push('⚠️ Low prediction reliability - increase monitoring frequency or collect more data');
    }
    
    if (ensemble.correlation_analysis?.correlation_strength > 0.5) {
        recommendations.push('📊 Strong correlation with anomalies detected - investigate root cause and potential system issues');
    }

    // New recommendation for dynamic thresholds
    if (ensemble.dynamic_thresholds?.adjustment_factor && ensemble.dynamic_thresholds.adjustment_factor > 1.1) { // Adjusted by > 10%
        recommendations.push(`📈 Dynamic thresholds significantly adjusted (+${((ensemble.dynamic_thresholds.adjustment_factor - 1) * 100).toFixed(1)}%) due to increased system volatility or anomaly correlation. Review current system health.`);
    } else if (ensemble.dynamic_thresholds?.adjustment_factor && ensemble.dynamic_thresholds.adjustment_factor < 0.9) { // Adjusted by < -10% (for metrics where lower is better, like SPG threshold moving lower)
        recommendations.push(`📉 Dynamic thresholds significantly tightened (${((ensemble.dynamic_thresholds.adjustment_factor - 1) * 100).toFixed(1)}%) due to increased system stability. Consider adjusting monitoring parameters.`);
    }
    
    if (recommendations.length === 0) {
        recommendations.push('✅ System operating within expected parameters - continue monitoring');
    }
    
    return recommendations;
}
