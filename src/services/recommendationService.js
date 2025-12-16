const pool = require('../config/database');
const PersonPracticeAffinity = require('../models/PersonPracticeAffinity');
const PracticeVersion = require('../models/PracticeVersion');
const Practice = require('../models/Practice');
const Goal = require('../models/Goal');
const Context = require('../models/Context');
const Recommendation = require('../models/Recommendation');
const PersonalityService = require('./personalityService');

class RecommendationService {
  /**
   * Find alternative practices that cover the same OARs with higher team affinity
   * @param {number} practiceVersionId - The problematic practice version ID
   * @param {Array} teamMemberIds - Array of team member person IDs
   * @param {number} minAffinityImprovement - Minimum affinity improvement required (default: 10)
   * @returns {Array} Alternative practices with same objectives and higher affinity
   */
  static async findAlternativePractices(practiceVersionId, teamMemberIds, minAffinityImprovement = 10) {
    try {
      // Get the current practice's team affinity
      const currentAffinity = await PersonalityService.calculateTeamAffinity(teamMemberIds, practiceVersionId);
      
      // Get the goals (OARs) covered by the current practice
      const goalsResult = await pool.query(`
        SELECT DISTINCT g.id, g.name, g.description
        FROM Goal g
        JOIN recommendationGoal rg ON g.id = rg.goalId
        JOIN Recommendation r ON rg.recommendationId = r.id
        WHERE r.practiceVersionId = $1
      `, [practiceVersionId]);
      
      const currentGoals = goalsResult.rows;
      
      if (currentGoals.length === 0) {
        return [];
      }
      
      // Find other practices that cover the same goals
      const alternativesResult = await pool.query(`
        SELECT DISTINCT pv.id, pv.practiceId, p.name, p.description, p.objective
        FROM practiceVersion pv
        JOIN Practice p ON pv.practiceId = p.id
        JOIN Recommendation r ON pv.id = r.practiceVersionId
        JOIN recommendationGoal rg ON r.id = rg.recommendationId
        WHERE rg.goalId = ANY($1::int[])
          AND pv.id != $2
        GROUP BY pv.id, pv.practiceId, p.name, p.description, p.objective
        HAVING COUNT(DISTINCT rg.goalId) >= $3
      `, [currentGoals.map(g => g.id), practiceVersionId, Math.ceil(currentGoals.length * 0.7)]);
      
      const alternatives = [];
      
      for (const alt of alternativesResult.rows) {
        const altAffinity = await PersonalityService.calculateTeamAffinity(teamMemberIds, alt.id);
        
        // Only include if affinity is significantly better
        if (altAffinity.average > currentAffinity.average + minAffinityImprovement) {
          alternatives.push({
            practiceVersionId: alt.id,
            practiceId: alt.practiceid,
            name: alt.name,
            description: alt.description,
            objective: alt.objective,
            currentAffinity: currentAffinity,
            alternativeAffinity: altAffinity,
            affinityImprovement: altAffinity.average - currentAffinity.average,
            sharedGoals: currentGoals,
            recommended: true,
            reason: `Higher team affinity (+${Math.round(altAffinity.average - currentAffinity.average)} points)`
          });
        }
      }
      
      // Sort by affinity improvement (descending)
      alternatives.sort((a, b) => b.affinityImprovement - a.affinityImprovement);
      
      return alternatives;
    } catch (error) {
      console.error('Error finding alternative practices:', error);
      throw error;
    }
  }

