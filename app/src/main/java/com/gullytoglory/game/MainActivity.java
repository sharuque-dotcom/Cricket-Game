package com.gullytoglory.game;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.Context;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.graphics.Insets;
import android.window.OnBackInvokedDispatcher;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

import com.google.firebase.analytics.FirebaseAnalytics;

import org.json.JSONObject;
import java.util.Iterator;

public class MainActivity extends Activity {
    private WebView web;
    private RewardedAd rewarded;
    private boolean adLoading = false;
    // true while a rewarded ad is on screen (see onPause)
    private boolean adOpen = false;
    // null when the build has no google-services.json
    private FirebaseAnalytics analytics;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#FFF4EC"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setTextZoom(100);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new Bridge(this), "AndroidBridge");
        initAnalytics();
        trackNotifOpen(getIntent());
        MobileAds.initialize(this, status -> loadRewarded());
        NotifyReceiver.ensureChannel(this);
        setContentView(web);
        hideSystemBars();
        if (Build.VERSION.SDK_INT >= 30) {
            web.setOnApplyWindowInsetsListener((v, insets) -> {
                Insets c = insets.getInsets(WindowInsets.Type.displayCutout());
                v.setPadding(c.left, c.top, c.right, c.bottom);
                return insets;
            });
        }
        // Android 13+ back handling (Android 16 no longer calls onBackPressed)
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl("file:///android_asset/game/index.html");
        }
    }

    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.evaluateJavascript("window.GG && GG.onPause && GG.onPause()", null);
        // pauseTimers() freezes EVERY WebView in the app, including the one AdMob plays the ad in:
        // the ad turns black and never reports the reward. Leave timers running while an ad is up.
        if (!adOpen) {
            web.onPause();
            web.pauseTimers();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.resumeTimers();
        web.onResume();
        web.evaluateJavascript("window.GG && GG.onResume && GG.onResume()", null);
        resumeUpdate();
    }

    // ---------- In-app updates (Google Play) ----------
    // The game calls checkUpdate(min) once the server manifest is loaded. Below `min` (a versionCode) the update is
    // required: Google's full-screen flow. Otherwise a flexible prompt, at most once every 3 days: the download runs
    // in the background and the game shows a "Restart to update" card when it's ready.
    private static final int REQ_UPDATE = 11;
    private static final long UPDATE_NAG_MS = 3L * 24 * 60 * 60 * 1000;
    private AppUpdateManager updates;
    private int updateType = -1;
    private final InstallStateUpdatedListener installListener = state -> {
        if (state.installStatus() == InstallStatus.DOWNLOADED) updateReady();
    };

    @SuppressWarnings("deprecation")
    int appVersionCode() {
        try { android.content.pm.PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0); return Build.VERSION.SDK_INT >= 28 ? (int) pi.getLongVersionCode() : pi.versionCode; } catch (Exception e) { return 0; }
    }

    String appVersionName() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return ""; }
    }

    void checkUpdate(int minCode) {
        try {
            if (updates == null) { updates = AppUpdateManagerFactory.create(this); updates.registerListener(installListener); }
            updates.getAppUpdateInfo().addOnSuccessListener(info -> {
                if (isFinishing()) return;
                if (info.installStatus() == InstallStatus.DOWNLOADED) { updateReady(); return; }
                if (info.updateAvailability() != UpdateAvailability.UPDATE_AVAILABLE) return;
                boolean required = minCode > 0 && appVersionCode() < minCode && info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE);
                android.content.SharedPreferences sp = getSharedPreferences("gg", MODE_PRIVATE);
                long last = sp.getLong("updateAsked", 0);
                if (!required && (System.currentTimeMillis() - last < UPDATE_NAG_MS || !info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE))) return;
                sp.edit().putLong("updateAsked", System.currentTimeMillis()).apply();
                startUpdate(info, required ? AppUpdateType.IMMEDIATE : AppUpdateType.FLEXIBLE);
            });
        } catch (Exception ignored) {}
    }

    private void startUpdate(AppUpdateInfo info, int type) {
        try {
            updateType = type;
            logUpdate("update_prompt", type == AppUpdateType.IMMEDIATE ? "required" : "flexible", info.availableVersionCode());
            updates.startUpdateFlowForResult(info, this, AppUpdateOptions.newBuilder(type).build(), REQ_UPDATE);
        } catch (Exception ignored) {}
    }

    // back from the background: finish a required update that was interrupted, or offer the restart again
    private void resumeUpdate() {
        if (updates == null) return;
        updates.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (info.installStatus() == InstallStatus.DOWNLOADED) updateReady();
            else if (updateType == AppUpdateType.IMMEDIATE && info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) startUpdate(info, AppUpdateType.IMMEDIATE);
        });
    }

    private void updateReady() {
        web.post(() -> web.evaluateJavascript("window.GG && GG.updateReady && GG.updateReady()", null));
    }

    void completeUpdate() {
        if (updates != null) { logUpdate("update_restart", "", 0); updates.completeUpdate(); }
    }

    private void logUpdate(String name, String mode, int toVersion) {
        if (analytics == null) return;
        Bundle b = new Bundle();
        if (!mode.isEmpty()) b.putString("mode", mode);
        if (toVersion > 0) b.putLong("to", toVersion);
        b.putLong("from", appVersionCode());
        analytics.logEvent(name, b);
    }

    @SuppressWarnings("deprecation")
    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code != REQ_UPDATE) return;
        logUpdate("update_answer", result == RESULT_OK ? "accepted" : result == RESULT_CANCELED ? "declined" : "failed", 0);
        // a required update the player backed out of: ask again (Google's screen has no other way out)
        if (result != RESULT_OK && updateType == AppUpdateType.IMMEDIATE && updates != null)
            updates.getAppUpdateInfo().addOnSuccessListener(info -> { if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE) startUpdate(info, AppUpdateType.IMMEDIATE); });
    }

    @Override
    protected void onDestroy() {
        if (updates != null) updates.unregisterListener(installListener);
        super.onDestroy();
    }

    // Let the game decide what back does: close a sheet, or exit on a second press.
    private void handleBack() {
        web.evaluateJavascript("(window.GG && GG.onBack) ? GG.onBack() : 'exit'", value -> {
            if (value != null && value.contains("exit")) finish();
        });
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() { handleBack(); }

    // ---------- Local notifications ----------
    private static final int REQ_NOTIFY = 7;

    String notifyState() {
        if (Build.VERSION.SDK_INT < 33) return "granted";
        if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return "granted";
        return getSharedPreferences("gg", MODE_PRIVATE).getBoolean("askedNotify", false) ? "denied" : "prompt";
    }

    void requestNotify() {
        if (Build.VERSION.SDK_INT < 33) { sendNotifyResult(true); return; }
        getSharedPreferences("gg", MODE_PRIVATE).edit().putBoolean("askedNotify", true).apply();
        requestPermissions(new String[]{ android.Manifest.permission.POST_NOTIFICATIONS }, REQ_NOTIFY);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        super.onRequestPermissionsResult(code, perms, results);
        if (code == REQ_NOTIFY) sendNotifyResult(results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED);
    }

    private void sendNotifyResult(boolean granted) {
        web.post(() -> web.evaluateJavascript("window.GG && GG.notifyResult && GG.notifyResult(" + granted + ")", null));
    }

    private PendingIntent notifyIntent(int id, String title, String body) {
        Intent i = new Intent(this, NotifyReceiver.class).putExtra("id", id).putExtra("title", title).putExtra("body", body);
        return PendingIntent.getBroadcast(this, id, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    void scheduleNotify(int id, long delayMs, String title, String body) {
        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        // inexact alarm: no special permission needed, battery friendly
        am.set(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + Math.max(1000, delayMs), notifyIntent(id, title, body));
    }

    void cancelNotify(int id) {
        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(notifyIntent(id, "", ""));
    }

    // ---------- Rewarded ads ----------
    // Results are kept here until the game collects them, so a reward is never lost
    // if the WebView was paused when the ad closed.
    private final java.util.Map<String, String> adResults = new java.util.concurrent.ConcurrentHashMap<>();
    private final android.os.Handler main = new android.os.Handler(android.os.Looper.getMainLooper());
    private long loadRetryMs = 15000;

    private void loadRewarded() {
        if (adLoading || rewarded != null) return;
        adLoading = true;
        RewardedAd.load(this, getString(R.string.admob_rewarded_id), new AdRequest.Builder().build(),
            new RewardedAdLoadCallback() {
                @Override public void onAdLoaded(RewardedAd ad) { rewarded = ad; adLoading = false; loadRetryMs = 15000; }
                @Override public void onAdFailedToLoad(LoadAdError err) {
                    rewarded = null; adLoading = false;
                    // retry with backoff (15s, 30s, ... up to 5 min) so an ad is ready next time
                    main.postDelayed(MainActivity.this::loadRewarded, loadRetryMs);
                    loadRetryMs = Math.min(loadRetryMs * 2, 300000);
                }
            });
    }

    private void callJs(String js) {
        web.post(() -> web.evaluateJavascript(js, null));
    }

    private void sendAdResult(String placement, String result) {
        adResults.put(placement, result);
        callJs("window.GG && GG.adResult && GG.adResult(" + JSONObject.quote(placement) + "," + JSONObject.quote(result) + ")");
    }

    String takeAdResult(String placement) {
        String r = adResults.remove(placement);
        return r == null ? "" : r;
    }

    private void showRewarded(String placement) {
        adResults.remove(placement);
        if (rewarded == null) { sendAdResult(placement, "unavailable"); loadRewarded(); return; }
        // AdMob does not promise the reward callback comes before the dismiss callback,
        // so the first final outcome wins and "skipped" waits a moment for a late reward.
        final boolean[] earned = { false };
        final boolean[] done = { false };
        RewardedAd ad = rewarded;
        rewarded = null;
        adOpen = true;
        web.resumeTimers(); // in case they were paused earlier
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdShowedFullScreenContent() {
                callJs("window.GG && GG.adShown && GG.adShown(" + JSONObject.quote(placement) + ")");
            }
            @Override public void onAdDismissedFullScreenContent() {
                adOpen = false;
                main.postDelayed(() -> {
                    if (!done[0]) { done[0] = true; sendAdResult(placement, earned[0] ? "rewarded" : "skipped"); }
                }, 1500);
                loadRewarded();
            }
            @Override public void onAdFailedToShowFullScreenContent(AdError e) {
                adOpen = false;
                if (!done[0]) { done[0] = true; sendAdResult(placement, "unavailable"); }
                loadRewarded();
            }
        });
        ad.show(this, reward -> main.post(() -> {
            earned[0] = true;
            if (!done[0]) { done[0] = true; sendAdResult(placement, "rewarded"); }
        }));
    }

    // ---------- In-app review ----------
    // Google decides whether the card actually appears (it has its own quota), and never tells us
    // whether the player rated, so the game just asks at good moments and moves on.
    private void requestReview() {
        try {
            ReviewManager rm = ReviewManagerFactory.create(this);
            rm.requestReviewFlow().addOnCompleteListener(task -> {
                if (!task.isSuccessful() || isFinishing()) return;
                ReviewInfo info = task.getResult();
                rm.launchReviewFlow(this, info);
            });
        } catch (Exception ignored) {}
    }

    // ---------- Analytics ----------
    private void initAnalytics() {
        try {
            analytics = FirebaseAnalytics.getInstance(this);
            // debug builds (your test phone) must not pollute the real numbers
            boolean debuggable = (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            analytics.setAnalyticsCollectionEnabled(!debuggable);
        } catch (Exception e) { analytics = null; }
    }

    // the app is singleTask, so a tap on a notification while it's running arrives here
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        trackNotifOpen(intent);
    }

    // notification_open {type: key|comeback}: which reminders bring players back
    private void trackNotifOpen(Intent intent) {
        if (intent == null || analytics == null) return;
        int id = intent.getIntExtra("notif", 0);
        if (id == 0) return;
        intent.removeExtra("notif");
        Bundle b = new Bundle();
        b.putString("type", id == 101 ? "key" : id == 102 ? "comeback" : String.valueOf(id));
        analytics.logEvent("notification_open", b);
    }

    void setUserProp(String name, String value) {
        if (analytics == null || name == null || !name.matches("[a-z][a-z0-9_]{0,23}") || name.startsWith("ga_")) return;
        analytics.setUserProperty(name, value == null ? null : value.length() > 36 ? value.substring(0, 36) : value);
    }

    void logEvent(String name, String paramsJson) {
        if (analytics == null || name == null || !name.matches("[a-z][a-z0-9_]{0,39}")) return;
        Bundle b = new Bundle();
        try {
            JSONObject o = new JSONObject(paramsJson == null || paramsJson.isEmpty() ? "{}" : paramsJson);
            for (Iterator<String> it = o.keys(); it.hasNext(); ) {
                String k = it.next(); Object v = o.get(k);
                if (v instanceof Number) b.putLong(k, ((Number) v).longValue()); else b.putString(k, String.valueOf(v));
            }
        } catch (Exception ignored) {}
        analytics.logEvent(name, b);
    }

    static class Bridge {
        private final MainActivity act;
        Bridge(MainActivity a) { act = a; }

        @JavascriptInterface
        public boolean adReady() { return act.rewarded != null; }

        @JavascriptInterface
        public String notifyState() { return act.notifyState(); }

        @JavascriptInterface
        public void requestNotify() { act.runOnUiThread(act::requestNotify); }

        @JavascriptInterface
        public void scheduleNotify(int id, double delayMs, String title, String body) { act.scheduleNotify(id, (long) delayMs, title, body); }

        @JavascriptInterface
        public void cancelNotify(int id) { act.cancelNotify(id); }

        @JavascriptInterface
        public String takeAdResult(String placement) { return act.takeAdResult(placement); }

        @JavascriptInterface
        public void showRewardedAd(String placement) { act.runOnUiThread(() -> act.showRewarded(placement)); }

        @JavascriptInterface
        public void logEvent(String name, String paramsJson) { act.logEvent(name, paramsJson); }

        @JavascriptInterface
        public void setUserProp(String name, String value) { act.setUserProp(name, value); }

        @JavascriptInterface
        public void checkUpdate(int minCode) { act.runOnUiThread(() -> act.checkUpdate(minCode)); }

        @JavascriptInterface
        public void completeUpdate() { act.runOnUiThread(act::completeUpdate); }

        @JavascriptInterface
        public String appVersion() { return act.appVersionName() + " (" + act.appVersionCode() + ")"; }

        @JavascriptInterface
        public void requestReview() { act.runOnUiThread(act::requestReview); }

        @JavascriptInterface
        public void vibrate(int ms) {
            Vibrator v = (Vibrator) act.getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null) return;
            if (Build.VERSION.SDK_INT >= 26) {
                v.vibrate(VibrationEffect.createOneShot(Math.max(1, ms), VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                v.vibrate(ms);
            }
        }

        @JavascriptInterface
        public void exit() { act.runOnUiThread(act::finish); }
    }
}
