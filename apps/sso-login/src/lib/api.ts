const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface LoginRequest {
  account: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: string
    email: string
    username: string
  }
}

export interface ApiError {
  error: string
  message: string
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.message || 'Login failed')
  }

  return response.json()
}

export async function verifyToken(token: string): Promise<LoginResponse['user']> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Invalid token')
  }

  return response.json()
}
