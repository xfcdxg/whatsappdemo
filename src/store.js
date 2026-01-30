// Simple in-memory store to mock a CRM database
const messages = [
    {
        id: Date.now() - 100000,
        platform: 'whatsapp',
        type: 'incoming',
        from: '15550001',
        senderName: 'Alice Mock',
        content: 'Hello! I am interested in your product.',
        timestamp: new Date(Date.now() - 100000).toISOString()
    },
    {
        id: Date.now() - 80000,
        platform: 'whatsapp',
        type: 'outgoing',
        to: '15550001',
        content: 'Hi Alice! Thanks for reaching out. How can I help you?',
        status: 'read',
        mode: 'mock',
        timestamp: new Date(Date.now() - 80000).toISOString()
    },
    {
        id: Date.now() - 50000,
        platform: 'line',
        type: 'incoming',
        from: 'U123456mock',
        senderName: 'Bob Line',
        content: 'Is this support available 24/7?',
        timestamp: new Date(Date.now() - 50000).toISOString()
    }
];
const users = {};

const addMessage = (platform, data) => {
    const message = {
        id: Date.now(),
        platform,
        timestamp: new Date().toISOString(),
        ...data
    };
    messages.unshift(message); // Add to beginning
    // Keep only last 50 messages
    if (messages.length > 50) messages.pop();
    return message;
};

const getMessages = () => messages;

const updateUser = (platform, userId, data) => {
    if (!users[platform]) users[platform] = {};
    users[platform][userId] = {
        ...users[platform][userId],
        ...data,
        lastSeen: new Date().toISOString()
    };
    return users[platform][userId];
};

const getUser = (platform, userId) => {
    return users[platform] ? users[platform][userId] : null;
};

module.exports = {
    addMessage,
    getMessages,
    updateUser,
    getUser
};
