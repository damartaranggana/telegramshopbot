/**
 * Tripay API Service
 * Handles all HTTP requests to Tripay payment gateway API
 */

const axios = require('axios');
const { tripayConfig, validateConfig } = require('../config/tripay');
const { generateTransactionSignature } = require('../utils/tripaySignature');

// Validate configuration on module load
validateConfig();

/**
 * Create axios instance with default configuration
 */
const tripayAPI = axios.create({
    baseURL: tripayConfig.baseUrl,
    timeout: 30000, // 30 seconds timeout
    headers: tripayConfig.getHeaders()
});

/**
 * Create a new transaction in Tripay
 * @param {Object} transactionData - Transaction data
 * @returns {Promise<Object>} - Tripay API response
 */
const createTransaction = async (transactionData) => {
    try {
        // Validate required fields
        const requiredFields = ['method', 'merchant_ref', 'amount', 'customer_name', 'order_items'];
        const missingFields = requiredFields.filter(field => !transactionData[field]);

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Generate signature for the transaction
        const signature = generateTransactionSignature(transactionData);

        // Prepare request payload
        const payload = {
            method: transactionData.method,
            merchant_ref: transactionData.merchant_ref,
            amount: transactionData.amount,
            customer_name: transactionData.customer_name,
            signature: signature,
            order_items: transactionData.order_items,
            // Optional fields
            ...(transactionData.customer_email && { customer_email: transactionData.customer_email }),
            ...(transactionData.customer_phone && { customer_phone: transactionData.customer_phone }),
            ...(transactionData.return_url && { return_url: transactionData.return_url }),
            ...(transactionData.expired_time && { expired_time: transactionData.expired_time })
        };

        console.log('Creating Tripay transaction:', {
            merchant_ref: payload.merchant_ref,
            amount: payload.amount,
            method: payload.method
        });
        console.log('Full Tripay payload:', payload);

        // Send request to Tripay API
        const response = await tripayAPI.post(tripayConfig.endpoints.createTransaction, payload);

        console.log('Tripay transaction created successfully:', {
            reference: response.data.data.reference,
            merchant_ref: response.data.data.merchant_ref,
            status: response.data.data.status
        });

        return response.data;
    } catch (error) {
        console.error('Failed to create Tripay transaction:', error.message);

        if (error.response) {
            // Tripay API error response
            throw new Error(`Tripay API Error: ${error.response.data.message || error.response.statusText}`);
        }

        throw error;
    }
};

/**
 * Get transaction details from Tripay
 * @param {string} reference - Transaction reference ID
 * @returns {Promise<Object>} - Transaction details
 */
const getTransactionDetail = async (reference) => {
    try {
        if (!reference) {
            throw new Error('Transaction reference is required');
        }

        console.log('Fetching transaction details for reference:', reference);

        // Send request to Tripay API
        const response = await tripayAPI.get(`${tripayConfig.endpoints.transactionDetail}?reference=${reference}`);

        console.log('Transaction details retrieved successfully:', {
            reference: response.data.data.reference,
            status: response.data.data.status,
            amount: response.data.data.amount
        });

        return response.data;
    } catch (error) {
        console.error('Failed to get transaction details:', error.message);

        if (error.response) {
            // Tripay API error response
            throw new Error(`Tripay API Error: ${error.response.data.message || error.response.statusText}`);
        }

        throw error;
    }
};

/**
 * Get available payment channels from Tripay
 * @returns {Promise<Object>} - Available payment channels
 */
const getPaymentChannels = async () => {
    try {
        console.log('Fetching available payment channels');

        // Send request to Tripay API
        const response = await tripayAPI.get(tripayConfig.endpoints.paymentChannels);

        console.log('Payment channels retrieved successfully');

        return response.data;
    } catch (error) {
        console.error('Failed to get payment channels:', error.message);

        if (error.response) {
            // Tripay API error response
            throw new Error(`Tripay API Error: ${error.response.data.message || error.response.statusText}`);
        }

        throw error;
    }
};

/**
 * Generate unique merchant reference
 * @param {string} prefix - Prefix for the reference
 * @returns {string} - Unique merchant reference
 */
const generateMerchantRef = (prefix = 'TXN') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
};

module.exports = {
    createTransaction,
    getTransactionDetail,
    getPaymentChannels,
    generateMerchantRef
}; 