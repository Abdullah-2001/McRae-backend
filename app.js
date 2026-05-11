const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const CONFIG = {
    // Gmail SMTP Settings
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_USER: 'srptech63@gmail.com',  // ← YOUR GMAIL
    SMTP_PASS: 'gwlq piye gfbt vbwz',  // ← PUT YOUR APP PASSWORD HERE (16 chars)
    
    // Email Settings
    FROM_EMAIL: 'srptech63@gmail.com',
    ADMIN_EMAIL: 'srptech63@gmail.com',
    
    // Server
    PORT: 5000,
    
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: 900000,  // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: 5      // max 5 requests per window
};

// In-memory rate limiting
const ipRequestMap = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    const windowMs = CONFIG.RATE_LIMIT_WINDOW_MS;
    const maxRequests = CONFIG.RATE_LIMIT_MAX_REQUESTS;
    
    if (!ipRequestMap.has(ip)) {
        ipRequestMap.set(ip, []);
    }
    
    const requests = ipRequestMap.get(ip);
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
    
    if (validRequests.length >= maxRequests) {
        return false;
    }
    
    validRequests.push(now);
    ipRequestMap.set(ip, validRequests);
    return true;
}

// Create email transporter
function createTransporter() {
    return nodemailer.createTransport({
        host: CONFIG.SMTP_HOST,
        port: CONFIG.SMTP_PORT,
        secure: CONFIG.SMTP_SECURE,
        auth: {
            user: CONFIG.SMTP_USER,
            pass: CONFIG.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
}

// Test SMTP connection
async function testSMTPConnection() {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully!');
        return true;
    } catch (error) {
        console.error('❌ SMTP connection failed:', error.message);
        console.error('\n🔧 TROUBLESHOOTING:');
        console.error('1. Enable 2-Step Verification on your Google account');
        console.error('2. Generate an App Password at: https://myaccount.google.com/apppasswords');
        console.error('3. Copy the 16-character password and paste it as SMTP_PASS');
        console.error('4. If still failing, check if "Allow less secure apps" was disabled by Google\n');
        return false;
    }
}

// Email templates
function getAdminTemplate(data) {
    const { name, company, phone, email, message } = data;
    const date = new Date().toLocaleString();
    
    return {
        subject: `🎬 New Contact: ${name} via McRae Entertainment`,
        html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; background: #0a0a0a; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background: #111; border-radius: 12px; overflow: hidden; border: 1px solid #e50914;">
                    <div style="background: #e50914; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">🎬 McRae Entertainment</h1>
                        <p style="color: white; margin: 5px 0 0;">New Contact Form Submission</p>
                    </div>
                    <div style="padding: 25px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 10px 0; font-weight: bold; color: #e50914;">Name:</td><td style="padding: 10px 0; color: #fff;">${name}</td></tr>
                            ${company ? `<tr><td style="padding: 10px 0; font-weight: bold; color: #e50914;">Company:</td><td style="padding: 10px 0; color: #fff;">${company}</td></tr>` : ''}
                            <tr><td style="padding: 10px 0; font-weight: bold; color: #e50914;">Phone:</td><td style="padding: 10px 0; color: #fff;">${phone}</td></tr>
                            <tr><td style="padding: 10px 0; font-weight: bold; color: #e50914;">Email:</td><td style="padding: 10px 0; color: #fff;">${email}</td></tr>
                            <tr><td style="padding: 10px 0; font-weight: bold; color: #e50914; vertical-align: top;">Message:</td><td style="padding: 10px 0; color: #fff;">${message.replace(/\n/g, '<br>')}</td></tr>
                            <tr><td style="padding: 10px 0; font-weight: bold; color: #e50914;">Submitted:</td><td style="padding: 10px 0; color: #888;">${date}</td></tr>
                        </table>
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333; text-align: center; color: #666; font-size: 12px;">
                            <p>This email was sent from your website contact form.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            🎬 McRae Entertainment - New Contact Form Submission
            
            Name: ${name}
            ${company ? `Company: ${company}` : ''}
            Phone: ${phone}
            Email: ${email}
            Message: ${message}
            Submitted: ${date}
        `
    };
}

function getUserAutoReplyTemplate(name) {
    return {
        subject: "Thank you for contacting McRae Entertainment 🎬",
        html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; background: #0a0a0a; padding: 20px;">
                <div style="max-width: 500px; margin: 0 auto; background: #111; border-radius: 12px; overflow: hidden; border: 1px solid #e50914;">
                    <div style="background: #e50914; padding: 20px; text-align: center;">
                        <h2 style="color: white; margin: 0;">McRae Entertainment</h2>
                    </div>
                    <div style="padding: 25px; color: #fff;">
                        <h3>Dear ${name},</h3>
                        <p>Thank you for reaching out to <strong style="color: #e50914;">McRae Entertainment</strong>! 🎬</p>
                        <p>We have received your message and our team will get back to you within <strong>24 hours</strong>.</p>
                        <p>In the meantime, feel free to explore our latest releases and upcoming premieres.</p>
                        <p style="margin-top: 30px; padding: 15px; background: #1a1a1a; border-left: 4px solid #e50914;">
                            <strong>✨ Did you know?</strong><br>
                            McRae Entertainment offers exclusive early access and 4K HDR streaming for all Originals.
                        </p>
                        <p style="margin-top: 30px;">Best regards,<br><strong style="color: #e50914;">The McRae Entertainment Team</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Dear ${name},
            
            Thank you for contacting McRae Entertainment!
            
            We have received your message and will respond within 24 hours.
            
            Best regards,
            The McRae Entertainment Team
        `
    };
}

// Send email function
async function sendEmail({ to, subject, html, text }) {
    const transporter = createTransporter();
    
    const mailOptions = {
        from: `"McRae Entertainment" <${CONFIG.FROM_EMAIL}>`,
        to: to,
        subject: subject,
        text: text || '',
        html: html || ''
    };
    
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
}

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'McRae Email Server',
        timestamp: new Date().toISOString(),
        smtp_configured: !!CONFIG.SMTP_PASS
    });
});