  /**
   * Flag a practice as difficult for a team member
   * @param {number} personId - The person flagging the practice
   * @param {number} practiceVersionId - The practice version being flagged
   * @param {string} reason - Reason for flagging (optional)
   * @param {number} contextId - Context where difficulty was encountered (optional)
   * @returns {Object} Flagging record
   */
  static async flagPracticeDifficulty(personId, practiceVersionId, reason = null, contextId = null) {
    try {
      const result = await pool.query(`
        INSERT INTO practiceDifficultyFlag (personId, practiceVersionId, reason, contextId, flaggedAt)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (personId, practiceVersionId) 
        DO UPDATE SET reason = $3, contextId = $4, flaggedAt = NOW()
        RETURNING *
      `, [personId, practiceVersionId, reason, contextId]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error flagging practice difficulty:', error);
      throw error;
    }
  }

  /**
   * Get context-aware recommendations based on team context and situation
   * @param {Array} teamMemberIds - Array of team member person IDs
   * @param {number} contextId - Context ID for filtering recommendations
   * @param {Array} goalIds - Array of goal IDs to focus on (optional)
   * @returns {Array} Context-filtered recommendations
   */
  static async getContextAwareRecommendations(teamMemberIds, contextId = null, goalIds = []) {
    try {
      let query = `
        SELECT DISTINCT pv.id, pv.practiceId, p.name, p.description, p.objective,
               r.description as recommendationText, r.typeId as recommendationType
        FROM practiceVersion pv
        JOIN Practice p ON pv.practiceId = p.id
        JOIN Recommendation r ON pv.id = r.practiceVersionId
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 0;
      
      // Filter by context if provided
      if (contextId) {
        paramCount++;
        query += ` AND (r.contextId = $${paramCount} OR r.contextId IS NULL)`;
        params.push(contextId);
      }
      
      // Filter by goals if provided
      if (goalIds.length > 0) {
        paramCount++;
        query += ` AND EXISTS (
          SELECT 1 FROM recommendationGoal rg 
          WHERE rg.recommendationId = r.id 
          AND rg.goalId = ANY($${paramCount}::int[])
        )`;
        params.push(goalIds);
      }
      
      // Only include helpful recommendations
      query += ` AND r.typeId = 1`;  // Assuming 1 = Helpful
      
      const result = await pool.query(query, params);
      const recommendations = [];
      
      for (const row of result.rows) {
        const teamAffinity = await PersonalityService.calculateTeamAffinity(teamMemberIds, row.id);
        
        recommendations.push({
          practiceVersionId: row.id,
          practiceId: row.practiceid,
          name: row.name,
          description: row.description,
          objective: row.objective,
          recommendationText: row.recommendationtext,
          recommendationType: row.recommendationtype,
          teamAffinity: teamAffinity,
          contextFiltered: contextId !== null,
          recommended: teamAffinity.average >= 50
        });
      }
      
      // Sort by team affinity (descending)
      recommendations.sort((a, b) => b.teamAffinity.average - a.teamAffinity.average);
      
      return recommendations;
    } catch (error) {
      console.error('Error getting context-aware recommendations:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive recommendations for a team covering multiple scenarios
   * @param {Array} teamMemberIds - Array of team member person IDs
   * @param {Object} options - Options for recommendation generation
   * @returns {Object} Comprehensive recommendation report
   */
  static async getComprehensiveRecommendations(teamMemberIds, options = {}) {
    const {
      minAffinityThreshold = 60,
      contextId = null,
      goalIds = [],
      includeDifficult = true,
      includeAlternatives = true
    } = options;
    
    try {
      const report = {
        teamMemberIds,
        generatedAt: new Date(),
        recommendations: {
          highAffinity: [],
          lowAffinity: [],
          contextAware: [],
          alternatives: []
        },
        summary: {
          totalPractices: 0,
          recommendedCount: 0,
          problematicCount: 0,
          alternativeCount: 0
        }
      };
      
      // Get basic team recommendations
      const basicRecommendations = await PersonalityService.getTeamPracticeRecommendations(
        teamMemberIds, 
        minAffinityThreshold
      );
      
      report.recommendations.highAffinity = basicRecommendations.filter(r => r.recommended);
      report.recommendations.lowAffinity = basicRecommendations.filter(r => !r.recommended);
      
      // Get context-aware recommendations if context provided
      if (contextId) {
        report.recommendations.contextAware = await this.getContextAwareRecommendations(
          teamMemberIds, 
          contextId, 
          goalIds
        );
      }
      
      // Get alternatives for problematic practices
      if (includeAlternatives && report.recommendations.lowAffinity.length > 0) {
        for (const problematic of report.recommendations.lowAffinity) {
          const alternatives = await this.findAlternativePractices(
            problematic.practice.id,
            teamMemberIds
          );
          report.recommendations.alternatives.push(...alternatives);
        }
      }
      
      // Generate summary
      report.summary.totalPractices = basicRecommendations.length;
      report.summary.recommendedCount = report.recommendations.highAffinity.length;
      report.summary.problematicCount = report.recommendations.lowAffinity.length;
      report.summary.alternativeCount = report.recommendations.alternatives.length;
      
      return report;
    } catch (error) {
      console.error('Error generating comprehensive recommendations:', error);
      throw error;
    }
  }

  /**
   * Get flagged practices for a team with suggested alternatives
   * @param {Array} teamMemberIds - Array of team member person IDs
   * @returns {Array} Flagged practices with alternatives
   */
  static async getFlaggedPracticesWithAlternatives(teamMemberIds) {
    try {
      const flaggedResult = await pool.query(`
        SELECT DISTINCT pdf.practiceVersionId, pdf.reason, 
               pv.practiceId, p.name, p.description,
               COUNT(pdf.personId) as flagCount
        FROM practiceDifficultyFlag pdf
        JOIN practiceVersion pv ON pdf.practiceVersionId = pv.id
        JOIN Practice p ON pv.practiceId = p.id
        WHERE pdf.personId = ANY($1::int[])
        GROUP BY pdf.practiceVersionId, pdf.reason, pv.practiceId, p.name, p.description
        ORDER BY flagCount DESC
      `, [teamMemberIds]);
      
      const flaggedPractices = [];
      
      for (const flagged of flaggedResult.rows) {
        const alternatives = await this.findAlternativePractices(
          flagged.practiceversionid,
          teamMemberIds
        );
        
        flaggedPractices.push({
          practiceVersionId: flagged.practiceversionid,
          practiceId: flagged.practiceid,
          name: flagged.name,
          description: flagged.description,
          flagCount: flagged.flagcount,
          reason: flagged.reason,
          alternatives: alternatives.slice(0, 3) // Top 3 alternatives
        });
      }
      
      return flaggedPractices;
    } catch (error) {
      console.error('Error getting flagged practices with alternatives:', error);
      throw error;
    }
  }
}

module.exports = RecommendationService;