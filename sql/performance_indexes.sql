-- Performance Optimization Indexes for APR Database
-- These indexes target frequently queried fields based on API usage patterns

-- Practice search and filtering indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_name_search ON Practice USING gin(to_tsvector('english', name));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_description_search ON Practice USING gin(to_tsvector('english', description));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_type ON Practice (typeId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_name_lower ON Practice (LOWER(name));

-- Practice version status and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practiceversion_status ON practiceVersion (status) WHERE status = 'Published';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practiceversion_lastupdated ON practiceVersion (lastUpdate DESC);

-- Team and membership queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teammember_person ON teamMember (personId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teammember_team ON teamMember (teamId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teammember_composite ON teamMember (teamId, personId);

-- Universe and practice relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_universe_team ON Universe (teamId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practiceversionuniverse_universe ON PracticeVersionUniverse (universeId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practiceversionuniverse_active ON PracticeVersionUniverse (universeId, isActive) WHERE isActive = true;

-- Affinity calculations (most performance critical)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personpracticeaffinity_composite ON personPracticeAffinity (personId, practiceVersionId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personpracticeaffinity_affinity ON personPracticeAffinity (affinity DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bfprofile_person ON bfProfile (personId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bfprofile_status ON bfProfile (statusId);

-- Authentication and session queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_person_email ON Person (email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_person_role ON Person (roleId);

-- Goal and practice associations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practicegoal_goal ON practiceGoal (goalId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practicegoal_practice ON practiceGoal (practiceVersionId);

-- Activity sequencing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practiceversionactivity_sequence ON practiceVersionActivity (practiceVersionId, sequence);

-- Recommendation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendation_type ON Recommendation (typeId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendation_status ON Recommendation (statusId);

-- Experience feedback
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_experiencefeedback_practice ON ExperienceFeedback (practiceVersionId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_experiencefeedback_person ON ExperienceFeedback (personId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_experiencefeedback_created ON ExperienceFeedback (createdAt DESC);

-- Survey and affinity data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_affinitysurveyresults_person ON affinitySurveyResults (personId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_affinitysurveyresults_item ON affinitySurveyResults (itemId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_affinitypractice_practice ON affinityPractice (practiceVersionId);

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_search_composite ON Practice (typeId, LOWER(name)) WHERE typeId IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_affinity_composite ON personPracticeAffinity (practiceVersionId, affinity DESC) WHERE affinity < 40;

-- Partial indexes for common filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_published ON practiceVersion (practiceId) WHERE status = 'Published';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_team_members ON teamMember (teamId) WHERE active = true;

-- Statistics update for query planner optimization
ANALYZE Practice;
ANALYZE practiceVersion;
ANALYZE personPracticeAffinity;
ANALYZE teamMember;
ANALYZE Universe;
ANALYZE PracticeVersionUniverse;