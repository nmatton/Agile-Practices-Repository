const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Check if SMTP configuration is available
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      console.log('Initializing SMTP transporter with:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        user: process.env.SMTP_USER
      });
      
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        },
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates
        }
      });
    } else {
      // For development/testing without SMTP config, use a mock transporter
      console.log('No SMTP configuration found, using mock email service');
      this.transporter = {
        sendMail: async (mailOptions) => {
          console.log('Mock email sent:', {
            to: mailOptions.to,
            subject: mailOptions.subject,
            text: mailOptions.text
          });
          return {
            messageId: 'mock-message-id-' + Date.now(),
            accepted: [mailOptions.to],
            rejected: []
          };
        }
      };
    }
  }

  async sendTeamInvitation({ recipientEmail, teamName, inviterName, teamId }) {
    const subject = `Invitation to join team: ${teamName}`;
    const text = `
Hello,

${inviterName} has invited you to join the team "${teamName}" in the Agile Practice Repository.

To accept this invitation, please:
1. Register or log in to the APR system
2. Navigate to your team management page
3. Use team ID: ${teamId} to join the team

If you don't have an account yet, you can register at: ${process.env.APP_URL || 'http://localhost:3000'}/register

Best regards,
The APR Team
    `.trim();

    const html = `
      <h2>Team Invitation</h2>
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to join the team "<strong>${teamName}</strong>" in the Agile Practice Repository.</p>
      
      <h3>To accept this invitation:</h3>
      <ol>
        <li>Register or log in to the APR system</li>
        <li>Navigate to your team management page</li>
        <li>Use team ID: <strong>${teamId}</strong> to join the team</li>
      </ol>
      
      <p>If you don't have an account yet, you can <a href="${process.env.APP_URL || 'http://localhost:3000'}/register">register here</a>.</p>
      
      <p>Best regards,<br>The APR Team</p>
    `;

    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@apr.com',
      to: recipientEmail,
      subject: subject,
      text: text,
      html: html
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Team invitation email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Failed to send team invitation email:', error);
      throw new Error('Failed to send invitation email');
    }
  }

  async sendWelcomeEmail({ recipientEmail, userName }) {
    const subject = 'Welcome to Agile Practice Repository';
    const text = `
Hello ${userName},

Welcome to the Agile Practice Repository! Your account has been successfully created.

You can now:
- Browse agile practices and methods
- Create or join teams
- Take personality assessments for personalized recommendations
- Customize practices for your team context

Get started by logging in at: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/login

Best regards,
The APR Team
    `.trim();

    const html = `
      <h2>Welcome to APR!</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>Welcome to the Agile Practice Repository! Your account has been successfully created.</p>
      
      <h3>You can now:</h3>
      <ul>
        <li>Browse agile practices and methods</li>
        <li>Create or join teams</li>
        <li>Take personality assessments for personalized recommendations</li>
        <li>Customize practices for your team context</li>
      </ul>
      
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/login">Get started by logging in</a></p>
      
      <p>Best regards,<br>The APR Team</p>
    `;

    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@apr.com',
      to: recipientEmail,
      subject: subject,
      text: text,
      html: html
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw error for welcome email - it's not critical
      return null;
    }
  }
}

// Export singleton instance
module.exports = new EmailService();