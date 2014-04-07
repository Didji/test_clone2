package com.gismartware.mobile;

import com.gismartware.mobile.plugins.SmartGeoMobilePlugins;
import com.littlefluffytoys.littlefluffylocationlibrary.LocationInfo;
import com.littlefluffytoys.littlefluffylocationlibrary.LocationLibraryConstants;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.Toast;

public class GiLocationBroadcastReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        final LocationInfo locationInfo = (LocationInfo) intent.getSerializableExtra(LocationLibraryConstants.LOCATION_BROADCAST_EXTRA_LOCATIONINFO);
        //Log.d("gismartware", "lastlat:"+locationInfo.lastLat);
        //Log.d("gismartware", "lastlong:"+locationInfo.lastLong);
        //Toast.makeText(context, Float.toString(locationInfo.lastLat), Toast.LENGTH_SHORT).show();
        //Toast.makeText(context, Float.toString(locationInfo.lastLong), Toast.LENGTH_SHORT).show();
    }
}