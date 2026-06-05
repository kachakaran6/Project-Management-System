import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/primary_button.dart';
import '../../../shared/widgets/surface_card.dart';
import '../../auth/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authSessionProvider).value;
    final user = session?.user;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text('Profile', style: AppTypography.displaySm),
        backgroundColor: AppColors.canvas,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.base),
        children: [
          SurfaceCard(
            padding: const EdgeInsets.all(AppSpacing.base),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                  backgroundImage: user?.avatarUrl != null ? NetworkImage(user!.avatarUrl!) : null,
                  child: user?.avatarUrl == null ? Text((user?.firstName ?? 'U').substring(0, 1).toUpperCase(), style: AppTypography.titleMd.copyWith(color: AppColors.primary)) : null,
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${user?.firstName ?? 'User'} ${user?.lastName ?? ''}'.trim(), style: AppTypography.titleMd),
                      const SizedBox(height: 2),
                      Text(user?.email ?? '', style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
                      const SizedBox(height: 4),
                      Text(session?.workspaceName ?? 'Workspace', style: AppTypography.captionUppercase.copyWith(color: AppColors.primary)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.base),
          _ProfileStatRow(title: 'Role', value: user?.role ?? 'USER'),
          _ProfileStatRow(title: 'Status', value: user?.status ?? 'ACTIVE'),
          _ProfileStatRow(title: 'Organization', value: session?.organizationId ?? 'Unknown'),
          const SizedBox(height: AppSpacing.lg),
          PrimaryButton(
            text: 'Sign Out',
            onPressed: () => ref.read(authNotifierProvider.notifier).logout(),
          ),
        ],
      ),
    );
  }
}

class _ProfileStatRow extends StatelessWidget {
  final String title;
  final String value;

  const _ProfileStatRow({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: SurfaceCard(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
            Text(value, style: AppTypography.bodyMd),
          ],
        ),
      ),
    );
  }
}
