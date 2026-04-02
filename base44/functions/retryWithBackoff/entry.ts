import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * RETRY WITH BACKOFF - Utilitaire pour les opérations avec retry intelligent
 */

export async function retryWithBackoff(operation, options = {}) {
    const {
        maxRetries = 5,
        initialDelay = 1000,
        maxDelay = 30000,
        backoffMultiplier = 2,
        onRetry = null,
        shouldRetry = null
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await operation();
            return { success: true, result, attempts: attempt + 1 };
        } catch (error) {
            lastError = error;
            
            if (shouldRetry && !shouldRetry(error, attempt)) {
                throw error;
            }

            if (attempt < maxRetries) {
                if (onRetry) {
                    onRetry(error, attempt + 1, delay);
                }

                await new Promise(resolve => setTimeout(resolve, delay));
                delay = Math.min(delay * backoffMultiplier, maxDelay);
            }
        }
    }

    throw new Error(`Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`);
}

export async function getEntityWithRetry(base44, entityName, id, options = {}) {
    const retryResult = await retryWithBackoff(
        async () => {
            const entity = await base44.asServiceRole.entities[entityName].get(id);
            if (!entity) {
                throw new Error(`Entity ${entityName} with ID ${id} not found`);
            }
            return entity;
        },
        {
            maxRetries: options.maxRetries || 5,
            initialDelay: options.initialDelay || 1000,
            shouldRetry: (error) => {
                return error.message.includes('not found') || 
                       error.message.includes('network') ||
                       error.message.includes('timeout');
            },
            onRetry: (error, attempt, delay) => {
                console.log(`[RetryUtil] Attempt ${attempt} failed, retrying in ${delay}ms...`);
            },
            ...options
        }
    );
    return retryResult.result;
}

export async function createEntityAndVerify(base44, entityName, data, options = {}) {
    const {
        verifyDelay = 500,
        maxVerifyRetries = 10
    } = options;

    const created = await base44.asServiceRole.entities[entityName].create(data);
    const entityId = created.id;

    console.log(`[RetryUtil] Created ${entityName}:${entityId}, verifying...`);

    await new Promise(resolve => setTimeout(resolve, verifyDelay));

    try {
        await getEntityWithRetry(base44, entityName, entityId, {
            maxRetries: maxVerifyRetries,
            initialDelay: 500,
            maxDelay: 5000
        });
        
        console.log(`[RetryUtil] ${entityName}:${entityId} verified`);
        return created;
    } catch (error) {
        console.error(`[RetryUtil] Failed to verify ${entityName}:${entityId}`);
        throw new Error(`Entity created but not accessible: ${error.message}`);
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            operation_type,
            entity_name,
            entity_id,
            entity_data,
            options = {}
        } = await req.json();

        let result;

        switch (operation_type) {
            case 'get_with_retry':
                result = await getEntityWithRetry(base44, entity_name, entity_id, options);
                break;

            case 'create_and_verify':
                result = await createEntityAndVerify(base44, entity_name, entity_data, options);
                break;

            default:
                return Response.json({
                    success: false,
                    error: 'Unknown operation_type'
                }, { status: 400 });
        }

        return Response.json({
            success: true,
            result
        });

    } catch (error) {
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});