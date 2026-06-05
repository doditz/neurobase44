import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * DEBATE CHUNKER — token-aware multi-output splitter for SMAS debate transcripts
 * ----------------------------------------------------------------------------
 * PURPOSE
 *   A full SMAS debate (persona drafts + cross-examination + synthesis) can be
 *   longer than a single LLM output window. Rather than truncate mid-thought,
 *   this helper splits the FULL transcript into the FEWEST possible ordered,
 *   self-contained chunks.
 *
 *   CORE RULE (per product spec): MAXIMIZE tokens per output → MINIMIZE the
 *   number of outputs. We GREEDILY pack as many rounds/turns as fit into each
 *   chunk (budget − 5% headroom). A 5-round debate that fits in 2 outputs MUST
 *   become 2 outputs — NEVER 1 round per output. We only start a new chunk when
 *   the next block would overflow the budget.
 *
 *   Boundaries we never cross:
 *     • Never cut in the middle of a persona's speaking turn.
 *     • Prefer ROUND boundaries for long/verbose multi-domain debates (cleaner
 *       reading); fall back to PERSONA-turn boundaries for smaller debates so a
 *       round that's too big to fit whole can still be packed tightly.
 *
 *   Every NON-FINAL chunk gets a CLEAR, user-facing handoff line on its tail so
 *   a non-technical user knows the debate is paused and how to resume it.
 *
 * INPUT (POST JSON)
 *   {
 *     synthesis:          string,   // final converged answer (kept whole, last)
 *     debate_history:     Array<{ round:int, persona:string, response:string }>,
 *     max_output_tokens?: number,   // available output budget (default 8000)
 *     verbose?:           boolean    // hint: force round-boundary grouping
 *   }
 *
 * OUTPUT
 *   { success, total_chunks, chunks[], handoff_line, cut_strategy, est_tokens_per_chunk[] }
 *
 * EXPERT TIPS / PITFALLS
 *   - Token estimate is heuristic (chars/4) with 5% headroom so we never overflow.
 *   - Synthesis is always LAST and never split → user always ends on the final
 *     position, never a dangling cross-examination.
 *   - Single-fit transcripts get NO handoff line (one clean output).
 *
 * CHANGELOG
 *   v1.2 — Redeploy bump; confirm trivial-case guard uses budget correctly.
 *   v1.1 — Clarified greedy multi-round packing (min output count, not 1/round).
 *   v1.0 — Initial token-aware round/persona boundary splitter.
 */

// Centralized, user-facing resume instruction (kept in sync with continuationIntent).
const HANDOFF_LINE =
    '\n\n---\n⏸️ **This debate is longer than one message.** ' +
    'Say **go**, **continue**, or **k** to see the next part.';

// Conservative token estimator — chars/4, dependency-free.
const estTokens = (str) => Math.ceil((str?.length || 0) / 4);

/** Format one debate turn into its display block. */
function formatTurn(turn) {
    return `**${turn.persona}** _(round ${turn.round})_\n${turn.response}`;
}

/**
 * Greedily pack indivisible blocks into the FEWEST chunks under a token budget.
 * A block is NEVER split — guaranteeing no mid-turn cut. We only open a new
 * chunk when adding the next block would exceed the budget, so multiple
 * rounds/turns share an output whenever they fit (minimum output count).
 * @param {string[]} blocks ordered indivisible text blocks
 * @param {number} budget per-chunk token budget (already includes headroom)
 * @returns {string[]}
 */
function packBlocks(blocks, budget) {
    const chunks = [];
    let current = '';
    for (const block of blocks) {
        if (current && estTokens(current) + estTokens(block) > budget) {
            chunks.push(current.trim());
            current = '';
        }
        current += (current ? '\n\n' : '') + block;
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const {
            synthesis = '',
            debate_history = [],
            max_output_tokens = 8000,
            verbose = false
        } = await req.json();

        // 5% safety headroom so we never overflow the real output window.
        // Floor kept very low (200) so small/explicit budgets are respected and
        // not silently inflated (which would defeat splitting).
        const budget = Math.max(200, Math.floor(max_output_tokens * 0.95));

        // ---- Trivial case: whole thing fits → ONE output, no handoff. ----
        const whole = [
            ...debate_history.map(formatTurn),
            synthesis ? `### Final Synthesis\n${synthesis}` : ''
        ].filter(Boolean).join('\n\n');

        if (estTokens(whole) <= budget || debate_history.length === 0) {
            return Response.json({
                success: true,
                total_chunks: 1,
                chunks: [whole || synthesis],
                handoff_line: '',
                cut_strategy: 'single',
                est_tokens_per_chunk: [estTokens(whole || synthesis)]
            });
        }

        // ---- Build indivisible blocks ----
        // Verbose/long multi-round debates → group each round into ONE block
        // (rounds still get packed together greedily if several fit). If a round
        // is itself too big to fit a single chunk, degrade to per-persona-turn
        // blocks so packing stays tight.
        const rounds = [...new Set(debate_history.map(t => t.round))].sort((a, b) => a - b);
        const useRoundCuts = verbose || rounds.length >= 3;

        let blocks;
        if (useRoundCuts) {
            const roundBlocks = rounds.map(r => {
                const turns = debate_history.filter(t => t.round === r).map(formatTurn).join('\n\n');
                return `## Round ${r}\n${turns}`;
            });
            // If any single round block alone exceeds budget, fall back to per-turn
            // blocks globally (still packed greedily → minimum outputs).
            const anyRoundTooBig = roundBlocks.some(b => estTokens(b) > budget);
            blocks = anyRoundTooBig ? debate_history.map(formatTurn) : roundBlocks;
        } else {
            blocks = debate_history.map(formatTurn);
        }

        // Synthesis is always its own final block, emitted last, never split.
        if (synthesis) blocks.push(`### Final Synthesis\n${synthesis}`);

        const chunks = packBlocks(blocks, budget);

        // ---- Append handoff to the tail of every NON-FINAL chunk ----
        const decorated = chunks.map((c, i) =>
            i < chunks.length - 1 ? c + HANDOFF_LINE : c
        );

        return Response.json({
            success: true,
            total_chunks: decorated.length,
            chunks: decorated,
            handoff_line: HANDOFF_LINE.trim(),
            cut_strategy: useRoundCuts ? 'round' : 'persona',
            est_tokens_per_chunk: decorated.map(estTokens)
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});