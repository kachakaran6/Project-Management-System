/**
 * Formats a given task into a standard Git branch command.
 * Output format: git checkout -b {projectId}-{taskId}-{clean-title}
 * 
 * Rules:
 * - lowercase title
 * - replace spaces and invalid characters with hyphens
 * - trim duplicate hyphens
 */
export const formatGitBranchCommand = (
  taskCode: string,
  title: string
): string => {
  // 1. Clean the title: Lowercase, replace non-alphanumeric with hyphens
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace special chars and spaces with hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  // 2. Construct branch name using the human-readable task code
  const branchName = `${taskCode}-${cleanTitle}`;

  // 3. Return full checkout command
  return `git checkout -b ${branchName}`;
};