// Check SMTP status
app.get('/api/email/status', async (req, res) => {
    const isConnected = await testSMTPConnection();
    res.json({
        success: isConnected,
        message: isConnected ? 'SMTP connection is healthy' : 'SMTP connection failed - check your App Password'
    });
});

// Send test email
app.post('/api/email/test', async (req, res) => {
    try {
        const { testEmail } = req.body;
        const to = testEmail || CONFIG.ADMIN_EMAIL;
        
        await sendEmail({
            to: to,
            subject: '🎬 McRae Entertainment - Test Email',
            html: '<h1 style="color:#e50914;">✅ Test Successful!</h1><p>Your email server is working correctly.</p><p>Sent from McRae Entertainment SMTP service.</p>',
            text: 'Test email - Your SMTP configuration is working correctly!'
        });
        
        res.json({ success: true, message: 'Test email sent successfully' });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Send contact form email - MAIN ENDPOINT
app.post('/api/email/send-contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        
        // Validation
        const errors = [];
        if (!name || name.trim().length < 2) errors.push('Name is required (min 2 characters)');
        if (!email) errors.push('Email is required');
        if (!message || message.trim().length < 5) errors.push('Message is required (min 5 characters)');
        
        const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        if (email && !emailRegex.test(email)) errors.push('Invalid email format');
        
        if (errors.length > 0) {
            return res.status(400).json({ success: false, errors });
        }
        
        // Rate limiting
        const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        if (!checkRateLimit(clientIp)) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.'
            });
        }
        
        // Check if SMTP is configured
        if (!CONFIG.SMTP_PASS) {
            return res.status(500).json({
                success: false,
                message: 'SMTP password not configured. Please set SMTP_PASS in the config.'
            });
        }
        
        const formData = { name, email, message };
        
        // Send admin notification
        const adminTemplate = getAdminTemplate(formData);
        await sendEmail({
            to: CONFIG.ADMIN_EMAIL,
            subject: adminTemplate.subject,
            html: adminTemplate.html,
            text: adminTemplate.text
        });
        
        // Send auto-reply to user
        const autoReplyTemplate = getUserAutoReplyTemplate(name);
        await sendEmail({
            to: email,
            subject: autoReplyTemplate.subject,
            html: autoReplyTemplate.html,
            text: autoReplyTemplate.text
        });
        
        console.log(`✅ Contact form processed: ${name} (${email})`);
        res.json({
            success: true,
            message: 'Your message has been sent successfully! We will respond within 24 hours.'
        });
        
    } catch (error) {
        console.error('Send contact error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send email. Please try again later.'
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found. Available: POST /api/email/send-contact, GET /health, GET /api/email/status'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// ============================================
// START SERVER
// ============================================
async function startServer() {
    console.log('\n========================================');
    console.log('🎬 McRae Entertainment Email Server');
    console.log('========================================\n');
    
    // Check SMTP password
    if (!CONFIG.SMTP_PASS) {
        console.error('❌ ERROR: SMTP_PASS is not configured!');
        console.error('\n📧 To fix this:');
        console.error('1. Go to https://myaccount.google.com/apppasswords');
        console.error('2. Enable 2-Step Verification on your Google account');
        console.error('3. Generate an App Password for "Mail"');
        console.error('4. Copy the 16-character password');
        console.error('5. Replace the empty SMTP_PASS string in CONFIG with your password\n');
        console.error('Example: SMTP_PASS: "abcd efgh ijkl mnop" (remove spaces)\n');
        process.exit(1);
    }
    
    // Test SMTP connection
    const isConnected = await testSMTPConnection();
    if (!isConnected) {
        console.error('❌ Server cannot start - SMTP connection failed\n');
        process.exit(1);
    }
    
    // Start server
    app.listen(CONFIG.PORT, () => {
        console.log(`\n🚀 Server running on http://localhost:${CONFIG.PORT}`);
        console.log(`📧 Using account: ${CONFIG.SMTP_USER}`);
        console.log(`✅ Ready to receive contact form submissions\n`);
        console.log('📡 Available endpoints:');
        console.log(`   POST   http://localhost:${CONFIG.PORT}/api/email/send-contact`);
        console.log(`   GET    http://localhost:${CONFIG.PORT}/health`);
        console.log(`   GET    http://localhost:${CONFIG.PORT}/api/email/status`);
        console.log(`   POST   http://localhost:${CONFIG.PORT}/api/email/test`);
        console.log('\n========================================\n');
    });
}

startServer();