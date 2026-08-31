import { create } from "zustand";
import { authApi, ApiError } from "@/lib/api";
import type {
  AuthUser,
  LoginInput,
  SignUpInput,
  UpdateProfileInput,
} from "@/lib/schemas";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  setUser: (user: AuthUser | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchUser: () => Promise<AuthUser | null>;
  login: (data: LoginInput) => Promise<AuthUser>;
  signUp: (data: SignUpInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  updateProfile: (data: UpdateProfileInput) => Promise<AuthUser>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  setUser: (user) => set({ user, isLoading: false, isInitialized: true }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  fetchUser: async () => {
    try {
      set({ isLoading: true, error: null });
      const me = await authApi.me();
      set({ user: me, isLoading: false, isInitialized: true, error: null });
      return me;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        set({ user: null, isLoading: false, isInitialized: true, error: null });
      } else {
        set({
          user: null,
          isLoading: false,
          isInitialized: true,
          error: err instanceof Error ? err.message : "Authentication failed",
        });
      }
      return null;
    }
  },

  login: async (data: LoginInput) => {
    set({ isLoading: true, error: null });
    try {
      const loggedInUser = await authApi.login(data);
      set({
        user: loggedInUser,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
      return loggedInUser;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  signUp: async (data: SignUpInput) => {
    set({ isLoading: true, error: null });
    try {
      const registeredUser = await authApi.signUp(data);
      set({
        user: registeredUser,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
      return registeredUser;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true, error: null });
      await authApi.logout();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Logout failed",
      });
    } finally {
      set({ user: null, isLoading: false });
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
        window.location.href = "/login";
      }
    }
  },

  logoutAll: async () => {
    try {
      set({ isLoading: true, error: null });
      await authApi.logoutAll();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Logout all failed",
      });
    } finally {
      set({ user: null, isLoading: false });
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
        window.location.href = "/login";
      }
    }
  },

  updateProfile: async (data: UpdateProfileInput) => {
    try {
      set({ error: null });
      const updated = await authApi.updateProfile(data);
      set({ user: updated, error: null });
      return updated;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to update profile",
      });
      throw err;
    }
  },
}));

export const useAuthUser = () => useAuthStore((s) => s.user);
export const useAuthLoading = () => useAuthStore((s) => s.isLoading);
export const useAuthInitialized = () => useAuthStore((s) => s.isInitialized);

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const login = useAuthStore((s) => s.login);
  const signUp = useAuthStore((s) => s.signUp);
  const logout = useAuthStore((s) => s.logout);
  const logoutAll = useAuthStore((s) => s.logoutAll);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  return {
    user,
    isLoading,
    refreshUser: fetchUser,
    login,
    signUp,
    logout,
    logoutAll,
    updateProfile,
  };
}
