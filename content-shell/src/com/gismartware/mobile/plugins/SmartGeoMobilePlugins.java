 package com.gismartware.mobile.plugins;

import org.chromium.content.browser.JavascriptInterface;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Log;

import com.gismartware.mobile.ActivityCode;

public class SmartGeoMobilePlugins {
	
	private static final String TAG = "GimapMobilePlugins";

	private Context context;

	public SmartGeoMobilePlugins(Context context) {
		this.context = context;
	}
	
	@JavascriptInterface
	public void launchCamera(int callbackId) {
		Log.d(TAG, "Request camera");
		Activity act = (Activity)context;
		Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
		act.startActivityForResult(intent, ActivityCode.CAPTURE_IMAGE.getCode());
	}
	
	@JavascriptInterface
	public void goTo(float longOrig, float latOrig, float longDest, float latDest) {
		String to = "https://maps.google.com/maps?saddr=" + latOrig + "," + longOrig + "&daddr=" + latDest + "," + longDest;
		
		Log.d(TAG, "Goto " + to);
		
		Activity act = (Activity)context;
		Intent intent = new Intent(android.content.Intent.ACTION_VIEW, Uri.parse(to)).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK|Intent.FLAG_ACTIVITY_NEW_TASK);
		act.startActivity(intent);
	}
	
	@JavascriptInterface
	public void redirect(String url) {
		Log.d(TAG, "Redirect to URL " + url);
		
		Intent intent = new Intent(android.content.Intent.ACTION_VIEW,  Uri.parse(url)).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK|Intent.FLAG_ACTIVITY_NEW_TASK);
		Activity act = (Activity)context;
		act.startActivity(intent);
	}
	
	@JavascriptInterface
	public void locate() {
		Log.d(TAG, "Request location");
		
		Activity act = (Activity)context;
		Intent intent = new Intent(context, GeoLocation.class);
		act.startActivityForResult(intent, ActivityCode.GEOLOCATE.getCode());
	}
}
