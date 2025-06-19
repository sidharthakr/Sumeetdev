// api/tally-tdl-assistant.js
// Vercel serverless function for TDL Assistant
// Developed by Verma Infocomm Pvt Ltd

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Set custom branding headers
    res.setHeader('Server', 'Verma-TDL-API/1.0');
    res.setHeader('X-Powered-By', 'Verma Infocomm Pvt Ltd');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            message: 'Only POST requests are supported',
            service: 'TDL Assistant by Verma Infocomm'
        });
    }

    try {
        const { question } = req.body;

        // Input validation
        if (!question || typeof question !== 'string' || question.trim().length < 3) {
            return res.status(400).json({
                error: 'INVALID_QUESTION',
                message: 'Please provide a valid TDL coding question (minimum 3 characters)',
                service: 'TDL Assistant by Verma Infocomm'
            });
        }

        // Get n8n webhook URL from environment variable
        const N8N_WEBHOOK_URL = process.env.N8N_TDL_WEBHOOK_URL;
        
        if (!N8N_WEBHOOK_URL) {
            console.error('N8N_TDL_WEBHOOK_URL environment variable not set');
            return res.status(500).json({
                error: 'CONFIGURATION_ERROR',
                message: 'TDL Assistant service is not properly configured',
                service: 'TDL Assistant by Verma Infocomm'
            });
        }

        console.log('TDL Question received:', question.substring(0, 100) + '...');
        console.log('Forwarding to n8n webhook:', N8N_WEBHOOK_URL);

        // Forward request to n8n webhook with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Verma-TDL-Gateway/1.0'
            },
            body: JSON.stringify({
                question: question.trim()
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!n8nResponse.ok) {
            console.error('n8n webhook failed:', n8nResponse.status, n8nResponse.statusText);
            throw new Error(`TDL workflow failed: ${n8nResponse.status}`);
        }

        const data = await n8nResponse.json();
        console.log('TDL Response received, verified:', data.verified);

        // Return professionally branded response
        return res.status(200).json({
            tdlCode: data.tdlCode || data.answer || 'No TDL code generated.',
            verified: data.verified || false,
            source: 'TDL Assistant by Verma Infocomm',
            questionType: 'Tally Definition Language',
            service: {
                name: 'TDL Assistant',
                version: '1.0.0',
                provider: 'Verma Infocomm Pvt Ltd',
                description: 'AI-powered Tally Definition Language code generator'
            },
            metadata: {
                processed_at: new Date().toISOString(),
                request_id: 'tdl_' + Math.random().toString(36).substring(2, 15),
                processing_time_ms: Date.now() - req.startTime || 0
            }
        });

    } catch (error) {
        console.error('TDL Assistant API Error:', error);

        // Handle different types of errors
        if (error.name === 'AbortError') {
            return res.status(504).json({
                error: 'TIMEOUT',
                message: 'TDL code generation took too long. Please try with a simpler question or try again later.',
                service: 'TDL Assistant by Verma Infocomm'
            });
        }

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return res.status(503).json({
                error: 'SERVICE_UNAVAILABLE',
                message: 'TDL Assistant service is temporarily unavailable. Please try again in a few moments.',
                service: 'TDL Assistant by Verma Infocomm'
            });
        }

        if (error.message.includes('workflow failed')) {
            return res.status(502).json({
                error: 'WORKFLOW_ERROR',
                message: 'There was an issue with the TDL code generation workflow. Please try again or contact support.',
                service: 'TDL Assistant by Verma Infocomm'
            });
        }

        // Generic error
        return res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while generating TDL code. Please try again.',
            service: 'TDL Assistant by Verma Infocomm',
            support: 'Contact Verma Infocomm Pvt Ltd for technical support'
        });
    }
}
