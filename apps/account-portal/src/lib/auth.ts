import { useAuthStore } from "./store";

export function getToken(): string | null {
  const state = useAuthStore.getState();
  return state.token;
}

export function setToken(_token: string): void {
  // This is handled by the store's setAuth method
  console.warn("Use useAuthStore.setAuth instead of setToken");
}

export function removeToken(): void {
  const state = useAuthStore.getState();
  state.clearAuth();
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export function requireAuth(navigateFn: (path: string) => void): void {
  if (!isAuthenticated()) {
    navigateFn("/login");
  }
}
