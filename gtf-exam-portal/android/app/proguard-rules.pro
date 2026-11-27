# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep Capacitor Bridge, Plugin annotations, and WebView JS interfaces intact under R8
-keep class com.getcapacitor.** { *; }
-keep class com.gatewaytofuture.app.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes SourceFile,LineNumberTable
-dontwarn com.getcapacitor.**
