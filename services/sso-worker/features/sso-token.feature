Feature: SSO Token Management
  As an application using SSO
  I want to verify and use SSO tokens
  So that I can authenticate users across applications

  Background:
    Given a registered user exists with:
      | email    | user@example.com |
      | username | testuser         |
      | password | password123      |
    And the user has logged in via SSO

  Scenario: Verify valid SSO token
    Given I have a valid SSO token
    When I send the token to the verification endpoint
    Then the token should be verified successfully
    And the response should include user information:
      | userId   |
      | email    |
      | username |

  Scenario: Verify expired SSO token
    Given I have an SSO token that expired 1 hour ago
    When I send the token to the verification endpoint
    Then the verification should fail with error "Token expired"
    And the response status should be 401

  Scenario: Verify invalid SSO token
    Given I have an invalid SSO token "fake-token-12345"
    When I send the token to the verification endpoint
    Then the verification should fail with error "Invalid token"
    And the response status should be 401

  Scenario: Verify token with malformed signature
    Given I have an SSO token with tampered signature
    When I send the token to the verification endpoint
    Then the verification should fail with error "Invalid token signature"
    And the response status should be 401

  Scenario: Get user info with valid token
    Given I have a valid SSO token
    When I request user info with the token
    Then I should receive the user information:
      | userId   | user-123         |
      | email    | user@example.com |
      | username | testuser         |

  Scenario: Get user info with expired token
    Given I have an expired SSO token
    When I request user info with the token
    Then the request should fail with error "Token expired"
    And the response status should be 401

  Scenario: Token refresh before expiry
    Given I have an SSO token that expires in 5 minutes
    When I refresh the token
    Then a new SSO token should be issued
    And the new token should have extended expiry time
    And the old token should remain valid until expiry
