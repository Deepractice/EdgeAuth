Feature: User Registration
  As a new user
  I want to register an account
  So that I can authenticate with the service

  Scenario: Successful user registration
    Given I am a new user
    When I register with email "test@example.com", username "testuser", and password "securepass123"
    Then the registration should succeed
    And I should receive a JWT token
    And I should receive my user information

  Scenario: Registration with existing email
    Given a user exists with email "existing@example.com"
    When I register with email "existing@example.com", username "newuser", and password "securepass123"
    Then the registration should fail with conflict error
    And the error message should contain "Email already registered"

  Scenario: Registration with existing username
    Given a user exists with username "existinguser"
    When I register with email "new@example.com", username "existinguser", and password "securepass123"
    Then the registration should fail with conflict error
    And the error message should contain "Username already taken"

  Scenario: Registration with invalid email
    Given I am a new user
    When I register with email "invalid-email", username "testuser", and password "securepass123"
    Then the registration should fail with validation error
    And the error message should contain "Invalid email format"

  Scenario: Registration with short password
    Given I am a new user
    When I register with email "test@example.com", username "testuser", and password "short"
    Then the registration should fail with validation error
    And the error message should contain "at least 8 characters"

  Scenario: Registration with invalid username
    Given I am a new user
    When I register with email "test@example.com", username "ab", and password "securepass123"
    Then the registration should fail with validation error
    And the error message should contain "3-20 characters"
