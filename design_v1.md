# Design Document: Agile Practice Repository (APR)

## 1. System Architecture

The APR is designed as a centralized knowledge base with a dynamic recommendation engine.

* **Frontend:** Web-based interface. [cite_start]Key component is the **Practice Modeler**, developed in Javascript using **Draw2d** to render practices as "cards"[cite: 110].
* **Backend:** RESTful API responsible for user management, CRUD operations on practices, and the mathematical affinity engine.
* [cite_start]**Database:** Relational Database (PostgreSQL recommended based on schema syntax)[cite: 2].

## 2. Data Models (Schema Analysis)

The database schema (`DB_APR.DBML`) supports three main functional areas:

### 2.1. User & Team Management
* [cite_start]**Person:** Stores identity and authentication (`passwordHash`)[cite: 2].
* [cite_start]**Team:** Represents a group of people (e.g., a dev team)[cite: 3].
* [cite_start]**teamMember:** A many-to-many join table linking People to Teams[cite: 4].
* [cite_start]**bfProfile:** Stores the "Big Five" personality traits (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism) linked to a Person[cite: 5].

### 2.2. Practice Core & Versioning
The system uses a "Universe" concept to allow teams to customize practices without altering the global definition.
* [cite_start]**Universe:** Represents a context (Team, Project) where practices are customized[cite: 7].
* [cite_start]**Practice:** The abstract container for a practice (e.g., "Daily Standup")[cite: 9].
* [cite_start]**practiceVersion:** The concrete implementation of a practice within a Universe at a specific time[cite: 10].
    * *Design Note:* All detailed content (`Activity`, `Guideline`, `Benefit`, `Pitfall`, `Metric`) is linked to `practiceVersion`, not the abstract `Practice`. [cite_start]This allows for high adaptability [cite: 18-22].

### 2.3. Affinity & Recommendation Engine
* [cite_start]**Goal:** Represents Agile Reference Objectives (OARs)[cite: 16].
* [cite_start]**personPracticeAffinity:** Stores the calculated affinity score between a specific user and a practice version[cite: 5].
* [cite_start]**Recommendation:** Logic to provide advice based on `Context` and `recommendationType` (Helpful/Harmful)[cite: 23, 27].

## 3. Data Flow & Logic

### 3.1. The Affinity Calculation Flow (US 33, 34)
1.  [cite_start]**Input:** User answers questions in `affinitySurveyResults`[cite: 5].
2.  [cite_start]**Profile Generation:** System calculates the `bfProfile` (Big Five scores)[cite: 5, 93].
3.  **Affinity Scoring:**
    * The system compares the `bfProfile` against the characteristics (tags/attributes) of a `practiceVersion`.
    * *Algorithm:* `Function(Person.bfProfile, Practice.Attributes) -> Score`.
4.  [cite_start]**Aggregation:** For a `Team`, individual scores are aggregated (e.g., Average, Minimum, or Standard Deviation) to detect "Problematic" practices (US 17)[cite: 43].

### 3.2. Recommendation Logic (US 18)
To suggest alternatives:
1.  [cite_start]Identify the `Goal` (OAR) of the current problematic practice[cite: 38].
2.  Query other `practiceVersion` records that map to the same `Goal`.
3.  Rank these candidates by the Team's aggregated Affinity Score.
4.  [cite_start]Exclude practices linked to `Pitfall` or defined as "Harmful" in the current `Context`[cite: 23, 27].

## 4. Interfaces & Visualization

### 4.1. The Card Metaphor (Draw2d)
* **Input Data:** `practiceVersion` joined with `Activity`, `Role`, and `Metric`.
* **Visual Output:** A graphical "Card" where:
    * Header = Practice Name
    * Body = Description & Objectives
    * Footer = Icons for Roles and number of Activities.
* [cite_start]*Requirement:* Must be printable[cite: 44, 110].

## 5. Error Handling & Constraints
* **Versioning Integrity:** A `practiceVersion` must always belong to a `Universe` and a `Practice`.
* [cite_start]**Validation:** Email uniqueness in `Person` table[cite: 2].
* [cite_start]**Security:** Passwords must be stored using a secure hash (`passwordHash`)[cite: 2].