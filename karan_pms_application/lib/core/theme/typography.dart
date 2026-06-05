import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTypography {
  static TextStyle get _baseDisplay => GoogleFonts.inter(
        fontFeatures: const [FontFeature.stylisticSet(3)], // Approx SF Pro 'a'
      );

  static TextStyle get _baseText => GoogleFonts.inter(
        fontFeatures: const [FontFeature.stylisticSet(3)],
      );

  static TextStyle get heroDisplay => _baseDisplay.copyWith(
        fontSize: 56,
        fontWeight: FontWeight.w600,
        height: 1.07,
        letterSpacing: -0.28,
      );

  static TextStyle get displayLg => _baseDisplay.copyWith(
        fontSize: 40,
        fontWeight: FontWeight.w600,
        height: 1.10,
        letterSpacing: 0,
      );

  static TextStyle get displayMd => _baseText.copyWith(
        fontSize: 34,
        fontWeight: FontWeight.w600,
        height: 1.47,
        letterSpacing: -0.374,
      );

  static TextStyle get lead => _baseDisplay.copyWith(
        fontSize: 28,
        fontWeight: FontWeight.w400,
        height: 1.14,
        letterSpacing: 0.196,
      );

  static TextStyle get leadAiry => _baseText.copyWith(
        fontSize: 24,
        fontWeight: FontWeight.w300,
        height: 1.50,
        letterSpacing: 0,
      );

  static TextStyle get tagline => _baseDisplay.copyWith(
        fontSize: 21,
        fontWeight: FontWeight.w600,
        height: 1.19,
        letterSpacing: 0.231,
      );

  static TextStyle get bodyStrong => _baseText.copyWith(
        fontSize: 17,
        fontWeight: FontWeight.w600,
        height: 1.24,
        letterSpacing: -0.374,
      );

  static TextStyle get body => _baseText.copyWith(
        fontSize: 17,
        fontWeight: FontWeight.w400,
        height: 1.44, // Adjusted from 1.47 for Inter's x-height per DESIGN.md
        letterSpacing: -0.374,
      );

  static TextStyle get denseLink => _baseText.copyWith(
        fontSize: 17,
        fontWeight: FontWeight.w400,
        height: 2.41,
        letterSpacing: 0,
      );

  static TextStyle get caption => _baseText.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.43,
        letterSpacing: -0.224,
      );

  static TextStyle get captionStrong => _baseText.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        height: 1.29,
        letterSpacing: -0.224,
      );

  static TextStyle get buttonLarge => _baseText.copyWith(
        fontSize: 18,
        fontWeight: FontWeight.w300,
        height: 1.0,
        letterSpacing: 0,
      );

  static TextStyle get buttonUtility => _baseText.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.29,
        letterSpacing: -0.224,
      );

  static TextStyle get finePrint => _baseText.copyWith(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        height: 1.0,
        letterSpacing: -0.12,
      );

  static TextStyle get microLegal => _baseText.copyWith(
        fontSize: 10,
        fontWeight: FontWeight.w400,
        height: 1.3,
        letterSpacing: -0.08,
      );

  static TextStyle get navLink => _baseText.copyWith(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        height: 1.0,
        letterSpacing: -0.12,
      );
}
