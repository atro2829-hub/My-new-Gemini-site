# Vanguard Invest Native Android Project

This folder contains the native Android conversion of the Vanguard Invest web application.

## Project Structure

- `app/src/main/java`: Contains the Java source code (Activities and Models).
- `app/src/main/res`: Contains the Android XML layouts, drawables, and styles.
- `assets/`: Contains the `data.json` file used for local data handling.

## Dependencies

To build and run this project, you will need:

1. **Android SDK**: Minimum API level 21 (Lollipop).
2. **Gradle**: Build system for Android.
3. **Gson**: For JSON parsing.
   - Add to `build.gradle`: `implementation 'com.google.code.gson:gson:2.10.1'`
4. **AndroidX Libraries**:
   - `androidx.appcompat:appcompat:1.6.1`
   - `androidx.constraintlayout:constraintlayout:2.1.4`

## How to Build and Run

1. **Open Android Studio**: Select "Open an existing project" and point to the `APK/` folder.
2. **Sync Gradle**: Android Studio will automatically prompt you to sync the Gradle files.
3. **Run**: Click the "Run" button to deploy to an emulator or physical device.

## Requirements Summary
- **JDK**: 17
- **Android SDK**: API 21+
- **Build System**: Gradle 8.1.1
- **JSON Library**: Gson
