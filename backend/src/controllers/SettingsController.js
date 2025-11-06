const pool = require('../config/db');

/**
 * Settings controller to manage user settings
 */
class SettingsController {
  /**
   * Get user settings
   */
  async getSettings(req, res) {
    try {
      const userId = req.user.userId;
      
      // Get user settings from DB
      const userSettingsQuery = `
        SELECT 
          appearance, 
          notifications, 
          privacy, 
          language, 
          sound, 
          accessibility, 
          keyboard,
          ai
        FROM user_settings 
        WHERE user_id = $1
      `;
      
      const result = await pool.query(userSettingsQuery, [userId]);
      
      // If no settings record exists, create default settings
      if (result.rows.length === 0) {
        const defaultSettings = await this.createDefaultSettings(userId);
        return res.json(defaultSettings);
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching user settings:', error);
      res.status(500).json({ error: 'Failed to fetch user settings' });
    }
  }

  /**
   * Save user settings
   */
  async saveSettings(req, res) {
    try {
      const userId = req.user.userId;
      const settings = req.body;
      
      // Validate settings object
      if (!settings) {
        return res.status(400).json({ error: 'Invalid settings data' });
      }
      
      // Check if settings record exists
      const checkQuery = `SELECT 1 FROM user_settings WHERE user_id = $1`;
      const checkResult = await pool.query(checkQuery, [userId]);
      
      if (checkResult.rows.length === 0) {
        // Insert new settings record
        const insertQuery = `
          INSERT INTO user_settings(
            user_id, 
            appearance, 
            notifications, 
            privacy, 
            language, 
            sound, 
            accessibility, 
            keyboard,
            ai,
            updated_at
          ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          RETURNING *
        `;
        
        const values = [
          userId,
          settings.appearance || {},
          settings.notifications || {},
          settings.privacy || {},
          settings.language || {},
          settings.sound || {},
          settings.accessibility || {},
          settings.keyboard || {},
          settings.ai || {}
        ];
        
        const insertResult = await pool.query(insertQuery, values);
        return res.json(insertResult.rows[0]);
      } else {
        // Update existing settings record
        const updateQuery = `
          UPDATE user_settings
          SET 
            appearance = $1,
            notifications = $2,
            privacy = $3,
            language = $4,
            sound = $5,
            accessibility = $6,
            keyboard = $7,
            ai = $8,
            updated_at = NOW()
          WHERE user_id = $9
          RETURNING *
        `;
        
        const values = [
          settings.appearance || {},
          settings.notifications || {},
          settings.privacy || {},
          settings.language || {},
          settings.sound || {},
          settings.accessibility || {},
          settings.keyboard || {},
          settings.ai || {},
          userId
        ];
        
        const updateResult = await pool.query(updateQuery, values);
        res.json(updateResult.rows[0]);
      }
    } catch (error) {
      console.error('Error saving user settings:', error);
      res.status(500).json({ error: 'Failed to save user settings' });
    }
  }

  /**
   * Update a specific setting category
   */
  async updateCategory(req, res) {
    try {
      const userId = req.user.userId;
      const { category } = req.params;
      const categorySettings = req.body;
      
      // Validate category
      const validCategories = [
        'appearance', 'notifications', 'privacy', 
        'language', 'sound', 'accessibility', 'keyboard', 'ai'
      ];
      
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid settings category' });
      }
      
      // Check if settings record exists
      const checkQuery = `SELECT 1 FROM user_settings WHERE user_id = $1`;
      const checkResult = await pool.query(checkQuery, [userId]);
      
      if (checkResult.rows.length === 0) {
        // Create default settings first
        await this.createDefaultSettings(userId);
      }
      
      // Update specific category
      const updateQuery = `
        UPDATE user_settings
        SET ${category} = $1, updated_at = NOW()
        WHERE user_id = $2
        RETURNING *
      `;
      
      const result = await pool.query(updateQuery, [categorySettings, userId]);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating settings category:', error);
      res.status(500).json({ error: 'Failed to update settings category' });
    }
  }

  /**
   * Reset user settings to default
   */
  async resetSettings(req, res) {
    try {
      const userId = req.user.userId;
      
      // Delete existing settings
      await pool.query('DELETE FROM user_settings WHERE user_id = $1', [userId]);
      
      // Create new default settings
      const defaultSettings = await this.createDefaultSettings(userId);
      res.json(defaultSettings);
    } catch (error) {
      console.error('Error resetting user settings:', error);
      res.status(500).json({ error: 'Failed to reset user settings' });
    }
  }

  /**
   * Helper method to create default settings for a user
   * @private
   */
  async createDefaultSettings(userId) {
    // Default settings structure
    const defaultSettings = {
      appearance: {
        theme: 'light',
        primaryColor: '#3b82f6',
        secondaryColor: '#10b981',
        fontScale: 1,
        reducedMotion: false,
        borderRadius: 8,
        customTheme: null,
      },
      notifications: {
        email: true,
        push: true,
        sounds: true,
        desktop: true,
        taskReminders: true,
        meetingReminders: true,
        mentions: true,
        updates: true,
        digest: 'daily',
        doNotDisturbStart: '22:00',
        doNotDisturbEnd: '08:00'
      },
      privacy: {
        visibility: 'team',
        activityStatus: true,
        readReceipts: true,
        dataCollection: true,
        shareUsageData: false
      },
      language: {
        appLanguage: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h'
      },
      sound: {
        volume: 80,
        notificationSound: 'default',
        messageSound: 'subtle',
        callSound: 'ring1',
        mute: false
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        screenReader: false,
        reducedMotion: false,
        keyboardNavigation: true
      },
      keyboard: {
        shortcuts: true,
        navigateWithArrows: true,
        submitWithEnter: true,
        customShortcuts: {}
      },
      ai: {
        enabled: true,
        voiceEnabled: false,
        suggestions: true,
        analytics: true,
        autoComplete: true,
        dataImprovement: false
      }
    };

    // Insert default settings
    const query = `
      INSERT INTO user_settings(
        user_id, 
        appearance, 
        notifications, 
        privacy, 
        language, 
        sound, 
        accessibility, 
        keyboard,
        ai,
        updated_at
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;
    
    const values = [
      userId,
      defaultSettings.appearance,
      defaultSettings.notifications,
      defaultSettings.privacy,
      defaultSettings.language,
      defaultSettings.sound,
      defaultSettings.accessibility,
      defaultSettings.keyboard,
      defaultSettings.ai
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

module.exports = new SettingsController();
