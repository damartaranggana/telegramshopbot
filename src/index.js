require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

// Import our modules
const Database = require('./database/database');
const BotHandler = require('./bot/botHandler');
const AdminAPI = require('./api/adminAPI');
const { initializeDirectories } = require('./utils/fileUtils');
const PaymentScheduler = require('./services/paymentScheduler');

// Import payment routes
const { router: paymentRoutes, setBotInstance } = require('./routes/paymentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// Initialize directories
initializeDirectories();

// Initialize database and start server
async function startServer() {
    try {
        // Initialize database
        console.log('🗄️ Initializing database...');
        const db = new Database();
        await db.initialize();
        console.log('✅ Database initialized successfully');

        // Initialize Telegram bot
        console.log('🤖 Initializing Telegram bot...');
        const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
        console.log('✅ Telegram bot initialized successfully');

        // Initialize bot handler
        console.log('🎮 Initializing bot handler...');
        const botHandler = new BotHandler(bot, db);
        console.log('✅ Bot handler initialized successfully');

        // Initialize payment scheduler
        console.log('⏰ Initializing payment scheduler...');
        const paymentScheduler = new PaymentScheduler(botHandler.paymentService);
        console.log('✅ Payment scheduler initialized successfully');

        // Setup admin API routes
        const adminAPI = new AdminAPI(db);
        app.use('/api/admin', adminAPI.router);

        // Setup payment routes
        app.use('/api', paymentRoutes);

        // Set bot instance for payment callbacks
        setBotInstance(bot, botHandler.paymentService);

        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                paymentPolling: paymentScheduler.getStatus()
            });
        });

        // Payment scheduler control endpoints
        app.post('/api/payment/polling/start', (req, res) => {
            const { interval = 5 } = req.body;
            paymentScheduler.startPolling(interval);
            res.json({
                success: true,
                message: `Payment polling started with ${interval} minute interval`,
                status: paymentScheduler.getStatus()
            });
        });

        app.post('/api/payment/polling/stop', (req, res) => {
            paymentScheduler.stopPolling();
            res.json({
                success: true,
                message: 'Payment polling stopped',
                status: paymentScheduler.getStatus()
            });
        });

        app.get('/api/payment/polling/status', (req, res) => {
            res.json({
                success: true,
                status: paymentScheduler.getStatus()
            });
        });

        // Manual polling endpoint
        app.post('/api/payment/poll/:reference', async (req, res) => {
            try {
                const { reference } = req.params;
                const result = await paymentScheduler.pollPayment(reference);
                res.json({ success: true, data: result });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Webhook endpoint for Telegram (if using webhooks)
        app.post('/webhook', (req, res) => {
            bot.handleUpdate(req.body);
            res.sendStatus(200);
        });

        // Admin panel route
        app.get('/admin', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });

        // Start server
        app.listen(PORT, async () => {
            console.log(`🚀 Telegram Bot Shop Server running on port ${PORT}`);
            console.log(`📱 Bot is ready to receive messages`);
            console.log(`🔗 Admin panel available at http://localhost:${PORT}/admin`);
            console.log(`🔗 API available at http://localhost:${PORT}/api/admin`);
            console.log(`💳 Payment API available at http://localhost:${PORT}/api/payment`);

            // Start payment polling automatically
            const pollingInterval = process.env.PAYMENT_POLLING_INTERVAL || 5;
            console.log(`🔄 Starting automatic payment polling every ${pollingInterval} minutes...`);
            paymentScheduler.startPolling(parseInt(pollingInterval));
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down gracefully...');
            paymentScheduler.stopPolling();
            bot.stopPolling();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            console.log('\n🛑 Shutting down gracefully...');
            paymentScheduler.stopPolling();
            bot.stopPolling();
            process.exit(0);
        });

    } catch (error) {
        console.error('💥 Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer(); 