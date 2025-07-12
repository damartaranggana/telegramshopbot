/**
 * Payment Scheduler Service
 * Handles automatic payment status polling and updates
 */

class PaymentScheduler {
    constructor(paymentService) {
        this.paymentService = paymentService;
        this.pollingInterval = null;
        this.isRunning = false;
    }

    /**
     * Start automatic polling
     * @param {number} intervalMinutes - Polling interval in minutes (default: 5)
     */
    startPolling(intervalMinutes = 5) {
        if (this.isRunning) {
            console.log('Payment polling is already running');
            return;
        }

        console.log(`Starting payment polling every ${intervalMinutes} minutes`);
        this.isRunning = true;

        // Run initial poll
        this.runPolling();

        // Set up interval
        this.pollingInterval = setInterval(() => {
            this.runPolling();
        }, intervalMinutes * 60 * 1000);
    }

    /**
     * Stop automatic polling
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isRunning = false;
        console.log('Payment polling stopped');
    }

    /**
     * Run a single polling cycle
     */
    async runPolling() {
        try {
            console.log('🔄 Running payment status polling...');
            const results = await this.paymentService.pollAllPendingPayments();

            // Log results
            const successful = results.filter(r => r.result && r.result.success);
            const failed = results.filter(r => r.error || (r.result && !r.result.success));

            console.log(`📊 Polling results: ${successful.length} successful, ${failed.length} failed`);

            if (failed.length > 0) {
                console.log('❌ Failed payments:', failed);
            }

            return results;
        } catch (error) {
            console.error('💥 Error in payment polling:', error);
            return [];
        }
    }

    /**
     * Manually poll a specific payment
     * @param {string} reference - Payment reference
     */
    async pollPayment(reference) {
        try {
            console.log(`🔍 Manually polling payment: ${reference}`);
            const result = await this.paymentService.pollPaymentStatus(reference);
            console.log('Polling result:', result);
            return result;
        } catch (error) {
            console.error('Error manually polling payment:', error);
            throw error;
        }
    }

    /**
     * Get polling status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            hasInterval: !!this.pollingInterval
        };
    }
}

module.exports = PaymentScheduler; 