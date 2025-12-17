# Agile Practice Repository (APR)

A comprehensive knowledge management system for agile practices with personality-based recommendations and team collaboration features.

## Overview

The Agile Practice Repository (APR) is an intelligent platform that helps agile teams discover, evaluate, and adopt practices based on their team composition and personality profiles. The system combines a comprehensive practice database with a recommendation engine that uses Big Five personality traits to suggest practices with high team affinity, improving adoption success rates.

## Key Features

### 🏛️ Practice Repository
- **Comprehensive Practice Database**: Centralized collection of agile practices with detailed documentation
- **Practice Versioning**: Team-specific customizations while preserving original definitions
- **Rich Metadata**: Each practice includes objectives, benefits, pitfalls, activities, roles, and metrics
- **Search & Filtering**: Find practices by name, description, goals, or categories

### 👥 Team Collaboration
- **Team Management**: Create teams, invite members, and manage team universes
- **Practice Selection**: Add/remove practices from team universes with visual indicators
- **Team Dashboard**: View active practices, OAR coverage, and affinity insights
- **Universe System**: Customize practices within team contexts without affecting global definitions

### 🧠 Personality-Based Intelligence
- **Big Five Profiling**: Calculate personality scores (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism)
- **Affinity Scoring**: Automatic compatibility calculation between users/teams and practices
- **Smart Recommendations**: Suggest alternative practices with higher team affinity
- **Low-Affinity Alerts**: Visual indicators for practices that may be challenging for team members

### 📊 Analytics & Insights
- **OAR Coverage Tracking**: Monitor which Agile Reference Objectives are covered by selected practices
- **Team Affinity Statistics**: Aggregate individual affinities into team-level insights
- **Practice Analytics**: Detailed breakdowns of team compatibility with specific practices
- **Coverage Percentage**: Track how well your practice selection covers agile objectives

## Technology Stack

### Backend
- **Backend**: Node.js with Express framework
- **Database**: PostgreSQL with comprehensive schema
- **Session Storage**: Redis
- **Authentication**: bcrypt password hashing with session management
- **Testing**: Jest with fast-check for property-based testing

### Frontend
- **Framework**: React 18 with functional components and hooks
- **State Management**: Redux Toolkit for predictable state updates
- **Routing**: React Router for client-side navigation
- **HTTP Client**: Axios for API communication
- **Styling**: Custom CSS3 with responsive design (no external frameworks)
- **Build Tool**: Create React App with optimized production builds

## Project Structure

```
/
├── src/                 # Backend source code
│   ├── config/          # Database and Redis configuration
│   ├── models/          # Data models (Person, Team, Practice, etc.)
│   ├── routes/          # API routes (auth, teams, practices, etc.)
│   ├── services/        # Business logic services
│   ├── middleware/      # Express middleware (auth, validation)
│   ├── tests/           # Test files including property-based tests
│   └── server.js        # Main application server
├── client/              # React frontend application
│   ├── public/          # Static assets
│   ├── src/             # React source code
│   │   ├── components/  # React components organized by feature
│   │   ├── store/       # Redux store and slices
│   │   ├── App.js       # Main App component
│   │   └── index.js     # React entry point
│   ├── build/           # Production build output
│   └── package.json     # Frontend dependencies
├── sql/                 # Database schema and sample data
├── .env                 # Environment configuration
└── package.json         # Backend dependencies and scripts
```

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose

### Quick Start with Docker

1. Clone the repository
2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   npm run client:install
   ```

4. Start PostgreSQL and Redis with Docker:
   ```bash
   docker compose up -d
   ```

5. The database schema will be automatically loaded from `sql/db_sample.sql`

6. Start the development servers:

   **Backend API Server:**
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:3000`

   **Frontend React Server (in a new terminal):**
   ```bash
   npm run client
   ```
   The React app will be available at `http://localhost:3001`

### Full-Stack Development Workflow

For the complete development experience with both frontend and backend:

1. **Terminal 1 - Backend API:**
   ```bash
   npm run dev
   ```

2. **Terminal 2 - Frontend React App:**
   ```bash
   npm run client
   ```

