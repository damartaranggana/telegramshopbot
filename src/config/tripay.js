/**
 * Tripay Payment Gateway Configuration
 * This module contains all configuration settings for Tripay integration
 */

require('dotenv').config();

const tripayConfig = {
    // API Credentials
    apiKey: process.env.TRIPAY_API_KEY,
    privateKey: process.env.TRIPAY_PRIVATE_KEY,
    merchantCode: process.env.TRIPAY_MERCHANT_CODE,

    // Environment settings
    environment: process.env.TRIPAY_ENVIRONMENT || 'sandbox',

    // API URLs based on environment
    baseUrl: process.env.TRIPAY_ENVIRONMENT === 'production'
        ? 'https://tripay.co.id/api'
        : 'https://tripay.co.id/api-sandbox',

    // API Endpoints
    endpoints: {
        createTransaction: '/transaction/create',
        transactionDetail: '/transaction/detail',
        paymentChannels: '/merchant/payment-channel'
    },

    // HTTP Headers for API requests
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
    }
};

// Validation function to check if all required config is present
const validateConfig = () => {
    const required = ['apiKey', 'privateKey', 'merchantCode'];
    const missing = required.filter(key => !tripayConfig[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required Tripay configuration: ${missing.join(', ')}`);
    }

    console.log('Tripay Config Validation:', {
        environment: tripayConfig.environment,
        baseUrl: tripayConfig.baseUrl,
        hasApiKey: !!tripayConfig.apiKey,
        hasPrivateKey: !!tripayConfig.privateKey,
        hasMerchantCode: !!tripayConfig.merchantCode
    });

    return true;
};

module.exports = {
    tripayConfig,
    validateConfig
}; 