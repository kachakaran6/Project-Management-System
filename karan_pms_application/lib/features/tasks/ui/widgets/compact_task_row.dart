import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/widgets/loading_skeleton.dart';
import '../../models/task_model.dart';

class CompactTaskRow extends StatelessWidget {
  final TaskModel task;
  final bool isSelected;
  final VoidCallback? onTap;
  final ValueChanged<bool>? onSelectionChanged;
  final VoidCallback? onMoreActions;
  final VoidCallback? onSwipeComplete;
  final VoidCallback? onSwipeMore;

  const CompactTaskRow({
    super.key,
    required this.task,
    this.isSelected = false,
    this.onTap,
    this.onSelectionChanged,
    this.onMoreActions,
    this.onSwipeComplete,
    this.onSwipeMore,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(task.status);
    final priority = _priorityInfo(task.priority);
    final dueDate = _formatDueDate(task.dueDate);
    final subtitle = task.projectName?.isNotEmpty == true ? task.projectName! : task.projectId;

    return Dismissible(
      key: ValueKey(task.id),
      direction: DismissDirection.horizontal,
      confirmDismiss: (direction) async {
        if (direction == DismissDirection.startToEnd) {
          onSwipeComplete?.call();
        } else {
          onSwipeMore?.call();
        }
        return false;
      },
      background: Container(
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        color: AppColors.semanticSuccess.withValues(alpha: 0.08),
        child: const Icon(Icons.check_circle_outline, color: AppColors.semanticSuccess),
      ),
      secondaryBackground: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        color: AppColors.hairlineSoft,
        child: const Icon(Icons.more_horiz, color: AppColors.muted),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          child: Container(
            constraints: const BoxConstraints(minHeight: 72, maxHeight: 88),
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base, vertical: AppSpacing.sm),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primary.withValues(alpha: 0.04) : AppColors.surfaceCard,
              border: const Border(bottom: BorderSide(color: AppColors.hairlineSoft)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                SizedBox(
                  width: 24,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Checkbox(
                        value: isSelected,
                        onChanged: (value) => onSelectionChanged?.call(value ?? false),
                        visualDensity: VisualDensity.compact,
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      Container(width: 8, height: 8, decoration: BoxDecoration(color: priority.color, shape: BoxShape.circle)),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              task.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.titleSm.copyWith(
                                color: task.status == 'DONE' ? AppColors.muted : AppColors.ink,
                                decoration: task.status == 'DONE' ? TextDecoration.lineThrough : null,
                              ),
                            ),
                          ),
                          if (task.priority.toUpperCase() == 'URGENT')
                            const Padding(
                              padding: EdgeInsets.only(left: AppSpacing.xs),
                              child: Icon(Icons.priority_high_rounded, size: 16, color: AppColors.semanticError),
                            ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Text(_shortTaskId(task.id), style: AppTypography.code.copyWith(fontSize: 11, color: AppColors.muted)),
                          const SizedBox(width: AppSpacing.xs),
                          Expanded(
                            child: Text(
                              subtitle,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.caption.copyWith(color: AppColors.muted),
                            ),
                          ),
                        ],
                      ),
                      if (task.assignees.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(_assigneeLabel(), maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTypography.caption.copyWith(color: AppColors.mutedSoft)),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(9999),
                      ),
                      child: Text(task.status.replaceAll('_', ' '), style: AppTypography.captionUppercase.copyWith(color: statusColor, fontSize: 10)),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.event_outlined, size: 12, color: AppColors.muted),
                        const SizedBox(width: 4),
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 74),
                          child: Text(
                            dueDate.isEmpty ? 'No due date' : dueDate,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.caption.copyWith(fontSize: 11, color: AppColors.muted),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _shortTaskId(String id) {
    final short = id.length > 6 ? id.substring(id.length - 6) : id;
    return 'PMS-$short'.toUpperCase();
  }

  String _formatDueDate(String? value) {
    final parsed = DateTime.tryParse(value ?? '');
    if (parsed == null) {
      return '';
    }
    return DateFormat('MMM d').format(parsed);
  }

  ({Color color, IconData icon}) _priorityInfo(String priority) {
    switch (priority.toUpperCase()) {
      case 'URGENT':
        return (color: AppColors.semanticError, icon: Icons.flag_rounded);
      case 'HIGH':
        return (color: AppColors.primary, icon: Icons.flag_rounded);
      case 'LOW':
        return (color: AppColors.timelineRead, icon: Icons.remove_rounded);
      default:
        return (color: AppColors.timelineDone, icon: Icons.remove_rounded);
    }
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'DONE':
        return AppColors.timelineDone;
      case 'IN_PROGRESS':
        return AppColors.timelineEdit;
      case 'IN_REVIEW':
        return AppColors.timelineThinking;
      default:
        return AppColors.timelineRead;
    }
  }

  String _assigneeLabel() {
    final assignee = task.assignees.first;
    final name = [assignee.firstName, assignee.lastName]
        .whereType<String>()
        .where((value) => value.isNotEmpty)
        .join(' ');
    return name.isEmpty ? assignee.email : name;
  }
}

class CompactTaskRowSkeleton extends StatelessWidget {
  const CompactTaskRowSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 72, maxHeight: 88),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base, vertical: AppSpacing.sm),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.hairlineSoft))),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const SkeletonBox(width: 18, height: 18, borderRadius: 9),
          const SizedBox(width: AppSpacing.sm),
          const SkeletonBox(width: 8, height: 8, borderRadius: 4),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                SkeletonBox(width: 180, height: 16),
                SizedBox(height: 6),
                SkeletonBox(width: 120, height: 12),
                SizedBox(height: 4),
                SkeletonBox(width: 96, height: 10),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: const [
              SkeletonBox(width: 72, height: 20, borderRadius: 9999),
              SizedBox(height: 6),
              SkeletonBox(width: 88, height: 12),
            ],
          ),
        ],
      ),
    );
  }
}
