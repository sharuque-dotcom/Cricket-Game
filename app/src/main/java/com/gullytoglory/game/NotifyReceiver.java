package com.gullytoglory.game;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Posts a local reminder that the game scheduled earlier (key refilled, comeback nudge). */
public class NotifyReceiver extends BroadcastReceiver {
    static final String CHANNEL = "story";

    static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Story reminders", NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription("Key refills and new episodes");
        nm.createNotificationChannel(ch);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        if (Build.VERSION.SDK_INT >= 33
                && ctx.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            return;
        }
        ensureChannel(ctx);
        int id = intent.getIntExtra("id", 1);
        Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(ctx, id, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
        b.setSmallIcon(R.drawable.ic_stat_bat)
         .setContentTitle(intent.getStringExtra("title"))
         .setContentText(intent.getStringExtra("body"))
         .setStyle(new Notification.BigTextStyle().bigText(intent.getStringExtra("body")))
         .setColor(0xFFFF9F1C)
         .setAutoCancel(true)
         .setContentIntent(tap);
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(id, b.build());
    }
}
