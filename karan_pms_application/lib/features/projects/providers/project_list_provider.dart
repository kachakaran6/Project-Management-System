import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/project_model.dart';
import '../../dashboard/providers/dashboard_provider.dart';

final projectListNotifierProvider =
    AsyncNotifierProvider<ProjectListNotifier, List<ProjectModel>>(ProjectListNotifier.new);

class ProjectListNotifier extends AsyncNotifier<List<ProjectModel>> {
  @override
  FutureOr<List<ProjectModel>> build() async {
    return _fetchProjects();
  }

  Future<List<ProjectModel>> _fetchProjects({int page = 1, String? status}) async {
    final repo = ref.read(projectRepositoryProvider);
    return await repo.getProjects(page: page, limit: 20, status: status);
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _fetchProjects());
  }
}
