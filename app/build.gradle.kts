import java.util.Properties

plugins {
    id("com.android.application")
}

// Firebase Analytics: app/google-services.json is git-ignored (public repo). With it, builds send
// analytics; without it they still build, and the app simply skips tracking.
if (file("google-services.json").exists()) apply(plugin = "com.google.gms.google-services")

// Release signing reads ../keystore.properties (git-ignored). Without it, release builds are unsigned.
val keystoreProps = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "com.gullytoglory.game"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.gullytoglory.game"
        minSdk = 24
        targetSdk = 36
        versionCode = 26
        versionName = "1.5.3"
    }

    signingConfigs {
        if (keystoreProps.getProperty("storeFile") != null) {
            create("release") {
                storeFile = file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        // Debug builds always show Google's test ads, so testing on your own phone
        // never clicks real ads (AdMob treats that as invalid traffic).
        debug {
            resValue("string", "admob_app_id", "ca-app-pub-3940256099942544~3347511713")
            resValue("string", "admob_rewarded_id", "ca-app-pub-3940256099942544/5224354917")
        }
        release {
            resValue("string", "admob_app_id", "ca-app-pub-1591932924572024~5540920416")
            resValue("string", "admob_rewarded_id", "ca-app-pub-1591932924572024/5327178322")
            isMinifyEnabled = false
            signingConfigs.findByName("release")?.let { signingConfig = it }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // Google AdMob: rewarded video ads (watch an ad -> key / diamonds)
    implementation("com.google.android.gms:play-services-ads:23.6.0")
    // Google Play In-App Review: the rating card shown after a satisfying moment
    implementation("com.google.android.play:review:2.0.2")
    // Firebase Analytics: which players finish chapters (Google Ads optimises for these, not bare installs)
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-analytics")
}
