/**
 * Payment Routes
 * Express routes for Tripay payment gateway integration
 */

const express = require('express');
const router = express.Router();
const tripayService = require('../services/tripayService');
const { verifyCallbackSignature } = require('../utils/tripaySignature');

// Global variable to store bot instance (will be set from main app)
let botInstance = null;
let paymentServiceInstance = null;

// Function to set bot instance (called from main app)
const setBotInstance = (bot, paymentService) => {
    botInstance = bot;
    paymentServiceInstance = paymentService;
};

/**
 * POST /api/payment
 * Create a new payment transaction
 * 
 * Request Body:
 * {
 *   "method": "BRIVA",
 *   "amount": 100000,
 *   "customer_name": "John Doe",
 *   "customer_email": "john@example.com",
 *   "customer_phone": "08123456789",
 *   "order_items": [
 *     {
 *       "name": "Product Name",
 *       "price": 100000,
 *       "quantity": 1
 *     }
 *   ],
 *   "return_url": "https://yourdomain.com/payment/success",
 *   "expired_time": 24
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "reference": "TRX123456789",
 *     "merchant_ref": "TXN_1234567890_ABC123",
 *     "payment_url": "https://tripay.co.id/payment/TRX123456789",
 *     "qr_url": "https://tripay.co.id/qr/TRX123456789",
 *     "amount": 100000,
 *     "fee_merchant": 0,
 *     "fee_customer": 0,
 *     "total_fee": 0,
 *     "amount_fee": 100000,
 *     "status": "UNPAID"
 *   }
 * }
 */
router.post('/payment', async (req, res) => {
    try {
        const {
            method,
            amount,
            customer_name,
            customer_email,
            customer_phone,
            order_items,
            return_url,
            expired_time
        } = req.body;

        // Validate required fields
        if (!method || !amount || !customer_name || !order_items) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: method, amount, customer_name, order_items'
            });
        }

        // Generate unique merchant reference
        const merchant_ref = tripayService.generateMerchantRef();

        // Prepare transaction data
        const transactionData = {
            method,
            merchant_ref,
            amount,
            customer_name,
            customer_email,
            customer_phone,
            order_items,
            return_url,
            expired_time: expired_time || Math.floor(Date.now() / 1000) + (24 * 60 * 60) // Current timestamp + 24 hours
        };

        console.log('Creating payment transaction:', {
            merchant_ref,
            amount,
            method,
            customer_name
        });

        // Create transaction in Tripay
        const tripayResponse = await tripayService.createTransaction(transactionData);

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Payment transaction created successfully',
            data: tripayResponse.data
        });

    } catch (error) {
        console.error('Payment creation error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Failed to create payment transaction',
            error: error.message
        });
    }
});

/**
 * POST /api/payment/callback
 * Handle payment callback from Tripay
 * 
 * Callback Data:
 * {
 *   "reference": "TRX123456789",
 *   "merchant_ref": "TXN_1234567890_ABC123",
 *   "status": "PAID",
 *   "amount": 100000,
 *   "signature": "abc123def456..."
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Callback processed successfully"
 * }
 */
