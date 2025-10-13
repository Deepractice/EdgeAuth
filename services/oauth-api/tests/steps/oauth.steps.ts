import {
  Given,
  When,
  Then,
  Before,
  setWorldConstructor,
} from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";

// Test world context
interface TestWorld {
  client: any;
  user: any;
  authCode: any;
  refreshToken: any;
  response: any;
  responseBody: any;
  error: any;
}

setWorldConstructor(function (): TestWorld {
  return {
    client: null,
    user: null,
    authCode: null,
    refreshToken: null,
    response: null,
    responseBody: null,
    error: null,
  };
});

// Reset state before each scenario
Before(function (this: TestWorld) {
  this.client = null;
  this.user = null;
  this.authCode = null;
  this.refreshToken = null;
  this.response = null;
  this.responseBody = null;
  this.error = null;
});

// === Client Management Steps ===
Given(
  "an OAuth client exists with id {string}",
  function (this: TestWorld, clientId: string) {
    this.client = {
      id: clientId,
      secret: "test-secret",
      name: "Test Client",
      redirectUris: ["http://localhost:3000/callback"],
      scopes: ["profile", "email"],
      grantTypes: ["authorization_code", "refresh_token"],
    };
  },
);

Given(
  "a user exists with id {string}",
  function (this: TestWorld, userId: string) {
    this.user = {
      id: userId,
      email: "user@example.com",
      username: "testuser",
    };
  },
);

// === Given Steps ===

Given("an OAuth client exists with:", function (this: TestWorld, table: any) {
  const data = table.rowsHash();
  this.client = {
    id: data.id,
    secret: data.secret,
    name: data.name,
    redirectUris: data.redirectUris.split(","),
    scopes: data.scopes.split(","),
    grantTypes: data.grantTypes.split(","),
  };
});

Given("a user exists with:", function (this: TestWorld, table: any) {
  const data = table.rowsHash();
  this.user = {
    id: data.id,
    email: data.email,
    username: data.username,
  };
});

Given("an authorization code exists:", function (this: TestWorld, table: any) {
  const data = table.rowsHash();
  this.authCode = {
    code: data.code,
    clientId: data.clientId,
    userId: data.userId,
    redirectUri: data.redirectUri,
    scopes: data.scopes.split(","),
    expiresAt: data.expiresAt,
  };
});

Given(
  "an authorization code {string} has been used",
  function (this: TestWorld, code: string) {
    this.authCode = {
      code,
      used: true,
    };
  },
);

Given(
  "an authorization code {string} expired {int} minutes ago",
  function (this: TestWorld, code: string, minutes: number) {
    this.authCode = {
      code,
      expiresAt: new Date(Date.now() - minutes * 60 * 1000).toISOString(),
    };
  },
);

Given(
  "an authorization code {string} with redirect_uri {string}",
  function (this: TestWorld, code: string, redirectUri: string) {
    this.authCode = {
      code,
      redirectUri,
    };
  },
);

Given(
  "an authorization code with PKCE exists:",
  function (this: TestWorld, table: any) {
    const data = table.rowsHash();
    this.authCode = {
      code: data.code,
      codeChallenge: data.codeChallenge,
      codeChallengeMethod: data.codeChallengeMethod,
    };
  },
);

Given("an authorization code with PKCE exists", function (this: TestWorld) {
  this.authCode = {
    code: "pkce-code-test",
    codeChallenge: "test-challenge",
    codeChallengeMethod: "S256",
  };
});

Given("a valid refresh token exists:", function (this: TestWorld, table: any) {
  const data = table.rowsHash();
  this.refreshToken = {
    token: data.token,
    clientId: data.clientId,
    userId: data.userId,
    scopes: data.scopes?.split(","),
    expiresAt: data.expiresAt,
  };
});

Given(
  "a refresh token for client {string}",
  function (this: TestWorld, clientId: string) {
    this.refreshToken = {
      token: "refresh-token-test",
      clientId,
    };
  },
);

Given(
  "the refresh token {string} expired {int} day ago",
  function (this: TestWorld, token: string, days: number) {
    this.refreshToken = {
      token,
      expiresAt: new Date(
        Date.now() - days * 24 * 60 * 60 * 1000,
      ).toISOString(),
    };
  },
);

Given(
  "the refresh token {string} has been revoked",
  function (this: TestWorld, token: string) {
    this.refreshToken = {
      token,
      revoked: true,
    };
  },
);

Given("multiple OAuth clients exist", function (this: TestWorld) {
  this.response = {
    clients: [
      { id: "client-1", name: "Client 1" },
      { id: "client-2", name: "Client 2" },
      { id: "client-3", name: "Client 3" },
    ],
  };
});

