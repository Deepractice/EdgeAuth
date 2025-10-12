Feature: User Self-Registration
  As a new user
  I want to register my own account
  So that I can use the authentication service

  Scenario: Successful registration
    Given I am a new user
    When I register with email "user@example.com", username "newuser", and password "SecurePass123"
    Then the registration should succeed
    And a verification email should be sent
    And I should receive a message to check my email

  Scenario: Registration with existing email
    Given a user exists with email "existing@example.com"
    When I register with email "existing@example.com", username "newuser", and password "SecurePass123"
    Then the registration should fail with conflict error
    And the error message should contain "Email already registered"

  Scenario: Registration with invalid email
    Given I am a new user
    When I register with email "invalid-email", username "newuser", and password "SecurePass123"
    Then the registration should fail with validation error
