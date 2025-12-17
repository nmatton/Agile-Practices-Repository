const pool = require('../config/database');

class VisualizationService {
  /**
   * Transform practice data into card format for Draw2d rendering
   * @param {number} practiceVersionId - The practice version ID
   * @returns {Object} Card data structure for visualization
   */
  async transformPracticeToCard(practiceVersionId) {
    const client = await pool.connect();
    try {
      // Get practice version with basic info
      const practiceQuery = `
        SELECT 
          pv.id as practice_version_id,
          pv.versionname as version_name,
          pv.changedescription as change_description,
          p.name as practice_name,
          p.description as practice_description,
          p.objective as practice_objective
        FROM practiceversion pv
        JOIN practice p ON pv.practiceid = p.id
        WHERE pv.id = $1
      `;
      
      const practiceResult = await client.query(practiceQuery, [practiceVersionId]);
      if (practiceResult.rows.length === 0) {
        throw new Error('Practice version not found');
      }
      
      const practice = practiceResult.rows[0];
      
      // Get activities associated with this practice version
      const activitiesQuery = `
        SELECT 
          a.id,
          a.name,
          a.description,
          pva.sequence
        FROM activity a
        JOIN practiceversionactivity pva ON a.id = pva.activityid
        WHERE pva.practiceversionid = $1
        ORDER BY pva.sequence
      `;
      
      const activitiesResult = await client.query(activitiesQuery, [practiceVersionId]);
      
      // Get roles used in this practice
      const rolesQuery = `
        SELECT 
          r.id,
          r.name,
          r.description,
          ru.typeid as type_id
        FROM role r
        JOIN roleuse ru ON r.id = ru.roleid
        WHERE ru.practiceversionid = $1
      `;
      
      const rolesResult = await client.query(rolesQuery, [practiceVersionId]);
      
      // Get goals (OARs) linked to this practice
      const goalsQuery = `
        SELECT DISTINCT
          g.id,
          g.name,
          g.description
        FROM goal g
        JOIN recommendationgoal rg ON g.id = rg.goalid
        JOIN recommendation rec ON rg.recommendationid = rec.id
        WHERE rec.practiceversionid = $1
      `;
      
      const goalsResult = await client.query(goalsQuery, [practiceVersionId]);
      
      // Transform data into card structure
      const cardData = {
        id: practice.practice_version_id,
        type: 'practice-card',
        name: practice.practice_name,
        description: practice.practice_description,
        objective: practice.practice_objective,
        version: practice.version_name,
        changeDescription: practice.change_description,
        activities: activitiesResult.rows.map(activity => ({
          id: activity.id,
          name: activity.name,
          description: activity.description,
          sequence: activity.sequence
        })),
        roles: rolesResult.rows.map(role => ({
          id: role.id,
          name: role.name,
          description: role.description,
          typeId: role.type_id
        })),
        goals: goalsResult.rows.map(goal => ({
          id: goal.id,
          name: goal.name,
          description: goal.description
        })),
        // Card layout properties for Draw2d
        layout: {
          width: 300,
          height: 400,
          x: 0,
          y: 0
        }
      };
      
      return cardData;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get multiple practice cards for a team's universe
   * @param {number} universeId - The universe ID
   * @returns {Array} Array of card data structures
   */
  async getPracticeCardsForUniverse(universeId) {
    const client = await pool.connect();
    try {
      // Get all active practice versions in the universe
      const practicesQuery = `
        SELECT DISTINCT pv.id
        FROM practiceversion pv
        JOIN practiceversionuniverse pvu ON pv.id = pvu.practiceversionid
        WHERE pvu.universeid = $1 AND pvu.isactive = true
      `;
      
      const practicesResult = await client.query(practicesQuery, [universeId]);
      
      // Transform each practice to card format
      const cards = [];
      for (const practice of practicesResult.rows) {
        const cardData = await this.transformPracticeToCard(practice.id);
        cards.push(cardData);
      }
      
      // Arrange cards in a grid layout
      this.arrangeCardsInGrid(cards);
      
      return cards;
    } finally {
      client.release();
    }
  }
  
  /**
   * Arrange cards in a grid layout for visualization
   * @param {Array} cards - Array of card objects
   */
  arrangeCardsInGrid(cards) {
    const cardsPerRow = 3;
    const cardWidth = 320; // Including margin
    const cardHeight = 420; // Including margin
    
    cards.forEach((card, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      
      card.layout.x = col * cardWidth + 20;
      card.layout.y = row * cardHeight + 20;
    });
  }
  
  /**
   * Generate print-optimized layout for practice cards
   * @param {Array} cards - Array of card objects
   * @returns {Object} Print layout configuration
   */
  generatePrintLayout(cards) {
    // Optimize for A4 paper size (210mm x 297mm)
    const printLayout = {
      pageSize: 'A4',
      orientation: 'portrait',
      margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      },
      cardDimensions: {
        width: 80, // mm - fits 2 cards per row with margins and spacing (210-40-5)/2 = 82.5, use 80 for safety
        height: 115, // mm - fits 2 cards per column with margins and spacing (297-40-5)/2 = 126, use 115 for safety
      },
      cardsPerPage: 4, // 2x2 grid
      pages: []
    };
    
    // Group cards into pages
    const cardsPerPage = printLayout.cardsPerPage;
    for (let i = 0; i < cards.length; i += cardsPerPage) {
      const pageCards = cards.slice(i, i + cardsPerPage);
      
      // Position cards for print layout
      pageCards.forEach((card, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        
        card.printLayout = {
          x: printLayout.margins.left + (col * (printLayout.cardDimensions.width + 5)), // Add 5mm spacing
          y: printLayout.margins.top + (row * (printLayout.cardDimensions.height + 5)), // Add 5mm spacing
          width: printLayout.cardDimensions.width,
          height: printLayout.cardDimensions.height
        };
      });
      
      printLayout.pages.push({
        pageNumber: Math.floor(i / cardsPerPage) + 1,
        cards: pageCards
      });
    }
    
    return printLayout;
  }
  
  /**
   * Generate Draw2d canvas configuration for practice visualization
   * @param {Array} cards - Array of card objects
   * @returns {Object} Draw2d canvas configuration
   */
  generateCanvasConfig(cards) {
    // Calculate canvas size based on card positions
    let maxX = 0;
    let maxY = 0;
    
    cards.forEach(card => {
      maxX = Math.max(maxX, card.layout.x + card.layout.width);
      maxY = Math.max(maxY, card.layout.y + card.layout.height);
    });
    
    return {
      canvas: {
        width: maxX + 40, // Add padding
        height: maxY + 40,
        backgroundColor: '#f8f9fa'
      },
      cards: cards.map(card => ({
        id: card.id,
        type: 'shape_basic.Rectangle',
        x: card.layout.x,
        y: card.layout.y,
        width: card.layout.width,
        height: card.layout.height,
        userData: {
          practiceId: card.id,
          name: card.name,
          description: card.description,
          activities: card.activities,
          roles: card.roles,
          goals: card.goals
        },
        cssClass: 'practice-card',
        labels: [
          {
            text: card.name,
            fontColor: '#2c3e50',
            fontSize: 14,
            fontFamily: 'Arial',
            bold: true
          }
        ]
      }))
    };
  }
}

const visualizationServiceInstance = new VisualizationService();
visualizationServiceInstance.pool = pool;

module.exports = visualizationServiceInstance;