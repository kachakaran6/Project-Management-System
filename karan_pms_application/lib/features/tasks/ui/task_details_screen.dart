import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/surface_card.dart';
import '../models/task_model.dart';

class TaskDetailsScreen extends StatelessWidget {
  final TaskModel task;

  const TaskDetailsScreen({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final dueDate = _formatDate(task.dueDate);
    final priorityColor = _priorityColor(task.priority);
    final statusColor = _statusColor(task.status);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        backgroundColor: AppColors.canvas,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.ink),
        title: Text(
          task.id.length > 8 ? 'PMS-${task.id.substring(task.id.length - 6).toUpperCase()}' : task.id,
          style: AppTypography.code.copyWith(color: AppColors.muted),
        ),
        actions: [
          IconButton(icon: const Icon(Icons.edit_outlined), onPressed: () {}),
          IconButton(icon: const Icon(Icons.more_horiz), onPressed: () {}),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SurfaceCard(
              padding: const EdgeInsets.all(AppSpacing.base),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: Text(task.title, style: AppTypography.displaySm)),
                      const SizedBox(width: AppSpacing.sm),
                      _Pill(
                        label: task.status.replaceAll('_', ' '),
                        background: statusColor.withValues(alpha: 0.1),
                        foreground: statusColor,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: [
                      _Pill(
                        label: task.priority,
                        background: priorityColor.withValues(alpha: 0.1),
                        foreground: priorityColor,
                        leading: Icons.flag_rounded,
                      ),
                      _Pill(
                        label: task.projectName?.isNotEmpty == true ? task.projectName! : task.projectId,
                        background: AppColors.surfaceStrong,
                        foreground: AppColors.ink,
                        leading: Icons.folder_outlined,
                      ),
                      _Pill(
                        label: dueDate.isEmpty ? 'No due date' : dueDate,
                        background: AppColors.surfaceStrong,
                        foreground: AppColors.ink,
                        leading: Icons.event_outlined,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.base),
            _InfoSection(
              title: 'Overview',
              children: [
                _InfoRow(label: 'Description', value: task.description.isNotEmpty ? task.description : 'No description provided.'),
                _InfoRow(label: 'Project', value: task.projectName?.isNotEmpty == true ? task.projectName! : task.projectId),
                _InfoRow(label: 'Assignee', value: task.assignees.isEmpty ? 'Unassigned' : _personName(task.assignees.first.firstName, task.assignees.first.lastName, task.assignees.first.email)),
                _InfoRow(label: 'Reporter', value: 'Unassigned'),
                _InfoRow(label: 'Created', value: 'Unknown'),
                _InfoRow(label: 'Due', value: dueDate.isEmpty ? 'No due date' : dueDate),
              ],
            ),
            const SizedBox(height: AppSpacing.base),
            _InfoSection(
              title: 'Activity Timeline',
              children: [
                Text('Comments, attachments, and history will appear here.', style: AppTypography.bodyMd),
                const SizedBox(height: AppSpacing.sm),
                Text('No activity yet.', style: AppTypography.caption),
              ],
            ),
            const SizedBox(height: AppSpacing.base),
            _InfoSection(
              title: 'Actions',
              children: [
                Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: [
                    _ActionButton(label: 'Edit', icon: Icons.edit_outlined, onPressed: () {}),
                    _ActionButton(label: 'Move Status', icon: Icons.swap_horiz_rounded, onPressed: () {}),
                    _ActionButton(label: 'Assign', icon: Icons.person_add_alt_1_outlined, onPressed: () {}),
                    _ActionButton(label: 'Delete', icon: Icons.delete_outline, destructive: true, onPressed: () {}),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String? value) {
    final parsed = DateTime.tryParse(value ?? '');
    if (parsed == null) return '';
    return DateFormat('MMM d, yyyy').format(parsed);
  }

  String _personName(String firstName, String? lastName, String email) {
    final name = [firstName, lastName].whereType<String>().where((value) => value.isNotEmpty).join(' ');
    return name.isEmpty ? email : name;
  }

  Color _priorityColor(String priority) {
    switch (priority.toUpperCase()) {
      case 'URGENT':
      case 'HIGH':
        return AppColors.semanticError;
      case 'LOW':
        return AppColors.timelineRead;
      default:
        return AppColors.primary;
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
}

class _InfoSection extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _InfoSection({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      padding: const EdgeInsets.all(AppSpacing.base),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTypography.titleSm),
          const SizedBox(height: AppSpacing.sm),
          ...children.map((child) => Padding(padding: const EdgeInsets.only(bottom: AppSpacing.sm), child: child)),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 92, child: Text(label, style: AppTypography.bodySm.copyWith(color: AppColors.muted))),
        const SizedBox(width: AppSpacing.sm),
        Expanded(child: Text(value, style: AppTypography.bodyMd)),
      ],
    );
  }
}

class _Pill extends StatelessWidget {
  final String label;
  final Color background;
  final Color foreground;
  final IconData? leading;

  const _Pill({required this.label, required this.background, required this.foreground, this.leading});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (leading != null) ...[
            Icon(leading, size: 14, color: foreground),
            const SizedBox(width: 6),
          ],
          Text(label, style: AppTypography.captionUppercase.copyWith(color: foreground)),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool destructive;
  final VoidCallback onPressed;

  const _ActionButton({required this.label, required this.icon, required this.onPressed, this.destructive = false});

  @override
  Widget build(BuildContext context) {
    final color = destructive ? AppColors.semanticError : AppColors.ink;
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 16, color: color),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: color,
        side: BorderSide(color: destructive ? AppColors.semanticError.withValues(alpha: 0.3) : AppColors.hairlineStrong),
      ),
    );
  }
}