3. **Access the Application:**
   - Frontend: http://localhost:3001 (React development server)
   - Backend API: http://localhost:3000 (Express server)
   - The React app will automatically proxy API requests to the backend

### Frontend-Only Development

If you're working primarily on the frontend and have a running backend elsewhere:

1. **Configure API URL:**
   ```bash
   # Create or update client/.env
   echo "REACT_APP_API_URL=http://your-backend-url:3000" > client/.env
   ```

2. **Start React Development Server:**
   ```bash
   npm run client
   ```

3. **Access Frontend:**
   - React app: http://localhost:3001
   - Hot reloading enabled for rapid development

### Manual Setup (without Docker)

If you prefer to install PostgreSQL and Redis manually:

1. Install PostgreSQL (v12+) and Redis (v6+)
2. Install dependencies:
   ```bash
   npm install
   npm run client:install
   ```
3. Create database and user:
   ```sql
   CREATE DATABASE agile_practice_repository;
   CREATE USER apr_user WITH PASSWORD 'apr_password';
   GRANT ALL PRIVILEGES ON DATABASE agile_practice_repository TO apr_user;
   ```
4. Load the schema: `psql -U apr_user -d agile_practice_repository -f sql/db_sample.sql`
5. Update `.env` with your database credentials
6. Start Redis server
7. Start development servers:
   ```bash
   # Terminal 1 - Backend
   npm run dev
   
   # Terminal 2 - Frontend
   npm run client
   ```

### Production Build & Deployment

To build and run the complete application for production:

1. **Build the React frontend:**
   ```bash
   npm run client:build
   ```

2. **Start the production server:**
   ```bash
   NODE_ENV=production npm start
   ```

The production server will serve both the API and the React app at `http://localhost:3000`.

### Docker Commands

- Start services: `docker-compose up -d`
- Stop services: `docker-compose down`
- View logs: `docker-compose logs -f`
- Reset data: `docker-compose down -v && docker-compose up -d`

### Available NPM Scripts

**Backend:**
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm test` - Run test suite
- `npm run migrate` - Run database migrations

**Frontend:**
- `npm run client` - Start React development server
- `npm run client:build` - Build React app for production
- `npm run client:install` - Install frontend dependencies

**Full-Stack:**
- `npm run client:install` - Install all dependencies (backend + frontend)

## Complete User Guide

### Getting Started

#### 1. User Registration & Authentication
```bash
# Register a new user
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "confirmPassword": "securepassword"
}

# Login
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "securepassword"
}

# Get current user info
GET /api/auth/me
```

#### 2. Team Management
```bash
# Create a team
POST /api/teams
{
  "name": "Development Team Alpha",
  "description": "Frontend development team"
}

# Get your teams
GET /api/teams/my-teams

# Invite team members
POST /api/teams/{teamId}/invite
{
  "email": "colleague@example.com"
}

# Join a team (after invitation)
POST /api/teams/{teamId}/join

# Get team details
GET /api/teams/{teamId}
```

### Practice Discovery & Management

#### 3. Browse Practices
```bash
# List all practices
GET /api/practices

# Search practices
GET /api/practices?search=standup

# Filter by goal
GET /api/practices?goalId=1

# Filter by type
GET /api/practices?typeId=1

# Get practice categories
GET /api/practices/categories

