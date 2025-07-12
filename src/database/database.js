const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

class Database {
    constructor() {
        this.dbPath = process.env.DATABASE_PATH || './data/shop.db';
        this.db = null;
    }

    async initialize() {
        // Ensure data directory exists
        await fs.ensureDir(path.dirname(this.dbPath));

        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Database connection error:', err);
                    reject(err);
                } else {
                    console.log('✅ Database connected successfully');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        const tables = [
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE NOT NULL,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        balance DECIMAL(10,2) DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_admin BOOLEAN DEFAULT 0
      )`,

            // Categories table
            `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

            // Products table
            `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category_id INTEGER,
        product_type TEXT NOT NULL,
        file_path TEXT,
        download_link TEXT,
        product_code TEXT,
        stock_quantity INTEGER DEFAULT -1,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )`,

            // Orders table
            `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        total_price DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`,

            // Cart table
            `CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`,

            // Product Codes table
            `CREATE TABLE IF NOT EXISTS product_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        code TEXT NOT NULL,
        is_used BOOLEAN DEFAULT 0,
        used_by_user_id INTEGER,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id),
        FOREIGN KEY (used_by_user_id) REFERENCES users (id)
      )`,

            // Transactions table
            `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        order_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (order_id) REFERENCES orders (id)
      )`,
            // Redeem Codes table
            `CREATE TABLE IF NOT EXISTS redeem_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        is_used BOOLEAN DEFAULT 0,
        used_by_user_id INTEGER,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (used_by_user_id) REFERENCES users (id)
      )`,

            // Balance Payments table
            `CREATE TABLE IF NOT EXISTS balance_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        merchant_ref TEXT UNIQUE NOT NULL,
        tripay_reference TEXT,
        amount DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'PENDING',
        payment_url TEXT,
        qr_url TEXT,
        payment_method TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

            // Payment Method Configuration table
            `CREATE TABLE IF NOT EXISTS payment_method_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        default_method TEXT DEFAULT 'QRIS',
        available_methods TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

            // Bot Configuration table
            `CREATE TABLE IF NOT EXISTS bot_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        welcome_message TEXT NOT NULL,
        help_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
        ];

        for (const table of tables) {
            await this.run(table);
        }

        // Run migrations for existing databases
        await this.runMigrations();

        // Insert default admin user
        await this.createDefaultAdmin();

        // Initialize payment method configuration
        await this.initializePaymentMethodConfig();

        // Initialize bot configuration
        await this.initializeBotConfig();

        console.log('✅ Database tables created successfully');
    }

    async initializePaymentMethodConfig() {
        try {
            // Check if payment method config exists
            const config = await this.get('SELECT * FROM payment_method_config LIMIT 1');

            if (!config) {
                // Insert default configuration - QRIS only
                await this.run(`
                    INSERT INTO payment_method_config (
                        default_method, 
                        available_methods, 
                        created_at, 
                        updated_at
                    ) VALUES (?, ?, datetime('now'), datetime('now'))
                `, ['QRIS', JSON.stringify(['QRIS'])]);

                console.log('✅ Default QRIS payment method configuration initialized');
            }
        } catch (error) {
            console.error('❌ Error initializing payment method config:', error);
        }
    }

    async initializeBotConfig() {
        try {
            // Check if bot config exists
            const config = await this.get('SELECT * FROM bot_config LIMIT 1');

            if (!config) {
                // Insert default welcome message
                const defaultWelcomeMessage = `🛍️ *Selamat Datang di Toko Produk Digital!*

Hai {first_name}! 👋

Saya adalah asisten produk digital Anda. Berikut yang dapat Anda lakukan:

📋 *Perintah:*
• /shop - Jelajahi produk kami
• /cart - Lihat keranjang belanja Anda
• /orders - Periksa riwayat pesanan
• /balance - Periksa saldo Anda
• /deposit - Tambahkan uang ke saldo
• /help - Dapatkan bantuan

🎮 *Fitur:*
• Jelajahi produk digital
• Tambahkan item ke keranjang
• Bayar dengan saldo
• Pengiriman instan
• Pelacakan pesanan
• Manajemen saldo

Siap untuk mulai berbelanja? Gunakan /shop untuk menjelajahi produk kami!`;

                await this.run(`
                    INSERT INTO bot_config (
                        welcome_message, 
                        help_message, 
                        created_at, 
                        updated_at
                    ) VALUES (?, ?, datetime('now'), datetime('now'))
                `, [defaultWelcomeMessage, null]);

                console.log('✅ Default bot configuration initialized');
            }
        } catch (error) {
            console.error('❌ Error initializing bot config:', error);
        }
    }

    async runMigrations() {
        try {
            // Check if balance column exists in users table
            const columns = await this.all("PRAGMA table_info(users)");
            const hasBalanceColumn = columns.some(col => col.name === 'balance');

            if (!hasBalanceColumn) {
                console.log('🔄 Adding balance column to users table...');
                await this.run('ALTER TABLE users ADD COLUMN balance DECIMAL(10,2) DEFAULT 0.00');
                console.log('✅ Balance column added successfully');
            }

            // Check if transactions table exists
            const tables = await this.all("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'");
            if (tables.length === 0) {
                console.log('🔄 Creating transactions table...');
                await this.run(`
                    CREATE TABLE transactions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        type TEXT NOT NULL,
                        amount DECIMAL(10,2) NOT NULL,
                        description TEXT,
                        order_id INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id),
                        FOREIGN KEY (order_id) REFERENCES orders (id)
                    )
                `);
                console.log('✅ Transactions table created successfully');
            }
        } catch (error) {
            console.error('❌ Error running migrations:', error);
        }
    }

    async createDefaultAdmin() {
        try {
            const admin = await this.get('SELECT * FROM users WHERE is_admin = 1 LIMIT 1');
            if (!admin) {
                await this.run(`
                    INSERT INTO users (telegram_id, username, first_name, last_name, is_admin, created_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                `, [123456789, 'admin', 'Admin', 'User', 1]);
                console.log('✅ Default admin user created');
            }
        } catch (error) {
            console.error('❌ Error creating default admin:', error);
        }
    }

    async getPaymentMethodConfig() {
        try {
            const config = await this.get('SELECT * FROM payment_method_config ORDER BY id DESC LIMIT 1');
            if (config) {
                return {
                    ...config,
                    available_methods: config.available_methods ? JSON.parse(config.available_methods) : []
                };
            }
            return null;
        } catch (error) {
            console.error('❌ Error getting payment method config:', error);
            return null;
        }
    }

    async updatePaymentMethodConfig(defaultMethod, availableMethods = null) {
        try {
            const validMethods = ['QRIS', 'QRISC', 'QRIS2'];
            const methodToStore = validMethods.includes(defaultMethod) ? defaultMethod : 'QRIS';
            const methodsToStore = ['QRIS', 'QRISC', 'QRIS2'];
            const currentConfig = await this.getPaymentMethodConfig();

            if (currentConfig) {
                await this.run(`
                    UPDATE payment_method_config 
                    SET default_method = ?, available_methods = ?, updated_at = datetime('now')
                    WHERE id = ?
                `, [methodToStore, JSON.stringify(methodsToStore), currentConfig.id]);
            } else {
                await this.run(`
                    INSERT INTO payment_method_config (
                        default_method, available_methods, created_at, updated_at
                    ) VALUES (?, ?, datetime('now'), datetime('now'))
                `, [methodToStore, JSON.stringify(methodsToStore)]);
            }

            console.log('✅ QRIS payment method configuration updated');
            return true;
        } catch (error) {
            console.error('❌ Error updating QRIS payment method config:', error);
            return false;
        }
    }

    // Database operations
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // User operations
    async createUser(telegramId, username, firstName, lastName) {
        // Insert if not exists
        await this.run(
            'INSERT OR IGNORE INTO users (telegram_id, username, first_name, last_name) VALUES (?, ?, ?, ?)',
            [telegramId, username, firstName, lastName]
        );
        // Update username, first_name, last_name if user already exists
        await this.run(
            'UPDATE users SET username = ?, first_name = ?, last_name = ? WHERE telegram_id = ?',
            [username, firstName, lastName, telegramId]
        );
        // Return the user
        return await this.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
    }

    async getUserByTelegramId(telegramId) {
        return await this.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
    }

    // Product operations
    async createProduct(productData) {
        const { name, description, price, categoryId, productType, filePath, downloadLink, productCode, stockQuantity } = productData;
        return await this.run(
            'INSERT INTO products (name, description, price, category_id, product_type, file_path, download_link, product_code, stock_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, price, categoryId, productType, filePath, downloadLink, productCode, stockQuantity]
        );
    }

    async getAllProducts() {
        return await this.all(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = 1
      ORDER BY p.created_at DESC
    `);
    }

    async getProductById(id) {
        return await this.get(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ? AND p.is_active = 1
    `, [id]);
    }

    async updateProduct(id, productData) {
        const { name, description, price, categoryId, productType, filePath, downloadLink, productCode, stockQuantity, isActive } = productData;
        return await this.run(
            'UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, product_type = ?, file_path = ?, download_link = ?, product_code = ?, stock_quantity = ?, is_active = ? WHERE id = ?',
            [name, description, price, categoryId, productType, filePath, downloadLink, productCode, stockQuantity, isActive, id]
        );
    }

    async deleteProduct(id) {
        return await this.run('DELETE FROM products WHERE id = ?', [id]);
    }

    // Category operations
    async createCategory(name, description) {
        return await this.run('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description]);
    }

    async getAllCategories() {
        return await this.all('SELECT * FROM categories ORDER BY name');
    }

    // Cart operations
    async addToCart(userId, productId, quantity = 1) {
        // Check if item already in cart
        const existing = await this.get('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId]);

        if (existing) {
            return await this.run(
                'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
                [quantity, userId, productId]
            );
        } else {
            return await this.run(
                'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                [userId, productId, quantity]
            );
        }
    }

    async getCart(userId) {
        return await this.all(`
      SELECT c.*, p.name, p.price, p.description 
      FROM cart c 
      JOIN products p ON c.product_id = p.id 
      WHERE c.user_id = ?
    `, [userId]);
    }

    async removeFromCart(userId, productId) {
        return await this.run('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId]);
    }

    async clearCart(userId) {
        return await this.run('DELETE FROM cart WHERE user_id = ?', [userId]);
    }

    // Order operations
    async createOrder(userId, productId, quantity, totalPrice, paymentMethod = 'telegram') {
        return await this.run(
            'INSERT INTO orders (user_id, product_id, quantity, total_price, payment_method) VALUES (?, ?, ?, ?, ?)',
            [userId, productId, quantity, totalPrice, paymentMethod]
        );
    }

    async getUserOrders(userId) {
        return await this.all(`
      SELECT o.*, p.name as product_name, p.description 
      FROM orders o 
      JOIN products p ON o.product_id = p.id 
      WHERE o.user_id = ? 
      ORDER BY o.created_at DESC
    `, [userId]);
    }

    async getAllOrders() {
        return await this.all(`
      SELECT o.*, p.name as product_name, u.username, u.first_name 
      FROM orders o 
      JOIN products p ON o.product_id = p.id 
      JOIN users u ON o.user_id = u.id 
      ORDER BY o.created_at DESC
    `);
    }

    async updateOrderStatus(orderId, status) {
        // Get order details before updating
        const order = await this.get('SELECT product_id, quantity FROM orders WHERE id = ?', [orderId]);
        if (!order) return;

        // If order is being cancelled and was previously completed, restore stock
        if (status === 'cancelled') {
            const currentOrder = await this.get('SELECT status FROM orders WHERE id = ?', [orderId]);
            if (currentOrder && currentOrder.status === 'completed') {
                await this.restoreProductStock(order.product_id, order.quantity);
            }
        }
        // If order is being completed and was previously cancelled, reduce stock
        else if (status === 'completed') {
            const currentOrder = await this.get('SELECT status FROM orders WHERE id = ?', [orderId]);
            if (currentOrder && currentOrder.status === 'cancelled') {
                await this.updateProductStock(order.product_id, order.quantity);
            }
        }

        return await this.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    }

    async updateProductStock(productId, quantitySold) {
        // Get current product stock
        const product = await this.get('SELECT stock_quantity FROM products WHERE id = ?', [productId]);
        if (!product) return;

        // Only update if product has limited stock (not unlimited)
        if (product.stock_quantity !== -1) {
            const newStock = Math.max(0, product.stock_quantity - quantitySold);
            await this.run('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, productId]);
        }
    }

    async restoreProductStock(productId, quantityRestored) {
        // Get current product stock
        const product = await this.get('SELECT stock_quantity FROM products WHERE id = ?', [productId]);
        if (!product) return;

        // Only update if product has limited stock (not unlimited)
        if (product.stock_quantity !== -1) {
            const newStock = product.stock_quantity + quantityRestored;
            await this.run('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, productId]);
        }
    }

    // Product Codes Management
    async addProductCodes(productId, codes) {
        const codeArray = Array.isArray(codes) ? codes : [codes];
        for (const code of codeArray) {
            await this.run(
                'INSERT INTO product_codes (product_id, code) VALUES (?, ?)',
                [productId, code.trim()]
            );
        }
    }

    async getAvailableProductCodes(productId, limit = 1) {
        return await this.all(
            'SELECT * FROM product_codes WHERE product_id = ? AND is_used = 0 ORDER BY created_at ASC LIMIT ?',
            [productId, limit]
        );
    }

    async getProductCodesCount(productId) {
        const total = await this.get(
            'SELECT COUNT(*) as count FROM product_codes WHERE product_id = ?',
            [productId]
        );
        const available = await this.get(
            'SELECT COUNT(*) as count FROM product_codes WHERE product_id = ? AND is_used = 0',
            [productId]
        );
        return {
            total: total.count,
            available: available.count
        };
    }

    async useProductCode(codeId, userId) {
        return await this.run(
            'UPDATE product_codes SET is_used = 1, used_by_user_id = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?',
            [userId, codeId]
        );
    }

    async getProductCodeById(codeId) {
        return await this.get('SELECT * FROM product_codes WHERE id = ?', [codeId]);
    }

    async getAllProductCodes(productId) {
        return await this.all(
            'SELECT pc.*, u.username, u.first_name FROM product_codes pc LEFT JOIN users u ON pc.used_by_user_id = u.id WHERE pc.product_id = ? ORDER BY pc.created_at DESC',
            [productId]
        );
    }

    async deleteProductCode(codeId) {
        return await this.run('DELETE FROM product_codes WHERE id = ?', [codeId]);
    }

    async generateProductCodes(productId, count, prefix = '') {
        const codes = [];
        for (let i = 0; i < count; i++) {
            const code = `${prefix}${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
            codes.push(code);
        }
        await this.addProductCodes(productId, codes);
        return codes;
    }

    // Balance Management
    async getUserBalance(userId) {
        try {
            const user = await this.get('SELECT balance FROM users WHERE id = ?', [userId]);
            return user ? parseFloat(user.balance || 0) : 0;
        } catch (error) {
            console.error('Error getting user balance:', error);
            return 0;
        }
    }

    async updateUserBalance(userId, amount, type, description, orderId = null) {
        try {
            // Start transaction
            await this.run('BEGIN TRANSACTION');

            // Check if user exists
            const user = await this.get('SELECT id FROM users WHERE id = ?', [userId]);
            if (!user) {
                console.error(`[updateUserBalance] User not found: userId=${userId}`);
                throw new Error('User not found');
            }

            // Update user balance
            const updateResult = await this.run(
                'UPDATE users SET balance = COALESCE(balance, 0) + ? WHERE id = ?',
                [amount, userId]
            );
            console.log(`[updateUserBalance] Updated userId=${userId}, amount=${amount}, changes=${updateResult.changes}`);

            // Record transaction
            await this.run(
                'INSERT INTO transactions (user_id, type, amount, description, order_id) VALUES (?, ?, ?, ?, ?)',
                [userId, type, amount, description, orderId]
            );

            await this.run('COMMIT');
            return true;
        } catch (error) {
            await this.run('ROLLBACK');
            throw error;
        }
    }

    async getUserTransactions(userId, limit = 10) {
        return await this.all(`
      SELECT t.*, o.id as order_id, p.name as product_name 
      FROM transactions t 
      LEFT JOIN orders o ON t.order_id = o.id 
      LEFT JOIN products p ON o.product_id = p.id 
      WHERE t.user_id = ? 
      ORDER BY t.created_at DESC 
      LIMIT ?
    `, [userId, limit]);
    }

    async getAllTransactions(limit = 50) {
        return await this.all(`
      SELECT t.*, u.username, u.first_name, o.id as order_id, p.name as product_name 
      FROM transactions t 
      LEFT JOIN users u ON t.user_id = u.id 
      LEFT JOIN orders o ON t.order_id = o.id 
      LEFT JOIN products p ON o.product_id = p.id 
      ORDER BY t.created_at DESC 
      LIMIT ?
    `, [limit]);
    }

    async depositToBalance(userId, amount, description = 'Deposit') {
        console.log(`[depositToBalance] userId=${userId}, amount=${amount}, description=${description}`);
        return await this.updateUserBalance(userId, amount, 'deposit', description);
    }

    async withdrawFromBalance(userId, amount, description = 'Purchase') {
        const currentBalance = await this.getUserBalance(userId);
        if (currentBalance < amount) {
            throw new Error('Insufficient balance');
        }
        return await this.updateUserBalance(userId, -amount, 'withdrawal', description);
    }

    // Redeem Code Management
    async createRedeemCode(code, amount) {
        return await this.run(
            'INSERT INTO redeem_codes (code, amount) VALUES (?, ?)',
            [code, amount]
        );
    }
    async generateRedeemCode(amount, prefix = 'RC') {
        const code = `${prefix}${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        await this.createRedeemCode(code, amount);
        return code;
    }
    async getRedeemCode(code) {
        return await this.get('SELECT * FROM redeem_codes WHERE code = ?', [code]);
    }
    async getAllRedeemCodes() {
        return await this.all('SELECT rc.*, u.username as used_by_username FROM redeem_codes rc LEFT JOIN users u ON rc.used_by_user_id = u.id ORDER BY rc.created_at DESC');
    }
    async useRedeemCode(code, userId) {
        // Validate code
        const redeem = await this.getRedeemCode(code);
        if (!redeem) throw new Error('Invalid code');
        if (redeem.is_used) throw new Error('Code already used');
        // Mark as used
        await this.run('UPDATE redeem_codes SET is_used = 1, used_by_user_id = ?, used_at = CURRENT_TIMESTAMP WHERE code = ?', [userId, code]);
        // Add balance
        await this.depositToBalance(userId, redeem.amount, `Redeem code: ${code}`);
        return redeem.amount;
    }
    async deleteRedeemCode(codeId) {
        return await this.run('DELETE FROM redeem_codes WHERE id = ?', [codeId]);
    }

    // Bot Configuration Methods
    async getBotConfig() {
        return await this.get('SELECT * FROM bot_config ORDER BY id DESC LIMIT 1');
    }

    async updateBotConfig(welcomeMessage, helpMessage = null) {
        const config = await this.getBotConfig();

        if (config) {
            // Update existing config
            return await this.run(`
                UPDATE bot_config 
                SET welcome_message = ?, help_message = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [welcomeMessage, helpMessage, config.id]);
        } else {
            // Create new config
            return await this.run(`
                INSERT INTO bot_config (welcome_message, help_message, created_at, updated_at)
                VALUES (?, ?, datetime('now'), datetime('now'))
            `, [welcomeMessage, helpMessage]);
        }
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = Database; 