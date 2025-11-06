const { OpenAI } = require('openai');
const pool = require('../config/database');
const integrationService = require('./integrationService');
const projectService = require('./projectService');

class AIAssistantService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async createSession(userId, context = {}) {
    try {
      // Get user's active projects and integrations
      const [projects, integrations] = await Promise.all([
        projectService.getUserProjects(userId),
        integrationService.getIntegrations(userId)
      ]);

      // Enhance context with project and integration data
      const enhancedContext = {
        ...context,        projects: projects.map(p => ({
          id: p.project_id,
          name: p.name,
          status: p.status,
          type: p.type
        })),
        integrations: integrations.map(i => ({
          name: i.name,
          type: i.type,
          status: i.status
        }))
      };

      const query = `
        INSERT INTO ai_assistant_sessions (user_id, context, status)
        VALUES ($1, $2, 'active')
        RETURNING *
      `;
      const result = await pool.query(query, [userId, JSON.stringify(enhancedContext)]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating AI assistant session:', error);
      throw error;
    }
  }

  async getSessionHistory(sessionId) {
    try {
      const query = `
        SELECT * FROM ai_assistant_messages
        WHERE session_id = $1
        ORDER BY created_at ASC
      `;
      const result = await pool.query(query, [sessionId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting session history:', error);
      throw error;
    }
  }

  async processUserInput(sessionId, userId, input, context = {}) {
    try {
      const history = await this.getSessionHistory(sessionId);
      const userProfile = await this.getUserProfile(userId);
      const messages = this.prepareConversationHistory(history, userProfile);
      
      // Add current user input with enhanced context
      messages.push({ 
        role: 'user', 
        content: this.enhanceUserInput(input, context)
      });

      // Get AI response with increased token limit for more detailed responses
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });

      const aiResponse = response.choices[0].message.content;
      await this.saveInteraction(sessionId, input, aiResponse);

      // Process response for actionable items and context
      const processedResponse = await this.processAIResponse(aiResponse, context, userProfile);

      // Generate follow-up suggestions based on the conversation
      const followUps = await this.generateFollowUpSuggestions(processedResponse, context);

      return {
        response: processedResponse.response,
        suggestions: processedResponse.suggestions,
        nextSteps: processedResponse.nextSteps,
        followUps,
        context: processedResponse.context
      };
    } catch (error) {
      console.error('Error processing user input:', error);
      throw error;
    }
  }

  enhanceUserInput(input, context) {
    // Add context-aware enhancements to user input
    let enhancedInput = input;

    if (context.projectId) {
      enhancedInput += ` [Project Context: ${context.projectId}]`;
    }

    if (context.integrationType) {
      enhancedInput += ` [Integration Context: ${context.integrationType}]`;
    }

    return enhancedInput;
  }

