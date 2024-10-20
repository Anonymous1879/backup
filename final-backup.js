const { exec } = require('child_process');
const fs = require('fs');
const cron = require('node-cron');
const path = require('path');

// Configuration
const mongoConnectionString = 'conn string'; // Update with your connection string
const dbName = 't1'; // Replace with your database name
const backupDir = path.join(__dirname, 'backups'); //
const dateString = new Date().toISOString().replace(/:/g, '-'); // Format date for backup folder name

// Function to perform MongoDB backup
function backupMongoDB() {
    const backupPath = `${backupDir}\\${dbName}-${dateString}`;
    
    // Command to create backup
    const command = `mongodump --uri="${mongoConnectionString}" --db ${dbName} --out "${backupPath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error creating backup: ${error}`);
            return;
        }
        console.log(`Backup created successfully at ${backupPath}`);
        compressBackup(backupPath);
    });
}

// Function to compress the backup
function compressBackup(backupPath) {
    const tarCommand = `tar -czf "${backupPath}.tar.gz" -C "${backupDir}" "${dbName}-${dateString}"`;
    
    exec(tarCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error compressing backup: ${error}`);
            return;
        }
        console.log(`Backup compressed to ${backupPath}.tar.gz`);
        uploadToMega(`${backupPath}.tar.gz`);
    });
}

// Function to upload to MEGA
function uploadToMega(backupFile) {
    const megaDir = '/MongoDB'; // MEGA directory to upload backups
    const megaEmail = 'mail'; // MEGA account email
    const megaPassword = 'password'; // MEGA account password

    // Login to MEGA
    exec(`mega-login ${megaEmail} ${megaPassword}`, (error) => {
        if (error) {
            console.error(`Error logging into MEGA: ${error}`);
            return;
        }

        // Upload backup to MEGA
        exec(`mega-put "${backupFile}" "${megaDir}"`, (error) => {
            if (error) {
                console.error(`Error uploading to MEGA: ${error}`);
                return;
            }

            console.log(`Backup successfully uploaded to MEGA at ${megaDir}`);
            cleanupLocalBackup(backupFile);
        });
    });
}

// Function to clean up local backup files
function cleanupLocalBackup(backupFile) {
    fs.unlinkSync(backupFile); // Delete the compressed backup file
    fs.rmdirSync(`${backupDir}/${dbName}-${dateString}`, { recursive: true }); // Remove the backup directory
    console.log(`Local backup deleted successfully.`);
}

// Perform an immediate backup for testing
backupMongoDB();


// Optional: Schedule daily backups at 12 AM
// cron.schedule('0 0 * * *', () => {
//     backupMongoDB();
// });

exec(`mega-logout`, (error) => {
    if (error) {
        console.error(`Error logging out of MEGA: ${error}`);
        return;
    }
    console.log(`Logged out of MEGA`);
});
