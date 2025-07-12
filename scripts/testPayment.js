/**
 * Test Script for Tripay Payment Integration
 * This script demonstrates how to use the Tripay payment gateway
 */

require('dotenv').config();
const tripayService = require('../src/services/tripayService');
const { generateSignature } = require('../src/utils/tripaySignature');

/**
 * Test 1: Create a payment transaction
 */
const testCreateTransaction = async () => {
    console.log('\n=== Test 1: Creating Payment Transaction ===');

    try {
        const transactionData = {
            method: 'BRIVA',
            merchant_ref: tripayService.generateMerchantRef('TEST'),
            amount: 100000,
            customer_name: 'Test User',
            customer_email: 'test@example.com',
            customer_phone: '08123456789',
            order_items: [
                {
                    name: 'Digital Product Test',
                    price: 100000,
                    quantity: 1
                }
            ],
            return_url: 'https://yourdomain.com/payment/success',
            expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // Current timestamp + 24 hours
        };

        console.log('Creating transaction with data:', {
            method: transactionData.method,
            amount: transactionData.amount,
            customer_name: transactionData.customer_name
        });

        const result = await tripayService.createTransaction(transactionData);

        console.log('✅ Transaction created successfully!');
        console.log('Reference:', result.data.reference);
        console.log('Merchant Ref:', result.data.merchant_ref);
        console.log('Payment URL:', result.data.payment_url);
        console.log('Status:', result.data.status);

        return result.data.reference;
    } catch (error) {
        console.error('❌ Transaction creation failed:', error.message);
        return null;
    }
};

/**
 * Test 2: Check transaction status
 */
const testCheckTransactionStatus = async (reference) => {
    console.log('\n=== Test 2: Checking Transaction Status ===');

    if (!reference) {
        console.log('⚠️  Skipping status check - no reference available');
        return;
    }

    try {
        console.log('Checking status for reference:', reference);

        const result = await tripayService.getTransactionDetail(reference);

        console.log('✅ Transaction status retrieved!');
        console.log('Reference:', result.data.reference);
        console.log('Status:', result.data.status);
        console.log('Amount:', result.data.amount);
        console.log('Customer:', result.data.customer_name);

    } catch (error) {
        console.error('❌ Status check failed:', error.message);
    }
};

/**
 * Test 3: Get payment channels
 */
const testGetPaymentChannels = async () => {
    console.log('\n=== Test 3: Getting Payment Channels ===');

    try {
        console.log('Fetching available payment channels...');

        const result = await tripayService.getPaymentChannels();

        console.log('✅ Payment channels retrieved!');
        console.log('Available channels:', result.data.length);

        // Display first few channels
        result.data.slice(0, 3).forEach((channel, index) => {
            console.log(`${index + 1}. ${channel.name} (${channel.code})`);
            console.log(`   Type: ${channel.type}`);
            console.log(`   Min: ${channel.minimum_amount}, Max: ${channel.maximum_amount}`);
        });

    } catch (error) {
        console.error('❌ Payment channels fetch failed:', error.message);
    }
};

/**
 * Test 4: Test signature generation
 */
const testSignatureGeneration = () => {
    console.log('\n=== Test 4: Testing Signature Generation ===');

    try {
        const testData = {
            merchant_ref: 'TXN_TEST_123',
            amount: 100000,
            customer_name: 'Test User',
            order_items: [
                {
                    name: 'Test Product',
                    price: 100000,
                    quantity: 1
                }
            ]
        };

        console.log('Generating signature for test data...');
        const signature = generateSignature(testData);

        console.log('✅ Signature generated successfully!');
        console.log('Test Data:', JSON.stringify(testData, null, 2));
        console.log('Signature:', signature);

    } catch (error) {
        console.error('❌ Signature generation failed:', error.message);
    }
};

/**
 * Test 5: Generate merchant reference
 */
const testMerchantRefGeneration = () => {
    console.log('\n=== Test 5: Testing Merchant Reference Generation ===');

    try {
        console.log('Generating merchant references...');

        const ref1 = tripayService.generateMerchantRef('TXN');
        const ref2 = tripayService.generateMerchantRef('PAY');
        const ref3 = tripayService.generateMerchantRef();

        console.log('✅ Merchant references generated!');
        console.log('TXN Ref:', ref1);
        console.log('PAY Ref:', ref2);
        console.log('Default Ref:', ref3);

    } catch (error) {
        console.error('❌ Merchant reference generation failed:', error.message);
    }
};

/**
 * Main test function
 */
const runTests = async () => {
    console.log('🚀 Starting Tripay Payment Integration Tests');
    console.log('============================================');

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

    // Run tests
    await testGetPaymentChannels();
    testSignatureGeneration();
    testMerchantRefGeneration();

    const reference = await testCreateTransaction();
    await testCheckTransactionStatus(reference);

    console.log('\n🎉 All tests completed!');
    console.log('\nNext steps:');
    console.log('1. Check your Tripay dashboard for the test transaction');
    console.log('2. Test the payment flow using the generated payment URL');
    console.log('3. Verify callback handling by completing a test payment');
};

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    testCreateTransaction,
    testCheckTransactionStatus,
    testGetPaymentChannels,
    testSignatureGeneration,
    testMerchantRefGeneration,
    runTests
}; 