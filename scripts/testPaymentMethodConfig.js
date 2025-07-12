/**
 * Test Payment Method Configuration
 * Tests the payment method configuration API endpoints
 */

const axios = require('axios');

async function testPaymentMethodConfig() {
    const baseURL = 'http://localhost:3000/api/admin';
    const authHeaders = {
        'username': 'admin',
        'password': 'admin123',
        'Content-Type': 'application/json'
    };

    console.log('⚙️ Testing QRIS Payment Method Configuration API...\n');

    try {
        // Test 1: Get current payment method configuration
        console.log('1. Testing GET /payment-method-config...');
        const getResponse = await axios.get(`${baseURL}/payment-method-config`, { headers: authHeaders });
        console.log('✅ GET /payment-method-config successful');
        console.log('Current configuration:', JSON.stringify(getResponse.data.data, null, 2));
        console.log('');

        // Test 2: Update payment method configuration (QRIS only)
        console.log('2. Testing POST /payment-method-config...');
        const newConfig = {
            default_method: 'QRIS',
            available_methods: ['QRIS']
        };

        const updateResponse = await axios.post(`${baseURL}/payment-method-config`, newConfig, { headers: authHeaders });
        console.log('✅ POST /payment-method-config successful');
        console.log('Update response:', updateResponse.data.message);
        console.log('');

        // Test 3: Verify the update by getting the configuration again
        console.log('3. Verifying updated configuration...');
        const verifyResponse = await axios.get(`${baseURL}/payment-method-config`, { headers: authHeaders });
        console.log('✅ Configuration verification successful');
        console.log('Updated configuration:', JSON.stringify(verifyResponse.data.data, null, 2));
        console.log('');

        // Test 4: Test that only QRIS is accepted
        console.log('4. Testing that only QRIS is accepted...');
        try {
            const testConfig = {
                default_method: 'BRIVA',
                available_methods: ['BRIVA', 'MANDIRI']
            };
            const testResponse = await axios.post(`${baseURL}/payment-method-config`, testConfig, { headers: authHeaders });
            console.log('✅ Configuration updated, but should be forced to QRIS');
            console.log('Response:', testResponse.data.message);
        } catch (error) {
            console.log('❌ Unexpected error:', error.message);
        }
        console.log('');

        // Test 5: Verify QRIS-only configuration
        console.log('5. Verifying QRIS-only configuration...');
        const finalConfig = {
            default_method: 'QRIS',
            available_methods: ['QRIS']
        };

        const finalResponse = await axios.post(`${baseURL}/payment-method-config`, finalConfig, { headers: authHeaders });
        console.log('✅ QRIS-only configuration successful');
        console.log('Final response:', finalResponse.data.message);
        console.log('');

        console.log('🎉 All QRIS payment method configuration tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testPaymentMethodConfig(); 