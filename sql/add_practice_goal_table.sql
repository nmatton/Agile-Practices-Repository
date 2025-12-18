-- Add missing practiceGoal table for practice-goal relationships
-- This table links practices to their associated Agile Reference Objectives (Goals)

CREATE TABLE IF NOT EXISTS practiceGoal (
    practiceVersionId INTEGER NOT NULL REFERENCES practiceVersion(id) ON DELETE CASCADE,
    goalId INTEGER NOT NULL REFERENCES Goal(id) ON DELETE CASCADE,
    PRIMARY KEY (practiceVersionId, goalId)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_practicegoal_goal ON practiceGoal (goalId);
CREATE INDEX IF NOT EXISTS idx_practicegoal_practice ON practiceGoal (practiceVersionId);

-- Insert some sample data to link practices with goals
-- Assuming we have some practices and goals in the database
INSERT INTO practiceGoal (practiceVersionId, goalId)
SELECT pv.id, g.id
FROM practiceVersion pv
CROSS JOIN Goal g
WHERE pv.id <= 10 AND g.id <= 5  -- Link first 10 practice versions with first 5 goals
ON CONFLICT DO NOTHING;