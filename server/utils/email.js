const nodemailer = require('nodemailer');

const sendInvitationEmail = async ({
    senderName,
    recipientEmail,
    recipientName,
    documentName,
    role,
    link
}) => {
    let transporter;
    
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    
    // Switch to 587 as port 465 is often blocked on cloud providers like Render
    const isGmail = smtpHost && smtpHost.includes('gmail.com');
    const smtpPort = isGmail ? 587 : (Number(process.env.SMTP_PORT) || 587);
    const smtpSecure = isGmail ? false : (process.env.SMTP_SECURE === 'true');

    if (smtpHost && smtpUser && smtpPass) {
        console.log(`[EMAIL] Initializing SMTP for ${smtpUser} via ${smtpHost} on port ${smtpPort}`);
        
        const config = {
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
                user: smtpUser,
                pass: smtpPass
            },
            // Force IPv4 as Render has issues routing IPv6 to Gmail
            family: 4, 
            connectionTimeout: 15000, 
            greetingTimeout: 15000,
            socketTimeout: 20000,
            logger: true,
            debug: true
        };

        transporter = nodemailer.createTransport(config);

        try {
            await transporter.verify();
            console.log('[EMAIL] ✓ SMTP connection verified');
        } catch (verifyError) {
            console.error('[EMAIL] ✗ SMTP verification failed:', {
                message: verifyError.message,
                code: verifyError.code,
                command: verifyError.command,
                stack: verifyError.stack
            });
            return false;
        }
    } else {
        const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
        if (isProd) {
            console.error('[EMAIL] SMTP is not configured. (Missing SMTP_HOST/USER/PASS)');
            return false;
        }

        console.log('\n--- EMAIL SIMULATION ---');
        console.log(`To: ${recipientEmail}`);
        console.log(`Subject: Invitation to ${role} document: ${documentName}`);
        console.log(`Link: ${link}`);
        console.log('------------------------\n');
        return true; 
    }

    const timestamp = new Date().toLocaleTimeString();
    const mailOptions = {
        from: `"Labmentix Project" <${smtpUser}>`,
        to: recipientEmail,
        subject: `[${timestamp}] Invitation to ${role} document: ${documentName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #4f46e5;">Document Invitation</h2>
                <p>Hello <strong>${recipientName}</strong>,</p>
                <p><strong>${senderName}</strong> has invited you to <strong>${role}</strong> the document: <strong>${documentName}</strong>.</p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${link}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Document</a>
                </div>
                <p style="font-size: 12px; color: #666;">If the button above doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 12px; color: #4f46e5; word-break: break-all;">${link}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 11px; color: #999;">Powered by Labmentix Project SecureSign</p>
            </div>
        `
    };

    try {
        console.log(`[EMAIL] Attempting to send email to ${recipientEmail}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] ✓ Email sent successfully! MessageID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('[EMAIL] ✗ Email send error:', {
            message: error.message,
            code: error.code,
            command: error.command,
            stack: error.stack,
            recipient: recipientEmail
        });
        return false;
    }
};

module.exports = {
    sendInvitationEmail
};
