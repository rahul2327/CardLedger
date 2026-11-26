package com.rahul2327.cardledger;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int LIGHT_BAR_COLOR = Color.parseColor("#F7FAF9");
    private static final int DARK_BAR_COLOR = Color.parseColor("#0F1514");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Apply initial system bar colors based on Android system UI mode before WebView paints
        int nightModeFlags = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        applySystemBars(nightModeFlags == Configuration.UI_MODE_NIGHT_YES);

        // Ensure persistent local DOM & IndexedDB storage and attach system-bar bridge
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            webView.addJavascriptInterface(new SystemBarBridge(), "CardLedgerNative");
        }
    }

    private void applySystemBars(final boolean isDark) {
        runOnUiThread(() -> {
            Window window = getWindow();
            if (window == null) return;
            int barColor = isDark ? DARK_BAR_COLOR : LIGHT_BAR_COLOR;
            window.setStatusBarColor(barColor);
            window.setNavigationBarColor(barColor);

            View decorView = window.getDecorView();
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
            if (controller != null) {
                controller.setAppearanceLightStatusBars(!isDark);
                controller.setAppearanceLightNavigationBars(!isDark);
            }
        });
    }

    private class SystemBarBridge {
        @JavascriptInterface
        public void setSystemBarTheme(boolean isDark) {
            applySystemBars(isDark);
        }
    }
}
