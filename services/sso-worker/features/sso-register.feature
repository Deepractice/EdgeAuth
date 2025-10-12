Feature: SSO User Registration
  As a new user
  I want to register an account through SSO
  So that I can access applications using SSO

  Background:
    Given the SSO service is running
    And the users database is clean

  Scenario: Display registration page with redirect URI
    When I visit "/sso/register?redirect_uri=https://app.example.com/callback"
    Then I should see the registration form
    And the form should include a hidden redirect_uri field

  Scenario: Display registration page without redirect URI
    When I visit "/sso/register"
    Then I should see the registration form
    And the form should not include a redirect_uri field

  Scenario: Reject invalid redirect URI
    When I visit "/sso/register?redirect_uri=javascript:alert(1)"
    Then I should see an error page
    And the error should mention "Invalid Redirect URI"

  Scenario: Successful registration via API
    When I POST to "/sso/register" with JSON:
      """
      {
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "password123"
      }
      """
    Then the response status should be 201
    And the response should contain user information
    And the user should exist in the database

  Scenario: Successful registration with auto-login
    When I POST to "/sso/register" with JSON:
      """
      {
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "password123",
        "redirectUri": "https://app.example.com/callback"
      }
      """
    Then I should be redirected to "https://app.example.com/callback"
    And the redirect URL should contain a token parameter
    And the token should be valid for the created user

  Scenario: Registration form submission
    When I submit the registration form with:
      | email              | newuser@example.com |
      | username           | newuser             |
      | password           | password123         |
      | redirectUri        | https://app.example.com/callback |
    Then I should be redirected to "https://app.example.com/callback"
    And the redirect URL should contain a token parameter

  Scenario: Registration form submission without redirect URI
    When I submit the registration form with:
      | email              | newuser@example.com |
      | username           | newuser             |
      | password           | password123         |
    Then the response status should be 201
    And the response should contain user information

  Scenario: Reject duplicate email
    Given a user exists with email "existing@example.com"
    When I POST to "/sso/register" with JSON:
      """
      {
        "email": "existing@example.com",
        "username": "newuser",
        "password": "password123"
      }
      """
    Then the response status should be 400
    And the error should mention "already exists"

  Scenario: Reject duplicate username
    Given a user exists with username "existinguser"
    When I POST to "/sso/register" with JSON:
      """
      {
        "email": "newuser@example.com",
        "username": "existinguser",
        "password": "password123"
      }
      """
    Then the response status should be 400
    And the error should mention "already exists"

  Scenario: Validate email format
    When I POST to "/sso/register" with JSON:
      """
      {
        "email": "invalid-email",
        "username": "newuser",
        "password": "password123"
      }
      """
    Then the response status should be 400
    And the error should mention "email"

  Scenario: Validate password strength
    When I POST to "/sso/register" with JSON:
      """
      {
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "weak"
      }
      """
    Then the response status should be 400
    And the error should mention "password"

  Scenario: Login page link to registration
    When I visit "/sso/login?redirect_uri=https://app.example.com/callback"
    Then I should see a link to "/sso/register?redirect_uri=https://app.example.com/callback"

  Scenario: Registration page link to login
    When I visit "/sso/register?redirect_uri=https://app.example.com/callback"
    Then I should see a link to "/sso/login?redirect_uri=https://app.example.com/callback"
