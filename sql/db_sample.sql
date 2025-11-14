/*****************************************************************/
/*****************************************************************/
/** **/
/** SCRIPT SQL POUR AGILE PRACTICE REPOSITORY (APR)           **/
/** Compatible PostgreSQL                                     **/
/** **/
/** 1. DDL : Création de la structure des tables              **/
/** 2. DML : Insertion des données de test                    **/
/** **/
/*****************************************************************/
/*****************************************************************/

--==============================================================
--
--   PARTIE 1 : DDL (Data Definition Language)
--   Création des tables, contraintes et relations
--
--==============================================================

-- On commence par supprimer les tables existantes (en ordre inverse des dépendances)
-- L'option CASCADE gère automatiquement les dépendances (vues, FK, etc.)
DROP TABLE IF EXISTS
    Person, Team, teamMember, bfProfile, personPracticeAffinity, affinitySurveyResults,
    affinitySurveyVersion, affinitySurvey, Universe, Practice, practiceVersion, Method,
    methodVersion, Metric, Role, Workproduct, Goal, Context, Guideline, Pitfall,
    Benefit, Activity, completionCriteria, Recommendation, contextIndicator,
    practiceType, guidelineType, recommendationType, recommendationStatus,
    practiceAssociationType, roleUseType, bfProfileStatus, roleType, methodType,
    practiceMethod, practiceVersionActivity, metricPractice, practiceAssociation,
    roleUse, workproductPractice, recommendationGoal, affinityPractice,
    PracticeVersionUniverse
CASCADE;

/********************************************/
/* 1. Tables de lookup (Types & Status)   */
/* (Tables sans dépendances externes)     */
/********************************************/

