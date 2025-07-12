# Tripay Configuration Web Interface

## Overview

The Telegram Bot Shop now includes a web-based interface for managing Tripay payment gateway configuration. This allows administrators to easily update Tripay settings without manually editing configuration files.

## Features

### 🔧 Configuration Management
- **API Key Management**: Securely store and update your Tripay API key
- **Private Key Management**: Manage your Tripay private key for signature generation
- **Merchant Code**: Set your unique merchant identifier
- **Environment Selection**: Choose between Sandbox (testing) and Production (live) environments

### 🧪 Connection Testing
- **Real-time Testing**: Test your configuration against Tripay's API
- **Payment Channel Verification**: Verify that payment channels are accessible
- **Error Reporting**: Detailed error messages for troubleshooting

### 🔒 Security Features
- **Password Fields**: Sensitive data is masked in the interface
- **Secure Storage**: Configuration is stored in the `.env` file
- **Admin Authentication**: Only authenticated administrators can access the configuration

## Accessing the Configuration

1. **Start the server**: `npm start`
2. **Open the admin panel**: Navigate to `http://localhost:3000/admin`
3. **Navigate to Tripay Config**: Click on the "💳 Tripay Config" tab

## Configuration Fields

### Required Fields
- **API Key**: Your Tripay API key from the merchant dashboard
- **Private Key**: Your Tripay private key for signature generation
- **Merchant Code**: Your unique merchant identifier from Tripay

### Optional Fields
- **Environment**: Choose between:
  - `sandbox`: For testing and development
  - `production`: For live transactions

## API Endpoints

### GET `/api/admin/tripay-config`
Retrieves the current Tripay configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "TRIPAY_API_KEY": "your_api_key",
    "TRIPAY_PRIVATE_KEY": "your_private_key",
    "TRIPAY_MERCHANT_CODE": "your_merchant_code",
    "TRIPAY_ENVIRONMENT": "sandbox",
    "TRIPAY_BASE_URL": "https://tripay.co.id/api",
    "TRIPAY_SANDBOX_URL": "https://tripay.co.id/api-sandbox"
  }
}
```

### POST `/api/admin/tripay-config`
Updates the Tripay configuration.

**Request Body:**
```json
{
  "TRIPAY_API_KEY": "new_api_key",
  "TRIPAY_PRIVATE_KEY": "new_private_key",
  "TRIPAY_MERCHANT_CODE": "new_merchant_code",
  "TRIPAY_ENVIRONMENT": "sandbox"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tripay configuration updated successfully. Please restart the server for changes to take effect."
}
```

### POST `/api/admin/tripay-config/test`
Tests the Tripay configuration by making a real API call.

**Request Body:**
```json
{
  "TRIPAY_API_KEY": "test_api_key",
  "TRIPAY_PRIVATE_KEY": "test_private_key",
  "TRIPAY_MERCHANT_CODE": "test_merchant_code",
  "TRIPAY_ENVIRONMENT": "sandbox"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Configuration test successful!",
  "data": {
    "environment": "sandbox",
    "baseUrl": "https://tripay.co.id/api-sandbox",
    "paymentChannels": 15
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Configuration test failed",
  "error": "HTTP 401: Unauthorized"
}
```

## Usage Instructions

### 1. Initial Setup
1. Navigate to the Tripay Config tab in the admin panel
2. Fill in your Tripay credentials:
   - API Key from your Tripay merchant dashboard
   - Private Key for signature generation
   - Merchant Code (your unique identifier)
   - Select the appropriate environment (Sandbox/Production)

### 2. Testing Configuration
1. Click the "🧪 Test Connection" button
2. The system will attempt to connect to Tripay's API
3. Review the test results to ensure everything is working

### 3. Saving Configuration
1. Click "💾 Save Configuration" to store your settings
2. The configuration will be saved to the `.env` file
3. Restart the server for changes to take effect

### 4. Monitoring Status
- The "Configuration Status" section shows the current state of your settings
- Green checkmarks indicate configured fields
- Red X marks indicate missing configuration

## Troubleshooting

### Common Issues

1. **"Configuration test failed"**
   - Verify your API key is correct
   - Ensure you're using the right environment (sandbox vs production)
   - Check that your merchant code is valid

2. **"Error saving configuration"**
   - Ensure the server has write permissions to the `.env` file
   - Check that all required fields are filled

3. **"Configuration not taking effect"**
   - Restart the server after saving configuration
   - Verify the `.env` file was updated correctly

### Testing the Configuration

You can test the API endpoints using the provided test script:

```bash
node scripts/testTripayConfig.js
```

This script will:
- Test the GET endpoint to retrieve current configuration
- Test the POST endpoint to update configuration
- Test the connection testing endpoint
- Verify that changes are saved correctly

## Security Considerations

- **Environment Variables**: Configuration is stored in the `.env` file, which should not be committed to version control
- **Admin Authentication**: Only users with admin credentials can access the configuration
- **Password Fields**: Sensitive data is masked in the web interface
- **HTTPS**: In production, ensure the admin panel is served over HTTPS

## File Structure

```
src/
├── api/
│   └── adminAPI.js          # Contains Tripay config API endpoints
├── config/
│   └── tripay.js            # Tripay configuration module
public/
└── index.html               # Admin panel with Tripay config tab
scripts/
└── testTripayConfig.js      # Test script for Tripay config API
```

## Integration with Existing System

The Tripay configuration web interface integrates seamlessly with the existing payment system:

- **Payment Service**: Uses the configured credentials for payment processing
- **Signature Generation**: Uses the private key for secure transaction signing
- **Environment Switching**: Automatically uses the correct API endpoints based on environment setting
- **Error Handling**: Provides detailed error messages for troubleshooting

## Next Steps

After configuring Tripay:

1. **Test Payments**: Create test orders to verify payment processing
2. **Monitor Logs**: Check server logs for any payment-related errors
3. **Production Setup**: Switch to production environment when ready for live transactions
4. **Backup Configuration**: Keep a secure backup of your Tripay credentials 