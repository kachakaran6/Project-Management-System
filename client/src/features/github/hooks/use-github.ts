import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios-instance";

export const useRepoBranches = (owner: string, repo: string, page = 1) => {
  return useQuery({
    queryKey: ["github", owner, repo, "branches", page],
    queryFn: async () => {
      const res = await api.get(`/github/repos/${owner}/${repo}/branches`, { params: { page } });
      return res.data.data;
    },
    enabled: !!owner && !!repo,
  });
};

export const useRepoCommits = (owner: string, repo: string, sha?: string, page = 1) => {
  return useQuery({
    queryKey: ["github", owner, repo, "commits", sha, page],
    queryFn: async () => {
      const res = await api.get(`/github/repos/${owner}/${repo}/commits`, { params: { sha, page } });
      return res.data.data;
    },
    enabled: !!owner && !!repo,
  });
};

export const useRepoPullRequests = (owner: string, repo: string, state = "all", page = 1) => {
  return useQuery({
    queryKey: ["github", owner, repo, "pulls", state, page],
    queryFn: async () => {
      const res = await api.get(`/github/repos/${owner}/${repo}/pulls`, { params: { state, page } });
      return res.data.data;
    },
    enabled: !!owner && !!repo,
  });
};

export const useRepoIssues = (owner: string, repo: string, state = "all", page = 1) => {
  return useQuery({
    queryKey: ["github", owner, repo, "issues", state, page],
    queryFn: async () => {
      const res = await api.get(`/github/repos/${owner}/${repo}/issues`, { params: { state, page } });
      return res.data.data;
    },
    enabled: !!owner && !!repo,
  });
};

export const useRepoFileTree = (owner: string, repo: string, sha: string) => {
  return useQuery({
    queryKey: ["github", owner, repo, "tree", sha],
    queryFn: async () => {
      const res = await api.get(`/github/repos/${owner}/${repo}/git/trees/${sha}`);
      return res.data.data;
    },
    enabled: !!owner && !!repo && !!sha,
  });
};

export const useRepoFileContent = (owner: string, repo: string, path: string, ref?: string) => {
  return useQuery({
    queryKey: ["github", owner, repo, "file", path, ref],
    queryFn: async () => {
      const res = await api.get(`/github/repos/${owner}/${repo}/contents/${path}`, { params: { ref } });
      return res.data.data;
    },
    enabled: !!owner && !!repo && !!path,
  });
};

export const useProfileAnalytics = (username: string) => {
  return useQuery({
    queryKey: ["github", "profile", username],
    queryFn: async () => {
      const res = await api.get(`/github/profile/${username}`);
      return res.data.data;
    },
    enabled: !!username,
  });
};
