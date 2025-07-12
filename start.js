#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupBot() {
    console.log('🛍️ Welcome to Telegram Bot Shop Setup!\n');

    // Check if .env exists
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        console.log('✅ Environment file (.env) already exists');
    } else {
        console.log('📝 Creating environment file...');

        const botToken = await question('🤖 Enter your Telegram Bot Token (from @BotFather): ');
        const jwtSecret = await question('🔐 Enter a JWT secret (or press Enter for default): ') || 'your-super-secret-jwt-key-2024';
        const port = await question('🌐 Enter port number (or press Enter for 3000): ') || '3000';

        const envContent = `# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=${botToken}
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook

# Database Configuration
DATABASE_PATH=./data/shop.db

# JWT Secret for Authentication
JWT_SECRET=${jwtSecret}

# Server Configuration
PORT=${port}
NODE_ENV=development

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
`;

        fs.writeFileSync(envPath, envContent);
        console.log('✅ Environment file created successfully');
    }

    // Check if node_modules exists
    if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
        console.log('\n📦 Installing dependencies...');
        const { execSync } = require('child_process');
        try {
            execSync('npm install', { stdio: 'inherit' });
            console.log('✅ Dependencies installed successfully');
        } catch (error) {
            console.error('❌ Error installing dependencies:', error.message);
            process.exit(1);
        }
    } else {
        console.log('✅ Dependencies already installed');
    }

    // Ask if user wants to populate sample data
    const populateData = await question('\n🌱 Would you like to populate the database with sample products? (y/n): ');

    if (populateData.toLowerCase() === 'y' || populateData.toLowerCase() === 'yes') {
        console.log('\n📊 Populating database with sample data...');
        try {
            const { populateSampleData } = require('./scripts/sampleData');
            await populateSampleData();
        } catch (error) {
            console.error('❌ Error populating sample data:', error.message);
        }
    }

    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the bot: npm run dev');
    console.log('2. Access admin panel: http://localhost:3000/admin');
    console.log('3. Test your bot on Telegram');
    console.log('\n📚 For more information, check the README.md file');

    rl.close();
}

// Handle errors
process.on('unhandledRejection', (error) => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
});

// Run setup
setupBot().catch((error) => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
}); 