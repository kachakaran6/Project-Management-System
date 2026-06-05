import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/surface_card.dart';
import '../models/project_model.dart';
import 'package:intl/intl.dart';

class ProjectDetailsScreen extends StatelessWidget {
  final ProjectModel project;

  const ProjectDetailsScreen({
    super.key,
    required this.project,
  });

  @override
  Widget build(BuildContext context) {
    String dates = 'No dates set';
    if (project.startDate != null && project.endDate != null) {
      final start = DateTime.tryParse(project.startDate!);
      final end = DateTime.tryParse(project.endDate!);
      if (start != null && end != null) {
        dates = '${DateFormat('MMM d, yyyy').format(start)} - ${DateFormat('MMM d, yyyy').format(end)}';
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Project Details', style: AppTypography.titleMd),
        backgroundColor: AppColors.canvas,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.ink),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
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
                const SizedBox(width: AppSpacing.sm),
                Text(
                  project.workspace?.name ?? 'Personal Workspace',
                  style: AppTypography.caption.copyWith(color: AppColors.muted),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              project.name,
              style: AppTypography.displayLg,
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              project.description.isNotEmpty ? project.description : 'No description provided.',
              style: AppTypography.bodyMd,
            ),
            const SizedBox(height: AppSpacing.xl),
            SurfaceCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Timeline', style: AppTypography.titleSm),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today, size: 20, color: AppColors.timelineEdit),
                      const SizedBox(width: AppSpacing.md),
                      Text(dates, style: AppTypography.bodyMd),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            SurfaceCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Progress', style: AppTypography.titleSm),
                      Text('65%', style: AppTypography.titleSm.copyWith(color: AppColors.primary)),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: 0.65, // Placeholder for actual progress
                      backgroundColor: AppColors.hairlineSoft,
                      color: AppColors.primary,
                      minHeight: 8,
                    ),
                  ),
                ],
              ),
            ),
            // We would also show recent tasks or activities here, similar to the dashboard list.
          ],
        ),
      ),
    );
  }
}
