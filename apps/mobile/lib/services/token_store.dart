import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// ログイン状態のトークンを保存する場所。テストでは [MemoryTokenStore] に差し替える。
abstract class TokenStore {
  Future<String?> read();

  /// null を渡すと消す
  Future<void> write(String? token);
}

/// 端末の安全な保存領域（iOS は Keychain、Android は Keystore）に保存する。
class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'tsuzuri.session_token';
  final FlutterSecureStorage _storage;

  @override
  Future<String?> read() => _storage.read(key: _key);

  @override
  Future<void> write(String? token) => token == null
      ? _storage.delete(key: _key)
      : _storage.write(key: _key, value: token);
}

class MemoryTokenStore implements TokenStore {
  MemoryTokenStore([this.token]);

  String? token;

  @override
  Future<String?> read() async => token;

  @override
  Future<void> write(String? token) async => this.token = token;
}
