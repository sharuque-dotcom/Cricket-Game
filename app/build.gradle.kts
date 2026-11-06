plugins {
    id("com.android.application")
}

android {
    namespace = "com.gullytoglory.game"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.gullytoglory.game"
        minSdk = 24
        targetSdk = 36
        versionCode = 12
        versionName = "0.7.1"
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
