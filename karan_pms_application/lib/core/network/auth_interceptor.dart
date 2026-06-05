import 'package:dio/dio.dart';
import '../storage/secure_storage_service.dart';

class AuthInterceptor extends Interceptor {
  final Dio dio;

  AuthInterceptor(this.dio);

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await SecureStorageService.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    options.headers['Content-Type'] = 'application/json';
    return handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 && err.requestOptions.path != '/auth/login' && err.requestOptions.path != '/auth/refresh') {
      try {
        final refreshToken = await SecureStorageService.getRefreshToken();
        final refreshResponse = await dio.post('/auth/refresh', data: {
          if (refreshToken != null && refreshToken.isNotEmpty) 'refreshToken': refreshToken,
        });
        
        if (refreshResponse.statusCode == 200) {
          final data = refreshResponse.data['data'] as Map<String, dynamic>;
          final newAccessToken = data['accessToken'] as String? ?? '';
          final newRefreshToken = data['refreshToken'] as String?;
          await SecureStorageService.saveAccessToken(newAccessToken);
          if (newRefreshToken != null && newRefreshToken.isNotEmpty) {
            await SecureStorageService.saveRefreshToken(newRefreshToken);
          }
          
          final options = err.requestOptions;
          options.headers['Authorization'] = 'Bearer $newAccessToken';
          
          final response = await dio.fetch(options);
          return handler.resolve(response);
        }
      } catch (e) {
        // Refresh token failed, clear everything
        await SecureStorageService.clearTokens();
        // Here we could also broadcast a logout event
      }
    }
    return handler.next(err);
  }
}
