package com.rahul2327.cardledger;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "BiometricAuth")
public class BiometricAuthPlugin extends Plugin {
    // BIOMETRIC_WEAK | DEVICE_CREDENTIAL works reliably across all Android versions
    // and supports Fingerprint, Face Unlock, and Device PIN/Pattern/Password fallback.
    private static final int ALLOWED_AUTHENTICATORS =
        BiometricManager.Authenticators.BIOMETRIC_WEAK
            | BiometricManager.Authenticators.DEVICE_CREDENTIAL;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        BiometricManager manager = BiometricManager.from(getContext());
        int status = manager.canAuthenticate(ALLOWED_AUTHENTICATORS);
        JSObject result = new JSObject();
        result.put("available", status == BiometricManager.BIOMETRIC_SUCCESS);
        result.put("statusCode", status);
        call.resolve(result);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        String title = call.getString("title", "Unlock CardLedger");
        String subtitle = call.getString("subtitle", "Use fingerprint or device lock to continue");

        FragmentActivity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }

        activity.runOnUiThread(() -> {
            BiometricManager manager = BiometricManager.from(activity);
            int canAuth = manager.canAuthenticate(ALLOWED_AUTHENTICATORS);
            if (canAuth != BiometricManager.BIOMETRIC_SUCCESS) {
                call.reject("No fingerprint or device lock is configured on this phone.");
                return;
            }

            AtomicBoolean settled = new AtomicBoolean(false);
            Executor executor = ContextCompat.getMainExecutor(activity);
            BiometricPrompt prompt = new BiometricPrompt(
                activity,
                executor,
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(
                        @NonNull BiometricPrompt.AuthenticationResult result
                    ) {
                        super.onAuthenticationSucceeded(result);
                        if (settled.compareAndSet(false, true)) {
                            JSObject ret = new JSObject();
                            ret.put("verified", true);
                            call.resolve(ret);
                        }
                    }

                    @Override
                    public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                        super.onAuthenticationError(errorCode, errString);
                        if (settled.compareAndSet(false, true)) {
                            call.reject(errString.toString(), String.valueOf(errorCode));
                        }
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        super.onAuthenticationFailed();
                        // Keep prompt open so user can retry fingerprint
                    }
                }
            );

            BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setAllowedAuthenticators(ALLOWED_AUTHENTICATORS)
                .build();

            try {
                prompt.authenticate(promptInfo);
            } catch (Exception ex) {
                if (settled.compareAndSet(false, true)) {
                    call.reject(
                        ex.getMessage() != null ? ex.getMessage() : "Unable to start biometric prompt."
                    );
                }
            }
        });
    }
}
