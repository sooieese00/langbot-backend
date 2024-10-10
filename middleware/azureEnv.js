// middleware/azureEnv.js

const dotenv = require('dotenv');
dotenv.config();

const getSubscriptionKey = (req, res, next) => {
    try {
        const subscriptionKey = process.env.AZURE_SUBSCRIPTIONKEY;

        if (!subscriptionKey) {
            return res.status(500).json({ error: 'API Key not found' });
        }

        // 프론트엔드에 직접 subscriptionKey 반환
        res.json({ subscriptionKey });

    } catch (error) {
        res.status(500).json({ error: 'Failed to load API key' });
    }
};

module.exports = getSubscriptionKey;
