const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');
const lineService = require('../services/line');
const store = require('../store');

// --- General ---

router.get('/messages', (req, res) => {
    res.json(store.getMessages());
});

// --- WhatsApp ---

router.post('/send-whatsapp', async (req, res) => {
    const { to, text, config } = req.body;
    if (!to || !text) {
        return res.status(400).json({ error: 'Missing "to" or "text" parameters' });
    }
    try {
        const result = await whatsappService.sendMessage(to, text, config);
        // Log outgoing message to store
        store.addMessage('whatsapp', {
            type: 'outgoing',
            to,
            content: text,
            status: 'sent',
            mode: result.mode
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/send-whatsapp-template', async (req, res) => {
    const { to, templateName, language, config } = req.body;
    if (!to || !templateName) {
        return res.status(400).json({ error: 'Missing "to" or "templateName" parameters' });
    }
    try {
        const result = await whatsappService.sendTemplateMessage(to, templateName, language, config);
        store.addMessage('whatsapp', {
            type: 'outgoing',
            to,
            content: `[Template] ${templateName}`,
            status: 'sent',
            mode: result.mode
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- LINE ---

router.post('/send-line', async (req, res) => {
    const { to, text, config } = req.body;
    if (!to || !text) {
        return res.status(400).json({ error: 'Missing "to" or "text" parameters' });
    }
    try {
        const result = await lineService.sendMessage(to, text, config);
        store.addMessage('line', {
            type: 'outgoing',
            to,
            content: text,
            status: 'sent',
            mode: result.mode
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/send-line-broadcast', async (req, res) => {
    const { text, config } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Missing "text" parameter' });
    }
    try {
        const result = await lineService.broadcastMessage(text, config);
        store.addMessage('line', {
            type: 'outgoing',
            to: 'ALL (Broadcast)',
            content: text,
            status: 'sent',
            mode: result.mode
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/line/profile', async (req, res) => {
    const { userId, config } = req.query;
    // Note: GET request with config passed as query string needs parsing, 
    // but for simplicity in this demo we might handle it via body in a POST or simplified query
    // Let's use a POST for profile retrieval to easily pass sensitive config if needed, or stick to query params without sensitive info.
    // For this demo, let's allow config via query param JSON string if really needed, but better to use headers or just POST.
    // Let's switch to POST for consistency with other config-bearing endpoints
    res.status(405).json({ error: 'Use POST /api/line/profile to fetch profile with config' });
});

router.post('/line/profile', async (req, res) => {
    const { userId, config } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'Missing "userId"' });
    }
    try {
        const result = await lineService.getUserProfile(userId, config);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/line/token', async (req, res) => {
    const { channelId, channelSecret } = req.body;
    if (!channelId || !channelSecret) {
        return res.status(400).json({ error: 'Missing "channelId" or "channelSecret"' });
    }
    try {
        const result = await lineService.issueAccessToken(channelId, channelSecret);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
