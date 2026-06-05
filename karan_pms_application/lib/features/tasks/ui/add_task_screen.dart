import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/primary_button.dart';
import '../../../shared/widgets/surface_card.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../projects/models/project_model.dart';
import '../providers/task_list_provider.dart';

class AddTaskScreen extends ConsumerStatefulWidget {
  const AddTaskScreen({super.key});

  @override
  ConsumerState<AddTaskScreen> createState() => _AddTaskScreenState();
}

class _AddTaskScreenState extends ConsumerState<AddTaskScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _dueDateController = TextEditingController();
  final TextEditingController _assigneeController = TextEditingController();
  final PageController _pageController = PageController();
  Future<List<ProjectModel>>? _projectsFuture;
  int _step = 0;
  bool _isSaving = false;
  String? _projectId;
  String? _assigneeId;
  String _priority = 'MEDIUM';
  String _status = 'TODO';

  @override
  void initState() {
    super.initState();
    _projectsFuture = ref.read(projectRepositoryProvider).getProjects(limit: 50);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _dueDateController.dispose();
    _assigneeController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _nextStep() async {
    if (_step == 0 && !(_formKey.currentState?.validate() ?? false)) {
      return;
    }
    if (_step < 2) {
      setState(() => _step += 1);
      await _pageController.animateToPage(_step, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
      return;
    }
    await _saveTask();
  }

  Future<void> _previousStep() async {
    if (_step == 0) {
      Navigator.of(context).pop();
      return;
    }
    setState(() => _step -= 1);
    await _pageController.animateToPage(_step, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
  }

  Future<void> _saveTask() async {
    final title = _titleController.text.trim();
    final description = _descriptionController.text.trim();
    final projectId = _projectId;
    final assigneeId = _assigneeController.text.trim();

    if (title.isEmpty || projectId == null) {
      return;
    }

    setState(() => _isSaving = true);
    try {
      await ref.read(taskRepositoryProvider).createTask({
        'title': title,
        'description': description,
        'projectId': projectId,
        'assigneeId': assigneeId.isEmpty ? null : assigneeId,
        'priority': _priority,
        'status': _status,
        'dueDate': _dueDateController.text.trim().isEmpty ? null : _dueDateController.text.trim(),
      });
      await ref.read(taskListNotifierProvider.notifier).refresh();
      if (!mounted) return;
      Navigator.of(context).pop();
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        backgroundColor: AppColors.canvas,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.ink),
        title: Text('Create Task', style: AppTypography.titleMd),
      ),
      body: FutureBuilder<List<ProjectModel>>(
        future: _projectsFuture,
        builder: (context, snapshot) {
          final projects = snapshot.data ?? const <ProjectModel>[];

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.base, AppSpacing.base, AppSpacing.base, 0),
                child: Row(
                  children: List.generate(3, (index) {
                    final active = index == _step;
                    final done = index < _step;
                    return Expanded(
                      child: Container(
                        margin: EdgeInsets.only(right: index == 2 ? 0 : AppSpacing.xs),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: active || done ? AppColors.primary.withValues(alpha: 0.1) : AppColors.canvasSoft,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: active || done ? AppColors.primary : AppColors.hairlineStrong),
                        ),
                        child: Text('Step ${index + 1}', textAlign: TextAlign.center, style: AppTypography.captionUppercase.copyWith(color: active || done ? AppColors.primary : AppColors.muted)),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(height: AppSpacing.base),
              Expanded(
                child: PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _buildInfoStep(),
                    _buildAssignmentStep(projects),
                    _buildReviewStep(projects),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(AppSpacing.base),
                child: Row(
                  children: [
                    TextButton(onPressed: _previousStep, child: Text(_step == 0 ? 'Cancel' : 'Back')),
                    const Spacer(),
                    PrimaryButton(
                      text: _step == 2 ? 'Create Task' : 'Continue',
                      onPressed: _nextStep,
                      isLoading: _isSaving,
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildInfoStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.base),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Task Information', style: AppTypography.displaySm),
            const SizedBox(height: AppSpacing.xs),
            Text('Define the work item before routing it to a project.', style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
            const SizedBox(height: AppSpacing.base),
            CustomTextField(
              labelText: 'Title',
              hintText: 'Write a short actionable title',
              controller: _titleController,
              validator: (value) => (value == null || value.trim().isEmpty) ? 'Title is required' : null,
            ),
            const SizedBox(height: AppSpacing.base),
            CustomTextField(
              labelText: 'Description',
              hintText: 'Describe the task, context, or acceptance criteria',
              controller: _descriptionController,
              maxLines: 5,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAssignmentStep(List<ProjectModel> projects) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.base),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Routing', style: AppTypography.displaySm),
          const SizedBox(height: AppSpacing.xs),
          Text('Assign the task to a project, owner, priority, and status.', style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
          const SizedBox(height: AppSpacing.base),
          SurfaceCard(
            padding: const EdgeInsets.all(AppSpacing.base),
            child: Column(
              children: [
                DropdownButtonFormField<String>(
                  initialValue: _projectId,
                  decoration: const InputDecoration(labelText: 'Project'),
                  items: projects.map((project) => DropdownMenuItem(value: project.id, child: Text(project.name))).toList(),
                  onChanged: (value) => setState(() => _projectId = value),
                ),
                const SizedBox(height: AppSpacing.base),
                CustomTextField(
                  labelText: 'Assignee ID',
                  hintText: 'Optional person ID',
                  controller: _assigneeController,
                ),
                const SizedBox(height: AppSpacing.base),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
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
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _status,
                        decoration: const InputDecoration(labelText: 'Status'),
                        items: const [
                          DropdownMenuItem(value: 'TODO', child: Text('To Do')),
                          DropdownMenuItem(value: 'IN_PROGRESS', child: Text('In Progress')),
                          DropdownMenuItem(value: 'IN_REVIEW', child: Text('In Review')),
                          DropdownMenuItem(value: 'DONE', child: Text('Done')),
                        ],
                        onChanged: (value) => setState(() => _status = value ?? 'TODO'),
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

  Widget _buildReviewStep(List<ProjectModel> projects) {
    final selectedProject = projects.where((project) => project.id == _projectId).cast<ProjectModel?>().firstWhere((project) => project != null, orElse: () => null);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.base),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Review', style: AppTypography.displaySm),
          const SizedBox(height: AppSpacing.xs),
          Text('Check the task summary before creating it.', style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
          const SizedBox(height: AppSpacing.base),
          SurfaceCard(
            padding: const EdgeInsets.all(AppSpacing.base),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _summaryRow('Title', _titleController.text.trim()),
                _summaryRow('Project', selectedProject?.name ?? 'Not selected'),
                _summaryRow('Assignee', _assigneeId ?? 'Unassigned'),
                _summaryRow('Priority', _priority),
                _summaryRow('Status', _status),
                _summaryRow('Due date', _dueDateController.text.trim().isEmpty ? 'Not set' : _dueDateController.text.trim()),
                const SizedBox(height: AppSpacing.sm),
                CustomTextField(
                  labelText: 'Due Date',
                  hintText: 'YYYY-MM-DD',
                  controller: _dueDateController,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 96, child: Text(label, style: AppTypography.bodySm.copyWith(color: AppColors.muted))),
          const SizedBox(width: AppSpacing.sm),
          Expanded(child: Text(value.isEmpty ? '—' : value, style: AppTypography.bodyMd)),
        ],
      ),
    );
  }
}