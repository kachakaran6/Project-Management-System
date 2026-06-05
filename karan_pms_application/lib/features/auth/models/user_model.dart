class UserModel {
  final String id;
  final String firstName;
  final String? lastName;
  final String email;
  final String role;
  final String status;
  final String? avatarUrl;

  UserModel({
    required this.id,
    required this.firstName,
    this.lastName,
    required this.email,
    required this.role,
    required this.status,
    this.avatarUrl,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['_id'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'],
      email: json['email'] ?? '',
      role: json['role'] ?? 'USER',
      status: json['status'] ?? 'ACTIVE',
      avatarUrl: json['avatarUrl'],
    );
  }
}
