class ProjectModel {
  final String id;
  final String name;
  final String description;
  final String status; // active|completed|archived|planned|on_hold
  final String? startDate;
  final String? endDate;
  final WorkspaceInfo? workspace;

  ProjectModel({
    required this.id,
    required this.name,
    this.description = '',
    this.status = 'active',
    this.startDate,
    this.endDate,
    this.workspace,
  });

  factory ProjectModel.fromJson(Map<String, dynamic> json) {
    return ProjectModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      status: json['status'] ?? 'active',
      startDate: json['startDate'],
      endDate: json['endDate'],
      workspace: json['workspaceId'] != null && json['workspaceId'] is Map
          ? WorkspaceInfo.fromJson(json['workspaceId'])
          : null,
    );
  }
}

class WorkspaceInfo {
  final String id;
  final String name;

  WorkspaceInfo({required this.id, required this.name});

  factory WorkspaceInfo.fromJson(Map<String, dynamic> json) {
    return WorkspaceInfo(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
    );
  }
}
