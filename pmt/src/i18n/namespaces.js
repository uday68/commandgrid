/**
 * All available translation namespaces
 * Used to organize translations by feature area
 */
export const namespaces = {
  translation: 'translation',
  common: 'common',
  components: 'components',
  pages: 'pages',
  admin: 'admin',
  errors: 'errors',
  features: 'features',
  home: 'home',
  chatRoom: 'chatRoom',
  profile: 'profile',
  registration: 'registration',
  validation: 'validation',
  docs: 'docs',
  images: 'images',
  meetings: 'meetings',
  team: 'team',
  projects: 'projects',
  activities: 'activities'
};

/**
 * Namespaces grouped by feature area
 * Used to load related namespaces together
 */
export const namespaceGroups = {
  auth: [namespaces.translation, namespaces.common, namespaces.validation, namespaces.registration],
  dashboard: [namespaces.translation, namespaces.common, namespaces.pages, namespaces.admin, namespaces.projects],
  profile: [namespaces.translation, namespaces.common, namespaces.profile],
  chat: [namespaces.translation, namespaces.common, namespaces.chatRoom],
};
