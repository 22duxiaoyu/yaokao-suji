# 药考速记 Android Demo

这是作品集展示用的轻量 WebView APK 壳。它加载已经部署到 HTTPS 的药考速记网站，支持系统文件选择器上传资料。

## 构建

先完成 Netlify 部署，再传入公开地址：

构建环境需要 JDK 17、Android SDK Platform 35 和 Build Tools 35.0.0。未使用 Android Studio 默认路径时，请设置 `JAVA_HOME` 与 `ANDROID_SDK_ROOT`。

```bash
cd android-webview
APP_URL=https://yaokao-suji.netlify.app/ ./build-apk.sh
```

输出文件：

```text
android-webview/dist/yaokao-suji-demo.apk
```

## 发布

将 APK 上传到 GitHub Releases，作品集网站的下载按钮直接链接 Release Asset。

当前脚本默认使用本目录的 Demo 签名，仅用于面试作品展示，不用于应用商店正式发行。不要公开提交生产签名密钥。