CREATE TABLE roleType (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE bfProfileStatus (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE practiceType (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE guidelineType (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE recommendationType (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE recommendationStatus (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE practiceAssociationType (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE roleUseType (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE methodType (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE Team (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE Goal (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64),
    description VARCHAR(255)
);

CREATE TABLE Context (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255)
);

CREATE TABLE Activity (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64),
    description VARCHAR(64),
    lastUpdate TIMESTAMP,
    lastUpdateById INTEGER -- Sera lié à Person(id) plus tard
);

CREATE TABLE Workproduct (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64),
    description VARCHAR(255),
    lastUpdate TIMESTAMP,
    lastUpdateById INTEGER -- Sera lié à Person(id) plus tard
);

CREATE TABLE Role (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64),
    description VARCHAR(255),
    lastUpdate TIMESTAMP,
    lastUpdateById INTEGER -- Sera lié à Person(id) plus tard
);

CREATE TABLE Metric (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64),
    unit VARCHAR(64),
    scale VARCHAR(64),
    formula VARCHAR(64),
    lastUpdate TIMESTAMP,
    lastUpdateById INTEGER -- Sera lié à Person(id) plus tard
);

CREATE TABLE affinitySurvey (
    id SERIAL PRIMARY KEY,
    content VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    comment VARCHAR(255)
);

/********************************************/
/* 2. Tables de Niveau 1 (Dépendances     */
/* sur les tables de lookup)           */
/********************************************/

CREATE TABLE Person (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    roleId INTEGER REFERENCES roleType(id),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ajout des contraintes FK pour les tables de "Core" qui référencent Person
ALTER TABLE Activity ADD CONSTRAINT fk_activity_person FOREIGN KEY (lastUpdateById) REFERENCES Person(id);
ALTER TABLE Workproduct ADD CONSTRAINT fk_workproduct_person FOREIGN KEY (lastUpdateById) REFERENCES Person(id);
ALTER TABLE Role ADD CONSTRAINT fk_role_person FOREIGN KEY (lastUpdateById) REFERENCES Person(id);
ALTER TABLE Metric ADD CONSTRAINT fk_metric_person FOREIGN KEY (lastUpdateById) REFERENCES Person(id);

CREATE TABLE Universe (
    id SERIAL PRIMARY KEY,
    teamId INTEGER NOT NULL REFERENCES Team(id),
    name VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE Practice (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) UNIQUE NOT NULL,
    objective VARCHAR(255),
    description VARCHAR(255),
    typeId INTEGER REFERENCES practiceType(id)
);

CREATE TABLE Method (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64),
    objective VARCHAR(255),
    description VARCHAR(255),
    typeId INTEGER REFERENCES methodType(id)
);

CREATE TABLE affinitySurveyVersion (
    id SERIAL PRIMARY KEY,
    itemId INTEGER NOT NULL REFERENCES affinitySurvey(id),
    version INTEGER NOT NULL,
    versionNote VARCHAR(255),
    UNIQUE(itemId, version)
);

CREATE TABLE contextIndicator (
    id SERIAL PRIMARY KEY,
    contextId INTEGER REFERENCES Context(id),
    name VARCHAR(64),
    description VARCHAR(255),
    attributes VARCHAR(64),
    precision VARCHAR(64),
    value VARCHAR(64)
);

/********************************************/
/* 3. Tables de Niveau 2 (Dépendances     */
/* sur les tables de Niveau 1)         */
/********************************************/

CREATE TABLE teamMember (
    teamId INTEGER NOT NULL REFERENCES Team(id) ON DELETE CASCADE,
    personId INTEGER NOT NULL REFERENCES Person(id) ON DELETE CASCADE,
    PRIMARY KEY (teamId, personId)
);

CREATE TABLE bfProfile (
    id SERIAL PRIMARY KEY,
    personId INTEGER NOT NULL REFERENCES Person(id),
    statusId INTEGER NOT NULL REFERENCES bfProfileStatus(id),
    o FLOAT,
    c FLOAT,
    e FLOAT,
    a FLOAT,
    n FLOAT
);

CREATE TABLE practiceVersion (
    id SERIAL PRIMARY KEY,
    practiceId INTEGER NOT NULL REFERENCES Practice(id),
    universeId INTEGER NOT NULL REFERENCES Universe(id),
    versionName VARCHAR(255) NOT NULL,
    versionTimestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changeDescription TEXT,
    lastUpdate TIMESTAMP,
    lastUpdateById INTEGER REFERENCES Person(id)
);

CREATE TABLE methodVersion (
    id SERIAL PRIMARY KEY,
    methodId INTEGER NOT NULL REFERENCES Method(id),
    universeId INTEGER NOT NULL REFERENCES Universe(id),
    versionName VARCHAR(255) NOT NULL,
    versionTimestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changeDescription TEXT,
    lastUpdate TIMESTAMP,
    lastUpdateById INTEGER REFERENCES Person(id)
);

CREATE TABLE affinitySurveyResults (
    id SERIAL PRIMARY KEY,
    personId INTEGER NOT NULL REFERENCES Person(id),
    itemId INTEGER NOT NULL REFERENCES affinitySurveyVersion(id),
    result INTEGER NOT NULL
);

/********************************************/
/* 4. Tables de Niveau 3 (Détails &      */
/* Associations de base)               */
/********************************************/

CREATE TABLE practiceMethod (
    methodVersionId INTEGER NOT NULL REFERENCES methodVersion(id),
    practiceVersionId INTEGER NOT NULL REFERENCES practiceVersion(id),
    PRIMARY KEY (methodVersionId, practiceVersionId)
    -- lastUpdateById INTEGER REFERENCES Person(id)
);

CREATE TABLE practiceVersionActivity (
    practiceVersionId INTEGER NOT NULL REFERENCES practiceVersion(id),
    activityId INTEGER NOT NULL REFERENCES Activity(id),
    sequence INTEGER NOT NULL,
    PRIMARY KEY (practiceVersionId, activityId),
    UNIQUE (practiceVersionId, sequence)
);

CREATE TABLE metricPractice (
    metricId INTEGER NOT NULL REFERENCES Metric(id),
    practiceVersionId INTEGER NOT NULL REFERENCES practiceVersion(id),
    PRIMARY KEY (metricId, practiceVersionId)
);

CREATE TABLE roleUse (
    practiceVersionId INTEGER NOT NULL REFERENCES practiceVersion(id),
    roleId INTEGER NOT NULL REFERENCES Role(id),
    typeId INTEGER REFERENCES roleUseType(id),
    PRIMARY KEY (practiceVersionId, roleId)
);

CREATE TABLE workproductPractice (
    practiceVersionId INTEGER NOT NULL REFERENCES practiceVersion(id),
    workproductId INTEGER NOT NULL REFERENCES Workproduct(id),
    PRIMARY KEY (practiceVersionId, workproductId)
);

CREATE TABLE Guideline (
    id SERIAL PRIMARY KEY,
    practiceVersionId INTEGER REFERENCES practiceVersion(id),
    methodVersionId INTEGER REFERENCES methodVersion(id),
    name VARCHAR(64),
    description VARCHAR(64),
    content VARCHAR(255),
    lastUpdate TIMESTAMP,
    lastUpdateById INTEGER REFERENCES Person(id),
    typeId INTEGER REFERENCES guidelineType(id)
);

CREATE TABLE Pitfall (
    id SERIAL PRIMARY KEY,
    practiceVersionId INTEGER REFERENCES practiceVersion(id),
    name VARCHAR(64),
    description VARCHAR(255),
    content VARCHAR(255),
    lastUpdate TIMESTAMP,
    lastUpdateById INTEGER REFERENCES Person(id)
);

CREATE TABLE Benefit (
    id SERIAL PRIMARY KEY,
    practiceVersionId INTEGER REFERENCES practiceVersion(id),
    name VARCHAR(64),
    description VARCHAR(64),
    content VARCHAR(255),
    lastUpdate TIMESTAMP,
    lastUpdateById INTEGER REFERENCES Person(id)
);

CREATE TABLE completionCriteria (
    id SERIAL PRIMARY KEY,
    practiceVersionId INTEGER REFERENCES practiceVersion(id),
    name VARCHAR(64),
    description VARCHAR(64),
    lastUpdate TIMESTAMP,
    lastUpdateById INTEGER REFERENCES Person(id)
);

CREATE TABLE Recommendation (
    id SERIAL PRIMARY KEY,
    practiceVersionId INTEGER REFERENCES practiceVersion(id),
    contextId INTEGER REFERENCES Context(id),
    description VARCHAR(255),
    typeId INTEGER REFERENCES recommendationType(id),
    statusId INTEGER REFERENCES recommendationStatus(id),
    lastUpdate TIMESTAMP,
    lastUpdateById INTEGER REFERENCES Person(id)
);

CREATE TABLE personPracticeAffinity (
    id SERIAL PRIMARY KEY,
    personId INTEGER NOT NULL REFERENCES Person(id),
    practiceVersionId INTEGER NOT NULL REFERENCES practiceVersion(id),
    affinity INTEGER NOT NULL
);

CREATE TABLE affinityPractice (
    id SERIAL PRIMARY KEY,
    itemId INTEGER NOT NULL REFERENCES affinitySurveyVersion(id),
    practiceVersionId INTEGER NOT NULL REFERENCES practiceVersion(id)
);

CREATE TABLE PracticeVersionUniverse (
    practiceVersionId INTEGER NOT NULL REFERENCES practiceVersion(id),
    universeId INTEGER NOT NULL REFERENCES Universe(id),
    isActive BOOLEAN,
    PRIMARY KEY (practiceVersionId, universeId)
);

/********************************************/
/* 5. Tables de Niveau 4 (Associations    */
/* avancées)                           */
/********************************************/

CREATE TABLE practiceAssociation (
    id SERIAL PRIMARY KEY,
    sourcePracticeVersionId INTEGER REFERENCES practiceVersion(id),
    targetPracticeVersionId INTEGER REFERENCES practiceVersion(id),
    typeId INTEGER REFERENCES practiceAssociationType(id)
);

CREATE TABLE recommendationGoal (
    recommendationId INTEGER NOT NULL REFERENCES Recommendation(id),
    goalId INTEGER NOT NULL REFERENCES Goal(id),
    PRIMARY KEY (recommendationId, goalId)
);


/********************************************/
/* 6. Création des Indexs additionnels    */
/********************************************/

CREATE INDEX idx_practiceversion_practice ON practiceVersion (practiceId);
CREATE INDEX idx_practiceversion_universe ON practiceVersion (universeId);
CREATE INDEX idx_recommendation_practice ON Recommendation (practiceVersionId);
CREATE INDEX idx_recommendation_context ON Recommendation (contextId);
CREATE INDEX idx_personpracticeaffinity_person ON personPracticeAffinity (personId);
CREATE INDEX idx_personpracticeaffinity_practice ON personPracticeAffinity (practiceVersionId);


--==============================================================
--
--   PARTIE 2 : DML (Data Manipulation Language)
--   Insertion de données fictives réalistes
--
--==============================================================

-- L'ordre d'insertion doit respecter les contraintes de clés étrangères.
-- Nous insérons donc dans le même ordre que la création des tables.

/********************************************/
/* 1. Tables de lookup (Types & Status)   */
/********************************************/

INSERT INTO roleType (id, name, description) VALUES
(DEFAULT, 'Expert', 'Utilisateur expert pouvant valider et créer des pratiques de référence'),
(DEFAULT, 'Team Member', 'Membre d''une équipe de développement'),
(DEFAULT, 'Scrum Master', 'Facilitateur pour une équipe agile'),
(DEFAULT, 'Guest', 'Utilisateur en lecture seule');

INSERT INTO bfProfileStatus (id, name, description) VALUES
(DEFAULT, 'Pending', 'Le questionnaire n''a pas été démarré'),
(DEFAULT, 'In-Progress', 'Le questionnaire est en cours'),
(DEFAULT, 'Complete', 'Le questionnaire est terminé et le profil est calculé');

INSERT INTO practiceType (id, name, description) VALUES
(DEFAULT, 'Development Practice', 'Pratique liée à la construction technique du produit (TDD, CI/CD...)'),
(DEFAULT, 'Teamwork Practice', 'Pratique liée à la collaboration et la communication (Daily, Retro...)'),
(DEFAULT, 'Organizational Practice', 'Pratique à l''échelle de l''organisation (Scaling frameworks...)');

INSERT INTO guidelineType (id, name, description) VALUES
(DEFAULT, 'Blog Post', 'Article de blog ou retour d''expérience informel'),
(DEFAULT, 'Scientific Article', 'Papier de recherche validé par les pairs'),
(DEFAULT, 'Wiki', 'Documentation collaborative interne ou externe (ex: Wikipedia)'),
(DEFAULT, 'Book', 'Référence à un chapitre de livre');

INSERT INTO recommendationType (id, name, description) VALUES
(DEFAULT, 'Helpful (+)', 'Pratique recommandée dans ce contexte'),
(DEFAULT, 'Harmful (-)', 'Pratique déconseillée dans ce contexte'),
(DEFAULT, 'Neutral (0)', 'Pratique sans impact notable dans ce contexte'),
(DEFAULT, 'Helpful if customized (C)', 'Utile si adaptée ou implémentée avec précaution');

INSERT INTO recommendationStatus (id, name, description) VALUES
(DEFAULT, 'Proposed', 'Recommendation suggérée par un membre'),
(DEFAULT, 'Accepted', 'Recommendation validée par un expert ou l''équipe'),
(DEFAULT, 'Rejected', 'Recommendation refusée');

INSERT INTO practiceAssociationType (id, name, description) VALUES
(DEFAULT, 'Configuration', 'Une pratique configure ou est une étape de l''autre'),
(DEFAULT, 'Equivalence', 'Pratiques similaires ou interchangeables (ex: Daily Scrum vs Daily Huddle)'),
(DEFAULT, 'Dependency', 'Une pratique nécessite l''autre pour fonctionner'),
(DEFAULT, 'Complementarity', 'Les pratiques se renforcent mutuellement (ex: TDD et CI)'),
(DEFAULT, 'Exclusion', 'Pratiques mutuellement exclusives');

INSERT INTO roleUseType (id, name, description) VALUES
(DEFAULT, 'Responsible (R)', 'Personne qui exécute la tâche'),
(DEFAULT, 'Accountable (A)', 'Personne qui valide le résultat et prend la décision finale'),
(DEFAULT, 'Consulted (C)', 'Personne dont l''avis est requis'),
(DEFAULT, 'Informed (I)', 'Personne tenue informée de l''avancement');

INSERT INTO methodType (id, name, description) VALUES
(DEFAULT, 'Project Management', 'Méthode de gestion de projet (Scrum, Kanban)'),
(DEFAULT, 'Development', 'Méthode de développement (XP, DevOps)'),
(DEFAULT, 'Maintenance', 'Méthode de maintenance de logiciel');

INSERT INTO Team (id, name, description) VALUES
(DEFAULT, 'Global Reference', 'Équipe virtuelle gérant les pratiques de référence (globales)'),
(DEFAULT, 'Team Phoenix', 'Équipe de développement travaillant sur le projet "Phoenix"'),
(DEFAULT, 'Team Cobra', 'Équipe de maintenance du produit "LegacyOne"');

INSERT INTO Goal (id, name, description) VALUES
(DEFAULT, 'Improve Quality', 'Augmenter la qualité logicielle, réduire les bugs'),
(DEFAULT, 'Increase Velocity', 'Accélérer la livraison de valeur métier'),
(DEFAULT, 'Enhance Collaboration', 'Améliorer la communication et l''esprit d''équipe'),
(DEFAULT, 'Manage Technical Debt', 'Contrôler et réduire la dette technique');

INSERT INTO Context (id, description) VALUES
(DEFAULT, 'New Project (Démarrage d''un projet "greenfield")'),
(DEFAULT, 'Legacy System Maintenance (Maintenance d''un système existant avec dette technique)'),
(DEFAULT, 'Distributed Team (Équipe répartie sur plusieurs sites ou fuseaux horaires)'),
(DEFAULT, 'High-Security Context (Projet avec des contraintes de sécurité et de conformité élevées)');

INSERT INTO Activity (id, name, description, lastUpdate, lastUpdateById) VALUES
(DEFAULT, 'Plan Sprint', 'Planifier le travail pour l''itération à venir', null, null),
(DEFAULT, 'Conduct Daily Stand-up', 'Synchroniser l''équipe quotidiennement (max 15 min)', null, null),
(DEFAULT, 'Review Code', 'Effectuer une revue de code par les pairs', null, null),
(DEFAULT, 'Refine Backlog', 'Estimer et détailler les items du backlog', null, null),
(DEFAULT, 'Hold Retrospective', 'Inspecter et adapter les processus de l''équipe', null, null);

INSERT INTO Workproduct (id, name, description) VALUES
(DEFAULT, 'User Story', 'Description d''une fonctionnalité du point de vue de l''utilisateur'),
(DEFAULT, 'Source Code', 'Le code source de l''application'),
(DEFAULT, 'Test Case', 'Scénario de test pour valider une fonctionnalité'),
(DEFAULT, 'Sprint Backlog', 'Sous-ensemble du Product Backlog sélectionné pour un Sprint'),
(DEFAULT, 'Definition of Done (DoD)', 'Checklist des critères pour qu''une story soit considérée "terminée"');

INSERT INTO Role (id, name, description) VALUES
(DEFAULT, 'Product Owner', 'Responsable de la vision produit et de la priorisation du backlog'),
(DEFAULT, 'Developer', 'Membre de l''équipe qui construit le produit (incl. test, ops...)'),
(DEFAULT, 'QA Tester', 'Spécialiste de l''assurance qualité'),
(DEFAULT, 'Scrum Master', 'Facilitateur garant du cadre méthodologique (rôle au sens Scrum)');

INSERT INTO Metric (id, name, unit, scale, formula, lastUpdate, lastUpdateById) VALUES
(DEFAULT, 'Velocity', 'Story Points', 'Ratio', 'SUM(Points) / Sprint', null, null),
(DEFAULT, 'Cycle Time', 'Days', 'Interval', 'Timestamp(Done) - Timestamp(In Progress)', null, null),
(DEFAULT, 'Bug Count', 'Integer', 'Count', 'COUNT(Bugs) WHERE status = "Open"', null, null),
(DEFAULT, 'Team Morale', '1-5', 'Ordinal', 'AVG(SurveyResponse)', null, null);

INSERT INTO affinitySurvey (id, content, description, comment) VALUES
(DEFAULT, 'I prefer clearly defined tasks over ambiguous goals.', 'Mesure la préférence pour la structure (Introversion/Conscienciosité)', 'Item lié au Big Five "Conscientiousness"'),
(DEFAULT, 'I enjoy brainstorming new ideas with a group.', 'Mesure l''aisance sociale et la créativité (Extraversion/Openness)', 'Item lié à "Extraversion"'),
(DEFAULT, 'I am comfortable with frequent changes in priorities.', 'Mesure l''adaptabilité (opposé de Névrosisme)', 'Item lié à "Neuroticism" (faible)');

/********************************************/
/* 2. Tables de Niveau 1                  */
/********************************************/

INSERT INTO Person (id, name, email, passwordHash, roleId, createdAt) VALUES
(DEFAULT, 'Alice Expert', 'alice@apr.com', '...hashed_password_placeholder...', 1, '2024-01-10 09:00:00'),
(DEFAULT, 'Bob Developer', 'bob@apr.com', '...hashed_password_placeholder...', 2, '2024-01-11 10:30:00'),
(DEFAULT, 'Charlie ScrumMaster', 'charlie@apr.com', '...hashed_password_placeholder...', 3, '2024-01-12 11:00:00'),
(DEFAULT, 'David Developer', 'david@apr.com', '...hashed_password_placeholder...', 2, '2024-01-13 14:00:00');

-- Mise à jour des FK 'lastUpdateById' maintenant que les Person existent (ex: Alice(1) a créé les items de base)
UPDATE Activity SET lastUpdateById = 1, lastUpdate = '2024-01-10 09:00:00';
UPDATE Workproduct SET lastUpdateById = 1, lastUpdate = '2024-01-10 09:00:00';
UPDATE Role SET lastUpdateById = 1, lastUpdate = '2024-01-10 09:00:00';
UPDATE Metric SET lastUpdateById = 1, lastUpdate = '2024-01-10 09:00:00';

INSERT INTO Universe (id, teamId, name, description) VALUES
(DEFAULT, 1, 'Global Universe', 'Référentiel global des pratiques standards (templates)'),
(DEFAULT, 2, 'Team Phoenix Universe', 'Adaptations et pratiques spécifiques à l''équipe Phoenix'),
(DEFAULT, 3, 'Team Cobra Universe', 'Pratiques utilisées par l''équipe Cobra pour la maintenance');

INSERT INTO Practice (id, name, objective, description, typeId) VALUES
(DEFAULT, 'Daily Stand-up', 'Synchroniser l''équipe et identifier les obstacles', 'Réunion quotidienne de 15 minutes.', 2),
(DEFAULT, 'Test-Driven Development (TDD)', 'Écrire les tests avant le code', 'Cycle Red-Green-Refactor pour améliorer la qualité du code.', 1),
(DEFAULT, 'Sprint Retrospective', 'Inspecter et adapter les processus de l''équipe', 'Réunion à la fin de chaque sprint pour l''amélioration continue.', 2),
(DEFAULT, 'Pair Programming', 'Deux développeurs travaillent sur un seul poste', 'Améliorer la qualité du code et le partage des connaissances.', 1);

INSERT INTO Method (id, name, objective, description, typeId) VALUES
(DEFAULT, 'Scrum', 'Gérer le développement de produits complexes', 'Un cadre de travail (framework) agile basé sur des sprints.', 1),
(DEFAULT, 'Extreme Programming (XP)', 'Produire du logiciel de haute qualité', 'Ensemble de pratiques de développement logiciel.', 2);

INSERT INTO affinitySurveyVersion (id, itemId, version, versionNote) VALUES
(DEFAULT, 1, 1, 'Version initiale'),
(DEFAULT, 2, 1, 'Version initiale'),
(DEFAULT, 3, 1, 'Version initiale');

INSERT INTO contextIndicator (id, contextId, name, description, attributes, precision, value) VALUES
(DEFAULT, 3, 'Timezone Spread', 'Écart de fuseau horaire max dans l''équipe', 'Hours', 'Integer', '> 4');

/********************************************/
/* 3. Tables de Niveau 2                  */
/********************************************/

INSERT INTO teamMember (teamId, personId) VALUES
(1, 1), -- Alice est dans l'équipe "Global Reference"
(2, 2), -- Bob est dans la "Team Phoenix"
(2, 3), -- Charlie est dans la "Team Phoenix"
(2, 4); -- David est dans la "Team Phoenix"

INSERT INTO bfProfile (id, personId, statusId, o, c, e, a, n) VALUES
(DEFAULT, 1, 3, 0.85, 0.70, 0.60, 0.75, 0.30), -- Alice (Expert) : Ouverte, Consciencieuse, peu Névrosée
(DEFAULT, 2, 3, 0.60, 0.80, 0.40, 0.50, 0.65), -- Bob (Developer) : Consciencieux, mais plus Névrosé
(DEFAULT, 3, 3, 0.75, 0.65, 0.85, 0.80, 0.20), -- Charlie (SM) : Très Extraverti, Agréable, stable
(DEFAULT, 4, 1, null, null, null, null, null); -- David (Developer) : Profil en attente

INSERT INTO practiceVersion (id, practiceId, universeId, versionName, changeDescription, lastUpdateById) VALUES
(DEFAULT, 1, 1, 'v1.0 - Standard', 'Version initiale globale', 1), -- PV 1: Daily Stand-up (Global)
(DEFAULT, 2, 1, 'v1.0 - Standard', 'Version initiale globale', 1), -- PV 2: TDD (Global)
(DEFAULT, 3, 1, 'v1.0 - Standard', 'Version initiale globale', 1), -- PV 3: Retrospective (Global)
(DEFAULT, 4, 1, 'v1.0 - Standard', 'Version initiale globale', 1), -- PV 4: Pair Programming (Global)
(DEFAULT, 1, 2, 'v1.1 - Phoenix Adapt.', 'Adaptation pour l''équipe Phoenix (virtuel)', 3); -- PV 5: Daily Stand-up (Team Phoenix)

INSERT INTO methodVersion (id, methodId, universeId, versionName, changeDescription, lastUpdateById) VALUES
(DEFAULT, 1, 1, 'Scrum Guide 2020', 'Version globale basée sur le guide officiel', 1), -- MV 1: Scrum (Global)
(DEFAULT, 2, 1, 'XP Core Practices', 'Version globale', 1), -- MV 2: XP (Global)
(DEFAULT, 1, 2, 'Scrum Phoenix', 'Adaptation de Scrum pour l''équipe Phoenix', 3); -- MV 3: Scrum (Team Phoenix)

INSERT INTO affinitySurveyResults (id, personId, itemId, result) VALUES
(DEFAULT, 2, 1, 4), -- Bob préfère les tâches claires (Note 4/5)
(DEFAULT, 2, 2, 2), -- Bob n'aime pas trop brainstormer en groupe (Note 2/5)
(DEFAULT, 2, 3, 3), -- Bob est neutre face au changement (Note 3/5)
(DEFAULT, 3, 1, 2), -- Charlie n'aime pas les tâches trop définies
(DEFAULT, 3, 2, 5), -- Charlie adore brainstormer
(DEFAULT, 3, 3, 4); -- Charlie est à l'aise avec le changement

/********************************************/
/* 4. Tables de Niveau 3                  */
/********************************************/

-- Lier les pratiques aux méthodes (version globale)
INSERT INTO practiceMethod (methodVersionId, practiceVersionId) VALUES
(1, 1), -- Scrum (MV 1) -> Daily Stand-up (PV 1)
(1, 3), -- Scrum (MV 1) -> Retrospective (PV 3)
(2, 2), -- XP (MV 2) -> TDD (PV 2)
(2, 4); -- XP (MV 2) -> Pair Programming (PV 4)

-- Lier les pratiques aux méthodes (version Team Phoenix)
INSERT INTO practiceMethod (methodVersionId, practiceVersionId) VALUES
(3, 5), -- Scrum Phoenix (MV 3) -> Daily Stand-up Phoenix (PV 5)
(3, 3); -- Scrum Phoenix (MV 3) -> Retrospective (PV 3 - utilise la version globale)

-- Activités pour le Daily Stand-up v1.0 (PV 1)
INSERT INTO practiceVersionActivity (practiceVersionId, activityId, sequence) VALUES
(1, 2, 1); -- Pratique 1 (Daily) -> Activité 2 (Conduct Daily), Séquence 1

-- Activités pour la Rétrospective v1.0 (PV 3)
INSERT INTO practiceVersionActivity (practiceVersionId, activityId, sequence) VALUES
(3, 5, 1); -- Pratique 3 (Retro) -> Activité 5 (Hold Retro), Séquence 1

-- Métriques pour TDD (PV 2)
INSERT INTO metricPractice (metricId, practiceVersionId) VALUES
(3, 2); -- Métrique 3 (Bug Count) -> Pratique 2 (TDD)

-- Rôles pour le Daily Stand-up v1.0 (PV 1)
INSERT INTO roleUse (practiceVersionId, roleId, typeId) VALUES
(1, 2, 1), -- Daily (PV 1) -> Developer (Role 2) -> Responsible (R)
(1, 4, 2), -- Daily (PV 1) -> Scrum Master (Role 4) -> Accountable (A)
(1, 1, 4); -- Daily (PV 1) -> Product Owner (Role 1) -> Informed (I)

-- Workproducts pour TDD (PV 2)
INSERT INTO workproductPractice (practiceVersionId, workproductId) VALUES
(2, 2), -- TDD (PV 2) -> Source Code (WP 2)
(2, 3), -- TDD (PV 2) -> Test Case (WP 3)
(2, 5); -- TDD (PV 2) -> Definition of Done (WP 5)

-- Guidelines, Pitfalls, Benefits
INSERT INTO Guideline (id, practiceVersionId, name, description, content, lastUpdateById, typeId) VALUES
(DEFAULT, 2, 'TDD by Kent Beck', 'Lien vers le livre', 'https://example.com/tdd-book', 1, 4);

INSERT INTO Pitfall (id, practiceVersionId, name, description, content, lastUpdateById) VALUES
(DEFAULT, 1, 'Status Report Meeting', 'Éviter que le daily ne devienne un reporting au manager', 'Le daily est une synchro d''équipe, pas un reporting.', 1);

INSERT INTO Benefit (id, practiceVersionId, name, description, content, lastUpdateById) VALUES
(DEFAULT, 2, 'Reduced Bug Count', 'Moins de régressions', 'Les tests couvrent le code avant son écriture.', 1);

INSERT INTO completionCriteria (id, practiceVersionId, name, description, lastUpdateById) VALUES
(DEFAULT, 1, '15 min max', 'Le daily ne doit pas dépasser 15 minutes', 1);

-- Recommandations
INSERT INTO Recommendation (id, practiceVersionId, contextId, description, typeId, statusId, lastUpdateById) VALUES
(DEFAULT, 4, 2, 'Pair Programming est difficile sur du legacy très complexe (Peut être frustrant si le code est mal compris.)', 4, 2, 1), -- PP (PV 4) dans Contexte 2 (Legacy) -> 'Helpful (C)' (Type 4), 'Accepted' (Status 2)
(DEFAULT, 1, 3, 'Utiliser un outil visuel (Miro, Mural) pour le daily (Nécessaire pour les équipes distribuées.)', 1, 2, 1); -- Daily (PV 1) dans Contexte 3 (Distribué) -> 'Helpful (+)' (Type 1), 'Accepted' (Status 2)
-- Affinités (calculées)
INSERT INTO personPracticeAffinity (id, personId, practiceVersionId, affinity) VALUES
(DEFAULT, 2, 2, 35), -- Bob (Person 2) a une faible affinité (35/100) avec TDD (PV 2)
(DEFAULT, 2, 4, 25), -- Bob (Person 2) a une faible affinité (25/100) avec Pair Programming (PV 4)
(DEFAULT, 3, 4, 90); -- Charlie (Person 3) a une forte affinité (90/100) avec Pair Programming (PV 4)

-- Lien entre Items de questionnaire et Pratiques
INSERT INTO affinityPractice (id, itemId, practiceVersionId) VALUES
(DEFAULT, 1, 2), -- Item 1 (tâches claires) -> TDD (PV 2)
(DEFAULT, 2, 4), -- Item 2 (brainstorming groupe) -> Pair Programming (PV 4)
(DEFAULT, 3, 1); -- Item 3 (changement priorités) -> Daily Stand-up (PV 1)

-- Lier les versions de pratiques aux univers où elles sont actives
INSERT INTO PracticeVersionUniverse (practiceVersionId, universeId, isActive) VALUES
(1, 1, true), -- Daily (PV 1) est actif dans l'Univers Global (1)
(2, 1, true), -- TDD (PV 2) est actif dans l'Univers Global (1)
(3, 1, true), -- Retro (PV 3) est actif dans l'Univers Global (1)
(4, 1, true), -- PP (PV 4) est actif dans l'Univers Global (1)
(5, 2, true), -- Daily Phoenix (PV 5) est actif dans l'Univers Phoenix (2)
(2, 2, true), -- TDD (PV 2) (version globale) est aussi actif chez Phoenix (2)
(3, 2, true), -- Retro (PV 3) (version globale) est aussi actif chez Phoenix (2)
(4, 2, false); -- PP (PV 4) (version globale) n'est PAS actif chez Phoenix (2) (ils ne l'utilisent pas)

/********************************************/
/* 5. Tables de Niveau 4                  */
/********************************************/

-- Associations entre pratiques
INSERT INTO practiceAssociation (id, sourcePracticeVersionId, targetPracticeVersionId, typeId) VALUES
(DEFAULT, 2, 4, 4), -- TDD (PV 2) est 'Complémentaire' (Type 4) avec Pair Programming (PV 4)
(DEFAULT, 1, 3, 3); -- Daily Stand-up (PV 1) a une 'Dépendance' (Type 3) sur la Retrospective (PV 3) (pour s'améliorer)

-- Lier les Recommandations aux Objectifs (Goals)
INSERT INTO recommendationGoal (recommendationId, goalId) VALUES
(1, 4), -- Recommandation 1 (sur PP en legacy) est liée à l'Objectif 4 (Gérer Dette Tech)
(2, 3); -- Recommandation 2 (outil visuel pour daily) est liée à l'Objectif 3 (Améliorer Collab)