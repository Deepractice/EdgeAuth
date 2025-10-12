Feature: SSO Logout and Session Management
  As a user of internal applications
  I want to logout from all applications at once
  So that my session is properly terminated everywhere

  Background:
    Given a registered user exists with:
      | email    | user@example.com |
      | username | testuser         |
      | password | password123      |
    And the user has logged in via SSO

  Scenario: Single logout from one application
    Given I am logged into applications:
      | app1.example.com |
      | app2.example.com |
      | app3.example.com |
    When I logout from "app1.example.com"
    Then my SSO token should be revoked
    And I should be logged out from all applications
    And attempts to use the token should fail

  Scenario: Logout with valid token
    Given I have a valid SSO token
    When I call the logout endpoint with my token
    Then the logout should be successful
    And the token should be invalidated
    And subsequent verification of the token should fail

  Scenario: Logout with already logged out token
    Given I have logged out with my SSO token
    When I try to logout again with the same token
    Then the logout should fail with error "Already logged out"
    And the response status should be 400

  Scenario: Logout with invalid token
    Given I have an invalid SSO token
    When I call the logout endpoint with the token
    Then the logout should fail with error "Invalid token"
    And the response status should be 401

  Scenario: Logout with redirect back to application
    Given I am on "app1.example.com" with a valid SSO token
    When I logout with redirect_uri "https://app1.example.com/logged-out"
    Then the logout should be successful
    And I should be redirected to "https://app1.example.com/logged-out"

  Scenario: Session expiry handling
    Given I have an SSO session that expires in 1 minute
    When the session expires
    Then any token verification should fail with "Session expired"
    And I should be prompted to login again

  Scenario: Concurrent session management
    Given I login on device "Desktop" and receive token "token-1"
    And I login on device "Mobile" and receive token "token-2"
    When I logout from "Desktop" with token "token-1"
    Then "token-1" should be invalidated
    And "token-2" should still be valid
    And I should still be logged in on "Mobile"

  Scenario: Logout all sessions
    Given I have multiple active sessions:
      | device  | token   |
      | Desktop | token-1 |
      | Mobile  | token-2 |
      | Tablet  | token-3 |
    When I call logout-all endpoint with any valid token
    Then all tokens should be invalidated
    And I should be logged out from all devices
