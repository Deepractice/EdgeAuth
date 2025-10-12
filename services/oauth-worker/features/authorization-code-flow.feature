Feature: OAuth 2.0 Authorization Code Flow
  As a third-party application
  I want to use OAuth 2.0 Authorization Code Flow
  So that I can securely access user resources with their consent

  Background:
    Given an OAuth client exists with:
      | id           | test-client-123                    |
      | secret       | test-secret-456                    |
      | name         | Test Application                   |
      | redirectUris | http://localhost:3000/callback     |
      | scopes       | profile,email                      |
      | grantTypes   | authorization_code,refresh_token   |
    And a user exists with:
      | id       | user-123               |
      | email    | user@example.com       |
      | username | testuser               |

  Scenario: Successful authorization code flow
    When the client requests authorization with:
      | client_id     | test-client-123                |
      | redirect_uri  | http://localhost:3000/callback |
      | response_type | code                           |
      | scope         | profile email                  |
      | state         | random-state-123               |
    And the user grants authorization
    Then an authorization code should be generated
    And the user should be redirected to "http://localhost:3000/callback"
    And the redirect should include:
      | code  | authorization_code |
      | state | random-state-123   |

  Scenario: Exchange authorization code for access token
    Given an authorization code exists:
      | code         | auth-code-xyz                  |
      | clientId     | test-client-123                |
      | userId       | user-123                       |
      | redirectUri  | http://localhost:3000/callback |
      | scopes       | profile,email                  |
      | expiresAt    | 10 minutes from now            |
    When the client exchanges the code for tokens with:
      | grant_type    | authorization_code             |
      | code          | auth-code-xyz                  |
      | redirect_uri  | http://localhost:3000/callback |
      | client_id     | test-client-123                |
      | client_secret | test-secret-456                |
    Then the response should be successful
    And the response should include:
      | access_token  | JWT token         |
      | token_type    | Bearer            |
      | expires_in    | 3600              |
      | refresh_token | refresh token     |
      | scope         | profile email     |

  Scenario: Authorization code can only be used once
    Given an authorization code "used-code-123" has been used
    When the client tries to exchange "used-code-123" for tokens
    Then the request should fail with error "invalid_grant"
    And the error_description should be "Invalid or expired authorization code"

  Scenario: Authorization code expires after 10 minutes
    Given an authorization code "expired-code-456" expired 5 minutes ago
    When the client tries to exchange "expired-code-456" for tokens
    Then the request should fail with error "invalid_grant"
    And the error_description should be "Invalid or expired authorization code"

  Scenario: Invalid redirect_uri in token exchange
    Given an authorization code "code-789" with redirect_uri "http://localhost:3000/callback"
    When the client exchanges the code with wrong redirect_uri "http://evil.com/callback"
    Then the request should fail with error "invalid_request"
    And the error_description should be "redirect_uri mismatch"

  Scenario: Authorization with PKCE (code_challenge)
    When the client requests authorization with PKCE:
      | client_id            | test-client-123                |
      | redirect_uri         | http://localhost:3000/callback |
      | response_type        | code                           |
      | scope                | profile                        |
      | code_challenge       | challenge-base64               |
      | code_challenge_method| S256                           |
    And the user grants authorization
    Then an authorization code should be generated with PKCE

  Scenario: PKCE - Exchange code with code_verifier
    Given an authorization code with PKCE exists:
      | code                 | pkce-code-123                  |
      | codeChallenge        | E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM |
      | codeChallengeMethod  | S256                           |
    When the client exchanges the code with code_verifier "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
    Then the response should be successful
    And access_token should be returned

  Scenario: PKCE - Invalid code_verifier
    Given an authorization code with PKCE exists
    When the client exchanges the code with wrong code_verifier
    Then the request should fail with error "invalid_grant"
    And the error_description should be "Invalid code_verifier"
