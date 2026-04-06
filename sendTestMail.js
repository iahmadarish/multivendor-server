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
    'office@rescuemarketing.co',
    'bill@emulent.com',
    'inquire@paulgregorymedia.com',
    'paul@paulgregorymedia.com',
    'deandra.henahan@gate39media.com',
    'info@hostway.com',


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
    <title>CONQUERIC - Strategic Offshore Development Partnership Proposal</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Source+Sans+Pro:wght@400;600;700&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.7;
            color: #2D3748;
            background-color: #F7FAFC;
            padding: 20px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .email-container {
            max-width: 680px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 0;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            border: 1px solid #E2E8F0;
        }

        /* Header Section - Professional Black Centered Design */
        .header {
            background-color: #000000;
            color: #ffffff;
            padding: 48px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
            border-bottom: 4px solid #20C997;
        }

        .header-content {
            max-width: 520px;
            margin: 0 auto;
            position: relative;
            z-index: 2;
        }

        .logo {
            font-family: 'Source Sans Pro', sans-serif;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: -0.5px;
            margin-bottom: 8px;
            color: #ffffff;
            position: relative;
            display: inline-block;
        }

        .logo::after {
            content: "";
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 3px;
            background: #20C997;
            border-radius: 2px;
        }

        .tagline {
            font-size: 14px;
            font-weight: 400;
            opacity: 0.85;
            margin-bottom: 16px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .subject-line {
            font-size: 18px;
            font-weight: 500;
            opacity: 0.95;
            margin-top: 20px;
            line-height: 1.5;
            color: #E2E8F0;
        }

        /* Main Content Area */
        .content {
            padding: 48px 40px;
        }

        .greeting {
            color: #1A202C;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 32px;
            padding-bottom: 16px;
            border-bottom: 1px solid #E2E8F0;
        }

        .intro-text {
            color: #4A5568;
            font-size: 15px;
            margin-bottom: 28px;
            line-height: 1.8;
        }

        .intro-text strong {
            color: #1A202C;
            font-weight: 600;
        }

        /* Value Proposition */
        .value-proposition {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            padding: 22px;
            margin: 36px 0;
            border-radius: 8px;
            border: 1px solid #20C997;
        }

        .value-header {
            color: #1A202C;
            font-weight: 700;
            font-size: 18px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
        }

        .value-header::before {
            content: "✓";
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 26px;
            height: 26px;
            background: #20C997;
            color: white;
            border-radius: 50%;
            margin-right: 12px;
            font-size: 14px;
            font-weight: bold;
        }

        .key-metrics {
            list-style: none;
            padding: 0;
        }

        .key-metrics li {
            padding: 10px 0;
            font-size: 15px;
            color: #4A5568;
            display: flex;
            align-items: flex-start;
            line-height: 1.6;
        }

        .key-metrics li::before {
            content: "•";
            color: #20C997;
            font-weight: bold;
            font-size: 20px;
            margin-right: 12px;
            flex-shrink: 0;
            line-height: 1;
        }

        /* Section Headers */
        .section-header {
            color: #1A202C;
            font-size: 20px;
            font-weight: 600;
            margin: 44px 0 20px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid #E2E8F0;
            position: relative;
        }

        .section-header::after {
            content: "";
            position: absolute;
            bottom: -1px;
            left: 0;
            width: 80px;
            height: 2px;
            background: #20C997;
        }

        /* Technology Table */
        .tech-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin: 28px 0;
            font-size: 14px;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #E2E8F0;
            background: #F8FAFC;
        }

        .tech-table th {
            background: #1A202C;
            color: #FFFFFF;
            font-weight: 600;
            padding: 18px 24px;
            text-align: left;
            border-bottom: 2px solid #20C997;
            text-transform: uppercase;
            font-size: 13px;
            letter-spacing: 0.5px;
        }

        .tech-table td {
            padding: 18px 24px;
            border-bottom: 1px solid #E2E8F0;
            vertical-align: top;
            color: #4A5568;
        }

        .tech-table tr:last-child td {
            border-bottom: none;
        }

        .domain-name {
            font-weight: 600;
            color: #1A202C;
            font-size: 15px;
            white-space: nowrap;
        }

        /* Engagement Models */
        .engagement-models {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 24px;
            margin: 28px 0;
        }

        .model-card {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 24px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .model-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .model-number {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: #20C997;
            color: white;
            border-radius: 50%;
            font-weight: 700;
            font-size: 14px;
            margin-bottom: 16px;
        }

        .model-title {
            font-size: 16px;
            font-weight: 600;
            color: #1A202C;
            margin-bottom: 12px;
        }

        .model-desc {
            font-size: 14px;
            color: #4A5568;
            line-height: 1.6;
        }

        /* Call to Action */
        .cta-section {
            text-align: center;
            margin: 52px 0 32px 0;
            padding: 40px;
            background: linear-gradient(135deg, #1A202C 0%, #000000 100%);
            border-radius: 8px;
            color: white;
            position: relative;
            overflow: hidden;
        }

        .cta-title {
            margin-bottom: 16px;
            font-size: 24px;
            font-weight: 700;
            position: relative;
        }

        .cta-desc {
            margin-bottom: 28px;
            font-size: 16px;
            opacity: 0.9;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
            line-height: 1.7;
        }

        .cta-button {
            display: inline-block;
            background: #20C997;
            color: #ffffff;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(32, 201, 151, 0.3);
            transition: all 0.3s ease;
            position: relative;
            border: none;
            cursor: pointer;
            letter-spacing: 0.3px;
            text-transform: uppercase;
            font-size: 14px;
            letter-spacing: 1px;
        }

        .cta-button:hover {
            background-color: #17A2B8;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(32, 201, 151, 0.4);
        }

        /* Footer - Professional Black Centered */
        .footer {
            background-color: #000000;
            color: #E2E8F0;
            padding: 12px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
            border-top: 4px solid #20C997;
        }

        .footer-content {
            max-width: 520px;
            margin: 0 auto;
            position: relative;
            z-index: 2;
        }

        .contact-info {
            margin-bottom: 24px;
        }

        .contact-info a {
            color: #20C997;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
        }

        .contact-info a:hover {
            color: #ffffff;
            text-decoration: underline;
        }

        .signature {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .signature-name {
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 4px;
            font-size: 16px;
            letter-spacing: 0.2px;
        }

        .signature-title {
            font-size: 14px;
            opacity: 0.85;
            margin-bottom: 4px;
        }

        .company-info {
            margin-top: 24px;
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 24px;
        }

        .company-info a {
            display: inline-flex;
            align-items: center;
            color: #A0AEC0;
            text-decoration: none;
            font-size: 14px;
            transition: color 0.2s;
        }

        .company-info a:hover {
            color: #20C997;
        }

        .icon {
            margin-right: 8px;
            font-size: 14px;
        }

        .copyright {
            margin-top: 32px;
            font-size: 12px;
            opacity: 0.6;
            color: #A0AEC0;
        }

        /* Mobile Optimizations */
        @media (max-width: 600px) {
            body {
                padding: 10px !important;
            }

            .email-container {
                border-radius: 0 !important;
            }

            .content,
            .header,
            .footer {
                padding: 32px 20px !important;
            }

            .header,
            .footer {
                padding: 40px 20px !important;
            }

            .tech-table,
            .tech-table th,
            .tech-table td {
                font-size: 13px !important;
                display: block !important;
                width: 100% !important;
                text-align: left !important;
            }

            .tech-table th {
                background: #1A202C;
                display: block;
            }

            .tech-table tr {
                margin-bottom: 15px;
                display: block;
                border: 1px solid #E2E8F0 !important;
                border-radius: 6px;
                overflow: hidden;
            }

            .tech-table td {
                border-bottom: 1px solid #E2E8F0 !important;
                display: block;
                padding: 16px 20px !important;
            }

            .domain-name {
                font-weight: 700;
                background: #F8FAFC;
                padding: 8px 12px !important;
                margin: -16px -20px 12px -20px !important;
                border-bottom: 1px solid #E2E8F0;
            }

            .engagement-models {
                grid-template-columns: 1fr;
                gap: 16px;
            }

            .cta-section {
                padding: 32px 20px !important;
            }

            .cta-button {
                display: block;
                padding: 14px 20px !important;
            }

            .company-info {
                flex-direction: column;
                gap: 12px;
                align-items: center;
            }
        }
    </style>
</head>

<body>
    <div class="email-container">
        <!-- Professional Black Header -->
        <div class="header">
            <div class="header-content">
                <div class="logo">CONQUERIC</div>
                <div class="tagline">Terning Ideas into impact</div>
                <div style="font-size: 12px; border-bottom: 1px solid white;" >Accelerated Engineering Delivery & Cost Optimization
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="content">
            <h2 class="greeting">Dear Recipients,</h2>

            <p class="intro-text">
                I am writing on behalf of <a  href="https://conqueric.com/"> <strong style="color: #018397;">CONQUERIC</strong></a> to propose a strategic offshore development
                partnership designed to address your organization's technical capacity requirements while achieving
                significant operational efficiencies. Our model is engineered to seamlessly augment your existing teams
                with elite engineering talent from Bangladesh.
            </p>

            <div class="value-proposition">
                <p style="color:#018397" class="value-header">Strategic Advantages of Our Partnership</p>
                <ul class="key-metrics">
                    <li> Access to senior engineering talent at 40-60% reduced
                        operational costs compared to Western markets</li>
                    <li> 4-6 hours of daily overlap with European time zones
                        enabling real-time collaboration</li>
                    <li>Rapid team scaling capabilities for product launches,
                        feature sprints, or maintenance cycles</li>
                    <li>Rigorous engineering standards with comprehensive code
                        reviews and automated testing protocols</li>
                </ul>
            </div>

            <p class="intro-text">
                We have analyzed current market demands and understand the pressure to deliver innovative digital
                solutions while maintaining fiscal responsibility. Our specialized development teams are proficient in
                modern technology stacks and agile methodologies, ensuring seamless integration with your existing
                workflows.
            </p>

            <h3 class="section-header">Core Technical Competencies</h3>

            <table class="tech-table">
                <tr>
                    <th width="30%">Development Domain</th>
                    <th width="70%">Technical Stack & Specializations</th>
                </tr>
                <tr>
                    <td class="domain-name">Frontend Engineering</td>
                    <td>React.js ecosystem (Next.js, Gatsby), Vue.js (Nuxt.js), TypeScript, Progressive Web Apps (PWA),
                        Headless CMS integration (Strapi, Contentful), Accessibility compliance (WCAG 2.1)</td>
                </tr>
                <tr>
                    <td class="domain-name">Backend & API Development</td>
                    <td>Node.js (NestJS, Express), Python (Django, FastAPI), Microservices architecture, RESTful &
                        GraphQL API design, Serverless computing (AWS Lambda, Azure Functions), Database optimization
                    </td>
                </tr>
                <tr>
                    <td class="domain-name">DevOps & Cloud Infrastructure</td>
                    <td>CI/CD pipeline development (GitLab, GitHub Actions), Containerization (Docker, Kubernetes),
                        Cloud platforms (AWS, Azure, GCP), Infrastructure as Code (Terraform, CloudFormation),
                        Monitoring & observability</td>
                </tr>
            </table>

            <h3 class="section-header">Flexible Engagement Frameworks</h3>

            <p class="intro-text">
                We offer three distinct engagement models designed to align with your specific operational requirements
                and project lifecycle stages:
            </p>

            <div class="engagement-models">
                <div class="model-card">
                    <div class="model-number">1</div>
                    <div class="model-title">Dedicated Development Team</div>
                    <div class="model-desc">
                        Full-time engineers integrated into your organization, working exclusively on your projects with
                        direct oversight and daily collaboration.
                    </div>
                </div>

                <div class="model-card">
                    <div class="model-number">2</div>
                    <div class="model-title">Project-Based Engagement</div>
                    <div class="model-desc">
                        Fixed-scope, fixed-timeline delivery for specific projects or MVPs with clearly defined
                        deliverables and success metrics.
                    </div>
                </div>

                <div class="model-card">
                    <div class="model-number">3</div>
                    <div class="model-title">Hybrid Support Model</div>
                    <div class="model-desc">
                        Combination of dedicated resources and hourly support for maintenance, enhancements, and ongoing
                        technical support.
                    </div>
                </div>

                <div class="model-card">
                    <div class="model-number">4</div>
                    <div class="model-title">On-Demand & Hourly Engagement</div>
                    <div class="model-desc">
                        Flexible, pay-as-you-go development and consulting services ideal for quick fixes, feature
                        upgrades, audits, or expert technical guidance.
                    </div>
                </div>
            </div>


            <div class="cta-section">
                <h3 class="cta-title">Schedule a Technical Consultation</h3>
                <p class="cta-desc">I would welcome the opportunity to discuss how CONQUERIC can support your specific
                    technical objectives. Let's schedule a 30-minute discovery call to explore potential collaboration.
                </p>
                <a href="mailto:info@conqueric.com?subject=Technical%20Consultation%20Request%20-%20CONQUERIC"
                    class="cta-button">Request Discovery Call</a>
            </div>
        </div>

        <!-- Professional Black Footer -->
        <div class="footer">
            <div class="footer-content">


                <div class="signature">
                    <p class="signature-name">Ishaq Ahmad</p>
                    <p class="signature-title">Business Development Director</p>
                    <p class="signature-title">CONQUERIC</p>
                </div>

                <div class="company-info">
                    <a href="mailto:info@conqueric.com">
                        <span class="icon">✉</span> info@conqueric.com
                    </a>
                    <a href="tel:+8801511521362">
                        <span class="icon">📞</span> +880 1511 521362
                    </a>
                    <a href="http://conqueric.com">
                        <span class="icon">🌐</span> conqueric.com
                    </a>
                </div>

                <div class="copyright">
                    © 2025 CONQUERIC. All rights reserved. | Strategic Offshore Development Partnership
                </div>
            </div>
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