require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('--- EMAIL DIAGNOSTIC START ---');
    console.log(`User: ${process.env.SMTP_USER}`);
    console.log(`Host: ${process.env.SMTP_HOST}`);
    console.log(`Port: ${process.env.SMTP_PORT}`);
    
    const config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        logger: true,
        debug: true
    };

    console.log('Config:', JSON.stringify({ ...config, auth: { ...config.auth, pass: '****' } }, null, 2));

    const transporter = nodemailer.createTransport(config);

    try {
        console.log('Verifying transporter...');
        await transporter.verify();
        console.log('✓ Transporter verified successfully!');

        const mailOptions = {
            from: `"Test" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // Send to self
            subject: 'SMTP Diagnostic Test',
            text: 'This is a diagnostic test to verify SMTP settings.'
        };

        console.log('Sending test email to self...');
        const info = await transporter.sendMail(mailOptions);
        console.log('✓ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('✗ DIAGNOSTIC FAILED');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        console.error('Error Code:', error.code);
        console.error('Error Command:', error.command);
        console.error('Stack:', error.stack);
    }
    console.log('--- EMAIL DIAGNOSTIC END ---');
}

testEmail();
