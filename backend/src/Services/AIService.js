const pool = require('../config/db');
const aiConfig = require('../config/ai-config');

/**
 * Service to handle AI-related operations
 */
class AIService {
  /**
   * Get available tokens for a user
   * @param {string} userId - User ID
   */
  async getAvailableTokens(userId) {
    try {
      // Get user's tier
      const userQuery = `
        SELECT tier FROM users WHERE user_id = $1
      `;
      
      const userResult = await pool.query(userQuery, [userId]);
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const tier = userResult.rows[0].tier || 'free';
      
      // Get tokens used today
      const usageQuery = `
        SELECT SUM(tokens_used) as tokens_used
        FROM ai_usage_statistics
        WHERE user_id = $1 AND date = CURRENT_DATE
      `;
      
      const usageResult = await pool.query(usageQuery, [userId]);
      const tokensUsed = parseInt(usageResult.rows[0]?.tokens_used) || 0;
      
      // Calculate tokens left
      const tierLimit = aiConfig.tokenLimits[tier];
      const tokensLeft = tierLimit - tokensUsed;
      
      return {
        tier,
        tierLimit,
        tokensUsed,
        tokensLeft,
        percentage: Math.round((tokensUsed / tierLimit) * 100)
      };
    } catch (error) {
      console.error('Error getting available tokens:', error);
      throw error;
    }
  }

  /**
   * Track token usage for a user
   * @param {string} userId - User ID
   * @param {number} tokensUsed - Number of tokens used
   * @param {number} durationMs - Request duration in milliseconds
   */
  async trackTokenUsage(userId, tokensUsed, durationMs) {
    try {
      // Check if a record exists for today
      const checkQuery = `
        SELECT stat_id 
        FROM ai_usage_statistics
        WHERE user_id = $1 AND date = CURRENT_DATE
      `;
      
      const checkResult = await pool.query(checkQuery, [userId]);
      
      if (checkResult.rows.length === 0) {
        // Create a new record
        await pool.query(
          `INSERT INTO ai_usage_statistics
          (user_id, tokens_used, requests_count, duration_ms)
          VALUES ($1, $2, 1, $3)`,
          [userId, tokensUsed, durationMs]
        );
      } else {
        // Update existing record
        await pool.query(
          `UPDATE ai_usage_statistics
          SET tokens_used = tokens_used + $1,
              requests_count = requests_count + 1,
              duration_ms = duration_ms + $2
          WHERE user_id = $3 AND date = CURRENT_DATE`,
          [tokensUsed, durationMs, userId]
        );
      }
    } catch (error) {
      console.error('Error tracking token usage:', error);
      // Don't throw, just log the error to avoid disrupting user experience
    }
  }

  /**
   * Check if a user is rate limited
   * @param {string} userId - User ID
   */
  async isRateLimited(userId) {
    try {
      // Get user's tier
      const userQuery = `
        SELECT tier FROM users WHERE user_id = $1
      `;
      
      const userResult = await pool.query(userQuery, [userId]);
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const tier = userResult.rows[0].tier || 'free';
      
      // Get requests made in the last minute
      const requestsQuery = `
        SELECT COUNT(*) as recent_requests
        FROM ai_interactions i
        JOIN ai_assistance_sessions s ON i.session_id = s.session_id
        WHERE s.user_id = $1 AND i.created_at > NOW() - INTERVAL '1 minute'
      `;
      
      const requestsResult = await pool.query(requestsQuery, [userId]);
      const recentRequests = parseInt(requestsResult.rows[0]?.recent_requests) || 0;
      
      // Check if user is rate limited
      const rateLimit = aiConfig.requestRateLimits[tier];
      const isLimited = recentRequests >= rateLimit;
      
      return {
        isLimited,
        limit: rateLimit,
        current: recentRequests,
        resetInSeconds: isLimited ? 60 - Math.floor((Date.now() / 1000) % 60) : 0
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // If there's an error, default to not rate limited
      return { isLimited: false };
    }
  }

  /**
   * Generate a text completion with simulated AI
   * @param {string} prompt - The prompt to complete
   * @param {Object} options - Configuration options
   */
  async generateCompletion(prompt, options = {}) {
    // Simulate API call timing
    const startTime = Date.now();
    
    // In a real implementation, we would call an actual AI service here
    // For now, simulate a response based on keywords in the prompt
    const response = this.simulateAIResponse(prompt, options.context || '');
    
    // Simulate token counting
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(response.length / 4);
    const totalTokens = inputTokens + outputTokens;
    
    // Calculate processing time
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    return {
      text: response,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens,
        processingTimeMs: processingTime
      }
    };
  }

