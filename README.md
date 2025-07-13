# telegramshopbot

# 🛍️ Telegram Bot Shop - Digital Products with Tripay Payment

A comprehensive Telegram bot for selling digital products with integrated Tripay payment gateway, admin panel, and REST API.

## ✨ Features

### 🤖 Telegram Bot
- **Product Catalog**: Browse digital products with categories
- **Shopping Cart**: Add/remove items and manage quantities
- **Tripay Payment Integration**: Secure payment processing with multiple payment methods
- **Balance System**: Deposit money and pay with balance
- **Secure Checkout**: Pay with balance or external payment via Tripay
- **Instant Delivery**: Automatic delivery of digital products
- **Order History**: Track all your purchases
- **Transaction History**: View all balance and payment transactions
- **User Management**: Automatic user registration
- **Payment Status Tracking**: Real-time payment status updates

### 💳 Payment Features
- **Multiple Payment Methods**: Bank transfer, e-wallet, convenience store payments
- **Secure Payment Processing**: SHA256 HMAC signature verification
- **Payment Status Polling**: Automatic payment status checking
- **Callback Handling**: Real-time payment notifications
- **Sandbox & Production**: Support for both testing and live environments

### 📦 Digital Product Types
- **📁 Files**: Downloadable files (PDFs, images, videos, etc.)
- **🔗 Links**: Access links to external resources
- **🔑 Codes**: License keys, activation codes, etc.

### 🔧 Admin Panel
- **Product Management**: Add, edit, delete products
- **Category Management**: Organize products by categories
- **Order Management**: View and update order status
- **User Management**: View user details and manage balances
- **Transaction Management**: View all balance and payment transactions
- **User Analytics**: Track sales and user statistics
- **File Management**: Upload and manage product files
- **Payment Monitoring**: Track payment status and transactions

