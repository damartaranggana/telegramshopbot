/**
 * Tripay Signature Utilities
 * Handles SHA256 HMAC signature generation and verification for Tripay API
 */

const crypto = require('crypto');
const { tripayConfig } = require('../config/tripay');

/**
 * Generate SHA256 HMAC signature for Tripay API requests
 * @param {string} data - The string data to sign
 * @param {string} privateKey - Tripay private key
 * @returns {string} - The generated signature
 */
const generateSignature = (data, privateKey = tripayConfig.privateKey) => {
    try {
        // Create HMAC SHA256 signature
        const signature = crypto
            .createHmac('sha256', privateKey)
            .update(data)
            .digest('hex');

        return signature;
    } catch (error) {
        throw new Error(`Failed to generate signature: ${error.message}`);
    }
};

/**
 * Verify callback signature from Tripay
 * @param {Object} callbackData - The callback data received from Tripay
 * @param {string} signature - The signature to verify
 * @param {string} privateKey - Tripay private key
 * @returns {boolean} - True if signature is valid, false otherwise
 */
const verifyCallbackSignature = (callbackData, signature, privateKey = tripayConfig.privateKey) => {
    try {
        // Generate expected signature from callback data using JSON.stringify
        const expectedSignature = crypto
            .createHmac("sha256", privateKey)
            .update(JSON.stringify(callbackData))
            .digest('hex');

        // Compare signatures (case-insensitive)
        return expectedSignature.toLowerCase() === signature.toLowerCase();
    } catch (error) {
        console.error('Signature verification failed:', error.message);
        return false;
    }
};

/**
 * Generate signature for transaction creation request
 * @param {Object} transactionData - Transaction data to sign
 * @param {number} formatIndex - Which signature format to use (1-7)
 * @returns {string} - The generated signature
 */
const generateTransactionSignature = (transactionData, formatIndex = 3) => {
    // Try different signature formats that Tripay might expect

    // Format 1: Only required fields in JSON
    const format1 = JSON.stringify({
        method: transactionData.method,
        merchant_ref: transactionData.merchant_ref,
        amount: transactionData.amount,
        customer_name: transactionData.customer_name,
        order_items: transactionData.order_items
    });

    // Format 2: Simple concatenation (merchant_ref + amount)
    const format2 = transactionData.merchant_ref + transactionData.amount;

    // Format 3: Include merchant code
    const format3 = tripayConfig.merchantCode + transactionData.merchant_ref + transactionData.amount;

    // Format 4: Key-value pairs sorted alphabetically
    const signatureData = {
        amount: transactionData.amount,
        customer_name: transactionData.customer_name,
        merchant_ref: transactionData.merchant_ref,
        method: transactionData.method
    };
    const sortedKeys = Object.keys(signatureData).sort();
    const format4 = sortedKeys.map(key => `${key}=${signatureData[key]}`).join('&');

    // Format 5: Full JSON with all fields
    const format5 = JSON.stringify(transactionData);

    // Format 6: merchant_ref + amount + customer_name
    const format6 = transactionData.merchant_ref + transactionData.amount + transactionData.customer_name;

    // Format 7: merchant_code + merchant_ref + amount + customer_name
    const format7 = tripayConfig.merchantCode + transactionData.merchant_ref + transactionData.amount + transactionData.customer_name;

    // Select format based on index
    const formats = [format1, format2, format3, format4, format5, format6, format7];
    const formatNames = [
        'JSON required fields',
        'merchant_ref + amount',
        'merchant_code + merchant_ref + amount',
        'key-value sorted',
        'Full JSON',
        'merchant_ref + amount + customer_name',
        'merchant_code + merchant_ref + amount + customer_name'
    ];

    const selectedFormat = formats[formatIndex - 1] || format3; // Default to format 3
    const selectedFormatName = formatNames[formatIndex - 1] || formatNames[2];

    // Debug: print signature data and string
    console.log('[Tripay Signature] Data:', {
        merchant_ref: transactionData.merchant_ref,
        amount: transactionData.amount,
        customer_name: transactionData.customer_name,
        order_items: transactionData.order_items,
        merchant_code: tripayConfig.merchantCode,
        method: transactionData.method || 'QRIS'
    });
    console.log(`[Tripay Signature] Using Format ${formatIndex} (${selectedFormatName}):`, selectedFormat);
    console.log('[Tripay Signature] Generated signature:', generateSignature(selectedFormat));

    return generateSignature(selectedFormat);
};

/**
 * Generate signature for callback verification
 * @param {Object} callbackData - Callback data to sign
 * @returns {string} - The generated signature
 */
const generateCallbackSignature = (callbackData) => {
    // Use JSON.stringify format for callback signature (as per Tripay documentation)
    const signatureString = JSON.stringify(callbackData);

    return generateSignature(signatureString);
};

module.exports = {
    generateSignature,
    verifyCallbackSignature,
    generateTransactionSignature,
    generateCallbackSignature
}; 