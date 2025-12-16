const BfProfile = require('../models/BfProfile');
const AffinitySurveyResults = require('../models/AffinitySurveyResults');
const PersonPracticeAffinity = require('../models/PersonPracticeAffinity');
const PracticeVersion = require('../models/PracticeVersion');

class PersonalityService {
  
  /**
   * Calculate Big Five personality scores from survey results
   * @param {number} personId - The person's ID
   * @param {Array} surveyResults - Array of survey results with itemId and result
   * @returns {Object} Big Five scores (o, c, e, a, n)
   */
  static async calculateBigFiveScores(personId, surveyResults = null) {
    // If no survey results provided, fetch from database
    if (!surveyResults) {
      surveyResults = await AffinitySurveyResults.findByPersonId(personId);
    }

    // Initialize scores
    const scores = { o: 0, c: 0, e: 0, a: 0, n: 0 };
    const itemCounts = { o: 0, c: 0, e: 0, a: 0, n: 0 };

    if (!surveyResults || surveyResults.length === 0) {
      return scores;
    }

    // Map survey items to Big Five dimensions
    // This is a simplified mapping - in practice, this would be based on validated instruments
    surveyResults.forEach(result => {
      const normalizedScore = result.result / 5.0; // Normalize to 0-1 scale
      
      // Map based on survey item content (simplified approach)
      if (result.content && result.content.toLowerCase().includes('clearly defined')) {
        // "I prefer clearly defined tasks" -> Conscientiousness
        scores.c += normalizedScore;
        itemCounts.c++;
      } else if (result.content && result.content.toLowerCase().includes('brainstorming')) {
        // "I enjoy brainstorming with groups" -> Extraversion
        scores.e += normalizedScore;
        itemCounts.e++;
      } else if (result.content && result.content.toLowerCase().includes('changes')) {
        // "I am comfortable with changes" -> low Neuroticism (reverse scored)
        scores.n += (1.0 - normalizedScore);
        itemCounts.n++;
      }
      
      // Additional mappings based on item ID (from database sample data)
      if (result.surveyItemId === 1) { // Conscientiousness item
        scores.c += normalizedScore;
        itemCounts.c++;
      } else if (result.surveyItemId === 2) { // Extraversion item
        scores.e += normalizedScore;
        itemCounts.e++;
      } else if (result.surveyItemId === 3) { // Neuroticism item (reverse scored)
        scores.n += (1.0 - normalizedScore);
        itemCounts.n++;
      }
    });

    // Average scores for each dimension
    Object.keys(scores).forEach(dimension => {
      if (itemCounts[dimension] > 0) {
        scores[dimension] = scores[dimension] / itemCounts[dimension];
      }
      // Ensure scores are within 0-1 range
      scores[dimension] = Math.max(0, Math.min(1, scores[dimension]));
    });

    return scores;
  }

  /**
   * Process survey results and update Big Five profile
   * @param {number} personId - The person's ID
   * @param {Array} surveyAnswers - Array of {itemId, result} objects
   * @returns {Object} Updated BfProfile
   */
  static async processSurveyResults(personId, surveyAnswers) {
    if (!personId || !Array.isArray(surveyAnswers)) {
      throw new Error('Person ID and survey answers are required');
    }

    // Store survey results (handle empty arrays)
    let storedResults = [];
    if (surveyAnswers.length > 0) {
      storedResults = await AffinitySurveyResults.createBatch(personId, surveyAnswers);
    }

    // Calculate Big Five scores
    const bigFiveScores = await this.calculateBigFiveScores(personId);

    // Update or create BfProfile
    let bfProfile = await BfProfile.findByPersonId(personId);
    
    if (bfProfile) {
      // Update existing profile
      bfProfile = await bfProfile.update({
        statusId: 3, // Complete status
        ...bigFiveScores
      });
    } else {
      // Create new profile
      bfProfile = await BfProfile.create({
        personId,
        statusId: 3, // Complete status
        ...bigFiveScores
      });
    }

    // Recalculate affinities for all practices (only if we have a complete profile)
    if (bfProfile.isComplete()) {
      await this.recalculateAffinities(personId);
    }

    return {
      bfProfile,
      surveyResults: storedResults,
      bigFiveScores
    };
  }

