import nodemailer from 'nodemailer';
import 'dotenv/config';

const SMTP_CONFIG = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
};

const TARGET_EMAILS = [
    'im.ishaq.bd@gmail.com',
    'luxiquebd@gmail.com',
];

const transporter = nodemailer.createTransport(SMTP_CONFIG);

const servicePromoTemplate = (clientName) => ({
    subject: `CONQUERIC  - 26 CONQUER Offer`,
    html: `
       <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Conqueric E-commerce Solutions</title>

<style>
body {
  margin: 0;
  padding: 0;
  background: #eef2f7;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.container {
  max-width: 650px;
  margin: 40px auto;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
}

.header {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: #ffffff;
  text-align: center;
  padding: 35px 20px;
}

.header h1 {
  margin: 0;
  font-size: 30px;
  letter-spacing: 1px;
}

.header p {
  margin-top: 8px;
  font-size: 14px;
  opacity: 0.8;
}

.section {
  padding: 28px 30px;
}

.section h2 {
  color: #0f172a;
  font-size: 20px;
  margin-bottom: 12px;
  border-left: 4px solid #2563eb;
  padding-left: 10px;
}

.text {
  color: #475569;
  font-size: 15px;
  line-height: 1.7;
}

.list {
  margin-top: 12px;
  padding-left: 18px;
}

.list li {
  margin-bottom: 10px;
  font-size: 14px;
  color: #334155;
}

.highlight-box {
  background: #f1f5ff;
  border-left: 4px solid #2563eb;
  padding: 18px;
  border-radius: 8px;
  margin-top: 15px;
}

.cta {
  text-align: center;
  padding: 35px 20px;
  background: #f8fafc;
}

.button {
  display: inline-block;
  margin-top: 15px;
  background: #2563eb;
  color: #ffffff;
  padding: 14px 28px;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: 0.3s;
}

.button:hover {
  background: #1d4ed8;
}

.footer {
  background: #0f172a;
  color: #cbd5f5;
  text-align: center;
  padding: 25px;
  font-size: 13px;
}

.footer a {
  color: #60a5fa;
  text-decoration: none;
}

.footer p {
  margin: 6px 0;
}

.divider {
  height: 1px;
  background: #e2e8f0;
  margin: 0 30px;
}

</style>
</head>

<body>

<div class="container">

<div class="header">
  <h1>Conqueric</h1>
  <p>Complete E-commerce Web Solutions</p>
</div>

<div class="section">
  <p class="text">
    Your business is already performing great through Facebook and offline channels. 
    Now it's time to scale smarter with a strong digital foundation.
  </p>

  <div class="highlight-box">
    Moving to your own website or mobile app ensures long-term growth, stability, and full control over your business.
  </div>
</div>

<div class="divider"></div>

<div class="section">
  <h2>Why You Need Your Own Platform</h2>
  <ul class="list">
    <li><b>Stronger Brand Authority</b> — Build trust instantly with a professional presence</li>
    <li><b>Own Your Customer Data</b> — Reduce future marketing costs</li>
    <li><b>Full Business Control</b> — No dependency on social platforms</li>
    <li><b>Automation</b> — Faster order processing & management</li>
  </ul>
</div>

<div class="divider"></div>

<div class="section">
  <h2>Our Core E-commerce Solutions</h2>
  <ul class="list">
    <li>Custom Website Design & Development</li>
    <li>Modern UI/UX (Mobile Optimized)</li>
    <li>Product & Inventory Management</li>
    <li>Secure Payment Integration</li>
    <li>Order & Shipping Automation</li>
    <li>SEO & Speed Optimization</li>
    <li>Admin Dashboard</li>
    <li>API & Third-party Integration</li>
  </ul>
</div>

<div class="divider"></div>

<div class="section">
  <h2>Growth & Marketing Support</h2>
  <ul class="list">
    <li>Facebook & Google Ads Setup</li>
    <li>Pixel, GA4 & Conversion Tracking</li>
    <li>Fake Order Reduction System</li>
    <li>Remarketing Strategy</li>
    <li>WhatsApp & Email Automation</li>
  </ul>
</div>

<div class="divider"></div>

<div class="cta">
  <h2>Ready to Scale Your Business?</h2>
  <p class="text">
    We combine modern technology with data-driven strategy to build platforms that convert visitors into paying customers.
  </p>

  <a href="https://conqueric.com" class="button">Visit Website</a>
</div>

<div class="footer">
  <p><b>Conqueric</b></p>
  <p>🌐 <a href="https://conqueric.com">conqueric.com</a></p>
  <p>📧 info@conqueric.com</p>
  <p>📞 +880 1568202839</p>
</div>

</div>

</body>
</html>

    `,
});

const sendBulkEmail = async () => {
    console.log('--- Starting Email Campaign ---');

    for (const email of TARGET_EMAILS) {
        try {
            const clientName = email.split('@')[0].includes('.')
                ? email.split('@')[0].split('.').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')
                : 'Valued Client';

            const template = servicePromoTemplate(clientName);

            const mailOptions = {
                from: '"CONQUERIC" <weareconqueric@gmail.com>',
                to: email,
                subject: template.subject,
                html: template.html,
            };

            const result = await transporter.sendMail(mailOptions);
            console.log(`Success: Email sent to ${email}. Message ID: ${result.messageId}`);

        } catch (error) {
            console.error(`Failed: Could not send email to ${email}. Error: ${error.message}`);
        }
    }

    console.log('--- Campaign Finished ---');
};

sendBulkEmail();