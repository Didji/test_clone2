package com.gismartware.mobile;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.Toast;

public class GiAlarmAutoStart extends BroadcastReceiver {
    GiAlarm alarm = new GiAlarm();
    @Override
    public void onReceive(Context context, Intent intent)
    {
        Log.i("com.gismartware.smartgeoLogger#GiAlarmAutoStart", "onReceive");
        if (intent.getAction().equals(Intent.ACTION_BOOT_COMPLETED)) {
            Intent i = new Intent();
            i.setAction("com.gismartware.smartgeoLogger.GiAlarmService");
            context.startService(i);
        }
    }
}
