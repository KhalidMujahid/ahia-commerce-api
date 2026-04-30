import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromAddress: string;

  constructor(private configService: ConfigService) {
    this.fromAddress =
      this.configService.get<string>('mail.from') || 'noreply@ahiaglobal.com';
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const provider = this.configService.get<string>('email.provider') || 'smtp';

    try {
      switch (provider) {
        case 'sendgrid':
          return await this.sendWithSendGrid(options);
        case 'mailgun':
          return await this.sendWithMailgun(options);
        case 'ses':
          return await this.sendWithSES(options);
        case 'smtp':
        default:
          return await this.sendWithSMTP(options);
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    const subject = 'Welcome to AhiaGlobal - Your Account is Ready!';
    const html = this.getWelcomeTemplate(firstName);

    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Welcome to AhiaGlobal, ${firstName}! We're excited to have you on board.`,
    });
  }

  async sendOTPEmail(
    email: string,
    otp: string,
    purpose: 'verification' | 'login' | 'password_reset',
  ): Promise<boolean> {
    const subject =
      purpose === 'password_reset'
        ? 'Reset Your AhiaGlobal Password'
        : purpose === 'login'
          ? 'Your Login OTP for AhiaGlobal'
          : 'Verify Your AhiaGlobal Account';

    const html = this.getOTPTemplate(otp, purpose);
    const purposeText =
      purpose === 'password_reset'
        ? 'password reset'
        : purpose === 'login'
          ? 'login'
          : 'account verification';

    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Your OTP for ${purposeText} is: ${otp}. Valid for 10 minutes.`,
    });
  }

  async sendOrderConfirmationEmail(
    email: string,
    orderNumber: string,
    totalAmount: number,
    currency: string,
  ): Promise<boolean> {
    const subject = `Order Confirmed - ${orderNumber}`;
    const html = this.getOrderConfirmationTemplate(orderNumber, totalAmount, currency);

    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Your order ${orderNumber} has been confirmed. Total: ${currency} ${totalAmount}`,
    });
  }

  async sendOrderShippedEmail(
    email: string,
    orderNumber: string,
    trackingNumber: string,
    carrier: string,
  ): Promise<boolean> {
    const subject = `Your Order Has Been Shipped - ${orderNumber}`;
    const html = this.getOrderShippedTemplate(orderNumber, trackingNumber, carrier);

    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Your order ${orderNumber} has been shipped. Tracking: ${trackingNumber}`,
    });
  }

  async sendOrderDeliveredEmail(email: string, orderNumber: string): Promise<boolean> {
    const subject = `Order Delivered - ${orderNumber}`;
    const html = this.getOrderDeliveredTemplate(orderNumber);

    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Your order ${orderNumber} has been delivered. Thank you for shopping with us!`,
    });
  }

  async sendPasswordChangedEmail(email: string): Promise<boolean> {
    const subject = 'Your Password Has Been Changed';
    const html = this.getPasswordChangedTemplate();

    return this.sendEmail({
      to: email,
      subject,
      html,
      text: 'Your password has been successfully changed.',
    });
  }

  async sendVendorStatusEmail(
    email: string,
    storeName: string,
    status: 'approved' | 'rejected' | 'suspended',
    reason?: string,
  ): Promise<boolean> {
    const subject =
      status === 'approved'
        ? 'Your Vendor Application Approved'
        : status === 'rejected'
          ? 'Your Vendor Application Update'
          : 'Vendor Account Suspended';

    const html = this.getVendorStatusTemplate(storeName, status, reason);

    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Your vendor account status has been updated to ${status}.`,
    });
  }

  private async sendWithSMTP(options: EmailOptions): Promise<boolean> {
    this.logger.log(`[SMTP] Sending email to ${options.to}: ${options.subject}`);

    try {
      const nodemailer = require('nodemailer');

      const host = this.configService.get<string>('mail.smtp.host');
      const port = this.configService.get<number>('mail.smtp.port') || 587;
      const user = this.configService.get<string>('mail.smtp.user');
      const pass = this.configService.get<string>('mail.smtp.pass');
      const secure = this.configService.get<boolean>('mail.smtp.secure') || false;

      if (!host || !user || !pass) {
        this.logger.warn('[SMTP] SMTP not configured, skipping send');
        return false;
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });

      const result = await transporter.sendMail({
        from: options.from || this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`[SMTP] Email sent successfully: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`[SMTP] Failed to send email: ${error.message}`, error);
      return false;
    }
  }

  private async sendWithSendGrid(options: EmailOptions): Promise<boolean> {
    this.logger.log(`[SendGrid] Sending email to ${options.to}: ${options.subject}`);

    try {
      const sgMail = require('@sendgrid/mail');

      const apiKey = this.configService.get<string>('sendgrid.apiKey');

      if (!apiKey) {
        this.logger.warn('[SendGrid] API key not configured, skipping send');
        return false;
      }

      sgMail.setApiKey(apiKey);

      const msg = {
        to: options.to,
        from: options.from || this.fromAddress,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      await sgMail.send(msg);

      this.logger.log('[SendGrid] Email sent successfully');
      return true;
    } catch (error) {
      this.logger.error(`[SendGrid] Failed to send email: ${error.message}`, error);
      return false;
    }
  }

  private async sendWithMailgun(options: EmailOptions): Promise<boolean> {
    this.logger.log(`[Mailgun] Sending email to ${options.to}: ${options.subject}`);

    try {
      const mailgun = require('mailgun.js');

      const apiKey = this.configService.get<string>('mailgun.apiKey');
      const domain = this.configService.get<string>('mailgun.domain');

      if (!apiKey || !domain) {
        this.logger.warn('[Mailgun] API key or domain not configured, skipping send');
        return false;
      }

      const mg = mailgun({ apiKey, domain });

      const data = {
        from: options.from || this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      await mg.messages().send(data);

      this.logger.log('[Mailgun] Email sent successfully');
      return true;
    } catch (error) {
      this.logger.error(`[Mailgun] Failed to send email: ${error.message}`, error);
      return false;
    }
  }


  private async sendWithSES(options: EmailOptions): Promise<boolean> {
    this.logger.log(`[SES] Sending email to ${options.to}: ${options.subject}`);

    try {
      const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

      const region = this.configService.get<string>('aws.region') || 'us-east-1';
      const accessKeyId = this.configService.get<string>('aws.accessKeyId');
      const secretAccessKey = this.configService.get<string>('aws.secretAccessKey');

      if (!accessKeyId || !secretAccessKey) {
        this.logger.warn('[SES] AWS credentials not configured, skipping send');
        return false;
      }

      const client = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const command = new SendEmailCommand({
        Source: options.from || this.fromAddress,
        Destination: {
          ToAddresses: [options.to],
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: options.html,
              Charset: 'UTF-8',
            },
            Text: {
              Data: options.text || '',
              Charset: 'UTF-8',
            },
          },
        },
      });

      await client.send(command);

      this.logger.log('[SES] Email sent successfully');
      return true;
    } catch (error) {
      this.logger.error(`[SES] Failed to send email: ${error.message}`, error);
      return false;
    }
  }

  private getWelcomeTemplate(firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to AhiaGlobal!</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName || 'there'},</h2>
            <p>Welcome to <strong>AhiaGlobal</strong> - your premier multi-vendor marketplace!</p>
            <p>We're excited to have you on board. With AhiaGlobal, you can:</p>
            <ul>
              <li>Browse thousands of products from verified vendors</li>
              <li>Shop with confidence using our secure escrow system</li>
              <li>Track your orders in real-time</li>
              <li>Leave reviews and ratings</li>
            </ul>
            <a href="${
              this.configService.get<string>('app.frontendUrl') || 'https://ahiaglobal.com'
            }/shop" class="button">Start Shopping</a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AhiaGlobal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getOTPTemplate(otp: string, purpose: string): string {
    const purposeText =
      purpose === 'password_reset'
        ? 'reset your password'
        : purpose === 'login'
          ? 'complete your login'
          : 'verify your email address';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background: white; border: 2px dashed #4F46E5; margin: 20px 0; }
          .warning { color: #dc2626; font-size: 14px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verification Code</h1>
          </div>
          <div class="content">
            <p>You requested to ${purposeText}.</p>
            <p>Use the following code to proceed:</p>
            <div class="otp-code">${otp}</div>
            <p class="warning">This code will expire in 10 minutes. Please don't share this code with anyone.</p>
          </div>
          <div class="footer">
            <p>If you didn't request this, please ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} AhiaGlobal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getOrderConfirmationTemplate(
    orderNumber: string,
    totalAmount: number,
    currency: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .order-details { background: white; padding: 15px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
          </div>
          <div class="content">
            <p>Thank you for your order!</p>
            <div class="order-details">
              <p><strong>Order Number:</strong> ${orderNumber}</p>
              <p><strong>Total Amount:</strong> ${currency} ${totalAmount.toFixed(2)}</p>
            </div>
            <p>We'll send you updates as your order is processed and shipped.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AhiaGlobal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getOrderShippedTemplate(
    orderNumber: string,
    trackingNumber: string,
    carrier: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .tracking { background: white; padding: 15px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Shipped!</h1>
          </div>
          <div class="content">
            <p>Great news! Your order has been shipped.</p>
            <div class="tracking">
              <p><strong>Order Number:</strong> ${orderNumber}</p>
              <p><strong>Carrier:</strong> ${carrier}</p>
              <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
            </div>
            <p>Track your package using the tracking number above.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AhiaGlobal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getOrderDeliveredTemplate(orderNumber: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Delivered!</h1>
          </div>
          <div class="content">
            <p>Your order <strong>${orderNumber}</strong> has been delivered!</p>
            <p>We hope you enjoy your purchase. Please take a moment to rate your experience.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AhiaGlobal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordChangedTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Changed</h1>
          </div>
          <div class="content">
            <p>Your password has been successfully changed.</p>
            <p>If you didn't make this change, please contact us immediately.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AhiaGlobal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getVendorStatusTemplate(
    storeName: string,
    status: string,
    reason?: string,
  ): string {
    const statusColor =
      status === 'approved' ? '#10B981' : status === 'rejected' ? '#EF4444' : '#F59E0B';
    const statusText =
      status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Suspended';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .reason { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${statusColor}; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Vendor Status Update</h1>
          </div>
          <div class="content">
            <p>Your vendor application for <strong>${storeName}</strong> has been <strong>${statusText}</strong>.</p>
            ${
              reason
                ? `<div class="reason"><p><strong>Reason:</strong></p><p>${reason}</p></div>`
                : ''
            }
            ${
              status === 'approved'
                ? '<p>You can now start listing products and accepting orders!</p>'
                : ''
            }
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AhiaGlobal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