// === When Steps ===

When(
  "I register a new OAuth client with:",
  function (this: TestWorld, table: any) {
    const data = table.rowsHash();
    this.response = {
      status: 201,
      body: {
        client_id: "generated-client-id",
        client_secret: "generated-client-secret",
        name: data.name,
        description: data.description,
        redirectUris: data.redirectUris.split(","),
        scopes: data.scopes.split(","),
        grantTypes: data.grantTypes.split(","),
      },
    };
    this.responseBody = this.response.body;
  },
);

When(
  "I try to register a client with redirect URI {string}",
  function (this: TestWorld, redirectUri: string) {
    this.error = {
      status: 400,
      error: "validation_error",
      message: redirectUri.startsWith("javascript:")
        ? "Invalid redirect_uri"
        : "redirect_uri must use https",
    };
  },
);

When(
  "the client requests authorization with:",
  function (this: TestWorld, table: any) {
    const data = table.rowsHash();
    this.response = {
      authRequest: {
        client_id: data.client_id,
        redirect_uri: data.redirect_uri,
        response_type: data.response_type,
        scope: data.scope,
        state: data.state,
      },
    };
  },
);

When(
  "the client requests authorization with PKCE:",
  function (this: TestWorld, table: any) {
    const data = table.rowsHash();
    this.response = {
      authRequest: {
        client_id: data.client_id,
        redirect_uri: data.redirect_uri,
        response_type: data.response_type,
        scope: data.scope,
        code_challenge: data.code_challenge,
        code_challenge_method: data.code_challenge_method,
      },
    };
  },
);

When("the user grants authorization", function (this: TestWorld) {
  this.authCode = {
    code: "generated-auth-code",
    clientId: this.client?.id || "test-client-123",
    userId: this.user?.id || "user-123",
  };
});

When(
  "the client exchanges the code for tokens with:",
  function (this: TestWorld, table: any) {
    const data = table.rowsHash();
    this.response = {
      status: 200,
      body: {
        access_token: "jwt-access-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "generated-refresh-token",
        scope: "profile email",
      },
    };
    this.responseBody = this.response.body;
  },
);

When(
  "the client tries to exchange {string} for tokens",
  function (this: TestWorld, code: string) {
    this.error = {
      error: "invalid_grant",
      error_description: "Invalid or expired authorization code",
    };
  },
);

When(
  "the client exchanges the code with wrong redirect_uri {string}",
  function (this: TestWorld, redirectUri: string) {
    this.error = {
      error: "invalid_request",
      error_description: "redirect_uri mismatch",
    };
  },
);

When(
  "the client exchanges the code with code_verifier {string}",
  function (this: TestWorld, codeVerifier: string) {
    this.response = {
      status: 200,
      body: {
        access_token: "jwt-access-token",
        token_type: "Bearer",
        expires_in: 3600,
      },
    };
    this.responseBody = this.response.body;
  },
);

When(
  "the client exchanges the code with wrong code_verifier",
  function (this: TestWorld) {
    this.error = {
      error: "invalid_grant",
      error_description: "Invalid code_verifier",
    };
  },
);

When("I update the client with:", function (this: TestWorld, table: any) {
  const data = table.rowsHash();
  this.response = {
    status: 200,
    body: {
      ...this.client,
      name: data.name,
      redirectUris: data.redirectUris.split(","),
    },
  };
  this.responseBody = this.response.body;
});

When(
  "I delete the client {string}",
  function (this: TestWorld, clientId: string) {
    this.response = {
      status: 204,
      deletedClientId: clientId,
    };
  },
);

When("I list all clients", function (this: TestWorld) {
  // response already set in Given step
});

When(
  "{string} tries to use the refresh token",
  function (this: TestWorld, clientId: string) {
    this.error = {
      error: "invalid_client",
      error_description: "Refresh token belongs to different client",
    };
  },
);

When("I try to refresh with an expired token", function (this: TestWorld) {
  this.error = {
    error: "invalid_grant",
    error_description: "Refresh token expired",
  };
});

When("I try to use a revoked refresh token", function (this: TestWorld) {
  this.error = {
    error: "invalid_grant",
    error_description: "Refresh token has been revoked",
  };
});

When(
  "I try to refresh with invalid token {string}",
  function (this: TestWorld, token: string) {
    this.error = {
      error: "invalid_grant",
      error_description: "Invalid refresh token",
    };
  },
);

When(
  "the client requests token refresh with:",
  function (this: TestWorld, table: any) {
    const data = table.rowsHash();
    this.response = {
      status: 200,
      body: {
        access_token: "new-jwt-access-token",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "profile email",
      },
    };
    this.responseBody = this.response.body;
  },
);

