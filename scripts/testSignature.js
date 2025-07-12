/**
 * Test Script for Tripay Signature Generation
 * This script tests different signature formats to find the correct one
 */

require('dotenv').config();
const crypto = require('crypto');
const { tripayConfig } = require('../src/config/tripay');

// Test data
const testTransactionData = {
    method: 'QRIS',
    merchant_ref: 'BAL_1752341361222_1LHXNM',
    amount: 50000,
    customer_name: 'Knightz',
    customer_email: 'knightz@example.com',
    customer_phone: null,
    order_items: [
        {
            name: 'Balance Top Up ($5.00)',
            price: 50000,
            quantity: 1
        }
    ],
    return_url: 'http://localhost:3000/payment/success',
    expired_time: 1752427761
};

/**
 * Test different signature formats
 */
const testSignatureFormats = () => {
    console.log('🔐 Testing Tripay Signature Formats');
    console.log('====================================');
    console.log('Private Key:', tripayConfig.privateKey ? 'Set' : 'Not Set');
    console.log('Merchant Code:', tripayConfig.merchantCode);
    console.log('');

    // Format 1: Only required fields in JSON
    const format1 = JSON.stringify({
        method: testTransactionData.method,
        merchant_ref: testTransactionData.merchant_ref,
        amount: testTransactionData.amount,
        customer_name: testTransactionData.customer_name,
        order_items: testTransactionData.order_items
    });

    // Format 2: Simple concatenation (merchant_ref + amount)
    const format2 = testTransactionData.merchant_ref + testTransactionData.amount;

    // Format 3: Include merchant code
    const format3 = tripayConfig.merchantCode + testTransactionData.merchant_ref + testTransactionData.amount;

    // Format 4: Key-value pairs sorted alphabetically
    const signatureData = {
        amount: testTransactionData.amount,
        customer_name: testTransactionData.customer_name,
        merchant_ref: testTransactionData.merchant_ref,
        method: testTransactionData.method
    };
    const sortedKeys = Object.keys(signatureData).sort();
    const format4 = sortedKeys.map(key => `${key}=${signatureData[key]}`).join('&');

    // Format 5: Full JSON (as sent in payload)
    const format5 = JSON.stringify(testTransactionData);

    // Format 6: merchant_ref + amount + customer_name
    const format6 = testTransactionData.merchant_ref + testTransactionData.amount + testTransactionData.customer_name;

    // Format 7: merchant_code + merchant_ref + amount + customer_name
    const format7 = tripayConfig.merchantCode + testTransactionData.merchant_ref + testTransactionData.amount + testTransactionData.customer_name;

    const formats = [
        { name: 'Format 1 (JSON required fields)', data: format1 },
        { name: 'Format 2 (merchant_ref + amount)', data: format2 },
        { name: 'Format 3 (merchant_code + merchant_ref + amount)', data: format3 },
        { name: 'Format 4 (key-value sorted)', data: format4 },
        { name: 'Format 5 (Full JSON)', data: format5 },
        { name: 'Format 6 (merchant_ref + amount + customer_name)', data: format6 },
        { name: 'Format 7 (merchant_code + merchant_ref + amount + customer_name)', data: format7 }
    ];

    formats.forEach((format, index) => {
        const signature = crypto
            .createHmac('sha256', tripayConfig.privateKey)
            .update(format.data)
            .digest('hex');

        console.log(`${index + 1}. ${format.name}`);
        console.log(`   Data: ${format.data}`);
        console.log(`   Signature: ${signature}`);
        console.log('');
    });

    // Test callback signature
    console.log('📞 Testing Callback Signature');
    console.log('==============================');

    const testCallbackData = {
        reference: 'TRX123456789',
        merchant_ref: 'BAL_1752341361222_1LHXNM',
        status: 'PAID',
        amount: 50000
    };

    const callbackSignature = crypto
        .createHmac('sha256', tripayConfig.privateKey)
        .update(JSON.stringify(testCallbackData))
        .digest('hex');

    console.log('Callback Data:', testCallbackData);
    console.log('Callback Signature:', callbackSignature);
    console.log('');

    // Test manual signature verification
    console.log('✅ Testing Signature Verification');
    console.log('==================================');

    const testSignature = crypto
        .createHmac('sha256', tripayConfig.privateKey)
        .update(JSON.stringify(testCallbackData))
        .digest('hex');

    const isValid = testSignature.toLowerCase() === callbackSignature.toLowerCase();
    console.log('Manual verification result:', isValid ? '✅ Valid' : '❌ Invalid');
};

/**
 * Test with actual Tripay API
 */
const testWithTripayAPI = async () => {
    console.log('🌐 Testing with Tripay API');
    console.log('===========================');

    const axios = require('axios');

    try {
        // Test payment channels endpoint (no signature required)
        const response = await axios.get(`${tripayConfig.baseUrl}/merchant/payment-channel`, {
            headers: tripayConfig.getHeaders()
        });

        console.log('✅ Payment channels retrieved successfully');
        console.log('Available channels:', response.data.data.length);

        // Show QRIS channel if available
        const qrisChannel = response.data.data.find(channel =>
            channel.code === 'QRIS' || channel.name.toLowerCase().includes('qris')
        );

        if (qrisChannel) {
            console.log('✅ QRIS channel found:', qrisChannel.name);
        } else {
            console.log('❌ QRIS channel not found');
        }

    } catch (error) {
        console.error('❌ Error testing Tripay API:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
};

/**
 * Main test function
 */
const runTests = async () => {
    console.log('🚀 Starting Tripay Signature Tests');
    console.log('==================================');

    // Check if environment variables are set
    if (!process.env.TRIPAY_API_KEY || !process.env.TRIPAY_PRIVATE_KEY || !process.env.TRIPAY_MERCHANT_CODE) {
        console.error('❌ Missing required environment variables!');
        console.log('Please set the following in your .env file:');
        console.log('- TRIPAY_API_KEY');
        console.log('- TRIPAY_PRIVATE_KEY');
        console.log('- TRIPAY_MERCHANT_CODE');
        return;
    }

    console.log('✅ Environment variables configured');
    console.log('Environment:', process.env.TRIPAY_ENVIRONMENT || 'sandbox');
    console.log('');

    // Run signature format tests
    testSignatureFormats();

    // Test with Tripay API
    await testWithTripayAPI();

    console.log('🎉 All signature tests completed!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Try the different signature formats in your application');
    console.log('2. Check which format works with Tripay');
    console.log('3. Update the signature generation accordingly');
};

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch((error) => {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    });
}

module.exports = {
    testSignatureFormats,
    testWithTripayAPI,
    runTests
}; 