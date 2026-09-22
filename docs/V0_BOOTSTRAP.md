# V0 bootstrap

The Flutter SDK cannot be downloaded in the environment that started this repository. `storage.googleapis.com` and `pub.dev` are blocked. The Dart sources here are the start of the app. They have not been compiled.

The running app, while Flutter cannot be compiled here, is `web/`. Serve that directory. `docs/review/` is an earlier shell study and is not the product. When Flutter builds, retire the review rather than keeping it in sync by hand. `dart format`, `flutter analyze`, `flutter test`, and `flutter run` have not been run in this environment.

## When the SDK is available

```bash
flutter create . --project-name daybook --org dev.daybook
flutter pub get
flutter test
flutter run
```

`flutter create .` fills in the platform folders. Do not let it overwrite `lib/`.

Android, after create:

- `minSdk` 26
- `android:allowBackup="false"` on the application, or exclude the database directory
- No `READ_SMS`
- Internet permission only in the debug manifest, if the toolchain requires it

The review server is static files. It is not the shipping app.
