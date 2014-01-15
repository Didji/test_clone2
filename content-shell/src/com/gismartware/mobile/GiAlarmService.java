package com.gismartware.mobile;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.IBinder;
import android.util.Log;
import android.widget.Toast;

public class GiAlarmService extends Service
{
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i("com.gismartware.smartgeoLogger#GiAlarmService", "onStartCommand");
        GiAlarm receiver = new GiAlarm();
        Context context = this.getApplicationContext();
        this.registerReceiver( receiver, new IntentFilter("com.gismartware.smartgeoLogger") );
        PendingIntent pintent = PendingIntent.getBroadcast( this, 0, new Intent("com.gismartware.smartgeoLogger"), 0 );
        AlarmManager manager = (AlarmManager)(this.getSystemService( Context.ALARM_SERVICE ));
        manager.setRepeating(AlarmManager.RTC_WAKEUP, System.currentTimeMillis(), 1000 * 10, pintent); // Millisec * Second * Minute
        return Service.START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}