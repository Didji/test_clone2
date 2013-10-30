package com.gismartware.mobile.plugins;

import org.chromium.content.browser.JavascriptInterface;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;

public class SmartGeoMobilePlugins {
	
	public static final int CAPTURE_IMAGE_ACTIVITY_REQUEST_CODE = 100;
	public static final int GEOLOCATE_ACTIVITY_REQUEST_CODE = 101;

	private Context context;

	public SmartGeoMobilePlugins(Context context) {
		this.context = context;
	}
	
	@JavascriptInterface
	public void launchCamera(int callbackId) {
		Activity act = (Activity)context;
		Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
		act.startActivityForResult(intent, CAPTURE_IMAGE_ACTIVITY_REQUEST_CODE);
	}
	
	@JavascriptInterface
	public void goTo(float xorig, float yorig, float xdest, float ydest) {
		String to = "https://maps.google.com/maps?saddr=" + xorig + "," + yorig 
				+ "&daddr=" + xdest + "," + ydest;
		
		Activity act = (Activity)context;
		Intent intent = new Intent(android.content.Intent.ACTION_VIEW, Uri.parse(to)).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK|Intent.FLAG_ACTIVITY_NEW_TASK);
		act.startActivity(intent);
	}
	
	@JavascriptInterface
	public void redirect(String url) {
		Intent intent = new Intent(android.content.Intent.ACTION_VIEW,  Uri.parse(url)).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK|Intent.FLAG_ACTIVITY_NEW_TASK);
		Activity act = (Activity)context;
		act.startActivity(intent);
	}
	
	@JavascriptInterface
	public void locate() {
		Activity act = (Activity)context;
		Intent intent = new Intent(context, GeoLocation.class);
		act.startActivityForResult(intent, GEOLOCATE_ACTIVITY_REQUEST_CODE);
	}
}
