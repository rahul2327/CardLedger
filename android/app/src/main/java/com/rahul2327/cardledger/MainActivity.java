package com.rahul2327.cardledger;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Google Messages Material You surface colors
    private static final int LIGHT_SURFACE_COLOR = Color.parseColor("#F8F9FA");
    private static final int LIGHT_NAV_BAR_COLOR = Color.parseColor("#F0F4F9");
    private static final int DARK_SURFACE_COLOR = Color.parseColor("#131314");
    private static final int DARK_NAV_BAR_COLOR = Color.parseColor("#1B1C1E");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(BiometricAuthPlugin.class);
        super.onCreate(savedInstanceState);

        // Handle Android 15/16 (API 35/36) edge-to-edge insets cleanly so the WebView
        // never overlaps the top notification/status bar, camera cutout, bottom gesture bar,
        // or soft keyboard.
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (view, windowInsets) -> {
                Insets systemBars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                Insets imeInsets = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                int bottomInset = Math.max(systemBars.bottom, imeInsets.bottom);
                view.setPadding(systemBars.left, systemBars.top, systemBars.right, bottomInset);
                return WindowInsetsCompat.CONSUMED;
            });
            ViewCompat.requestApplyInsets(contentView);
        }

        // Apply initial Google Messages dark/light system bar colors before WebView paints
        int nightModeFlags = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        applySystemBars(nightModeFlags != Configuration.UI_MODE_NIGHT_NO);

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
            int topColor = isDark ? DARK_SURFACE_COLOR : LIGHT_SURFACE_COLOR;
            int navColor = isDark ? DARK_NAV_BAR_COLOR : LIGHT_NAV_BAR_COLOR;

            View decorView = window.getDecorView();
            decorView.setBackgroundColor(topColor);

            View contentView = findViewById(android.R.id.content);
            if (contentView != null) {
                contentView.setBackgroundColor(topColor);
            }

            window.setStatusBarColor(topColor);
            window.setNavigationBarColor(navColor);

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
