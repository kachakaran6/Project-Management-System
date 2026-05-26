import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export const useRepoPullRequestDetail = (owner: string, repo: string, pullNumber: number) => {
  return useQuery({
    queryKey: ["github", owner, repo, "pulls", pullNumber, "detail"],
    queryFn: async () => {
      const res = await api.get(`/github/repos/${owner}/${repo}/pulls/${pullNumber}`);
      return res.data.data;
    },
    enabled: !!owner && !!repo && !!pullNumber,
  });
};

export const useCreatePullRequestReviewMutation = (owner: string, repo: string, pullNumber: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
      body?: string;
      comments?: Array<{ path: string; position?: number; line?: number; side?: "LEFT" | "RIGHT"; body: string }>;
    }) => {
      const res = await api.post(`/github/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`, payload);
      return res.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["github", owner, repo, "pulls", pullNumber, "detail"] });
      await queryClient.invalidateQueries({ queryKey: ["github", owner, repo, "pulls"] });
    },
  });
};

export const useMergePullRequestMutation = (owner: string, repo: string, pullNumber: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      merge_method?: "merge" | "squash" | "rebase";
      commit_title?: string;
      commit_message?: string;
      sha?: string;
      delete_branch_after_merge?: boolean;
    }) => {
      const res = await api.put(`/github/repos/${owner}/${repo}/pulls/${pullNumber}/merge`, payload);
      return res.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["github", owner, repo, "pulls", pullNumber, "detail"] });
      await queryClient.invalidateQueries({ queryKey: ["github", owner, repo, "pulls"] });
    },
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
