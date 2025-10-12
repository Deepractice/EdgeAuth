Feature: Profile Management
  As an authenticated user
  I want to manage my profile
  So that I can update my information

  Scenario: Get my profile
    Given I am logged in as "user@example.com"
    When I request my profile
    Then I should see my email, username, and account details

  Scenario: Update profile
    Given I am logged in as "user@example.com"
    When I update my username to "newusername"
    Then the update should succeed
    And my username should be "newusername"

  Scenario: Change password
    Given I am logged in with password "OldPass123"
    When I change my password to "NewPass456"
    Then the password change should succeed
    And I should be able to login with the new password
