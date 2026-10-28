package com.soarhe.tdj;

import android.content.Context;
import android.webkit.*;
import java.io.ByteArrayInputStream;

/** Only packaged content can run scripts or reach the native bridge. */
final class LocalWeb {
    static final String ROOT = "https://appassets.androidplatform.net/assets/";
    abstract static class Bridge {
        @JavascriptInterface public abstract String loadConfig();
    }
    // JavaScript is restricted to packaged resources; external requests/navigation are rejected below.
    @android.annotation.SuppressLint("SetJavaScriptEnabled")
    static WebView create(Context context, Bridge bridge) {
        WebView view = new WebView(context);
        view.getSettings().setJavaScriptEnabled(true);
        view.getSettings().setAllowFileAccess(false);
        view.getSettings().setAllowContentAccess(false);
        view.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        view.addJavascriptInterface(bridge, "Native");
        view.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return true; }
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                String url = r.getUrl().toString();
                if (url.startsWith(ROOT) && !url.substring(ROOT.length()).contains("..")) {
                    String path = url.substring(ROOT.length());
                    String mime = path.endsWith(".mjs") || path.endsWith(".js") ? "text/javascript" : path.endsWith(".json") ? "application/json" : path.endsWith(".css") ? "text/css" : "text/html";
                    try { return new WebResourceResponse(mime, "UTF-8", context.getAssets().open(path)); }
                    catch (Exception ignored) { }
                }
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not found", java.util.Map.of(), new ByteArrayInputStream(new byte[0]));
            }
        });
        return view;
    }
    private LocalWeb() { }
}
