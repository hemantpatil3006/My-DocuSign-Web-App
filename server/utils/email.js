const sgMail = require('@sendgrid/mail');

/**
 * Send an invitation email via SendGrid API
 * This uses HTTP (port 443) which bypasses SMTP port blocks on Render.
 */
const sendInvitationEmail = async ({
    senderName,
    recipientEmail,
    recipientName,
    documentName,
    role,
    link
}) => {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'patilhemant390@gmail.com';

    if (!apiKey) {
        const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
        if (isProd) {
            console.error('[EMAIL] SendGrid API Key is missing. Refusing to send in production.');
            return false;
        }

        console.log('\n--- EMAIL SIMULATION (SendGrid) ---');
        console.log(`To: ${recipientEmail}`);
        console.log(`From: ${fromEmail}`);
        console.log(`Subject: Invitation to ${role} document: ${documentName}`);
        console.log(`Link: ${link}`);
        console.log('------------------------\n');
        return true;
    }

    sgMail.setApiKey(apiKey);

    const msg = {
        to: recipientEmail,
        from: fromEmail, 
        subject: `Invitation to ${role} document: ${documentName}`,
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
        console.log(`[EMAIL] Attempting to send email via SendGrid to ${recipientEmail}...`);
        await sgMail.send(msg);
        console.log(`[EMAIL] ✓ SendGrid email sent successfully!`);
        return true;
    } catch (error) {
        console.error('[EMAIL] ✗ SendGrid error:', {
            message: error.message,
            code: error.code,
            response: error.response?.body?.errors,
            recipient: recipientEmail
        });
        return false;
    }
};

module.exports = {
    sendInvitationEmail
};
