package com.gismartware.mobile.plugins;

import org.chromium.content.browser.JavascriptInterface;

import com.gismartware.mobile.ActivityCode;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;

public class SmartGeoMobilePlugins {

	private Context context;

	public SmartGeoMobilePlugins(Context context) {
		this.context = context;
	}
	
	@JavascriptInterface
	public void launchCamera(int callbackId) {
		Activity act = (Activity)context;
		Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
		act.startActivityForResult(intent, ActivityCode.CAPTURE_IMAGE.getCode());
	}
	
	@JavascriptInterface
	public void goTo(float longOrig, float latOrig, float longDest, float latDest) {
		String to = "https://maps.google.com/maps?saddr=" + latOrig + "," + longOrig + "&daddr=" + latDest + "," + longDest;
		
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
		act.startActivityForResult(intent, ActivityCode.GEOLOCATE.getCode());
	}
}
