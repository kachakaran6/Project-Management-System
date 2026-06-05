class NotificationModel {
  final String id;
  final String type;
  final String message;
  final String? resourceId;
  final bool isRead;
  final DateTime? createdAt;

  NotificationModel({
    required this.id,
    required this.type,
    required this.message,
    this.resourceId,
    this.isRead = false,
    this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] ?? json['_id'] ?? '',
      type: json['type'] ?? 'info',
      message: json['message'] ?? '',
      resourceId: json['resourceId'],
      isRead: json['isRead'] ?? false,
      createdAt: DateTime.tryParse(json['createdAt'] ?? ''),
    );
  }

  String get title => message;
}