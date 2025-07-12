const axios = require('axios');

// Test Tripay Configuration API
async function testTripayConfigAPI() {
    const baseURL = 'http://localhost:3000/api/admin';
    const authHeaders = {
        'username': 'admin',
        'password': 'admin123',
        'Content-Type': 'application/json'
    };

    console.log('🧪 Testing Tripay Configuration API...\n');

    try {
        // Test 1: Get current configuration
        console.log('1. Testing GET /tripay-config...');
        const getResponse = await axios.get(`${baseURL}/tripay-config`, { headers: authHeaders });
        console.log('✅ GET /tripay-config successful');
        console.log('Current config:', JSON.stringify(getResponse.data.data, null, 2));
        console.log('');

        // Test 2: Test configuration with sample data
        console.log('2. Testing POST /tripay-config/test...');
        const testData = {
            TRIPAY_API_KEY: 'test_api_key',
            TRIPAY_PRIVATE_KEY: 'test_private_key',
            TRIPAY_MERCHANT_CODE: 'test_merchant_code',
            TRIPAY_ENVIRONMENT: 'sandbox'
        };

        const testResponse = await axios.post(`${baseURL}/tripay-config/test`, testData, { headers: authHeaders });
        console.log('✅ POST /tripay-config/test successful');
        console.log('Test result:', testResponse.data.message);
        console.log('');

        // Test 3: Update configuration
        console.log('3. Testing POST /tripay-config...');
        const updateData = {
            TRIPAY_API_KEY: 'updated_api_key',
            TRIPAY_PRIVATE_KEY: 'updated_private_key',
            TRIPAY_MERCHANT_CODE: 'updated_merchant_code',
            TRIPAY_ENVIRONMENT: 'sandbox'
        };

        const updateResponse = await axios.post(`${baseURL}/tripay-config`, updateData, { headers: authHeaders });
        console.log('✅ POST /tripay-config successful');
        console.log('Update result:', updateResponse.data.message);
        console.log('');

        // Test 4: Verify updated configuration
        console.log('4. Verifying updated configuration...');
        const verifyResponse = await axios.get(`${baseURL}/tripay-config`, { headers: authHeaders });
        console.log('✅ Configuration updated successfully');
        console.log('Updated config:', JSON.stringify(verifyResponse.data.data, null, 2));

    } catch (error) {
        console.error('❌ Test failed:', error.response ? error.response.data : error.message);
    }
}

// Run the test
testTripayConfigAPI(); 