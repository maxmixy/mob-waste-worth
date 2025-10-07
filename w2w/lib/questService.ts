import { getUserId } from './user';
import { notificationService } from './notificationService';

const API_BASE_URL = 'http://127.0.0.1:5000';

export interface QuestProgressUpdate {
  questId: string;
  increment: number;
  userId?: string;
}

export interface QuestProgressResult {
  success: boolean;
  questId?: string;
  progress?: number;
  isCompleted?: boolean;
  pointsEarned?: number;
  questTitle?: string;
  message?: string;
  error?: string;
}

class QuestService {
  private recentlyNotifiedQuests: Set<string> = new Set();
  /**
   * Update quest progress for a specific quest
   */
  async updateQuestProgress(questId: string, increment: number = 1, userId?: string): Promise<QuestProgressResult> {
    try {
      const currentUserId = userId || await getUserId();
      if (!currentUserId) {
        console.log('❌ QuestService: No user ID available');
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      console.log(`🎯 QuestService: Updating quest ${questId} for user ${currentUserId} with increment ${increment}`);

      const response = await fetch(`${API_BASE_URL}/user/${currentUserId}/quests/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quest_id: questId,
          increment: increment
        })
      });

      const data = await response.json();
      console.log(`📊 QuestService: API response for quest ${questId}:`, data);
      
      if (data.success) {
        console.log(`✅ QuestService: Successfully updated quest ${questId}. Progress: ${data.progress}, Completed: ${data.is_completed}, Points: ${data.points_earned}`);
        return {
          success: true,
          questId: questId,
          progress: data.progress,
          isCompleted: data.is_completed,
          pointsEarned: data.points_earned,
          questTitle: data.quest_title,
          message: data.message
        };
      } else {
        console.log(`❌ QuestService: Failed to update quest ${questId}:`, data.error);
        return {
          success: false,
          error: data.error || 'Failed to update quest progress'
        };
      }
    } catch (error) {
      console.error(`❌ QuestService: Error updating quest ${questId}:`, error);
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  /**
   * Get user's quest progress for all quests
   */
  async getUserQuestProgress(userId?: string): Promise<any[]> {
    try {
      const currentUserId = userId || await getUserId();
      if (!currentUserId) {
        return [];
      }

      const response = await fetch(`${API_BASE_URL}/user/${currentUserId}/quests/progress`);
      const data = await response.json();
      
      if (data.success) {
        return data.progress;
      }
      return [];
    } catch (error) {
      console.error('Error fetching user quest progress:', error);
      return [];
    }
  }

  /**
   * Get user's quest statistics
   */
  async getUserQuestStats(userId?: string): Promise<any> {
    try {
      const currentUserId = userId || await getUserId();
      if (!currentUserId) {
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/user/${currentUserId}/quests/stats`);
      const data = await response.json();
      
      if (data.success) {
        return data.stats;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user quest stats:', error);
      return null;
    }
  }

  /**
   * Track scanning action - updates scanning-related quests
   */
  async trackScanningAction(userId?: string): Promise<QuestProgressResult[]> {
    console.log('📸 QuestService: Tracking scanning action...');
    const results: QuestProgressResult[] = [];
    
    // New scanning quest IDs from the database (reduced points)
    const scanningQuestIds = [
      '8TDq3RP4Uxe47ZnHR5VV'  // Categorize 10 Items
    ];

    console.log(`📸 QuestService: Updating ${scanningQuestIds.length} scanning quests`);

    for (const questId of scanningQuestIds) {
      try {
        const result = await this.updateQuestProgress(questId, 1, userId);
        results.push(result);
      } catch (error) {
        console.error(`Error updating quest ${questId}:`, error);
        results.push({
          success: false,
          error: `Failed to update quest ${questId}`
        });
      }
    }

    console.log(`📸 QuestService: Completed tracking scanning action. Results:`, results);
    return results;
  }

  /**
   * Track profile completion action
   */
  async trackProfileCompletion(userId?: string): Promise<QuestProgressResult[]> {
    const results: QuestProgressResult[] = [];
    
    // New profile quest IDs from the database (reduced points)
    const profileQuestIds = [
      '876DiPOhryLrYkILYibt', // Complete Your Profile
      'BPCU2Ha2GXuziwqeeQX8', // Add Profile Photo
      'ImCEu1Zud0ynQbCnRHZb', // Add Profile Photo (repeatable)
      'LFwXhzKg8Zm33CX9xxyY'  // Add Profile Photo (hard)
    ];

    for (const questId of profileQuestIds) {
      try {
        const result = await this.updateQuestProgress(questId, 1, userId);
        results.push(result);
      } catch (error) {
        console.error(`Error updating quest ${questId}:`, error);
        results.push({
          success: false,
          error: `Failed to update quest ${questId}`
        });
      }
    }

    return results;
  }

  /**
   * Track recycling project action
   */
  async trackRecyclingProjectAction(userId?: string): Promise<QuestProgressResult[]> {
    const results: QuestProgressResult[] = [];
    
    // New recycling project quest IDs from the database (reduced points)
    const recyclingQuestIds = [
      'VotNV21QLBxJsakfiQfc', // Start 2 Recycling Projects
      'qSP0Ai5iNSC6LS16XNL0', // Start 3 Recycling Projects
      'ZeDHKw9nqJ61cpsXYzUz', // Track Progress on 5 Projects
      'jMaDJzMaBlXiRBMfVb0S'  // Complete 2 Recycling Projects
    ];

    for (const questId of recyclingQuestIds) {
      try {
        const result = await this.updateQuestProgress(questId, 1, userId);
        results.push(result);
      } catch (error) {
        console.error(`Error updating quest ${questId}:`, error);
        results.push({
          success: false,
          error: `Failed to update quest ${questId}`
        });
      }
    }

    return results;
  }

  /**
   * Track community action (sharing, commenting, etc.)
   */
  async trackCommunityAction(userId?: string): Promise<QuestProgressResult[]> {
    const results: QuestProgressResult[] = [];
    
    // New community quest IDs from the database (reduced points)
    const communityQuestIds = [
      'IFukkopDuvzda1RO8HLI', // Share 3 Recycling Tips
      'hrDwYxcpceQ5C052gERi', // Share 5 Recycling Tips
      'XSbey2IsFmTgj1HDa2rJ', // Engage with 30 Posts
      'ZRcwUIVhH3mXmICGDDjx'  // Engage with 10 Posts
    ];

    for (const questId of communityQuestIds) {
      try {
        const result = await this.updateQuestProgress(questId, 1, userId);
        results.push(result);
      } catch (error) {
        console.error(`Error updating quest ${questId}:`, error);
        results.push({
          success: false,
          error: `Failed to update quest ${questId}`
        });
      }
    }

    return results;
  }


  /**
   * Track location-based actions
   */
  async trackLocationAction(userId?: string): Promise<QuestProgressResult[]> {
    const results: QuestProgressResult[] = [];
    
    // New location quest IDs from the database (reduced points)
    const locationQuestIds = [
      'AN25N8syAN5a27VBN5YT', // Share Your Location
      'wllSlTjVTOK2k8IoyQAb'  // Share Your Location (medium)
    ];

    for (const questId of locationQuestIds) {
      try {
        const result = await this.updateQuestProgress(questId, 1, userId);
        results.push(result);
      } catch (error) {
        console.error(`Error updating quest ${questId}:`, error);
        results.push({
          success: false,
          error: `Failed to update quest ${questId}`
        });
      }
    }

    return results;
  }

  /**
   * Check for completed quests and show notifications
   */
  async checkCompletedQuests(results: QuestProgressResult[]): Promise<void> {
    // Only notify for newly completed quests (those that earned points)
    const newlyCompletedQuests = results.filter(result => 
      result.success && 
      result.isCompleted && 
      (result.pointsEarned || 0) > 0
    );
    
    if (newlyCompletedQuests.length > 0) {
      const totalPoints = newlyCompletedQuests.reduce((sum, quest) => sum + (quest.pointsEarned || 0), 0);
      
      console.log(`🎉 ${newlyCompletedQuests.length} quest(s) newly completed! Total points earned: ${totalPoints}`);
      
      // Add notifications for newly completed quests
      for (const quest of newlyCompletedQuests) {
        const questId = quest.questId || '';
        
        // Check if we've already notified for this quest recently
        if (this.recentlyNotifiedQuests.has(questId)) {
          console.log(`⏭️ Skipping notification for quest ${questId} - already notified recently`);
          continue;
        }
        
        console.log(`✅ Quest newly completed: ${quest.pointsEarned} points earned`);
        
        // Use quest title from the response, fallback to API call if not available
        const questName = quest.questTitle || await this.getQuestName(questId);
        notificationService.notifyQuestCompleted(questName);
        
        // Mark this quest as recently notified
        this.recentlyNotifiedQuests.add(questId);
        
        // Remove from recently notified set after 30 seconds to allow future notifications
        setTimeout(() => {
          this.recentlyNotifiedQuests.delete(questId);
        }, 30000);
      }
    }
  }

  /**
   * Get quest name from quest ID by fetching from API
   */
  private async getQuestName(questId: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/quests/${questId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.quest) {
          return data.quest.title;
        }
      }
    } catch (error) {
      console.error('Error fetching quest name:', error);
    }
    
    // Fallback to generic name if API call fails
    return 'Quest Completed';
  }
}

// Export a singleton instance
export const questService = new QuestService();
export default questService;
