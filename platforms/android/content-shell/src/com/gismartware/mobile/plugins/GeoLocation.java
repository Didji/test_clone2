package com.gismartware.mobile.plugins;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.location.LocationManager;
import android.os.Bundle;

public class GeoLocation extends Activity {

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		
		LocationManager locationManager = (LocationManager)getSystemService(Context.LOCATION_SERVICE);
		Location location = null;
		if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
			location = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
			if (location == null && locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
				location = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
			}
		} else if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
			location = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
		}
		Intent resultData = new Intent();
		resultData.putExtra("location", location);
		setResult(Activity.RESULT_OK, resultData);
		finish();
	}
}