  async getUserProfile(userId) {
    try {
      const query = `
        SELECT u.*, 
               array_agg(DISTINCT r.name) as roles,
               array_agg(DISTINCT i.name) as integrations
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        LEFT JOIN user_integrations ui ON u.id = ui.user_id
        LEFT JOIN integrations i ON ui.integration_id = i.id
        WHERE u.id = $1
        GROUP BY u.id
      `;
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  prepareConversationHistory(history, userProfile) {
    const messages = [
      {
        role: 'system',
        content: `You are an AI assistant for a project management tool. The user has the following profile:
          Roles: ${userProfile.roles.join(', ')}
          Active Integrations: ${userProfile.integrations.join(', ')}
          Experience Level: ${userProfile.experience_level || 'Not specified'}
          
          Your role is to:
          1. Understand user needs and provide personalized recommendations
          2. Guide users through project setup and tool selection
          3. Suggest best practices based on user's role and context
          4. Help users maximize the value of their integrations
          5. Provide step-by-step guidance for complex tasks
          
          Always maintain a professional yet friendly tone.`
      }
    ];

    history.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    return messages;
  }

  async saveInteraction(sessionId, userInput, aiResponse) {
    try {
      const query = `
        INSERT INTO ai_assistant_messages (session_id, role, content)
        VALUES ($1, 'user', $2), ($1, 'assistant', $3)
      `;
      await pool.query(query, [sessionId, userInput, aiResponse]);
    } catch (error) {
      console.error('Error saving interaction:', error);
      throw error;
    }
  }

  async processAIResponse(response, context, userProfile) {
    // Extract structured information from AI response
    const suggestions = this.extractSuggestions(response);
    const nextSteps = this.extractNextSteps(response);
    const extractedContext = this.extractContext(response);

    // Analyze response for integration opportunities
    const integrationOpportunities = await this.analyzeIntegrationOpportunities(
      response,
      userProfile.integrations
    );

    // Generate code snippets if relevant
    const codeSnippets = this.extractCodeSnippets(response);

    // Identify potential automations
    const automations = this.identifyAutomations(response, context);

    return {
      response,
      suggestions: [...suggestions, ...integrationOpportunities.suggestions],
      nextSteps: [...nextSteps, ...integrationOpportunities.nextSteps],
      context: {
        ...extractedContext,
        codeSnippets,
        automations
      }
    };
  }

  extractSuggestions(response) {
    const suggestions = [];
    const suggestionPatterns = [
      /Consider using (.*?)(?:\.|$)/g,
      /You might want to (.*?)(?:\.|$)/g,
      /I recommend (.*?)(?:\.|$)/g
    ];

    suggestionPatterns.forEach(pattern => {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        suggestions.push(match[1].trim());
      }
    });

    return suggestions;
  }

  extractNextSteps(response) {
    const nextSteps = [];
    const stepPatterns = [
      /Next, (.*?)(?:\.|$)/g,
      /Then, (.*?)(?:\.|$)/g,
      /After that, (.*?)(?:\.|$)/g
    ];

    stepPatterns.forEach(pattern => {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        nextSteps.push(match[1].trim());
      }
    });

    return nextSteps;
  }

  extractContext(response) {
    const context = {
      topics: [],
      entities: [],
      actions: []
    };

    // Extract topics
    const topicPattern = /(?:discussing|about|regarding) (.*?)(?:\.|$)/g;
    const topicMatches = response.matchAll(topicPattern);
    for (const match of topicMatches) {
      context.topics.push(match[1].trim());
    }

    // Extract entities (tools, projects, etc.)
    const entityPattern = /(?:using|with|in) (.*?)(?:\.|$)/g;
    const entityMatches = response.matchAll(entityPattern);
    for (const match of entityMatches) {
      context.entities.push(match[1].trim());
    }

    // Extract actions
    const actionPattern = /(?:to|for) (.*?)(?:\.|$)/g;
    const actionMatches = response.matchAll(actionPattern);
    for (const match of actionMatches) {
      context.actions.push(match[1].trim());
    }

    return context;
  }

  async analyzeIntegrationOpportunities(response, activeIntegrations) {
    const opportunities = {
      suggestions: [],
      nextSteps: []
    };

    // Analyze response for potential integration points
    const integrationPatterns = {
      slack: /(?:message|notify|alert|channel|workspace)/gi,
      github: /(?:repository|commit|pull request|issue|branch)/gi,
      jira: /(?:ticket|sprint|board|project|issue)/gi,
      trello: /(?:board|card|list|checklist)/gi
    };

    for (const [integration, pattern] of Object.entries(integrationPatterns)) {
      if (pattern.test(response) && !activeIntegrations.includes(integration)) {
        opportunities.suggestions.push(
          `Consider integrating ${integration} for better workflow management`
        );
        opportunities.nextSteps.push(
          `Set up ${integration} integration in your project settings`
        );
      }
    }

    return opportunities;
  }

  extractCodeSnippets(response) {
    const codeSnippets = [];
    const codePattern = /```(\w+)?\n([\s\S]*?)```/g;
    const matches = response.matchAll(codePattern);

    for (const match of matches) {
      codeSnippets.push({
        language: match[1] || 'plaintext',
        code: match[2].trim()
      });
    }

    return codeSnippets;
  }

