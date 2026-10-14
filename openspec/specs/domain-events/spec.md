# domain-events Specification

## Purpose

Records domain events atomically with the state change that caused them and delivers them to handlers, so downstream reactions survive crashes and restarts.

## Requirements

### Requirement: Events are stored atomically with the change
The system SHALL store a domain event in the same transaction as the state change that produced it; either both persist or neither does.

#### Scenario: Show created
- **WHEN** a show is created successfully
- **THEN** exactly one unprocessed `ShowCreated` event `{ showId, name, audioLanguage, occurredAt }` is stored

#### Scenario: Rejected create
- **WHEN** a show create is rejected (validation or duplicate name)
- **THEN** no event is stored

### Requirement: Events are dispatched at least once, in order
The system SHALL poll for unprocessed events about every second, hand each to the handler registered for its type in storage order, and mark it processed after the handler succeeds. Handlers MUST be idempotent because an event may be delivered more than once.

#### Scenario: ShowCreated is logged
- **WHEN** a `ShowCreated` event is pending
- **THEN** within about a second a log line for the event is written and the event is marked processed

#### Scenario: Handler fails
- **WHEN** a handler throws
- **THEN** the event stays unprocessed and is retried on a later poll
