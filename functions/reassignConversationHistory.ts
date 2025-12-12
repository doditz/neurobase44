import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let payload = {};
    try {
      payload = await req.json();
    } catch (_) {
      // allow empty body
    }

    const {
      conversation_ids = null,               // optional array of conversation ids to target
      agent_names = ['smas_debater', 'suno_prompt_architect'], // default agent filters
      max_perplexity_per_conversation = 5    // duplicate latest N PerplexitySearch per conversation
    } = payload || {};

    // Service role to read all debates (across users)
    const query = {};
    if (Array.isArray(agent_names) && agent_names.length > 0) {
      query.agent_name = { "$in": agent_names };
    }
    if (Array.isArray(conversation_ids) && conversation_ids.length > 0) {
      query.conversation_id = { "$in": conversation_ids };
    }

    // Fetch debates across all users
    const allDebates = await base44.asServiceRole.entities.Debate.filter(query, '-created_date', 1000);

    let debatesCreated = 0;
    let perplexityCloned = 0;
    const processedConversations = new Set();

    for (const d of allDebates) {
      if (!d?.conversation_id) continue;
      processedConversations.add(d.conversation_id);

      // Check if the current user already has a Debate with this conversation_id
      const existingForUser = await base44.entities.Debate.filter(
        { conversation_id: d.conversation_id },
        '-created_date',
        1
      );
      if (!existingForUser || existingForUser.length === 0) {
        // Create a new Debate owned by current user (created_by auto = current user)
        await base44.entities.Debate.create({
          topic: d.topic || d.title || 'Conversation importée',
          agent_name: d.agent_name || 'smas_debater',
          conversation_id: d.conversation_id,
          status: d.status || 'active',
          parent_conversation_id: d.parent_conversation_id || null,
          continuation_of_id: d.continuation_of_id || null,
          context_summary: d.context_summary || null,
          estimated_token_count: d.estimated_token_count || 0,
          is_continuation: d.is_continuation || false,
          conversation_chain_root_id: d.conversation_chain_root_id || null
        });
        debatesCreated += 1;
      }

      // Duplicate last PerplexitySearch entries for this conversation to current user (optional but helpful)
      const searches = await base44.asServiceRole.entities.PerplexitySearch.filter(
        { conversation_id: d.conversation_id },
        '-created_date',
        max_perplexity_per_conversation
      );

      for (const s of searches) {
        // Check if user already has an identical query+answer for this conversation to avoid duplicates
        const existingSearch = await base44.entities.PerplexitySearch.filter(
          { conversation_id: d.conversation_id, query: s.query },
          '-created_date',
          1
        );
        if (existingSearch && existingSearch.length > 0) {
          continue;
        }

        await base44.entities.PerplexitySearch.create({
          query: s.query,
          answer: s.answer,
          citations: Array.isArray(s.citations) ? s.citations : [],
          model: s.model || null,
          tokens_used: s.tokens_used || 0,
          conversation_id: d.conversation_id,
          metadata: s.metadata || {}
        });
        perplexityCloned += 1;
      }
    }

    return Response.json({
      success: true,
      message: 'Ré-attribution terminée',
      stats: {
        debates_created_for_user: debatesCreated,
        perplexity_entries_cloned: perplexityCloned,
        conversations_processed: processedConversations.size
      }
    });
  } catch (error) {
    console.error('[reassignConversationHistory] Fatal:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});