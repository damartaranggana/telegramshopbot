# Tripay Payment Gateway Integration

This document provides comprehensive documentation for integrating Tripay payment gateway into the Telegram Bot Shop application.

## Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Configuration](#configuration)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Examples](#requestresponse-examples)
5. [Security](#security)
6. [Error Handling](#error-handling)
7. [Testing](#testing)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install express axios crypto dotenv body-parser cors
```

### 2. Environment Configuration

Create a `.env` file in your project root with the following variables:

```env
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
```

### 3. File Structure

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
```

## Configuration

### Tripay Configuration (`src/config/tripay.js`)

This module handles all Tripay-specific configuration including:
- API credentials
- Environment settings
- API endpoints
- HTTP headers

### Signature Utilities (`src/utils/tripaySignature.js`)

Handles SHA256 HMAC signature generation and verification:
- `generateSignature()` - Creates signatures for API requests
- `verifyCallbackSignature()` - Verifies callback signatures
- `generateTransactionSignature()` - Creates transaction-specific signatures

### Tripay Service (`src/services/tripayService.js`)

Manages all HTTP communication with Tripay API:
- `createTransaction()` - Creates new payment transactions
- `getTransactionDetail()` - Retrieves transaction status
- `getPaymentChannels()` - Gets available payment methods
- `generateMerchantRef()` - Creates unique transaction references

## API Endpoints

### 1. Create Payment Transaction

**Endpoint:** `POST /api/payment`

**Purpose:** Creates a new payment transaction in Tripay

**Request Body:**
```json
{
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
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment transaction created successfully",
  "data": {
    "reference": "TRX123456789",
    "merchant_ref": "TXN_1234567890_ABC123",
    "payment_url": "https://tripay.co.id/payment/TRX123456789",
    "qr_url": "https://tripay.co.id/qr/TRX123456789",
    "amount": 100000,
    "fee_merchant": 0,
    "fee_customer": 0,
    "total_fee": 0,
    "amount_fee": 100000,
    "status": "UNPAID"
  }
}
```

### 2. Payment Callback

**Endpoint:** `POST /api/payment/callback`

**Purpose:** Receives payment status updates from Tripay

**Callback Data:**
```json
{
  "reference": "TRX123456789",
  "merchant_ref": "TXN_1234567890_ABC123",
  "status": "PAID",
  "amount": 100000,
  "signature": "abc123def456..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Callback processed successfully"
}
```

### 3. Check Transaction Status

**Endpoint:** `GET /api/payment/:reference`

**Purpose:** Retrieves transaction details and status

**Response:**
```json
{
  "success": true,
  "message": "Transaction details retrieved successfully",
  "data": {
    "reference": "TRX123456789",
    "merchant_ref": "TXN_1234567890_ABC123",
    "status": "PAID",
    "amount": 100000,
    "payment_method": "BRIVA",
    "customer_name": "John Doe",
    "created_at": "2023-12-01T10:00:00Z",
    "paid_at": "2023-12-01T10:30:00Z"
  }
}
```

### 4. Get Payment Channels

**Endpoint:** `GET /api/payment/channels`

**Purpose:** Retrieves available payment methods

**Response:**
```json
{
  "success": true,
  "message": "Payment channels retrieved successfully",
  "data": [
    {
      "group": "Virtual Account",
      "code": "BRIVA",
      "name": "BRI Virtual Account",
      "type": "virtual_account",
      "logo_url": "https://tripay.co.id/logo/briva.png",
      "minimum_amount": 10000,
      "maximum_amount": 100000000
    }
  ]
}
```

## Request/Response Examples

### Creating a Transaction

```javascript
// Example: Create a payment transaction
const createPayment = async () => {
  try {
    const response = await fetch('/api/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'BRIVA',
        amount: 100000,
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_phone: '08123456789',
        order_items: [
          {
            name: 'Digital Product',
            price: 100000,
            quantity: 1
          }
        ],
        return_url: 'https://yourdomain.com/payment/success',
        expired_time: 24
      })
    });

    const result = await response.json();
    console.log('Payment created:', result);
    
    // Redirect user to payment URL
    if (result.success) {
      window.location.href = result.data.payment_url;
    }
  } catch (error) {
    console.error('Payment creation failed:', error);
  }
};
```

### Checking Transaction Status

```javascript
// Example: Check transaction status
const checkPaymentStatus = async (reference) => {
  try {
    const response = await fetch(`/api/payment/${reference}`);
    const result = await response.json();
    
    if (result.success) {
      console.log('Transaction status:', result.data.status);
      
      if (result.data.status === 'PAID') {
        // Handle successful payment
        console.log('Payment completed!');
      }
    }
  } catch (error) {
    console.error('Status check failed:', error);
  }
};
```

## Security

### Signature Verification

All callbacks from Tripay are verified using SHA256 HMAC signatures:

```javascript
// The callback signature is automatically verified
const isSignatureValid = verifyCallbackSignature(callbackData, signature);
```

### Environment Configuration

- Use sandbox environment for testing
- Switch to production only when ready
- Keep API keys secure and never commit them to version control

### Best Practices

1. **Always verify callback signatures** before processing payments
2. **Store transaction references** in your database for tracking
3. **Implement proper error handling** for all API calls
4. **Use HTTPS** in production for secure communication
5. **Log all payment activities** for audit purposes

## Error Handling

### Common Error Responses

```json
{
  "success": false,
  "message": "Missing required fields: method, amount, customer_name, order_items"
}
```

```json
{
  "success": false,
  "message": "Tripay API Error: Invalid API key"
}
```

```json
{
  "success": false,
  "message": "Invalid callback signature"
}
```

### Error Handling in Code

```javascript
try {
  const result = await tripayService.createTransaction(transactionData);
  // Handle success
} catch (error) {
  if (error.message.includes('Tripay API Error')) {
    // Handle Tripay-specific errors
    console.error('Tripay API error:', error.message);
  } else {
    // Handle general errors
    console.error('General error:', error.message);
  }
}
```

## Testing

### Sandbox Testing

1. Use sandbox environment for testing
2. Use test API keys provided by Tripay
3. Test all payment methods available in sandbox
4. Verify callback handling with test transactions

### Test Data

```json
{
  "method": "BRIVA",
  "amount": 10000,
  "customer_name": "Test User",
  "customer_email": "test@example.com",
  "customer_phone": "08123456789",
  "order_items": [
    {
      "name": "Test Product",
      "price": 10000,
      "quantity": 1
    }
  ]
}
```

### Testing Checklist

- [ ] Transaction creation works
- [ ] Callback signature verification works
- [ ] Transaction status checking works
- [ ] Payment channels retrieval works
- [ ] Error handling works correctly
- [ ] All required fields validation works
- [ ] Signature generation works correctly

## Integration with Telegram Bot

To integrate with your Telegram bot, you can:

1. **Create payment links** when users want to purchase
2. **Send payment instructions** via bot messages
3. **Check payment status** and deliver products automatically
4. **Handle payment confirmations** through callbacks

Example bot integration:

```javascript
// In your bot handler
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

## Support

For additional support:
- Tripay Documentation: https://tripay.co.id/developer
- Tripay Support: support@tripay.co.id
- API Status: https://status.tripay.co.id 