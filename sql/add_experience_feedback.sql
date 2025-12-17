-- Migration script to add ExperienceFeedback table
-- This should be run after the main db_sample.sql script

-- Create ExperienceFeedback table
CREATE TABLE ExperienceFeedback (
    id SERIAL PRIMARY KEY,
    practiceVersionId INTEGER NOT NULL REFERENCES practiceVersion(id) ON DELETE CASCADE,
    personId INTEGER NOT NULL REFERENCES Person(id) ON DELETE CASCADE,
    projectContext TEXT,
    feedbackText TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    isValidated BOOLEAN DEFAULT false,
    validatedBy INTEGER REFERENCES Person(id),
    validatedAt TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_experiencefeedback_practiceversion ON ExperienceFeedback (practiceVersionId);
CREATE INDEX idx_experiencefeedback_person ON ExperienceFeedback (personId);
CREATE INDEX idx_experiencefeedback_validated ON ExperienceFeedback (isValidated);
CREATE INDEX idx_experiencefeedback_created ON ExperienceFeedback (createdAt);

-- Insert sample feedback data
INSERT INTO ExperienceFeedback (practiceVersionId, personId, projectContext, feedbackText, rating, isValidated, validatedBy, validatedAt, createdAt) VALUES
(1, 2, 'E-commerce platform development', 'Daily stand-ups really helped our team stay synchronized. We found that keeping it to exactly 15 minutes was crucial for maintaining engagement.', 4, true, 1, '2024-01-15 10:00:00', '2024-01-14 16:30:00'),
(2, 3, 'Legacy system refactoring', 'TDD was challenging at first with our legacy codebase, but it significantly reduced our bug count over time. The initial investment in learning was worth it.', 5, true, 1, '2024-01-16 09:00:00', '2024-01-15 14:20:00'),
(4, 2, 'Mobile app development', 'Pair programming worked well for complex algorithms, but we found it less effective for routine tasks. Context matters a lot.', 3, true, 1, '2024-01-17 11:00:00', '2024-01-16 13:45:00'),
(1, 4, 'Distributed team project', 'Our daily stand-ups became much more effective when we started using a shared visual board. Time zone differences were still challenging.', 4, false, null, null, '2024-01-18 09:15:00'),
(3, 3, 'Agile transformation project', 'Sprint retrospectives have been game-changing for our team culture. We now address issues proactively instead of letting them fester.', 5, true, 1, '2024-01-19 10:30:00', '2024-01-18 15:00:00');

-- Add some unvalidated feedback for testing moderation
INSERT INTO ExperienceFeedback (practiceVersionId, personId, projectContext, feedbackText, rating, isValidated, createdAt) VALUES
(2, 4, 'Startup MVP development', 'TDD seems like overkill for our fast-paced environment. We need to ship features quickly and iterate based on user feedback.', 2, false, '2024-01-20 11:00:00'),
(4, 2, 'Open source contribution', 'Pair programming sessions via screen sharing have been surprisingly effective. The knowledge transfer is invaluable.', 4, false, '2024-01-20 14:30:00');