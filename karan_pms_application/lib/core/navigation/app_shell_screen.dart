import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../features/tasks/ui/widgets/quick_add_task_sheet.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';

class AppShellScreen extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const AppShellScreen({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: navigationShell,
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AppSpacing.base, 0, AppSpacing.base, AppSpacing.sm),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
              child: Container(
                height: 76,
                decoration: BoxDecoration(
                  color: AppColors.surfaceCard.withValues(alpha: 0.84),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: AppColors.hairlineSoft),
                  boxShadow: const [
                    BoxShadow(color: Color(0x14000000), blurRadius: 20, offset: Offset(0, 10)),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: _NavItem(
                        icon: Icons.home_rounded,
                        label: 'Home',
                        selected: navigationShell.currentIndex == 0,
                        onTap: () => _goBranch(0),
                      ),
                    ),
                    Expanded(
                      child: _NavItem(
                        icon: Icons.task_alt_rounded,
                        label: 'Tasks',
                        selected: navigationShell.currentIndex == 1,
                        onTap: () => _goBranch(1),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
                      child: _CenterActionButton(onPressed: () => _showActionMenu(context)),
                    ),
                    Expanded(
                      child: _NavItem(
                        icon: Icons.folder_rounded,
                        label: 'Projects',
                        selected: navigationShell.currentIndex == 2,
                        onTap: () => _goBranch(2),
                      ),
                    ),
                    Expanded(
                      child: _NavItem(
                        icon: Icons.person_rounded,
                        label: 'Profile',
                        selected: navigationShell.currentIndex == 3,
                        onTap: () => _goBranch(3),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _goBranch(int index) {
    HapticFeedback.lightImpact();
    navigationShell.goBranch(index, initialLocation: index == navigationShell.currentIndex);
  }

  Future<void> _showActionMenu(BuildContext context) async {
    HapticFeedback.mediumImpact();

    await showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Actions',
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 220),
      pageBuilder: (dialogContext, animation, secondaryAnimation) {
        return const SizedBox.shrink();
      },
      transitionBuilder: (dialogContext, animation, secondaryAnimation, child) {
        final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
        return FadeTransition(
          opacity: curved,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.95, end: 1).animate(curved),
            child: Material(
              color: Colors.transparent,
              child: Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpacing.base, 0, AppSpacing.base, 104),
                  child: _ActionMenuPanel(
                    onQuickTask: () {
                      Navigator.of(dialogContext).pop();
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        backgroundColor: Colors.transparent,
                        builder: (_) => const QuickAddTaskSheet(),
                      );
                    },
                    onTask: () {
                      Navigator.of(dialogContext).pop();
                      context.push('/tasks/add');
                    },
                    onProject: () {
                      Navigator.of(dialogContext).pop();
                      context.push('/projects/add');
                    },
                    onPlaceholder: () {
                      Navigator.of(dialogContext).pop();
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Future placeholder')));
                    },
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _NavItem({required this.icon, required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.primary : AppColors.muted;
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 4),
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: selected ? 18 : 8,
            height: 3,
            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(99)),
          ),
          const SizedBox(height: 2),
          Text(label, style: AppTypography.caption.copyWith(color: color, fontSize: 10)),
        ],
      ),
    );
  }
}

class _CenterActionButton extends StatelessWidget {
  final VoidCallback onPressed;

  const _CenterActionButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryActive]),
          borderRadius: BorderRadius.circular(18),
          boxShadow: const [BoxShadow(color: Color(0x33F54E00), blurRadius: 16, offset: Offset(0, 8))],
        ),
        child: const Icon(Icons.add_rounded, color: Colors.white, size: 28),
      ),
    );
  }
}

class _ActionMenuPanel extends StatelessWidget {
  final VoidCallback onQuickTask;
  final VoidCallback onTask;
  final VoidCallback onProject;
  final VoidCallback onPlaceholder;

  const _ActionMenuPanel({required this.onQuickTask, required this.onTask, required this.onProject, required this.onPlaceholder});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.base),
      decoration: BoxDecoration(
        color: AppColors.canvas.withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.hairlineSoft),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Create', style: AppTypography.titleMd),
          const SizedBox(height: AppSpacing.sm),
          _MenuTile(icon: Icons.flash_on_rounded, title: 'Quick Task', subtitle: 'Create in under 5 seconds', onTap: onQuickTask),
          _MenuTile(icon: Icons.task_alt_rounded, title: 'Task', subtitle: 'Open full task creation flow', onTap: onTask),
          _MenuTile(icon: Icons.folder_outlined, title: 'Project', subtitle: 'Create a new project container', onTap: onProject),
          _MenuTile(icon: Icons.lock_outline_rounded, title: 'Future Placeholder', subtitle: 'Reserved for upcoming actions', onTap: onPlaceholder),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _MenuTile({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.surfaceCard,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.hairlineSoft),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14)),
                child: Icon(icon, color: AppColors.primary),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: AppTypography.titleSm),
                    const SizedBox(height: 2),
                    Text(subtitle, style: AppTypography.caption.copyWith(color: AppColors.muted)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