  /**
   * Simulate an AI response based on the prompt content
   * @private
   */
  simulateAIResponse(prompt, context) {
    const promptLower = prompt.toLowerCase();
    
    // Project management responses
    if (promptLower.includes('project plan') || promptLower.includes('timeline')) {
      return `Based on my analysis, I recommend the following project plan:

1. **Discovery Phase** (2 weeks)
   - Requirements gathering
   - Stakeholder interviews
   - Initial documentation

2. **Design Phase** (3 weeks)
   - UX/UI design
   - Architecture planning
   - Technical specifications

3. **Development Phase** (8 weeks)
   - Backend implementation
   - Frontend development
   - Integration work

4. **Testing Phase** (2 weeks)
   - QA testing
   - User acceptance testing
   - Performance testing

5. **Deployment Phase** (1 week)
   - Final preparations
   - Launch
   - Post-launch monitoring

This timeline assumes a team size of 5-7 people with appropriate skill distribution.`;
    }
    
    // Task management responses
    if (promptLower.includes('task') || promptLower.includes('todo')) {
      return `For effective task management, I recommend:

- Breaking down complex tasks into smaller, manageable subtasks
- Setting clear priorities (High, Medium, Low)
- Establishing realistic deadlines
- Assigning clear ownership
- Adding detailed acceptance criteria

For your current workload, consider using the Eisenhower Matrix to prioritize:
1. Important & Urgent: Do immediately
2. Important & Not Urgent: Schedule time
3. Not Important & Urgent: Delegate if possible
4. Not Important & Not Urgent: Eliminate

This approach will help maintain focus on high-impact activities.`;
    }
    
    // Performance analysis response
    if (promptLower.includes('performance') || promptLower.includes('productivity')) {
      return `Based on the team performance data:

- Current productivity is 7.4/10 (12% above average)
- Task completion rate: 87% (Good)
- Average delay: 1.3 days (Needs improvement)
- Knowledge sharing score: 6/10 (Below target)

Recommendations:
1. Implement structured knowledge sharing sessions (weekly)
2. Review estimation process to reduce delays
3. Create a "lessons learned" document after each sprint
4. Consider additional training in [relevant technology]

These changes could potentially improve overall productivity by 15-20% in the next quarter.`;
    }
    
    // Report template response
    if (promptLower.includes('report') || promptLower.includes('template')) {
      return `Here's a recommended structure for your report:

## Project Status Report

### Executive Summary
[Brief 2-3 sentence overview of project status]

### Key Metrics
- Timeline: [On track/Behind/Ahead]
- Budget: [Under/Over/On budget]
- Scope: [Unchanged/Expanded/Reduced]
- Current Phase: [Discovery/Design/Development/Testing/Deployment]
- Completion: [XX%]

### Accomplishments This Period
- [Major milestone 1]
- [Major milestone 2]
- [Major milestone 3]

### Challenges & Risks
- [Challenge 1] - Mitigation: [Strategy]
- [Challenge 2] - Mitigation: [Strategy]

### Next Steps
- [Upcoming milestone 1]
- [Upcoming milestone 2]

### Resource Needs
- [Additional resource requests]

### Additional Notes
[Any other relevant information]`;
    }
    
    // Default response
    return `I've analyzed your request about "${prompt.substring(0, 30)}...".

Based on my assessment, here are some considerations:

1. Make sure your objectives are clearly defined
2. Consider breaking down complex elements into smaller manageable parts
3. Apply appropriate methodologies based on your team's experience
4. Establish clear metrics to measure success
5. Set up regular review points to ensure you're on track

Would you like me to elaborate on any of these points or provide more specific guidance?`;
  }
}

module.exports = new AIService();
