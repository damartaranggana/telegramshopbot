require('dotenv').config();
const Database = require('../src/database/database');

async function populateSampleData() {
    const db = new Database();
    await db.initialize();

    console.log('🌱 Populating database with sample data...');

    try {
        // Create sample categories
        console.log('📂 Creating categories...');
        const categories = [
            { name: 'E-books', description: 'Digital books and guides' },
            { name: 'Software', description: 'Software and applications' },
            { name: 'Templates', description: 'Design templates and themes' },
            { name: 'Courses', description: 'Online courses and tutorials' },
            { name: 'Graphics', description: 'Graphics and design assets' }
        ];

        for (const category of categories) {
            await db.createCategory(category.name, category.description);
            console.log(`✅ Created category: ${category.name}`);
        }

        // Get category IDs
        const allCategories = await db.getAllCategories();
        const categoryMap = {};
        allCategories.forEach(cat => {
            categoryMap[cat.name] = cat.id;
        });

        // Create sample products
        console.log('📦 Creating products...');
        const products = [
            {
                name: 'Complete Digital Marketing Guide',
                description: 'A comprehensive guide covering all aspects of digital marketing including SEO, social media, email marketing, and PPC advertising.',
                price: 29.99,
                categoryId: categoryMap['E-books'],
                productType: 'file',
                stockQuantity: -1
            },
            {
                name: 'Premium WordPress Theme Bundle',
                description: 'Collection of 10 professional WordPress themes for various business types. Includes documentation and support.',
                price: 49.99,
                categoryId: categoryMap['Templates'],
                productType: 'file',
                stockQuantity: 50
            },
            {
                name: 'Social Media Marketing Course',
                description: 'Complete course on social media marketing strategies. Includes video lessons, worksheets, and templates.',
                price: 79.99,
                categoryId: categoryMap['Courses'],
                productType: 'link',
                downloadLink: 'https://example.com/course-access',
                stockQuantity: -1
            },
            {
                name: 'Logo Design Template Pack',
                description: '50+ professional logo templates in various formats (AI, EPS, SVG, PNG). Perfect for branding projects.',
                price: 19.99,
                categoryId: categoryMap['Graphics'],
                productType: 'file',
                stockQuantity: 100
            },
            {
                name: 'Productivity App License',
                description: 'One-year license for our premium productivity app. Includes all features and updates.',
                price: 39.99,
                categoryId: categoryMap['Software'],
                productType: 'code',
                productCode: 'PROD-2024-XXXX-XXXX',
                stockQuantity: 200
            },
            {
                name: 'Business Plan Template',
                description: 'Professional business plan template with financial projections, market analysis, and executive summary.',
                price: 15.99,
                categoryId: categoryMap['Templates'],
                productType: 'file',
                stockQuantity: -1
            },
            {
                name: 'Photography Masterclass',
                description: 'Learn professional photography techniques with this comprehensive online course.',
                price: 89.99,
                categoryId: categoryMap['Courses'],
                productType: 'link',
                downloadLink: 'https://example.com/photography-course',
                stockQuantity: 75
            },
            {
                name: 'Icon Set - Business & Finance',
                description: '200+ high-quality icons for business and finance applications. Available in multiple formats.',
                price: 12.99,
                categoryId: categoryMap['Graphics'],
                productType: 'file',
                stockQuantity: 150
            },
            {
                name: 'Email Marketing Automation Guide',
                description: 'Step-by-step guide to setting up email marketing automation for your business.',
                price: 24.99,
                categoryId: categoryMap['E-books'],
                productType: 'file',
                stockQuantity: -1
            },
            {
                name: 'Premium Plugin Bundle',
                description: 'Collection of 5 premium WordPress plugins for e-commerce, SEO, security, and performance.',
                price: 69.99,
                categoryId: categoryMap['Software'],
                productType: 'code',
                productCode: 'PLUGIN-BUNDLE-2024',
                stockQuantity: 300
            }
        ];

        for (const product of products) {
            const result = await db.createProduct(product);
            console.log(`✅ Created product: ${product.name}`);

            // Add some sample product codes for products with limited stock
            if (product.stockQuantity > 0) {
                const codes = [];
                for (let i = 0; i < product.stockQuantity; i++) {
                    const prefix = product.name.replace(/\s+/g, '').substring(0, 3).toUpperCase();
                    codes.push(`${prefix}${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
                }
                await db.addProductCodes(result.id, codes);
                console.log(`🔑 Added ${codes.length} product codes for ${product.name}`);
            }
        }

        // Create sample users with initial balance
        console.log('👥 Creating users...');
        const users = [
            { telegram_id: 123456789, username: 'john_doe', first_name: 'John', last_name: 'Doe', is_admin: 1 },
            { telegram_id: 987654321, username: 'jane_smith', first_name: 'Jane', last_name: 'Smith', is_admin: 0 },
            { telegram_id: 555666777, username: 'bob_wilson', first_name: 'Bob', last_name: 'Wilson', is_admin: 0 }
        ];

        for (const user of users) {
            const result = await db.createUser(user.telegram_id, user.username, user.first_name, user.last_name, user.is_admin);
            // Get the actual user ID (last inserted row)
            let userId = result.id;
            // If user already exists, fetch their ID
            if (!userId) {
                const existing = await db.getUserByTelegramId(user.telegram_id);
                userId = existing?.id;
            }
            // Add some initial balance for non-admin users
            if (!user.is_admin) {
                const initialBalance = Math.random() * 100 + 10; // Random balance between $10-$110
                await db.depositToBalance(userId, initialBalance, 'Initial balance');
                console.log(`💰 Added $${initialBalance.toFixed(2)} initial balance for ${user.first_name}`);
            }
        }

        console.log('🎉 Sample data populated successfully!');
        console.log(`📊 Created ${categories.length} categories and ${products.length} products`);

        // Display summary
        const totalProducts = await db.get('SELECT COUNT(*) as count FROM products');
        const totalCategories = await db.get('SELECT COUNT(*) as count FROM categories');
        const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');

        console.log('\n📈 Database Summary:');
        console.log(`- Categories: ${totalCategories.count}`);
        console.log(`- Products: ${totalProducts.count}`);
        console.log(`- Users: ${totalUsers.count}`);
        console.log(`- Admin user: John Doe (telegram_id: 123456789)`);

    } catch (error) {
        console.error('❌ Error populating sample data:', error);
    } finally {
        db.close();
    }
}

// Run the script
if (require.main === module) {
    populateSampleData();
}

module.exports = { populateSampleData }; 