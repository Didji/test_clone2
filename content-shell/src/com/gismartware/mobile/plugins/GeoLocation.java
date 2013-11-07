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
		if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
			Location location = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
			if (location == null && locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
				location = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
			}
			Intent resultData = new Intent();
			resultData.putExtra("location", location);
			setResult(Activity.RESULT_OK, resultData);
			finish();
		} else {
			Location location = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
			if (location == null && locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
				location = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
			}
			Intent resultData = new Intent();
			resultData.putExtra("location", location);
			setResult(Activity.RESULT_OK, resultData);
			finish();
			/*
			// demander l'activation GPS
			AlertDialog.Builder builder = new AlertDialog.Builder(this);
			builder.setMessage(R.string.gps_disabled)
					.setCancelable(false)
					.setPositiveButton(R.string.gps_disabled_opt_yes,
							new DialogInterface.OnClickListener() {
								public void onClick(DialogInterface dialog, int id) {
									startActivityForResult(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS), ActivityCode.START_GPS.getCode());
								}
							})
					.setNegativeButton(R.string.gps_disabled_opt_no,
							new DialogInterface.OnClickListener() {
								public void onClick(DialogInterface dialog, int id) {
									dialog.cancel();
									
									Intent resultData = new Intent();
									resultData.putExtra("canceled", true);
									setResult(Activity.RESULT_CANCELED);
									finish();
								}
							});
			builder.create().show();*/
		}
	}
	
	/*@Override
    public void onActivityResult(int requestCode, int resultCode, Intent intent) {
		super.onActivityResult(requestCode, resultCode, intent);
		if (resultCode == RESULT_OK && requestCode == ActivityCode.START_GPS.getCode()) {
			LocationManager locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
			Location location = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
			Intent resultData = new Intent();
			resultData.putExtra("location", location);
			setResult(Activity.RESULT_OK, resultData);
			finish();
		}
	}*/
}
