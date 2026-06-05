import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../models/auth_session.dart';
import '../models/user_model.dart';

class AuthRepository {
  Future<UserModel> login(String email, String password) async {
    final dio = await ApiClient.client;
    final response = await dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });

    final data = response.data['data'];
    final token = data['accessToken'] as String? ?? '';
    final refreshToken = data['refreshToken'] as String? ?? '';
    final user = UserModel.fromJson(Map<String, dynamic>.from(data['user'] as Map));
    
    await SecureStorageService.saveAccessToken(token);
    await SecureStorageService.saveRefreshToken(refreshToken);
    await SecureStorageService.saveUser(user);

    return user;
  }

  Future<void> logout() async {
    try {
      final dio = await ApiClient.client;
      await dio.post('/auth/logout');
    } catch (e) {
      // Ignore errors on logout
    } finally {
      await SecureStorageService.clearTokens();
    }
  }

  Future<UserModel?> me() async {
    try {
      final token = await SecureStorageService.getAccessToken();
      if (token == null) return null;

      final dio = await ApiClient.client;
      final response = await dio.get('/auth/me');
      
      final data = response.data['data'];
      final user = UserModel.fromJson(Map<String, dynamic>.from(data['user'] as Map));
      final refreshToken = await SecureStorageService.getRefreshToken() ?? '';

      final session = AuthSession.fromMeResponse(
        user: user,
        accessToken: token,
        refreshToken: refreshToken,
        meData: Map<String, dynamic>.from(data),
      );
      await SecureStorageService.saveSession(session);
      return user;
    } catch (e) {
      return null;
    }
  }

  Future<AuthSession?> bootstrapSession() async {
    final storedSession = await SecureStorageService.getSession();
    if (storedSession == null) {
      return null;
    }

    final meUser = await me();
    if (meUser != null) {
      return await SecureStorageService.getSession();
    }

    final refreshToken = await SecureStorageService.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      return null;
    }

    final dio = await ApiClient.client;
    final refreshResponse = await dio.post('/auth/refresh', data: {'refreshToken': refreshToken});
    final refreshData = Map<String, dynamic>.from(refreshResponse.data['data'] as Map);
    final accessToken = refreshData['accessToken'] as String? ?? '';
    final newRefreshToken = refreshData['refreshToken'] as String? ?? refreshToken;

    await SecureStorageService.saveAccessToken(accessToken);
    await SecureStorageService.saveRefreshToken(newRefreshToken);

    final refreshedUser = await me();
    if (refreshedUser == null) {
      return null;
    }

    return await SecureStorageService.getSession();
  }
}
