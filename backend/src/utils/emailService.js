import nodemailer from 'nodemailer';
import { getEmailTemplate } from './emailTemplates/index.js';
import { logger } from './logger.js';

class EmailService {  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASSWORD || process.env.EMAIL_APP_PASSWORD
      }
    });
  }async sendEmail({ to, template, data = {}, subject, from = process.env.DEFAULT_FROM_EMAIL, attachments = [] }) {
    try {
      // Ensure data is an object
      const templateData = typeof data === 'object' && data !== null ? data : {};
      
      const { html, text } = getEmailTemplate(template, templateData);

      const mailOptions = {
        from,
        to,
        subject,
        html,
        text,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  // Company-specific emails
  async sendCompanyInvitation({ to, companyName, inviterName, actionUrl }) {
    return this.sendEmail({
      to,
      template: 'invitation',
      data: {
        title: `Join ${companyName}`,
        inviterName,
        inviterRole: 'Company Admin',
        message: `${inviterName} has invited you to join ${companyName}`,
        invitationType: 'company',
        actionUrl,
        actionText: 'Accept Invitation'
      },
      subject: `Invitation to join ${companyName}`
    });
  }

  async sendCompanyUpdate({ to, companyName, updateType, message, details }) {
    return this.sendEmail({
      to,
      template: 'notification',
      data: {
        title: `Company Update: ${updateType}`,
        message,
        type: 'update',
        priority: 'normal',
        details,
        category: 'Company Update'
      },
      subject: `${companyName} - ${updateType} Update`
    });
  }

  // Team-specific emails
  async sendTeamInvitation({ to, teamName, inviterName, actionUrl }) {
    return this.sendEmail({
      to,
      template: 'invitation',
      data: {
        title: `Join ${teamName}`,
        inviterName,
        inviterRole: 'Team Leader',
        message: `${inviterName} has invited you to join the ${teamName} team`,
        invitationType: 'team',
        actionUrl,
        actionText: 'Accept Invitation'
      },
      subject: `Invitation to join ${teamName}`
    });
  }

  async sendTeamUpdate({ to, teamName, updateType, message, details }) {
    return this.sendEmail({
      to,
      template: 'notification',
      data: {
        title: `Team Update: ${updateType}`,
        message,
        type: 'update',
        priority: 'normal',
        details,
        category: 'Team Update'
      },
      subject: `${teamName} - ${updateType} Update`
    });
  }

  // Project-specific emails
  async sendProjectAssignment({ to, projectName, assignerName, role, actionUrl }) {
    return this.sendEmail({
      to,
      template: 'notification',
      data: {
        title: `Project Assignment: ${projectName}`,
        message: `${assignerName} has assigned you to the project ${projectName} as ${role}`,
        type: 'info',
        priority: 'high',
        actionUrl,
        actionText: 'View Project'
      },
      subject: `Project Assignment: ${projectName}`
    });
  }

  async sendProjectUpdate({ to, projectName, updateType, message, details, progress }) {
    return this.sendEmail({
      to,
      template: 'projectUpdate',
      data: {
        projectName,
        updateType,
        message,
        details,
        progress,
        status: 'active',
        actionUrl: `/projects/${projectName}`,
        actionText: 'View Project'
      },
      subject: `${projectName} - ${updateType} Update`
    });
  }

  // Task-specific emails
  async sendTaskAssignment({ to, taskTitle, assignerName, dueDate, priority, description }) {
    return this.sendEmail({
      to,
      template: 'taskAssignment',
      data: {
        taskTitle,
        assignerName,
        dueDate,
        priority,
        description,
        actionUrl: `/tasks/${taskTitle}`,
        actionText: 'View Task'
      },
      subject: `New Task Assignment: ${taskTitle}`
    });
  }

  async sendTaskReminder({ to, taskTitle, dueDate, timeRemaining, priority }) {
    return this.sendEmail({
      to,
      template: 'deadlineReminder',
      data: {
        title: taskTitle,
        dueDate,
        timeRemaining,
        priority,
        reminderType: 'upcoming',
        actionUrl: `/tasks/${taskTitle}`,
        actionText: 'View Task'
      },
      subject: `Task Reminder: ${taskTitle}`
    });
  }

  // Meeting-specific emails
  async sendMeetingInvitation({ to, meetingTitle, organizerName, date, time, duration, actionUrl }) {
    return this.sendEmail({
      to,
      template: 'invitation',
      data: {
        title: meetingTitle,
        inviterName: organizerName,
        inviterRole: 'Meeting Organizer',
        message: `${organizerName} has invited you to a meeting`,
        invitationType: 'meeting',
        details: `Date: ${date}\nTime: ${time}\nDuration: ${duration}`,
        actionUrl,
        actionText: 'Join Meeting'
      },
      subject: `Meeting Invitation: ${meetingTitle}`
    });
  }

  async sendMeetingReminder({ to, meetingTitle, date, time, actionUrl }) {
    return this.sendEmail({
      to,
      template: 'notification',
      data: {
        title: `Meeting Reminder: ${meetingTitle}`,
        message: `This is a reminder for your upcoming meeting`,
        type: 'reminder',
        priority: 'high',
        details: `Date: ${date}\nTime: ${time}`,
        actionUrl,
        actionText: 'Join Meeting'
      },
      subject: `Meeting Reminder: ${meetingTitle}`
    });
  }

  // Report-specific emails
  async sendReport({ to, reportTitle, reportType, period, summary, metrics, charts, attachments }) {
    return this.sendEmail({
      to,
      template: 'report',
      data: {
        title: reportTitle,
        reportType,
        period,
        summary,
        metrics,
        charts,
        attachments,
        actionUrl: `/reports/${reportTitle}`,
        actionText: 'View Full Report'
      },
      subject: `${reportType} Report: ${reportTitle}`,
      attachments
    });
  }

  // System-specific emails
  async sendSystemAlert({ to, title, alertType, severity, message, details, affectedSystems }) {
    return this.sendEmail({
      to,
      template: 'systemAlert',
      data: {
        title,
        alertType,
        severity,
        message,
        details,
        affectedSystems,
        actionUrl: '/system/alerts',
        actionText: 'View Details'
      },
      subject: `System Alert: ${title}`
    });
  }

  // User-specific emails
  async sendWelcomeEmail({ to, userName }) {
    return this.sendEmail({
      to,
      template: 'notification',
      data: {
        title: 'Welcome to Our Platform',
        message: `Welcome ${userName}! We're excited to have you on board.`,
        type: 'success',
        priority: 'normal',
        actionUrl: '/dashboard',
        actionText: 'Go to Dashboard'
      },
      subject: 'Welcome to Our Platform'
    });
  }

  async sendPasswordReset({ to, resetUrl }) {
    return this.sendEmail({
      to,
      template: 'notification',
      data: {
        title: 'Password Reset Request',
        message: 'You have requested to reset your password.',
        type: 'warning',
        priority: 'high',
        actionUrl: resetUrl,
        actionText: 'Reset Password'
      },
      subject: 'Password Reset Request'
    });
  }

  async sendEmailVerification({ to, verificationUrl }) {
    return this.sendEmail({
      to,
      template: 'notification',
      data: {
        title: 'Verify Your Email',
        message: 'Please verify your email address to continue.',
        type: 'info',
        priority: 'high',
        actionUrl: verificationUrl,
        actionText: 'Verify Email'
      },
      subject: 'Verify Your Email Address'
    });
  }
}

export const emailService = new EmailService();
