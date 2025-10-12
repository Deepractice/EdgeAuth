Feature: User Login
  As a registered user
  I want to login with my credentials
  So that I can access the service

  Background:
    Given a user exists with email "test@example.com", username "testuser", and password "securepass123"

  Scenario: Successful login with email
    When I login with account "test@example.com" and password "securepass123"
    Then the login should succeed
    And I should receive a JWT token
    And I should receive my user information

  Scenario: Successful login with username
    When I login with account "testuser" and password "securepass123"
    Then the login should succeed
    And I should receive a JWT token
    And I should receive my user information

  Scenario: Login with incorrect password
    When I login with account "test@example.com" and password "wrongpassword"
    Then the login should fail with unauthorized error
    And the error message should contain "Invalid credentials"

  Scenario: Login with non-existent email
    When I login with account "nonexistent@example.com" and password "securepass123"
    Then the login should fail with unauthorized error
    And the error message should contain "Invalid credentials"

  Scenario: Login with non-existent username
    When I login with account "nonexistent" and password "securepass123"
    Then the login should fail with unauthorized error
    And the error message should contain "Invalid credentials"

  Scenario: Login with invalid email format
    When I login with account "@invalid@" and password "securepass123"
    Then the login should fail with validation error
