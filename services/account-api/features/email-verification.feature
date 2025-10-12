Feature: Email Verification
  As a registered user
  I want to verify my email address
  So that I can activate my account

  Scenario: Successful email verification
    Given I registered with email "user@example.com"
    And I received a verification email with a token
    When I verify my email with the token
    Then the verification should succeed
    And my account should be activated

  Scenario: Verification with invalid token
    When I verify my email with an invalid token
    Then the verification should fail with validation error

  Scenario: Verification with expired token
    Given I registered with email "user@example.com"
    And my verification token expired
    When I verify my email with the expired token
    Then the verification should fail with validation error
