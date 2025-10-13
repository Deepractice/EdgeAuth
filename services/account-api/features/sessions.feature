Feature: Session Management
  As a logged-in user
  I want to manage my active sessions
  So that I can secure my account and logout from specific devices

  Scenario: Get active sessions for logged-in user
    Given I am logged in as "user@example.com"
    And I have multiple active sessions
    When I request my active sessions
    Then I should see a list of my sessions
    And each session should include session details

  Scenario: Logout specific session
    Given I am logged in as "user@example.com"
    And I have multiple active sessions
    When I logout from a specific session
    Then that session should be revoked
    And other sessions should remain active

  Scenario: Logout all other sessions
    Given I am logged in as "user@example.com"
    And I have multiple active sessions
    When I logout from all other sessions
    Then all sessions except current should be revoked
    And my current session should remain active

  Scenario: Cannot access sessions without authentication
    When I request sessions without authentication
    Then I should receive an unauthorized error
