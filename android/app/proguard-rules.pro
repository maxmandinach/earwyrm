# Supabase / Ktor
-keep class io.github.jan.supabase.** { *; }
-keep class io.ktor.** { *; }

# Kotlinx Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class com.earwyrm.app.**$$serializer { *; }
-keepclassmembers class com.earwyrm.app.** { *** Companion; }
-keepclasseswithmembers class com.earwyrm.app.** { kotlinx.serialization.KSerializer serializer(...); }
