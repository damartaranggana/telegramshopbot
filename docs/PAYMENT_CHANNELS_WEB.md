# QRIS Payment Channels Web Interface

## Overview

The QRIS Payment Channels web interface allows administrators to view and manage available QRIS payment methods from Tripay. This provides a comprehensive overview of all QRIS payment channels, their status, fees, and limits.

## Features

### 📊 QRIS Channel Overview
- **Total QRIS Channels**: View the total number of available QRIS payment channels
- **Active/Inactive Status**: See which QRIS channels are currently active
- **Group Statistics**: Breakdown by QRIS payment method groups
- **Real-time Data**: Live data from Tripay API

### 🔍 QRIS Channel Management
- **QRIS Channel Listing**: Detailed view of all QRIS payment channels
- **Group Filtering**: Filter QRIS channels by payment method group
- **Status Indicators**: Visual indicators for active/inactive QRIS channels
- **Detailed Information**: Fees, limits, and QRIS channel specifications

### 🔄 Data Management
- **Refresh Data**: Update channel information from Tripay
- **Export Functionality**: Export channel data (coming soon)
- **Real-time Updates**: Get the latest channel information

## Accessing QRIS Payment Channels

1. **Start the server**: `npm start`
2. **Open the admin panel**: Navigate to `http://localhost:3000/admin`
3. **Navigate to QRIS Payment Channels**: Click on the "🏦 Payment Channels" tab

## QRIS Payment Channel Groups

### Available QRIS Groups
- **QRIS**: Standard QRIS payment method
- **E-Wallet**: QRIS-enabled digital wallet payments
- **Other**: Other QRIS-related payment methods

### Channel Information
Each payment channel displays:
- **Name**: Channel display name
- **Code**: Unique channel identifier
- **Type**: Payment method type
- **Status**: Active or Inactive
- **Fee Structure**: Transaction fees
- **Limits**: Minimum and maximum transaction amounts

## API Endpoints

### GET `/api/admin/payment-channels`
Retrieves all available payment channels.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Bank BCA Virtual Account",
      "code": "BCAVA",
      "group": "Virtual Account",
      "type": "virtual_account",
      "active": true,
      "fee": {
        "type": "percentage",
        "percentage": 0.7
      },
      "minimum": 10000,
      "maximum": 100000000
    }
  ],
  "total": 25
}
```

### GET `/api/admin/payment-channels/refresh`
Refreshes payment channel data from Tripay API.

**Response:**
```json
{
  "success": true,
  "message": "Payment channels refreshed successfully",
  "data": [...],
  "total": 25,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET `/api/admin/payment-channels/:group`
Retrieves payment channels filtered by group.

**Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 5,
  "group": "Virtual Account"
}
```

## Usage Instructions

### 1. Viewing Payment Channels
1. Navigate to the Payment Channels tab
2. Click "🔄 Load Channels" to fetch current data
3. View the overview statistics and channel list

### 2. Filtering Channels
1. Use the "Filter by Group" dropdown
2. Select a specific payment group
3. View filtered results

### 3. Refreshing Data
1. Click "🔄 Refresh" to get the latest data from Tripay
2. View updated statistics and channel information

### 4. Monitoring Channel Status
- **Active Channels**: Green badges indicate available payment methods
- **Inactive Channels**: Yellow badges indicate temporarily unavailable methods
- **Group Statistics**: See the distribution of channels across payment groups

## Channel Information Display

### Statistics Overview
- **Total Channels**: Complete count of available payment methods
- **Active Channels**: Number of currently active payment methods
- **Inactive Channels**: Number of temporarily unavailable methods
- **Payment Groups**: Number of different payment method categories

### Channel Details
Each channel card displays:
- **Channel Name**: Human-readable payment method name
- **Status Badge**: Active (green) or Inactive (yellow)
- **Channel Code**: Unique identifier used in API calls
- **Payment Type**: Technical payment method type
- **Fee Structure**: Transaction fee information
- **Transaction Limits**: Minimum and maximum amounts

### Group Breakdown
- **Group Name**: Payment method category
- **Channel Count**: Total channels in the group
- **Active Rate**: Percentage of active channels
- **Visual Progress Bar**: Visual representation of active rate

## Integration with Payment System

The Payment Channels interface integrates with the existing payment system:

- **Transaction Creation**: Uses channel codes for payment method selection
- **Fee Calculation**: Displays fee structures for accurate pricing
- **Limit Validation**: Shows transaction limits for order validation
- **Status Monitoring**: Real-time status for payment method availability

## Testing the Payment Channels

You can test the API endpoints using the provided test script:

```bash
node scripts/testPaymentChannels.js
```

This script will:
- Test the GET endpoint to retrieve all payment channels
- Test the refresh endpoint to update channel data
- Test filtering by payment group
- Display channel statistics and breakdown

## Common Payment Channel Groups

### Virtual Account
- Bank BCA Virtual Account
- Bank Mandiri Virtual Account
- Bank BNI Virtual Account
- Bank BRI Virtual Account

### E-Wallet
- OVO
- DANA
- GoPay
- ShopeePay
- LinkAja

### Convenience Store
- Indomaret
- Alfamart
- Lawson
- FamilyMart

### Bank Transfer
- Bank BCA Transfer
- Bank Mandiri Transfer
- Bank BNI Transfer
- Bank BRI Transfer

### QRIS
- QRIS Payment
- QRIS with E-Wallet

## Troubleshooting

### Common Issues

1. **"No payment channels available"**
   - Check Tripay configuration is correct
   - Verify API credentials are valid
   - Ensure network connection to Tripay API

2. **"Failed to load payment channels"**
   - Check Tripay API status
   - Verify environment settings (sandbox vs production)
   - Review server logs for detailed error messages

3. **"Channels not updating"**
   - Use the refresh button to force update
   - Check Tripay API rate limits
   - Verify API key permissions

### Error Messages

- **"Tripay API Error: Unauthorized"**: Invalid API credentials
- **"Tripay API Error: Rate limit exceeded"**: Too many API requests
- **"Network Error"**: Connection issues to Tripay API

## Security Considerations

- **API Authentication**: All requests require admin authentication
- **Data Validation**: Channel data is validated before display
- **Error Handling**: Sensitive information is not exposed in error messages
- **Rate Limiting**: Respects Tripay API rate limits

## File Structure

```
src/
├── api/
│   └── adminAPI.js          # Contains payment channels API endpoints
├── services/
│   └── tripayService.js     # Tripay API service for payment channels
public/
└── index.html               # Admin panel with payment channels tab
scripts/
└── testPaymentChannels.js   # Test script for payment channels API
```

## Next Steps

After viewing payment channels:

1. **Configure Active Channels**: Use channel codes in your payment system
2. **Set Fee Structures**: Implement fee calculations based on channel data
3. **Validate Limits**: Ensure orders respect channel transaction limits
4. **Monitor Status**: Regularly check channel availability
5. **Update Integration**: Use channel information in your payment flow

## API Integration Example

```javascript
// Get available payment channels
const channels = await apiCall('/payment-channels');

// Filter for active virtual accounts
const virtualAccounts = channels.data.filter(ch => 
    ch.group === 'Virtual Account' && ch.active
);

// Use channel code in transaction
const transaction = {
    method: virtualAccounts[0].code,
    amount: 50000,
    // ... other transaction data
};
``` 