# Get detailed practice information
GET /api/practices/{practiceId}
```

#### 4. Practice Details Response
When you get practice details, you'll receive comprehensive information:
```json
{
  "id": 1,
  "name": "Daily Standup",
  "description": "Daily team synchronization meeting",
  "objective": "Communication",
  "typeName": "Meeting",
  "versions": [...],
  "guidelines": [
    {
      "name": "Scrum Guide",
      "description": "Official Scrum framework guide",
      "typename": "Book"
    }
  ],
  "benefits": [
    {
      "name": "Better Communication",
      "description": "Improves team communication and coordination"
    }
  ],
  "pitfalls": [
    {
      "name": "Too Long",
      "description": "Meeting runs longer than 15 minutes"
    }
  ],
  "activities": [
    {
      "name": "Check-in",
      "description": "Each team member shares updates",
      "sequence": 1
    }
  ],
  "roles": [...],
  "workproducts": [...],
  "metrics": [...],
  "goals": [...]
}
```

### Team Dashboard & Practice Selection

#### 5. Team Dashboard
```bash
# Get comprehensive team dashboard
GET /api/dashboard/teams/{teamId}
```

**Dashboard Response includes:**
- **Active Practices**: All practices selected by the team
- **OAR Coverage**: Which Agile Reference Objectives are covered
- **Team Affinity Stats**: Average affinity, low-affinity practice count
- **Visual Indicators**: Practices with low team affinity (< 40)

```json
{
  "success": true,
  "data": {
    "team": {...},
    "universes": [...],
    "activePractices": [
      {
        "id": 1,
        "name": "Daily Standup",
        "teamAffinity": 75,
        "hasLowAffinity": false,
        "lowAffinityMembers": []
      }
    ],
    "oarCoverage": {
      "covered": [
        {
          "goal": {"id": 1, "name": "Communication"},
          "practices": [...]
        }
      ],
      "uncovered": [...],
      "coveragePercentage": 60
    },
    "teamAffinityStats": {
      "averageAffinity": 68,
      "lowAffinityPractices": 2,
      "totalPractices": 8
    }
  }
}
```

#### 6. Practice Selection Management
```bash
# Add practice to team universe
POST /api/dashboard/teams/{teamId}/practices
{
  "practiceVersionId": 1,
  "universeId": 1
}

# Remove practice from team universe
DELETE /api/dashboard/teams/{teamId}/practices/{practiceVersionId}?universeId=1

# Get detailed affinity breakdown for a practice
GET /api/dashboard/teams/{teamId}/affinity/{practiceVersionId}
```

**Affinity Breakdown Response:**
```json
{
  "success": true,
  "data": {
    "practiceVersionId": 1,
    "practice": {...},
    "teamAffinity": 65,
    "memberCount": 5,
    "lowAffinityCount": 1,
    "hasLowAffinity": true,
    "memberAffinities": [
      {
        "memberId": 1,
        "memberName": "John Doe",
        "affinity": 85
      },
      {
        "memberId": 2,
        "memberName": "Jane Smith",
        "affinity": 35
      }
    ],
    "lowAffinityMembers": [
      {
        "memberId": 2,
        "memberName": "Jane Smith",
        "affinity": 35
      }
    ],
    "affinityDistribution": {
      "high": 3,    // >= 70
      "medium": 1,  // 40-69
      "low": 1      // < 40
    }
  }
}
```

### Personality Profiling & Affinity

#### 7. Big Five Personality Assessment
```bash
# Submit Big Five questionnaire results
POST /api/affinity/big-five
{
  "responses": [
    {"questionId": 1, "score": 4},
    {"questionId": 2, "score": 2},
    // ... more responses
  ]
}

# Get user's Big Five profile
GET /api/affinity/profile/{userId}

# Submit practice affinity survey
POST /api/affinity/survey
{
  "responses": [
    {"itemId": 1, "result": 3},
    {"itemId": 2, "result": 5}
  ]
}
```

#### 8. Understanding Affinity Scores

**Affinity Score Ranges:**
- **High Affinity (70-100)**: Practice aligns well with personality traits
- **Medium Affinity (40-69)**: Practice is moderately suitable
- **Low Affinity (0-39)**: Practice may be challenging to adopt

**Visual Indicators:**
- 🟢 **Green**: High team affinity, good fit
- 🟡 **Yellow**: Medium affinity, monitor adoption
- 🔴 **Red**: Low affinity, consider alternatives or extra support

### Advanced Features

#### 9. Practice Versioning & Customization
```bash
# Create custom practice version for your team
POST /api/practices/{practiceId}/versions
{
  "universeId": 1,
  "versionName": "Team Alpha Custom",
  "changeDescription": "Adapted for remote work"
}

