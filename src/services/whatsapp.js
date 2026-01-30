const axios = require('axios');
const { config, isWhatsappMock } = require('../config');

const getEffectiveConfig = (overrides) => {
    const apiToken = overrides.apiToken || config.whatsapp.apiToken;
    const phoneNumberId = overrides.phoneNumberId || config.whatsapp.phoneNumberId;
    // Mock condition: if overriding, need full override; else check global config
    const isMock = overrides.apiToken ? (!apiToken || !phoneNumberId) : isWhatsappMock();
    return { apiToken, phoneNumberId, isMock };
};

const sendMessage = async (to, text, overrides = {}) => {
    const { apiToken, phoneNumberId, isMock } = getEffectiveConfig(overrides);

    if (isMock) {
        console.log(`[MOCK] WhatsApp sendMessage to ${to}: ${text}`);
        return { success: true, mode: 'mock', messageId: 'mock-msg-id-' + Date.now() };
    }

    try {
        const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
        const response = await axios.post(
            url,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'text',
                text: { body: text },
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        return { success: true, mode: 'real', data: response.data };
    } catch (error) {
        console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
        throw new Error('Failed to send WhatsApp message');
    }
};

const sendTemplateMessage = async (to, templateName, languageCode = 'en_US', overrides = {}) => {
    const { apiToken, phoneNumberId, isMock } = getEffectiveConfig(overrides);

    if (isMock) {
        console.log(`[MOCK] WhatsApp sendTemplate to ${to}: ${templateName} (${languageCode})`);
        return { success: true, mode: 'mock', messageId: 'mock-tpl-id-' + Date.now() };
    }

    try {
        const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
        const response = await axios.post(
            url,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'template',
                template: {
                    name: templateName,
                    language: {
                        code: languageCode
                    }
                },
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        return { success: true, mode: 'real', data: response.data };
    } catch (error) {
        console.error('Error sending WhatsApp template:', error.response ? error.response.data : error.message);
        throw new Error('Failed to send WhatsApp template');
    }
};

const handleWebhook = (body) => {
    try {
        if (body.object && body.entry && body.entry[0].changes && body.entry[0].changes[0].value) {
            const value = body.entry[0].changes[0].value;

            // Handle Messages
            if (value.messages && value.messages[0]) {
                const message = value.messages[0];
                const from = message.from;
                const type = message.type;
                let content = '[Unsupported Type]';
                
                if (type === 'text') {
                    content = message.text.body;
                } else if (type === 'image') {
                    content = `[Image] ${message.image.caption || ''}`;
                } else if (type === 'document') {
                    content = `[Document] ${message.document.filename || ''}`;
                }

                // Extract sender name if available
                const contact = value.contacts && value.contacts[0] ? value.contacts[0] : {};
                const senderName = contact.profile ? contact.profile.name : 'Unknown';

                console.log(`[WhatsApp Webhook] Message from ${senderName} (${from}): ${content}`);
                return { 
                    type: 'message', 
                    from, 
                    senderName,
                    messageType: type,
                    content,
                    raw: message
                };
            }

            // Handle Status Updates (Sent, Delivered, Read)
            if (value.statuses && value.statuses[0]) {
                const status = value.statuses[0];
                console.log(`[WhatsApp Webhook] Status update for ${status.recipient_id}: ${status.status}`);
                return {
                    type: 'status',
                    to: status.recipient_id,
                    status: status.status,
                    messageId: status.id
                };
            }
        }
    } catch (e) {
        console.error('Error parsing WhatsApp webhook:', e);
    }
    return null;
};

module.exports = {
    sendMessage,
    sendTemplateMessage,
    handleWebhook
};
