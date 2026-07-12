#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$ROOT_DIR/app/src/main"
OUT_DIR="$ROOT_DIR/build"
DIST_DIR="$ROOT_DIR/dist"
STAGING_DIR="$OUT_DIR/staging"

APP_URL="${APP_URL:-}"

if [[ "$APP_URL" != https://* ]]; then
  echo "APP_URL must be the deployed HTTPS URL, for example https://yaokao-suji.netlify.app/" >&2
  exit 1
fi

JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 17 2>/dev/null || true)}"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}"
BUILD_TOOLS="$ANDROID_SDK_ROOT/build-tools/35.0.0"
ANDROID_JAR="$ANDROID_SDK_ROOT/platforms/android-35/android.jar"

if [[ ! -x "$JAVA_HOME/bin/javac" || ! -x "$BUILD_TOOLS/aapt2" || ! -f "$ANDROID_JAR" ]]; then
  echo "Missing JDK 17 or Android SDK 35. Set JAVA_HOME and ANDROID_SDK_ROOT before building." >&2
  exit 1
fi

export JAVA_HOME
export ANDROID_SDK_ROOT
export PATH="$JAVA_HOME/bin:$BUILD_TOOLS:$ANDROID_SDK_ROOT/platform-tools:$PATH"

AAPT2="$BUILD_TOOLS/aapt2"
D8="$BUILD_TOOLS/d8"
ZIPALIGN="$BUILD_TOOLS/zipalign"
APKSIGNER="$BUILD_TOOLS/apksigner"
KEYSTORE="$ROOT_DIR/debug.keystore"

rm -rf "$STAGING_DIR"
mkdir -p "$OUT_DIR/gen" "$OUT_DIR/classes" "$OUT_DIR/dex" "$OUT_DIR/apk" "$DIST_DIR" "$STAGING_DIR"
cp -R "$APP_DIR/" "$STAGING_DIR/"
APP_URL_ESCAPED="${APP_URL//&/\\&}"
sed -i.bak "s|__APP_URL__|$APP_URL_ESCAPED|g" "$STAGING_DIR/res/values/strings.xml"
rm -f "$STAGING_DIR/res/values/strings.xml.bak"

"$AAPT2" compile --dir "$STAGING_DIR/res" -o "$OUT_DIR/compiled.zip"
"$AAPT2" link \
  -o "$OUT_DIR/apk/unsigned.apk" \
  -I "$ANDROID_JAR" \
  --manifest "$STAGING_DIR/AndroidManifest.xml" \
  "$OUT_DIR/compiled.zip" \
  --java "$OUT_DIR/gen" \
  --min-sdk-version 23 \
  --target-sdk-version 35

"$JAVA_HOME/bin/javac" \
  -source 8 \
  -target 8 \
  -bootclasspath "$ANDROID_JAR" \
  -classpath "$OUT_DIR/gen" \
  -d "$OUT_DIR/classes" \
  "$STAGING_DIR/java/com/yaokao/suji/MainActivity.java" \
  "$OUT_DIR/gen/com/yaokao/suji/R.java"

"$JAVA_HOME/bin/jar" cf "$OUT_DIR/classes.jar" -C "$OUT_DIR/classes" .

"$D8" \
  --lib "$ANDROID_JAR" \
  --output "$OUT_DIR/dex" \
  "$OUT_DIR/classes.jar"

(
  cd "$OUT_DIR/dex"
  zip -q -u "$OUT_DIR/apk/unsigned.apk" classes.dex
)

if [ ! -f "$KEYSTORE" ]; then
  "$JAVA_HOME/bin/keytool" \
    -genkeypair \
    -keystore "$KEYSTORE" \
    -storepass android \
    -alias androiddebugkey \
    -keypass android \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -dname "CN=Android Debug,O=Android,C=US"
fi

"$ZIPALIGN" -f -p 4 "$OUT_DIR/apk/unsigned.apk" "$OUT_DIR/apk/aligned.apk"
"$APKSIGNER" sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:android \
  --key-pass pass:android \
  --out "$DIST_DIR/yaokao-suji-demo.apk" \
  "$OUT_DIR/apk/aligned.apk"

"$APKSIGNER" verify --verbose "$DIST_DIR/yaokao-suji-demo.apk"

echo "$DIST_DIR/yaokao-suji-demo.apk"
