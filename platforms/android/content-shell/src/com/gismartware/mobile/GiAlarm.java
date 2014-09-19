package com.gismartware.mobile;

import android.annotation.SuppressLint;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;

public class GiAlarm extends BroadcastReceiver {
	
    @SuppressLint("Wakelock")
	@Override
    public void onReceive(Context context, Intent intent) {
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "");
        wakeLock.acquire();
        SendEmailTask emailTask = new SendEmailTask(context);
        emailTask.execute();
        wakeLock.release();
    }
}