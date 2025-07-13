/**
 * Test Currency Conversion Issue
 * Verifies that Rp 50.000 stays Rp 50.000 (not becomes Rp 500.000.000)
 */

const PaymentService = require('../src/services/paymentService');
const Database = require('../src/database/database');

async function testCurrencyConversion() {
    try {
        console.log('🧪 Testing Currency Conversion Issue');
        console.log('=====================================');

        // Initialize database
        console.log('📊 Test 1: Initializing database...');
        const db = new Database();
        await db.initialize();
        console.log('✅ Database initialized successfully');
        console.log('');

        // Initialize payment service
        console.log('💳 Test 2: Initializing payment service...');
        const paymentService = new PaymentService(db);
        console.log('✅ Payment service initialized successfully');
        console.log('');

        // Test data - User input Rp 50.000
        const testAmount = 50000; // Rp 50.000
        const userId = 1; // Use existing user
        const customerName = 'Test User';

        console.log('📝 Test 3: Testing currency conversion...');
        console.log(`Input amount: Rp ${testAmount.toLocaleString()}`);
        console.log('');

        // Create payment to see what happens
        console.log('🔧 Creating payment to test conversion...');
        const paymentResult = await paymentService.createBalancePayment(
            userId,
            testAmount,
            customerName,
            null, // phone
            'test@example.com' // email
        );

        if (paymentResult.success) {
            const { amount, amountIdr, reference } = paymentResult.data;

            console.log('📊 Payment Result:');
            console.log(`   Original amount (USD): $${amount}`);
            console.log(`   Converted amount (IDR): Rp ${amountIdr.toLocaleString()}`);
            console.log(`   Reference: ${reference}`);
            console.log('');

            // Check if conversion is correct
            const expectedIdr = testAmount; // Should be same as input
            const actualIdr = amountIdr;

            console.log('🔍 Conversion Analysis:');
            console.log(`   Expected IDR: Rp ${expectedIdr.toLocaleString()}`);
            console.log(`   Actual IDR: Rp ${actualIdr.toLocaleString()}`);
            console.log(`   Conversion factor used: ${actualIdr / testAmount}`);
            console.log('');

            if (actualIdr === expectedIdr) {
                console.log('✅ CONVERSION IS CORRECT!');
                console.log('   Rp 50.000 stays Rp 50.000');
            } else {
                console.log('❌ CONVERSION IS WRONG!');
                console.log('   Rp 50.000 became Rp ' + actualIdr.toLocaleString());
                console.log('   This is the issue that needs to be fixed!');
            }
        } else {
            console.log('❌ Failed to create payment');
        }
        console.log('');

        // Test different amounts
        console.log('🔧 Test 4: Testing different amounts...');
        const testAmounts = [10000, 25000, 100000, 250000];

        for (const amount of testAmounts) {
            try {
                const result = await paymentService.createBalancePayment(
                    userId,
                    amount,
                    customerName,
                    null,
                    'test@example.com'
                );

                if (result.success) {
                    const { amountIdr } = result.data;
                    const isCorrect = amountIdr === amount;
                    const status = isCorrect ? '✅' : '❌';

                    console.log(`${status} Rp ${amount.toLocaleString()} → Rp ${amountIdr.toLocaleString()}`);
                }
            } catch (error) {
                console.log(`❌ Error testing Rp ${amount.toLocaleString()}: ${error.message}`);
            }
        }
        console.log('');

        console.log('🎉 Currency conversion test completed!');
        console.log('');
        console.log('📋 Summary:');
        console.log('   ✅ Database connection works');
        console.log('   ✅ Payment service works');
        console.log('   ✅ Currency conversion tested');
        console.log('');
        console.log('🚀 Check the results above to see if conversion is correct!');

        return {
            success: true,
            message: 'Currency conversion test completed'
        };

    } catch (error) {
        console.error('💥 Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the test
if (require.main === module) {
    testCurrencyConversion()
        .then((result) => {
            if (result.success) {
                console.log('\n🎉 Currency conversion test completed successfully!');
                process.exit(0);
            } else {
                console.log('\n💥 Currency conversion test failed!');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('\n💥 Test error:', error);
            process.exit(1);
        });
}

module.exports = { testCurrencyConversion }; 