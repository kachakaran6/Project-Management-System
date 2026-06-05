import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../features/auth/models/auth_session.dart';
import '../../features/auth/models/user_model.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage();
  
  static const _keyAccessToken = 'access_token';
  static const _keyRefreshToken = 'refresh_token';
  static const _keyUser = 'user_json';
  static const _keyWorkspace = 'workspace_json';
  static const _keyOrganizations = 'organizations_json';
  static const _keyOrganizationId = 'organization_id';
  static const _keyRole = 'organization_role';

  static Future<void> saveAccessToken(String token) async {
    await _storage.write(key: _keyAccessToken, value: token);
  }

  static Future<String?> getAccessToken() async {
    return await _storage.read(key: _keyAccessToken);
  }

  static Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: _keyRefreshToken, value: token);
  }

  static Future<String?> getRefreshToken() async {
    return await _storage.read(key: _keyRefreshToken);
  }

  static Future<void> saveUser(UserModel user) async {
    await _storage.write(
      key: _keyUser,
      value: jsonEncode({
        'id': user.id,
        'firstName': user.firstName,
        'lastName': user.lastName,
        'email': user.email,
        'role': user.role,
        'status': user.status,
        'avatarUrl': user.avatarUrl,
      }),
    );
  }

  static Future<UserModel?> getUser() async {
    final raw = await _storage.read(key: _keyUser);
    if (raw == null || raw.isEmpty) {
      return null;
    }

    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) {
      return null;
    }
    return UserModel.fromJson(decoded);
  }

  static Future<void> saveWorkspace(Map<String, dynamic>? workspace) async {
    if (workspace == null) {
      await _storage.delete(key: _keyWorkspace);
      return;
    }
    await _storage.write(key: _keyWorkspace, value: jsonEncode(workspace));
  }

  static Future<Map<String, dynamic>?> getWorkspace() async {
    final raw = await _storage.read(key: _keyWorkspace);
    if (raw == null || raw.isEmpty) {
      return null;
    }

    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) {
      return null;
    }

    return decoded;
  }

  static Future<void> saveOrganizations(List<Map<String, dynamic>> organizations) async {
    await _storage.write(key: _keyOrganizations, value: jsonEncode(organizations));
  }

  static Future<List<Map<String, dynamic>>> getOrganizations() async {
    final raw = await _storage.read(key: _keyOrganizations);
    if (raw == null || raw.isEmpty) {
      return const [];
    }

    final decoded = jsonDecode(raw);
    if (decoded is! List) {
      return const [];
    }

    return decoded.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
  }

  static Future<void> saveOrganizationId(String? organizationId) async {
    if (organizationId == null || organizationId.isEmpty) {
      await _storage.delete(key: _keyOrganizationId);
      return;
    }
    await _storage.write(key: _keyOrganizationId, value: organizationId);
  }

  static Future<String?> getOrganizationId() async {
    return await _storage.read(key: _keyOrganizationId);
  }

  static Future<void> saveRole(String? role) async {
    if (role == null || role.isEmpty) {
      await _storage.delete(key: _keyRole);
      return;
    }
    await _storage.write(key: _keyRole, value: role);
  }

  static Future<String?> getRole() async {
    return await _storage.read(key: _keyRole);
  }

  static Future<void> saveSession(AuthSession session) async {
    await Future.wait([
      saveAccessToken(session.accessToken),
      saveRefreshToken(session.refreshToken),
      saveUser(session.user),
      saveWorkspace(session.workspace),
      saveOrganizations(session.organizations),
      saveOrganizationId(session.organizationId),
      saveRole(session.role),
    ]);
  }

  static Future<AuthSession?> getSession() async {
    final accessToken = await getAccessToken();
    final refreshToken = await getRefreshToken();
    final user = await getUser();
    if (accessToken == null || refreshToken == null || user == null) {
      return null;
    }

    final workspace = await getWorkspace();
    final organizations = await getOrganizations();
    final organizationId = await getOrganizationId();
    final role = await getRole();

    return AuthSession(
      user: user,
      accessToken: accessToken,
      refreshToken: refreshToken,
      workspace: workspace,
      organizations: organizations,
      organizationId: organizationId,
      role: role,
    );
  }

  static Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: _keyAccessToken),
      _storage.delete(key: _keyRefreshToken),
      _storage.delete(key: _keyUser),
      _storage.delete(key: _keyWorkspace),
      _storage.delete(key: _keyOrganizations),
      _storage.delete(key: _keyOrganizationId),
      _storage.delete(key: _keyRole),
    ]);
  }
}