  identifyAutomations(response, context) {
    const automations = [];
    const automationPatterns = [
      /(?:automate|schedule|trigger) (.*?)(?:\.|$)/g,
      /(?:set up|create) (?:an|a) (?:automated|scheduled) (.*?)(?:\.|$)/g
    ];

    automationPatterns.forEach(pattern => {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        automations.push({
          description: match[1].trim(),
          context: context
        });
      }
    });

    return automations;
  }

  async generateFollowUpSuggestions(processedResponse, context) {
    const followUps = [];

    // Generate follow-up questions based on the response
    if (processedResponse.suggestions.length > 0) {
      followUps.push({
        type: 'suggestion',
        question: 'Would you like me to explain any of these suggestions in more detail?'
      });
    }

    if (processedResponse.nextSteps.length > 0) {
      followUps.push({
        type: 'next_step',
        question: 'Would you like help implementing any of these next steps?'
      });
    }

    if (processedResponse.context.codeSnippets.length > 0) {
      followUps.push({
        type: 'code',
        question: 'Would you like me to explain the code snippets or help you implement them?'
      });
    }

    if (processedResponse.context.automations.length > 0) {
      followUps.push({
        type: 'automation',
        question: 'Would you like help setting up any of these automations?'
      });
    }

    return followUps;
  }

  async getPersonalizedRecommendations(userId, context) {
    try {
      const userProfile = await this.getUserProfile(userId);
      const messages = [
        {
          role: 'system',
          content: `Generate personalized recommendations for a user with:
            Roles: ${userProfile.roles.join(', ')}
            Active Integrations: ${userProfile.integrations.join(', ')}
            Experience Level: ${userProfile.experience_level || 'Not specified'}
            Context: ${JSON.stringify(context)}
            
            Consider:
            1. User's role and experience level
            2. Current project context
            3. Active integrations
            4. Common pain points for their role
            5. Best practices for their specific situation
            6. Potential automation opportunities
            7. Integration optimization suggestions`
        }
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      });

      return this.processRecommendations(response.choices[0].message.content);
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      throw error;
    }
  }

  processRecommendations(recommendations) {
    return {
      tools: this.extractToolRecommendations(recommendations),
      practices: this.extractBestPractices(recommendations),
      integrations: this.extractIntegrationSuggestions(recommendations),
      automations: this.extractAutomationSuggestions(recommendations)
    };
  }

  extractToolRecommendations(recommendations) {
    const tools = [];
    const toolPattern = /(?:tool|feature|functionality): (.*?)(?:\.|$)/g;
    const matches = recommendations.matchAll(toolPattern);

    for (const match of matches) {
      const [name, description] = match[1].split(' - ');
      tools.push({
        name: name.trim(),
        description: description ? description.trim() : 'No description provided'
      });
    }

    return tools;
  }

  extractBestPractices(recommendations) {
    const practices = [];
    const practicePattern = /(?:practice|recommendation): (.*?)(?:\.|$)/g;
    const matches = recommendations.matchAll(practicePattern);

    for (const match of matches) {
      practices.push(match[1].trim());
    }

    return practices;
  }

  extractIntegrationSuggestions(recommendations) {
    const integrations = [];
    const integrationPattern = /(?:integration|connect): (.*?)(?:\.|$)/g;
    const matches = recommendations.matchAll(integrationPattern);

    for (const match of matches) {
      const [name, description] = match[1].split(' - ');
      integrations.push({
        name: name.trim(),
        description: description ? description.trim() : 'No description provided'
      });
    }

    return integrations;
  }

  extractAutomationSuggestions(recommendations) {
    const automations = [];
    const automationPattern = /(?:automate|automation): (.*?)(?:\.|$)/g;
    const matches = recommendations.matchAll(automationPattern);

    for (const match of matches) {
      const [name, description] = match[1].split(' - ');
      automations.push({
        name: name.trim(),
        description: description ? description.trim() : 'No description provided'
      });
    }

    return automations;
  }
}

module.exports = new AIAssistantService(); 