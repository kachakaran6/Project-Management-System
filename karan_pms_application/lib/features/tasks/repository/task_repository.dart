import '../../../core/network/api_client.dart';
import '../models/task_model.dart';

class TaskRepository {
  Future<List<TaskModel>> getTasks({
    int page = 1,
    int limit = 10,
    String? status,
    String? assigneeId,
  }) async {
    final dio = await ApiClient.client;
    final Map<String, dynamic> queryParams = {
      'page': page,
      'limit': limit,
    };
    if (status != null) queryParams['status'] = status;
    if (assigneeId != null) queryParams['assigneeId'] = assigneeId;

    final response = await dio.get(
      '/tasks',
      queryParameters: queryParams,
    );

    final data = response.data['data'];
    final List tasks = data is List
        ? data
        : (data is Map<String, dynamic> ? (data['tasks'] ?? data['items'] ?? []) : []);
    return tasks.whereType<Map<String, dynamic>>().map(TaskModel.fromJson).toList();
  }

  Future<int> getTotalTasks() async {
    try {
      final dio = await ApiClient.client;
      final response = await dio.get('/tasks', queryParameters: {'limit': 1});
      final data = response.data['data'];
      return data is Map<String, dynamic> ? (data['totalCount'] ?? 0) : 0;
    } catch (e) {
      return 0;
    }
  }

  Future<TaskModel?> createTask(Map<String, dynamic> payload) async {
    final dio = await ApiClient.client;
    final response = await dio.post('/tasks', data: payload);
    final data = response.data['data'];
    if (data is Map<String, dynamic>) {
      return TaskModel.fromJson(data);
    }
    return null;
  }

  Future<TaskModel?> updateTaskStatus(String id, String status) async {
    final dio = await ApiClient.client;
    final response = await dio.patch('/tasks/$id', data: {'status': status});
    final data = response.data['data'];
    if (data is Map<String, dynamic>) {
      return TaskModel.fromJson(data);
    }
    return null;
  }
}
