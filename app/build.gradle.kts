import java.util.Properties

plugins {
    id("com.android.application")
}

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
        versionCode = 17
        versionName = "1.2.0"
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
        release {
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
}
