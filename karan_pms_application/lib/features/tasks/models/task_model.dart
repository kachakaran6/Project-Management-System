import '../../auth/models/user_model.dart';

class TaskModel {
  final String id;
  final String title;
  final String description;
  final String status; // TODO|IN_PROGRESS|IN_REVIEW|DONE|ARCHIVED
  final String priority; // LOW|MEDIUM|HIGH|URGENT
  final String? dueDate;
  final String projectId;
  final String? projectName;
  final List<UserModel> assignees;

  TaskModel({
    required this.id,
    required this.title,
    this.description = '',
    this.status = 'TODO',
    this.priority = 'MEDIUM',
    this.dueDate,
    required this.projectId,
    this.projectName,
    this.assignees = const [],
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    var assigneesJson = json['assignees'] as List?;
    List<UserModel> assigneesList = [];
    if (assigneesJson != null) {
      assigneesList = assigneesJson
          .whereType<Map<String, dynamic>>()
          .map((e) => UserModel.fromJson(e))
          .toList();
    }

    return TaskModel(
      id: json['id'] ?? json['_id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      status: json['status'] ?? 'TODO',
      priority: json['priority'] ?? 'MEDIUM',
      dueDate: json['dueDate'],
      projectId: json['projectId'] is Map
          ? (json['projectId']['_id'] ?? json['projectId']['id'] ?? '')
          : (json['projectId'] ?? ''),
      projectName: json['projectId'] is Map ? json['projectId']['name'] : json['projectName'],
      assignees: assigneesList,
    );
  }
}
