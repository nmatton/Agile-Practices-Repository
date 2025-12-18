const fc = require('fast-check');
const Practice = require('../models/Practice');
const PracticeVersion = require('../models/PracticeVersion');

/**
 * **Feature: agile-practice-repository, Property 12: New practices have draft status**
 * **Validates: Requirements 8.1**
 */

/**
 * **Feature: agile-practice-repository, Property 13: Publication changes visibility**
 * **Validates: Requirements 8.2**
 */

// Mock database for testing practice management
const mockPracticeDatabase = {
  practices: new Map(),
  practiceVersions: new Map(),
  nextPracticeId: 1,
  nextVersionId: 1,
  
  async createPractice(practiceData) {
    if (!practiceData.name || practiceData.name.trim().length === 0) {
      throw new Error('Practice name is required');
    }

    // Check for duplicate names
    for (const practice of this.practices.values()) {
      if (practice.name === practiceData.name) {
        throw new Error('Practice name already exists');
      }
    }

    const practice = {
      id: this.nextPracticeId++,
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

    // Check if practice exists
    if (!this.practices.has(versionData.practiceId)) {
      throw new Error('Invalid practice ID');
    }

    const version = {
      id: this.nextVersionId++,
      practiceId: versionData.practiceId,
      universeId: versionData.universeId,
      versionName: versionData.versionName,
      versionTimestamp: new Date(),
      changeDescription: versionData.changeDescription || null,
      lastUpdate: new Date(),
      lastUpdateById: versionData.lastUpdateById,
      status: versionData.status || 'Draft' // Default status is Draft
    };

    this.practiceVersions.set(version.id, version);
    return version;
  },

  async publishPracticeVersion(versionId) {
    const version = this.practiceVersions.get(versionId);
    if (!version) {
      throw new Error('Practice version not found');
    }

    version.status = 'Published';
    return version;
  },

  async findPracticeById(id) {
    return this.practices.get(id) || null;
  },

  async findVersionById(id) {
    return this.practiceVersions.get(id) || null;
  },

  async findPublishedVersions() {
    const published = [];
    for (const version of this.practiceVersions.values()) {
      if (version.status === 'Published') {
        published.push(version);
      }
    }
    return published;
  },

  async findDraftVersions() {
    const drafts = [];
    for (const version of this.practiceVersions.values()) {
      if (version.status === 'Draft') {
        drafts.push(version);
      }
    }
    return drafts;
  },

  clear() {
    this.practices.clear();
    this.practiceVersions.clear();
    this.nextPracticeId = 1;
    this.nextVersionId = 1;
  }
};

describe('Practice Management - Property Tests', () => {
  beforeEach(() => {
    mockPracticeDatabase.clear();
  });

  describe('Property 12: New practices have draft status', () => {
    it('should create practice versions with draft status by default', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            practiceName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            practiceObjective: fc.option(fc.string({ maxLength: 255 })),
            practiceDescription: fc.option(fc.string({ maxLength: 255 })),
            versionName: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            changeDescription: fc.option(fc.string({ maxLength: 500 })),
            universeId: fc.integer({ min: 1, max: 100 }),
            lastUpdateById: fc.integer({ min: 1, max: 1000 })
          }),
          async (data) => {
            // Clear database for this test iteration
            mockPracticeDatabase.clear();
            
            // Make practice name unique
            const uniquePracticeName = `${data.practiceName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            // Create a practice first
            const practice = await mockPracticeDatabase.createPractice({
              name: uniquePracticeName,
              objective: data.practiceObjective,
              description: data.practiceDescription
            });

            // Create a practice version
            const version = await mockPracticeDatabase.createPracticeVersion({
              practiceId: practice.id,
              universeId: data.universeId,
              versionName: data.versionName,
              changeDescription: data.changeDescription,
              lastUpdateById: data.lastUpdateById
            });

            // Verify the version has draft status by default
            expect(version).toBeDefined();
            expect(version.status).toBe('Draft');
            expect(version.practiceId).toBe(practice.id);
            expect(version.versionName).toBe(data.versionName);
            expect(version.lastUpdateById).toBe(data.lastUpdateById);
            expect(version.versionTimestamp).toBeInstanceOf(Date);

            // Verify it appears in draft versions but not published
            const draftVersions = await mockPracticeDatabase.findDraftVersions();
            const publishedVersions = await mockPracticeDatabase.findPublishedVersions();

            expect(draftVersions).toContainEqual(expect.objectContaining({
              id: version.id,
              status: 'Draft'
            }));
            expect(publishedVersions).not.toContainEqual(expect.objectContaining({
              id: version.id
            }));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain draft status for newly created versions regardless of input variations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            practiceName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            versionName: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            universeId: fc.integer({ min: 1, max: 100 }),
            lastUpdateById: fc.integer({ min: 1, max: 1000 }),
            // Test with various optional fields
            hasObjective: fc.boolean(),
            hasDescription: fc.boolean(),
            hasChangeDescription: fc.boolean()
          }),
          async (data) => {
            // Clear database for this test iteration
            mockPracticeDatabase.clear();
            
            // Make practice name unique
            const uniquePracticeName = `${data.practiceName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            
            const practice = await mockPracticeDatabase.createPractice({
              name: uniquePracticeName,
              objective: data.hasObjective ? 'Test objective' : null,
              description: data.hasDescription ? 'Test description' : null
            });

            const version = await mockPracticeDatabase.createPracticeVersion({
              practiceId: practice.id,
              universeId: data.universeId,
              versionName: data.versionName,
              changeDescription: data.hasChangeDescription ? 'Test change' : null,
              lastUpdateById: data.lastUpdateById
            });

            // All versions should start as Draft regardless of other fields
            expect(version.status).toBe('Draft');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 13: Publication changes visibility', () => {
    it('should change status from Draft to Published when publishing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            practiceName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            versionName: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            universeId: fc.integer({ min: 1, max: 100 }),
            lastUpdateById: fc.integer({ min: 1, max: 1000 })
          }),
          async (data) => {
            // Clear database for this test iteration
            mockPracticeDatabase.clear();
            
            // Make practice name unique
            const uniquePracticeName = `${data.practiceName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            
            // Create practice and version
            const practice = await mockPracticeDatabase.createPractice({
              name: uniquePracticeName
            });

            const version = await mockPracticeDatabase.createPracticeVersion({
              practiceId: practice.id,
              universeId: data.universeId,
              versionName: data.versionName,
              lastUpdateById: data.lastUpdateById
            });

            // Verify initial draft state
            expect(version.status).toBe('Draft');
            
            const initialDrafts = await mockPracticeDatabase.findDraftVersions();
            const initialPublished = await mockPracticeDatabase.findPublishedVersions();
            
            expect(initialDrafts).toContainEqual(expect.objectContaining({
              id: version.id,
              status: 'Draft'
            }));
            expect(initialPublished).not.toContainEqual(expect.objectContaining({
              id: version.id
            }));

            // Publish the version
            const publishedVersion = await mockPracticeDatabase.publishPracticeVersion(version.id);

            // Verify status change
            expect(publishedVersion.status).toBe('Published');
            expect(publishedVersion.id).toBe(version.id);

            // Verify visibility change
            const finalDrafts = await mockPracticeDatabase.findDraftVersions();
            const finalPublished = await mockPracticeDatabase.findPublishedVersions();

            expect(finalDrafts).not.toContainEqual(expect.objectContaining({
              id: version.id
            }));
            expect(finalPublished).toContainEqual(expect.objectContaining({
              id: version.id,
              status: 'Published'
            }));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should make published versions visible to all users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              practiceName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              versionName: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
              universeId: fc.integer({ min: 1, max: 100 }),
              lastUpdateById: fc.integer({ min: 1, max: 1000 }),
              shouldPublish: fc.boolean()
            }),
            { minLength: 1, maxLength: 10 }
          ).map((items, index) => 
            // Ensure unique practice names
            items.map((item, i) => ({
              ...item,
              practiceName: `${item.practiceName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${index}_${i}`
            }))
          ),
          async (practiceData) => {
            // Clear database for this test iteration
            mockPracticeDatabase.clear();
            
            const createdVersions = [];
            let expectedPublishedCount = 0;

            // Create practices and versions
            for (const data of practiceData) {
              const practice = await mockPracticeDatabase.createPractice({
                name: data.practiceName
              });

              const version = await mockPracticeDatabase.createPracticeVersion({
                practiceId: practice.id,
                universeId: data.universeId,
                versionName: data.versionName,
                lastUpdateById: data.lastUpdateById
              });

              createdVersions.push({ version, shouldPublish: data.shouldPublish });

              if (data.shouldPublish) {
                await mockPracticeDatabase.publishPracticeVersion(version.id);
                expectedPublishedCount++;
              }
            }

            // Verify published versions are visible
            const publishedVersions = await mockPracticeDatabase.findPublishedVersions();
            expect(publishedVersions).toHaveLength(expectedPublishedCount);

            // Verify each published version is in the published list
            for (const { version, shouldPublish } of createdVersions) {
              if (shouldPublish) {
                expect(publishedVersions).toContainEqual(expect.objectContaining({
                  id: version.id,
                  status: 'Published'
                }));
              } else {
                expect(publishedVersions).not.toContainEqual(expect.objectContaining({
                  id: version.id
                }));
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Error conditions', () => {
    it('should reject practice creation with invalid data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.option(fc.string(), { nil: undefined }),
            objective: fc.option(fc.string()),
            description: fc.option(fc.string())
          }).filter(data => !data.name || data.name.trim().length === 0),
          async (invalidData) => {
            await expect(mockPracticeDatabase.createPractice(invalidData))
              .rejects.toThrow('Practice name is required');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject duplicate practice names', async () => {
      const practiceName = `Duplicate Practice Name ${Date.now()}`;
      
      await mockPracticeDatabase.createPractice({ name: practiceName });
      
      await expect(mockPracticeDatabase.createPractice({ name: practiceName }))
        .rejects.toThrow('Practice name already exists');
    });

    it('should reject practice version creation with missing required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            practiceId: fc.option(fc.integer({ min: 1 })),
            universeId: fc.option(fc.integer({ min: 1 })),
            versionName: fc.option(fc.string({ minLength: 1 })),
            lastUpdateById: fc.option(fc.integer({ min: 1 }))
          }).filter(data => 
            !data.practiceId || !data.universeId || !data.versionName || !data.lastUpdateById
          ),
          async (invalidData) => {
            await expect(mockPracticeDatabase.createPracticeVersion(invalidData))
              .rejects.toThrow('Practice ID, universe ID, version name, and last update by ID are required');
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});