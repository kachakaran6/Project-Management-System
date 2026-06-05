import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/task_model.dart';
import '../../dashboard/providers/dashboard_provider.dart';

final taskListNotifierProvider =
    AsyncNotifierProvider<TaskListNotifier, List<TaskModel>>(TaskListNotifier.new);

class TaskListNotifier extends AsyncNotifier<List<TaskModel>> {
  static const int _pageSize = 100;

  @override
  FutureOr<List<TaskModel>> build() async {
    return _fetchTasks();
  }

  Future<List<TaskModel>> _fetchTasks({int page = 1, String? status}) async {
    final repo = ref.read(taskRepositoryProvider);
    return await repo.getTasks(page: page, limit: _pageSize, status: status);
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _fetchTasks());
  }
}