### 🌐 REST API
- **CRUD Operations**: Full product and order management
- **File Upload**: Secure file handling with validation
- **Analytics**: Sales reports and statistics
- **Authentication**: Admin-only access
- **Payment API**: Complete payment gateway integration

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Telegram Bot Token (from @BotFather)
- Tripay Merchant Account (for payment processing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd telebotshop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Telegram Bot Configuration
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook

   # Database Configuration
   DATABASE_PATH=./data/shop.db

   # JWT Secret for Authentication
   JWT_SECRET=your_jwt_secret_here

   # Tripay Payment Gateway Configuration
   TRIPAY_API_KEY=your_tripay_api_key_here
   TRIPAY_PRIVATE_KEY=your_tripay_private_key_here
   TRIPAY_MERCHANT_CODE=your_merchant_code_here

   # Tripay API URLs
   TRIPAY_BASE_URL=https://tripay.co.id/api
   TRIPAY_SANDBOX_URL=https://tripay.co.id/api-sandbox

   # Environment (sandbox or production)
   TRIPAY_ENVIRONMENT=sandbox

   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # File Upload Configuration
   UPLOAD_PATH=./uploads
   MAX_FILE_SIZE=10485760

   # Admin Configuration
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   ```

4. **Initialize the application**
   ```bash
   # Initialize database and sample data
   npm run init
   
   # Or run individual setup commands
   npm run setup
   npm run reset-db
   ```

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the admin panel**
   - URL: `http://localhost:3000/admin`
   - Username: `admin` (default)
   - Password: `admin123` (default)

## 📋 Setup Instructions

### 1. Create a Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token and add it to your `.env` file

### 2. Set up Tripay Payment Gateway

1. Register for a Tripay merchant account at [tripay.co.id](https://tripay.co.id)
2. Get your API credentials from the Tripay dashboard
3. Add your credentials to the `.env` file
4. Configure your callback URL in Tripay dashboard: `https://your-domain.com/api/payment/callback`

### 3. Configure Your Bot

1. Set bot commands with BotFather:
   ```
   start - Start the bot
   shop - Browse products
   cart - View shopping cart
   orders - Check order history
   balance - Check balance and transactions
   help - Get help
   admin - Admin panel (admin only)
   ```

2. Optional: Set up webhooks for production:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://your-domain.com/webhook"}'
   ```

### 4. Test the Payment Integration

```bash
# Test payment functionality
npm run test:payment

# Test payment channels
npm run test:payment-config

# Test signature generation
npm run test:signature

# Test bot payment flow
npm run test:bot-payment
```

## 🏗️ Project Structure

```
telebotshop/
├── src/
│   ├── index.js              # Main application entry point
│   ├── database/
│   │   └── database.js       # Database operations and schema
│   ├── bot/
│   │   └── botHandler.js     # Telegram bot logic
│   ├── api/
│   │   └── adminAPI.js       # REST API endpoints
│   ├── services/
│   │   ├── paymentService.js    # Payment processing logic
│   │   ├── paymentScheduler.js  # Payment status polling
│   │   └── tripayService.js     # Tripay API integration
│   ├── routes/
│   │   └── paymentRoutes.js     # Payment API routes
│   ├── config/
│   │   └── tripay.js            # Tripay configuration
│   └── utils/
│       ├── fileUtils.js         # File management utilities
│       └── tripaySignature.js   # Payment signature utilities
├── scripts/
│   ├── sampleData.js         # Sample data generation
│   ├── resetDatabase.js      # Database reset utility
│   ├── testPayment.js        # Payment testing script
│   ├── testSignature.js      # Signature testing script
│   └── testBotPayment.js     # Bot payment testing script
├── docs/
│   ├── TRIPAY_INTEGRATION.md # Detailed Tripay documentation
│   ├── PAYMENT_CHANNELS_WEB.md
│   ├── PAYMENT_METHOD_CONFIG.md
│   └── TRIPAY_CONFIG_WEB.md
├── data/                     # SQLite database files
├── uploads/                  # Product files storage
├── logs/                     # Application logs
├── public/                   # Static files for admin panel
├── package.json
├── env.example
├── README.md
└── README_PAYMENT.md         # Payment integration guide
```

## 🔌 API Endpoints

### Authentication
All admin endpoints require authentication via headers:
```
username: admin
password: admin123
```

### Products
- `GET /api/admin/products` - List all products
- `GET /api/admin/products/:id` - Get product details
- `POST /api/admin/products` - Create new product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product

### Categories
- `GET /api/admin/categories` - List all categories
- `POST /api/admin/categories` - Create new category
- `PUT /api/admin/categories/:id` - Update category
- `DELETE /api/admin/categories/:id` - Delete category

### Orders
- `GET /api/admin/orders` - List all orders
- `GET /api/admin/orders/:id` - Get order details
- `PUT /api/admin/orders/:id/status` - Update order status

### Balance Management
- `GET /api/admin/users/:id/balance` - Get user balance and transactions
- `POST /api/admin/users/:id/balance/deposit` - Add money to user balance
- `POST /api/admin/users/:id/balance/withdraw` - Withdraw money from user balance
- `GET /api/admin/transactions` - List all transactions

### Analytics
- `GET /api/admin/analytics` - Get basic analytics
- `GET /api/admin/analytics/sales` - Get sales analytics

### Payment API
- `POST /api/payment` - Create payment transaction
- `POST /api/payment/callback` - Handle payment callbacks
- `GET /api/payment/:reference` - Check transaction status
- `GET /api/payment/channels` - Get available payment methods
- `POST /api/payment/polling/start` - Start payment polling
- `POST /api/payment/polling/stop` - Stop payment polling
- `GET /api/payment/polling/status` - Get polling status

### Health & Monitoring
- `GET /health` - Health check endpoint
- `POST /api/payment/poll/:reference` - Manual payment polling

## 🛒 Bot Commands

### User Commands
- `/start` - Start the bot and see main menu
- `/shop` - Browse available products
- `/cart` - View your shopping cart
- `/balance` - Check your balance and transactions
- `/deposit` - Add money to your balance
- `/orders` - Check your order history
- `/help` - Get help and instructions

### Admin Commands
- `/admin` - Access admin panel (admin users only)

## 📊 Database Schema

### Users Table
- `id` - Primary key
- `telegram_id` - Telegram user ID
- `username` - Telegram username
- `first_name` - User's first name
- `last_name` - User's last name
- `balance` - User's account balance
- `created_at` - Registration timestamp
- `is_admin` - Admin privileges flag

### Transactions Table
- `id` - Primary key
- `user_id` - Foreign key to users table
- `type` - Transaction type (deposit/withdrawal/payment)
- `amount` - Transaction amount
- `description` - Transaction description
- `order_id` - Foreign key to orders table (optional)
- `payment_reference` - Tripay payment reference (optional)
- `created_at` - Transaction timestamp

### Products Table
- `id` - Primary key
- `name` - Product name
- `description` - Product description
- `price` - Product price
- `category_id` - Category reference
- `product_type` - Type (file/link/code)
- `file_path` - File path (for file products)
- `download_link` - Access link (for link products)
- `product_code` - Product code (for code products)
- `stock_quantity` - Stock quantity (-1 for unlimited)
- `is_active` - Product availability
- `created_at` - Creation timestamp

### Orders Table
- `id` - Primary key
- `user_id` - User reference
- `product_id` - Product reference
- `quantity` - Order quantity
- `total_price` - Total order price
- `status` - Order status (pending/completed/cancelled)
- `payment_method` - Payment method used
- `payment_reference` - Tripay payment reference
- `created_at` - Order timestamp

## 🔒 Security Features

- **Input Validation**: All user inputs are validated
- **File Type Restrictions**: Only allowed file types can be uploaded
- **File Size Limits**: Configurable file size restrictions
- **Admin Authentication**: Secure admin panel access
- **SQL Injection Protection**: Parameterized queries
- **File Path Security**: Secure file handling
- **Payment Signature Verification**: SHA256 HMAC signatures for all payment requests
- **Callback Security**: Automatic signature verification for payment callbacks
- **Environment Separation**: Sandbox and production environment isolation

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment

1. **Set up environment variables**
   ```env
   NODE_ENV=production
   TELEGRAM_BOT_TOKEN=your_production_bot_token
   JWT_SECRET=your_secure_jwt_secret
   TRIPAY_ENVIRONMENT=production
   TRIPAY_API_KEY=your_production_api_key
   TRIPAY_PRIVATE_KEY=your_production_private_key
   TRIPAY_MERCHANT_CODE=your_production_merchant_code
   PORT=3000
   ```

2. **Use PM2 for process management**
   ```bash
   npm install -g pm2
   pm2 start src/index.js --name "telebotshop"
   pm2 startup
   pm2 save
   ```

3. **Set up reverse proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Set up SSL with Let's Encrypt**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

5. **Configure Tripay callback URL**
   - Set callback URL in Tripay dashboard: `https://your-domain.com/api/payment/callback`
   - Ensure your server is accessible from the internet

## 🧪 Testing

```bash
# Test payment integration
npm run test:payment

# Test payment configuration
npm run test:payment-config

# Test signature generation
npm run test:signature

# Test bot payment flow
npm run test:bot-payment

# Test stock management
npm run test:stock

# Run all tests
npm test
```

## 📚 Additional Documentation

- **[Payment Integration Guide](README_PAYMENT.md)** - Detailed Tripay integration guide
- **[Tripay Integration Docs](docs/TRIPAY_INTEGRATION.md)** - Complete Tripay documentation
- **[Payment Channels](docs/PAYMENT_CHANNELS_WEB.md)** - Available payment methods
- **[Payment Method Config](docs/PAYMENT_METHOD_CONFIG.md)** - Payment configuration guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/telebotshop/issues) page
2. Create a new issue with detailed information
3. Contact support at support@your-domain.com

## 🔄 Changelog

### v1.0.0
- Initial release with basic Telegram bot functionality
- Admin panel with REST API
- File upload and management
- Order processing and delivery
- User analytics and reporting

### v1.1.0
- Added Tripay payment gateway integration
- Multiple payment methods support
- Payment status polling and monitoring
- Enhanced security with signature verification
- Payment callback handling
- Sandbox and production environment support

---

**Made with ❤️ by DhamarTaranggana** 
