import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

/**
 * Controller for AI features
 */
class AIController {
  /**
   * Create a new AI assistance session
   */
  async createSession(req, res) {
    try {
      const { context, prompt } = req.body;
      const userId = req.user.userId;
      
      if (!context || !prompt) {
        return res.status(400).json({ error: 'Context and prompt are required' });
      }
      
      // Create a new AI assistance session
      const sessionQuery = `
        INSERT INTO ai_assistance_sessions 
        (user_id, context, initial_prompt, status, model_version)
        VALUES ($1, $2, $3, 'active', $4)
        RETURNING *
      `;
      
      const sessionValues = [
        userId,
        context,
        prompt,
        process.env.AI_MODEL_VERSION || 'gpt-3.5-turbo'
      ];
      
      const sessionResult = await pool.query(sessionQuery, sessionValues);
      const session = sessionResult.rows[0];
      
      // In a real implementation, we would call an actual AI service
      // For now, we'll simulate an AI response
      const aiResponse = await this.simulateAIResponse(prompt, context);
      
      // Log the interaction
      const interactionQuery = `
        INSERT INTO ai_interactions
        (session_id, user_message, ai_response, context_data)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const interactionValues = [
        session.session_id,
        prompt,
        aiResponse,
        JSON.stringify({ source: 'initial_prompt' })
      ];
      
      const interactionResult = await pool.query(interactionQuery, interactionValues);
      
      res.status(201).json({
        session,
        interaction: interactionResult.rows[0]
      });
    } catch (error) {
      console.error('Error creating AI session:', error);
      res.status(500).json({ error: 'Failed to create AI session' });
    }
  }

  /**
   * Send a message to an existing AI session
   */
  async sendMessage(req, res) {
    try {
      const { sessionId } = req.params;
      const { message, contextData } = req.body;
      const userId = req.user.userId;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      // Verify session exists and belongs to user
      const sessionQuery = `
        SELECT * FROM ai_assistance_sessions 
        WHERE session_id = $1 AND user_id = $2
      `;
      
      const sessionResult = await pool.query(sessionQuery, [sessionId, userId]);
      
      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: 'AI session not found' });
      }
      
      // Get session context
      const session = sessionResult.rows[0];
      
      // Get previous interactions for context
      const historyQuery = `
        SELECT user_message, ai_response 
        FROM ai_interactions 
        WHERE session_id = $1 
        ORDER BY created_at ASC
      `;
      
      const historyResult = await pool.query(historyQuery, [sessionId]);
      
      // Build context from previous interactions
      const context = {
        sessionContext: session.context,
        history: historyResult.rows,
        additionalContext: contextData || {}
      };
      
      // In a real implementation, we would call an AI service with the context
      // For now, we'll simulate an AI response
      const aiResponse = await this.simulateAIResponse(message, session.context);
      
      // Calculate token usage (simulated)
      const tokensUsed = Math.floor(Math.random() * 500) + 100;
      
      // Log the interaction
      const interactionQuery = `
        INSERT INTO ai_interactions
        (session_id, user_message, ai_response, context_data, tokens_used)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const interactionValues = [
        sessionId,
        message,
        aiResponse,
        JSON.stringify(contextData || {}),
        tokensUsed
      ];
      
      const interactionResult = await pool.query(interactionQuery, interactionValues);
      
      res.json({
        interaction: interactionResult.rows[0],
        tokenInfo: {
          used: tokensUsed,
          remaining: 10000 - tokensUsed
        }
      });
    } catch (error) {
      console.error('Error sending AI message:', error);
      res.status(500).json({ error: 'Failed to process AI message' });
    }
  }

