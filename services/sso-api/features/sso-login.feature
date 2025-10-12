Feature: SSO Login Flow
  As a user of internal applications
  I want to login once and access all applications
  So that I don't need to login repeatedly

  Background:
    Given a registered user exists with:
      | email    | user@example.com |
      | username | testuser         |
      | password | password123      |

  Scenario: User initiates SSO login from application
    Given I am on application "https://app1.example.com"
    When I click "Login" and get redirected to SSO login page
    Then I should see the SSO login page
    And the redirect_uri should be "https://app1.example.com/callback"

  Scenario: Successful SSO login with redirect
    Given I am on the SSO login page with redirect_uri "https://app1.example.com/callback"
    When I login with email "user@example.com" and password "password123"
    Then I should be redirected to "https://app1.example.com/callback"
    And the URL should include an SSO token parameter
    And the SSO token should be valid
    And the SSO token should contain user information

  Scenario: SSO login with invalid credentials
    Given I am on the SSO login page with redirect_uri "https://app1.example.com/callback"
    When I login with email "user@example.com" and password "wrongpassword"
    Then I should see an error message "Invalid credentials"
    And I should remain on the SSO login page

  Scenario: SSO login without redirect_uri
    Given I am on the SSO login page without redirect_uri
    When I login with email "user@example.com" and password "password123"
    Then the login should fail with error "redirect_uri is required"

  Scenario: SSO login with invalid redirect_uri
    Given I am on the SSO login page with redirect_uri "javascript:alert(1)"
    When I attempt to login
    Then the login should fail with error "Invalid redirect URI"

  Scenario: Already logged in user visits SSO login page
    Given I am already logged in with a valid SSO token
    When I visit the SSO login page with redirect_uri "https://app2.example.com/callback"
    Then I should be automatically redirected to "https://app2.example.com/callback"
    And the same SSO token should be passed
    And no new login is required
