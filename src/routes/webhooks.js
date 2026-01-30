const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');
const lineService = require('../services/line');
const { config } = require('../config');
const store = require('../store');

// WhatsApp Webhook Verification
router.get('/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
            console.log('WhatsApp webhook verified!');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// WhatsApp Webhook Event
router.post('/whatsapp', (req, res) => {
    // Respond immediately to avoid timeout
    res.sendStatus(200);
    
    const result = whatsappService.handleWebhook(req.body);
    if (result) {
        if (result.type === 'message') {
            store.addMessage('whatsapp', {
                type: 'incoming',
                from: result.from,
                senderName: result.senderName,
                content: result.content,
                status: 'received',
                raw: result.raw
            });
        } else if (result.type === 'status') {
            // In a real app, update original message status
            console.log(`Updated status for message ${result.messageId} to ${result.status}`);
        }
    }
});

// LINE Webhook Event
router.post('/line', (req, res) => {
    res.sendStatus(200);

    const result = lineService.handleWebhook(req.body);
    if (result) {
        if (result.type === 'message') {
            store.addMessage('line', {
                type: 'incoming',
                from: result.from,
                content: result.content,
                status: 'received',
                raw: result.raw
            });
        } else if (result.type === 'follow') {
            store.addMessage('line', {
                type: 'system',
                from: result.from,
                content: 'User started following/blocked',
                status: 'info'
            });
        }
    }
});

module.exports = router;
