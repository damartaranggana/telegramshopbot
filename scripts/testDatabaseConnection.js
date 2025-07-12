/**
 * Test Database Connection and Payment Service
 * Verifies that the database connection and payment service work correctly
 */

const Database = require('../src/database/database');
const PaymentService = require('../src/services/paymentService');

async function testDatabaseConnection() {
    try {
        console.log('🧪 Testing Database Connection and Payment Service');
        console.log('==================================================');

        // Test 1: Initialize database
        console.log('📊 Test 1: Initializing database...');
        const db = new Database();
        await db.initialize();
        console.log('✅ Database initialized successfully');
        console.log('');

        // Test 2: Check database connection
        console.log('🔗 Test 2: Testing database connection...');
        const testQuery = await db.get('SELECT 1 as test');
        console.log('✅ Database connection test result:', testQuery);
        console.log('');

        // Test 3: Initialize payment service
        console.log('💳 Test 3: Initializing payment service...');
        const paymentService = new PaymentService(db);
        console.log('✅ Payment service initialized successfully');
        console.log('');

        // Test 4: Test payment service database access
        console.log('📋 Test 4: Testing payment service database access...');
        const pendingPayments = await paymentService.db.all(`
            SELECT COUNT(*) as count FROM balance_payments 
            WHERE status IN ('PENDING', 'UNPAID')
        `);
        console.log('✅ Payment service database access test:', pendingPayments);
        console.log('');

        // Test 5: Test pollAllPendingPayments method
        console.log('🔄 Test 5: Testing pollAllPendingPayments method...');
        const pollResults = await paymentService.pollAllPendingPayments();
        console.log('✅ Polling test completed:', pollResults.length, 'payments processed');
        console.log('');

        console.log('🎉 All tests passed! Database and payment service are working correctly.');
        console.log('');
        console.log('📋 Summary:');
        console.log('   ✅ Database connection works');
        console.log('   ✅ Payment service initialization works');
        console.log('   ✅ Database queries work');
        console.log('   ✅ Polling method works');
        console.log('');
        console.log('🚀 The system is ready to run!');

        return {
            success: true,
            databaseConnected: true,
            paymentServiceWorking: true,
            pendingPaymentsCount: pendingPayments[0]?.count || 0
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
    testDatabaseConnection()
        .then((result) => {
            if (result.success) {
                console.log('\n🎉 Database connection test completed successfully!');
                process.exit(0);
            } else {
                console.log('\n💥 Database connection test failed!');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('\n💥 Test error:', error);
            process.exit(1);
        });
}

module.exports = { testDatabaseConnection }; 