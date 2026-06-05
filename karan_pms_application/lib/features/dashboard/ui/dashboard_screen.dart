import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/loading_skeleton.dart';
import '../../../shared/widgets/surface_card.dart';
import '../../auth/providers/auth_provider.dart';
import '../../notifications/models/notification_model.dart';
import '../../tasks/ui/widgets/compact_task_row.dart';
import '../providers/dashboard_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardState = ref.watch(dashboardNotifierProvider);
    final session = ref.watch(authSessionProvider).value;
    final user = session?.user;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(dashboardNotifierProvider.notifier).refresh();
          await ref.read(authSessionProvider.notifier).refresh();
        },
        color: AppColors.primary,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.base, 18, AppSpacing.base, AppSpacing.md),
                child: _HomeHeader(
                  user: user,
                  workspaceName: session?.workspaceName ?? 'Workspace',
                  unreadCount: dashboardState.value?.unreadNotifications ?? 0,
                  onNotificationsTap: () => context.push('/profile'),
                  onSearchTap: () => context.push('/tasks'),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
                child: _MetricsStrip(
                  isLoading: dashboardState.isLoading,
                  totalProjects: dashboardState.value?.totalProjects ?? 0,
                  totalTasks: dashboardState.value?.totalTasks ?? 0,
                  unreadNotifications: dashboardState.value?.unreadNotifications ?? 0,
                  activeTasks: dashboardState.value?.myTasks.length ?? 0,
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.base)),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
              sliver: _QuickActionsGrid(
                onCreateTask: () => context.push('/tasks/add'),
                onCreateProject: () => context.push('/projects/add'),
                onMyTasks: () => context.push('/tasks'),
                onSearch: () => context.push('/tasks'),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.base)),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
              sliver: SliverToBoxAdapter(
                child: _SectionHeader(
                  title: 'Priority Tasks',
                  actionLabel: 'View all',
                  onAction: () => context.push('/tasks'),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
              sliver: dashboardState.when(
                loading: () => SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => const Padding(
                      padding: EdgeInsets.only(bottom: AppSpacing.sm),
                      child: LoadingSkeleton(
                        isLoading: true,
                        child: CompactTaskRowSkeleton(),
                      ),
                    ),
                    childCount: 3,
                  ),
                ),
                error: (error, stackTrace) => SliverToBoxAdapter(
                  child: SurfaceCard(
                    child: Text('Unable to load dashboard data.', style: AppTypography.bodyMd.copyWith(color: AppColors.semanticError)),
                  ),
                ),
                data: (state) {
                  final priorityTasks = state.myTasks.where((task) => task.status != 'DONE').take(5).toList();
                  if (priorityTasks.isEmpty) {
                    return SliverToBoxAdapter(
                      child: SurfaceCard(
                        padding: const EdgeInsets.all(AppSpacing.base),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('No active tasks', style: AppTypography.titleSm),
                            const SizedBox(height: AppSpacing.xxs),
                            Text('Create a task or check a different project to get started.', style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
                          ],
                        ),
                      ),
                    );
                  }

                  return SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final task = priorityTasks[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                          child: CompactTaskRow(
                            task: task,
                            onTap: () => context.push('/tasks/${task.id}', extra: task),
                          ),
                        );
                      },
                      childCount: priorityTasks.length,
                    ),
                  );
                },
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.base)),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
              sliver: SliverToBoxAdapter(
                child: _SectionHeader(
                  title: 'Recent Projects',
                  actionLabel: 'Browse',
                  onAction: () => context.push('/projects'),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 148,
                child: dashboardState.when(
                  loading: () => ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
                    scrollDirection: Axis.horizontal,
                    itemCount: 3,
                    separatorBuilder: (context, index) => const SizedBox(width: AppSpacing.sm),
                    itemBuilder: (context, index) => const LoadingSkeleton(isLoading: true, child: _RecentProjectSkeleton()),
                  ),
                  error: (error, stackTrace) => const SizedBox.shrink(),
                  data: (state) {
                    if (state.recentProjects.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
                        child: SurfaceCard(
                          child: Text('No recent projects yet.', style: AppTypography.bodyMd.copyWith(color: AppColors.muted)),
                        ),
                      );
                    }

                    return ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
                      scrollDirection: Axis.horizontal,
                      itemCount: state.recentProjects.length,
                      separatorBuilder: (context, index) => const SizedBox(width: AppSpacing.sm),
                      itemBuilder: (context, index) {
                        final project = state.recentProjects[index];
                        return _RecentProjectCard(projectName: project.name, status: project.status, workspaceName: project.workspace?.name ?? session?.workspaceName ?? 'Workspace', onTap: () => context.push('/projects/${project.id}', extra: project));
                      },
                    );
                  },
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.base)),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
              sliver: SliverToBoxAdapter(
                child: _SectionHeader(
                  title: 'Activity Feed',
                  actionLabel: 'Open inbox',
                  onAction: () => context.push('/profile'),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
              sliver: dashboardState.when(
                loading: () => SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => const Padding(
                      padding: EdgeInsets.only(bottom: AppSpacing.sm),
                      child: LoadingSkeleton(isLoading: true, child: _ActivitySkeleton()),
                    ),
                    childCount: 4,
                  ),
                ),
                error: (error, stackTrace) => const SliverToBoxAdapter(child: SizedBox.shrink()),
                data: (state) {
                  if (state.recentNotifications.isEmpty) {
                    return SliverToBoxAdapter(
                      child: SurfaceCard(
                        child: Text('No recent activity yet.', style: AppTypography.bodyMd.copyWith(color: AppColors.muted)),
                      ),
                    );
                  }

                  return SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final item = state.recentNotifications[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                          child: _ActivityItem(notification: item),
                        );
                      },
                      childCount: state.recentNotifications.length,
                    ),
                  );
                },
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 96)),
          ],
        ),
      ),
    );
  }
}

