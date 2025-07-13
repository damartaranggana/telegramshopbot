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
     * @param {number} amount - Amount to add to balance (in IDR)
     * @param {string} customerName - Customer name
     * @param {string} customerPhone - Customer phone (optional)
     * @param {string} customerEmail - Customer email (optional)
     * @returns {Promise<Object>} - Payment transaction result
     */
    async createBalancePayment(userId, amount, customerName, customerPhone = null, customerEmail = null) {
        try {
            // Generate unique merchant reference
            const merchantRef = generateMerchantRef('BAL');

            // Amount is already in IDR, no conversion needed
            const amountIdr = Math.round(amount);

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
                        name: `Balance Top Up (Rp ${amount.toLocaleString()})`,
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

            // Store payment record in database (amount in IDR)
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
                amount, // Store IDR amount for balance
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
                    amount: amount, // IDR
                    amountIdr: amountIdr, // IDR (same as amount)
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
                    amount: payment.amount
                };

                // Process the status change
                const result = await this.processPaymentCallback(callbackData);

                return {
                    success: true,
                    message: 'Payment status updated',
                    data: {
                        status: tripayStatus,
                        reference,
                        previousStatus: payment.status,
                        ...result.data
                    }
                };
            }

            return {
                success: true,
                message: 'Payment status unchanged',
                data: { status: tripayStatus, reference }
            };

        } catch (error) {
            console.error('Error polling payment status:', error);
            return { success: false, message: 'Error polling payment status', error: error.message };
        }
    }

    /**
     * Poll all pending payments and update their status
     * @returns {Promise<Array>} - Array of updated payments
     */
    async pollAllPendingPayments() {
        try {
            console.log('Polling all pending payments...');

            // Get all pending payments
            const pendingPayments = await this.db.all(`
                SELECT * FROM balance_payments 
                WHERE status IN ('PENDING', 'UNPAID')
                ORDER BY created_at ASC
            `);

            console.log(`Found ${pendingPayments.length} pending payments`);

            const results = [];

            for (const payment of pendingPayments) {
                try {
                    const result = await this.pollPaymentStatus(payment.tripay_reference);
                    if (result.success && result.data.status !== payment.status) {
                        results.push({
                            reference: payment.tripay_reference,
                            oldStatus: payment.status,
                            newStatus: result.data.status,
                            ...result.data
                        });
                    }
                } catch (error) {
                    console.error(`Error polling payment ${payment.tripay_reference}:`, error);
                }
            }

            console.log(`Updated ${results.length} payments`);
            return results;

        } catch (error) {
            console.error('Error polling all pending payments:', error);
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
            // Get from local database first
            const payment = await this.db.get(`
                SELECT * FROM balance_payments 
                WHERE tripay_reference = ?
            `, [reference]);

            if (!payment) {
                return { success: false, message: 'Payment not found' };
            }

            // If payment is already paid, return local status
            if (payment.status === 'PAID') {
                return {
                    success: true,
                    data: {
                        status: payment.status,
                        reference,
                        amount: payment.amount,
                        created_at: payment.created_at
                    }
                };
            }

            // Otherwise, poll from Tripay
            return await this.pollPaymentStatus(reference);

        } catch (error) {
            console.error('Error getting payment status:', error);
            return { success: false, message: 'Error getting payment status', error: error.message };
        }
    }

    /**
     * Get user payment history
     * @param {number} userId - User ID
     * @param {number} limit - Number of records to return
     * @returns {Promise<Array>} - Payment history
     */
    async getUserPaymentHistory(userId, limit = 10) {
        try {
            return await this.db.all(`
                SELECT * FROM balance_payments 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            `, [userId, limit]);
        } catch (error) {
            console.error('Error getting user payment history:', error);
            return [];
        }
    }

    /**
     * Get available payment methods
     * @returns {Promise<Object>} - Payment methods configuration
     */
    async getPaymentMethods() {
        try {
            const config = await this.db.getPaymentMethodConfig();
            return {
                default: config ? config.default_method : 'QRIS',
                available: config ? JSON.parse(config.available_methods || '["QRIS"]') : ['QRIS']
            };
        } catch (error) {
            console.error('Error getting payment methods:', error);
            return {
                default: 'QRIS',
                available: ['QRIS']
            };
        }
    }
}

module.exports = PaymentService; 