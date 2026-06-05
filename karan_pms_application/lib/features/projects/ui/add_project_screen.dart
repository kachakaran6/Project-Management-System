import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/primary_button.dart';
import '../../../shared/widgets/surface_card.dart';
import '../../auth/providers/auth_provider.dart';
import '../repository/project_mutation_repository.dart';

final projectMutationRepositoryProvider = Provider<ProjectMutationRepository>((ref) {
  return ProjectMutationRepository();
});

class AddProjectScreen extends ConsumerStatefulWidget {
  const AddProjectScreen({super.key});

  @override
  ConsumerState<AddProjectScreen> createState() => _AddProjectScreenState();
}

class _AddProjectScreenState extends ConsumerState<AddProjectScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _workspaceController = TextEditingController();
  final _startDateController = TextEditingController();
  final _endDateController = TextEditingController();
  bool _isSaving = false;
  String _status = 'active';

  @override
  void initState() {
    super.initState();
    final session = ref.read(authSessionProvider).value;
    if (session?.organizationId != null) {
      _workspaceController.text = session!.organizationId!;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _workspaceController.dispose();
    _startDateController.dispose();
    _endDateController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    setState(() => _isSaving = true);
    try {
      await ref.read(projectMutationRepositoryProvider).createProject({
        'name': _nameController.text.trim(),
        'description': _descriptionController.text.trim(),
        'workspaceId': _workspaceController.text.trim().isEmpty ? null : _workspaceController.text.trim(),
        'status': _status,
        'startDate': _startDateController.text.trim().isEmpty ? null : _startDateController.text.trim(),
        'endDate': _endDateController.text.trim().isEmpty ? null : _endDateController.text.trim(),
      });
      if (!mounted) return;
      context.pop();
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(authSessionProvider).value;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        backgroundColor: AppColors.canvas,
        elevation: 0,
        title: Text('Create Project', style: AppTypography.displaySm),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SurfaceCard(
                padding: const EdgeInsets.all(AppSpacing.base),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Project details', style: AppTypography.titleMd),
                    const SizedBox(height: AppSpacing.sm),
                    Text('Create a workspace container for related tasks and delivery tracking.', style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
                    const SizedBox(height: AppSpacing.base),
                    CustomTextField(
                      labelText: 'Name',
                      hintText: 'Launch campaign',
                      controller: _nameController,
                      validator: (value) => (value == null || value.trim().isEmpty) ? 'Project name is required' : null,
                    ),
                    const SizedBox(height: AppSpacing.base),
                    CustomTextField(
                      labelText: 'Description',
                      hintText: 'Describe the project goal',
                      controller: _descriptionController,
                      maxLines: 4,
                    ),
                    const SizedBox(height: AppSpacing.base),
                    CustomTextField(
                      labelText: 'Workspace ID',
                      hintText: session?.organizationId ?? 'Current workspace',
                      controller: _workspaceController,
                    ),
                    const SizedBox(height: AppSpacing.base),
                    DropdownButtonFormField<String>(
                      initialValue: _status,
                      decoration: const InputDecoration(labelText: 'Status'),
                      items: const [
                        DropdownMenuItem(value: 'active', child: Text('Active')),
                        DropdownMenuItem(value: 'planned', child: Text('Planned')),
                        DropdownMenuItem(value: 'on_hold', child: Text('On hold')),
                        DropdownMenuItem(value: 'completed', child: Text('Completed')),
                        DropdownMenuItem(value: 'archived', child: Text('Archived')),
                      ],
                      onChanged: (value) => setState(() => _status = value ?? 'active'),
                    ),
                    const SizedBox(height: AppSpacing.base),
                    Row(
                      children: [
                        Expanded(
                          child: CustomTextField(
                            labelText: 'Start date',
                            hintText: 'YYYY-MM-DD',
                            controller: _startDateController,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: CustomTextField(
                            labelText: 'End date',
                            hintText: 'YYYY-MM-DD',
                            controller: _endDateController,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              PrimaryButton(text: 'Create Project', onPressed: _save, isLoading: _isSaving),
            ],
          ),
        ),
      ),
    );
  }
}
