const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface LoginRequest {
  account: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export interface ApiError {
  error: string;
  message: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || "Login failed");
  }

  return response.json();
}

export async function verifyToken(
  token: string,
): Promise<LoginResponse["user"]> {
  const response = await fetch(`${API_BASE_URL}/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Invalid token");
  }

  return response.json();
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  requiresVerification: boolean;
}

export async function register(
  data: RegisterRequest,
): Promise<RegisterResponse> {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || "Registration failed");
  }

  return response.json();
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  createdAt: string;
}

export async function getProfile(token: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    const error: ApiError = await response.json();
    throw new Error(error.message || "Failed to fetch profile");
  }

  return response.json();
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(
  token: string,
  data: ChangePasswordRequest,
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    const error: ApiError = await response.json();
    throw new Error(error.message || "Failed to change password");
  }

  return response.json();
}

export interface Session {
  id: string;
  createdAt: string;
  lastAccessedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export async function getSessions(token: string): Promise<Session[]> {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    const error: ApiError = await response.json();
    throw new Error(error.message || "Failed to fetch sessions");
  }

  return response.json();
}

export async function logoutSession(
  token: string,
  sessionId: string,
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    const error: ApiError = await response.json();
    throw new Error(error.message || "Failed to logout session");
  }

  return response.json();
}

export async function logoutAllSessions(
  token: string,
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    const error: ApiError = await response.json();
    throw new Error(error.message || "Failed to logout all sessions");
  }

  return response.json();
}
