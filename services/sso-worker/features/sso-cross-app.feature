Feature: SSO Cross-Application Access
  As a user with multiple applications
  I want seamless access across all applications
  So that I can navigate freely without repeated logins

  Background:
    Given a registered user exists with:
      | email    | user@example.com |
      | username | testuser         |
      | password | password123      |
    And the following applications are registered:
      | appId | name        | domain                |
      | app1  | Dashboard   | app1.example.com      |
      | app2  | Analytics   | app2.example.com      |
      | app3  | Admin Panel | admin.example.com     |

  Scenario: First application login creates SSO session
    Given I am not logged in anywhere
    When I login to "app1.example.com"
    Then an SSO session should be created
    And I should receive an SSO token
    And the token should be valid for all registered applications

  Scenario: Automatic login to second application
    Given I am logged into "app1.example.com" with SSO token
    When I visit "app2.example.com"
    Then I should be automatically logged in
    And no login prompt should appear
    And the same SSO token should be used

  Scenario: Access third application without re-authentication
    Given I am logged into:
      | app1.example.com |
      | app2.example.com |
    When I navigate to "admin.example.com"
    Then I should gain immediate access
    And my user session should be recognized
    And the SSO token should work across all three apps

  Scenario: Token sharing across applications
    Given I login to "app1.example.com" and receive SSO token "sso-token-abc"
    When I use "sso-token-abc" to access "app2.example.com"
    Then the token should be accepted
    And I should see my user profile
    And no additional authentication should be required

  Scenario: Application-specific permissions with shared authentication
    Given I am logged in with SSO
    And I have "admin" role in "admin.example.com"
    And I have "viewer" role in "app2.example.com"
    When I access "admin.example.com"
    Then I should have admin privileges
    When I access "app2.example.com"
    Then I should have viewer privileges
    And the same SSO token is used for both

  Scenario: Cross-application logout propagation
    Given I am logged into all applications:
      | app1.example.com  |
      | app2.example.com  |
      | admin.example.com |
    When I logout from any application
    Then I should be logged out from all applications
    And the SSO token should be revoked globally
    And accessing any application should require re-login

  Scenario: Session persistence across browser tabs
    Given I login to "app1.example.com" in tab 1
    When I open "app2.example.com" in tab 2
    Then I should be automatically logged in
    When I logout from tab 2
    Then tab 1 should also reflect logout state

  Scenario: SSO with different application domains
    Given applications exist on different domains:
      | main.example.com    |
      | analytics.other.com |
      | admin.another.net   |
    When I login to any one application
    Then the SSO token should work across all domains
    And cross-origin authentication should be handled securely

  Scenario: New application joins SSO ecosystem
    Given I am logged in with existing SSO token
    And a new application "app4.example.com" is registered
    When I visit "app4.example.com" for the first time
    Then my existing SSO token should grant access
    And no additional login should be required
    And the application should recognize my user session
