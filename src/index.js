const express = require('express');
const bodyParser = require('body-parser');
const { config, isWhatsappMock, isLineMock } = require('./config');
const apiRoutes = require('./routes/api');
const webhookRoutes = require('./routes/webhooks');
const path = require('path');

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRoutes);
app.use('/webhooks', webhookRoutes);

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        whatsapp: {
            mode: isWhatsappMock() ? 'mock' : 'real',
            configured: !isWhatsappMock()
        },
        line: {
            mode: isLineMock() ? 'mock' : 'real',
            configured: !isLineMock()
        }
    });
});

app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
    console.log(`WhatsApp Mode: ${isWhatsappMock() ? 'MOCK' : 'REAL'}`);
    console.log(`LINE Mode: ${isLineMock() ? 'MOCK' : 'REAL'}`);
    console.log(`Demo UI available at http://localhost:${config.port}`);
});
