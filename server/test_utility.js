require('dotenv').config();
const { sendInvitationEmail } = require('./utils/email');

async function testUtility() {
    console.log('--- UTILITY TEST START (SENDGRID) ---');
    console.log(`From: ${process.env.SENDGRID_FROM_EMAIL}`);
    
    const mockData = {
        senderName: 'Test Sender',
        recipientEmail: 'patilhemant390@gmail.com', // Send to self
        recipientName: 'Test Recipient',
        documentName: 'Test SendGrid Document',
        role: 'Signer',
        link: 'https://example.com/test-sendgrid'
    };

    console.log('Calling sendInvitationEmail with SendGrid API...');
    try {
        const result = await sendInvitationEmail(mockData);
        console.log(`Result: ${result}`);
        if (result) {
            console.log('✓ SendGrid API successfully sent the email!');
        } else {
            console.log('✗ SendGrid API failed (returned false). Check the logs above.');
        }
    } catch (error) {
        console.error('✗ Utility function crashed!');
        console.error(error);
    }
    console.log('--- UTILITY TEST END ---');
}

testUtility();
