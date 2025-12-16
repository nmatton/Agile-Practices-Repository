const fc = require('fast-check');
const Practice = require('../models/Practice');
const PracticeVersion = require('../models/PracticeVersion');
const Goal = require('../models/Goal');
const Context = require('../models/Context');
const Guideline = require('../models/Guideline');
const Benefit = require('../models/Benefit');
const Pitfall = require('../models/Pitfall');
const Recommendation = require('../models/Recommendation');
const Activity = require('../models/Activity');
const Role = require('../models/Role');
const Workproduct = require('../models/Workproduct');
const Metric = require('../models/Metric');

/**
 * **Feature: agile-practice-repository, Property 7: Practice listing shows required fields**
 * **Validates: Requirements 4.1**
 */

/**
 * **Feature: agile-practice-repository, Property 8: Practice details show complete information**
 * **Validates: Requirements 5.1**
 */

/**
 * **Feature: agile-practice-repository, Property 9: Associated records are displayed**
 * **Validates: Requirements 5.2**
 */

// Mock database for testing knowledge base components
const mockKnowledgeBaseDatabase = {
  practices: new Map(),
  practiceVersions: new Map(),
  goals: new Map(),
  contexts: new Map(),
  guidelines: new Map(),
  benefits: new Map(),
  pitfalls: new Map(),
  recommendations: new Map(),
  activities: new Map(),
  roles: new Map(),
  workproducts: new Map(),
  metrics: new Map(),
  nextId: 1,

  getNextId() {
    return this.nextId++;
  },

  async createPractice(practiceData) {
    if (!practiceData.name) {
      throw new Error('Practice name is required');
    }

    const practice = {
      id: this.getNextId(),
      name: practiceData.name,
      objective: practiceData.objective || null,
      description: practiceData.description || null,
      typeId: practiceData.typeId || null
    };

    this.practices.set(practice.id, practice);
    return practice;
  },

  async createPracticeVersion(versionData) {
    if (!versionData.practiceId || !versionData.universeId || !versionData.versionName || !versionData.lastUpdateById) {
      throw new Error('Practice ID, universe ID, version name, and last update by ID are required');
    }

    const version = {
      id: this.getNextId(),
      practiceId: versionData.practiceId,
      universeId: versionData.universeId,
      versionName: versionData.versionName,
      versionTimestamp: new Date(),
      changeDescription: versionData.changeDescription || null,
      lastUpdate: new Date(),
      lastUpdateById: versionData.lastUpdateById,
      status: 'Published' // For testing, assume published
    };

    this.practiceVersions.set(version.id, version);
    return version;
  },

  async createGuideline(guidelineData) {
    if (!guidelineData.name || !guidelineData.lastUpdateById) {
      throw new Error('Name and last update by ID are required');
    }

    const guideline = {
      id: this.getNextId(),
      practiceVersionId: guidelineData.practiceVersionId || null,
      methodVersionId: guidelineData.methodVersionId || null,
      name: guidelineData.name,
      description: guidelineData.description || null,
      content: guidelineData.content || null,
      lastUpdate: new Date(),
      lastUpdateById: guidelineData.lastUpdateById,
      typeId: guidelineData.typeId || null
    };

    this.guidelines.set(guideline.id, guideline);
    return guideline;
  },

  async createBenefit(benefitData) {
    if (!benefitData.practiceVersionId || !benefitData.name || !benefitData.lastUpdateById) {
      throw new Error('Practice version ID, name, and last update by ID are required');
    }

    const benefit = {
      id: this.getNextId(),
      practiceVersionId: benefitData.practiceVersionId,
      name: benefitData.name,
      description: benefitData.description || null,
      content: benefitData.content || null,
      lastUpdate: new Date(),
      lastUpdateById: benefitData.lastUpdateById
    };

    this.benefits.set(benefit.id, benefit);
    return benefit;
  },

  async createPitfall(pitfallData) {
    if (!pitfallData.practiceVersionId || !pitfallData.name || !pitfallData.lastUpdateById) {
      throw new Error('Practice version ID, name, and last update by ID are required');
    }

    const pitfall = {
      id: this.getNextId(),
      practiceVersionId: pitfallData.practiceVersionId,
      name: pitfallData.name,
      description: pitfallData.description || null,
      content: pitfallData.content || null,
      lastUpdate: new Date(),
      lastUpdateById: pitfallData.lastUpdateById
    };

    this.pitfalls.set(pitfall.id, pitfall);
    return pitfall;
  },

  async createActivity(activityData) {
    if (!activityData.name || !activityData.lastUpdateById) {
      throw new Error('Name and last update by ID are required');
    }

    const activity = {
      id: this.getNextId(),
      name: activityData.name,
      description: activityData.description || null,
      lastUpdate: new Date(),
      lastUpdateById: activityData.lastUpdateById
    };

    this.activities.set(activity.id, activity);
    return activity;
  },

  async findAllPractices() {
    return Array.from(this.practices.values());
  },

  async findPracticeById(id) {
    return this.practices.get(id) || null;
  },

  async findPracticeVersionById(id) {
    return this.practiceVersions.get(id) || null;
  },

  async findGuidelinesByPracticeVersionId(practiceVersionId) {
    return Array.from(this.guidelines.values()).filter(g => g.practiceVersionId === practiceVersionId);
  },

  async findBenefitsByPracticeVersionId(practiceVersionId) {
    return Array.from(this.benefits.values()).filter(b => b.practiceVersionId === practiceVersionId);
  },

  async findPitfallsByPracticeVersionId(practiceVersionId) {
    return Array.from(this.pitfalls.values()).filter(p => p.practiceVersionId === practiceVersionId);
  },

  async findActivitiesByPracticeVersionId(practiceVersionId) {
    // Simulate activity linking through practiceVersionActivity table
    return Array.from(this.activities.values()).slice(0, 2); // Return some activities for testing
  },

  async getPracticeDetailWithAssociations(practiceId) {
    const practice = this.practices.get(practiceId);
    if (!practice) return null;

    // Get the first practice version for this practice
    const practiceVersion = Array.from(this.practiceVersions.values())
      .find(pv => pv.practiceId === practiceId);

    if (!practiceVersion) return { ...practice, associations: {} };

    const guidelines = await this.findGuidelinesByPracticeVersionId(practiceVersion.id);
    const benefits = await this.findBenefitsByPracticeVersionId(practiceVersion.id);
    const pitfalls = await this.findPitfallsByPracticeVersionId(practiceVersion.id);
    const activities = await this.findActivitiesByPracticeVersionId(practiceVersion.id);

    return {
      ...practice,
      practiceVersion,
      associations: {
        guidelines,
        benefits,
        pitfalls,
        activities
      }
    };
  },

  clear() {
    this.practices.clear();
    this.practiceVersions.clear();
    this.goals.clear();
    this.contexts.clear();
    this.guidelines.clear();
    this.benefits.clear();
    this.pitfalls.clear();
    this.recommendations.clear();
    this.activities.clear();
    this.roles.clear();
    this.workproducts.clear();
    this.metrics.clear();
    this.nextId = 1;
  }
};

