import { alertTemplate } from './alertTemplate.js';
import { congratulationTemplate } from './congratulationTemplate.js';
import { warningTemplate } from './warningTemplate.js';
import { notificationTemplate } from './notificationTemplate.js';
import { invitationTemplate } from './invitationTemplate.js';
import { taskAssignmentTemplate } from './taskAssignmentTemplate.js';
import { projectUpdateTemplate } from './projectUpdateTemplate.js';
import { deadlineReminderTemplate } from './deadlineReminderTemplate.js';
import { reportTemplate } from './reportTemplate.js';
import { systemAlertTemplate } from './systemAlertTemplate.js';

export const emailTemplates = {
  alert: alertTemplate,
  congratulation: congratulationTemplate,
  warning: warningTemplate,
  notification: notificationTemplate,
  invitation: invitationTemplate,
  taskAssignment: taskAssignmentTemplate,
  projectUpdate: projectUpdateTemplate,
  deadlineReminder: deadlineReminderTemplate,
  report: reportTemplate,
  systemAlert: systemAlertTemplate
};

export const getEmailTemplate = (type, data) => {
  const template = emailTemplates[type];
  if (!template) {
    throw new Error(`Email template type '${type}' not found`);
  }
  return template(data);
};