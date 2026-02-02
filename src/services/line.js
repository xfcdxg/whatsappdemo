const axios = require('axios');
const { config, isLineMock } = require('../config');

const getEffectiveConfig = (overrides) => {
    const channelAccessToken = overrides.channelAccessToken || config.line.channelAccessToken;
    const channelSecret = overrides.channelSecret || config.line.channelSecret;
    const isMock = overrides.channelAccessToken ? !channelAccessToken : isLineMock();
    return { channelAccessToken, channelSecret, isMock };
};

const sendMessage = async (to, text, overrides = {}) => {
    const { channelAccessToken, isMock } = getEffectiveConfig(overrides);
    
    // Ensure 'to' is a string and trimmed
    const cleanTo = String(to).trim();

    if (isMock) {
        console.log(`[MOCK] LINE sendMessage to ${cleanTo}: ${text}`);
        return { success: true, mode: 'mock', messageId: 'mock-msg-id-' + Date.now() };
    }

    try {
        const url = 'https://api.line.me/v2/bot/message/push';
        const response = await axios.post(
            url,
            {
                to: cleanTo,
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
    const cleanUserId = String(userId).trim();

    if (isMock) {
        console.log(`[MOCK] LINE getUserProfile for ${cleanUserId}`);
        return { 
            success: true, 
            mode: 'mock', 
            data: {
                userId: cleanUserId,
                displayName: "Mock User " + cleanUserId.substr(0, 4),
                pictureUrl: "https://via.placeholder.com/150",
                statusMessage: "Hello, I am a mock user!"
            }
        };
    }

    try {
        const url = `https://api.line.me/v2/bot/profile/${cleanUserId}`;
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

const issueAccessToken = async (clientId, clientSecret) => {
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);

        const response = await axios.post(
            'https://api.line.me/v2/oauth/accessToken',
            params,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
            }
        );
        return response.data; // { access_token, expires_in, token_type }
    } catch (error) {
        console.error('Error issuing LINE access token:', error.response ? error.response.data : error.message);
        throw new Error('Failed to issue access token: ' + (error.response?.data?.error_description || error.message));
    }
};

const replyMessage = async (replyToken, text, overrides = {}) => {
    const { channelAccessToken, isMock } = getEffectiveConfig(overrides);

    if (isMock) {
        console.log(`[MOCK] LINE replyMessage to token ${replyToken}: ${text}`);
        return { success: true, mode: 'mock' };
    }

    try {
        const url = 'https://api.line.me/v2/bot/message/reply';
        await axios.post(
            url,
            {
                replyToken: replyToken,
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
        return { success: true, mode: 'real' };
    } catch (error) {
        console.error('Error replying LINE message:', error.response ? error.response.data : error.message);
        // Don't throw to avoid crashing webhook handler
        return { success: false, error: error.message };
    }
};

const broadcastMessage = async (text, overrides = {}) => {
    const { channelAccessToken, isMock } = getEffectiveConfig(overrides);

    if (isMock) {
        console.log(`[MOCK] LINE broadcastMessage: ${text}`);
        return { success: true, mode: 'mock', messageId: 'mock-broadcast-id-' + Date.now() };
    }

    try {
        const url = 'https://api.line.me/v2/bot/message/broadcast';
        const response = await axios.post(
            url,
            {
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
                    'X-Line-Retry-Key': require('crypto').randomUUID() // Must be a UUID
                },
            }
        );
        return { success: true, mode: 'real', data: response.data };
    } catch (error) {
        console.error('Error sending LINE broadcast:', error.response ? error.response.data : error.message);
        throw new Error('Failed to send LINE broadcast');
    }
};

module.exports = {
    sendMessage,
    broadcastMessage,
    replyMessage,
    getUserProfile,
    handleWebhook,
    issueAccessToken
};
