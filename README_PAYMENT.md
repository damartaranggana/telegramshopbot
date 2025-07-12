# Tripay Payment Gateway Integration - Quick Start Guide

This guide will help you quickly set up and test the Tripay payment gateway integration in your Telegram Bot Shop.

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and update it with your Tripay credentials:

```bash
cp env.example .env
```

Edit `.env` and add your Tripay credentials:

```env
# Tripay Payment Gateway Configuration
TRIPAY_API_KEY=your_tripay_api_key_here
TRIPAY_PRIVATE_KEY=your_tripay_private_key_here
TRIPAY_MERCHANT_CODE=your_merchant_code_here

# Environment (use 'sandbox' for testing)
TRIPAY_ENVIRONMENT=sandbox
```

### 3. Start the Server

```bash
npm start
```

The server will start on port 3000 with the following endpoints available:

- `POST /api/payment` - Create payment transaction
- `POST /api/payment/callback` - Handle payment callbacks
- `GET /api/payment/:reference` - Check transaction status
- `GET /api/payment/channels` - Get available payment methods

## 🧪 Testing the Integration

### Run the Test Script

```bash
npm run test:payment
```

This will:
1. Test payment channel retrieval
2. Test signature generation
3. Test merchant reference generation
4. Create a test transaction
5. Check transaction status

### Manual Testing with cURL

#### Create a Payment Transaction

```bash
curl -X POST http://localhost:3000/api/payment \
  -H "Content-Type: application/json" \
  -d '{
    "method": "BRIVA",
    "amount": 100000,
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "08123456789",
    "order_items": [
      {
        "name": "Digital Product",
        "price": 100000,
        "quantity": 1
      }
    ],
    "return_url": "https://yourdomain.com/payment/success",
    "expired_time": 24
  }'
```

#### Check Transaction Status

```bash
curl http://localhost:3000/api/payment/TRX123456789
```

#### Get Payment Channels

```bash
curl http://localhost:3000/api/payment/channels
```

## 📋 API Endpoints

### Create Payment Transaction
- **URL:** `POST /api/payment`
- **Description:** Creates a new payment transaction
- **Required Fields:** `method`, `amount`, `customer_name`, `order_items`

### Payment Callback
- **URL:** `POST /api/payment/callback`
- **Description:** Receives payment status updates from Tripay
- **Security:** Automatically verifies callback signatures

### Check Transaction Status
- **URL:** `GET /api/payment/:reference`
- **Description:** Retrieves transaction details and status

### Get Payment Channels
- **URL:** `GET /api/payment/channels`
- **Description:** Lists available payment methods

## 🔒 Security Features

- **SHA256 HMAC Signatures:** All API requests are signed
- **Callback Verification:** Automatic signature verification for callbacks
- **Environment Separation:** Sandbox and production environments
- **Input Validation:** Comprehensive request validation

## 📁 File Structure

```
src/
├── config/
│   └── tripay.js          # Tripay configuration
├── services/
│   └── tripayService.js   # Tripay API service
├── utils/
│   └── tripaySignature.js # Signature utilities
├── routes/
│   └── paymentRoutes.js   # Payment API routes
└── index.js               # Main server file

scripts/
└── testPayment.js         # Test script

docs/
└── TRIPAY_INTEGRATION.md  # Detailed documentation
```

## 🎯 Integration with Telegram Bot

The payment system can be easily integrated with your Telegram bot:

```javascript
// Example: Handle /buy command
bot.onText(/\/buy (.+)/, async (msg, match) => {
  const productName = match[1];
  
  // Create payment transaction
  const paymentData = {
    method: 'BRIVA',
    amount: 100000,
    customer_name: msg.from.first_name,
    order_items: [{ name: productName, price: 100000, quantity: 1 }]
  };
  
  try {
    const result = await tripayService.createTransaction(paymentData);
    
    // Send payment link to user
    bot.sendMessage(msg.chat.id, 
      `Payment link: ${result.data.payment_url}\n\nPlease complete your payment to receive the product.`
    );
  } catch (error) {
    bot.sendMessage(msg.chat.id, 'Sorry, payment creation failed. Please try again.');
  }
});
```

## 🚨 Important Notes

1. **Sandbox Testing:** Always test in sandbox environment first
2. **API Keys:** Never commit API keys to version control
3. **Callbacks:** Ensure your callback URL is accessible from the internet
4. **HTTPS:** Use HTTPS in production for secure communication
5. **Error Handling:** Implement proper error handling in your application

## 📞 Support

- **Tripay Documentation:** https://tripay.co.id/developer
- **Tripay Support:** support@tripay.co.id
- **Detailed Documentation:** See `docs/TRIPAY_INTEGRATION.md`

## 🔄 Next Steps

1. Test the integration in sandbox environment
2. Configure your callback URL in Tripay dashboard
3. Test the complete payment flow
4. Switch to production environment when ready
5. Integrate with your Telegram bot
6. Implement database storage for transactions
7. Add email notifications for payment confirmations 