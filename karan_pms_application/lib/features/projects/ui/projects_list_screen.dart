import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/loading_skeleton.dart';
import '../providers/project_list_provider.dart';
import 'widgets/project_card.dart';

class ProjectsListScreen extends ConsumerWidget {
  const ProjectsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(projectListNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Projects', style: AppTypography.displaySm),
        backgroundColor: AppColors.canvas,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: AppColors.ink),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.filter_list, color: AppColors.ink),
            onPressed: () {},
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(projectListNotifierProvider.notifier).refresh(),
        color: AppColors.primary,
        child: state.when(
          data: (projects) {
            if (projects.isEmpty) {
              return _EmptyProjects();
            }
            return ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.lg),
              itemCount: projects.length,
              separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.md),
              itemBuilder: (context, index) {
                return ProjectCard(
                  project: projects[index],
                  onTap: () {
                    context.push('/projects/${projects[index].id}', extra: projects[index]);
                  },
                );
              },
            );
          },
          loading: () => ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.lg),
            itemCount: 5,
            separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.md),
            itemBuilder: (context, index) => const LoadingSkeleton(
              isLoading: true,
              child: ProjectCardSkeleton(),
            ),
          ),
          error: (error, stack) => Center(
            child: Text(
              'Error loading projects',
              style: AppTypography.bodyMd.copyWith(color: AppColors.semanticError),
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyProjects extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.folder_off_outlined, size: 64, color: AppColors.mutedSoft),
          const SizedBox(height: AppSpacing.md),
          Text('No projects found', style: AppTypography.titleMd),
        ],
      ),
    );
  }
}
