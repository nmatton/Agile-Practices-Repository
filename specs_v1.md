# Requirements: Agile Practice Repository (APR)

## 1. Access and User Management

**US 1: New User Registration**
* **Context:** As a new visitor, I want to create a personal account using my email and password.
* **EARS Criteria:**
    * WHEN a visitor submits the registration form with a valid email and matching passwords, THE SYSTEM SHALL create a new `Person` record and record the creation timestamp.
    * WHEN the email format is invalid or already exists in the `Person` table, THE SYSTEM SHALL display a specific validation error.
    * WHEN registration is successful, THE SYSTEM SHALL redirect the user to the login page without automatically logging them in.

**US 2: User Login**
* **Context:** As a registered user, I want to log in to access my personal space.
* **EARS Criteria:**
    * WHEN a registered user submits valid credentials, THE SYSTEM SHALL authenticate the session.
    * WHEN the password hash does not match the stored hash, THE SYSTEM SHALL deny access.

**US 13: Team Management**
* **Context:** As a connected user, I want to create a team and invite others.
* **EARS Criteria:**
    * WHEN a user creates a team, THE SYSTEM SHALL create a new `Team` record and assign the creator as a `teamMember`.
    * WHEN a user invites a colleague by email, THE SYSTEM SHALL send an invitation to join the specific `Team`.

## 2. Repository Consultation (Read Access)

**US 3: Practice List View**
* **Context:** As a visitor, I want to see the list of all published practices.
* **EARS Criteria:**
    * WHEN a visitor accesses the main repository page, THE SYSTEM SHALL display a list of practices showing only the Name and Description.

**US 4, 5, 6, 24: Practice Detail View**
* **Context:** As a visitor, I want to consult the detailed sheet of a practice.
* **EARS Criteria:**
    * WHEN a practice is selected, THE SYSTEM SHALL display "Basic Information" (Description, Context, Objectives, Roles).
    * WHEN the detail view loads, THE SYSTEM SHALL fetch and display associated `Guideline`, `Benefit`, and `Pitfall` records, 
    * WHEN the detail view loads, THE SYSTEM SHALL display an ordered list of `Activity` items linked to that practice version,.
    * WHEN the practice has defined associations, THE SYSTEM SHALL display clickable links to equivalent or associated practices.

**US 10: Search**
* **Context:** As a visitor, I want to find practices by keyword.
* **EARS Criteria:**
    * WHEN a user enters a search term, THE SYSTEM SHALL return practices where the Name or Description contains the term.

**US 11, 32: Filtering**
* **Context:** As a practitioner, I want to filter practices by Agile Reference Objectives (OAR) or tags,.
* **EARS Criteria:**
    * WHEN a user selects an OAR (Goal), THE SYSTEM SHALL filter the list to show only practices linked to that `Goal`.
    * WHEN a user selects a category/tag, THE SYSTEM SHALL display practices associated with that `practiceTag`,.

## 3. Contribution and Content Management (Expert)

**US 7, 25: Create and Publish**
* **Context:** As an expert, I want to manage the lifecycle of a practice,.
* **EARS Criteria:**
    * WHEN an expert saves a new practice, THE SYSTEM SHALL store it with a "Draft" status.
    * WHEN an expert triggers publication, THE SYSTEM SHALL change the status to "Published" making it visible to visitors.

**US 26, 27, 28, 29: Practice Enrichment**
* **Context:** As an expert, I want to link resources, benefits, pitfalls, and OARs, .
* **EARS Criteria:**
    * WHEN editing a practice, THE SYSTEM SHALL allow the user to link `Guideline` records (articles, books),.
    * WHEN editing a practice, THE SYSTEM SHALL allow the user to associate `Benefit` records mapped to process objectives,.
    * WHEN editing a practice, THE SYSTEM SHALL allow the user to associate `Pitfall` records, .
    * WHEN editing a practice, THE SYSTEM SHALL allow the user to link the practice to specific `Goal` records (OARs), .

## 4. Personalization and Recommendations

**US 12, 21: Personality Profiling**
* **Context:** As a user, I want to calculate my Big Five profile and practice affinity.
* **EARS Criteria:**
    * WHEN a user submits the Big Five questionnaire, THE SYSTEM SHALL calculate the O, C, E, A, N scores and store them in `bfProfile`,
    * WHEN a user submits the affinity questionnaire, THE SYSTEM SHALL store specific `personPracticeAffinity` records,

**US 33, 34: Affinity Calculation**
* **Context:** As the system, I want to calculate compatibility scores.
* **EARS Criteria:**
    * WHEN a user profile is updated, THE SYSTEM SHALL recalculate the affinity score between the user and available practices.
    * WHEN a team is viewed, THE SYSTEM SHALL aggregate individual affinities into a global "Team Affinity Score".

**US 15, 16, 17: Team Dashboard**
* **Context:** As a team member, I want to manage our active practices and view coverage.
* **EARS Criteria:**
    * WHEN a user selects a practice for their team, THE SYSTEM SHALL add it to the team's `Universe` or context list.
    * WHEN viewing the dashboard, THE SYSTEM SHALL visualize which OARs are covered by the selected practices.
    * WHEN a selected practice has a low affinity with a team member, THE SYSTEM SHALL display a visual alert indicator.

**US 18, 23: Recommendations**
* **Context:** As a team member, I want suggestions for better-fitting practices.
* **EARS Criteria:**
    * WHEN a practice poses an affinity problem, THE SYSTEM SHALL recommend alternative practices that cover the same OARs but have higher team affinity.
    * WHEN a user flags a practice as difficult, THE SYSTEM SHALL suggest alternative activities or `Recommendation` items,.

## 5. Visual Modeling

**US 19, 20: Graphical Cards**
* **Context:** As a visitor, I want to view and print practices as graphical cards.
* **EARS Criteria:**
    * WHEN the graphical view is requested, THE SYSTEM SHALL render the practice components (Activities, Roles) using a card metaphor (Draw2d).
    * WHEN the print action is triggered, THE SYSTEM SHALL generate a layout optimized for physical printing.