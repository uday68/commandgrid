/**
 * AI Service Configuration
 */
module.exports = {
  // Default model to use
  defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-3.5-turbo',
  
  // API keys for different providers
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY
    }
  },
  
  // Token limits per user tier
  tokenLimits: {
    free: 10000,
    basic: 100000,
    premium: 500000,
    enterprise: 2000000
  },
  
  // Request limits per minute
  requestRateLimits: {
    free: 10,
    basic: 30,
    premium: 60,
    enterprise: 120
  },
  
  // Features enabled for each model
  modelCapabilities: {
    'gpt-3.5-turbo': [
      'project_assistance',
      'task_analysis',
      'meeting_summaries',
      'code_reviews'
    ],
    'gpt-4': [
      'project_assistance',
      'task_analysis',
      'meeting_summaries',
      'code_reviews',
      'complex_planning',
      'advanced_recommendations'
    ]
  },
  
  // Context window sizes for different models (in tokens)
  contextWindows: {
    'gpt-3.5-turbo': 4096,
    'gpt-4': 8192,
    'claude-2': 100000
  },
  
  // Prompt templates for different use cases
  promptTemplates: {
    taskAnalysis: `
      Analyze the following task details:
      
      Title: {{title}}
      Description: {{description}}
      Due date: {{due_date}}
      Priority: {{priority}}
      
      Provide an analysis of task complexity, estimated time requirements, 
      potential challenges, and recommendations for effective completion.
    `,
    
    projectRecommendations: `
      Based on the following project details:
      
      Project: {{project_name}}
      Status: {{status}}
      Team size: {{team_size}}
      Deadline: {{deadline}}
      Current progress: {{progress}}%
      
      Provide strategic recommendations to improve project outcomes, 
      identify potential issues, and suggest process improvements.
    `,
    
    meetingSummary: `
      Summarize the following meeting transcript:
      
      {{transcript}}
      
      Include key points, action items, decisions made, and participants 
      with their responsibilities.
    `
  }
};
