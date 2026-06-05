import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/widgets/loading_skeleton.dart';
import '../../../../shared/widgets/surface_card.dart';
import '../../models/project_model.dart';
import 'package:intl/intl.dart';

class ProjectCard extends StatelessWidget {
  final ProjectModel project;
  final VoidCallback? onTap;

  const ProjectCard({
    super.key,
    required this.project,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    String dates = 'No dates set';
    if (project.startDate != null && project.endDate != null) {
      final start = DateTime.tryParse(project.startDate!);
      final end = DateTime.tryParse(project.endDate!);
      if (start != null && end != null) {
        dates = '${DateFormat('MMM d').format(start)} - ${DateFormat('MMM d').format(end)}';
      }
    }

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
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.canvasSoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.folder_outlined, color: AppColors.timelineEdit, size: 28),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      project.name,
                      style: AppTypography.titleMd,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      project.workspace?.name ?? 'Personal Workspace',
                      style: AppTypography.bodySm.copyWith(color: AppColors.muted),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: project.status == 'active' 
                      ? Color.fromRGBO(
                          (AppColors.timelineRead.r * 255.0).round(),
                          (AppColors.timelineRead.g * 255.0).round(),
                          (AppColors.timelineRead.b * 255.0).round(),
                          0.2,
                        )
                      : AppColors.surfaceStrong,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  project.status.toUpperCase(),
                  style: AppTypography.captionUppercase.copyWith(
                    color: project.status == 'active' 
                        ? AppColors.timelineRead 
                        : AppColors.muted,
                  ),
                ),
              ),
            ],
          ),
          if (project.description.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            Text(
              project.description,
              style: AppTypography.bodyMd,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: AppSpacing.lg),
          const Divider(height: 1, color: AppColors.hairline),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              const Icon(Icons.calendar_today, size: 16, color: AppColors.muted),
              const SizedBox(width: AppSpacing.xs),
              Text(
                dates,
                style: AppTypography.caption.copyWith(color: AppColors.muted),
              ),
              const Spacer(),
              const Icon(Icons.group_outlined, size: 16, color: AppColors.muted),
              const SizedBox(width: AppSpacing.xs),
              Text(
                'Team',
                style: AppTypography.caption.copyWith(color: AppColors.muted),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class ProjectCardSkeleton extends StatelessWidget {
  const ProjectCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SkeletonBox(width: 52, height: 52, borderRadius: 12),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    SkeletonBox(width: 150, height: 20),
                    SizedBox(height: 8),
                    SkeletonBox(width: 100, height: 14),
                  ],
                ),
              ),
              const SkeletonBox(width: 60, height: 24, borderRadius: 4),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          const SkeletonBox(width: double.infinity, height: 16),
          const SizedBox(height: 4),
          const SkeletonBox(width: 200, height: 16),
          const SizedBox(height: AppSpacing.lg),
          const Divider(height: 1, color: AppColors.hairline),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: const [
              SkeletonBox(width: 120, height: 16),
              Spacer(),
              SkeletonBox(width: 60, height: 16),
            ],
          ),
        ],
      ),
    );
  }
}