  /**
   * Get all AI sessions for a user
   */
  async getSessions(req, res) {
    try {
      const userId = req.user.userId;
      
      const sessionsQuery = `
        SELECT s.*, 
        COUNT(i.interaction_id) as interaction_count,
        MAX(i.created_at) as last_interaction
        FROM ai_assistance_sessions s
        LEFT JOIN ai_interactions i ON s.session_id = i.session_id
        WHERE s.user_id = $1
        GROUP BY s.session_id
        ORDER BY last_interaction DESC NULLS LAST
      `;
      
      const result = await pool.query(sessionsQuery, [userId]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching AI sessions:', error);
      res.status(500).json({ error: 'Failed to fetch AI sessions' });
    }
  }

  /**
   * Get a specific AI session with its interactions
   */
  async getSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.userId;
      
      // Get session details
      const sessionQuery = `
        SELECT * FROM ai_assistance_sessions 
        WHERE session_id = $1 AND user_id = $2
      `;
      
      const sessionResult = await pool.query(sessionQuery, [sessionId, userId]);
      
      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: 'AI session not found' });
      }
      
      // Get interactions
      const interactionsQuery = `
        SELECT * FROM ai_interactions 
        WHERE session_id = $1 
        ORDER BY created_at ASC
      `;
      
      const interactionsResult = await pool.query(interactionsQuery, [sessionId]);
      
      res.json({
        session: sessionResult.rows[0],
        interactions: interactionsResult.rows
      });
    } catch (error) {
      console.error('Error fetching AI session:', error);
      res.status(500).json({ error: 'Failed to fetch AI session' });
    }
  }

  /**
   * Close an AI session
   */
  async closeSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.userId;
      
      const updateQuery = `
        UPDATE ai_assistance_sessions 
        SET status = 'closed', closed_at = NOW() 
        WHERE session_id = $1 AND user_id = $2
        RETURNING *
      `;
      
      const result = await pool.query(updateQuery, [sessionId, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'AI session not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error closing AI session:', error);
      res.status(500).json({ error: 'Failed to close AI session' });
    }
  }

  /**
   * Submit feedback for an AI interaction
   */
  async submitFeedback(req, res) {
    try {
      const { interactionId, rating, comments, correctedResponse } = req.body;
      const userId = req.user.userId;
      
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
      }
      
      // First, update the rating in the interaction record
      await pool.query(
        'UPDATE ai_interactions SET feedback_score = $1 WHERE interaction_id = $2',
        [rating, interactionId]
      );
      
      // Then, insert detailed feedback
      const feedbackQuery = `
        INSERT INTO ai_feedback
        (user_id, interaction_id, rating, comments, corrected_response)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const feedbackValues = [
        userId,
        interactionId,
        rating,
        comments,
        correctedResponse
      ];
      
      const result = await pool.query(feedbackQuery, feedbackValues);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error submitting AI feedback:', error);
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  }

  /**
   * Get AI recommendations for a user
   */
  async getRecommendations(req, res) {
    try {
      const userId = req.user.userId;
      
      const recommendationsQuery = `
        SELECT * FROM ai_recommendations
        WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
      `;
      
      const result = await pool.query(recommendationsQuery, [userId]);
      
      // If we have no recommendations, create some sample ones for demo
      if (result.rows.length === 0) {
        const sampleRecommendations = await this.createSampleRecommendations(userId);
        return res.json(sampleRecommendations);
      }
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  }

  /**
   * Update AI recommendation status (viewed/acted upon)
   */
  async updateRecommendationStatus(req, res) {
    try {
      const { recommendationId } = req.params;
      const { viewed, actedUpon } = req.body;
      const userId = req.user.userId;
      
      const updateFields = [];
      const values = [recommendationId, userId];
      let paramCount = 3;
      
      if (viewed !== undefined) {
        updateFields.push(`viewed = $${paramCount++}`);
        values.push(viewed);
      }
      
      if (actedUpon !== undefined) {
        updateFields.push(`acted_upon = $${paramCount++}`);
        values.push(actedUpon);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      const updateQuery = `
        UPDATE ai_recommendations
        SET ${updateFields.join(', ')}
        WHERE recommendation_id = $1 AND user_id = $2
        RETURNING *
      `;
      
      const result = await pool.query(updateQuery, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Recommendation not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating recommendation status:', error);
      res.status(500).json({ error: 'Failed to update recommendation status' });
    }
  }

  /**
   * Analyze a task using AI
   */
  async analyzeTask(req, res) {
    try {
      const { taskId } = req.params;
      const userId = req.user.userId;
      
      // Get task details
      const taskQuery = `
        SELECT t.*, p.name AS project_name, u.name AS assigned_user_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.project_id
        LEFT JOIN users u ON t.assigned_to = u.user_id
        WHERE t.task_id = $1
      `;
      
      const taskResult = await pool.query(taskQuery, [taskId]);
      
      if (taskResult.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const task = taskResult.rows[0];
      
      // Get task comments
      const commentsQuery = `
        SELECT tc.*, u.name AS user_name
        FROM task_comments tc
        JOIN users u ON tc.user_id = u.user_id
        WHERE tc.task_id = $1
        ORDER BY tc.created_at ASC
      `;
      
      const commentsResult = await pool.query(commentsQuery, [taskId]);
      
      // Get subtasks
      const subtasksQuery = `
        SELECT * FROM subtasks WHERE parent_task_id = $1
      `;
      
      const subtasksResult = await pool.query(subtasksQuery, [taskId]);
      
      // Prepare complete task context
      const taskContext = {
        task,
        comments: commentsResult.rows,
        subtasks: subtasksResult.rows
      };
      
      // In a real implementation, call an AI service with the task context
      // For now, simulate an analysis
      const analysis = await this.simulateTaskAnalysis(taskContext);
      
      // Record the analysis in the AI recommendations table
      const recommendationQuery = `
        INSERT INTO ai_recommendations
        (user_id, recommendation_type, content, related_entity_type, related_entity_id, confidence_score)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const recommendationValues = [
        userId,
        'task_analysis',
        JSON.stringify(analysis),
        'task',
        taskId,
        0.85
      ];
      
      await pool.query(recommendationQuery, recommendationValues);
      
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing task:', error);
      res.status(500).json({ error: 'Failed to analyze task' });
    }
  }

  /**
   * Get AI analytics data
   */
  async getAnalytics(req, res) {
    try {
      const userId = req.user.userId;
      const timeRange = req.query.timeRange || 'month';
      
      let timeFilter;
      switch (timeRange) {
        case 'week':
          timeFilter = 'INTERVAL \'7 days\'';
          break;
        case 'year':
          timeFilter = 'INTERVAL \'1 year\'';
          break;
        case 'month':
        default:
          timeFilter = 'INTERVAL \'30 days\'';
          break;
      }
      
      // Get interaction stats
      const statsQuery = `
        SELECT 
          COUNT(*) as total_interactions,
          COUNT(DISTINCT session_id) as total_sessions,
          AVG(COALESCE(feedback_score, 0)) as avg_rating,
          SUM(tokens_used) as tokens_used
        FROM ai_interactions i
        JOIN ai_assistance_sessions s ON i.session_id = s.session_id
        WHERE s.user_id = $1
        AND i.created_at > NOW() - ${timeFilter}
      `;
      
      const statsResult = await pool.query(statsQuery, [userId]);
      const stats = statsResult.rows[0];
      
      // Get recommendation stats
      const recQuery = `
        SELECT 
          COUNT(*) as total_recommendations,
          SUM(CASE WHEN viewed THEN 1 ELSE 0 END) as viewed_count,
          SUM(CASE WHEN acted_upon THEN 1 ELSE 0 END) as acted_upon_count
        FROM ai_recommendations
        WHERE user_id = $1
        AND created_at > NOW() - ${timeFilter}
      `;
      
      const recResult = await pool.query(recQuery, [userId]);
      const recommendations = recResult.rows[0];
      
      // Get daily usage trend
      const trendQuery = `
        SELECT 
          DATE_TRUNC('day', i.created_at) as date,
          COUNT(*) as interactions_count
        FROM ai_interactions i
        JOIN ai_assistance_sessions s ON i.session_id = s.session_id
        WHERE s.user_id = $1
        AND i.created_at > NOW() - ${timeFilter}
        GROUP BY DATE_TRUNC('day', i.created_at)
        ORDER BY date
      `;
      
      const trendResult = await pool.query(trendQuery, [userId]);
      
      res.json({
        usage: {
          totalInteractions: parseInt(stats.total_interactions) || 0,
          totalSessions: parseInt(stats.total_sessions) || 0,
          avgRating: parseFloat(stats.avg_rating) || 0,
          tokensUsed: parseInt(stats.tokens_used) || 0
        },
        recommendations: {
          total: parseInt(recommendations.total_recommendations) || 0,
          viewed: parseInt(recommendations.viewed_count) || 0,
          actedUpon: parseInt(recommendations.acted_upon_count) || 0,
          conversionRate: recommendations.total_recommendations > 0 
            ? (recommendations.acted_upon_count / recommendations.total_recommendations * 100).toFixed(2) 
            : 0
        },
        trend: trendResult.rows.map(row => ({
          date: row.date,
          count: parseInt(row.interactions_count)
        }))
      });
    } catch (error) {
      console.error('Error fetching AI analytics:', error);
      res.status(500).json({ error: 'Failed to fetch AI analytics' });
    }
  }

  /**
   * Generate a report using AI
   */
  async generateReportContent(req, res) {
    try {
      const { reportType, parameters } = req.body;
      const userId = req.user.userId;
      
      if (!reportType || !parameters) {
        return res.status(400).json({ error: 'Report type and parameters are required' });
      }
      
      // In a real implementation, we would call an AI service
      // For now, we'll simulate a generated report
      const report = await this.simulateReportGeneration(reportType, parameters);
      
      // Log the report generation
      await pool.query(
        `INSERT INTO ai_recommendations
         (user_id, recommendation_type, content, related_entity_type, confidence_score)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'report_content', JSON.stringify(report), reportType, 0.9]
      );
      
      res.json(report);
    } catch (error) {
      console.error('Error generating report content:', error);
      res.status(500).json({ error: 'Failed to generate report content' });
    }
  }

  /**
   * Helper: Simulate AI response
   * @private
   */
  async simulateAIResponse(prompt, context) {
    // Simulated AI response logic
    const responses = {
      'project': `Based on the project context, I recommend focusing on the critical path items first. 
                Consider breaking down the larger tasks into smaller, manageable subtasks.`,
      'task': `This task looks complex. Consider the following approach:
               1. Start by gathering all requirements
               2. Create a detailed implementation plan
               3. Break it into subtasks for easier management`,
      'analysis': `My analysis shows this needs more detailed requirements. 
                  The timeline seems optimistic given the complexity.`,
      'recommendation': `I recommend adding at least one more team member with backend expertise to this project.
                        The current team composition may struggle with the database optimization tasks.`,
      'default': `I've analyzed your request. Please provide more specific information about what you need assistance with.
                 I can help with project planning, task analysis, or technical recommendations.`
    };
    
    // Add a delay to simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return relevant response based on context, or default if no match
    const contextLower = (context || '').toLowerCase();
    if (contextLower.includes('project')) return responses.project;
    if (contextLower.includes('task')) return responses.task;
    if (contextLower.includes('analysis')) return responses.analysis;
    if (contextLower.includes('recommendation')) return responses.recommendation;
    return responses.default;
  }

  /**
   * Helper: Simulate task analysis
   * @private
   */
  async simulateTaskAnalysis(taskContext) {
    // Add a delay to simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      complexity: Math.floor(Math.random() * 100),
      estimated_hours: Math.floor(Math.random() * 40) + 5,
      risk_factors: [
        "Dependency on external API",
        "Tight deadline",
        "New technology stack"
      ],
      recommendations: [
        "Break down into smaller subtasks",
        "Address API integration first",
        "Schedule additional review meetings"
      ],
      similar_tasks: [
        { id: uuidv4(), title: "Similar past task 1" },
        { id: uuidv4(), title: "Similar past task 2" }
      ]
    };
  }

  /**
   * Helper: Create sample recommendations for demo purposes
   * @private
   */
  async createSampleRecommendations(userId) {
    const samples = [
      {
        recommendation_type: 'task',
        content: 'Consider breaking down the "API Integration" task into smaller subtasks for better tracking and management.',
        confidence_score: 0.87,
        related_entity_type: 'task'
      },
      {
        recommendation_type: 'project',
        content: 'Based on the current progress, the project timeline may need adjustment. Consider extending the deadline by one week.',
        confidence_score: 0.75,
        related_entity_type: 'project'
      },
      {
        recommendation_type: 'team',
        content: 'The current team composition lacks backend expertise. Consider adding a backend developer to improve development efficiency.',
        confidence_score: 0.82,
        related_entity_type: 'team'
      },
      {
        recommendation_type: 'performance',
        content: 'Meeting frequency can be reduced from daily to twice a week to improve team productivity.',
        confidence_score: 0.68,
        related_entity_type: 'meetings'
      },
      {
        recommendation_type: 'security',
        content: 'The current password policy should be updated to require more complex passwords and regular password changes.',
        confidence_score: 0.91,
        related_entity_type: 'security'
      }
    ];
    
    const recommendations = [];
    for (const sample of samples) {
      const query = `
        INSERT INTO ai_recommendations
        (recommendation_id, user_id, recommendation_type, content, related_entity_type, confidence_score, created_at)
        VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, NOW() - (random() * interval '5 days'))
        RETURNING *
      `;
      
      const result = await pool.query(query, [
        userId,
        sample.recommendation_type,
        sample.content,
        sample.related_entity_type,
        sample.confidence_score
      ]);
      
      recommendations.push(result.rows[0]);
    }
    
    return recommendations;
  }

  /**
   * Helper: Simulate report generation
   * @private
   */
  async simulateReportGeneration(reportType, parameters) {
    // Add a delay to simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Generate different report content based on type
    switch (reportType) {
      case 'project_status':
        return {
          title: "Project Status Report",
          summary: "The project is currently on track with minor delays in the development phase.",
          key_metrics: {
            completion_percentage: 68,
            tasks_completed: 24,
            tasks_in_progress: 12,
            tasks_pending: 8,
            days_until_deadline: 14
          },
          risk_assessment: "Medium risk due to upcoming integration challenges.",
          recommendations: [
            "Focus resources on the backend integration tasks",
            "Consider adding one developer to the team temporarily",
            "Hold a focused technical review meeting this week"
          ],
          detailed_analysis: "This project has shown consistent progress but may face challenges...",
          charts: [
            { type: "burndown", data: { /* sample data */ } },
            { type: "completion", data: { /* sample data */ } }
          ]
        };
        
      case 'team_performance':
        return {
          title: "Team Performance Report",
          summary: "The team is performing well with high productivity and good collaboration.",
          key_metrics: {
            productivity_score: 87,
            tasks_completed_per_day: 3.2,
            average_task_completion_time: "2.3 days",
            code_quality_score: 92,
            collaboration_score: 85
          },
          strengths: [
            "Strong technical skills",
            "Good communication",
            "Proactive problem solving"
          ],
          areas_for_improvement: [
            "Documentation could be more comprehensive",
            "Testing coverage could be expanded"
          ],
          detailed_analysis: "The team has demonstrated consistent performance across various metrics...",
          recommendations: [
            "Implement a weekly documentation review",
            "Consider cross-training on testing methodologies",
            "Continue the current sprint structure which is working well"
          ]
        };
        
      default:
        return {
          title: "General Report",
          summary: "This is a generated report based on the available data.",
          sections: [
            {
              title: "Overview",
              content: "The system is functioning within expected parameters..."
            },
            {
              title: "Details",
              content: "Specific metrics show normal operation across all monitored systems..."
            },
            {
              title: "Recommendations",
              content: "Continue with the current operational approach..."
            }
          ]
        };
    }
  }
}

export default new AIController();
