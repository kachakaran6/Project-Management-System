# Pull Request Review & Merge System Plan

## 1. PR Architecture Plan

Current state: the GitHub module already proxies repository/branch/commit/PR listing and webhook activity, but it did not own PR detail state, review actions, or merge actions. The new detail route and backend contract add a GitHub-backed PR workspace without disturbing repository browsing.

Immediate architecture goals:
- Keep GitHub as the source of truth for PR state, mergeability, reviews, files, and checks.
- Add a dedicated PR detail surface instead of overloading the PR list tab.
- Separate read concerns from write concerns:
  - read: PR summary, reviews, files, commits, checks, comments
  - write: review submission, merge request, optional branch cleanup
- Preserve current repo browsing, commit browsing, issue browsing, notifications, activity feeds, and websocket flows.

Current implementation anchor points:
- Backend proxy/service: `backend/src/modules/github/github.service.ts`
- Backend routes: `backend/src/modules/github/github.routes.ts`
- Client PR list: `client/src/features/github/components/pull-requests-tab.tsx`
- Client PR detail: `client/src/app/(dashboard)/github/[owner]/[repo]/pulls/[number]/page.tsx`

## 2. Review Workflow Design

Review states should map to GitHub review state plus app-level lifecycle labels:
- Open
- In review
- Changes requested
- Approved
- Conflicting
- Ready to merge
- Merged
- Closed
- Draft PR

Workflow:
1. Reviewer opens the PR detail page.
2. Reviewer reads conversation, commits, checks, and file diffs.
3. Reviewer submits one of:
   - approve
   - request changes
   - comment review
4. The backend forwards the action to GitHub review APIs.
5. The detail page refreshes review state and mergeability.
6. Merge actions remain blocked until GitHub reports the PR as mergeable and checks are green.

Review data model needs:
- review summary
- threaded comments
- inline comments
- reaction counts if supported later
- latest state per reviewer
- pending versus submitted review distinction

## 3. Mergeability Engine Design

Mergeability must be authoritative and not inferred from UI labels.

Source signals:
- `pull_request.mergeable`
- `pull_request.mergeable_state`
- branch protection results
- status checks / check runs
- reviewer approvals
- draft flag
- source branch existence
- base branch updates

Computed banners:
- This branch has conflicts
- Branch is outdated
- CI checks failing
- Missing approvals
- Ready to merge
- Draft PR
- Merge blocked

The first backend version should remain GitHub-backed. Later, if self-hosted merge simulation is needed, add a local merge engine that compares branch refs and generates a merge preview before enabling merge actions.

## 4. Conflict Resolution Strategy

Conflict handling must be real and source-driven.

Primary approach now:
- Use GitHub mergeability status as the truth source.
- When GitHub reports `dirty`, surface the PR as conflicting.
- Show the conflicting context through changed files and diff patches.
- Block merge actions until the conflict is resolved upstream.

Future self-hosted enhancement:
- fetch base/head branch contents
- compute a three-way merge preview
- list conflicting files explicitly
- support manual resolution diffs
- submit resolved branch content back to the provider or repository

Important rule:
- do not fake conflict resolution in the UI
- do not claim manual resolution unless the backend can actually update branch content or merge state

## 5. Backend Service Breakdown

Recommended backend services:
- PR summary service: fetches PR header, labels, reviewers, status, draft state, and mergeability
- review service: creates approved / change-request / comment reviews
- checks service: aggregates status checks and check runs from the head SHA
- file diff service: returns changed files and patch data
- commit service: returns commit history for the PR
- merge service: performs merge and optional branch cleanup
- approval rules service: validates branch protection and required approvals
- merge queue service: serializes merges into protected branches

Current backend implementation already provides the first layer:
- generic GitHub API proxy
- PR detail aggregate endpoint
- review create endpoint
- merge endpoint

## 6. Database Schema Plan

