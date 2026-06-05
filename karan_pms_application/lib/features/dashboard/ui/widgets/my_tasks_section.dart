import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/widgets/loading_skeleton.dart';
import '../../../../shared/widgets/surface_card.dart';
import '../../../tasks/models/task_model.dart';
import 'package:intl/intl.dart';

class MyTasksSection extends StatelessWidget {
  final bool isLoading;
  final List<TaskModel> tasks;

  const MyTasksSection({
    super.key,
    required this.isLoading,
    required this.tasks,
  });

  @override
  Widget build(BuildContext context) {
    return SliverMainAxisGroup(
      slivers: [
        SliverToBoxAdapter(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('My Tasks', style: AppTypography.titleMd),
              TextButton(
                onPressed: () => context.go('/tasks'),
                child: Text(
                  'View All',
                  style: AppTypography.button.copyWith(color: AppColors.primary),
                ),
              ),
            ],
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.sm)),
        if (!isLoading && tasks.isEmpty)
          SliverToBoxAdapter(
            child: SurfaceCard(
              child: Center(
                child: Column(
                  children: [
                    const Icon(Icons.done_all, size: 48, color: AppColors.timelineDone),
                    const SizedBox(height: AppSpacing.md),
                    Text('You have no pending tasks!', style: AppTypography.titleSm),
                  ],
                ),
              ),
            ),
          )
        else
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                if (isLoading) {
                  return const Padding(
                    padding: EdgeInsets.only(bottom: AppSpacing.sm),
                    child: LoadingSkeleton(
                      isLoading: true,
                      child: _TaskCardSkeleton(),
                    ),
                  );
                }
                final task = tasks[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: _TaskCard(task: task),
                );
              },
              childCount: isLoading ? 3 : tasks.length,
            ),
          ),
      ],
    );
  }
}

class _TaskCard extends StatelessWidget {
  final TaskModel task;

  const _TaskCard({required this.task});

  @override
  Widget build(BuildContext context) {
    String formattedDate = '';
    if (task.dueDate != null) {
      final date = DateTime.tryParse(task.dueDate!);
      if (date != null) {
        formattedDate = DateFormat('MMM d').format(date);
      }
    }

    Color priorityColor;
    switch (task.priority) {
      case 'URGENT':
      case 'HIGH':
        priorityColor = AppColors.semanticError;
        break;
      case 'LOW':
        priorityColor = AppColors.timelineRead;
        break;
      default:
        priorityColor = AppColors.timelineDone;
    }

    return SurfaceCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 2),
            width: 16,
            height: 16,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: priorityColor, width: 2),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  task.title,
                  style: AppTypography.titleSm,
                ),
                const SizedBox(height: AppSpacing.xs),
                Row(
                  children: [
                    if (formattedDate.isNotEmpty) ...[
                      const Icon(Icons.calendar_today, size: 14, color: AppColors.muted),
                      const SizedBox(width: 4),
                      Text(
                        formattedDate,
                        style: AppTypography.caption.copyWith(color: AppColors.muted),
                      ),
                      const SizedBox(width: AppSpacing.md),
                    ],
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceStrong,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        task.status,
                        style: AppTypography.captionUppercase,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TaskCardSkeleton extends StatelessWidget {
  const _TaskCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return const SurfaceCard(
      padding: EdgeInsets.all(AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SkeletonBox(width: 16, height: 16, borderRadius: 8),
          SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonBox(width: double.infinity, height: 18),
                SizedBox(height: AppSpacing.xs),
                SkeletonBox(width: 100, height: 14),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
