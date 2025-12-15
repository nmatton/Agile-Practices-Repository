# Implementation Tasks: Agile Practice Repository (APR)

## Phase 1: Foundation (Sprint 1-2)

### Task 1.1: Database Initialization
* **Description:** Set up the PostgreSQL database and apply the schema from `DB_APR.DBML`.
* **Sub-tasks:**
    * [cite_start]Create Core Tables: `Person`, `Team`, `teamMember`[cite: 2, 3, 4].
    * [cite_start]Create Practice Tables: `Practice`, `practiceVersion`, `Universe`[cite: 7, 9, 10].
    * [cite_start]Create Lookup Tables: `practiceType`, `roleType`, `bfProfileStatus`[cite: 25, 30].

### Task 1.2: Authentication Module (US 1, US 2)
* **Description:** Backend API for user access.
* **Sub-tasks:**
    * [cite_start]Implement Registration API (`POST /register`) with email validation and password hashing[cite: 2, 41].
    * [cite_start]Implement Login API (`POST /login`) with session token generation[cite: 41].

## Phase 2: Core Repository Features (Sprint 3-4)

### Task 2.1: Practice CRUD (US 7, US 25)
* **Description:** Enable experts to create and publish practices.
* **Sub-tasks:**
    * [cite_start]Create API endpoints for Practice creation (Draft status)[cite: 42].
    * [cite_start]Implement "Publish" workflow to make practices visible[cite: 44].
    * UI: Form for basic practice details.

### Task 2.2: Content Enrichment (US 26-31)
* **Description:** Add details to practice versions.
* **Sub-tasks:**
    * [cite_start]Implement CRUD for `Guideline` (Resources) and `Activity`[cite: 18, 21].
    * [cite_start]Implement CRUD for `Benefit` and `Pitfall`[cite: 19, 20].
    * [cite_start]Implement Linking to `Goal` (OARs) and `Metric`[cite: 16, 34].

### Task 2.3: Read Views (US 3, US 4)
* **Description:** Public facing views for visitors.
* **Sub-tasks:**
    * [cite_start]Implement "List View" (Grid of practices)[cite: 41].
    * [cite_start]Implement "Detail View" (Full sheet with tabs for Activities/Guides)[cite: 41].

## Phase 3: Discovery & Context (Sprint 5)

### Task 3.1: Search & Filter (US 10, US 11)
* **Description:** Finding practices easily.
* **Sub-tasks:**
    * [cite_start]Implement backend search query (Name/Description)[cite: 42].
    * [cite_start]Implement OAR (`Goal`) filtering logic[cite: 42].
    * UI: Search bar and Sidebar filters.

## Phase 4: Personalization Engine (Sprint 6-7)

### Task 4.1: Surveys (US 12, US 21)
* **Description:** Collecting user data.
* **Sub-tasks:**
    * Implement Big Five Questionnaire UI.
    * [cite_start]Backend: Calculate and store `bfProfile` (O,C,E,A,N)[cite: 5, 42].

### Task 4.2: Team Logic (US 13)
* **Description:** Grouping users.
* **Sub-tasks:**
    * [cite_start]Implement "Create Team" and "Invite Member" features[cite: 43].
    * [cite_start]Backend: Manage `teamMember` relationships[cite: 4].

### Task 4.3: Affinity Algorithm (US 33, US 34)
* **Description:** The core mathematical logic.
* **Sub-tasks:**
    * [cite_start]Develop algorithm to score `bfProfile` vs `Practice` attributes[cite: 45].
    * [cite_start]Develop aggregation logic for Team Scores[cite: 45].

## Phase 5: Dashboard & Decision Support (Sprint 8-9)

### Task 5.1: Team Dashboard (US 15, US 16)
* **Description:** The team's workspace.
* **Sub-tasks:**
    * [cite_start]UI: Widget list of active practices[cite: 43].
    * [cite_start]UI: Chart/Graph showing OAR (`Goal`) coverage[cite: 43].
    * Backend: Query to fetch active `practiceVersion`s for a Team's `Universe`.

### Task 5.2: Recommendation System (US 17, US 18)
* **Description:** Intelligent suggestions.
* **Sub-tasks:**
    * [cite_start]UI: Add "Warning" icon for low affinity practices[cite: 43].
    * [cite_start]Backend: Query for "Alternative Practices" (Same Goal, Higher Affinity)[cite: 43].

## Phase 6: Visuals (Sprint 10)

### Task 6.1: Graphical Modeler (US 19, US 20)
* **Description:** Visualizing practices.
* **Sub-tasks:**
    * [cite_start]Integrate `Draw2d` Javascript library[cite: 110].
    * Map `practiceVersion` data to card nodes.
    * [cite_start]Implement "Print" CSS for physical cards[cite: 44].