import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/widgets/custom_text_field.dart';
import '../../../../shared/widgets/primary_button.dart';
import '../../../dashboard/providers/dashboard_provider.dart';
import '../../../projects/models/project_model.dart';
import '../../providers/task_list_provider.dart';

class QuickAddTaskSheet extends ConsumerStatefulWidget {
  const QuickAddTaskSheet({super.key});

  @override
  ConsumerState<QuickAddTaskSheet> createState() => _QuickAddTaskSheetState();
}

class _QuickAddTaskSheetState extends ConsumerState<QuickAddTaskSheet> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _projectController = TextEditingController();
  bool _isSubmitting = false;
  String _priority = 'MEDIUM';
  String? _projectId;
  Future<List<ProjectModel>>? _projectsFuture;

  @override
  void initState() {
    super.initState();
    _projectsFuture = ref.read(projectRepositoryProvider).getProjects(limit: 50);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _projectController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    final projectId = _projectId ?? _projectController.text.trim();
    if (title.isEmpty || projectId.isEmpty) {
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      await ref.read(taskRepositoryProvider).createTask({
        'title': title,
        'projectId': projectId,
        'priority': _priority,
        'status': 'TODO',
      });
      await ref.read(taskListNotifierProvider.notifier).refresh();
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop();
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<ProjectModel>>(
      future: _projectsFuture,
      builder: (context, snapshot) {
        final projects = snapshot.data ?? const <ProjectModel>[];

        return SafeArea(
          child: Container(
            decoration: const BoxDecoration(
              color: AppColors.canvas,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(child: Text('Quick Add Task', style: AppTypography.titleMd)),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                CustomTextField(
                  labelText: 'Task Title',
                  hintText: 'Fix login bug',
                  controller: _titleController,
                ),
                const SizedBox(height: AppSpacing.md),
                if (projects.isNotEmpty)
                  DropdownButtonFormField<String>(
                    initialValue: _projectId,
                    decoration: const InputDecoration(labelText: 'Project'),
                    items: projects.map((project) => DropdownMenuItem(value: project.id, child: Text(project.name))).toList(),
                    onChanged: (value) => setState(() => _projectId = value),
                  )
                else
                  CustomTextField(
                    labelText: 'Project',
                    hintText: 'Project ID',
                    controller: _projectController,
                  ),
                const SizedBox(height: AppSpacing.md),
                DropdownButtonFormField<String>(
                  initialValue: _priority,
                  decoration: const InputDecoration(labelText: 'Priority'),
                  items: const [
                    DropdownMenuItem(value: 'LOW', child: Text('Low')),
                    DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                    DropdownMenuItem(value: 'HIGH', child: Text('High')),
                    DropdownMenuItem(value: 'URGENT', child: Text('Urgent')),
                  ],
                  onChanged: (value) => setState(() => _priority = value ?? 'MEDIUM'),
                ),
                const SizedBox(height: AppSpacing.lg),
                PrimaryButton(
                  text: 'Create',
                  onPressed: _submit,
                  isLoading: _isSubmitting,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
