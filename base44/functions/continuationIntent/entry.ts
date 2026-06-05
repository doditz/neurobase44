import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * CONTINUATION INTENT CLASSIFIER
 * ----------------------------------------------------------------------------
 * PURPOSE
 *   When a multi-output SMAS debate is paused (see `debateChunker`), the user's
 *   next reply must be interpreted as either:
 *     - CONTINUE      → resume the paused debate (emit the next chunk), OR
 *     - STOP_AND_ASK  → the user clearly asked something NEW; do not resume.
 *
 *   Per product spec:
 *     • Any synonym of continuation ("go", "k", "next", "more", …) OR a
 *       meaningless smash-key ("sdkghjsd;gj") OR anything that is NOT a clear,
 *       intentional query → CONTINUE (the default).
 *     • Only a CLEAR new query flips to STOP_AND_ASK.
 *     • AMBIGUITY → STOP_AND_ASK ("stop & ask" protocol) to PREVENT a
 *       hallucinated continuation before it happens.
 *
 * DESIGN: deterministic, dependency-free (no LLM call → instant, zero cost).
 *
 * INPUT (POST JSON)  { reply: string }
 * OUTPUT { success, intent: 'continue'|'stop_and_ask', confidence:0..1, reason }
 *
 * CHANGELOG
 *   v1.0 — Initial deterministic continue / stop-and-ask classifier.
 */

// Broad continuation lexicon (EN + FR), single tokens / short phrases.
const CONTINUE_WORDS = new Set([
    'go', 'k', 'ok', 'okay', 'continue', 'cont', 'next', 'more', 'yes', 'y',
    'yep', 'yeah', 'sure', 'proceed', 'resume', 'keep going', 'keepgoing',
    'go on', 'goon', 'rest', 'finish', 'complete', 'carry on',
    'continuer', 'suite', 'la suite', 'oui', 'encore', 'plus'
]);

// Interrogatives / command verbs that signal a genuine NEW query (EN + FR).
const QUESTION_WORDS = /\b(what|why|how|when|where|who|which|can you|could you|explain|tell me|give me|write|make|create|build|fix|change|add|remove|compare|analyze|summari[sz]e|quoi|pourquoi|comment|quand|où|qui|quel|explique|résume|compare|analyse)\b/i;

/**
 * Classify a paused-debate reply.
 * @param {string} raw user reply
 * @returns {{intent:string, confidence:number, reason:string}}
 */
function classify(raw) {
    const text = (raw || '').trim();
    const lower = text.toLowerCase();

    // Empty → default continue.
    if (!text) return { intent: 'continue', confidence: 0.9, reason: 'empty reply → default continue' };

    // 1) Explicit continuation token / short phrase.
    if (CONTINUE_WORDS.has(lower) || (lower.split(/\s+/).length <= 2 &&
        [...CONTINUE_WORDS].some(w => lower === w || lower.startsWith(w + ' ')))) {
        return { intent: 'continue', confidence: 0.98, reason: 'explicit continuation word' };
    }

    // 2) Clear new query → stop & ask (question mark or interrogative/command).
    if (text.includes('?') || QUESTION_WORDS.test(lower)) {
        return { intent: 'stop_and_ask', confidence: 0.9, reason: 'clear new query detected' };
    }

    // 3) Smash-key / non-lexical noise → continue ("just proceed").
    const noSpace = lower.replace(/\s+/g, '');
    const vowelRatio = (noSpace.match(/[aeiouy]/g) || []).length / Math.max(1, noSpace.length);
    const looksLikeSmash = noSpace.length <= 16 && (vowelRatio < 0.2 || !/^[a-z0-9'’\-\s]+$/i.test(text));
    if (looksLikeSmash) {
        return { intent: 'continue', confidence: 0.75, reason: 'non-lexical smash-key → treated as continue' };
    }

    // 4) Short + vague (no clear query) → continue. Longer + vague → stop & ask.
    if (lower.split(/\s+/).length <= 3) {
        return { intent: 'continue', confidence: 0.6, reason: 'short vague reply → default continue' };
    }

    return { intent: 'stop_and_ask', confidence: 0.55, reason: 'ambiguous → stop & ask protocol' };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { reply = '' } = await req.json();
        return Response.json({ success: true, ...classify(reply) });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});