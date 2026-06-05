import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../auth/providers/auth_provider.dart';

class DashboardHeader extends ConsumerWidget {
  const DashboardHeader({super.key});

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).value;

    return Row(
      children: [
        CircleAvatar(
          radius: 24,
          backgroundColor: Color.fromRGBO(
            (AppColors.primary.r * 255.0).round(),
            (AppColors.primary.g * 255.0).round(),
            (AppColors.primary.b * 255.0).round(),
            0.1,
          ),
          backgroundImage: user?.avatarUrl != null 
              ? NetworkImage(user!.avatarUrl!)
              : null,
          child: user?.avatarUrl == null
              ? Text(
                  user?.firstName.substring(0, 1).toUpperCase() ?? 'U',
                  style: AppTypography.titleMd.copyWith(color: AppColors.primary),
                )
              : null,
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${_getGreeting()},',
                style: AppTypography.bodySm.copyWith(color: AppColors.muted),
              ),
              const SizedBox(height: 2),
              Text(
                user?.firstName ?? 'User',
                style: AppTypography.titleMd,
              ),
            ],
          ),
        ),
        IconButton(
          onPressed: () {},
          icon: const Icon(Icons.notifications_outlined, color: AppColors.ink),
        ),
      ],
    );
  }
}
