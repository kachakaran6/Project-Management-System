import 'dart:io';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'auth_interceptor.dart';

class ApiClient {
  static Dio? _dio;

  // Use 10.0.2.2 for Android emulator to access localhost
  static const String baseUrl = 'https://project-management-system-wacw.onrender.com/api/v1';

  static Future<Dio> get client async {
    if (_dio != null) return _dio!;

    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));

    // Setup cookie jar for handling refresh token in httpOnly cookie
    final Directory cookieDir = Directory('${Directory.systemTemp.path}/pms_cookies');
    if (!await cookieDir.exists()) {
      await cookieDir.create(recursive: true);
    }
    var cookieJar = PersistCookieJar(
      ignoreExpires: true,
      storage: FileStorage(cookieDir.path),
    );
    
    _dio!.interceptors.add(CookieManager(cookieJar));
    
    // Add auth interceptor. We need a second dio instance for refresh 
    // to avoid infinite loops, but since we use the same base url, 
    // the cookie manager will attach the cookie to refresh request automatically.
    
    _dio!.interceptors.add(AuthInterceptor(_dio!));

    return _dio!;
  }
}
