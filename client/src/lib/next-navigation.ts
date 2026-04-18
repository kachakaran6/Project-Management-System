import { useMemo } from "react";
import {
  useLocation,
  useNavigate,
  useParams as useReactRouterParams,
} from "react-router-dom";

type RouterOptions = {
  scroll?: boolean;
};

export function useRouter() {
  const navigate = useNavigate();

  return useMemo(
    () => ({
      push: (href: string, _options?: RouterOptions) => {
        navigate(href);
      },
      replace: (href: string, _options?: RouterOptions) => {
        navigate(href, { replace: true });
      },
      back: () => {
        navigate(-1);
      },
      forward: () => {
        navigate(1);
      },
      refresh: () => {
        window.location.reload();
      },
      prefetch: async (_href: string) => {
        return;
      },
    }),
    [navigate],
  );
}

export function usePathname() {
  return useLocation().pathname;
}

export function useSearchParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export const useParams = useReactRouterParams;
