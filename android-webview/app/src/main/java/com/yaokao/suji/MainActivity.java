package com.yaokao.suji;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private String appUrl;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(7, 122, 111));
        getWindow().setNavigationBarColor(Color.rgb(7, 122, 111));

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(244, 251, 249));

        TextView loading = new TextView(this);
        loading.setText("药考速记加载中");
        loading.setTextColor(Color.rgb(7, 122, 111));
        loading.setGravity(Gravity.CENTER);
        loading.setTextSize(16);
        root.addView(loading, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(244, 251, 249));
        root.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        setContentView(root);
        appUrl = getString(R.string.app_url);
        configureWebView();
        webView.loadUrl(appUrl);
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                showConnectionError(description);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && request.isForMainFrame()) {
                    showConnectionError(error.getDescription().toString());
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }

                filePathCallback = callback;

                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException error) {
                    filePathCallback = null;
                    Toast.makeText(MainActivity.this, "没有可用的文件选择器", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });
    }

    private void showConnectionError(String detail) {
        String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<style>body{margin:0;background:#f4fbf9;color:#075f57;font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;}"
            + ".box{width:82%;max-width:360px;text-align:left}.title{font-size:22px;font-weight:700;margin-bottom:14px}.p{font-size:14px;line-height:1.7;color:#52736f}"
            + ".url{margin:14px 0;padding:12px;border:1px solid #d9ebe7;border-radius:12px;word-break:break-all;color:#075f57;background:#fff}"
            + "button{width:100%;height:46px;border:0;border-radius:14px;background:#077a6f;color:#fff;font-size:16px;font-weight:700;margin-top:16px}</style></head>"
            + "<body><div class='box'><div class='title'>暂时无法连接作品集服务</div>"
            + "<div class='p'>请检查网络连接，或直接在浏览器打开下方地址。</div>"
            + "<div class='url'>" + appUrl + "</div>"
            + "<div class='p'>错误：" + escapeHtml(detail) + "</div>"
            + "<button onclick=\"location.href='" + appUrl + "'\">重新连接</button></div></body></html>";

        webView.loadDataWithBaseURL(appUrl, html, "text/html", "UTF-8", null);
    }

    private String escapeHtml(String value) {
        if (value == null) return "未知错误";

        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) {
            return;
        }

        Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }

        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }

        super.onDestroy();
    }
}
