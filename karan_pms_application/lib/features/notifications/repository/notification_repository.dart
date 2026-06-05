import '../../../core/network/api_client.dart';
import '../models/notification_model.dart';

class NotificationRepository {
  Future<List<NotificationModel>> getNotifications({
    int page = 1,
    int limit = 10,
    bool unreadOnly = false,
  }) async {
    final dio = await ApiClient.client;
    final response = await dio.get('/notifications', queryParameters: {
      'page': page,
      'limit': limit,
      'unreadOnly': unreadOnly,
    });

    final data = response.data['data'];
    final List items = data is Map<String, dynamic>
        ? (data['items'] ?? data['notifications'] ?? [])
        : data is List
            ? data
            : [];

    return items.whereType<Map<String, dynamic>>().map(NotificationModel.fromJson).toList();
  }

  Future<int> getUnreadCount() async {
    final dio = await ApiClient.client;
    final response = await dio.get('/notifications/unread-count');
    final data = response.data['data'];
    if (data is Map<String, dynamic>) {
      return data['unreadCount'] ?? 0;
    }
    return 0;
  }
}