class _HomeHeader extends StatelessWidget {
  final dynamic user;
  final String workspaceName;
  final int unreadCount;
  final VoidCallback onNotificationsTap;
  final VoidCallback onSearchTap;

  const _HomeHeader({
    required this.user,
    required this.workspaceName,
    required this.unreadCount,
    required this.onNotificationsTap,
    required this.onSearchTap,
  });

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final initials = (user?.firstName ?? 'U').toString().isNotEmpty ? (user!.firstName as String).characters.first.toUpperCase() : 'U';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 24,
          backgroundColor: AppColors.primary.withValues(alpha: 0.12),
          backgroundImage: user?.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
          child: user?.avatarUrl == null ? Text(initials, style: AppTypography.titleMd.copyWith(color: AppColors.primary)) : null,
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_greeting(), style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
              const SizedBox(height: 2),
              Text(user?.firstName ?? 'User', style: AppTypography.displaySm),
              const SizedBox(height: 2),
              Text(workspaceName, style: AppTypography.bodyMd.copyWith(color: AppColors.muted)),
            ],
          ),
        ),
        Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(onPressed: onSearchTap, icon: const Icon(Icons.search_rounded, color: AppColors.ink)),
            Positioned(
              right: 2,
              top: 2,
              child: GestureDetector(
                onTap: onNotificationsTap,
                child: Container(
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(color: AppColors.semanticError, borderRadius: BorderRadius.circular(9999)),
                  alignment: Alignment.center,
                  child: Text(unreadCount > 9 ? '9+' : '$unreadCount', style: AppTypography.caption.copyWith(color: Colors.white, fontSize: 10)),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _MetricsStrip extends StatelessWidget {
  final bool isLoading;
  final int totalProjects;
  final int totalTasks;
  final int unreadNotifications;
  final int activeTasks;

  const _MetricsStrip({
    required this.isLoading,
    required this.totalProjects,
    required this.totalTasks,
    required this.unreadNotifications,
    required this.activeTasks,
  });

  @override
  Widget build(BuildContext context) {
    final items = [
      ('Projects', totalProjects.toString(), AppColors.timelineRead),
      ('Tasks', totalTasks.toString(), AppColors.timelineDone),
      ('Active', activeTasks.toString(), AppColors.timelineEdit),
      ('Unread', unreadNotifications.toString(), AppColors.semanticError),
    ];

    return SizedBox(
      height: 72,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (context, index) => const SizedBox(width: AppSpacing.sm),
        itemBuilder: (context, index) {
          final item = items[index];
          return LoadingSkeleton(
            isLoading: isLoading,
            child: Container(
              width: 120,
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.surfaceCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.hairlineSoft),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(item.$1, style: AppTypography.caption.copyWith(color: AppColors.muted)),
                  const SizedBox(height: 4),
                  Text(item.$2, style: AppTypography.titleMd.copyWith(color: item.$3)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _QuickActionsGrid extends StatelessWidget {
  final VoidCallback onCreateTask;
  final VoidCallback onCreateProject;
  final VoidCallback onMyTasks;
  final VoidCallback onSearch;

  const _QuickActionsGrid({required this.onCreateTask, required this.onCreateProject, required this.onMyTasks, required this.onSearch});

  @override
  Widget build(BuildContext context) {
    return SliverGrid(
      delegate: SliverChildListDelegate(
        [
          _QuickActionCard(icon: Icons.add_task_rounded, title: 'Create Task', subtitle: 'Quick capture work', onTap: onCreateTask),
          _QuickActionCard(icon: Icons.create_new_folder_outlined, title: 'Create Project', subtitle: 'Start a workspace container', onTap: onCreateProject),
          _QuickActionCard(icon: Icons.task_alt_rounded, title: 'My Tasks', subtitle: 'Open personal queue', onTap: onMyTasks),
          _QuickActionCard(icon: Icons.search_rounded, title: 'Search', subtitle: 'Find tasks or projects', onTap: onSearch),
        ],
      ),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisExtent: 116,
        crossAxisSpacing: AppSpacing.sm,
        mainAxisSpacing: AppSpacing.sm,
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _QuickActionCard({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: SurfaceCard(
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: AppColors.primary),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTypography.titleSm),
            const SizedBox(height: 2),
            Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTypography.caption.copyWith(color: AppColors.muted)),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final String actionLabel;
  final VoidCallback onAction;

  const _SectionHeader({required this.title, required this.actionLabel, required this.onAction});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: AppTypography.titleMd),
        TextButton(onPressed: onAction, child: Text(actionLabel, style: AppTypography.button.copyWith(color: AppColors.primary))),
      ],
    );
  }
}

class _RecentProjectCard extends StatelessWidget {
  final String projectName;
  final String status;
  final String workspaceName;
  final VoidCallback onTap;

  const _RecentProjectCard({required this.projectName, required this.status, required this.workspaceName, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final accent = status.toLowerCase() == 'active' ? AppColors.semanticSuccess : AppColors.muted;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 220,
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.hairlineSoft),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(width: 32, height: 32, decoration: BoxDecoration(color: accent.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)), child: Icon(Icons.folder_outlined, color: accent, size: 18)),
                const SizedBox(width: AppSpacing.sm),
                Expanded(child: Text(projectName, style: AppTypography.titleSm, maxLines: 1, overflow: TextOverflow.ellipsis)),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(status.toUpperCase(), style: AppTypography.captionUppercase.copyWith(color: accent)),
                const SizedBox(height: 4),
                Text(workspaceName, style: AppTypography.caption.copyWith(color: AppColors.muted), maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _RecentProjectSkeleton extends StatelessWidget {
  const _RecentProjectSkeleton();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(width: 220, child: SurfaceCard(child: SizedBox(height: 100)));
  }
}

class _ActivityItem extends StatelessWidget {
  final NotificationModel notification;

  const _ActivityItem({required this.notification});

  @override
  Widget build(BuildContext context) {
    final icon = _iconFor(notification.type);
    final subtitle = _formatRelativeTime(notification.createdAt);
    return SurfaceCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(color: AppColors.surfaceStrong, borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: AppColors.primary, size: 18),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(notification.message, style: AppTypography.bodyMd, maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text(subtitle, style: AppTypography.caption.copyWith(color: AppColors.muted)),
              ],
            ),
          ),
          if (!notification.isRead)
            Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle)),
        ],
      ),
    );
  }

  IconData _iconFor(String type) {
    switch (type.toUpperCase()) {
      case 'TASK_ASSIGNED':
      case 'COMMENT_ADDED':
        return Icons.task_alt_outlined;
      case 'PROJECT_UPDATED':
      case 'CREATE_PROJECT':
        return Icons.folder_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  String _formatRelativeTime(DateTime? dateTime) {
    if (dateTime == null) {
      return 'Just now';
    }
    final delta = DateTime.now().difference(dateTime);
    if (delta.inMinutes < 1) return 'Just now';
    if (delta.inHours < 1) return '${delta.inMinutes}m ago';
    if (delta.inDays < 1) return '${delta.inHours}h ago';
    return '${delta.inDays}d ago';
  }
}

class _ActivitySkeleton extends StatelessWidget {
  const _ActivitySkeleton();

  @override
  Widget build(BuildContext context) {
    return const SurfaceCard(child: SizedBox(height: 64));
  }
}