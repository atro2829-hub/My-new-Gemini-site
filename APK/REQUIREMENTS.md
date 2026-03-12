# Application Requirements & Specifications

## 1. System Requirements
- **Operating System**: Android 5.0 (API Level 21) or higher.
- **Hardware**: Minimum 2GB RAM, 100MB free storage.
- **Internet**: Required for real-time data syncing (though currently uses local JSON).

## 2. Development Requirements
- **IDE**: Android Studio Hedgehog (2023.1.1) or newer.
- **JDK**: Java Development Kit 17.
- **Gradle**: Version 8.0 or higher.
- **Language**: Java 11+.

## 3. Functional Requirements
- **User Dashboard**: Display total balance, invested amount, and total profit.
- **Data Persistence**: Load user data from a local `data.json` file.
- **UI/UX**: Responsive design that mimics the Vanguard web aesthetic using native XML layouts.
- **Navigation**: Single activity architecture with scrollable content.

## 4. Technical Dependencies
- **Gson (2.10.1)**: Used for serializing and deserializing JSON data into Java objects.
- **AppCompat (1.6.1)**: Ensures backward compatibility for UI components.
- **Material Design (1.9.0)**: Provides modern UI components and styling.
- **ConstraintLayout (2.1.4)**: Used for flexible and efficient layout designs.

## 5. Security Requirements
- **Data Privacy**: User data is handled locally; future versions should implement HTTPS for API calls.
- **Obfuscation**: Use ProGuard/R8 for release builds to protect source code.
