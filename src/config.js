require('dotenv').config();

const config = {
    port: process.env.PORT || 3000,
    whatsapp: {
        apiToken: process.env.WHATSAPP_API_TOKEN,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    },
    line: {
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.LINE_CHANNEL_SECRET,
    }
};

const isWhatsappMock = () => {
    return !config.whatsapp.apiToken || !config.whatsapp.phoneNumberId;
};

const isLineMock = () => {
    return !config.line.channelAccessToken || !config.line.channelSecret;
};

module.exports = {
    config,
    isWhatsappMock,
    isLineMock
};
