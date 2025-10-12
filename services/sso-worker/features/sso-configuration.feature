Feature: SSO Configuration and Error Handling

  Background:
    Given a registered user exists with:
      | email    | demo@example.com |
      | username | demo             |
      | password | password123      |

  Scenario: Missing JWT_SECRET environment variable
    Given JWT_SECRET is not configured
    When I login with email "demo@example.com" and password "password123"
    Then I should receive an error "Configuration error: JWT_SECRET is required"

  Scenario: Missing redirect_uri parameter
    Given I visit the SSO login page without redirect_uri
    Then I should see an error page
    And the error should say "redirect_uri is required"

  Scenario: Invalid redirect_uri format
    Given I am on the SSO login page with redirect_uri "not-a-valid-url"
    Then I should see an error page
    And the error should say "Invalid redirect URI"

  Scenario: Redirect_uri not in whitelist
    Given I am on the SSO login page with redirect_uri "https://malicious-site.com/callback"
    Then I should see an error page
    And the error should say "redirect_uri not allowed"

  Scenario: Database connection failure
    Given the database is unavailable
    When I login with email "demo@example.com" and password "password123"
    Then I should receive an error "Service temporarily unavailable"

  Scenario: Malformed token verification request
    When I verify a token with invalid format "not-a-jwt-token"
    Then I should receive an error "Invalid token format"
