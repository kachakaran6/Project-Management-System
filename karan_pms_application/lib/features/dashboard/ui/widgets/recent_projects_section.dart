import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/widgets/loading_skeleton.dart';
import '../../../../shared/widgets/surface_card.dart';
import '../../../projects/models/project_model.dart';

class RecentProjectsSection extends StatelessWidget {
  final bool isLoading;
  final List<ProjectModel> projects;

  const RecentProjectsSection({
    super.key,
    required this.isLoading,
    required this.projects,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Recent Projects', style: AppTypography.titleMd),
            TextButton(
              onPressed: () => context.go('/projects'),
              child: Text(
                'View All',
                style: AppTypography.button.copyWith(color: AppColors.primary),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        SizedBox(
          height: 160,
          child: LoadingSkeleton(
            isLoading: isLoading,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: isLoading ? 3 : projects.length,
              separatorBuilder: (context, index) => const SizedBox(width: AppSpacing.md),
              itemBuilder: (context, index) {
                if (isLoading) {
                  return const _ProjectCardSkeleton();
                }
                return _ProjectCard(project: projects[index]);
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _ProjectCard extends StatelessWidget {
  final ProjectModel project;

  const _ProjectCard({required this.project});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 240,
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.hairline),
      ),
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.folder_shared_outlined, color: AppColors.timelineEdit),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  project.name,
                  style: AppTypography.titleSm,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            project.status.toUpperCase(),
            style: AppTypography.captionUppercase.copyWith(
              color: project.status == 'active' 
                  ? AppColors.semanticSuccess 
                  : AppColors.muted,
            ),
          ),
          const Spacer(),
          Row(
            children: [
              const Icon(Icons.business_outlined, size: 16, color: AppColors.mutedSoft),
              const SizedBox(width: AppSpacing.xxs),
              Expanded(
                child: Text(
                  project.workspace?.name ?? 'Personal',
                  style: AppTypography.caption.copyWith(color: AppColors.muted),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ProjectCardSkeleton extends StatelessWidget {
  const _ProjectCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return const SurfaceCard(
      child: SizedBox(
        width: 192, // 240 - 48 (padding)
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonBox(width: 120, height: 20),
            SizedBox(height: AppSpacing.md),
            SkeletonBox(width: 60, height: 16),
            Spacer(),
            SkeletonBox(width: 100, height: 16),
          ],
        ),
      ),
    );
  }
}
