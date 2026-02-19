const sgMail = require('@sendgrid/mail');

/**
 * Send an invitation email via SendGrid API
 * This uses HTTP (port 443) which bypasses SMTP port blocks on Render.
 */
/**
 * Send an invitation email via SendGrid API
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
        console.log('\n--- EMAIL SIMULATION (Invitation) ---');
        console.log(`To: ${recipientEmail} | From: ${fromEmail}`);
        console.log(`Subject: Invitation to ${role} document: ${documentName}`);
        console.log('-------------------------------------\n');
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
        console.log(`[EMAIL] Sending invitation to ${recipientEmail}...`);
        await sgMail.send(msg);
        return true;
    } catch (error) {
        console.error('[EMAIL] ✗ SendGrid error:', error.message);
        return false;
    }
};

/**
 * Send a Password Reset email via SendGrid API
 */
const sendResetPasswordEmail = async (recipientEmail, resetUrl) => {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'patilhemant390@gmail.com';

    if (!apiKey) {
        console.log('\n--- EMAIL SIMULATION (Password Reset) ---');
        console.log(`To: ${recipientEmail} | URL: ${resetUrl}`);
        console.log('------------------------------------------\n');
        return true;
    }

    sgMail.setApiKey(apiKey);

    const msg = {
        to: recipientEmail,
        from: fromEmail,
        subject: 'Password Reset Request - DocuSign SaaS',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #4f46e5;">Password Reset Request</h2>
                <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
                <p>Please click on the following button to complete the process:</p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                </div>
                <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 11px; color: #999;">Powered by Labmentix Project SecureSign</p>
            </div>
        `
    };

    try {
        console.log(`[EMAIL] Sending password reset to ${recipientEmail}...`);
        await sgMail.send(msg);
        return true;
    } catch (error) {
        console.error('[EMAIL] ✗ SendGrid error:', error.message);
        return false;
    }
};

module.exports = {
    sendInvitationEmail,
    sendResetPasswordEmail
};
