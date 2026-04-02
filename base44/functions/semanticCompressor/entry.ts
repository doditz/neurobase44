import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized', success: false }, { status: 401 });
        }

        // Parse and validate request
        let requestData;
        try {
            requestData = await req.json();
        } catch (parseError) {
            return Response.json({ 
                error: 'Invalid JSON payload', 
                success: false,
                details: parseError.message 
            }, { status: 400 });
        }

        const { prompt, text, lang = 'fr', ratio = 0.4, target_ratio } = requestData;
        
        // Accept either 'prompt' or 'text' parameter
        const inputText = prompt || text;
        const compressionRatio = target_ratio || ratio;
        
        if (!inputText || typeof inputText !== 'string') {
            return Response.json({ 
                error: 'Missing or invalid text/prompt parameter', 
                success: false,
                received: { prompt, text, type: typeof inputText }
            }, { status: 400 });
        }

        if (inputText.length < 50) {
            // Text too short, return as-is
            return Response.json({
                success: true,
                compressed_prompt: inputText,
                original_length: inputText.length,
                compressed_length: inputText.length,
                compression_ratio: 0,
                tokens_saved_estimated: 0,
                reason: 'text_too_short'
            });
        }

        // Stop words multilingues (Base44 instruction optimization v1)
        const stopWords = {
            fr: ['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'est', 'sont', 'dans', 'sur', 'pour', 'avec', 'par', 'ce', 'cette', 'ces', 'qui', 'que', 'dont', 'où'],
            en: ['the', 'a', 'an', 'and', 'is', 'are', 'in', 'on', 'for', 'with', 'by', 'this', 'that', 'these', 'those', 'which', 'who', 'what', 'where'],
            es: ['el', 'la', 'los', 'las', 'de', 'del', 'un', 'una', 'y', 'es', 'son', 'en', 'con', 'por', 'este', 'esta', 'que', 'cual'],
            ar: ['في', 'من', 'إلى', 'على', 'هذا', 'هذه', 'ذلك', 'تلك', 'الذي', 'التي']
        };

        const words = inputText.split(/\s+/);
        const targetLength = Math.ceil(words.length * (1 - compressionRatio));
        
        // Remove stop words
        const langStops = stopWords[lang] || stopWords['en'];
        let filtered = words.filter(w => {
            const clean = w.toLowerCase().replace(/[^\w]/g, '');
            return clean.length > 2 && !langStops.includes(clean);
        });

        // If still too long, keep only most meaningful words
        if (filtered.length > targetLength) {
            // Keep longer words (usually more meaningful)
            filtered.sort((a, b) => b.length - a.length);
            filtered = filtered.slice(0, targetLength);
        }

        const compressed = filtered.join(' ');
        const originalLength = inputText.length;
        const compressedLength = compressed.length;
        const actualRatio = originalLength > 0 ? (1 - (compressedLength / originalLength)) : 0;

        return Response.json({
            success: true,
            compressed_prompt: compressed,
            original_length: originalLength,
            compressed_length: compressedLength,
            compression_ratio: parseFloat(actualRatio.toFixed(3)),
            tokens_saved_estimated: Math.floor((originalLength - compressedLength) / 4),
            config: { lang, target_ratio: compressionRatio }
        });

    } catch (error) {
        console.error('SemanticCompressor error:', error);
        return Response.json({ 
            error: error.message,
            success: false,
            stack: error.stack
        }, { status: 500 });
    }
});