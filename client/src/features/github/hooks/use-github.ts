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

export const useRepoCommits = (
  owner: string, 
  repo: string, 
  options?: { sha?: string; page?: number; perPage?: number; since?: string; until?: string }
) => {
  return useQuery({
    queryKey: ["github", owner, repo, "commits", options],
    queryFn: async () => {
      const params: any = {};
      if (options?.sha) params.sha = options.sha;
      if (options?.page) params.page = options.page;
      if (options?.perPage) params.per_page = options.perPage;
      if (options?.since) params.since = options.since;
      if (options?.until) params.until = options.until;
      
      const res = await api.get(`/github/repos/${owner}/${repo}/commits`, { params });
      return res.data.data;
    },
    enabled: !!owner && !!repo,
  });
};

export const useRepoTotalCommits = (owner: string, repo: string) => {
  return useQuery({
    queryKey: ["github", owner, repo, "commits", "total"],
    queryFn: async () => {
      const res = await api.get(`/github/repos/${owner}/${repo}/commits/total`);
      return res.data.data;
    },
    enabled: !!owner && !!repo,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
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

export const useRepoCommitStats = (owner: string, repo: string) => {
  return useQuery({
    queryKey: ["github", owner, repo, "stats", "commits"],
    queryFn: async () => {
      const fetchStats = async (retries = 3, delay = 1000): Promise<any> => {
        try {
          const res = await api.get(`/github/repos/${owner}/${repo}/stats/commits`);
          const data = res.data.data;
          
          // If valid array is returned, we have our data
          if (Array.isArray(data) && data.length > 0) {
            return data;
          }
          
          // If GitHub is still computing (returns {} or empty array), wait and retry
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchStats(retries - 1, delay * 1.5);
          }
          
          return [];
        } catch (e) {
          return [];
        }
      };

      return await fetchStats();
    },
    enabled: !!owner && !!repo,
    staleTime: 1000 * 60 * 5,
  });
};

export const useProfileCommitStats = (repos: any[]) => {
  return useQuery({
    queryKey: ["github", "profile", "stats", "commits", repos?.map(r => r.name).join(',')],
    queryFn: async () => {
      // Limit to top 10 most recently active repos to reduce API calls
      const topRepos = [...repos]
        .sort((a, b) => new Date(b.pushed_at || b.updated_at).getTime() - new Date(a.pushed_at || a.updated_at).getTime())
        .slice(0, 10);

      const fetchStats = async (repo: any, retries = 2, delay = 1500): Promise<{ repo: string; stats: any[] }> => {
        try {
          const res = await api.get(`/github/repos/${repo.owner.login}/${repo.name}/stats/commits`);
          const data = res.data.data;
          if (Array.isArray(data) && data.length > 0) {
            return { repo: repo.name, stats: data };
          }
          // GitHub is still computing — wait and retry
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchStats(repo, retries - 1, delay * 1.5);
          }
          return { repo: repo.name, stats: [] };
        } catch (e) {
          return { repo: repo.name, stats: [] };
        }
      };

      // Process in batches of 3 to avoid ERR_INSUFFICIENT_RESOURCES
      const BATCH_SIZE = 3;
      const results: { repo: string; stats: any[] }[] = [];

      for (let i = 0; i < topRepos.length; i += BATCH_SIZE) {
        const batch = topRepos.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(repo => fetchStats(repo)));
        results.push(...batchResults);

        // Small pause between batches to respect rate limits
        if (i + BATCH_SIZE < topRepos.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      return results;
    },
    enabled: !!repos && repos.length > 0,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
};
