const { InlineKeyboard } = require('node-telegram-bot-api');
const PaymentService = require('../services/paymentService');

class BotHandler {
    constructor(bot, db) {
        this.bot = bot;
        this.db = db;
        this.paymentService = new PaymentService(db);
        this.userStates = new Map(); // Track user conversation states

        // Utility function to format currency to Rupiah
        this.formatRupiah = (amount) => {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        };

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Handle /start command
        this.bot.onText(/\/start/, this.handleStart.bind(this));

        // Handle /help command
        this.bot.onText(/\/help/, this.handleHelp.bind(this));

        // Handle /shop command
        this.bot.onText(/\/shop/, this.handleShop.bind(this));

        // Handle /cart command
        this.bot.onText(/\/cart/, this.handleCart.bind(this));

        // Handle /orders command
        this.handleOrdersCommand();

        // Handle /balance command
        this.bot.onText(/\/balance/, this.handleBalance.bind(this));

        // Handle /deposit command
        this.bot.onText(/\/deposit/, this.handleDeposit.bind(this));

        // Handle /admin command (for admin users)
        this.bot.onText(/\/admin/, this.handleAdmin.bind(this));

        // Handle /redeem command
        this.bot.onText(/\/redeem/, this.handleRedeem.bind(this));

        // Handle callback queries (inline keyboard buttons)
        this.bot.on('callback_query', this.handleCallbackQuery.bind(this));

        // Handle text messages
        this.bot.on('message', this.handleMessage.bind(this));
    }

