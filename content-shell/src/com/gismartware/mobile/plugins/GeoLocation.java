package com.gismartware.mobile.plugins;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.location.LocationManager;
import android.os.Bundle;
import android.util.Log;

public class GeoLocation extends Activity {

	private static final String TAG = "GimapMobile";
	
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		LocationManager locationManager;
		String context = Context.LOCATION_SERVICE;
		locationManager = (LocationManager)getSystemService(context);
		String provider = LocationManager.GPS_PROVIDER;
		Location location = locationManager.getLastKnownLocation(provider);
		Log.d(TAG, "Location retrieved: " + location.toString());
		Intent resultData = new Intent();
		resultData.putExtra("location", location);
		setResult(Activity.RESULT_OK, resultData);
		finish();
	}
}
