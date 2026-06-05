import 'dart:convert';

import 'user_model.dart';

class AuthSession {
  final UserModel user;
  final String accessToken;
  final String refreshToken;
  final String? organizationId;
  final String? role;
  final Map<String, dynamic>? workspace;
  final List<Map<String, dynamic>> organizations;

  const AuthSession({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
    this.organizationId,
    this.role,
    this.workspace,
    this.organizations = const [],
  });

  String get workspaceName {
    final name = workspace?['name'];
    if (name is String && name.trim().isNotEmpty) {
      return name.trim();
    }

    for (final organization in organizations) {
      final id = organization['id'] ?? organization['_id'];
      if (organizationId != null && id == organizationId) {
        final orgName = organization['name'];
        if (orgName is String && orgName.trim().isNotEmpty) {
          return orgName.trim();
        }
      }
    }

    if (organizations.isNotEmpty) {
      final firstName = organizations.first['name'];
      if (firstName is String && firstName.trim().isNotEmpty) {
        return firstName.trim();
      }
    }

    return 'Workspace';
  }

  Map<String, dynamic> toJson() {
    return {
      'user': {
        'id': user.id,
        'firstName': user.firstName,
        'lastName': user.lastName,
        'email': user.email,
        'role': user.role,
        'status': user.status,
        'avatarUrl': user.avatarUrl,
      },
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'organizationId': organizationId,
      'role': role,
      'workspace': workspace,
      'organizations': organizations,
    };
  }

  String toJsonString() => jsonEncode(toJson());

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    final userJson = Map<String, dynamic>.from(json['user'] as Map? ?? const {});
    return AuthSession(
      user: UserModel.fromJson(userJson),
      accessToken: json['accessToken'] as String? ?? '',
      refreshToken: json['refreshToken'] as String? ?? '',
      organizationId: json['organizationId'] as String?,
      role: json['role'] as String?,
      workspace: json['workspace'] is Map ? Map<String, dynamic>.from(json['workspace'] as Map) : null,
      organizations: (json['organizations'] as List? ?? const [])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList(),
    );
  }

  factory AuthSession.fromMeResponse({
    required UserModel user,
    required String accessToken,
    required String refreshToken,
    required Map<String, dynamic> meData,
  }) {
    final organizations = (meData['organizations'] as List? ?? const [])
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
    final organizationId = meData['organizationId'] as String?;
    final workspace = organizations.where((organization) {
      final id = organization['id'] ?? organization['_id'];
      return organizationId != null && id == organizationId;
    }).map((organization) => Map<String, dynamic>.from(organization)).cast<Map<String, dynamic>?>().firstWhere(
          (organization) => organization != null,
          orElse: () => null,
        );

    return AuthSession(
      user: user,
      accessToken: accessToken,
      refreshToken: refreshToken,
      organizationId: organizationId,
      role: meData['role'] as String?,
      workspace: workspace,
      organizations: organizations,
    );
  }
}