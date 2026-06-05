import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../notifications/models/notification_model.dart';
import '../../notifications/repository/notification_repository.dart';
import '../../projects/models/project_model.dart';
import '../../projects/repository/project_repository.dart';
import '../../tasks/models/task_model.dart';
import '../../tasks/repository/task_repository.dart';

final projectRepositoryProvider = Provider<ProjectRepository>((ref) {
  return ProjectRepository();
});

final taskRepositoryProvider = Provider<TaskRepository>((ref) {
  return TaskRepository();
});

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository();
});

class DashboardState {
  final int totalProjects;
  final int totalTasks;
  final int unreadNotifications;
  final List<ProjectModel> recentProjects;
  final List<TaskModel> myTasks;
  final List<NotificationModel> recentNotifications;

  DashboardState({
    this.totalProjects = 0,
    this.totalTasks = 0,
    this.unreadNotifications = 0,
    this.recentProjects = const [],
    this.myTasks = const [],
    this.recentNotifications = const [],
  });
}

final dashboardNotifierProvider =
  AsyncNotifierProvider<DashboardNotifier, DashboardState>(DashboardNotifier.new);

class DashboardNotifier extends AsyncNotifier<DashboardState> {
  @override
  FutureOr<DashboardState> build() async {
    return _fetchDashboardData();
  }

  Future<DashboardState> _fetchDashboardData() async {
    final projectRepo = ref.read(projectRepositoryProvider);
    final taskRepo = ref.read(taskRepositoryProvider);
    final notificationRepo = ref.read(notificationRepositoryProvider);
    final user = ref.read(authNotifierProvider).value;

    final responses = await Future.wait([
      projectRepo.getTotalProjects(),
      taskRepo.getTotalTasks(),
      projectRepo.getProjects(limit: 5),
      taskRepo.getTasks(limit: 100, assigneeId: user?.id),
      notificationRepo.getUnreadCount(),
      notificationRepo.getNotifications(limit: 5),
    ]);

    return DashboardState(
      totalProjects: responses[0] as int,
      totalTasks: responses[1] as int,
      recentProjects: responses[2] as List<ProjectModel>,
      myTasks: responses[3] as List<TaskModel>,
      unreadNotifications: responses[4] as int,
      recentNotifications: responses[5] as List<NotificationModel>,
    );
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _fetchDashboardData());
  }
}