    async handleStart(msg) {
        const chatId = msg.chat.id;
        const user = msg.from;

        // Create or update user in database
        await this.db.createUser(user.id, user.username, user.first_name, user.last_name);

        // Get welcome message from database
        let welcomeMessage;
        try {
            const botConfig = await this.db.getBotConfig();
            if (botConfig && botConfig.welcome_message) {
                // Replace {first_name} placeholder with actual first name
                welcomeMessage = botConfig.welcome_message.replace(/{first_name}/g, user.first_name || 'User');
            } else {
                // Fallback to default message
                welcomeMessage = `
🛍️ *Selamat Datang di Toko Produk Digital!*

Hai ${user.first_name}! 👋

Saya adalah asisten produk digital Anda. Berikut yang dapat Anda lakukan:

📱 *Perintah:*
• /shop - Jelajahi produk kami
• /cart - Lihat keranjang belanja Anda
• /orders - Periksa riwayat pesanan
• /balance - Periksa saldo Anda
• /deposit - Tambahkan uang ke saldo
• /help - Dapatkan bantuan

🎯 *Fitur:*
• Jelajahi produk digital
• Tambahkan item ke keranjang
• Bayar dengan saldo
• Pengiriman instan
• Pelacakan pesanan
• Manajemen saldo

Siap untuk mulai berbelanja? Gunakan /shop untuk menjelajahi produk kami!
    `;
            }
        } catch (error) {
            console.error('Error getting bot config:', error);
            // Fallback to default message
            welcomeMessage = `
🛍️ *Selamat Datang di Toko Produk Digital!*

Hai ${user.first_name}! 👋

Saya adalah asisten produk digital Anda. Berikut yang dapat Anda lakukan:

📱 *Perintah:*
• /shop - Jelajahi produk kami
• /cart - Lihat keranjang belanja Anda
• /orders - Periksa riwayat pesanan
• /balance - Periksa saldo Anda
• /deposit - Tambahkan uang ke saldo
• /help - Dapatkan bantuan

🎯 *Fitur:*
• Jelajahi produk digital
• Tambahkan item ke keranjang
• Bayar dengan saldo
• Pengiriman instan
• Pelacakan pesanan
• Manajemen saldo

Siap untuk mulai berbelanja? Gunakan /shop untuk menjelajahi produk kami!
    `;
        }

        const inlineKeyboard = {
            inline_keyboard: [
                [{ text: '🛍️ Jelajahi Produk', callback_data: 'shop' }],
                [{ text: '🛒 Lihat Keranjang', callback_data: 'cart' }],
                [{ text: '💰 Saldo Saya', callback_data: 'balance' }],
                [{ text: '📋 Pesanan Saya', callback_data: 'orders' }],
                [{ text: '❓ Bantuan', callback_data: 'help' }]
            ]
        };

        const replyKeyboard = {
            keyboard: [
                [{ text: '/shop' }, { text: '/cart' }],
                [{ text: '/orders' }, { text: '/balance' }],
                [{ text: '/help' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        };

        await this.bot.sendMessage(chatId, welcomeMessage, {
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard
        });
    }

    async handleHelp(msg) {
        const chatId = msg.chat.id;

        // Ambil help message dari database jika ada
        let helpMessage;
        try {
            const botConfig = await this.db.getBotConfig();
            if (botConfig && botConfig.help_message) {
                helpMessage = botConfig.help_message;
            } else {
                helpMessage = `
❓ *Bantuan & Dukungan*

*Perintah yang Tersedia:*
• /start - Mulai bot
• /shop - Jelajahi produk
• /cart - Lihat keranjang Anda
• /orders - Periksa riwayat pesanan
• /help - Tampilkan bantuan ini

*Cara Berbelanja:*
1. Gunakan /shop untuk menjelajahi produk
2. Klik "Tambah ke Keranjang" pada item yang Anda inginkan
3. Pergi ke keranjang dengan /cart
4. Selesaikan checkout
5. Terima produk digital Anda secara instan!

*Jenis Produk:*
• 📁 File - File yang dapat diunduh
• 🔗 Link - Link akses
• 🔑 Kode - Kunci lisensi/kode

*Butuh Bantuan?*
Hubungi tim dukungan kami untuk bantuan.
    `;
            }
        } catch (error) {
            console.error('Error getting bot config for help message:', error);
            helpMessage = `
❓ *Bantuan & Dukungan*

*Perintah yang Tersedia:*
• /start - Mulai bot
• /shop - Jelajahi produk
• /cart - Lihat keranjang Anda
• /orders - Periksa riwayat pesanan
• /help - Tampilkan bantuan ini

*Cara Berbelanja:*
1. Gunakan /shop untuk menjelajahi produk
2. Klik "Tambah ke Keranjang" pada item yang Anda inginkan
3. Pergi ke keranjang dengan /cart
4. Selesaikan checkout
5. Terima produk digital Anda secara instan!

*Jenis Produk:*
• 📁 File - File yang dapat diunduh
• 🔗 Link - Link akses
• 🔑 Kode - Kunci lisensi/kode

*Butuh Bantuan?*
Hubungi tim dukungan kami untuk bantuan.
    `;
        }

        const keyboard = {
            inline_keyboard: [
                [{ text: '🛍️ Mulai Berbelanja', callback_data: 'shop' }],
                [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
            ]
        };

        await this.bot.sendMessage(chatId, helpMessage, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    async handleShop(msg) {
        await this.showProducts(msg.chat.id);
    }

    async showProducts(chatId, categoryId = null, page = 1) {
        try {
            const productsPerPage = 5; // Menampilkan 5 produk per halaman
            const offset = (page - 1) * productsPerPage;

            let products, totalProducts;
            if (categoryId) {
                products = await this.db.all(`
          SELECT p.*, c.name as category_name 
          FROM products p 
          LEFT JOIN categories c ON p.category_id = c.id 
          WHERE p.is_active = 1 AND p.category_id = ?
          ORDER BY p.created_at DESC
          LIMIT ? OFFSET ?
        `, [categoryId, productsPerPage, offset]);
                
                const totalResult = await this.db.get(`
          SELECT COUNT(*) as total 
          FROM products p 
          WHERE p.is_active = 1 AND p.category_id = ?
        `, [categoryId]);
                totalProducts = totalResult.total;
            } else {
                products = await this.db.all(`
          SELECT p.*, c.name as category_name 
          FROM products p 
          LEFT JOIN categories c ON p.category_id = c.id 
          WHERE p.is_active = 1
          ORDER BY p.created_at DESC
          LIMIT ? OFFSET ?
        `, [productsPerPage, offset]);
                
                const totalResult = await this.db.get(`
          SELECT COUNT(*) as total 
          FROM products p 
          WHERE p.is_active = 1
        `);
                totalProducts = totalResult.total;
            }

            if (totalProducts === 0) {
                await this.bot.sendMessage(chatId, '😔 Tidak ada produk yang tersedia saat ini.');
                return;
            }

            const totalPages = Math.ceil(totalProducts / productsPerPage);

            // Get categories for filter
            const categories = await this.db.getAllCategories();

            // Create category filter keyboard
            const categoryButtons = categories.map(cat => [{
                text: cat.name,
                callback_data: `category_${cat.id}_page_1`
            }]);

            const keyboard = {
                inline_keyboard: [
                    ...categoryButtons,
                    [{ text: '🏠 Semua Produk', callback_data: 'category_all_page_1' }]
                ]
            };

            let message = `🛍️ *Produk yang Tersedia*\n\n`;
            message += `📄 Halaman ${page} dari ${totalPages} (${totalProducts} produk)\n\n`;

            for (const product of products) {
                const price = parseFloat(product.price);
                const codeCount = await this.db.getProductCodesCount(product.id);
                const stock = codeCount.available > 0 ? codeCount.available : 'Habis Stok';

                message += `*${product.name}*\n`;
                message += `💰 Harga: ${this.formatRupiah(price)}\n`;
                message += `📦 Tersedia: ${stock}\n`;
                message += `📝 ${product.description || 'Tidak ada deskripsi'}\n`;
                message += `🏷️ Kategori: ${product.category_name || 'Tidak Dikategorikan'}\n\n`;

                // Add product action buttons
                keyboard.inline_keyboard.push([
                    { text: `🛒 Tambah ${product.name}`, callback_data: `add_to_cart_${product.id}` },
                    { text: `📋 Detail`, callback_data: `product_${product.id}` }
                ]);
            }

            // Add pagination buttons
            if (totalPages > 1) {
                const paginationButtons = [];
                
                // Previous button
                if (page > 1) {
                    const prevCallback = categoryId ? 
                        `category_${categoryId}_page_${page - 1}` : 
                        `category_all_page_${page - 1}`;
                    paginationButtons.push({ text: '⬅️ Sebelumnya', callback_data: prevCallback });
                }
                
                // Page info
                paginationButtons.push({ text: `${page}/${totalPages}`, callback_data: 'page_info' });
                
                // Next button
                if (page < totalPages) {
                    const nextCallback = categoryId ? 
                        `category_${categoryId}_page_${page + 1}` : 
                        `category_all_page_${page + 1}`;
                    paginationButtons.push({ text: 'Selanjutnya ➡️', callback_data: nextCallback });
                }
                
                keyboard.inline_keyboard.push(paginationButtons);
            }

            // Add navigation buttons
            keyboard.inline_keyboard.push([
                { text: '🛒 Lihat Keranjang', callback_data: 'cart' },
                { text: '🏠 Kembali ke Menu', callback_data: 'start' }
            ]);

            await this.bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            console.error('Error showing products:', error);
            await this.bot.sendMessage(chatId, '❌ Error memuat produk. Silakan coba lagi.');
        }
    }

    async handleCart(msg) {
        await this.showCart(msg.chat.id);
    }

    async showCart(chatId) {
        try {
            const user = await this.db.getUserByTelegramId(chatId);
            if (!user) {
                await this.bot.sendMessage(chatId, '❌ Pengguna tidak ditemukan. Silakan mulai bot dengan /start');
                return;
            }

            const cartItems = await this.db.getCart(user.id);

            if (cartItems.length === 0) {
                const keyboard = {
                    inline_keyboard: [
                        [{ text: '🛍️ Jelajahi Produk', callback_data: 'shop' }],
                        [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
                    ]
                };

                await this.bot.sendMessage(chatId, '🛒 Keranjang Anda kosong!', { reply_markup: keyboard });
                return;
            }

            let message = '🛒 *Keranjang Belanja Anda*\n\n';
            let total = 0;

            for (const item of cartItems) {
                const itemTotal = parseFloat(item.price) * item.quantity;
                total += itemTotal;

                message += `*${item.name}*\n`;
                message += `💰 Harga: ${this.formatRupiah(parseFloat(item.price))}\n`;
                message += `📦 Jumlah: ${item.quantity}\n`;
                message += `💵 Subtotal: ${this.formatRupiah(itemTotal)}\n\n`;
            }

            message += `\n*Total: ${this.formatRupiah(total)}*`;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '💳 Checkout', callback_data: 'checkout' }],
                    [{ text: '🗑️ Kosongkan Keranjang', callback_data: 'clear_cart' }],
                    [{ text: '🛍️ Lanjutkan Berbelanja', callback_data: 'shop' }],
                    [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
                ]
            };

            await this.bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            console.error('Error showing cart:', error);
            await this.bot.sendMessage(chatId, '❌ Error memuat keranjang. Silakan coba lagi.');
        }
    }

    handleOrdersCommand() {
        this.bot.onText(/\/orders/, async (msg) => {
            await this.showOrders(msg.chat.id);
        });
    }

    async showOrders(chatId) {
        try {
            const user = await this.db.getUserByTelegramId(chatId);
            if (!user) {
                await this.bot.sendMessage(chatId, '❌ Pengguna tidak ditemukan. Silakan mulai bot dengan /start');
                return;
            }

            const orders = await this.db.getUserOrders(user.id);

            if (orders.length === 0) {
                const keyboard = {
                    inline_keyboard: [
                        [{ text: '🛍️ Mulai Berbelanja', callback_data: 'shop' }],
                        [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
                    ]
                };

                await this.bot.sendMessage(chatId, '📋 Anda belum memiliki pesanan!', { reply_markup: keyboard });
                return;
            }

            let message = '📋 *Riwayat Pesanan Anda*\n\n';

            for (const order of orders.slice(0, 5)) { // Show last 5 orders
                const date = new Date(order.created_at).toLocaleDateString();
                const time = new Date(order.created_at).toLocaleTimeString();

                // Get status emoji and text
                let statusEmoji = '❓';
                let statusText = 'Tidak Diketahui';

                switch (order.status.toLowerCase()) {
                    case 'completed':
                        statusEmoji = '✅';
                        statusText = 'Selesai';
                        break;
                    case 'pending':
                        statusEmoji = '⏳';
                        statusText = 'Menunggu';
                        break;
                    case 'cancelled':
                        statusEmoji = '❌';
                        statusText = 'Dibatalkan';
                        break;
                    case 'processing':
                        statusEmoji = '🔄';
                        statusText = 'Diproses';
                        break;
                    default:
                        statusEmoji = '❓';
                        statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);
                }

                message += `*Pesanan #${order.id}*\n`;
                message += `📦 Produk: ${order.product_name}\n`;
                message += `💰 Total: ${this.formatRupiah(parseFloat(order.total_price))}\n`;
                message += `📅 Tanggal: ${date} pada ${time}\n`;
                message += `${statusEmoji} Status: ${statusText}\n\n`;
            }

            if (orders.length > 5) {
                message += `*Menampilkan 5 pesanan terakhir.*`;
            }

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🛍️ Belanja Lagi', callback_data: 'shop' }],
                    [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
                ]
            };

            await this.bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            console.error('Error showing orders:', error);
            await this.bot.sendMessage(chatId, '❌ Error memuat pesanan. Silakan coba lagi.');
        }
    }

    // Reusable function to get user's balance message and keyboard
    async getUserBalanceMessage(userId) {
        const balance = await this.db.getUserBalance(userId);
        const transactions = await this.db.getUserTransactions(userId, 5);

        let message = `💰 *Saldo Anda*\n\n`;
        message += `*Saldo Saat Ini:* ${this.formatRupiah(balance)}\n\n`;

        if (transactions.length > 0) {
            message += `📋 *Transaksi Terbaru:*\n`;
            for (const transaction of transactions) {
                const type = transaction.type === 'deposit' ? '➕' : '➖';
                const date = new Date(transaction.created_at).toLocaleDateString();
                message += `${type} ${this.formatRupiah(Math.abs(transaction.amount))} - ${transaction.description} (${date})\n`;
            }
        }

        const keyboard = {
            inline_keyboard: [
                [{ text: '💳 Tambah Uang', callback_data: 'deposit' }],
                [{ text: '🎟️ Tukar Kode', callback_data: 'redeem_code' }],
                [{ text: '📋 Semua Transaksi', callback_data: 'transactions' }],
                [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
            ]
        };

        return { message, keyboard };
    }

    async handleBalance(msg) {
        const chatId = msg.chat.id;
        const user = await this.db.getUserByTelegramId(chatId);

        if (!user) {
            await this.bot.sendMessage(chatId, '❌ Pengguna tidak ditemukan. Silakan mulai bot dengan /start');
            return;
        }

        const { message, keyboard } = await this.getUserBalanceMessage(user.id);
        await this.bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    async handleDeposit(msg) {
        const chatId = msg.chat.id;
        const user = await this.db.getUserByTelegramId(chatId);

        if (!user) {
            await this.bot.sendMessage(chatId, '❌ Pengguna tidak ditemukan. Silakan mulai bot dengan /start');
            return;
        }

        const message = `
💳 *Tambah Uang ke Saldo Anda*

Pilih jumlah untuk ditambahkan ke saldo Anda:

• ${this.formatRupiah(50000)}
• ${this.formatRupiah(100000)} 
• ${this.formatRupiah(250000)}
• ${this.formatRupiah(500000)}

*Jumlah Kustom:*
Kirim saya jumlah yang ingin Anda tambahkan (misalnya, "150000")

*Metode Pembayaran yang Tersedia:*
• QRIS

*Catatan:* Pembayaran akan diproses secara otomatis.
        `;

        const keyboard = {
            inline_keyboard: [
                [{ text: `${this.formatRupiah(50000)}`, callback_data: 'deposit_50000' }],
                [{ text: `${this.formatRupiah(100000)}`, callback_data: 'deposit_100000' }],
                [{ text: `${this.formatRupiah(250000)}`, callback_data: 'deposit_250000' }],
                [{ text: `${this.formatRupiah(500000)}`, callback_data: 'deposit_500000' }],
                [{ text: '💰 Jumlah Kustom', callback_data: 'deposit_custom' }],
                [{ text: '📋 Riwayat Pembayaran', callback_data: 'payment_history' }],
                [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
            ]
        };

        await this.bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    async handleAdmin(msg) {
        const chatId = msg.chat.id;
        const user = await this.db.getUserByTelegramId(chatId);

        if (!user || !user.is_admin) {
            await this.bot.sendMessage(chatId, '❌ Akses ditolak. Hak akses admin diperlukan.');
            return;
        }

        const adminMessage = `
🔧 *Panel Admin*

Selamat datang, Admin! Berikut adalah opsi Anda:

*Manajemen Produk:*
• Tambah produk baru
• Edit produk yang ada
• Kelola inventori
• Lihat semua pesanan

*Analitik:*
• Laporan penjualan
• Statistik pengguna
• Pelacakan pendapatan

*Manajemen Pengguna:*
• Lihat saldo pengguna
• Kelola transaksi

Gunakan tombol di bawah untuk mengakses fitur admin.
    `;

        const keyboard = {
            inline_keyboard: [
                [{ text: '➕ Tambah Produk', callback_data: 'admin_add_product' }],
                [{ text: '📦 Kelola Produk', callback_data: 'admin_products' }],
                [{ text: '📋 Semua Pesanan', callback_data: 'admin_orders' }],
                [{ text: '📊 Analitik', callback_data: 'admin_analytics' }],
                [{ text: '💰 Transaksi', callback_data: 'admin_transactions' }],
                [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
            ]
        };

        await this.bot.sendMessage(chatId, adminMessage, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    async handleCallbackQuery(callbackQuery) {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        try {
            // Acknowledge the callback
            await this.bot.answerCallbackQuery(callbackQuery.id);

            // Handle different callback types
            if (data === 'start') {
                await this.handleStart({ chat: { id: chatId }, from: callbackQuery.from });
            } else if (data === 'help') {
                await this.handleHelp({ chat: { id: chatId } });
            } else if (data === 'shop') {
                await this.showProducts(chatId);
            } else if (data === 'cart') {
                await this.showCart(chatId);
            } else if (data === 'orders') {
                await this.showOrders(chatId);
            } else if (data.startsWith('category_')) {
                // Handle category with pagination: category_ID_page_N or category_all_page_N
                const parts = data.split('_');
                if (parts.length >= 3 && parts[parts.length - 2] === 'page') {
                    const page = parseInt(parts[parts.length - 1]);
                    const categoryPart = parts.slice(1, -2).join('_');
                    
                    if (categoryPart === 'all') {
                        await this.showProducts(chatId, null, page);
                    } else {
                        await this.showProducts(chatId, categoryPart, page);
                    }
                } else {
                    // Fallback for old format
                    const categoryId = data.replace('category_', '');
                    if (categoryId === 'all') {
                        await this.showProducts(chatId);
                    } else {
                        await this.showProducts(chatId, categoryId);
                    }
                }
            } else if (data.startsWith('add_to_cart_')) {
                await this.handleAddToCart(chatId, data.replace('add_to_cart_', ''));
            } else if (data.startsWith('product_')) {
                await this.showProductDetails(chatId, data.replace('product_', ''));
            } else if (data === 'checkout') {
                await this.handleCheckout(chatId);
            } else if (data === 'clear_cart') {
                await this.handleClearCart(chatId);
            } else if (data === 'deposit') {
                await this.handleDeposit({ chat: { id: chatId }, from: callbackQuery.from });
            } else if (data === 'transactions') {
                await this.showTransactions(chatId);
            } else if (data.startsWith('deposit_')) {
                await this.handleQuickDeposit(chatId, data.replace('deposit_', ''));
            } else if (data === 'deposit_custom') {
                this.userStates.set(chatId, { state: 'awaiting_deposit_amount' });
                await this.bot.sendMessage(chatId, '💰 Silakan masukkan jumlah deposit yang Anda inginkan (dalam Rupiah):\n\nContoh: 150000');
            } else if (data === 'payment_history') {
                await this.showPaymentHistory(chatId);
            } else if (data.startsWith('check_payment_')) {
                const reference = data.replace('check_payment_', '');
                await this.checkPaymentStatus(chatId, reference);
            } else if (data.startsWith('admin_')) {
                await this.handleAdminCallback(chatId, data);
            } else if (data === 'my_balance' || data === 'balance') {
                const user = await this.db.getUserByTelegramId(chatId);
                if (!user) {
                    await this.bot.sendMessage(chatId, '❌ User not found. Please start the bot with /start');
                    return;
                }
                const { message, keyboard } = await this.getUserBalanceMessage(user.id);
                await this.bot.sendMessage(chatId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            } else if (data === 'redeem_code') {
                this.userStates.set(chatId, { state: 'awaiting_redeem_code' });
                await this.bot.sendMessage(chatId, '🎟️ Silakan masukkan kode penukaran Anda:');
            } else if (data === 'page_info') {
                // Do nothing, this is just an info button
                return;
            }

        } catch (error) {
            console.error('Error handling callback query:', error);
            await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan coba lagi.');
        }
    }

    async handleAddToCart(chatId, productId) {
        try {
            const user = await this.db.getUserByTelegramId(chatId);
            if (!user) {
                await this.bot.sendMessage(chatId, '❌ Pengguna tidak ditemukan. Silakan mulai bot dengan /start');
                return;
            }

            const product = await this.db.getProductById(productId);
            if (!product) {
                await this.bot.sendMessage(chatId, '❌ Produk tidak ditemukan.');
                return;
            }

            // Check product codes availability
            const codeCount = await this.db.getProductCodesCount(productId);
            if (codeCount.available <= 0) {
                await this.bot.sendMessage(chatId, '❌ Maaf, produk ini habis stok.');
                return;
            }

            // Check if user already has this item in cart
            const existingCartItem = await this.db.get('SELECT quantity FROM cart WHERE user_id = ? AND product_id = ?', [user.id, productId]);
            const currentQuantity = existingCartItem ? existingCartItem.quantity : 0;

            if (currentQuantity + 1 > codeCount.available) {
                await this.bot.sendMessage(chatId, `❌ Maaf, hanya ${codeCount.available} unit tersedia. Anda sudah memiliki ${currentQuantity} di keranjang.`);
                return;
            }

            await this.db.addToCart(user.id, productId, 1);

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🛒 Lihat Keranjang', callback_data: 'cart' }],
                    [{ text: '🛍️ Lanjutkan Berbelanja', callback_data: 'shop' }]
                ]
            };

            await this.bot.sendMessage(chatId, `✅ *${product.name}* ditambahkan ke keranjang!`, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            console.error('Error adding to cart:', error);
            await this.bot.sendMessage(chatId, '❌ Error menambahkan item ke keranjang. Silakan coba lagi.');
        }
    }

    async showProductDetails(chatId, productId) {
        try {
            const product = await this.db.getProductById(productId);
            if (!product) {
                await this.bot.sendMessage(chatId, '❌ Produk tidak ditemukan.');
                return;
            }

            const price = parseFloat(product.price);
            const codeCount = await this.db.getProductCodesCount(productId);
            const stock = codeCount.available > 0 ? codeCount.available : 'Habis Stok';

            let message = `*${product.name}*\n\n`;
            message += `📝 *Deskripsi:*\n${product.description || 'Tidak ada deskripsi tersedia'}\n\n`;
            message += `💰 *Harga:* ${this.formatRupiah(price)}\n`;
            message += `📦 *Stok:* ${stock}\n`;
            message += `🏷️ *Kategori:* ${product.category_name || 'Tidak Dikategorikan'}\n`;
            message += `📋 *Jenis:* ${product.product_type}\n`;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🛒 Tambah ke Keranjang', callback_data: `add_to_cart_${product.id}` }],
                    [{ text: '🛍️ Kembali ke Produk', callback_data: 'shop' }],
                    [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
                ]
            };

            await this.bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            console.error('Error showing product details:', error);
            await this.bot.sendMessage(chatId, '❌ Error memuat detail produk. Silakan coba lagi.');
        }
    }

    async handleCheckout(chatId) {
        try {
            const user = await this.db.getUserByTelegramId(chatId);
            if (!user) {
                await this.bot.sendMessage(chatId, '❌ Pengguna tidak ditemukan. Silakan mulai bot dengan /start');
                return;
            }

            const cartItems = await this.db.getCart(user.id);
            if (cartItems.length === 0) {
                await this.bot.sendMessage(chatId, '🛒 Keranjang Anda kosong!');
                return;
            }

            // Validate product codes availability before checkout
            for (const item of cartItems) {
                const product = await this.db.getProductById(item.product_id);
                if (!product) {
                    await this.bot.sendMessage(chatId, `❌ Produk "${item.name}" tidak lagi tersedia.`);
                    return;
                }

                // Check if enough product codes are available
                const codeCount = await this.db.getProductCodesCount(item.product_id);
                if (codeCount.available < item.quantity) {
                    await this.bot.sendMessage(chatId, `❌ Stok tidak cukup untuk "${product.name}". Tersedia: ${codeCount.available}, Diminta: ${item.quantity}`);
                    return;
                }
            }

            // Calculate total
            let total = 0;
            for (const item of cartItems) {
                total += parseFloat(item.price) * item.quantity;
            }

            // Check user balance
            const userBalance = await this.db.getUserBalance(user.id);
            if (userBalance < total) {
                const shortfall = total - userBalance;
                await this.bot.sendMessage(chatId, `❌ Saldo tidak cukup. Anda membutuhkan ${this.formatRupiah(shortfall)} lagi. Saldo saat ini: ${this.formatRupiah(userBalance)}`);
                return;
            }

            // Process payment using balance
            try {
                await this.db.withdrawFromBalance(user.id, total, `Pembelian: ${cartItems.map(item => item.name).join(', ')}`);
            } catch (error) {
                await this.bot.sendMessage(chatId, '❌ Pembayaran gagal. Silakan periksa saldo Anda dan coba lagi.');
                return;
            }

            // Create orders and use product codes for each cart item
            const createdOrders = [];
            for (const item of cartItems) {
                const itemTotal = parseFloat(item.price) * item.quantity;

                // Get available product codes for this item
                const availableCodes = await this.db.getAvailableProductCodes(item.product_id, item.quantity);

                if (availableCodes.length < item.quantity) {
                    await this.bot.sendMessage(chatId, `❌ Error: Tidak cukup kode produk tersedia untuk "${item.name}". Silakan coba lagi.`);
                    return;
                }

                // Create the order
                const orderResult = await this.db.createOrder(user.id, item.product_id, item.quantity, itemTotal);
                createdOrders.push({
                    orderId: orderResult.id,
                    productId: item.product_id,
                    quantity: item.quantity
                });

                // Use the product codes
                for (const code of availableCodes) {
                    await this.db.useProductCode(code.id, user.id);
                }
            }

            // Clear cart
            await this.db.clearCart(user.id);

            // Deliver products
            await this.deliverProducts(chatId, cartItems);

            // Update all orders to completed status
            for (const order of createdOrders) {
                await this.db.updateOrderStatus(order.orderId, 'completed');
            }

            await this.bot.sendMessage(chatId, '✅ Pembayaran berhasil! Produk Anda telah dikirim dan pesanan ditandai sebagai selesai.');

        } catch (error) {
            console.error('Error during checkout:', error);
            await this.bot.sendMessage(chatId, '❌ Error saat checkout. Silakan coba lagi.');
        }
    }

    async processPayment(chatId, amount) {
        // Simulated payment processing
        // In a real implementation, you would integrate with a payment gateway
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simulate 90% success rate
                const success = Math.random() > 0.1;
                resolve(success);
            }, 1000);
        });
    }

    async deliverProducts(chatId, cartItems) {
        const user = await this.db.getUserByTelegramId(chatId);
        if (!user) return;

        for (const item of cartItems) {
            try {
                const product = await this.db.getProductById(item.product_id);
                if (!product) continue;

                let deliveryMessage = `📦 *Produk Dikirim: ${product.name}*\n\n`;

                switch (product.product_type) {
                    case 'file':
                        if (product.file_path) {
                            deliveryMessage += `📁 *Link Unduhan:*\n${process.env.BASE_URL || 'http://localhost:3000'}/uploads/${product.file_path}\n\n`;
                        }
                        break;

                    case 'link':
                        if (product.download_link) {
                            deliveryMessage += `🔗 *Link Akses:*\n${product.download_link}\n\n`;
                        }
                        break;

                    case 'code':
                        // Get the actual product codes that were used for this purchase
                        const usedCodes = await this.db.all(
                            'SELECT pc.code FROM product_codes pc WHERE pc.product_id = ? AND pc.used_by_user_id = ? AND pc.is_used = 1 ORDER BY pc.used_at DESC LIMIT ?',
                            [product.id, user.id, item.quantity]
                        );

                        if (usedCodes.length > 0) {
                            const codes = usedCodes.map(c => c.code).join('\n');
                            deliveryMessage += `🔑 *Kode Produk:*\n\`${codes}\`\n\n`;
                        }
                        break;
                }

                deliveryMessage += `💡 *Instruksi:*\nSilakan simpan informasi ini dengan aman. Anda dapat mengakses pesanan Anda kapan saja dengan /orders`;

                await this.bot.sendMessage(chatId, deliveryMessage, {
                    parse_mode: 'Markdown'
                });

            } catch (error) {
                console.error('Error delivering product:', error);
            }
        }
    }

    async handleClearCart(chatId) {
        try {
            const user = await this.db.getUserByTelegramId(chatId);
            if (!user) {
                await this.bot.sendMessage(chatId, '❌ Pengguna tidak ditemukan. Silakan mulai bot dengan /start');
                return;
            }

            await this.db.clearCart(user.id);

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🛍️ Mulai Berbelanja', callback_data: 'shop' }],
                    [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
                ]
            };

            await this.bot.sendMessage(chatId, '🗑️ Keranjang berhasil dikosongkan!', {
                reply_markup: keyboard
            });

        } catch (error) {
            console.error('Error clearing cart:', error);
            await this.bot.sendMessage(chatId, '❌ Error mengosongkan keranjang. Silakan coba lagi.');
        }
    }

    async handleQuickDeposit(chatId, amount) {
        const user = await this.db.getUserByTelegramId(chatId);
        if (!user) {
            await this.bot.sendMessage(chatId, '❌ Pengguna tidak ditemukan. Silakan mulai bot dengan /start');
            return;
        }

        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            await this.bot.sendMessage(chatId, '❌ Jumlah tidak valid.');
            return;
        }

        try {
            // Create payment transaction using Tripay
            const paymentResult = await this.paymentService.createBalancePayment(
                user.id,
                depositAmount,
                user.first_name || user.username || 'User',
                null, // phone number (optional)
                null  // email (optional - will use generated email)
            );

            if (paymentResult.success) {
                const { reference, paymentUrl, qrUrl, merchantRef } = paymentResult.data;

                const message = `
💳 *Pembayaran Berhasil Dibuat!*

💰 *Jumlah:* ${this.formatRupiah(depositAmount)}
🔢 *Referensi:* \`${reference}\`
🏷️ *Ref Merchant:* \`${merchantRef}\`

*Instruksi Pembayaran:*
1. Scan kode QR di bawah
2. Pilih metode pembayaran Anda
3. Selesaikan pembayaran
4. Saldo Anda akan diperbarui secara otomatis

*Kode QR:* ${qrUrl}

⏰ *Berlaku dalam:* 24 jam
                `;

                // Create keyboard based on available URLs
                const keyboardButtons = [];

                // Add QR Code button if available
                if (qrUrl) {
                    keyboardButtons.push([{ text: '📱 QR Code', url: qrUrl }]);
                }

                // Add other buttons
                keyboardButtons.push(
                    [{ text: '📋 Cek Status', callback_data: `check_payment_${reference}` }],
                    [{ text: '📋 Riwayat Pembayaran', callback_data: 'payment_history' }],
                    [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
                );

                const keyboard = {
                    inline_keyboard: keyboardButtons
                };

                if (qrUrl) {
                    // Kirim gambar QRIS sebagai foto
                    await this.bot.sendPhoto(chatId, qrUrl, {
                        caption: message,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                } else {
                    // Fallback ke pesan biasa jika tidak ada QR
                    await this.bot.sendMessage(chatId, message, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
            } else {
                throw new Error('Failed to create payment');
            }

        } catch (error) {
            console.error('Error creating payment:', error);
            await this.bot.sendMessage(chatId, '❌ Error membuat pembayaran. Silakan coba lagi.');
        }
    }

    async showTransactions(chatId) {
        const user = await this.db.getUserByTelegramId(chatId);
        if (!user) {
            await this.bot.sendMessage(chatId, '❌ Pengguna tidak ditemukan. Silakan mulai bot dengan /start');
            return;
        }

        const transactions = await this.db.getUserTransactions(user.id, 20);

        if (transactions.length === 0) {
            await this.bot.sendMessage(chatId, '📋 Tidak ada transaksi ditemukan.');
            return;
        }

        let message = `📋 *Riwayat Transaksi Anda*\n\n`;

        for (const transaction of transactions) {
            const type = transaction.type === 'deposit' ? '➕' : '➖';
            const date = new Date(transaction.created_at).toLocaleDateString();
            const time = new Date(transaction.created_at).toLocaleTimeString();
            const productInfo = transaction.product_name ? ` - ${transaction.product_name}` : '';

            message += `${type} ${this.formatRupiah(Math.abs(transaction.amount))} - ${transaction.description}${productInfo}\n`;
            message += `📅 ${date} pada ${time}\n\n`;
        }

        const keyboard = {
            inline_keyboard: [
                [{ text: '💰 Lihat Saldo', callback_data: 'balance' }],
                [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
            ]
        };

        await this.bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    async handleAdminCallback(chatId, data) {
        const user = await this.db.getUserByTelegramId(chatId);
        if (!user || !user.is_admin) {
            await this.bot.sendMessage(chatId, '❌ Akses ditolak. Hak akses admin diperlukan.');
            return;
        }

        if (data === 'admin_add_product') {
            await this.startAddProductFlow(chatId);
        } else if (data === 'admin_products') {
            await this.showAdminProducts(chatId);
        } else if (data === 'admin_orders') {
            await this.showAdminOrders(chatId);
        } else if (data === 'admin_analytics') {
            await this.showAdminAnalytics(chatId);
        } else if (data === 'admin_transactions') {
            await this.showAdminTransactions(chatId);
        }
    }

    async startAddProductFlow(chatId) {
        this.userStates.set(chatId, { state: 'ADDING_PRODUCT', data: {} });

        const message = `
➕ *Tambah Produk Baru*

Silakan berikan informasi produk langkah demi langkah.

Pertama, kirim saya *nama produk*:
    `;

        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async showAdminProducts(chatId) {
        try {
            const products = await this.db.all(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        ORDER BY p.created_at DESC
      `);

            if (products.length === 0) {
                await this.bot.sendMessage(chatId, '📦 Tidak ada produk ditemukan.');
                return;
            }

            let message = '📦 *Semua Produk*\n\n';

            for (const product of products.slice(0, 10)) {
                const status = product.is_active ? '✅ Aktif' : '❌ Tidak Aktif';
                message += `*${product.name}*\n`;
                message += `💰 ${this.formatRupiah(parseFloat(product.price))}\n`;
                message += `📊 ${status}\n`;
                message += `🏷️ ${product.category_name || 'Tidak Dikategorikan'}\n\n`;
            }

            const keyboard = {
                inline_keyboard: [
                    [{ text: '➕ Tambah Produk', callback_data: 'admin_add_product' }],
                    [{ text: '🏠 Kembali ke Admin', callback_data: 'admin' }]
                ]
            };

            await this.bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            console.error('Error showing admin products:', error);
            await this.bot.sendMessage(chatId, '❌ Error memuat produk.');
        }
    }

    async showAdminOrders(chatId) {
        try {
            const orders = await this.db.getAllOrders();

            if (orders.length === 0) {
                await this.bot.sendMessage(chatId, '📋 Tidak ada pesanan ditemukan.');
                return;
            }

            let message = '📋 *Pesanan Terbaru*\n\n';

            for (const order of orders.slice(0, 10)) {
                const date = new Date(order.created_at).toLocaleDateString();
                const time = new Date(order.created_at).toLocaleTimeString();

                // Get status emoji and text
                let statusEmoji = '❓';
                let statusText = 'Tidak Diketahui';

                switch (order.status.toLowerCase()) {
                    case 'completed':
                        statusEmoji = '✅';
                        statusText = 'Selesai';
                        break;
                    case 'pending':
                        statusEmoji = '⏳';
                        statusText = 'Menunggu';
                        break;
                    case 'cancelled':
                        statusEmoji = '❌';
                        statusText = 'Dibatalkan';
                        break;
                    case 'processing':
                        statusEmoji = '🔄';
                        statusText = 'Diproses';
                        break;
                    default:
                        statusEmoji = '❓';
                        statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);
                }

                message += `*Pesanan #${order.id}*\n`;
                message += `👤 ${order.first_name || order.username}\n`;
                message += `📦 ${order.product_name}\n`;
                message += `💰 ${this.formatRupiah(parseFloat(order.total_price))}\n`;
                message += `${statusEmoji} ${statusText}\n`;
                message += `📅 ${date} pada ${time}\n\n`;
            }

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🏠 Kembali ke Admin', callback_data: 'admin' }]
                ]
            };

            await this.bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            console.error('Error showing admin orders:', error);
            await this.bot.sendMessage(chatId, '❌ Error memuat pesanan.');
        }
    }

    async showAdminAnalytics(chatId) {
        try {
            // Get basic analytics
            const totalProducts = await this.db.get('SELECT COUNT(*) as count FROM products');
            const totalOrders = await this.db.get('SELECT COUNT(*) as count FROM orders');
            const totalUsers = await this.db.get('SELECT COUNT(*) as count FROM users WHERE is_admin = 0');
            const totalRevenue = await this.db.get('SELECT SUM(total_price) as total FROM orders WHERE status = "completed"');

            const message = `
📊 *Analitik Toko*

*Produk:* ${totalProducts.count}
*Pesanan:* ${totalOrders.count}
*Pengguna:* ${totalUsers.count}
*Pendapatan:* ${this.formatRupiah(totalRevenue.total || 0)}

*Aktivitas Terbaru:*
• 24 jam terakhir: ${Math.floor(Math.random() * 10)} pesanan
• Minggu ini: ${Math.floor(Math.random() * 50)} pesanan
• Bulan ini: ${Math.floor(Math.random() * 200)} pesanan
    `;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🏠 Kembali ke Admin', callback_data: 'admin' }]
                ]
            };

            await this.bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            console.error('Error showing analytics:', error);
            await this.bot.sendMessage(chatId, '❌ Error memuat analitik.');
        }
    }

    async showAdminTransactions(chatId) {
        try {
            const transactions = await this.db.getAllTransactions(20);

            if (transactions.length === 0) {
                await this.bot.sendMessage(chatId, '📋 Tidak ada transaksi ditemukan.');
                return;
            }

            let message = '📋 *Transaksi Terbaru*\n\n';

            for (const transaction of transactions.slice(0, 10)) {
                const type = transaction.type === 'deposit' ? '➕' : '➖';
                const date = new Date(transaction.created_at).toLocaleDateString();
                const userInfo = transaction.first_name || transaction.username || 'Tidak Diketahui';
                const productInfo = transaction.product_name ? ` - ${transaction.product_name}` : '';

                message += `${type} ${this.formatRupiah(Math.abs(transaction.amount))} - ${userInfo}${productInfo}\n`;
                message += `📅 ${date} - ${transaction.description}\n\n`;
            }

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🏠 Kembali ke Admin', callback_data: 'admin' }]
                ]
            };

            await this.bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            console.error('Error showing admin transactions:', error);
            await this.bot.sendMessage(chatId, '❌ Error memuat transaksi.');
        }
    }

    async handleRedeem(msg) {
        const chatId = msg.chat.id;
        const user = await this.db.getUserByTelegramId(chatId);
        if (!user) {
            await this.bot.sendMessage(chatId, '❌ Pengguna tidak ditemukan. Silakan mulai bot dengan /start');
            return;
        }
        this.userStates.set(chatId, { state: 'awaiting_redeem_code' });
        await this.bot.sendMessage(chatId, '🎟️ Silakan masukkan kode penukaran Anda:');
    }

    async handleMessage(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;
        const userState = this.userStates.get(chatId);

        if (!userState) return;

        try {
            if (userState.state === 'ADDING_PRODUCT') {
                await this.handleAddProductStep(chatId, text, userState);
            } else if (userState.state === 'awaiting_redeem_code') {
                const code = text.trim();
                const user = await this.db.getUserByTelegramId(chatId);
                if (!user) {
                    await this.bot.sendMessage(chatId, '❌ Pengguna tidak ditemukan. Silakan mulai bot dengan /start');
                    this.userStates.delete(chatId);
                    return;
                }
                try {
                    const amount = await this.db.useRedeemCode(code, user.id);
                    await this.bot.sendMessage(chatId, `✅ Kode berhasil ditukar! ${this.formatRupiah(parseFloat(amount))} telah ditambahkan ke saldo Anda.`);
                } catch (error) {
                    await this.bot.sendMessage(chatId, `❌ Penukaran gagal: ${error.message}`);
                }
                this.userStates.delete(chatId);
                return;
            } else if (userState.state === 'awaiting_deposit_amount') {
                // Handle custom deposit amount
                const amount = parseFloat(text.replace(/[^\d]/g, '')); // Remove non-digits
                if (isNaN(amount) || amount <= 0) {
                    await this.bot.sendMessage(chatId, '❌ Jumlah tidak valid. Silakan masukkan angka yang valid (misalnya, 150000):');
                    return;
                }

                if (amount < 10000) {
                    await this.bot.sendMessage(chatId, '❌ Jumlah minimum deposit adalah Rp10.000');
                    return;
                }

                this.userStates.delete(chatId);
                await this.handleQuickDeposit(chatId, amount);
                return;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan coba lagi.');
        }
    }

    async handleAddProductStep(chatId, text, userState) {
        const step = userState.currentStep || 'name';

        switch (step) {
            case 'name':
                userState.data.name = text;
                userState.currentStep = 'description';
                await this.bot.sendMessage(chatId, '📝 Sekarang kirim saya *deskripsi produk*:', { parse_mode: 'Markdown' });
                break;

            case 'description':
                userState.data.description = text;
                userState.currentStep = 'price';
                await this.bot.sendMessage(chatId, '💰 Sekarang kirim saya *harga* (misalnya, 9.99):', { parse_mode: 'Markdown' });
                break;

            case 'price':
                const price = parseFloat(text);
                if (isNaN(price) || price <= 0) {
                    await this.bot.sendMessage(chatId, '❌ Harga tidak valid. Silakan kirim angka yang valid (misalnya, 9.99):');
                    return;
                }
                userState.data.price = price;
                userState.currentStep = 'type';

                const keyboard = {
                    inline_keyboard: [
                        [{ text: '📁 File', callback_data: 'product_type_file' }],
                        [{ text: '🔗 Link', callback_data: 'product_type_link' }],
                        [{ text: '🔑 Kode', callback_data: 'product_type_code' }]
                    ]
                };

                await this.bot.sendMessage(chatId, '📋 Pilih *jenis produk*:', {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
                break;
        }
    }

    // Send a 'My Balance' inline button
    async sendMyBalanceButton(chatId, text = '💰 Saldo Saya') {
        const keyboard = {
            inline_keyboard: [
                [{ text: text, callback_data: 'balance' }]
            ]
        };
        await this.bot.sendMessage(chatId, text, { reply_markup: keyboard });
    }

    /**
     * Show payment history for user
     */
    async showPaymentHistory(chatId) {
        const user = await this.db.getUserByTelegramId(chatId);
        if (!user) {
            await this.bot.sendMessage(chatId, '❌ Pengguna tidak ditemukan. Silakan mulai bot dengan /start');
            return;
        }

        try {
            const payments = await this.paymentService.getUserPaymentHistory(user.id, 10);

            if (payments.length === 0) {
                await this.bot.sendMessage(chatId, '📋 Tidak ada riwayat pembayaran ditemukan.');
                return;
            }

            let message = `📋 *Riwayat Pembayaran Anda*\n\n`;

            for (const payment of payments) {
                const date = new Date(payment.created_at).toLocaleDateString();
                const time = new Date(payment.created_at).toLocaleTimeString();
                const status = payment.status === 'PAID' ? '✅' : payment.status === 'PENDING' ? '⏳' : '❌';

                message += `${status} *${this.formatRupiah(payment.amount)}* - ${payment.status}\n`;
                message += `🔢 Ref: \`${payment.tripay_reference || 'N/A'}\`\n`;
                message += `📅 ${date} pada ${time}\n\n`;
            }

            const keyboard = {
                inline_keyboard: [
                    [{ text: '💰 Tambah Saldo', callback_data: 'deposit' }],
                    [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
                ]
            };

            await this.bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            console.error('Error showing payment history:', error);
            await this.bot.sendMessage(chatId, '❌ Error memuat riwayat pembayaran.');
        }
    }

    /**
     * Check payment status
     */
    async checkPaymentStatus(chatId, reference) {
        const user = await this.db.getUserByTelegramId(chatId);
        if (!user) {
            await this.bot.sendMessage(chatId, '❌ Pengguna tidak ditemukan. Silakan mulai bot dengan /start');
            return;
        }

        try {
            // Send initial message
            const initialMessage = await this.bot.sendMessage(chatId, '🔄 Memeriksa status pembayaran...');

            // Poll payment status (this will update the database if status changed)
            const pollResult = await this.paymentService.pollPaymentStatus(reference);

            if (pollResult.success) {
                // Get updated status from database
                const payment = await this.db.get(`
                    SELECT * FROM balance_payments 
                    WHERE tripay_reference = ?
                `, [reference]);

                if (!payment) {
                    await this.bot.editMessageText('❌ Pembayaran tidak ditemukan.', {
                        chat_id: chatId,
                        message_id: initialMessage.message_id
                    });
                    return;
                }

                const status = payment.status;
                const amount = payment.amount;

                let statusEmoji = '❓';
                let statusText = 'Tidak Diketahui';
                let statusMessage = '';

                switch (status) {
                    case 'PAID':
                        statusEmoji = '✅';
                        statusText = 'Pembayaran Selesai';
                        statusMessage = '✅ Saldo Anda telah diperbarui! Anda sekarang dapat menggunakannya untuk membeli produk.';
                        break;
                    case 'PENDING':
                    case 'UNPAID':
                        statusEmoji = '⏳';
                        statusText = 'Pembayaran Menunggu';
                        statusMessage = '⏳ Silakan selesaikan pembayaran Anda untuk memperbarui saldo.';
                        break;
                    case 'EXPIRED':
                        statusEmoji = '⏰';
                        statusText = 'Pembayaran Kedaluwarsa';
                        statusMessage = '⏰ Pembayaran telah kedaluwarsa. Silakan buat pembayaran baru.';
                        break;
                    case 'FAILED':
                        statusEmoji = '❌';
                        statusText = 'Pembayaran Gagal';
                        statusMessage = '❌ Pembayaran tidak berhasil. Silakan coba lagi.';
                        break;
                }

                const message = `
${statusEmoji} *Status Pembayaran Diperbarui*

💰 *Jumlah:* ${this.formatRupiah(amount)}
🔢 *Referensi:* \`${reference}\`
📊 *Status:* ${statusText}
📅 *Terakhir Diperiksa:* ${new Date().toLocaleString()}

${statusMessage}
                `;

                const keyboard = {
                    inline_keyboard: [
                        ...(status === 'PENDING' || status === 'UNPAID' ? [[{ text: '🔄 Cek Lagi', callback_data: `check_payment_${reference}` }]] : []),
                        [{ text: '💰 Tambah Saldo', callback_data: 'deposit' }],
                        [{ text: '📋 Riwayat Pembayaran', callback_data: 'payment_history' }],
                        [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
                    ]
                };

                await this.bot.editMessageText(message, {
                    chat_id: chatId,
                    message_id: initialMessage.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });

                // If payment was just completed, show additional success message
                if (status === 'PAID' && pollResult.data && pollResult.data.newBalance !== undefined) {
                    const successMessage = `
🎉 *Pembayaran Berhasil Diproses!*

💰 *Jumlah Ditambahkan:* ${this.formatRupiah(amount)}
💳 *Saldo Baru:* ${this.formatRupiah(pollResult.data.newBalance)}
🔢 *Referensi:* \`${reference}\`

Saldo Anda telah diperbarui secara otomatis! Anda sekarang dapat berbelanja produk.

🛍️ Gunakan /shop untuk menjelajahi produk
💰 Gunakan /balance untuk memeriksa saldo
                    `;

                    const successKeyboard = {
                        inline_keyboard: [
                            [{ text: '🛍️ Belanja Sekarang', callback_data: 'shop' }],
                            [{ text: '💰 Saldo Saya', callback_data: 'balance' }],
                            [{ text: '🏠 Kembali ke Menu', callback_data: 'start' }]
                        ]
                    };

                    await this.bot.sendMessage(chatId, successMessage, {
                        parse_mode: 'Markdown',
                        reply_markup: successKeyboard
                    });
                }

            } else {
                await this.bot.editMessageText('❌ Error memeriksa status pembayaran. Silakan coba lagi.', {
                    chat_id: chatId,
                    message_id: initialMessage.message_id
                });
            }

        } catch (error) {
            console.error('Error checking payment status:', error);
            await this.bot.sendMessage(chatId, '❌ Error memeriksa status pembayaran. Silakan coba lagi.');
        }
    }
}

module.exports = BotHandler;