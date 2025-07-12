/**
 * Simple Tripay Test
 * Tests basic Tripay integration with detailed error reporting
 */

const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// Tripay configuration
const config = {
    apiKey: process.env.TRIPAY_API_KEY,
    privateKey: process.env.TRIPAY_PRIVATE_KEY,
    merchantCode: process.env.TRIPAY_MERCHANT_CODE,
    baseUrl: 'https://tripay.co.id/api-sandbox'
};

// Generate signature using the most common format
function generateSignature(data, privateKey) {
    return crypto
        .createHmac('sha256', privateKey)
        .update(data)
        .digest('hex');
}

async function simpleTripayTest() {
    try {
        console.log('🚀 Simple Tripay Test');
        console.log('=====================');

        // Validate configuration
        console.log('📋 Configuration:');
        console.log(`Environment: ${process.env.TRIPAY_ENVIRONMENT || 'sandbox'}`);
        console.log(`API Key: ${config.apiKey ? 'Set' : 'Missing'}`);
        console.log(`Private Key: ${config.privateKey ? 'Set' : 'Missing'}`);
        console.log(`Merchant Code: ${config.merchantCode || 'Missing'}`);
        console.log(`Base URL: ${config.baseUrl}`);
        console.log('');

        if (!config.apiKey || !config.privateKey || !config.merchantCode) {
            throw new Error('Missing required Tripay configuration');
        }

        // Test transaction data
        const merchantRef = `SIMPLE_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const amount = 10000;

        const transactionData = {
            method: 'QRIS',
            merchant_ref: merchantRef,
            amount: amount,
            customer_name: 'Simple Test',
            customer_email: 'test@example.com',
            order_items: [
                {
                    name: 'Test Product',
                    price: amount,
                    quantity: 1
                }
            ]
        };

        console.log('📝 Transaction Data:');
        console.log(JSON.stringify(transactionData, null, 2));
        console.log('');

        // Generate signature using merchant_code + merchant_ref + amount (Format 3)
        const signatureData = config.merchantCode + merchantRef + amount;
        const signature = generateSignature(signatureData, config.privateKey);

        console.log('🔐 Signature Generation:');
        console.log(`Data: ${signatureData}`);
        console.log(`Signature: ${signature}`);
        console.log('');

        // Prepare request payload
        const payload = {
            ...transactionData,
            signature: signature
        };

        console.log('📡 Sending request to Tripay...');
        console.log(`URL: ${config.baseUrl}/transaction/create`);
        console.log('Headers:', {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
        });
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('');

        // Make the request
        const response = await axios.post(
            `${config.baseUrl}/transaction/create`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 seconds timeout
            }
        );

        console.log('✅ SUCCESS! Response:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

        return response.data;

    } catch (error) {
        console.error('❌ ERROR:');

        if (error.response) {
            // Server responded with error status
            console.error('Status:', error.response.status);
            console.error('Status Text:', error.response.statusText);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));

            if (error.response.data && error.response.data.message) {
                console.error('Error Message:', error.response.data.message);
            }
        } else if (error.request) {
            // Request was made but no response received
            console.error('No response received from server');
            console.error('Request:', error.request);
        } else {
            // Something else happened
            console.error('Error:', error.message);
        }

        throw error;
    }
}

// Run the test
if (require.main === module) {
    simpleTripayTest()
        .then(() => {
            console.log('\n🎉 Test completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed');
            process.exit(1);
        });
}

module.exports = { simpleTripayTest }; 