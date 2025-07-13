/**
 * Test Bot Payment Handler
 * Tests the bot payment creation without actually sending Telegram messages
 */

const PaymentService = require('../src/services/paymentService');
const Database = require('../src/database/database');

async function testBotPayment() {
    try {
        console.log('🚀 Testing Bot Payment Handler');
        console.log('==============================');

        // Initialize database
        const db = new Database();
        await db.initialize();

        // Initialize payment service
        const paymentService = new PaymentService(db);

        // Test payment data
        const userId = 20; // Use existing user ID
        const amount = 10000; // Rp 10.000
        const customerName = 'Test User';

        console.log('📝 Test Data:');
        console.log(`User ID: ${userId}`);
        console.log(`Amount: Rp ${amount.toLocaleString()}`);
        console.log(`Customer Name: ${customerName}`);
        console.log('');

        // Create payment
        console.log('💳 Creating payment...');
        const paymentResult = await paymentService.createBalancePayment(
            userId,
            amount,
            customerName,
            null, // phone
            'test@example.com' // email
        );

        if (paymentResult.success) {
            const { reference, paymentUrl, qrUrl, merchantRef } = paymentResult.data;

            console.log('✅ Payment created successfully!');
            console.log(`Reference: ${reference}`);
            console.log(`Merchant Ref: ${merchantRef}`);
            console.log(`Payment URL: ${paymentUrl || 'Not available'}`);
            console.log(`QR URL: ${qrUrl || 'Not available'}`);
            console.log('');

            // Test the message and keyboard creation (without sending)
            const message = `
💳 *Payment Created Successfully!*

💰 *Amount:* Rp ${amount.toLocaleString()}
🔢 *Reference:* \`${reference}\`
🏷️ *Merchant Ref:* \`${merchantRef}\`

*Payment Instructions:*
1. Scan the QR code below
2. Choose your payment method
3. Complete the payment
4. Your balance will be updated automatically

*QR Code:* ${qrUrl}

⏰ *Expires in:* 24 hours
            `;

            // Create keyboard based on available URLs
            const keyboardButtons = [];

            // Add QR Code button if available
            if (qrUrl) {
                keyboardButtons.push([{ text: '📱 QR Code', url: qrUrl }]);
            }

            // Add other buttons
            keyboardButtons.push(
                [{ text: '📋 Check Status', callback_data: `check_payment_${reference}` }],
                [{ text: '📋 Payment History', callback_data: 'payment_history' }],
                [{ text: '🏠 Back to Menu', callback_data: 'start' }]
            );

            const keyboard = {
                inline_keyboard: keyboardButtons
            };

            console.log('📱 Message Preview:');
            console.log(message);
            console.log('');
            console.log('⌨️ Keyboard Preview:');
            console.log(JSON.stringify(keyboard, null, 2));
            console.log('');

            // Validate keyboard structure
            let isValid = true;
            for (const row of keyboard.inline_keyboard) {
                for (const button of row) {
                    if (button.url && !button.url.startsWith('http')) {
                        console.log(`❌ Invalid URL in button "${button.text}": ${button.url}`);
                        isValid = false;
                    }
                }
            }

            if (isValid) {
                console.log('✅ Keyboard structure is valid!');
            } else {
                console.log('❌ Keyboard structure has issues!');
            }

            return paymentResult;

        } else {
            console.log('❌ Payment creation failed');
            return paymentResult;
        }

    } catch (error) {
        console.error('💥 Error:', error.message);
        throw error;
    }
}

// Run the test
if (require.main === module) {
    testBotPayment()
        .then(() => {
            console.log('\n🎉 Test completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testBotPayment }; 