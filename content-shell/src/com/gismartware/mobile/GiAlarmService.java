package com.gismartware.mobile;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.nfc.Tag;
import android.os.IBinder;
import android.util.Log;
import android.widget.Toast;

import java.io.FileInputStream;
import java.util.Calendar;
import java.util.PropertyResourceBundle;
import java.util.ResourceBundle;

public class GiAlarmService extends Service
{
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        ResourceBundle config = null;
        try {
            FileInputStream fis = new FileInputStream(getExternalFilesDir(null).getParent() + "/" + "config.properties");
            config = new PropertyResourceBundle(fis);
            fis.close();
        } catch(Exception e){
            Log.e("gismartware::MailSender/FileInputStream", e.getMessage(), e);
        }
        Log.i("com.gismartware.smartgeoLogger#GiAlarmService", "onStartCommand");
        GiAlarm receiver = new GiAlarm();
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.HOUR_OF_DAY, Integer.parseInt(config.getString("logger.hour")));
        calendar.set(Calendar.MINUTE, Integer.parseInt(config.getString("logger.minute")));
        calendar.set(Calendar.SECOND, 0);
        Context context = this.getApplicationContext();
        this.registerReceiver( receiver, new IntentFilter("com.gismartware.mobile") );
        PendingIntent pintent = PendingIntent.getBroadcast( this, 0, new Intent("com.gismartware.mobile"), 0 );
        AlarmManager manager = (AlarmManager)(this.getSystemService( Context.ALARM_SERVICE ));
        manager.setRepeating(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), AlarmManager.INTERVAL_DAY, pintent);
        //manager.setRepeating(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), 1000 * 60 * 1, pintent);
        return Service.START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}