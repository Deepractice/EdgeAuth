Feature: Token Authentication
  As an authenticated user
  I want to access protected resources with my JWT token
  So that I can use the service securely

  Background:
    Given a user exists with email "test@example.com", username "testuser", and password "securepass123"
    And I have logged in and received a JWT token

  Scenario: Get user info with valid token
    When I request my user information with the token
    Then the request should succeed
    And I should receive my user information

  Scenario: Get user info with invalid token
    When I request my user information with an invalid token
    Then the request should fail with unauthorized error
    And the error message should contain "Invalid token"

  Scenario: Get user info without token
    When I request my user information without a token
    Then the request should fail with unauthorized error
    And the error message should contain "Missing or invalid authorization header"

  Scenario: Get user info with expired token
    Given I have an expired JWT token
    When I request my user information with the token
    Then the request should fail with unauthorized error
    And the error message should contain "Token has expired"
