const fs = require('fs-extra');
const path = require('path');

class FileUtils {
    static async initializeDirectories() {
        const directories = [
            './data',
            './uploads',
            './logs'
        ];

        for (const dir of directories) {
            try {
                await fs.ensureDir(dir);
                console.log(`✅ Directory created/verified: ${dir}`);
            } catch (error) {
                console.error(`❌ Error creating directory ${dir}:`, error);
            }
        }
    }

    static async saveFile(file, destination) {
        try {
            await fs.ensureDir(path.dirname(destination));
            await fs.move(file.path, destination);
            return path.basename(destination);
        } catch (error) {
            console.error('Error saving file:', error);
            throw error;
        }
    }

    static async deleteFile(filePath) {
        try {
            if (await fs.pathExists(filePath)) {
                await fs.remove(filePath);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    static async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch (error) {
            console.error('Error getting file size:', error);
            return 0;
        }
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static getFileExtension(filename) {
        return path.extname(filename).toLowerCase();
    }

    static isValidFileType(filename, allowedTypes) {
        const extension = this.getFileExtension(filename);
        return allowedTypes.includes(extension);
    }

    static generateUniqueFilename(originalName) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const extension = path.extname(originalName);
        const name = path.basename(originalName, extension);

        return `${name}_${timestamp}_${random}${extension}`;
    }

    static async cleanupOrphanedFiles(uploadPath, db) {
        try {
            const files = await fs.readdir(uploadPath);

            for (const filename of files) {
                const product = await db.get('SELECT * FROM products WHERE file_path = ?', [filename]);
                if (!product) {
                    const filePath = path.join(uploadPath, filename);
                    await fs.remove(filePath);
                    console.log(`🗑️ Cleaned up orphaned file: ${filename}`);
                }
            }
        } catch (error) {
            console.error('Error cleaning up orphaned files:', error);
        }
    }
}

// Export the initializeDirectories function for use in index.js
const { initializeDirectories } = FileUtils;
module.exports = { initializeDirectories };
module.exports.FileUtils = FileUtils; 