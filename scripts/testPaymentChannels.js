const axios = require('axios');

// Test Payment Channels API
async function testPaymentChannelsAPI() {
    const baseURL = 'http://localhost:3000/api/admin';
    const authHeaders = {
        'username': 'admin',
        'password': 'admin123',
        'Content-Type': 'application/json'
    };

    console.log('🏦 Testing QRIS Payment Channels API...\n');

    try {
        // Test 1: Get all QRIS payment channels
        console.log('1. Testing GET /payment-channels...');
        const getResponse = await axios.get(`${baseURL}/payment-channels`, { headers: authHeaders });
        console.log('✅ GET /payment-channels successful');
        console.log(`Total QRIS channels: ${getResponse.data.total}`);

        if (getResponse.data.data && getResponse.data.data.length > 0) {
            console.log('Sample channel:', JSON.stringify(getResponse.data.data[0], null, 2));
        }
        console.log('');

        // Test 2: Refresh QRIS payment channels
        console.log('2. Testing GET /payment-channels/refresh...');
        const refreshResponse = await axios.get(`${baseURL}/payment-channels/refresh`, { headers: authHeaders });
        console.log('✅ GET /payment-channels/refresh successful');
        console.log(`Refreshed QRIS channels: ${refreshResponse.data.total}`);
        console.log(`Timestamp: ${refreshResponse.data.timestamp}`);
        console.log('');

        // Test 3: Filter channels by group (if channels exist)
        if (getResponse.data.data && getResponse.data.data.length > 0) {
            // Find a group that exists
            const groups = [...new Set(getResponse.data.data.map(ch => ch.group).filter(Boolean))];
            if (groups.length > 0) {
                const testGroup = groups[0];
                console.log(`3. Testing GET /payment-channels/${testGroup}...`);
                const filterResponse = await axios.get(`${baseURL}/payment-channels/${encodeURIComponent(testGroup)}`, { headers: authHeaders });
                console.log('✅ GET /payment-channels/{group} successful');
                console.log(`Group: ${filterResponse.data.group}`);
                console.log(`Channels in group: ${filterResponse.data.total}`);
                console.log('');
            }
        }

        // Test 4: Test with non-existent group
        console.log('4. Testing GET /payment-channels/non-existent-group...');
        try {
            const nonExistentResponse = await axios.get(`${baseURL}/payment-channels/non-existent-group`, { headers: authHeaders });
            console.log('✅ GET /payment-channels/non-existent-group successful (returned empty array)');
            console.log(`Channels found: ${nonExistentResponse.data.total}`);
        } catch (error) {
            console.log('❌ GET /payment-channels/non-existent-group failed:', error.response ? error.response.data : error.message);
        }
        console.log('');

        // Test 5: Display QRIS channel statistics
        if (getResponse.data.data && getResponse.data.data.length > 0) {
            console.log('5. QRIS Channel Statistics:');
            const channels = getResponse.data.data;
            const totalChannels = channels.length;
            const activeChannels = channels.filter(ch => ch.active).length;
            const inactiveChannels = totalChannels - activeChannels;

            // Group statistics
            const groupStats = {};
            channels.forEach(channel => {
                const group = channel.group || 'Other';
                if (!groupStats[group]) {
                    groupStats[group] = { total: 0, active: 0 };
                }
                groupStats[group].total++;
                if (channel.active) {
                    groupStats[group].active++;
                }
            });

            console.log(`   Total QRIS Channels: ${totalChannels}`);
            console.log(`   Active QRIS Channels: ${activeChannels}`);
            console.log(`   Inactive QRIS Channels: ${inactiveChannels}`);
            console.log(`   QRIS Groups: ${Object.keys(groupStats).length}`);
            console.log('');
            console.log('   QRIS Group Breakdown:');
            Object.entries(groupStats).forEach(([group, stats]) => {
                const percentage = ((stats.active / stats.total) * 100).toFixed(1);
                console.log(`     ${group}: ${stats.total} total, ${stats.active} active (${percentage}%)`);
            });
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response ? error.response.data : error.message);
    }
}

// Run the test
testPaymentChannelsAPI(); 