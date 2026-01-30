const axios = require('axios');
const { config, isLineMock } = require('../config');

const getEffectiveConfig = (overrides) => {
    const channelAccessToken = overrides.channelAccessToken || config.line.channelAccessToken;
    const isMock = overrides.channelAccessToken ? !channelAccessToken : isLineMock();
    return { channelAccessToken, isMock };
};

const sendMessage = async (to, text, overrides = {}) => {
    const { channelAccessToken, isMock } = getEffectiveConfig(overrides);

    if (isMock) {
        console.log(`[MOCK] LINE sendMessage to ${to}: ${text}`);
        return { success: true, mode: 'mock', messageId: 'mock-msg-id-' + Date.now() };
    }

    try {
        const url = 'https://api.line.me/v2/bot/message/push';
        const response = await axios.post(
            url,
            {
                to: to,
                messages: [
                    {
                        type: 'text',
                        text: text
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${channelAccessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        return { success: true, mode: 'real', data: response.data };
    } catch (error) {
        console.error('Error sending LINE message:', error.response ? error.response.data : error.message);
        throw new Error('Failed to send LINE message');
    }
};

const getUserProfile = async (userId, overrides = {}) => {
    const { channelAccessToken, isMock } = getEffectiveConfig(overrides);

    if (isMock) {
        console.log(`[MOCK] LINE getUserProfile for ${userId}`);
        return { 
            success: true, 
            mode: 'mock', 
            data: {
                userId,
                displayName: "Mock User " + userId.substr(0, 4),
                pictureUrl: "https://via.placeholder.com/150",
                statusMessage: "Hello, I am a mock user!"
            }
        };
    }

    try {
        const url = `https://api.line.me/v2/bot/profile/${userId}`;
        const response = await axios.get(
            url,
            {
                headers: {
                    'Authorization': `Bearer ${channelAccessToken}`,
                },
            }
        );
        return { success: true, mode: 'real', data: response.data };
    } catch (error) {
        console.error('Error getting LINE profile:', error.response ? error.response.data : error.message);
        throw new Error('Failed to get LINE profile');
    }
};

const handleWebhook = (body) => {
    try {
        if (body.events && body.events.length > 0) {
            const event = body.events[0];
            const userId = event.source.userId;
            
            if (event.type === 'message') {
                const messageType = event.message.type;
                let content = '[Unsupported Type]';

                if (messageType === 'text') {
                    content = event.message.text;
                } else if (messageType === 'image') {
                    content = '[Image Message]';
                } else if (messageType === 'sticker') {
                    content = '[Sticker]';
                }

                console.log(`[LINE Webhook] Received ${messageType} from ${userId}: ${content}`);
                return { 
                    type: 'message',
                    from: userId, 
                    messageType,
                    content,
                    raw: event 
                };
            } else if (event.type === 'follow') {
                console.log(`[LINE Webhook] New follower: ${userId}`);
                return {
                    type: 'follow',
                    from: userId,
                    content: 'Started following'
                };
            }
        }
    } catch (e) {
        console.error('Error parsing LINE webhook:', e);
    }
    return null;
};

module.exports = {
    sendMessage,
    getUserProfile,
    handleWebhook
};