# Get practice versions
GET /api/practices/{practiceId}/versions
```

#### 10. Universe Management
```bash
# Create team universe
POST /api/teams/{teamId}/universes
{
  "name": "Sprint 1 Context",
  "description": "Practices for our first sprint"
}

# Get team universes
GET /api/teams/{teamId}/universes
```

### Best Practices for Using APR

#### Team Setup Workflow
1. **Create Team**: Set up your team and invite members
2. **Complete Profiles**: Have all members complete Big Five and affinity surveys
3. **Browse Practices**: Explore the practice repository
4. **Check Dashboard**: Review team affinity and OAR coverage
5. **Select Practices**: Add practices with good team affinity
6. **Monitor Alerts**: Watch for low-affinity indicators
7. **Iterate**: Adjust practice selection based on team feedback

#### Interpreting Dashboard Insights
- **OAR Coverage**: Aim for balanced coverage across objectives
- **Team Affinity**: Higher average affinity indicates better adoption potential
- **Low-Affinity Alerts**: Consider providing extra support or finding alternatives
- **Member Breakdown**: Identify who might need additional help with specific practices

#### Making Practice Decisions
1. **Start with High-Affinity Practices**: Build confidence and momentum
2. **Address Coverage Gaps**: Ensure important objectives aren't missed
3. **Support Low-Affinity Members**: Provide coaching or pair them with high-affinity teammates
4. **Consider Context**: Adapt practices to your specific project needs
5. **Track Experience**: Log what works and what doesn't for future reference

## API Reference

### Authentication Endpoints
- `GET /health` - Health check endpoint
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user information

### Team Management Endpoints
- `POST /api/teams` - Create a new team
- `GET /api/teams/my-teams` - Get user's teams
- `GET /api/teams/{teamId}` - Get team details
- `POST /api/teams/{teamId}/invite` - Invite team member
- `POST /api/teams/{teamId}/join` - Join team
- `DELETE /api/teams/{teamId}/leave` - Leave team
- `GET /api/teams/{teamId}/universes` - Get team universes
- `POST /api/teams/{teamId}/universes` - Create team universe

### Practice Repository Endpoints
- `GET /api/practices` - List practices with filtering
- `GET /api/practices/search` - Search practices
- `GET /api/practices/categories` - Get practice categories
- `GET /api/practices/{id}` - Get practice details
- `POST /api/practices` - Create practice (experts only)
- `PUT /api/practices/{id}` - Update practice (experts only)
- `DELETE /api/practices/{id}` - Delete practice (experts only)

### Dashboard Endpoints
- `GET /api/dashboard/teams/{teamId}` - Get team dashboard
- `POST /api/dashboard/teams/{teamId}/practices` - Add practice to team
- `DELETE /api/dashboard/teams/{teamId}/practices/{practiceVersionId}` - Remove practice
- `GET /api/dashboard/teams/{teamId}/affinity/{practiceVersionId}` - Get affinity breakdown

### Affinity & Personality Endpoints
- `POST /api/affinity/big-five` - Submit Big Five assessment
- `GET /api/affinity/profile/{userId}` - Get personality profile
- `POST /api/affinity/survey` - Submit practice affinity survey
- `GET /api/affinity/recommendations/{teamId}` - Get practice recommendations

## Testing

The APR system includes comprehensive testing with both unit tests and property-based tests to ensure correctness and reliability.

### Running Tests

```bash
# Run all tests
npm test

