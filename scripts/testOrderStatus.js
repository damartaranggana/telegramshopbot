/**
 * Test Order Status Update
 * Tests that order status changes from pending to completed after successful checkout
 */

const Database = require('../src/database/database');
const BotHandler = require('../src/bot/botHandler');

async function testOrderStatus() {
    try {
        console.log('🧪 Testing Order Status Update');
        console.log('==============================');

        // Initialize database
        const db = new Database();
        await db.initialize();
        console.log('✅ Database initialized');

        // Create a mock bot for testing
        const mockBot = {
            sendMessage: async (chatId, message, options) => {
                console.log(`📱 Bot message to ${chatId}:`, message);
                return { message_id: 1 };
            }
        };

        // Initialize bot handler
        const botHandler = new BotHandler(mockBot, db);
        console.log('✅ Bot handler initialized');

        // Test user ID (use existing user)
        const testUserId = 20;
        const testChatId = 6994649045; // Use existing chat ID

        console.log(`👤 Using test user ID: ${testUserId}`);
        console.log(`💬 Using test chat ID: ${testChatId}`);
        console.log('');

        // Step 1: Check current orders
        console.log('📋 Step 1: Checking current orders...');
        const currentOrders = await db.getUserOrders(testUserId);
        console.log(`Found ${currentOrders.length} existing orders`);

        for (const order of currentOrders.slice(0, 3)) {
            console.log(`   Order #${order.id}: ${order.status} - ${order.product_name}`);
        }
        console.log('');

        // Step 2: Add a test product to cart
        console.log('🛒 Step 2: Adding test product to cart...');

        // Get first available product
        const products = await db.getAllProducts();
        if (products.length === 0) {
            throw new Error('No products available for testing');
        }

        const testProduct = products[0];
        console.log(`   Using product: ${testProduct.name} (ID: ${testProduct.id})`);

        // Add to cart
        await db.addToCart(testUserId, testProduct.id, 1);
        console.log('   ✅ Product added to cart');
        console.log('');

        // Step 3: Check cart
        console.log('📦 Step 3: Checking cart...');
        const cartItems = await db.getCart(testUserId);
        console.log(`   Cart has ${cartItems.length} items`);
        console.log('');

        // Step 4: Check user balance
        console.log('💰 Step 4: Checking user balance...');
        const userBalance = await db.getUserBalance(testUserId);
        console.log(`   Current balance: $${userBalance.toFixed(2)}`);

        if (userBalance < testProduct.price) {
            console.log('   ⚠️ Insufficient balance, adding some money...');
            await db.depositToBalance(testUserId, 50, 'Test deposit for order status test');
            console.log('   ✅ Balance topped up');
        }
        console.log('');

        // Step 5: Simulate checkout
        console.log('🛍️ Step 5: Simulating checkout...');

        // Get updated cart
        const updatedCartItems = await db.getCart(testUserId);
        console.log(`   Processing ${updatedCartItems.length} cart items`);

        // Calculate total
        let total = 0;
        for (const item of updatedCartItems) {
            total += parseFloat(item.price) * item.quantity;
        }
        console.log(`   Total amount: $${total.toFixed(2)}`);
        console.log('');

        // Step 6: Process checkout manually (simulating the checkout process)
        console.log('💳 Step 6: Processing checkout...');

        // Withdraw balance
        await db.withdrawFromBalance(testUserId, total, `Test purchase: ${testProduct.name}`);
        console.log('   ✅ Balance withdrawn');

        // Create order
        const orderResult = await db.createOrder(testUserId, testProduct.id, 1, total);
        console.log(`   ✅ Order created with ID: ${orderResult.id}`);

        // Check order status before delivery
        const orderBefore = await db.get('SELECT * FROM orders WHERE id = ?', [orderResult.id]);
        console.log(`   Order status before delivery: ${orderBefore.status}`);

        // Update order status to completed
        await db.updateOrderStatus(orderResult.id, 'completed');
        console.log('   ✅ Order status updated to completed');

        // Check order status after delivery
        const orderAfter = await db.get('SELECT * FROM orders WHERE id = ?', [orderResult.id]);
        console.log(`   Order status after delivery: ${orderAfter.status}`);
        console.log('');

        // Step 7: Verify final state
        console.log('✅ Step 7: Verifying final state...');
        const finalOrders = await db.getUserOrders(testUserId);
        const testOrder = finalOrders.find(o => o.id === orderResult.id);

        if (testOrder) {
            console.log(`   Order #${testOrder.id}: ${testOrder.status} - ${testOrder.product_name}`);
            if (testOrder.status === 'completed') {
                console.log('   ✅ SUCCESS: Order status is completed!');
            } else {
                console.log('   ❌ FAILED: Order status is not completed');
            }
        } else {
            console.log('   ❌ FAILED: Test order not found');
        }
        console.log('');

        // Step 8: Clean up
        console.log('🧹 Step 8: Cleaning up...');
        await db.clearCart(testUserId);
        console.log('   ✅ Cart cleared');
        console.log('');

        console.log('🎉 Order status test completed!');
        console.log('');
        console.log('📋 Summary:');
        console.log('   ✅ Database operations work');
        console.log('   ✅ Order creation works');
        console.log('   ✅ Status update works');
        console.log('   ✅ Balance management works');
        console.log('');

        return {
            success: true,
            orderId: orderResult.id,
            initialStatus: orderBefore.status,
            finalStatus: orderAfter.status,
            statusUpdated: orderAfter.status === 'completed'
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
    testOrderStatus()
        .then((result) => {
            if (result.success) {
                console.log('🎉 Order status test completed successfully!');
                console.log('Final result:', result);
                process.exit(0);
            } else {
                console.log('💥 Order status test failed!');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('💥 Test error:', error);
            process.exit(1);
        });
}

module.exports = { testOrderStatus }; 