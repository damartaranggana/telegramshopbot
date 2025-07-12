/**
 * Test Payment with Updated Signature Format
 * Tests the payment creation with the new signature format
 */

const { createTransaction } = require('../src/services/tripayService');

async function testPaymentWithNewSignature() {
    try {
        console.log('🚀 Testing Payment with Updated Signature Format');
        console.log('================================================');

        // Test transaction data
        const transactionData = {
            method: 'QRIS',
            merchant_ref: `TEST_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            amount: 10000, // 10,000 IDR = $1
            customer_name: 'Test User',
            customer_email: 'test@example.com',
            order_items: [
                {
                    name: 'Test Product',
                    price: 10000,
                    quantity: 1
                }
            ],
            return_url: 'http://localhost:3000/payment/success',
            expired_time: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        };

        console.log('📝 Transaction Data:');
        console.log(JSON.stringify(transactionData, null, 2));

        console.log('\n🔐 Creating transaction with new signature format...');

        const result = await createTransaction(transactionData);

        console.log('\n✅ Transaction created successfully!');
        console.log('Reference:', result.data.reference);
        console.log('Status:', result.data.status);
        console.log('Amount:', result.data.amount);
        console.log('QR Code URL:', result.data.qr_url);

        return result;
    } catch (error) {
        console.error('\n❌ Error creating transaction:');
        console.error(error.message);

        if (error.message.includes('Invalid signature')) {
            console.log('\n💡 Signature is still invalid. We need to try a different format.');
            console.log('Check the logs above to see all available signature formats.');
        }

        throw error;
    }
}

// Run the test
if (require.main === module) {
    testPaymentWithNewSignature()
        .then(() => {
            console.log('\n🎉 Test completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testPaymentWithNewSignature }; 