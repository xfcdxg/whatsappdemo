const express = require('express');
const router = express.Router();
const crypto = require('crypto');
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
    // 签名验证
    const channelSecret = config.line.channelSecret;
    const signature = req.headers['x-line-signature'];

    if (channelSecret && signature) {
        const body = req.rawBody; // 需要在 index.js 中配置 bodyParser 获取 rawBody
        const hash = crypto
            .createHmac('sha256', channelSecret)
            .update(body)
            .digest('base64');

        if (hash !== signature) {
            console.error('Invalid LINE signature');
            return res.status(401).send('Invalid signature');
        }
    } else if (channelSecret && !signature) {
         console.warn('Missing LINE signature');
         // 依然允许通过，或者是拒绝？通常应该拒绝。但在调试模式下可能没有。
         // 为了安全，如果配置了 Secret，就必须有签名。
         return res.status(401).send('Missing signature');
    }

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
            
            // Auto-reply to verify connectivity (especially for Free Plan accounts)
            if (result.raw && result.raw.replyToken) {
                lineService.replyMessage(result.raw.replyToken, `Echo: ${result.content}`);
            }
            
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
