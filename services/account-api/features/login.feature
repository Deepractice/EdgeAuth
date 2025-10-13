Feature: User Login
  As a registered user
  I want to login to my account
  So that I can access protected resources

  Scenario: Successful login with verified email
    Given I registered with email "verified@example.com"
    And I verified my email
    When I login with email "verified@example.com" and password "SecurePass123"
    Then the login should succeed
    And I should receive a JWT token
    And I should receive my user information

  Scenario: Login without email verification
    Given I registered with email "unverified@example.com"
    But I did not verify my email
    When I login with email "unverified@example.com" and password "SecurePass123"
    Then the login should fail with "Please verify your email before logging in"

  Scenario: Login with invalid password
    Given I registered with email "user@example.com"
    And I verified my email
    When I login with email "user@example.com" and password "WrongPassword"
    Then the login should fail with "Invalid credentials"

  Scenario: Login with non-existent email
    When I login with email "nonexistent@example.com" and password "AnyPassword"
    Then the login should fail with "Invalid credentials"

  Scenario: Login with username instead of email
    Given I registered with email "user@example.com" and username "testuser"
    And I verified my email
    When I login with username "testuser" and password "SecurePass123"
    Then the login should succeed
