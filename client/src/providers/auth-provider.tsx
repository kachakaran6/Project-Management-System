import { useEffect } from "react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { fetchMe, setToken, logout } from "@/features/auth/authSlice";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { token, isAuthenticated, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMe());
    }
  }, [token, user, dispatch]);

  // SYNC from outside Redux (e.g. Axios interceptors)
  useEffect(() => {
    const handleRefreshed = (e: any) => {
      dispatch(setToken(e.detail));
    };
    const handleLogout = () => {
      dispatch(logout());
    };

    window.addEventListener("auth-token-refreshed", handleRefreshed);
    window.addEventListener("auth-logout", handleLogout);

    return () => {
      window.removeEventListener("auth-token-refreshed", handleRefreshed);
      window.removeEventListener("auth-logout", handleLogout);
    };
  }, [dispatch]);

  // AUTO-REFRESH Logic
  useEffect(() => {
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const expiryTime = payload.exp * 1000;
      const refreshBuffer = 2 * 60 * 1000;
      const delay = expiryTime - Date.now() - refreshBuffer;

      if (delay > 0) {
        const timer = setTimeout(async () => {
          // Trigger refresh logic here
          console.log("[AUTH] Token refresh needed soon...");
        }, delay);

        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn("[AUTH] Failed to schedule auto-refresh", e);
    }
  }, [token]);

  return <>{children}</>;
}
