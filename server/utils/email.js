const nodemailer = require('nodemailer');

const sendInvitationEmail = async ({
    senderName,
    recipientEmail,
    recipientName,
    documentName,
    role,
    link
}) => {
    // For demo/development, if SMTP credentials are not provided, we can use Ethereal
    let transporter;
    
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    } else {
        // Fallback to a log for testing if no SMTP is configured
        console.log('\n--- EMAIL SIMULATION ---');
        console.log(`To: ${recipientEmail}`);
        console.log(`Subject: Invitation to ${role} document: ${documentName}`);
        console.log(`Body: Hello ${recipientName}, ${senderName} has invited you to ${role} the document "${documentName}".`);
        console.log(`Link: ${link}`);
        console.log('------------------------\n');
        return true; 
    }

    const mailOptions = {
        from: `"Labmentix Project" <${process.env.SMTP_USER}>`,
        to: recipientEmail,
        subject: `Invitation to ${role} document: ${documentName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 8px;">
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
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email send error:', error);
        return false;
    }
};

module.exports = {
    sendInvitationEmail
};
