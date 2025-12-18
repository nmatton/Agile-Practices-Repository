# Team Invitations Feature

## Overview
The team invitation system allows team members to invite colleagues via email. The system intelligently handles both existing and new users.

## Key Features

### 1. Email Invitation Tracking
- All sent invitations are stored in the `teamInvitation` table
- Tracks invitation status: `pending`, `accepted`, or `expired`
- Records who sent the invitation and when
- Tracks when invitations are resent
- **Fixed**: Proper field mapping ensures reliable data handling

### 2. Smart User Handling

#### Existing Users
When inviting an email that already has an account:
- User is **immediately added** to the team
- No email is sent (user already has access)
- Invitation is created with `accepted` status

#### New Users
When inviting an email without an account:
- Invitation email is sent with team details
- Invitation stored as `pending`
- When user registers with that email, they are **automatically added** to all teams that invited them

### 3. Resend Functionality
- Team members can resend pending invitations
- Updates the `lastSentAt` timestamp
- Sends a new invitation email

## Database Schema

```sql
CREATE TABLE teamInvitation (
    id SERIAL PRIMARY KEY,
    teamId INTEGER NOT NULL REFERENCES Team(id) ON DELETE CASCADE,
    inviterPersonId INTEGER NOT NULL REFERENCES Person(id) ON DELETE CASCADE,
    invitedEmail VARCHAR(255) NOT NULL,
    invitedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastSentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    acceptedAt TIMESTAMP NULL,
    acceptedByPersonId INTEGER NULL REFERENCES Person(id) ON DELETE SET NULL,
    UNIQUE(teamId, invitedEmail, status)
);
```

## API Endpoints

### POST /api/teams/:teamId/invite
Send an invitation to join a team.

**Request Body:**
```json
{
  "email": "colleague@example.com"
}
```

**Response (New User):**
```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "invitedEmail": "colleague@example.com",
    "teamName": "My Team",
    "invitation": { ... }
  }
}
```

**Response (Existing User):**
```json
{
  "success": true,
  "message": "User added to team immediately (existing account)",
  "data": {
    "invitedEmail": "colleague@example.com",
    "teamName": "My Team",
    "addedImmediately": true
  }
}
```

### POST /api/teams/:teamId/invite/:invitationId/resend
Resend a pending invitation.

**Response:**
```json
{
  "success": true,
  "message": "Invitation resent successfully",
  "data": {
    "invitation": { ... }
  }
}
```

### GET /api/teams/:teamId
Get team details including invitations.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "My Team",
    "members": [...],
    "invitations": [
      {
        "id": 1,
        "invitedEmail": "colleague@example.com",
        "status": "pending",
        "invitedAt": "2025-12-18T10:00:00Z",
        "lastSentAt": "2025-12-18T10:00:00Z",
        "inviterName": "John Doe"
      }
    ]
  }
}
```

## Frontend Components

### TeamDetail Component
Displays team information including:
- List of current team members
- Pending invitations section with:
  - Email address
  - Invitation date
  - Who sent the invitation
  - Resend button
- Accepted invitations (collapsible section)

### InviteMemberModal Component
Modal dialog for inviting new members:
- Email input with validation
- Handles both new and existing users
- Shows appropriate success messages

## User Registration Flow

When a user registers:
1. Account is created
2. System checks for pending invitations matching the email
3. All pending invitations are automatically accepted
4. User is added to all teams that invited them
5. Registration response includes list of joined teams

**Registration Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": { ... },
  "joinedTeams": [
    {
      "teamId": 1,
      "teamName": "Development Team",
      "success": true
    }
  ]
}
```

## Models

### TeamInvitation Model
Key methods:
- `create()` - Create new invitation or update existing
- `findByTeamId()` - Get all invitations for a team
- `findPendingByEmail()` - Find pending invitations for an email
- `updateLastSent()` - Update resend timestamp
- `accept()` - Accept invitation and add user to team
- `acceptAllPendingForEmail()` - Auto-accept all pending invitations for an email

## Security Considerations

- Only team members can send invitations
- Invitations are tied to specific teams
- Email validation prevents invalid addresses
- Duplicate invitations update existing records
- Foreign key constraints ensure data integrity

## Future Enhancements

Potential improvements:
- Invitation expiration (auto-expire after X days)
- Invitation cancellation
- Bulk invitations
- Custom invitation messages
- Invitation acceptance confirmation emails
- Team invitation limits/quotas