# Run specific test patterns
npm test -- --testPathPattern=property.test.js
npm test -- --testPathPattern=team.property.test.js
npm test -- --testPathPattern=integration.test.js

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (development)
npm test -- --watch
```

### Property-Based Testing

The project uses **fast-check** for property-based testing, which validates system behavior across thousands of randomly generated inputs. Key properties tested include:

#### Authentication & User Management
- **Property 1**: User registration creates valid records with correct timestamps
- **Property 2**: Invalid registration attempts are properly rejected
- **Property 3**: Valid authentication grants appropriate access
- **Property 4**: Invalid authentication is consistently denied

#### Team Management
- **Property 5**: Team creation establishes membership correctly
- **Property 6**: Team invitations are sent to valid email addresses
- **Property 17**: Practice selection adds practices to team universe ✅

#### Practice Management
- **Property 7**: Practice listing shows required fields only
- **Property 8**: Practice details display complete information
- **Property 9**: Associated records are properly displayed
- **Property 10**: Search returns matching practices
- **Property 11**: Goal filtering works correctly
- **Property 12**: New practices have draft status initially
- **Property 13**: Publication changes visibility appropriately

#### Personality & Affinity System
- **Property 14**: Big Five calculation and storage works correctly
- **Property 15**: Affinity recalculation triggers on profile updates
- **Property 16**: Team affinity aggregation functions properly

### Test Categories

1. **Unit Tests**: Test individual functions and methods
2. **Integration Tests**: Test API endpoints and database interactions
3. **Property Tests**: Validate universal properties across random inputs
4. **Mock Tests**: Test with simulated external dependencies

### Test Data Management

Tests use isolated test data with proper cleanup:
- Unique identifiers prevent test interference
- Foreign key constraints are respected during cleanup
- Mock databases simulate real behavior without side effects

## Database Schema

The APR system uses a sophisticated PostgreSQL schema designed to support versioning, team collaboration, and personality-based recommendations.

### Core Entity Groups

#### User & Team Management
- **Person**: User accounts with authentication and role assignment
- **Team**: Collaborative groups with descriptions
- **teamMember**: Many-to-many relationship for team membership
- **Universe**: Team-specific customization contexts

#### Practice & Method System
- **Practice**: Abstract practice definitions with objectives and types
- **practiceVersion**: Concrete implementations within team universes
- **Method**: Collections of related practices
- **methodVersion**: Versioned method implementations
- **Activity**: Reusable work units sequenced within practices

#### Knowledge Base Components
- **Guideline**: External resources (articles, books, links)
- **Benefit**: Expected positive outcomes with descriptions
- **Pitfall**: Common implementation problems and warnings
- **Recommendation**: Context-specific advice with types
- **Goal**: Agile Reference Objectives for filtering and tracking

#### Assessment & Measurement
- **Metric**: Quantifiable measures with units and formulas
- **Role**: Defined responsibilities within practices
- **Workproduct**: Artifacts produced during practice execution
- **Context**: Situational factors affecting practice application

#### Personality & Affinity System
- **bfProfile**: Big Five personality scores (O, C, E, A, N)
- **personPracticeAffinity**: Individual compatibility scores
- **affinitySurvey**: Questionnaire items for data collection
- **affinitySurveyVersion**: Versioned survey items
- **affinitySurveyResults**: User responses to surveys
- **affinityPractice**: Links between survey items and practices

### Key Design Patterns

#### Universe Pattern
Each team operates within its own "Universe," allowing practice customization without affecting global definitions. This enables:
- Team-specific adaptations
- Preservation of original knowledge
- Isolated experimentation
- Version control for changes

#### Versioning System
Both practices and methods support comprehensive versioning:
- Change tracking with timestamps
- User attribution for modifications
- Rollback capabilities
- Audit trails for compliance

#### Affinity Calculation
Sophisticated questionnaire system where:
- Survey items link to specific practices
- Personality traits map to practice characteristics
- Team affinities aggregate individual scores
- Recommendations consider context and compatibility

### Sample Data

The `sql/db_sample.sql` file includes:
- Complete schema with constraints and indexes
- Sample practices from popular agile frameworks
- Test users and teams for development
- Survey questions for personality assessment
- Reference data for goals and contexts

### Database Relationships

```
Person ──┐
         ├── Team ──── Universe ──── practiceVersion ──── Practice
         │                     │
         └── bfProfile          └── PracticeVersionUniverse
              │
              └── personPracticeAffinity
```

The schema supports complex queries for:
- Team affinity calculations
- OAR coverage analysis
- Practice recommendation generation
- Historical change tracking

## Development

### Development Commands
```bash
# Start development server with auto-reload
npm run dev

# Run database migrations
npm run migrate

# Run test suite
npm test

# Run tests with coverage report
npm run test:coverage