  /**
   * Recalculate affinity scores for a person across all practices
   * @param {number} personId - The person's ID
   * @returns {Array} Updated affinity scores
   */
  static async recalculateAffinities(personId) {
    // Get person's Big Five profile
    const bfProfile = await BfProfile.findByPersonId(personId);
    
    if (!bfProfile || !bfProfile.isComplete()) {
      return [];
    }

    // Get all practice versions
    const practiceVersions = await PracticeVersion.findAll();
    const practiceVersionIds = practiceVersions.map(pv => pv.id);

    // Calculate and store affinities
    const affinities = await PersonPracticeAffinity.calculateAndStoreBatch(
      personId, 
      practiceVersionIds, 
      bfProfile
    );

    return affinities;
  }

  /**
   * Recalculate affinities for all team members when team composition changes
   * @param {number} teamId - The team's ID
   * @returns {Array} Updated affinity scores for all team members
   */
  static async recalculateTeamAffinities(teamId) {
    const Team = require('../models/Team');
    const team = await Team.findById(teamId);
    
    if (!team) {
      throw new Error('Team not found');
    }

    const members = await team.getMembers();
    const results = [];

    for (const member of members) {
      try {
        const affinities = await this.recalculateAffinities(member.id);
        results.push({
          personId: member.id,
          affinities,
          success: true
        });
      } catch (error) {
        results.push({
          personId: member.id,
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }

  /**
   * Get personality profile with affinity scores for a person
   * @param {number} personId - The person's ID
   * @returns {Object} Complete personality profile
   */
  static async getPersonalityProfile(personId) {
    const bfProfile = await BfProfile.findByPersonId(personId);
    const affinities = await PersonPracticeAffinity.findByPersonId(personId);
    const surveyResults = await AffinitySurveyResults.findByPersonId(personId);

    return {
      bfProfile,
      affinities,
      surveyResults,
      isComplete: bfProfile && bfProfile.isComplete()
    };
  }

  /**
   * Calculate team affinity score for a practice
   * @param {Array} teamMemberIds - Array of team member person IDs
   * @param {number} practiceVersionId - The practice version ID
   * @returns {Object} Team affinity statistics
   */
  static async calculateTeamAffinity(teamMemberIds, practiceVersionId) {
    if (!Array.isArray(teamMemberIds) || teamMemberIds.length === 0) {
      return { average: 0, minimum: 0, maximum: 0, standardDeviation: 0, memberCount: 0, individualScores: [] };
    }

    const affinities = [];
    
    for (const memberId of teamMemberIds) {
      const affinity = await PersonPracticeAffinity.findByPersonAndPractice(memberId, practiceVersionId);
      if (affinity) {
        affinities.push(affinity.affinity);
      }
    }

    if (affinities.length === 0) {
      return { average: 0, minimum: 0, maximum: 0, standardDeviation: 0, memberCount: teamMemberIds.length, individualScores: [] };
    }

    const average = affinities.reduce((sum, score) => sum + score, 0) / affinities.length;
    const minimum = Math.min(...affinities);
    const maximum = Math.max(...affinities);
    
    // Calculate standard deviation
    const variance = affinities.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / affinities.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      average: Math.round(average * 100) / 100,
      minimum,
      maximum,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      memberCount: teamMemberIds.length,
      individualScores: affinities
    };
  }

  /**
   * Get practice recommendations based on team affinity
   * @param {Array} teamMemberIds - Array of team member person IDs
   * @param {number} minAffinityThreshold - Minimum acceptable affinity score (default: 60)
   * @returns {Array} Recommended practices with team affinity scores
   */
  static async getTeamPracticeRecommendations(teamMemberIds, minAffinityThreshold = 60) {
    const practiceVersions = await PracticeVersion.findAll();
    const recommendations = [];

    for (const practice of practiceVersions) {
      const teamAffinity = await this.calculateTeamAffinity(teamMemberIds, practice.id);
      
      if (teamAffinity.average >= minAffinityThreshold) {
        recommendations.push({
          practice,
          teamAffinity,
          recommended: true,
          reason: `High team affinity (${teamAffinity.average})`
        });
      } else if (teamAffinity.minimum < 30) {
        recommendations.push({
          practice,
          teamAffinity,
          recommended: false,
          reason: `Low individual affinity detected (min: ${teamAffinity.minimum})`
        });
      }
    }

    // Sort by team affinity average (descending)
    recommendations.sort((a, b) => b.teamAffinity.average - a.teamAffinity.average);

    return recommendations;
  }
}

module.exports = PersonalityService;