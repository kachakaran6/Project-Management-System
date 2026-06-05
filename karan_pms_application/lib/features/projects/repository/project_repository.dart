import '../../../core/network/api_client.dart';
import '../models/project_model.dart';

class ProjectRepository {
  Future<List<ProjectModel>> getProjects({
    int page = 1,
    int limit = 10,
    String? status,
  }) async {
    final dio = await ApiClient.client;
    final Map<String, dynamic> queryParams = {
      'page': page,
      'limit': limit,
    };
    if (status != null) {
      queryParams['status'] = status;
    }

    final response = await dio.get(
      '/projects',
      queryParameters: queryParams,
    );

    final data = response.data['data'];
    final List projects = data is List
        ? data
        : (data is Map<String, dynamic> ? (data['projects'] ?? data['items'] ?? []) : []);
    return projects.whereType<Map<String, dynamic>>().map(ProjectModel.fromJson).toList();
  }
  
  Future<int> getTotalProjects() async {
    final dio = await ApiClient.client;
    final response = await dio.get('/projects', queryParameters: {'limit': 1});
    return response.data['data']['totalCount'] ?? 0;
  }

  Future<ProjectModel?> getProjectById(String id) async {
    final dio = await ApiClient.client;
    final response = await dio.get('/projects/$id');
    final data = response.data['data'];
    if (data is Map<String, dynamic>) {
      return ProjectModel.fromJson(data);
    }
    return null;
  }
}
