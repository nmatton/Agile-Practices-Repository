-- Add team invitation tracking table
-- This table tracks all email invitations sent to join teams

CREATE TABLE IF NOT EXISTS teamInvitation (
    id SERIAL PRIMARY KEY,
    teamId INTEGER NOT NULL REFERENCES Team(id) ON DELETE CASCADE,
    inviterPersonId INTEGER NOT NULL REFERENCES Person(id) ON DELETE CASCADE,
    invitedEmail VARCHAR(255) NOT NULL,
    invitedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastSentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    acceptedAt TIMESTAMP NULL,
    acceptedByPersonId INTEGER NULL REFERENCES Person(id) ON DELETE SET NULL,
    
    -- Ensure we don't have duplicate pending invitations for same email/team
    UNIQUE(teamId, invitedEmail, status)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_team_invitation_email ON teamInvitation(invitedEmail);
CREATE INDEX IF NOT EXISTS idx_team_invitation_team ON teamInvitation(teamId);
CREATE INDEX IF NOT EXISTS idx_team_invitation_status ON teamInvitation(status);

-- Add some sample data for testing
-- Note: These will only be inserted if the Person and Team tables have corresponding records

-- Sample invitations (will fail gracefully if referenced records don't exist)
DO $$
BEGIN
    -- Only insert if we have sample teams and users
    IF EXISTS (SELECT 1 FROM Team WHERE id = 1) AND EXISTS (SELECT 1 FROM Person WHERE id = 1) THEN
        INSERT INTO teamInvitation (teamId, inviterPersonId, invitedEmail, status) 
        VALUES 
            (1, 1, 'newmember@example.com', 'pending'),
            (1, 1, 'colleague@example.com', 'pending')
        ON CONFLICT (teamId, invitedEmail, status) DO NOTHING;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if sample data can't be inserted
        NULL;
END $$;