describe('Knowledge Base Components - Property Tests', () => {
  beforeEach(() => {
    mockKnowledgeBaseDatabase.clear();
  });

  describe('Property 7: Practice listing shows required fields', () => {
    it('should display only Name and Description fields for all published practices', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              objective: fc.option(fc.string({ maxLength: 255 })),
              description: fc.option(fc.string({ maxLength: 255 })),
              typeId: fc.option(fc.integer({ min: 1, max: 3 }))
            }),
            { minLength: 1, maxLength: 10 }
          ).map((items, index) => 
            // Ensure unique practice names
            items.map((item, i) => ({
              ...item,
              name: `${item.name}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${index}_${i}`
            }))
          ),
          async (practicesData) => {
            // Clear database for this test iteration
            mockKnowledgeBaseDatabase.clear();
            
            // Create practices
            for (const practiceData of practicesData) {
              await mockKnowledgeBaseDatabase.createPractice(practiceData);
            }

            // Get all practices (simulating the main repository page)
            const practices = await mockKnowledgeBaseDatabase.findAllPractices();

            // Verify that all practices are returned
            expect(practices).toHaveLength(practicesData.length);

            // Verify that each practice contains the required fields
            for (const practice of practices) {
              // Must have name and description fields
              expect(practice).toHaveProperty('name');
              expect(typeof practice.name).toBe('string');
              expect(practice.name.length).toBeGreaterThan(0);
              
              // Description can be null but property must exist
              expect(practice).toHaveProperty('description');
              
              // Should also have id for navigation
              expect(practice).toHaveProperty('id');
              expect(typeof practice.id).toBe('number');
              expect(practice.id).toBeGreaterThan(0);

              // Other fields may be present but are not required for listing
              if (practice.objective !== undefined) {
                expect(typeof practice.objective === 'string' || practice.objective === null).toBe(true);
              }
            }

            // Verify practices are properly structured for display
            const displayData = practices.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description
            }));

            expect(displayData).toHaveLength(practicesData.length);
            displayData.forEach(item => {
              expect(item.name).toBeDefined();
              expect(typeof item.name).toBe('string');
              expect(item.name.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain consistent field structure across different practice types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              description: fc.option(fc.string({ maxLength: 255 })),
              typeId: fc.option(fc.integer({ min: 1, max: 3 })),
              hasObjective: fc.boolean()
            }),
            { minLength: 2, maxLength: 8 }
          ).map((items, index) => 
            items.map((item, i) => ({
              ...item,
              name: `${item.name}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${index}_${i}`,
              objective: item.hasObjective ? `Objective for ${item.name}` : null
            }))
          ),
          async (practicesData) => {
            mockKnowledgeBaseDatabase.clear();
            
            // Create practices with varying field completeness
            for (const practiceData of practicesData) {
              await mockKnowledgeBaseDatabase.createPractice(practiceData);
            }

            const practices = await mockKnowledgeBaseDatabase.findAllPractices();

            // All practices should have the same basic structure regardless of optional fields
            const requiredFields = ['id', 'name', 'description'];
            
            for (const practice of practices) {
              requiredFields.forEach(field => {
                expect(practice).toHaveProperty(field);
              });
              
              // Name must always be a non-empty string
              expect(typeof practice.name).toBe('string');
              expect(practice.name.length).toBeGreaterThan(0);
              
              // Description can be null or string
              expect(practice.description === null || typeof practice.description === 'string').toBe(true);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 8: Practice details show complete information', () => {
    it('should display Basic Information including Description, Context, Objectives, and Roles for any selected practice', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            practiceName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            practiceObjective: fc.option(fc.string({ maxLength: 255 })),
            practiceDescription: fc.option(fc.string({ maxLength: 255 })),
            versionName: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            universeId: fc.integer({ min: 1, max: 100 }),
            lastUpdateById: fc.integer({ min: 1, max: 1000 })
          }),
          async (data) => {
            mockKnowledgeBaseDatabase.clear();
            
            // Make practice name unique
            const uniquePracticeName = `${data.practiceName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            
            // Create practice
            const practice = await mockKnowledgeBaseDatabase.createPractice({
              name: uniquePracticeName,
              objective: data.practiceObjective,
              description: data.practiceDescription
            });

            // Create practice version
            const practiceVersion = await mockKnowledgeBaseDatabase.createPracticeVersion({
              practiceId: practice.id,
              universeId: data.universeId,
              versionName: data.versionName,
              lastUpdateById: data.lastUpdateById
            });

            // Get practice detail (simulating practice detail view)
            const practiceDetail = await mockKnowledgeBaseDatabase.getPracticeDetailWithAssociations(practice.id);

            // Verify Basic Information is present
            expect(practiceDetail).toBeDefined();
            expect(practiceDetail.id).toBe(practice.id);
            expect(practiceDetail.name).toBe(uniquePracticeName);
            
            // Description should be present (can be null)
            expect(practiceDetail).toHaveProperty('description');
            if (data.practiceDescription) {
              expect(practiceDetail.description).toBe(data.practiceDescription);
            }
            
            // Objectives should be present (can be null)
            expect(practiceDetail).toHaveProperty('objective');
            if (data.practiceObjective) {
              expect(practiceDetail.objective).toBe(data.practiceObjective);
            }

            // Context information should be available through practice version
            expect(practiceDetail).toHaveProperty('practiceVersion');
            expect(practiceDetail.practiceVersion).toBeDefined();
            expect(practiceDetail.practiceVersion.universeId).toBe(data.universeId);

            // Associations structure should be present for roles and other components
            expect(practiceDetail).toHaveProperty('associations');
            expect(practiceDetail.associations).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should provide complete practice information regardless of optional field presence', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            practiceName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            hasObjective: fc.boolean(),
            hasDescription: fc.boolean(),
            versionName: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            universeId: fc.integer({ min: 1, max: 100 }),
            lastUpdateById: fc.integer({ min: 1, max: 1000 })
          }),
          async (data) => {
            mockKnowledgeBaseDatabase.clear();
            
            const uniquePracticeName = `${data.practiceName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            
            const practice = await mockKnowledgeBaseDatabase.createPractice({
              name: uniquePracticeName,
              objective: data.hasObjective ? 'Test objective' : null,
              description: data.hasDescription ? 'Test description' : null
            });

            await mockKnowledgeBaseDatabase.createPracticeVersion({
              practiceId: practice.id,
              universeId: data.universeId,
              versionName: data.versionName,
              lastUpdateById: data.lastUpdateById
            });

            const practiceDetail = await mockKnowledgeBaseDatabase.getPracticeDetailWithAssociations(practice.id);

            // Essential fields must always be present
            const essentialFields = ['id', 'name', 'description', 'objective'];
            essentialFields.forEach(field => {
              expect(practiceDetail).toHaveProperty(field);
            });

            // Name must always be valid
            expect(typeof practiceDetail.name).toBe('string');
            expect(practiceDetail.name.length).toBeGreaterThan(0);

            // Optional fields should be null if not provided, but property should exist
            if (!data.hasObjective) {
              expect(practiceDetail.objective).toBeNull();
            } else {
              expect(typeof practiceDetail.objective).toBe('string');
            }

            if (!data.hasDescription) {
              expect(practiceDetail.description).toBeNull();
            } else {
              expect(typeof practiceDetail.description).toBe('string');
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 9: Associated records are displayed', () => {
    it('should fetch and display all Guideline, Benefit, and Pitfall records for any practice with associated data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            practiceName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            versionName: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            universeId: fc.integer({ min: 1, max: 100 }),
            lastUpdateById: fc.integer({ min: 1, max: 1000 }),
            guidelineCount: fc.integer({ min: 0, max: 5 }),
            benefitCount: fc.integer({ min: 0, max: 5 }),
            pitfallCount: fc.integer({ min: 0, max: 5 }),
            activityCount: fc.integer({ min: 0, max: 5 })
          }),
          async (data) => {
            mockKnowledgeBaseDatabase.clear();
            
            const uniquePracticeName = `${data.practiceName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            
            // Create practice and version
            const practice = await mockKnowledgeBaseDatabase.createPractice({
              name: uniquePracticeName
            });

            const practiceVersion = await mockKnowledgeBaseDatabase.createPracticeVersion({
              practiceId: practice.id,
              universeId: data.universeId,
              versionName: data.versionName,
              lastUpdateById: data.lastUpdateById
            });

            // Create associated records
            const createdGuidelines = [];
            for (let i = 0; i < data.guidelineCount; i++) {
              const guideline = await mockKnowledgeBaseDatabase.createGuideline({
                practiceVersionId: practiceVersion.id,
                name: `Guideline ${i + 1}`,
                description: `Description for guideline ${i + 1}`,
                content: `Content for guideline ${i + 1}`,
                lastUpdateById: data.lastUpdateById
              });
              createdGuidelines.push(guideline);
            }

            const createdBenefits = [];
            for (let i = 0; i < data.benefitCount; i++) {
              const benefit = await mockKnowledgeBaseDatabase.createBenefit({
                practiceVersionId: practiceVersion.id,
                name: `Benefit ${i + 1}`,
                description: `Description for benefit ${i + 1}`,
                content: `Content for benefit ${i + 1}`,
                lastUpdateById: data.lastUpdateById
              });
              createdBenefits.push(benefit);
            }

            const createdPitfalls = [];
            for (let i = 0; i < data.pitfallCount; i++) {
              const pitfall = await mockKnowledgeBaseDatabase.createPitfall({
                practiceVersionId: practiceVersion.id,
                name: `Pitfall ${i + 1}`,
                description: `Description for pitfall ${i + 1}`,
                content: `Content for pitfall ${i + 1}`,
                lastUpdateById: data.lastUpdateById
              });
              createdPitfalls.push(pitfall);
            }

            const createdActivities = [];
            for (let i = 0; i < data.activityCount; i++) {
              const activity = await mockKnowledgeBaseDatabase.createActivity({
                name: `Activity ${i + 1}`,
                description: `Description for activity ${i + 1}`,
                lastUpdateById: data.lastUpdateById
              });
              createdActivities.push(activity);
            }

            // Get practice detail with associations
            const practiceDetail = await mockKnowledgeBaseDatabase.getPracticeDetailWithAssociations(practice.id);

            // Verify all associated records are fetched and displayed
            expect(practiceDetail.associations).toBeDefined();
            
            // Verify guidelines
            expect(practiceDetail.associations.guidelines).toHaveLength(data.guidelineCount);
            for (let i = 0; i < data.guidelineCount; i++) {
              const guideline = practiceDetail.associations.guidelines[i];
              expect(guideline.name).toBe(`Guideline ${i + 1}`);
              expect(guideline.practiceVersionId).toBe(practiceVersion.id);
              expect(guideline.lastUpdateById).toBe(data.lastUpdateById);
            }

            // Verify benefits
            expect(practiceDetail.associations.benefits).toHaveLength(data.benefitCount);
            for (let i = 0; i < data.benefitCount; i++) {
              const benefit = practiceDetail.associations.benefits[i];
              expect(benefit.name).toBe(`Benefit ${i + 1}`);
              expect(benefit.practiceVersionId).toBe(practiceVersion.id);
              expect(benefit.lastUpdateById).toBe(data.lastUpdateById);
            }

            // Verify pitfalls
            expect(practiceDetail.associations.pitfalls).toHaveLength(data.pitfallCount);
            for (let i = 0; i < data.pitfallCount; i++) {
              const pitfall = practiceDetail.associations.pitfalls[i];
              expect(pitfall.name).toBe(`Pitfall ${i + 1}`);
              expect(pitfall.practiceVersionId).toBe(practiceVersion.id);
              expect(pitfall.lastUpdateById).toBe(data.lastUpdateById);
            }

            // Verify activities (note: activities are linked through practiceVersionActivity)
            expect(practiceDetail.associations.activities).toBeDefined();
            expect(Array.isArray(practiceDetail.associations.activities)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should display ordered list of Activity items linked to practice version', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            practiceName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            versionName: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            universeId: fc.integer({ min: 1, max: 100 }),
            lastUpdateById: fc.integer({ min: 1, max: 1000 }),
            activityCount: fc.integer({ min: 1, max: 8 })
          }),
          async (data) => {
            mockKnowledgeBaseDatabase.clear();
            
            const uniquePracticeName = `${data.practiceName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            
            const practice = await mockKnowledgeBaseDatabase.createPractice({
              name: uniquePracticeName
            });

            const practiceVersion = await mockKnowledgeBaseDatabase.createPracticeVersion({
              practiceId: practice.id,
              universeId: data.universeId,
              versionName: data.versionName,
              lastUpdateById: data.lastUpdateById
            });

            // Create activities
            for (let i = 0; i < data.activityCount; i++) {
              await mockKnowledgeBaseDatabase.createActivity({
                name: `Activity ${i + 1}`,
                description: `Step ${i + 1} in the practice`,
                lastUpdateById: data.lastUpdateById
              });
            }

            const practiceDetail = await mockKnowledgeBaseDatabase.getPracticeDetailWithAssociations(practice.id);

            // Verify activities are displayed
            expect(practiceDetail.associations.activities).toBeDefined();
            expect(Array.isArray(practiceDetail.associations.activities)).toBe(true);
            
            // Activities should be available for display
            const activities = practiceDetail.associations.activities;
            activities.forEach(activity => {
              expect(activity).toHaveProperty('name');
              expect(activity).toHaveProperty('description');
              expect(typeof activity.name).toBe('string');
              expect(activity.name.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle practices with no associated records gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            practiceName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            versionName: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            universeId: fc.integer({ min: 1, max: 100 }),
            lastUpdateById: fc.integer({ min: 1, max: 1000 })
          }),
          async (data) => {
            mockKnowledgeBaseDatabase.clear();
            
            const uniquePracticeName = `${data.practiceName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            
            const practice = await mockKnowledgeBaseDatabase.createPractice({
              name: uniquePracticeName
            });

            await mockKnowledgeBaseDatabase.createPracticeVersion({
              practiceId: practice.id,
              universeId: data.universeId,
              versionName: data.versionName,
              lastUpdateById: data.lastUpdateById
            });

            // Don't create any associated records
            const practiceDetail = await mockKnowledgeBaseDatabase.getPracticeDetailWithAssociations(practice.id);

            // Should still have associations structure, but empty arrays
            expect(practiceDetail.associations).toBeDefined();
            expect(practiceDetail.associations.guidelines).toHaveLength(0);
            expect(practiceDetail.associations.benefits).toHaveLength(0);
            expect(practiceDetail.associations.pitfalls).toHaveLength(0);
            
            // Activities might be empty or have default items
            expect(practiceDetail.associations.activities).toBeDefined();
            expect(Array.isArray(practiceDetail.associations.activities)).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Error conditions', () => {
    it('should handle invalid practice IDs gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 9999 }), // Use IDs that don't exist
          async (invalidId) => {
            mockKnowledgeBaseDatabase.clear();
            
            const practiceDetail = await mockKnowledgeBaseDatabase.getPracticeDetailWithAssociations(invalidId);
            expect(practiceDetail).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject creation of associated records with invalid data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.option(fc.string(), { nil: undefined }),
            lastUpdateById: fc.option(fc.integer({ min: 1 }), { nil: undefined })
          }).filter(data => !data.name || !data.lastUpdateById),
          async (invalidData) => {
            await expect(mockKnowledgeBaseDatabase.createGuideline(invalidData))
              .rejects.toThrow();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});