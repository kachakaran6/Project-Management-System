import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/widgets/loading_skeleton.dart';
import '../../../../shared/widgets/surface_card.dart';
import '../../providers/dashboard_provider.dart';

class OverviewCards extends StatelessWidget {
  final bool isLoading;
  final DashboardState? state;

  const OverviewCards({
    super.key,
    required this.isLoading,
    required this.state,
  });

  @override
  Widget build(BuildContext context) {
    return LoadingSkeleton(
      isLoading: isLoading,
      child: Row(
        children: [
          Expanded(
            child: _StatCard(
              title: 'Total Projects',
              value: state?.totalProjects.toString() ?? '0',
              icon: Icons.folder_outlined,
              color: AppColors.timelineRead,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: _StatCard(
              title: 'Pending Tasks',
              value: state?.totalTasks.toString() ?? '0',
              icon: Icons.task_alt,
              color: AppColors.timelineDone,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Color.fromRGBO(
                (color.r * 255.0).round(),
                (color.g * 255.0).round(),
                (color.b * 255.0).round(),
                0.1,
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            value,
            style: AppTypography.displayMd,
          ),
          const SizedBox(height: AppSpacing.xxs),
          Text(
            title,
            style: AppTypography.bodySm.copyWith(color: AppColors.muted),
          ),
        ],
      ),
    );
  }
}
