import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTypography {
  static TextTheme get _textTheme => GoogleFonts.interTextTheme();
  
  static TextStyle get _baseStyle => _textTheme.bodyMedium!.copyWith(
    color: AppColors.ink,
  );

  static TextStyle get displayMega => _baseStyle.copyWith(
    fontSize: 72,
    fontWeight: FontWeight.w400,
    height: 1.1,
    letterSpacing: -2.16,
  );

  static TextStyle get displayLg => _baseStyle.copyWith(
    fontSize: 36,
    fontWeight: FontWeight.w400,
    height: 1.2,
    letterSpacing: -0.72,
  );

  static TextStyle get displayMd => _baseStyle.copyWith(
    fontSize: 26,
    fontWeight: FontWeight.w400,
    height: 1.25,
    letterSpacing: -0.325,
  );

  static TextStyle get displaySm => _baseStyle.copyWith(
    fontSize: 22,
    fontWeight: FontWeight.w400,
    height: 1.3,
    letterSpacing: -0.11,
  );

  static TextStyle get titleMd => _baseStyle.copyWith(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    height: 1.4,
    letterSpacing: 0,
  );

  static TextStyle get titleSm => _baseStyle.copyWith(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    height: 1.4,
    letterSpacing: 0,
  );

  static TextStyle get bodyMd => _baseStyle.copyWith(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 1.5,
    letterSpacing: 0,
    color: AppColors.body,
  );

  static TextStyle get bodyTracked => _baseStyle.copyWith(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 1.5,
    letterSpacing: 0.08,
    color: AppColors.body,
  );

  static TextStyle get bodySm => _baseStyle.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.5,
    letterSpacing: 0,
    color: AppColors.body,
  );

  static TextStyle get caption => _baseStyle.copyWith(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    height: 1.4,
    letterSpacing: 0,
    color: AppColors.body,
  );

  static TextStyle get captionUppercase => _baseStyle.copyWith(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    height: 1.4,
    letterSpacing: 0.88,
  );

  static TextStyle get code => GoogleFonts.jetBrainsMono(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    height: 1.5,
    letterSpacing: 0,
    color: AppColors.ink,
  );

  static TextStyle get button => _baseStyle.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    height: 1.0,
    letterSpacing: 0,
  );

  static TextStyle get navLink => _baseStyle.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    height: 1.4,
    letterSpacing: 0,
  );
}
