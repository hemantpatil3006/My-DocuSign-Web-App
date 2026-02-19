require('dotenv').config();
const { sendInvitationEmail } = require('./utils/email');

async function testUtility() {
    console.log('--- UTILITY TEST START ---');
    
    const mockData = {
        senderName: 'Test Sender',
        recipientEmail: process.env.SMTP_USER, // Send to self
        recipientName: 'Test Recipient',
        documentName: 'Test Document',
        role: 'Signer',
        link: 'https://example.com/test-link'
    };

    console.log('Calling sendInvitationEmail with mock data...');
    try {
        const result = await sendInvitationEmail(mockData);
        console.log(`Result: ${result}`);
        if (result) {
            console.log('✓ Utility function successfully sent the email!');
        } else {
            console.log('✗ Utility function failed (returned false).');
        }
    } catch (error) {
        console.error('✗ Utility function crashed!');
        console.error(error);
    }
    console.log('--- UTILITY TEST END ---');
}

testUtility();
