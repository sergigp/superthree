# shows Specification

## Purpose

Lets the parent manage the library of shows (name and audio language) that schedules will later be built from.

## Requirements

### Requirement: Create a show
The system SHALL create a show from a name and an audio language (`ca`, `es` or `en`), trimming the name, assigning a UUID id and a UTC ISO 8601 creation timestamp, and SHALL respond `201` with the created show.

#### Scenario: Valid show
- **WHEN** a client posts `{ name: "  Bluey ", audioLanguage: "en" }`
- **THEN** the system responds `201` with `{ id, name: "Bluey", audioLanguage: "en", createdAt }`

#### Scenario: Blank name
- **WHEN** a client posts a name that is empty after trimming, or longer than 100 characters
- **THEN** the system responds `400` with `{ error: <message> }` and stores nothing

#### Scenario: Unsupported language
- **WHEN** a client posts an audio language outside `ca`, `es`, `en`
- **THEN** the system responds `400` with `{ error: <message> }` and stores nothing

### Requirement: Show names are unique, case-insensitively
The system SHALL reject creating or renaming a show to a name that another show already has, ignoring case, responding `409` with `{ error: "A show named <name> already exists" }`.

#### Scenario: Duplicate name on create
- **WHEN** a show "Bluey" exists and a client creates "Bluey"
- **THEN** the system responds `409` and stores nothing

#### Scenario: Case-only difference on create
- **WHEN** a show "Bluey" exists and a client creates "BLUEY"
- **THEN** the system responds `409` and stores nothing

#### Scenario: Duplicate name on update
- **WHEN** shows "Bluey" and "Peppa" exist and a client renames "Peppa" to "bluey"
- **THEN** the system responds `409` and "Peppa" is unchanged

#### Scenario: Renaming a show to its own name
- **WHEN** a client renames "Bluey" to "BLUEY"
- **THEN** the system responds `200` with the show named "BLUEY"

### Requirement: List shows
The system SHALL return all shows sorted by name, case-insensitively.

#### Scenario: Several shows
- **WHEN** shows "peppa", "Bluey" and "Caillou" exist
- **THEN** `GET /api/shows` responds `200` with them in the order "Bluey", "Caillou", "peppa"

#### Scenario: No shows
- **WHEN** no shows exist
- **THEN** `GET /api/shows` responds `200` with `[]`

### Requirement: Get a show
The system SHALL return a show by id, or `404` with `{ error: "Show <id> not found" }` when it does not exist.

#### Scenario: Existing show
- **WHEN** a client gets an existing show's id
- **THEN** the system responds `200` with the show

#### Scenario: Unknown id
- **WHEN** a client gets an id no show has
- **THEN** the system responds `404`

### Requirement: Update a show
The system SHALL update a show's name and/or audio language from a patch containing at least one of them, keeping its id and creation timestamp, and SHALL respond `200` with the updated show.

#### Scenario: Change language
- **WHEN** a client patches an existing show with `{ audioLanguage: "ca" }`
- **THEN** the system responds `200` with the show in `ca` and the same name, id and createdAt

#### Scenario: Empty patch
- **WHEN** a client patches with `{}`
- **THEN** the system responds `400`

#### Scenario: Unknown id
- **WHEN** a client patches an id no show has
- **THEN** the system responds `404`

### Requirement: Delete a show
The system SHALL delete a show by id, responding `204`, or `404` when it does not exist.

#### Scenario: Existing show
- **WHEN** a client deletes an existing show
- **THEN** the system responds `204` and the show is no longer listed

#### Scenario: Unknown id
- **WHEN** a client deletes an id no show has
- **THEN** the system responds `404`

### Requirement: Shows page
The web editor SHALL show a "Shows" page listing name, audio language and creation date, with a form to add a show, a per-row language select that saves on change, and a delete button that asks for confirmation. Failure messages returned by the API SHALL be shown inline.

#### Scenario: Duplicate name in the form
- **WHEN** the parent adds a show whose name already exists
- **THEN** the page shows "A show named <name> already exists" and the list is unchanged
