import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * ALERTING SERVICE - Système d'Alertes Automatiques Amélioré
 * Envoie des alertes aux admins lors de problèmes critiques et prédictions à risque
 */

Deno.serve(async (req) => {
    const logs = [];
    const addLog = (msg) => {
        logs.push(`[${Date.now()}] ${msg}`);
        console.log(`[Alerting] ${msg}`);
    };

    try {
        addLog('=== ALERTING SERVICE START ===');
        
        const base44 = createClientFromRequest(req);
        
        const {
            alert_type,
            severity,
            message,
            details,
            affected_resources,
            prediction_data,
            ensemble_data,
            recommended_actions,
            estimated_time_to_breach
        } = await req.json();

        // Récupérer tous les admins
        const users = await base44.asServiceRole.entities.User.list();
        const admins = users.filter(u => u.role === 'admin');

        addLog(`Found ${admins.length} admin(s) to notify`);

        const alertsSent = [];
        const alertsFailed = [];

        for (const admin of admins) {
            try {
                // Préparer le message d'alerte selon le type
                let emailSubject, emailBody;

                if (alert_type === 'prediction_based_alert' || alert_type === 'ensemble_prediction_alert') {
                    // ALERTE PRÉDICTIVE
                    const urgency = estimated_time_to_breach && estimated_time_to_breach < 6 ? '🚨 URGENT' : '⚠️';
                    emailSubject = `${urgency} [${severity.toUpperCase()}] Neuronas Predictive Alert`;
                    
                    emailBody = `
                        <h2>🔮 Alerte Prédictive Neuronas</h2>
                        <div style="background-color: #fee; padding: 15px; border-left: 4px solid #c00; margin: 10px 0;">
                            <strong>Type:</strong> ${alert_type}<br>
                            <strong>Sévérité:</strong> ${severity}<br>
                            <strong>Message:</strong> ${message}
                        </div>
                        
                        ${estimated_time_to_breach ? `
                            <div style="background-color: #ffe; padding: 10px; margin: 10px 0;">
                                <strong>⏰ Temps Estimé avant Problème:</strong> ${Math.round(estimated_time_to_breach)} heures
                            </div>
                        ` : ''}

                        ${prediction_data ? `
                            <h3>📊 Données de Prédiction</h3>
                            <ul>
                                <li><strong>Valeur Actuelle:</strong> ${prediction_data.current_value?.toFixed(4) || 'N/A'}</li>
                                <li><strong>Valeur Prédite:</strong> ${prediction_data.predicted_value?.toFixed(4) || 'N/A'}</li>
                                <li><strong>Changement:</strong> ${prediction_data.percentage_change?.toFixed(1) || 'N/A'}%</li>
                                <li><strong>Confiance:</strong> ${((prediction_data.confidence || 0) * 100).toFixed(0)}%</li>
                                ${prediction_data.threshold ? `<li><strong>Seuil Critique:</strong> ${prediction_data.threshold}</li>` : ''}
                            </ul>
                        ` : ''}

                        ${ensemble_data ? `
                            <h3>🎯 Analyse Ensemble ML</h3>
                            <ul>
                                <li><strong>Méthodes Utilisées:</strong> ${ensemble_data.methods_used?.join(', ') || 'N/A'}</li>
                                <li><strong>Niveau de Risque:</strong> ${ensemble_data.risk_level || 'N/A'}</li>
                                <li><strong>Confiance Ajustée:</strong> ${((ensemble_data.adjusted_confidence || 0) * 100).toFixed(0)}%</li>
                                ${ensemble_data.correlation_strength ? `
                                    <li><strong>Corrélation avec Anomalies:</strong> ${(ensemble_data.correlation_strength * 100).toFixed(0)}%</li>
                                ` : ''}
                            </ul>
                        ` : ''}

                        ${recommended_actions?.length ? `
                            <h3>💡 Actions Recommandées (PRIORITAIRES)</h3>
                            <ol>
                                ${recommended_actions.map(action => `<li><strong>${action}</strong></li>`).join('')}
                            </ol>
                        ` : ''}

                        ${details ? `<p><strong>Détails:</strong> ${details}</p>` : ''}

                        ${affected_resources?.length ? `
                            <p><strong>Ressources Affectées:</strong></p>
                            <ul>
                                ${affected_resources.slice(0, 10).map(r => `<li>${r}</li>`).join('')}
                                ${affected_resources.length > 10 ? `<li>... et ${affected_resources.length - 10} autres</li>` : ''}
                            </ul>
                        ` : ''}

                        <hr style="margin: 20px 0;">
                        <p style="color: #666; font-size: 12px;">
                            <strong>Heure:</strong> ${new Date().toLocaleString('fr-FR')}<br>
                            <strong>Action:</strong> Connectez-vous au <a href="#">RCA & AI Dashboard</a> pour plus de détails et actions préventives.
                        </p>
                    `;
                } else {
                    // ALERTE STANDARD
                    emailSubject = `🚨 [${severity.toUpperCase()}] Neuronas System Alert`;
                    emailBody = `
                        <h2>Alerte Système Neuronas</h2>
                        <p><strong>Type:</strong> ${alert_type}</p>
                        <p><strong>Sévérité:</strong> ${severity}</p>
                        <p><strong>Message:</strong> ${message}</p>
                        ${details ? `<p><strong>Détails:</strong> ${details}</p>` : ''}
                        ${affected_resources?.length ? `
                            <p><strong>Ressources affectées:</strong></p>
                            <ul>
                                ${affected_resources.map(r => `<li>${r}</li>`).join('')}
                            </ul>
                        ` : ''}
                        <p><strong>Heure:</strong> ${new Date().toLocaleString('fr-FR')}</p>
                        <hr>
                        <p><small>Connectez-vous au System Health Dashboard pour plus de détails.</small></p>
                    `;
                }

                // Envoyer l'email
                await base44.integrations.Core.SendEmail({
                    from_name: 'Neuronas Predictive Monitor',
                    to: admin.email,
                    subject: emailSubject,
                    body: emailBody
                });

                alertsSent.push(admin.email);
                addLog(`Alert sent to ${admin.email}`);
            } catch (error) {
                alertsFailed.push({ email: admin.email, error: error.message });
                addLog(`Failed to send alert to ${admin.email}: ${error.message}`);
            }
        }

        addLog(`Alerts sent: ${alertsSent.length}, Failed: ${alertsFailed.length}`);

        return Response.json({
            success: true,
            alerts_sent: alertsSent.length,
            alerts_failed: alertsFailed.length,
            recipients: alertsSent,
            failures: alertsFailed,
            alert_type,
            severity,
            logs
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`);
        console.error('[Alerting] Fatal error:', error);
        
        return Response.json({
            success: false,
            error: error.message,
            logs
        }, { status: 500 });
    }
});