/**
 * Payment Service for Telegram Bot
 * Integrates Tripay payment gateway with the bot for balance purchases
 */

const tripayService = require('./tripayService');
const { generateMerchantRef } = require('./tripayService');

class PaymentService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Create a payment transaction for balance purchase
     * @param {number} userId - User ID from database
     * @param {number} amount - Amount to add to balance
     * @param {string} customerName - Customer name
     * @param {string} customerPhone - Customer phone (optional)
     * @param {string} customerEmail - Customer email (optional)
     * @returns {Promise<Object>} - Payment transaction result
     */
    async createBalancePayment(userId, amount, customerName, customerPhone = null, customerEmail = null) {
        try {
            // Generate unique merchant reference
            const merchantRef = generateMerchantRef('BAL');

            // Convert USD to IDR (fixed rate)
            const USD_TO_IDR = 10000;
            const amountIdr = Math.round(amount * USD_TO_IDR);

            // Get default payment method from configuration
            const paymentConfig = await this.db.getPaymentMethodConfig();
            const defaultMethod = paymentConfig ? paymentConfig.default_method : 'QRIS';

            // Prepare transaction data for Tripay
            const transactionData = {
                method: defaultMethod, // Use configured default payment method
                merchant_ref: merchantRef, // Add the merchant reference
                amount: amountIdr, // Amount in IDR
                customer_name: customerName,
                customer_email: customerEmail || `${customerName.toLowerCase().replace(/\s+/g, '')}@example.com`,
                customer_phone: customerPhone,
                order_items: [
                    {
                        name: `Balance Top Up ($${amount.toFixed(2)})`,
                        price: amountIdr, // Price in IDR
                        quantity: 1
                    }
                ],
                return_url: `${process.env.BASE_URL || 'http://localhost:3000'}/payment/success`,
                expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // Current timestamp + 24 hours
            };

            console.log('Creating balance payment:', {
                userId,
                amount,
                merchantRef,
                customerName,
                paymentMethod: defaultMethod
            });

            // Create transaction in Tripay
            const tripayResponse = await tripayService.createTransaction(transactionData);

            // Store payment record in database (amount in USD)
            await this.db.run(`
                INSERT INTO balance_payments (
                    user_id, 
                    merchant_ref, 
                    tripay_reference, 
                    amount, 
                    status, 
                    payment_url,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
                userId,
                merchantRef,
                tripayResponse.data.reference,
                amount, // Store USD amount for balance
                'PENDING',
                tripayResponse.data.payment_url
            ]);

            return {
                success: true,
                data: {
                    reference: tripayResponse.data.reference,
                    merchantRef: merchantRef,
                    paymentUrl: tripayResponse.data.payment_url || tripayResponse.data.qr_url, // Use qr_url as fallback for QRIS
                    qrUrl: tripayResponse.data.qr_url,
                    amount: amount, // USD
                    amountIdr: amountIdr, // IDR
                    status: 'PENDING'
                }
            };

        } catch (error) {
            console.error('Error creating balance payment:', error);
            throw error;
        }
    }

    /**
     * Process payment callback from Tripay
     * @param {Object} callbackData - Callback data from Tripay
     * @returns {Promise<Object>} - Processing result
     */
    async processPaymentCallback(callbackData) {
        try {
            const { reference, merchant_ref, status, amount } = callbackData;

            console.log('Processing payment callback:', {
                reference,
                merchant_ref,
                status,
                amount
            });

            // Find payment record
            const payment = await this.db.get(`
                SELECT * FROM balance_payments 
                WHERE tripay_reference = ? OR merchant_ref = ?
            `, [reference, merchant_ref]);

            if (!payment) {
                console.error('Payment record not found:', { reference, merchant_ref });
                return { success: false, message: 'Payment record not found' };
            }

            // Check if payment was already processed
            if (payment.status === 'PAID') {
                console.log('Payment already processed:', { reference, status: payment.status });
                return {
                    success: true,
                    message: 'Payment already processed',
                    data: { userId: payment.user_id, amount: payment.amount, reference }
                };
            }

            // Update payment status
            await this.db.run(`
                UPDATE balance_payments 
                SET status = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [status, payment.id]);

            console.log('Payment status updated:', { reference, status });

            // If payment is successful, add balance to user account
            if (status === 'PAID') {
                const user = await this.db.get('SELECT * FROM users WHERE id = ?', [payment.user_id]);
                if (user) {
                    // Add balance to user account
                    await this.db.depositToBalance(
                        payment.user_id,
                        payment.amount,
                        `Balance top up via Tripay (${reference})`
                    );

                    console.log('Balance added successfully:', {
                        userId: payment.user_id,
                        amount: payment.amount,
                        reference,
                        newBalance: user.balance + payment.amount
                    });

                    return {
                        success: true,
                        message: 'Payment processed successfully',
                        data: {
                            userId: payment.user_id,
                            amount: payment.amount,
                            reference,
                            newBalance: user.balance + payment.amount
                        }
                    };
                } else {
                    console.error('User not found for payment:', { userId: payment.user_id, reference });
                    return { success: false, message: 'User not found' };
                }
            }

            return {
                success: true,
                message: `Payment status updated to ${status}`,
                data: { status, reference }
            };

        } catch (error) {
            console.error('Error processing payment callback:', error);
            throw error;
        }
    }

    /**
     * Poll payment status and update automatically
     * @param {string} reference - Tripay reference
     * @returns {Promise<Object>} - Polling result
     */
    async pollPaymentStatus(reference) {
        try {
            console.log('Polling payment status for reference:', reference);

            // Get payment from local database
            const payment = await this.db.get(`
                SELECT * FROM balance_payments 
                WHERE tripay_reference = ?
            `, [reference]);

            if (!payment) {
                console.error('Payment record not found for polling:', reference);
                return { success: false, message: 'Payment record not found' };
            }

            // If already paid, don't poll
            if (payment.status === 'PAID') {
                console.log('Payment already paid, skipping poll:', reference);
                return {
                    success: true,
                    message: 'Payment already processed',
                    data: { status: 'PAID', reference }
                };
            }

            // Get latest status from Tripay
            const tripayResponse = await tripayService.getTransactionDetail(reference);
            const tripayStatus = tripayResponse.data.status;

            console.log('Tripay status:', { reference, localStatus: payment.status, tripayStatus });

            // If status changed, process the update
            if (tripayStatus !== payment.status) {
                console.log('Status changed, processing update:', { reference, from: payment.status, to: tripayStatus });

                // Create callback-like data
                const callbackData = {
                    reference: reference,
                    merchant_ref: payment.merchant_ref,
                    status: tripayStatus,
                    amount: tripayResponse.data.amount
                };

                // Process the status change
                return await this.processPaymentCallback(callbackData);
            }

            return {
                success: true,
                message: 'Payment status checked',
                data: { status: tripayStatus, reference }
            };

        } catch (error) {
            console.error('Error polling payment status:', error);
            throw error;
        }
    }

    /**
     * Auto-poll all pending payments
     * This should be called periodically (e.g., every 5 minutes)
     */
    async pollAllPendingPayments() {
        try {
            console.log('Starting auto-poll for pending payments...');

            // Check if database is available
            if (!this.db || !this.db.db) {
                console.error('Database not available for polling');
                return [];
            }

            // Get all pending payments
            const pendingPayments = await this.db.all(`
                SELECT * FROM balance_payments 
                WHERE status IN ('PENDING', 'UNPAID') 
                AND created_at > datetime('now', '-24 hours')
            `);

            console.log(`Found ${pendingPayments.length} pending payments to poll`);

            const results = [];
            for (const payment of pendingPayments) {
                try {
                    const result = await this.pollPaymentStatus(payment.tripay_reference);
                    results.push({
                        reference: payment.tripay_reference,
                        result: result
                    });
                } catch (error) {
                    console.error('Error polling payment:', payment.tripay_reference, error.message);
                    results.push({
                        reference: payment.tripay_reference,
                        error: error.message
                    });
                }

                // Add delay between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log('Auto-poll completed:', results);
            return results;

        } catch (error) {
            console.error('Error in auto-poll:', error);
            return [];
        }
    }

    /**
     * Get payment status by reference
     * @param {string} reference - Tripay reference
     * @returns {Promise<Object>} - Payment status
     */
    async getPaymentStatus(reference) {
        try {
            // Get from Tripay API
            const tripayResponse = await tripayService.getTransactionDetail(reference);

            // Get from local database
            const payment = await this.db.get(`
                SELECT * FROM balance_payments 
                WHERE tripay_reference = ?
            `, [reference]);

            return {
                success: true,
                data: {
                    tripay: tripayResponse.data,
                    local: payment
                }
            };

        } catch (error) {
            console.error('Error getting payment status:', error);
            throw error;
        }
    }

    /**
     * Get user's payment history
     * @param {number} userId - User ID
     * @param {number} limit - Number of records to return
     * @returns {Promise<Array>} - Payment history
     */
    async getUserPaymentHistory(userId, limit = 10) {
        try {
            const payments = await this.db.all(`
                SELECT * FROM balance_payments 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            `, [userId, limit]);

            return payments;

        } catch (error) {
            console.error('Error getting payment history:', error);
            throw error;
        }
    }

    /**
     * Get available payment methods
     * @returns {Promise<Array>} - Available payment methods
     */
    async getPaymentMethods() {
        try {
            const response = await tripayService.getPaymentChannels();
            return response.data;

        } catch (error) {
            console.error('Error getting payment methods:', error);
            throw error;
        }
    }
}

module.exports = PaymentService; 