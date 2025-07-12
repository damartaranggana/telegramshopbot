# QRIS Payment Method Configuration

## Overview

The QRIS Payment Method Configuration feature allows administrators to manage QRIS payment method settings for balance top-ups. This system is specifically designed for QRIS payment method management through the web interface.

## Features

### ⚙️ QRIS Configuration Management
- **QRIS Default Method**: QRIS is the default payment method for balance top-ups
- **QRIS Only**: System is configured to use QRIS payment method exclusively
- **Web Interface**: Easy-to-use web interface for managing QRIS settings
- **Database Storage**: QRIS configuration is stored persistently in the database

### 🔄 Dynamic Updates
- **Real-time Changes**: Payment method changes take effect immediately
- **No Restart Required**: Configuration updates don't require server restart
- **Fallback Support**: Falls back to 'QRIS' if no configuration is found

## Database Schema

### Payment Method Configuration Table

```sql
CREATE TABLE payment_method_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    default_method TEXT DEFAULT 'QRIS',
    available_methods TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `id`: Primary key
- `default_method`: The default payment method code (e.g., 'QRIS', 'BRIVA')
- `available_methods`: JSON array of available payment method codes
- `created_at`: Configuration creation timestamp
- `updated_at`: Last update timestamp

## API Endpoints

### GET `/api/admin/payment-method-config`
Retrieves the current payment method configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "default_method": "QRIS",
    "available_methods": ["QRIS", "BRIVA", "MANDIRI", "BNI", "BRI"],
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### POST `/api/admin/payment-method-config`
Updates the payment method configuration.

**Request Body:**
```json
{
  "default_method": "BRIVA",
  "available_methods": ["QRIS", "BRIVA", "MANDIRI", "BNI", "BRI", "OVO"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment method configuration updated successfully"
}
```

## Web Interface

### Accessing the Configuration

1. **Start the server**: `npm start`
2. **Open the admin panel**: Navigate to `http://localhost:3000/admin`
3. **Navigate to Payment Method Config**: Click on the "⚙️ Payment Method Config" tab

### Configuration Options

#### QRIS Payment Method
The system is configured to use QRIS payment method exclusively:
- **QRIS**: QRIS payment method (default and only option)

#### QRIS Availability
QRIS payment method is always available and cannot be disabled.

## Integration with Payment Service

The PaymentService class has been updated to use QRIS payment method:

```javascript
// Get QRIS payment method from configuration
const paymentConfig = await this.db.getPaymentMethodConfig();
const defaultMethod = paymentConfig ? paymentConfig.default_method : 'QRIS';

// Use QRIS payment method
const transactionData = {
    method: defaultMethod, // Always QRIS
    // ... other transaction data
};
```

## Testing

### Run the Test Script

```bash
npm run test:payment-config
```

This script will:
1. Test retrieving current configuration
2. Test updating configuration
3. Test configuration verification
4. Test invalid data handling
5. Test reset to default configuration

### Manual Testing

1. **Access the web interface** at `http://localhost:3000/admin`
2. **Navigate to Payment Method Config** tab
3. **Change the default payment method** and save
4. **Create a balance payment** through the bot to verify the change

## Default Configuration

When the system is first initialized, it creates a QRIS-only configuration:

```json
{
  "default_method": "QRIS",
  "available_methods": ["QRIS"]
}
```

## Error Handling

### Common Issues

1. **"Configuration not found"**
   - The system will fall back to 'QRIS' as default
   - Check if the database table was created properly

2. **"Invalid payment method"**
   - Ensure the payment method code is valid
   - Check Tripay documentation for supported methods

3. **"Database error"**
   - Verify database connection
   - Check database permissions

### Validation

The system validates:
- **Required fields**: `default_method` is required
- **Valid methods**: Payment method codes should be valid
- **Data types**: Proper JSON format for available_methods

## Security Considerations

- **Admin Access Only**: Configuration can only be changed by authenticated administrators
- **Input Validation**: All inputs are validated before saving
- **SQL Injection Protection**: Uses parameterized queries
- **Error Handling**: Sensitive information is not exposed in error messages

## Migration from Hardcoded Method

### Before (Hardcoded)
```javascript
const transactionData = {
    method: 'QRIS', // Hardcoded payment method
    // ... other data
};
```

### After (QRIS-Only Configurable)
```javascript
const paymentConfig = await this.db.getPaymentMethodConfig();
const defaultMethod = paymentConfig ? paymentConfig.default_method : 'QRIS';

const transactionData = {
    method: defaultMethod, // Always QRIS
    // ... other data
};
```

## File Structure

```
src/
├── database/
│   └── database.js                    # Database methods for payment config
├── services/
│   └── paymentService.js              # Updated to use configurable method
├── api/
│   └── adminAPI.js                    # API endpoints for payment config
public/
└── index.html                         # Web interface for payment config
scripts/
└── testPaymentMethodConfig.js         # Test script
docs/
└── PAYMENT_METHOD_CONFIG.md           # This documentation
```

## Next Steps

After implementing QRIS payment method configuration:

1. **Test the Configuration**: Use the test script to verify QRIS functionality
2. **QRIS is Default**: QRIS is automatically set as the default payment method
3. **Monitor QRIS Usage**: Track QRIS payment method usage
4. **QRIS Only**: System is configured to use QRIS payment method exclusively
5. **User Experience**: QRIS provides a seamless payment experience for users

## API Integration Example

```javascript
// Get current QRIS configuration
const config = await fetch('/api/admin/payment-method-config', {
    headers: { 'username': 'admin', 'password': 'admin123' }
});

// Update QRIS configuration (always forces QRIS)
const updateResponse = await fetch('/api/admin/payment-method-config', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'username': 'admin', 
        'password': 'admin123' 
    },
    body: JSON.stringify({
        default_method: 'QRIS',
        available_methods: ['QRIS']
    })
});
``` 