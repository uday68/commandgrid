import fs from 'fs';
import path from 'path';

const srcDir = path.join(__dirname, '../uploads/profiles');
const destDir = path.join(process.cwd(), 'uploads', 'profiles');

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log('Created destination directory:', destDir);
}

// Read source directory
if (fs.existsSync(srcDir)) {
    const files = fs.readdirSync(srcDir);
    
    files.forEach(file => {
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(destDir, file);
        
        // Copy file to new location
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${file} to new location`);
        
        // Delete original file
        fs.unlinkSync(srcPath);
        console.log(`Deleted original file ${file}`);
    });
    
    console.log('All profile pictures moved successfully');
} else {
    console.log('Source directory does not exist:', srcDir);
}
