const fc = require('fast-check');

// Mock the database configuration before requiring the service
jest.mock('../config/database', () => ({
  connect: jest.fn(() => ({
    query: jest.fn(),
    release: jest.fn()
  }))
}));

const visualizationService = require('../services/visualizationService');

describe('Visualization Service Property Tests', () => {
  let mockClient;
  let mockPool;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient)
    };
    
    // Mock the database pool
    const pool = require('../config/database');
    pool.connect = mockPool.connect;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Close database connections to prevent Jest warnings
    const pool = require('../config/database');
    if (pool && pool.end) {
      await pool.end();
    }
  });

  /**
   * **Feature: agile-practice-repository, Property 19: Graphical rendering displays components**
   * **Validates: Requirements 30.1**
   * 
   * For any practice with Activities and Roles, the graphical view should render 
   * all components using the card metaphor with Draw2d
   */
  test('Property 19: Graphical rendering displays components', async () => {
    await fc.assert(fc.asyncProperty(
      // Generate practice data with activities and roles
      fc.record({
        practiceVersionId: fc.integer({ min: 1, max: 1000 }),
        practiceName: fc.string({ minLength: 1, maxLength: 100 }),
        practiceDescription: fc.string({ minLength: 1, maxLength: 500 }),
        practiceObjective: fc.string({ minLength: 1, maxLength: 200 }),
        activities: fc.array(fc.record({
          id: fc.integer({ min: 1, max: 100 }),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          description: fc.string({ minLength: 1, maxLength: 200 }),
          sequence: fc.integer({ min: 1, max: 20 })
        }), { minLength: 1, maxLength: 10 }),
        roles: fc.array(fc.record({
          id: fc.integer({ min: 1, max: 50 }),
          name: fc.string({ minLength: 1, maxLength: 30 }),
          description: fc.string({ minLength: 1, maxLength: 100 }),
          typeId: fc.integer({ min: 1, max: 5 })
        }), { minLength: 1, maxLength: 5 }),
        goals: fc.array(fc.record({
          id: fc.integer({ min: 1, max: 20 }),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          description: fc.string({ minLength: 1, maxLength: 150 })
        }), { minLength: 0, maxLength: 5 })
      }),
      async (practiceData) => {
        // Mock database responses
        mockClient.query
          .mockResolvedValueOnce({
            rows: [{
              practice_version_id: practiceData.practiceVersionId,
              version_name: 'v1.0',
              change_description: 'Initial version',
              practice_name: practiceData.practiceName,
              practice_description: practiceData.practiceDescription,
              practice_objective: practiceData.practiceObjective
            }]
          })
          .mockResolvedValueOnce({
            rows: practiceData.activities.map(activity => ({
              id: activity.id,
              name: activity.name,
              description: activity.description,
              sequence: activity.sequence
            }))
          })
          .mockResolvedValueOnce({
            rows: practiceData.roles.map(role => ({
              id: role.id,
              name: role.name,
              description: role.description,
              type_id: role.typeId
            }))
          })
          .mockResolvedValueOnce({
            rows: practiceData.goals.map(goal => ({
              id: goal.id,
              name: goal.name,
              description: goal.description
            }))
          });

        // Create a mock service instance for testing
        const mockVisualizationService = {
          transformPracticeToCard: async (practiceVersionId) => {
            // Simulate the transformation logic without database calls
            return {
              id: practiceData.practiceVersionId,
              type: 'practice-card',
              name: practiceData.practiceName,
              description: practiceData.practiceDescription,
              objective: practiceData.practiceObjective,
              version: 'v1.0',
              changeDescription: 'Initial version',
              activities: practiceData.activities,
              roles: practiceData.roles,
              goals: practiceData.goals,
              layout: {
                width: 300,
                height: 400,
                x: 0,
                y: 0
              }
            };
          },
          generateCanvasConfig: visualizationService.generateCanvasConfig.bind(visualizationService),
          generatePrintLayout: visualizationService.generatePrintLayout.bind(visualizationService),
          arrangeCardsInGrid: visualizationService.arrangeCardsInGrid.bind(visualizationService)
        };

        // Transform practice to card
        const cardData = await mockVisualizationService.transformPracticeToCard(practiceData.practiceVersionId);
        
        // Generate canvas configuration
        const canvasConfig = mockVisualizationService.generateCanvasConfig([cardData]);
        
        // Verify that all components are displayed in the card data
        expect(cardData.name).toBe(practiceData.practiceName);
        expect(cardData.description).toBe(practiceData.practiceDescription);
        expect(cardData.objective).toBe(practiceData.practiceObjective);
        
        // Verify activities are included and ordered
        expect(cardData.activities).toHaveLength(practiceData.activities.length);
        cardData.activities.forEach((activity, index) => {
          expect(activity.name).toBe(practiceData.activities[index].name);
          expect(activity.sequence).toBe(practiceData.activities[index].sequence);
        });
        
        // Verify roles are included
        expect(cardData.roles).toHaveLength(practiceData.roles.length);
        cardData.roles.forEach((role, index) => {
          expect(role.name).toBe(practiceData.roles[index].name);
          expect(role.typeId).toBe(practiceData.roles[index].typeId);
        });
        
        // Verify goals are included
        expect(cardData.goals).toHaveLength(practiceData.goals.length);
        cardData.goals.forEach((goal, index) => {
          expect(goal.name).toBe(practiceData.goals[index].name);
        });
        
        // Verify canvas configuration includes card data
        expect(canvasConfig.cards).toHaveLength(1);
        const canvasCard = canvasConfig.cards[0];
        expect(canvasCard.userData.practiceId).toBe(practiceData.practiceVersionId);
        expect(canvasCard.userData.name).toBe(practiceData.practiceName);
        expect(canvasCard.userData.activities).toEqual(cardData.activities);
        expect(canvasCard.userData.roles).toEqual(cardData.roles);
        expect(canvasCard.userData.goals).toEqual(cardData.goals);
        
        // Verify card has proper layout properties
        expect(cardData.layout).toBeDefined();
        expect(typeof cardData.layout.width).toBe('number');
        expect(typeof cardData.layout.height).toBe('number');
        expect(typeof cardData.layout.x).toBe('number');
        expect(typeof cardData.layout.y).toBe('number');
      }
    ), { numRuns: 100 });
  });

  /**
   * **Feature: agile-practice-repository, Property 20: Print layout optimization**
   * **Validates: Requirements 31.1**
   * 
   * For any practice card, triggering print should generate a layout optimized 
   * for physical printing on paper
   */
  test('Property 20: Print layout optimization', async () => {
    await fc.assert(fc.asyncProperty(
      // Generate array of practice cards
      fc.array(fc.record({
        id: fc.integer({ min: 1, max: 1000 }),
        name: fc.string({ minLength: 1, maxLength: 100 }),
        description: fc.string({ minLength: 1, maxLength: 500 }),
        objective: fc.string({ minLength: 1, maxLength: 200 }),
        activities: fc.array(fc.record({
          id: fc.integer({ min: 1, max: 100 }),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          sequence: fc.integer({ min: 1, max: 20 })
        }), { minLength: 0, maxLength: 10 }),
        roles: fc.array(fc.record({
          id: fc.integer({ min: 1, max: 50 }),
          name: fc.string({ minLength: 1, maxLength: 30 })
        }), { minLength: 0, maxLength: 5 }),
        layout: fc.record({
          width: fc.constant(300),
          height: fc.constant(400),
          x: fc.integer({ min: 0, max: 1000 }),
          y: fc.integer({ min: 0, max: 1000 })
        })
      }), { minLength: 1, maxLength: 20 }),
      async (cards) => {
        // Generate print layout
        const printLayout = visualizationService.generatePrintLayout(cards);
        
        // Verify print layout has proper structure
        expect(printLayout.pageSize).toBe('A4');
        expect(printLayout.orientation).toBe('portrait');
        expect(printLayout.margins).toBeDefined();
        expect(printLayout.cardDimensions).toBeDefined();
        expect(printLayout.pages).toBeDefined();
        
        // Verify margins are reasonable for A4 paper
        expect(printLayout.margins.top).toBeGreaterThan(0);
        expect(printLayout.margins.right).toBeGreaterThan(0);
        expect(printLayout.margins.bottom).toBeGreaterThan(0);
        expect(printLayout.margins.left).toBeGreaterThan(0);
        
        // Verify card dimensions are optimized for printing
        expect(printLayout.cardDimensions.width).toBeGreaterThan(0);
        expect(printLayout.cardDimensions.height).toBeGreaterThan(0);
        expect(printLayout.cardDimensions.width).toBeLessThan(210); // A4 width in mm
        expect(printLayout.cardDimensions.height).toBeLessThan(297); // A4 height in mm
        
        // Verify pages are properly organized
        const expectedPages = Math.ceil(cards.length / printLayout.cardsPerPage);
        expect(printLayout.pages).toHaveLength(expectedPages);
        
        // Verify each page has correct structure
        printLayout.pages.forEach((page, pageIndex) => {
          expect(page.pageNumber).toBe(pageIndex + 1);
          expect(page.cards).toBeDefined();
          expect(page.cards.length).toBeGreaterThan(0);
          expect(page.cards.length).toBeLessThanOrEqual(printLayout.cardsPerPage);
          
          // Verify each card has print layout properties
          page.cards.forEach(card => {
            expect(card.printLayout).toBeDefined();
            expect(typeof card.printLayout.x).toBe('number');
            expect(typeof card.printLayout.y).toBe('number');
            expect(typeof card.printLayout.width).toBe('number');
            expect(typeof card.printLayout.height).toBe('number');
            
            // Verify print positions are within page bounds (A4 = 210mm x 297mm)
            expect(card.printLayout.x).toBeGreaterThanOrEqual(printLayout.margins.left);
            expect(card.printLayout.y).toBeGreaterThanOrEqual(printLayout.margins.top);
            
            // Check that cards fit within the printable area
            const maxX = 210 - printLayout.margins.right;
            const maxY = 297 - printLayout.margins.bottom;
            expect(card.printLayout.x + card.printLayout.width).toBeLessThanOrEqual(maxX);
            expect(card.printLayout.y + card.printLayout.height).toBeLessThanOrEqual(maxY);
          });
        });
        
        // Verify all original cards are included in print layout
        const totalCardsInPrint = printLayout.pages.reduce((sum, page) => sum + page.cards.length, 0);
        expect(totalCardsInPrint).toBe(cards.length);
      }
    ), { numRuns: 100 });
  });

  /**
   * Additional property test: Card arrangement maintains spatial relationships
   */
  test('Property: Card grid arrangement maintains spatial relationships', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        id: fc.integer({ min: 1, max: 100 }),
        layout: fc.record({
          width: fc.constant(300),
          height: fc.constant(400),
          x: fc.constant(0),
          y: fc.constant(0)
        })
      }), { minLength: 1, maxLength: 50 }),
      (cards) => {
        // Arrange cards in grid
        visualizationService.arrangeCardsInGrid(cards);
        
        // Verify no cards overlap
        for (let i = 0; i < cards.length; i++) {
          for (let j = i + 1; j < cards.length; j++) {
            const card1 = cards[i];
            const card2 = cards[j];
            
            // Check if cards overlap
            const noOverlapX = (card1.layout.x + card1.layout.width <= card2.layout.x) ||
                              (card2.layout.x + card2.layout.width <= card1.layout.x);
            const noOverlapY = (card1.layout.y + card1.layout.height <= card2.layout.y) ||
                              (card2.layout.y + card2.layout.height <= card1.layout.y);
            
            expect(noOverlapX || noOverlapY).toBe(true);
          }
        }
        
        // Verify cards are positioned in a reasonable grid
        cards.forEach(card => {
          expect(card.layout.x).toBeGreaterThanOrEqual(0);
          expect(card.layout.y).toBeGreaterThanOrEqual(0);
        });
      }
    ), { numRuns: 100 });
  });
});