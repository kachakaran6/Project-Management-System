import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/ui/login_screen.dart';
import '../../features/auth/ui/splash_screen.dart';
import '../../features/dashboard/ui/dashboard_screen.dart';
import '../../features/profile/ui/profile_screen.dart';
import '../../features/projects/models/project_model.dart';
import '../../features/projects/ui/add_project_screen.dart';
import '../../features/projects/ui/project_details_screen.dart';
import '../../features/projects/ui/projects_list_screen.dart';
import '../../features/tasks/models/task_model.dart';
import '../../features/tasks/ui/add_task_screen.dart';
import '../../features/tasks/ui/task_details_screen.dart';
import '../../features/tasks/ui/tasks_list_screen.dart';
import '../navigation/app_shell_screen.dart';

// Provide the router
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authNotifierProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isAuth = authState.value != null;
      final path = state.uri.path;
      final isLoggingIn = path == '/login';
      final isSplash = path == '/splash';
      
      if (authState.isLoading) return null;

      if (!isAuth && !isLoggingIn && !isSplash) return '/login';
      if (!isAuth && isSplash) return '/login';

      if (isAuth && (isLoggingIn || isSplash)) return '/dashboard';

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AppShellScreen(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/dashboard',
                builder: (context, state) => const DashboardScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/tasks',
                builder: (context, state) => const TasksListScreen(),
                routes: [
                  GoRoute(
                    path: 'add',
                    builder: (context, state) => const AddTaskScreen(),
                  ),
                  GoRoute(
                    path: ':id',
                    builder: (context, state) {
                      final task = state.extra as TaskModel;
                      return TaskDetailsScreen(task: task);
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/projects',
                builder: (context, state) => const ProjectsListScreen(),
                routes: [
                  GoRoute(
                    path: 'add',
                    builder: (context, state) => const AddProjectScreen(),
                  ),
                  GoRoute(
                    path: ':id',
                    builder: (context, state) {
                      final project = state.extra as ProjectModel;
                      return ProjectDetailsScreen(project: project);
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
