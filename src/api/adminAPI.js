const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

class AdminAPI {
    constructor(db) {
        this.db = db;
        this.router = express.Router();
        this.setupFileUpload();
        this.setupRoutes();
    }

    setupFileUpload() {
        const uploadPath = process.env.UPLOAD_PATH || './uploads';
        fs.ensureDirSync(uploadPath);

        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const uniqueName = `${uuidv4()}-${file.originalname}`;
                cb(null, uniqueName);
            }
        });

        this.upload = multer({
            storage: storage,
            limits: {
                fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
            },
            fileFilter: (req, file, cb) => {
                // Allow common file types
                const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar|mp4|mp3/;
                const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
                const mimetype = allowedTypes.test(file.mimetype);

                if (mimetype && extname) {
                    return cb(null, true);
                } else {
                    cb(new Error('Invalid file type'));
                }
            }
        });
    }

    setupRoutes() {
        // Authentication middleware
        this.router.use(this.authenticateAdmin.bind(this));

        // Product routes
        this.router.get('/products', this.getProducts.bind(this));
        this.router.get('/products/:id', this.getProduct.bind(this));
        this.router.post('/products', this.upload.single('file'), this.createProduct.bind(this));
        this.router.put('/products/:id', this.upload.single('file'), this.updateProduct.bind(this));
        this.router.delete('/products/:id', this.deleteProduct.bind(this));

        // Category routes
        this.router.get('/categories', this.getCategories.bind(this));
        this.router.post('/categories', this.createCategory.bind(this));
        this.router.put('/categories/:id', this.updateCategory.bind(this));
        this.router.delete('/categories/:id', this.deleteCategory.bind(this));

        // Order routes
        this.router.get('/orders', this.getOrders.bind(this));
        this.router.get('/orders/:id', this.getOrder.bind(this));
        this.router.put('/orders/:id/status', this.updateOrderStatus.bind(this));

        // User routes
        this.router.get('/users', this.getUsers.bind(this));
        this.router.get('/users/:id', this.getUser.bind(this));

        // Analytics routes
        this.router.get('/analytics', this.getAnalytics.bind(this));
        this.router.get('/analytics/sales', this.getSalesAnalytics.bind(this));

        // File management
        this.router.get('/files', this.getFiles.bind(this));
        this.router.delete('/files/:filename', this.deleteFile.bind(this));

        // Product Codes management
        this.router.get('/products/:id/codes', this.getProductCodes.bind(this));
        this.router.post('/products/:id/codes', this.addProductCodes.bind(this));
        this.router.post('/products/:id/codes/generate', this.generateProductCodes.bind(this));
        this.router.delete('/codes/:codeId', this.deleteProductCode.bind(this));

        // Balance management
        this.router.get('/users/:id/balance', this.getUserBalance.bind(this));
        this.router.post('/users/:id/balance/deposit', this.depositUserBalance.bind(this));
        this.router.post('/users/:id/balance/withdraw', this.withdrawUserBalance.bind(this));
        this.router.get('/transactions', this.getAllTransactions.bind(this));

        // Redeem Code management
        this.router.get('/redeem-codes', this.getAllRedeemCodes.bind(this));
        this.router.post('/redeem-codes', this.createRedeemCode.bind(this));
        this.router.post('/redeem-codes/generate', this.generateRedeemCode.bind(this));
        this.router.delete('/redeem-codes/:id', this.deleteRedeemCode.bind(this));

        // Bot Configuration Management
        this.router.get('/bot-config', this.getBotConfig.bind(this));
        this.router.post('/bot-config', this.updateBotConfig.bind(this));

        // Tripay Configuration Management
        this.router.get('/tripay-config', async (req, res) => {
            try {
                const config = {
                    TRIPAY_API_KEY: process.env.TRIPAY_API_KEY || '',
                    TRIPAY_PRIVATE_KEY: process.env.TRIPAY_PRIVATE_KEY || '',
                    TRIPAY_MERCHANT_CODE: process.env.TRIPAY_MERCHANT_CODE || '',
                    TRIPAY_ENVIRONMENT: process.env.TRIPAY_ENVIRONMENT || 'sandbox',
                    TRIPAY_BASE_URL: process.env.TRIPAY_BASE_URL || 'https://tripay.co.id/api',
                    TRIPAY_SANDBOX_URL: process.env.TRIPAY_SANDBOX_URL || 'https://tripay.co.id/api-sandbox'
                };
                res.json({ success: true, data: config });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        this.router.post('/tripay-config', async (req, res) => {
            try {
                const { TRIPAY_API_KEY, TRIPAY_PRIVATE_KEY, TRIPAY_MERCHANT_CODE, TRIPAY_ENVIRONMENT } = req.body;

                // Read current .env file
                const envPath = path.join(__dirname, '../../.env');
                let envContent = '';

                try {
                    envContent = fs.readFileSync(envPath, 'utf8');
                } catch (error) {
                    // If .env doesn't exist, create from example
                    const envExamplePath = path.join(__dirname, '../../env.example');
                    envContent = fs.readFileSync(envExamplePath, 'utf8');
                }

                // Update Tripay configuration
                const updates = {
                    'TRIPAY_API_KEY': TRIPAY_API_KEY,
                    'TRIPAY_PRIVATE_KEY': TRIPAY_PRIVATE_KEY,
                    'TRIPAY_MERCHANT_CODE': TRIPAY_MERCHANT_CODE,
                    'TRIPAY_ENVIRONMENT': TRIPAY_ENVIRONMENT || 'sandbox'
                };

                // Update each configuration value
                Object.entries(updates).forEach(([key, value]) => {
                    const regex = new RegExp(`^${key}=.*`, 'm');
                    if (regex.test(envContent)) {
                        envContent = envContent.replace(regex, `${key}=${value}`);
                    } else {
                        // Add new line if not found
                        envContent += `\n${key}=${value}`;
                    }
                });

                // Write back to .env file
                fs.writeFileSync(envPath, envContent);

                // Reload environment variables
                require('dotenv').config();

                res.json({
                    success: true,
                    message: 'Tripay configuration updated successfully. Please restart the server for changes to take effect.'
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        this.router.post('/tripay-config/test', async (req, res) => {
            try {
                const { TRIPAY_API_KEY, TRIPAY_PRIVATE_KEY, TRIPAY_MERCHANT_CODE, TRIPAY_ENVIRONMENT } = req.body;

                // Test the configuration by making a simple API call
                const baseUrl = TRIPAY_ENVIRONMENT === 'production'
                    ? 'https://tripay.co.id/api'
                    : 'https://tripay.co.id/api-sandbox';

                const headers = {
                    'Authorization': `Bearer ${TRIPAY_API_KEY}`,
                    'Content-Type': 'application/json'
                };

                // Test API connection by getting payment channels
                const response = await axios.get(`${baseUrl}/merchant/payment-channel`, {
                    headers: headers
                });

                res.json({
                    success: true,
                    message: 'Configuration test successful!',
                    data: {
                        environment: TRIPAY_ENVIRONMENT,
                        baseUrl: baseUrl,
                        paymentChannels: response.data.data ? response.data.data.length : 0
                    }
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Configuration test failed',
                    error: error.response ? error.response.data : error.message
                });
            }
        });

        // Payment Channels Management
        this.router.get('/payment-channels', async (req, res) => {
            try {
                const tripayService = require('../services/tripayService');
                const channels = await tripayService.getPaymentChannels();

                // Filter only QRIS channels
                const qrisChannels = channels.data ? channels.data.filter(channel =>
                    channel.name && channel.name.toLowerCase().includes('qris') ||
                    channel.code && channel.code.toLowerCase().includes('qris') ||
                    channel.group && channel.group.toLowerCase().includes('qris')
                ) : [];

                res.json({
                    success: true,
                    data: qrisChannels,
                    total: qrisChannels.length,
                    filtered: 'QRIS only'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Payment Method Configuration Management
        this.router.get('/payment-method-config', async (req, res) => {
            try {
                const config = await this.db.getPaymentMethodConfig();
                res.json({
                    success: true,
                    data: config
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        this.router.post('/payment-method-config', async (req, res) => {
            try {
                const { default_method } = req.body;
                const success = await this.db.updatePaymentMethodConfig(default_method, ['QRIS', 'QRISC', 'QRIS2']);

                if (success) {
                    res.json({
                        success: true,
                        message: 'QRIS payment method configuration updated successfully'
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to update QRIS payment method configuration'
                    });
                }
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        this.router.get('/payment-channels/refresh', async (req, res) => {
            try {
                const tripayService = require('../services/tripayService');
                const channels = await tripayService.getPaymentChannels();

                // Filter only QRIS channels
                const qrisChannels = channels.data ? channels.data.filter(channel =>
                    channel.name && channel.name.toLowerCase().includes('qris') ||
                    channel.code && channel.code.toLowerCase().includes('qris') ||
                    channel.group && channel.group.toLowerCase().includes('qris')
                ) : [];

                res.json({
                    success: true,
                    message: 'QRIS payment channels refreshed successfully',
                    data: qrisChannels,
                    total: qrisChannels.length,
                    timestamp: new Date().toISOString(),
                    filtered: 'QRIS only'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        this.router.get('/payment-channels/:group', async (req, res) => {
            try {
                const { group } = req.params;
                const tripayService = require('../services/tripayService');
                const channels = await tripayService.getPaymentChannels();

                // Filter channels by group and ensure they are QRIS-related
                const filteredChannels = channels.data ? channels.data.filter(channel =>
                    channel.group && channel.group.toLowerCase() === group.toLowerCase() &&
                    (channel.name && channel.name.toLowerCase().includes('qris') ||
                        channel.code && channel.code.toLowerCase().includes('qris') ||
                        channel.group && channel.group.toLowerCase().includes('qris'))
                ) : [];

                res.json({
                    success: true,
                    data: filteredChannels,
                    total: filteredChannels.length,
                    group: group,
                    filtered: 'QRIS only'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        this.router.get('/payment-channels/export/csv', async (req, res) => {
            try {
                const tripayService = require('../services/tripayService');
                const channels = await tripayService.getPaymentChannels();

                // Filter only QRIS channels
                const qrisChannels = channels.data ? channels.data.filter(channel =>
                    channel.name && channel.name.toLowerCase().includes('qris') ||
                    channel.code && channel.code.toLowerCase().includes('qris') ||
                    channel.group && channel.group.toLowerCase().includes('qris')
                ) : [];

                if (!qrisChannels || qrisChannels.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'No QRIS payment channels available for export'
                    });
                }

                // Generate CSV content
                const csvHeaders = [
                    'Name',
                    'Code',
                    'Group',
                    'Type',
                    'Status',
                    'Fee Type',
                    'Fee Amount',
                    'Minimum Amount',
                    'Maximum Amount'
                ].join(',');

                const csvRows = qrisChannels.map(channel => [
                    `"${channel.name || ''}"`,
                    `"${channel.code || ''}"`,
                    `"${channel.group || ''}"`,
                    `"${channel.type || ''}"`,
                    `"${channel.active ? 'Active' : 'Inactive'}"`,
                    `"${channel.fee ? channel.fee.type || '' : ''}"`,
                    `"${channel.fee ? (channel.fee.flat || channel.fee.percentage || '') : ''}"`,
                    `"${channel.minimum || ''}"`,
                    `"${channel.maximum || ''}"`
                ].join(','));

                const csvContent = [csvHeaders, ...csvRows].join('\n');

                // Set response headers for CSV download
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="qris-payment-channels-${new Date().toISOString().split('T')[0]}.csv"`);

                res.send(csvContent);
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    async authenticateAdmin(req, res, next) {
        // Simple admin authentication
        // In production, use proper JWT authentication
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        const { username, password } = req.headers;

        if (username === adminUsername && password === adminPassword) {
            next();
        } else {
            res.status(401).json({ error: 'Unauthorized' });
        }
    }

    // Product endpoints
    async getProducts(req, res) {
        try {
            const { page = 1, limit = 10, category, search } = req.query;
            const offset = (page - 1) * limit;

            let query = `
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id
      `;
            let params = [];

            const conditions = [];
            if (category) {
                conditions.push('p.category_id = ?');
                params.push(category);
            }
            if (search) {
                conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
                params.push(`%${search}%`, `%${search}%`);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), offset);

            const products = await this.db.all(query, params);
            const total = await this.db.get('SELECT COUNT(*) as count FROM products');

            res.json({
                products,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total.count,
                    pages: Math.ceil(total.count / limit)
                }
            });
        } catch (error) {
            console.error('Error getting products:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getProduct(req, res) {
        try {
            const { id } = req.params;
            const product = await this.db.getProductById(id);

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            res.json(product);
        } catch (error) {
            console.error('Error getting product:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async createProduct(req, res) {
        try {
            const {
                name,
                description,
                price,
                categoryId,
                productType,
                downloadLink,
                productCode,
                stockQuantity
            } = req.body;

            if (!name || !price || !productType) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            let filePath = null;
            if (req.file) {
                filePath = req.file.filename;
            }

            const productData = {
                name,
                description,
                price: parseFloat(price),
                categoryId: categoryId ? parseInt(categoryId) : null,
                productType,
                filePath,
                downloadLink,
                productCode,
                stockQuantity: stockQuantity ? parseInt(stockQuantity) : -1
            };

            const result = await this.db.createProduct(productData);
            const newProduct = await this.db.getProductById(result.id);

            res.status(201).json(newProduct);
        } catch (error) {
            console.error('Error creating product:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateProduct(req, res) {
        try {
            const { id } = req.params;
            const {
                name,
                description,
                price,
                categoryId,
                productType,
                downloadLink,
                productCode,
                stockQuantity,
                isActive
            } = req.body;

            const existingProduct = await this.db.getProductById(id);
            if (!existingProduct) {
                return res.status(404).json({ error: 'Product not found' });
            }

            let filePath = existingProduct.file_path;
            if (req.file) {
                // Delete old file if exists
                if (existingProduct.file_path) {
                    const oldFilePath = path.join(process.env.UPLOAD_PATH || './uploads', existingProduct.file_path);
                    await fs.remove(oldFilePath).catch(() => { });
                }
                filePath = req.file.filename;
            }

            const productData = {
                name: name || existingProduct.name,
                description: description || existingProduct.description,
                price: price ? parseFloat(price) : existingProduct.price,
                categoryId: categoryId ? parseInt(categoryId) : existingProduct.category_id,
                productType: productType || existingProduct.product_type,
                filePath,
                downloadLink: downloadLink || existingProduct.download_link,
                productCode: productCode || existingProduct.product_code,
                stockQuantity: stockQuantity ? parseInt(stockQuantity) : existingProduct.stock_quantity,
                isActive: isActive !== undefined ? Boolean(isActive) : existingProduct.is_active
            };

            await this.db.updateProduct(id, productData);
            const updatedProduct = await this.db.getProductById(id);

            res.json(updatedProduct);
        } catch (error) {
            console.error('Error updating product:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async deleteProduct(req, res) {
        try {
            const { id } = req.params;

            const product = await this.db.getProductById(id);
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            // Delete associated file if exists
            if (product.file_path) {
                const filePath = path.join(process.env.UPLOAD_PATH || './uploads', product.file_path);
                await fs.remove(filePath).catch(() => { });
            }

            await this.db.deleteProduct(id);
            res.json({ message: 'Product deleted successfully' });
        } catch (error) {
            console.error('Error deleting product:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Category endpoints
    async getCategories(req, res) {
        try {
            const categories = await this.db.getAllCategories();
            res.json(categories);
        } catch (error) {
            console.error('Error getting categories:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async createCategory(req, res) {
        try {
            const { name, description } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Category name is required' });
            }

            const result = await this.db.createCategory(name, description);
            const newCategory = await this.db.get('SELECT * FROM categories WHERE id = ?', [result.id]);

            res.status(201).json(newCategory);
        } catch (error) {
            console.error('Error creating category:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateCategory(req, res) {
        try {
            const { id } = req.params;
            const { name, description } = req.body;

            const existingCategory = await this.db.get('SELECT * FROM categories WHERE id = ?', [id]);
            if (!existingCategory) {
                return res.status(404).json({ error: 'Category not found' });
            }

            await this.db.run(
                'UPDATE categories SET name = ?, description = ? WHERE id = ?',
                [name || existingCategory.name, description || existingCategory.description, id]
            );

            const updatedCategory = await this.db.get('SELECT * FROM categories WHERE id = ?', [id]);
            res.json(updatedCategory);
        } catch (error) {
            console.error('Error updating category:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async deleteCategory(req, res) {
        try {
            const { id } = req.params;

            const existingCategory = await this.db.get('SELECT * FROM categories WHERE id = ?', [id]);
            if (!existingCategory) {
                return res.status(404).json({ error: 'Category not found' });
            }

            // Check if category has products
            const products = await this.db.get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]);
            if (products.count > 0) {
                return res.status(400).json({ error: 'Cannot delete category with existing products' });
            }

            await this.db.run('DELETE FROM categories WHERE id = ?', [id]);
            res.json({ message: 'Category deleted successfully' });
        } catch (error) {
            console.error('Error deleting category:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Order endpoints
    async getOrders(req, res) {
        try {
            const { page = 1, limit = 10, status } = req.query;
            const offset = (page - 1) * limit;

            let query = `
        SELECT o.*, p.name as product_name, u.username, u.first_name 
        FROM orders o 
        JOIN products p ON o.product_id = p.id 
        JOIN users u ON o.user_id = u.id
      `;
            let params = [];

            if (status) {
                query += ' WHERE o.status = ?';
                params.push(status);
            }

            query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), offset);

            const orders = await this.db.all(query, params);
            const total = await this.db.get('SELECT COUNT(*) as count FROM orders');

            res.json({
                orders,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total.count,
                    pages: Math.ceil(total.count / limit)
                }
            });
        } catch (error) {
            console.error('Error getting orders:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getOrder(req, res) {
        try {
            const { id } = req.params;
            const order = await this.db.get(`
        SELECT o.*, p.name as product_name, p.description, u.username, u.first_name, u.last_name
        FROM orders o 
        JOIN products p ON o.product_id = p.id 
        JOIN users u ON o.user_id = u.id 
        WHERE o.id = ?
      `, [id]);

            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            res.json(order);
        } catch (error) {
            console.error('Error getting order:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateOrderStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status) {
                return res.status(400).json({ error: 'Status is required' });
            }

            const order = await this.db.get('SELECT * FROM orders WHERE id = ?', [id]);
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            await this.db.updateOrderStatus(id, status);
            const updatedOrder = await this.db.get('SELECT * FROM orders WHERE id = ?', [id]);

            res.json(updatedOrder);
        } catch (error) {
            console.error('Error updating order status:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // User endpoints
    async getUsers(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            const users = await this.db.all(
                'SELECT * FROM users WHERE is_admin = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [parseInt(limit), offset]
            );
            const total = await this.db.get('SELECT COUNT(*) as count FROM users WHERE is_admin = 0');

            res.json({
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total.count,
                    pages: Math.ceil(total.count / limit)
                }
            });
        } catch (error) {
            console.error('Error getting users:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getUser(req, res) {
        try {
            const { id } = req.params;
            const user = await this.db.get('SELECT * FROM users WHERE id = ?', [id]);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Get user's orders
            const orders = await this.db.getUserOrders(id);

            res.json({
                user,
                orders
            });
        } catch (error) {
            console.error('Error getting user:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Analytics endpoints
    async getAnalytics(req, res) {
        try {
            const totalProducts = await this.db.get('SELECT COUNT(*) as count FROM products');
            const totalOrders = await this.db.get('SELECT COUNT(*) as count FROM orders');
            const totalUsers = await this.db.get('SELECT COUNT(*) as count FROM users WHERE is_admin = 0');
            const totalRevenue = await this.db.get('SELECT SUM(total_price) as total FROM orders WHERE status = "completed"');
            const pendingOrders = await this.db.get('SELECT COUNT(*) as count FROM orders WHERE status = "pending"');

            res.json({
                totalProducts: totalProducts.count,
                totalOrders: totalOrders.count,
                totalUsers: totalUsers.count,
                totalRevenue: parseFloat(totalRevenue.total || 0).toFixed(2),
                pendingOrders: pendingOrders.count
            });
        } catch (error) {
            console.error('Error getting analytics:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getSalesAnalytics(req, res) {
        try {
            const { period = '7d' } = req.query;

            let dateFilter;
            switch (period) {
                case '24h':
                    dateFilter = "datetime('now', '-1 day')";
                    break;
                case '7d':
                    dateFilter = "datetime('now', '-7 days')";
                    break;
                case '30d':
                    dateFilter = "datetime('now', '-30 days')";
                    break;
                default:
                    dateFilter = "datetime('now', '-7 days')";
            }

            const sales = await this.db.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders,
          SUM(total_price) as revenue
        FROM orders 
        WHERE created_at >= ${dateFilter}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

            res.json(sales);
        } catch (error) {
            console.error('Error getting sales analytics:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // File management endpoints
    async getFiles(req, res) {
        try {
            const uploadPath = process.env.UPLOAD_PATH || './uploads';
            const files = await fs.readdir(uploadPath);

            const fileStats = await Promise.all(
                files.map(async (filename) => {
                    const filePath = path.join(uploadPath, filename);
                    const stats = await fs.stat(filePath);
                    return {
                        filename,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime
                    };
                })
            );

            res.json(fileStats);
        } catch (error) {
            console.error('Error getting files:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async deleteFile(req, res) {
        try {
            const { filename } = req.params;
            const uploadPath = process.env.UPLOAD_PATH || './uploads';
            const filePath = path.join(uploadPath, filename);

            // Check if file exists
            if (!await fs.pathExists(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            // Check if file is used by any product
            const product = await this.db.get('SELECT * FROM products WHERE file_path = ?', [filename]);
            if (product) {
                return res.status(400).json({ error: 'Cannot delete file that is used by a product' });
            }

            await fs.remove(filePath);
            res.json({ message: 'File deleted successfully' });
        } catch (error) {
            console.error('Error deleting file:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Product Codes Management
    async getProductCodes(req, res) {
        try {
            const { id } = req.params;
            const codes = await this.db.getAllProductCodes(id);
            const count = await this.db.getProductCodesCount(id);

            res.json({
                codes,
                count
            });
        } catch (error) {
            console.error('Error getting product codes:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async addProductCodes(req, res) {
        try {
            const { id } = req.params;
            const { codes } = req.body;

            if (!codes || !Array.isArray(codes) || codes.length === 0) {
                return res.status(400).json({ error: 'Codes array is required' });
            }

            await this.db.addProductCodes(id, codes);
            res.json({ message: `${codes.length} codes added successfully` });
        } catch (error) {
            console.error('Error adding product codes:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async generateProductCodes(req, res) {
        try {
            const { id } = req.params;
            const { count, prefix } = req.body;

            if (!count || count <= 0) {
                return res.status(400).json({ error: 'Valid count is required' });
            }

            const generatedCodes = await this.db.generateProductCodes(id, count, prefix || '');
            res.json({
                message: `${count} codes generated successfully`,
                codes: generatedCodes
            });
        } catch (error) {
            console.error('Error generating product codes:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async deleteProductCode(req, res) {
        try {
            const { codeId } = req.params;

            const code = await this.db.getProductCodeById(codeId);
            if (!code) {
                return res.status(404).json({ error: 'Product code not found' });
            }

            if (code.is_used) {
                return res.status(400).json({ error: 'Cannot delete used product code' });
            }

            await this.db.deleteProductCode(codeId);
            res.json({ message: 'Product code deleted successfully' });
        } catch (error) {
            console.error('Error deleting product code:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Balance Management
    async getUserBalance(req, res) {
        try {
            const { id } = req.params;

            // Check if user exists
            const user = await this.db.get('SELECT id FROM users WHERE id = ?', [id]);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const balance = await this.db.getUserBalance(id);
            const transactions = await this.db.getUserTransactions(id, 10);

            res.json({
                balance,
                transactions
            });
        } catch (error) {
            console.error('Error getting user balance:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async depositUserBalance(req, res) {
        try {
            const { id } = req.params;
            const { amount, description } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Valid amount is required' });
            }

            await this.db.depositToBalance(id, amount, description || 'Admin deposit');
            const newBalance = await this.db.getUserBalance(id);

            res.json({
                message: 'Balance deposited successfully',
                newBalance
            });
        } catch (error) {
            console.error('Error depositing to balance:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async withdrawUserBalance(req, res) {
        try {
            const { id } = req.params;
            const { amount, description } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Valid amount is required' });
            }

            await this.db.withdrawFromBalance(id, amount, description || 'Admin withdrawal');
            const newBalance = await this.db.getUserBalance(id);

            res.json({
                message: 'Balance withdrawn successfully',
                newBalance
            });
        } catch (error) {
            console.error('Error withdrawing from balance:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getAllTransactions(req, res) {
        try {
            const { limit = 50 } = req.query;
            const transactions = await this.db.getAllTransactions(parseInt(limit));

            res.json(transactions);
        } catch (error) {
            console.error('Error getting all transactions:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Redeem Code Handlers
    async getAllRedeemCodes(req, res) {
        try {
            const codes = await this.db.getAllRedeemCodes();
            res.json(codes);
        } catch (error) {
            console.error('Error getting redeem codes:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async createRedeemCode(req, res) {
        try {
            const { code, amount } = req.body;
            if (!code || !amount || amount <= 0) {
                return res.status(400).json({ error: 'Code and valid amount are required' });
            }
            await this.db.createRedeemCode(code, amount);
            res.json({ message: 'Redeem code created successfully' });
        } catch (error) {
            console.error('Error creating redeem code:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async generateRedeemCode(req, res) {
        try {
            const { amount, prefix } = req.body;
            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Valid amount is required' });
            }
            const code = await this.db.generateRedeemCode(amount, prefix || 'RC');
            res.json({ message: 'Redeem code generated', code });
        } catch (error) {
            console.error('Error generating redeem code:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async deleteRedeemCode(req, res) {
        try {
            const { id } = req.params;
            await this.db.deleteRedeemCode(id);
            res.json({ message: 'Redeem code deleted' });
        } catch (error) {
            console.error('Error deleting redeem code:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Bot Configuration Methods
    async getBotConfig(req, res) {
        try {
            const config = await this.db.getBotConfig();
            res.json({ success: true, data: config });
        } catch (error) {
            console.error('Error getting bot config:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async updateBotConfig(req, res) {
        try {
            const { welcome_message, help_message } = req.body;

            if (!welcome_message) {
                return res.status(400).json({
                    success: false,
                    error: 'Welcome message is required'
                });
            }

            await this.db.updateBotConfig(welcome_message, help_message);
            res.json({
                success: true,
                message: 'Bot configuration updated successfully'
            });
        } catch (error) {
            console.error('Error updating bot config:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = AdminAPI; 