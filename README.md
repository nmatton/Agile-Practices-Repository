# Agile Practice Repository (APR)

A comprehensive knowledge management system for agile practices with personality-based recommendations.

## Overview

The Agile Practice Repository combines a comprehensive practice database with an intelligent recommendation engine that uses Big Five personality profiling to calculate affinity scores between users/teams and agile practices, enabling data-driven practice selection and adoption.

## Features

- **Practice Repository**: Centralized collection of Agile practices with detailed documentation
- **Team Integration**: Multi-team support with practice customization per team context
- **Personality-Based Recommendations**: Uses Big Five personality profiling to suggest practices that fit team members' preferences
- **Context-Aware Customization**: Practices can be adapted based on project context
- **Experience Logging**: Teams can log their experiences and share insights about practice effectiveness

## Technology Stack

- **Backend**: Node.js with Express framework
- **Database**: PostgreSQL with comprehensive schema
- **Session Storage**: Redis
- **Authentication**: bcrypt password hashing with session management
- **Testing**: Jest with fast-check for property-based testing

## Project Structure

```
/
├── src/
│   ├── config/          # Database and Redis configuration
│   ├── models/          # Data models (Person, etc.)
│   ├── routes/          # API routes (auth, etc.)
│   ├── tests/           # Test files including property-based tests
│   └── server.js        # Main application server
├── sql/                 # Database schema and sample data
├── .env                 # Environment configuration
└── package.json         # Dependencies and scripts
```

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose

### Quick Start with Docker

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start PostgreSQL and Redis with Docker:
   ```bash
   docker compose up -d
   ```

4. The database schema will be automatically loaded from `sql/db_sample.sql`

5. Start the development server:
   ```bash
   npm run dev
   ```

### Manual Setup (without Docker)

If you prefer to install PostgreSQL and Redis manually:

1. Install PostgreSQL (v12+) and Redis (v6+)
2. Create database and user:
   ```sql
   CREATE DATABASE agile_practice_repository;
   CREATE USER apr_user WITH PASSWORD 'apr_password';
   GRANT ALL PRIVILEGES ON DATABASE agile_practice_repository TO apr_user;
   ```
3. Load the schema: `psql -U apr_user -d agile_practice_repository -f sql/db_sample.sql`
4. Update `.env` with your database credentials
5. Start Redis server
6. Run `npm run dev`

### Docker Commands

- Start services: `docker-compose up -d`
- Stop services: `docker-compose down`
- View logs: `docker-compose logs -f`
- Reset data: `docker-compose down -v && docker-compose up -d`

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user information

## Testing

Run all tests:
```bash
npm test
```

Run property-based tests:
```bash
npm test -- --testPathPattern=property.test.js
```

The project includes comprehensive property-based tests that validate:
- User registration creates valid records
- Invalid email formats are rejected
- Duplicate emails are prevented
- All mandatory fields are required

## Database Schema

The database includes comprehensive tables for:
- User management (Person, Team, teamMember)
- Practice management (Practice, practiceVersion, Method)
- Knowledge base (Guideline, Benefit, Pitfall, Recommendation)
- Personality profiling (bfProfile, affinitySurvey)
- Affinity calculations (personPracticeAffinity)

See `sql/db_sample.sql` for the complete schema with sample data.

## Development

- `npm run dev` - Start development server with nodemon
- `npm run migrate` - Run database migrations
- `npm test` - Run test suite
- `npm run test:coverage` - Run tests with coverage report

## License

MIT License - see LICENSE file for details.