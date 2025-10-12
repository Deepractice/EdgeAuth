Feature: OAuth 2.0 Token Refresh
  As a third-party application
  I want to refresh expired access tokens
  So that I can maintain continuous access without re-authentication

  Background:
    Given an OAuth client exists with id "test-client-123"
    And a user exists with id "user-123"
    And a valid refresh token exists:
      | token     | refresh-token-xyz |
      | clientId  | test-client-123   |
      | userId    | user-123          |
      | scopes    | profile,email     |
      | expiresAt | 30 days from now  |

  Scenario: Successfully refresh access token
    When the client requests token refresh with:
      | grant_type    | refresh_token     |
      | refresh_token | refresh-token-xyz |
      | client_id     | test-client-123   |
      | client_secret | test-secret-456   |
    Then the response should be successful
    And a new access_token should be returned
    And the token_type should be "Bearer"
    And the expires_in should be 3600
    And the scope should be "profile email"

  Scenario: Refresh token is expired
    Given the refresh token "expired-refresh-token" expired 1 day ago
    When the client tries to refresh with "expired-refresh-token"
    Then the request should fail with error "invalid_grant"
    And the error_description should contain "expired"

  Scenario: Refresh token is revoked
    Given the refresh token "revoked-token" has been revoked
    When the client tries to refresh with "revoked-token"
    Then the request should fail with error "invalid_grant"

  Scenario: Invalid refresh token
    When the client tries to refresh with "non-existent-token"
    Then the request should fail with error "invalid_grant"

  Scenario: Wrong client trying to use refresh token
    Given a refresh token for client "client-A"
    When "client-B" tries to use the refresh token
    Then the request should fail with error "invalid_client"
