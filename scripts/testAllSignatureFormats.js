/**
 * Test All Signature Formats
 * Systematically tests all signature formats to find which one works with Tripay
 */

const { createTransaction } = require('../src/services/tripayService');
const { generateTransactionSignature } = require('../src/utils/tripaySignature');

async function testAllSignatureFormats() {
    console.log('🚀 Testing All Signature Formats with Tripay');
    console.log('============================================');

    const formatNames = [
        'JSON required fields',
        'merchant_ref + amount',
        'merchant_code + merchant_ref + amount',
        'key-value sorted',
        'Full JSON',
        'merchant_ref + amount + customer_name',
        'merchant_code + merchant_ref + amount + customer_name'
    ];

    // Test transaction data
    const baseTransactionData = {
        method: 'QRIS',
        merchant_ref: `SIGTEST_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        amount: 5000, // 5,000 IDR = $0.50
        customer_name: 'Signature Test',
        customer_email: 'test@example.com',
        order_items: [
            {
                name: 'Signature Test Product',
                price: 5000,
                quantity: 1
            }
        ],
        return_url: 'http://localhost:3000/payment/success',
        expired_time: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    };

    console.log('📝 Base Transaction Data:');
    console.log(JSON.stringify(baseTransactionData, null, 2));
    console.log('\n');

    const results = [];

    // Test each signature format
    for (let formatIndex = 1; formatIndex <= 7; formatIndex++) {
        console.log(`\n🔐 Testing Format ${formatIndex}: ${formatNames[formatIndex - 1]}`);
        console.log('─'.repeat(50));

        try {
            // Create a copy of transaction data with unique merchant_ref
            const transactionData = {
                ...baseTransactionData,
                merchant_ref: `${baseTransactionData.merchant_ref}_F${formatIndex}`
            };

            // Generate signature with specific format
            const signature = generateTransactionSignature(transactionData, formatIndex);

            console.log(`✅ Generated signature: ${signature}`);

            // Try to create transaction
            console.log('📡 Sending request to Tripay...');
            const result = await createTransaction(transactionData);

            console.log('✅ SUCCESS! Transaction created:');
            console.log(`   Reference: ${result.data.reference}`);
            console.log(`   Status: ${result.data.status}`);
            console.log(`   Amount: ${result.data.amount}`);

            results.push({
                formatIndex,
                formatName: formatNames[formatIndex - 1],
                success: true,
                reference: result.data.reference,
                signature: signature
            });

            // If we found a working format, we can stop here
            console.log(`\n🎉 Format ${formatIndex} (${formatNames[formatIndex - 1]}) WORKS!`);
            console.log('This is the correct signature format for Tripay.');

            return {
                workingFormat: formatIndex,
                workingFormatName: formatNames[formatIndex - 1],
                signature: signature,
                reference: result.data.reference
            };

        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);

            results.push({
                formatIndex,
                formatName: formatNames[formatIndex - 1],
                success: false,
                error: error.message
            });

            // Wait a bit before trying the next format
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // If we get here, none of the formats worked
    console.log('\n💥 SUMMARY: None of the signature formats worked');
    console.log('===============================================');

    results.forEach(result => {
        const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
        console.log(`Format ${result.formatIndex} (${result.formatName}): ${status}`);
        if (!result.success) {
            console.log(`   Error: ${result.error}`);
        }
    });

    console.log('\n💡 Recommendations:');
    console.log('1. Check your Tripay API credentials');
    console.log('2. Verify your merchant code and private key');
    console.log('3. Contact Tripay support for the correct signature format');
    console.log('4. Check Tripay documentation for any recent changes');

    return { workingFormat: null, results };
}

// Run the test
if (require.main === module) {
    testAllSignatureFormats()
        .then((result) => {
            if (result.workingFormat) {
                console.log('\n🎉 Test completed successfully!');
                console.log(`Working format: ${result.workingFormat} (${result.workingFormatName})`);
                process.exit(0);
            } else {
                console.log('\n💥 All formats failed. Check the recommendations above.');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testAllSignatureFormats }; 