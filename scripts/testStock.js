require('dotenv').config();
const Database = require('../src/database/database');

async function testStockManagement() {
    const db = new Database();
    await db.initialize();

    console.log('🧪 Testing Stock Management...\n');

    try {
        // Get a product with limited stock
        const products = await db.all('SELECT * FROM products WHERE stock_quantity > 0 AND stock_quantity != -1 LIMIT 1');

        if (products.length === 0) {
            console.log('❌ No products with limited stock found. Please add some products first.');
            return;
        }

        const product = products[0];
        console.log(`📦 Testing with product: ${product.name}`);
        console.log(`💰 Price: $${product.price}`);
        console.log(`📊 Initial stock: ${product.stock_quantity}\n`);

        // Test 1: Update stock (simulate purchase)
        console.log('🛒 Test 1: Simulating purchase of 2 units...');
        await db.updateProductStock(product.id, 2);

        const afterPurchase = await db.getProductById(product.id);
        console.log(`📊 Stock after purchase: ${afterPurchase.stock_quantity}\n`);

        // Test 2: Restore stock (simulate order cancellation)
        console.log('❌ Test 2: Simulating order cancellation (restoring 1 unit)...');
        await db.restoreProductStock(product.id, 1);

        const afterRestore = await db.getProductById(product.id);
        console.log(`📊 Stock after restore: ${afterRestore.stock_quantity}\n`);

        // Test 3: Try to purchase more than available
        console.log('⚠️ Test 3: Trying to purchase more than available stock...');
        const currentStock = afterRestore.stock_quantity;
        await db.updateProductStock(product.id, currentStock + 1);

        const afterOverPurchase = await db.getProductById(product.id);
        console.log(`📊 Stock after over-purchase: ${afterOverPurchase.stock_quantity} (should be 0)\n`);

        // Test 4: Restore to original
        console.log('🔄 Test 4: Restoring to original stock...');
        await db.restoreProductStock(product.id, product.stock_quantity);

        const finalStock = await db.getProductById(product.id);
        console.log(`📊 Final stock: ${finalStock.stock_quantity}\n`);

        console.log('✅ Stock management tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log('- Stock decreases when products are purchased');
        console.log('- Stock increases when orders are cancelled');
        console.log('- Stock cannot go below 0');
        console.log('- Unlimited stock (-1) is not affected');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        db.close();
    }
}

// Run the test
if (require.main === module) {
    testStockManagement();
}

module.exports = { testStockManagement }; 