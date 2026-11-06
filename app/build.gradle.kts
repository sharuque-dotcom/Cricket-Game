plugins {
    id("com.android.application")
}

android {
    namespace = "com.gullytoglory.game"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.gullytoglory.game"
        minSdk = 24
        targetSdk = 35
        versionCode = 11
        versionName = "0.7.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
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