# Start production server
npm start

# Lint code
npm run lint

# Format code
npm run format
```

### Development Workflow

1. **Setup Environment**
   ```bash
   git clone <repository>
   cd agile-practice-repository
   npm install
   docker-compose up -d
   ```

2. **Database Development**
   - Schema changes go in `sql/` directory
   - Use migrations for incremental changes
   - Test with sample data in `sql/db_sample.sql`

3. **API Development**
   - Routes in `src/routes/`
   - Models in `src/models/`
   - Middleware in `src/middleware/`
   - Follow RESTful conventions

4. **Testing Strategy**
   - Write property-based tests for core logic
   - Integration tests for API endpoints
   - Mock external dependencies
   - Maintain high test coverage

5. **Code Quality**
   - Use ESLint for code consistency
   - Follow established patterns
   - Document complex algorithms
   - Write meaningful commit messages

### Architecture Decisions

#### Why Property-Based Testing?
- Validates behavior across thousands of inputs
- Catches edge cases missed by example-based tests
- Provides mathematical confidence in correctness
- Complements traditional unit testing

#### Why Universe Pattern?
- Enables team customization without global impact
- Supports practice evolution and experimentation
- Maintains audit trails for compliance
- Scales to multiple teams and contexts

#### Why Big Five Personality Model?
- Scientifically validated personality framework
- Stable across cultures and contexts
- Predictive of work preferences and behaviors
- Enables data-driven practice recommendations

### Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request with clear description

### Troubleshooting

#### Common Issues

**Database Connection Errors**
```bash
# Check if PostgreSQL is running
docker-compose ps

# Reset database
docker-compose down -v
docker-compose up -d
```

**Redis Connection Issues**
```bash
# Check Redis status
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

**Test Failures**
```bash
# Run specific test file
npm test -- --testPathPattern=team.property.test.js

# Run with verbose output
npm test -- --verbose

# Check for database cleanup issues
npm test -- --runInBand
```

**Frontend Development Issues**
```bash
# Frontend server won't start
cd client
npm install
npm start

# API requests failing from frontend
# Check that backend is running on port 3000
npm run dev

# CORS errors in browser console
# Ensure FRONTEND_URL is set correctly in .env
FRONTEND_URL=http://localhost:3001

# React build fails
cd client
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Port Conflicts**
- Default API port: 3000
- Default Frontend port: 3001
- Default PostgreSQL port: 5432
- Default Redis port: 6379
- Update `docker-compose.yml` or `.env` if needed

**Environment Configuration Issues**
```bash
# Backend .env file should include:
FRONTEND_URL=http://localhost:3001

# Frontend .env file (client/.env) should include:
REACT_APP_API_URL=http://localhost:3000
```

### Performance Considerations

- **Database Indexing**: Key fields are indexed for query performance
- **Connection Pooling**: PostgreSQL connections are pooled and reused
- **Caching Strategy**: Redis caches session data and frequent queries
- **Affinity Calculation**: Optimized algorithms for team-level aggregation
- **Pagination**: Large result sets are paginated to prevent memory issues

## Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   # Set production environment variables
   NODE_ENV=production
   DATABASE_URL=postgresql://user:pass@host:port/db
   REDIS_URL=redis://host:port
   SESSION_SECRET=your-secure-secret
   ```

2. **Database Setup**
   ```bash
   # Run migrations
   npm run migrate

   # Load initial data
   psql $DATABASE_URL -f sql/db_sample.sql
   ```

3. **Security Considerations**
   - Use HTTPS in production
   - Set secure session cookies
   - Implement rate limiting
   - Regular security updates
   - Monitor for vulnerabilities

### Monitoring & Logging

- Health check endpoint: `GET /health`
- Application logs via console
- Database query logging (development)
- Error tracking and alerting
- Performance metrics collection

## License

MIT License - see LICENSE file for details.

## Support

For questions, issues, or contributions:
- Create an issue on GitHub
- Check existing documentation
- Review test cases for usage examples
- Consult the API reference above

---

**Built with ❤️ for agile teams seeking data-driven practice adoption**