If the product needs internal PR state caching or provider-independent collaboration history, add these entities:
- PullRequestReviews
- PullRequestComments
- ReviewThreads
- ConflictResolutions
- MergeChecks
- ApprovalRules

Suggested indexes:
- repositoryId
- pullNumber
- reviewerId
- status
- mergeability
- branch names
- updatedAt / createdAt for timeline queries

Recommended denormalized fields for scale:
- latestReviewState
- reviewCountsByState
- mergeableState
- requiredApprovalsMet
- checksPassed
- hasConflicts
- draft
- sourceBranchDeleted

## 7. Realtime Event Architecture

Realtime updates should be event-driven and scoped by repository/workspace room.

Events to emit:
- PR review created
- PR review updated
- comment added
- approval status changed
- checks updated
- mergeability changed
- conflict detected
- reviewer assigned
- reviewer removed
- PR merged
- PR closed

Transport:
- websocket room per workspace or repository
- optional server-sent events for read-only views

Reactivity rules:
- invalidate the PR detail query on mutation success
- update list cards when a PR state changes
- avoid broadcasting full diffs when only metadata changes

## 8. Permission Matrix

Permission checks should be enforced server-side.

Roles / rules:
- repository admin: can merge, override, configure branch rules
- maintainer: can review and merge if allowed by branch rules
- reviewer: can approve or request changes if assigned or eligible
- contributor: can open PRs and comment, but not bypass protection
- admin override: possible only when explicitly allowed

Blocked actions:
- unauthorized merge
- self-approval when disabled
- merge with failing checks when protection requires success
- bypass required approvals
- merge into protected branch without permission

## 9. Performance Optimization Plan

Large repo support needs both query discipline and UI virtualization.

Backend:
- cache PR detail aggregates with short TTL
- request de-duplication for repeated PR detail reads
- paginate files, commits, and comments when large
- avoid recomputing mergeability on every refresh when GitHub already provides it

Frontend:
- lazy-load heavy tabs
- virtualize large diff lists later if file counts are high
- defer rendering of patch content until the Files tab is active
- keep timeline rendering incremental
- paginate or chunk comment threads for very large conversations

## 10. Mobile UX Strategy

Mobile review must remain usable even when the diff is dense.

Guidelines:
- keep actions stacked vertically on small screens
- collapse diff side-by-side into a single-column unified patch on mobile
- preserve approve / request changes / comment actions at thumb reach
- keep reviewer and merge banners visible near the top
- make file navigation sticky or dropdown-based on narrow screens

## 11. Regression Risk Analysis

Primary risks:
- GitHub API permission failures on review or merge mutations
- mergeability fields being temporarily null while GitHub calculates state
- rate limiting on repeated detail polling
- accidental use of stale PR detail data after force pushes or rebases
- branch deletion failing after merge
- UI regressions in existing repository browsing tabs

Mitigations:
- treat GitHub as source of truth
- invalidate queries on mutation success
- surface permissions and blocked actions clearly
- guard merge button until mergeable
- keep legacy repo tabs untouched

## 12. Safe Rollout Strategy

Rollout should be incremental:
1. Ship read-only PR detail view first.
2. Enable review submission next.
3. Enable merge actions with branch cleanup behind a feature flag.
4. Add conflict-resolution enhancements only after backend support exists.
5. Turn on websocket events after read/write paths are stable.

Recommended rollout gates:
- confirm PR list still loads
- confirm PR detail loads for open / closed / merged / draft PRs
- confirm review submission works on a test repo
- confirm merge action respects branch protection
- confirm branch deletion does not break repo syncing

## Current Delivery Summary

The current codebase now has:
- backend GitHub PR detail/review/merge proxies
- a dedicated PR detail route in the client
- richer PR list badges and local navigation into the review workspace
- a markdown plan capturing the full target architecture

The remaining work is to harden permission checks, expand conflict workflows, and add backend persistence only if product requirements demand provider-independent PR state.
