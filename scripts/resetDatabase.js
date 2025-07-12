require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('../src/database/database');

async function resetDatabase() {
    console.log('🔄 Resetting database...');

    try {
        // Close any existing database connections
        const dbPath = path.join(__dirname, '../data/shop.db');

        // Delete the database file if it exists
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            console.log('🗑️ Deleted existing database file');
        }

        // Create new database
        const db = new Database();
        await db.initialize();

        console.log('✅ Database reset successfully!');
        console.log('📝 You can now run the sample data script: npm run sample-data');

    } catch (error) {
        console.error('❌ Error resetting database:', error);
    }
}

// Run the script
if (require.main === module) {
    resetDatabase();
}

module.exports = { resetDatabase }; 