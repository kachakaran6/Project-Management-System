import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/widgets/loading_skeleton.dart';
import '../../../../shared/widgets/surface_card.dart';
import '../../models/task_model.dart';

class TaskCard extends StatelessWidget {
  final TaskModel task;
  final VoidCallback? onTap;

  const TaskCard({super.key, required this.task, this.onTap});

  @override
  Widget build(BuildContext context) {
    final dueDate = _formatDate(task.dueDate);
    final priorityColor = _priorityColor(task.priority);

    return SurfaceCard(
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Color.fromRGBO(
                    (priorityColor.r * 255.0).round(),
                    (priorityColor.g * 255.0).round(),
                    (priorityColor.b * 255.0).round(),
                    0.12,
                  ),
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                ),
                child: Icon(Icons.checklist_rounded, color: priorityColor, size: 24),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(task.title, style: AppTypography.titleMd),
                    const SizedBox(height: AppSpacing.xxs),
                    Text(
                      task.projectName?.isNotEmpty == true ? task.projectName! : task.projectId,
                      style: AppTypography.bodySm.copyWith(color: AppColors.muted),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              _Badge(
                label: task.status.replaceAll('_', ' '),
                background: AppColors.surfaceStrong,
                textColor: AppColors.ink,
              ),
            ],
          ),
          if (task.description.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            Text(
              task.description,
              style: AppTypography.bodyMd,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          const Divider(height: 1, color: AppColors.hairline),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.xs,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              _Badge(
                label: task.priority,
                background: Color.fromRGBO(
                  (priorityColor.r * 255.0).round(),
                  (priorityColor.g * 255.0).round(),
                  (priorityColor.b * 255.0).round(),
                  0.12,
                ),
                textColor: priorityColor,
              ),
              if (dueDate.isNotEmpty)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.event_outlined, size: 16, color: AppColors.muted),
                    const SizedBox(width: 4),
                    Text(dueDate, style: AppTypography.caption.copyWith(color: AppColors.muted)),
                  ],
                ),
              if (task.assignees.isNotEmpty)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.people_alt_outlined, size: 16, color: AppColors.muted),
                    const SizedBox(width: 4),
                    Text(
                      '${task.assignees.length} assignee${task.assignees.length == 1 ? '' : 's'}',
                      style: AppTypography.caption.copyWith(color: AppColors.muted),
                    ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDate(String? value) {
    if (value == null) {
      return '';
    }
    final date = DateTime.tryParse(value);
    if (date == null) {
      return '';
    }
    return DateFormat('MMM d, yyyy').format(date);
  }

  Color _priorityColor(String priority) {
    switch (priority.toUpperCase()) {
      case 'URGENT':
      case 'HIGH':
        return AppColors.semanticError;
      case 'LOW':
        return AppColors.timelineRead;
      default:
        return AppColors.timelineDone;
    }
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color background;
  final Color textColor;

  const _Badge({required this.label, required this.background, required this.textColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Text(
        label.toUpperCase(),
        style: AppTypography.captionUppercase.copyWith(color: textColor),
      ),
    );
  }
}

class TaskCardSkeleton extends StatelessWidget {
  const TaskCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const SurfaceCard(
      padding: EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonBox(width: 44, height: 44, borderRadius: 14),
              SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonBox(width: 180, height: 20),
                    SizedBox(height: AppSpacing.xs),
                    SkeletonBox(width: 120, height: 14),
                  ],
                ),
              ),
              SkeletonBox(width: 72, height: 24, borderRadius: 9999),
            ],
          ),
          SizedBox(height: AppSpacing.md),
          SkeletonBox(width: double.infinity, height: 16),
          SizedBox(height: 6),
          SkeletonBox(width: 220, height: 16),
          SizedBox(height: AppSpacing.md),
          Divider(height: 1, color: AppColors.hairline),
          SizedBox(height: AppSpacing.md),
          Row(
            children: [
              SkeletonBox(width: 68, height: 18, borderRadius: 9999),
              SizedBox(width: AppSpacing.sm),
              SkeletonBox(width: 110, height: 18, borderRadius: 9999),
            ],
          ),
        ],
      ),
    );
  }
}