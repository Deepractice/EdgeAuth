Feature: OAuth Client Management
  As an administrator
  I want to manage OAuth clients
  So that third-party applications can integrate with our OAuth service

  Scenario: Register a new OAuth client
    When I register a new OAuth client with:
      | name         | My Application                     |
      | description  | A test application                 |
      | redirectUris | http://localhost:3000/callback     |
      | scopes       | profile,email                      |
      | grantTypes   | authorization_code,refresh_token   |
    Then the client should be created successfully
    And a client_id should be generated
    And a client_secret should be generated
    And the client should have the specified configuration

  Scenario: Register client with invalid redirect URI
    When I try to register a client with redirect URI "javascript:alert(1)"
    Then the request should fail with validation error
    And the error should mention "Invalid redirect_uri"

  Scenario: Register client with http redirect URI (non-localhost)
    When I try to register a client with redirect URI "http://example.com/callback"
    Then the request should fail with validation error
    And the error should mention "redirect_uri must use https"

  Scenario: Update OAuth client configuration
    Given an OAuth client exists with id "client-123"
    When I update the client with:
      | name         | Updated Application Name |
      | redirectUris | https://app.example.com/callback,https://app.example.com/callback2 |
    Then the client should be updated successfully
    And the client should have the new configuration

  Scenario: Delete OAuth client
    Given an OAuth client exists with id "client-to-delete"
    When I delete the client "client-to-delete"
    Then the client should be deleted
    And attempts to use the client should fail

  Scenario: List all OAuth clients
    Given multiple OAuth clients exist
    When I list all clients
    Then I should see all registered clients
    And each client should show:
      | id          |
      | name        |
      | redirectUris|
      | scopes      |
      | createdAt   |
    But client_secret should not be exposed
