import '../../../core/network/api_client.dart';
import '../models/project_model.dart';

class ProjectMutationRepository {
  Future<ProjectModel> createProject(Map<String, dynamic> payload) async {
    final dio = await ApiClient.client;
    final response = await dio.post('/projects', data: payload);
    final data = response.data['data'];
    if (data is Map<String, dynamic>) {
      return ProjectModel.fromJson(data);
    }
    throw StateError('Invalid project response.');
  }
}