router.post('/payment/callback', async (req, res) => {
    try {
        const callbackData = req.body;
        const signature = req.headers['x-callback-signature'];

        console.log('Received payment callback:', {
            reference: callbackData.reference,
            merchant_ref: callbackData.merchant_ref,
            status: callbackData.status,
            amount: callbackData.amount
        });

        // Validate callback data
        if (!callbackData.reference || !callbackData.merchant_ref || !callbackData.status) {
            console.error('Invalid callback data received');
            return res.status(400).json({
                success: false,
                message: 'Invalid callback data'
            });
        }

        // Verify callback signature for security
        if (!signature) {
            console.error('Missing callback signature');
            return res.status(400).json({
                success: false,
                message: 'Missing callback signature'
            });
        }

        const isSignatureValid = verifyCallbackSignature(callbackData, signature);

        if (!isSignatureValid) {
            console.error('Invalid callback signature');
            return res.status(400).json({
                success: false,
                message: 'Invalid callback signature'
            });
        }

        // Process the callback using payment service
        if (paymentServiceInstance) {
            try {
                const result = await paymentServiceInstance.processPaymentCallback(callbackData);

                // Notify user via bot if available
                if (botInstance && result.success && result.data.userId) {
                    const user = await paymentServiceInstance.db.get('SELECT telegram_id FROM users WHERE id = ?', [result.data.userId]);

                    if (user && user.telegram_id) {
                        const status = callbackData.status;
                        let message = '';

                        switch (status) {
                            case 'PAID':
                                message = `
✅ *Payment Completed Successfully!*

💰 *Amount:* $${(callbackData.amount / 100).toFixed(2)}
🔢 *Reference:* \`${callbackData.reference}\`

Your balance has been updated! You can now use it to purchase products.

🛍️ Use /shop to browse products
💰 Use /balance to check your balance
                `;
                                break;

                            case 'EXPIRED':
                                message = `
⏰ *Payment Expired*

🔢 *Reference:* \`${callbackData.reference}\`

Your payment has expired. Please create a new payment to add balance.

💰 Use /deposit to create a new payment
                `;
                                break;

                            case 'FAILED':
                                message = `
❌ *Payment Failed*

🔢 *Reference:* \`${callbackData.reference}\`

Your payment was unsuccessful. Please try again.

💰 Use /deposit to create a new payment
                `;
                                break;
                        }

                        if (message) {
                            const keyboard = {
                                inline_keyboard: [
                                    [{ text: '🛍️ Shop Now', callback_data: 'shop' }],
                                    [{ text: '💰 My Balance', callback_data: 'balance' }],
                                    [{ text: '🏠 Back to Menu', callback_data: 'start' }]
                                ]
                            };

                            await botInstance.sendMessage(user.telegram_id, message, {
                                parse_mode: 'Markdown',
                                reply_markup: keyboard
                            });
                        }
                    }
                }

                console.log('Payment callback processed:', result);
            } catch (error) {
                console.error('Error processing payment callback:', error);
            }
        } else {
            console.log('Payment service not available for callback processing');
        }

        // Return success response to Tripay
        res.status(200).json({
            success: true,
            message: 'Callback processed successfully'
        });

    } catch (error) {
        console.error('Callback processing error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Failed to process callback',
            error: error.message
        });
    }
});

/**
 * GET /api/payment/:reference
 * Get transaction status by reference
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "reference": "TRX123456789",
 *     "merchant_ref": "TXN_1234567890_ABC123",
 *     "status": "PAID",
 *     "amount": 100000,
 *     "payment_method": "BRIVA",
 *     "customer_name": "John Doe",
 *     "created_at": "2023-12-01T10:00:00Z",
 *     "paid_at": "2023-12-01T10:30:00Z"
 *   }
 * }
 */
router.get('/payment/:reference', async (req, res) => {
    try {
        const { reference } = req.params;

        if (!reference) {
            return res.status(400).json({
                success: false,
                message: 'Transaction reference is required'
            });
        }

        console.log('Checking transaction status for reference:', reference);

        // Get transaction details from Tripay
        const tripayResponse = await tripayService.getTransactionDetail(reference);

        // Return transaction details
        res.status(200).json({
            success: true,
            message: 'Transaction details retrieved successfully',
            data: tripayResponse.data
        });

    } catch (error) {
        console.error('Transaction status check error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Failed to get transaction status',
            error: error.message
        });
    }
});

/**
 * GET /api/payment/channels
 * Get available payment channels
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "group": "Virtual Account",
 *       "code": "BRIVA",
 *       "name": "BRI Virtual Account",
 *       "type": "virtual_account",
 *       "logo_url": "https://tripay.co.id/logo/briva.png",
 *       "minimum_amount": 10000,
 *       "maximum_amount": 100000000
 *     }
 *   ]
 * }
 */
router.get('/payment/channels', async (req, res) => {
    try {
        console.log('Fetching available payment channels');

        // Get payment channels from Tripay
        const tripayResponse = await tripayService.getPaymentChannels();

        // Return payment channels
        res.status(200).json({
            success: true,
            message: 'Payment channels retrieved successfully',
            data: tripayResponse.data
        });

    } catch (error) {
        console.error('Payment channels fetch error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Failed to get payment channels',
            error: error.message
        });
    }
});

module.exports = {
    router,
    setBotInstance
}; 