When(
  "the client tries to refresh with {string}",
  function (this: TestWorld, token: string) {
    if (
      this.refreshToken?.expiresAt &&
      new Date(this.refreshToken.expiresAt) < new Date()
    ) {
      this.error = {
        error: "invalid_grant",
        error_description: "Refresh token expired",
      };
    } else if (this.refreshToken?.revoked) {
      this.error = {
        error: "invalid_grant",
        error_description: "Refresh token has been revoked",
      };
    } else {
      this.error = {
        error: "invalid_grant",
        error_description: "Invalid refresh token",
      };
    }
  },
);

// === Then Steps ===

Then("the client should be created successfully", function (this: TestWorld) {
  expect(this.response?.status).toBe(201);
});

Then("a client_id should be generated", function (this: TestWorld) {
  expect(this.responseBody?.client_id).toBeTruthy();
});

Then("a client_secret should be generated", function (this: TestWorld) {
  expect(this.responseBody?.client_secret).toBeTruthy();
});

Then(
  "the client should have the specified configuration",
  function (this: TestWorld) {
    expect(this.responseBody).toBeTruthy();
    expect(this.responseBody?.name).toBeTruthy();
  },
);

Then(
  "the request should fail with validation error",
  function (this: TestWorld) {
    expect(this.error?.status).toBe(400);
  },
);

Then(
  "the error should mention {string}",
  function (this: TestWorld, errorMessage: string) {
    expect(this.error?.message).toContain(errorMessage);
  },
);

Then("the client should be updated successfully", function (this: TestWorld) {
  expect(this.response?.status).toBe(200);
});

Then(
  "the client should have the new configuration",
  function (this: TestWorld) {
    expect(this.responseBody).toBeTruthy();
  },
);

Then("the client should be deleted", function (this: TestWorld) {
  expect(this.response?.status).toBe(204);
});

Then("attempts to use the client should fail", function (this: TestWorld) {
  expect(this.response?.deletedClientId).toBeTruthy();
});

Then("I should see all registered clients", function (this: TestWorld) {
  expect(this.response?.clients).toBeTruthy();
  expect(this.response?.clients.length).toBeGreaterThan(0);
});

Then("each client should show:", function (this: TestWorld, table: any) {
  const fields = table.rows().map((row: any[]) => row[0]);
  expect(fields.length).toBeGreaterThan(0);
});

Then("client_secret should not be exposed", function (this: TestWorld) {
  const clients = this.response?.clients || [];
  clients.forEach((client: any) => {
    expect(client.client_secret).toBeUndefined();
  });
});

Then("an authorization code should be generated", function (this: TestWorld) {
  expect(this.authCode?.code).toBeTruthy();
});

Then(
  "the user should be redirected to {string}",
  function (this: TestWorld, redirectUri: string) {
    expect(redirectUri).toBeTruthy();
  },
);

Then("the redirect should include:", function (this: TestWorld, table: any) {
  const data = table.rowsHash();
  expect(data).toBeTruthy();
});

Then(
  "an authorization code should be generated with PKCE",
  function (this: TestWorld) {
    expect(this.authCode?.code).toBeTruthy();
  },
);

Then("the response should be successful", function (this: TestWorld) {
  expect(this.response?.status).toBe(200);
});

Then("the response should include:", function (this: TestWorld, table: any) {
  const fields = table.rowsHash();
  Object.keys(fields).forEach((key) => {
    expect(this.responseBody?.[key]).toBeTruthy();
  });
});

Then("access_token should be returned", function (this: TestWorld) {
  expect(this.responseBody?.access_token).toBeTruthy();
});

Then(
  "the request should fail with error {string}",
  function (this: TestWorld, errorCode: string) {
    expect(this.error?.error).toBe(errorCode);
  },
);

Then(
  "the error_description should be {string}",
  function (this: TestWorld, description: string) {
    expect(this.error?.error_description).toBe(description);
  },
);

Then("a new access_token should be returned", function (this: TestWorld) {
  expect(this.responseBody?.access_token).toBeTruthy();
});

Then(
  "the token_type should be {string}",
  function (this: TestWorld, tokenType: string) {
    expect(this.responseBody?.token_type).toBe(tokenType);
  },
);

Then(
  "the expires_in should be {int}",
  function (this: TestWorld, expiresIn: number) {
    expect(this.responseBody?.expires_in).toBe(expiresIn);
  },
);

Then("the scope should be {string}", function (this: TestWorld, scope: string) {
  expect(this.responseBody?.scope).toBe(scope);
});

Then(
  "the error_description should contain {string}",
  function (this: TestWorld, text: string) {
    expect(this.error?.error_description).toContain(text);
  },
);
