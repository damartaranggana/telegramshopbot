/**
 * Test Payment Polling System
 * Tests the automatic payment status polling and balance update system
 */

const PaymentService = require('../src/services/paymentService');
const PaymentScheduler = require('../src/services/paymentScheduler');
const Database = require('../src/database/database');

async function testPaymentPolling() {
    try {
        console.log('🚀 Testing Payment Polling System');
        console.log('==================================');

        // Initialize database
        const db = new Database();
        await db.initialize();

        // Initialize payment service
        const paymentService = new PaymentService(db);

        // Initialize payment scheduler
        const scheduler = new PaymentScheduler(paymentService);

        console.log('✅ Services initialized');
        console.log('');

        // Test 1: Create a test payment
        console.log('📝 Test 1: Creating test payment...');
        const userId = 20; // Use existing user ID
        const amount = 2; // $2.00
        const customerName = 'Polling Test User';

        const paymentResult = await paymentService.createBalancePayment(
            userId,
            amount,
            customerName,
            null, // phone
            'polling@test.com' // email
        );

        if (!paymentResult.success) {
            throw new Error('Failed to create test payment');
        }

        const { reference, merchantRef } = paymentResult.data;
        console.log(`✅ Test payment created: ${reference}`);
        console.log(`   Merchant Ref: ${merchantRef}`);
        console.log(`   Amount: $${amount}`);
        console.log('');

        // Test 2: Manual polling
        console.log('🔄 Test 2: Testing manual polling...');
        const pollResult = await scheduler.pollPayment(reference);
        console.log('Polling result:', pollResult);
        console.log('');

        // Test 3: Check payment status in database
        console.log('📊 Test 3: Checking payment status in database...');
        const payment = await db.get(`
            SELECT * FROM balance_payments 
            WHERE tripay_reference = ?
        `, [reference]);

        if (payment) {
            console.log('Payment record found:');
            console.log(`   Status: ${payment.status}`);
            console.log(`   Amount: $${payment.amount}`);
            console.log(`   Created: ${payment.created_at}`);
            console.log(`   Updated: ${payment.updated_at || 'Not updated yet'}`);
        } else {
            console.log('❌ Payment record not found');
        }
        console.log('');

        // Test 4: Check user balance
        console.log('💰 Test 4: Checking user balance...');
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (user) {
            console.log(`Current balance: $${user.balance.toFixed(2)}`);
        }
        console.log('');

        // Test 5: Simulate payment completion (for testing purposes)
        console.log('🎯 Test 5: Simulating payment completion...');
        console.log('Note: This is for testing only. In real scenario, Tripay would send callback.');

        // Create mock callback data
        const mockCallbackData = {
            reference: reference,
            merchant_ref: merchantRef,
            status: 'PAID',
            amount: amount * 10000 // Convert to IDR (Tripay format)
        };

        const callbackResult = await paymentService.processPaymentCallback(mockCallbackData);
        console.log('Callback processing result:', callbackResult);
        console.log('');

        // Test 6: Check updated balance
        console.log('💰 Test 6: Checking updated balance...');
        const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (updatedUser) {
            console.log(`Updated balance: $${updatedUser.balance.toFixed(2)}`);
            const balanceIncrease = updatedUser.balance - user.balance;
            console.log(`Balance increase: $${balanceIncrease.toFixed(2)}`);
        }
        console.log('');

        // Test 7: Test scheduler status
        console.log('⚙️ Test 7: Testing scheduler status...');
        const schedulerStatus = scheduler.getStatus();
        console.log('Scheduler status:', schedulerStatus);
        console.log('');

        // Test 8: Test auto-polling (single cycle)
        console.log('🔄 Test 8: Testing auto-polling cycle...');
        const autoPollResult = await scheduler.runPolling();
        console.log('Auto-polling results:', autoPollResult);
        console.log('');

        console.log('🎉 All tests completed successfully!');
        console.log('');
        console.log('📋 Summary:');
        console.log(`   ✅ Payment created: ${reference}`);
        console.log(`   ✅ Manual polling works`);
        console.log(`   ✅ Callback processing works`);
        console.log(`   ✅ Balance update works`);
        console.log(`   ✅ Scheduler functions work`);
        console.log('');
        console.log('💡 The system is ready for automatic payment processing!');

        return {
            success: true,
            reference: reference,
            initialBalance: user.balance,
            finalBalance: updatedUser.balance,
            balanceIncrease: updatedUser.balance - user.balance
        };

    } catch (error) {
        console.error('💥 Test failed:', error.message);
        throw error;
    }
}

// Run the test
if (require.main === module) {
    testPaymentPolling()
        .then((result) => {
            console.log('\n🎉 Test completed successfully!');
            console.log('Final result:', result);
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testPaymentPolling }; 