 package com.gismartware.mobile.plugins;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

import org.chromium.content.browser.ContentView;
import org.chromium.content.browser.JavascriptInterface;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;

import com.gismartware.mobile.ActivityCode;
import com.gismartware.mobile.FileUtils;

public class SmartGeoMobilePlugins {
	
	private static final String TAG = "GimapMobilePlugins";

	private Context context;
	private ContentView view;

	public SmartGeoMobilePlugins(Context context, ContentView view) {
		this.context = context;
		this.view = view;
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
	
	@JavascriptInterface
	public void getExtApplicationDirectory() {
		String tmp = context.getExternalFilesDir(null).getParent();
		view.evaluateJavaScript("window.ChromiumCallbacks[13](\"" + tmp + "\");");
	}
	
	@JavascriptInterface
	public void eraseAllTiles() {
		File path = new File(context.getExternalFilesDir(null).getParent() + "/tiles/");
		boolean ret = FileUtils.delete(path);
		if (ret) {
			Log.d(TAG, path.getAbsolutePath() + " deleted!");
		} else {
			Log.d(TAG, "Impossible to delete " + path.getAbsolutePath());
		}
		view.evaluateJavaScript("window.ChromiumCallbacks[12](\"" + ret + "\");");
	}
	
	@JavascriptInterface
	public void writeBase64ToPNG(String base64, String path) {
		byte[] pngAsByte = Base64.decode(base64, 0);
		File filePath = new File(context.getExternalFilesDir(null).getParent() + "/" + path);
        filePath.getParentFile().mkdirs();
        
        boolean result = true;
		try {
			FileOutputStream os = new FileOutputStream(filePath, false);
			os.write(pngAsByte);
	        os.flush();
	        os.close();
		} catch (IOException e) {
			Log.d(TAG, "Error when writing base64 data to " + path, e);
			result = false;
		}
		view.evaluateJavaScript("window.ChromiumCallbacks[10](\"" + result + "\");");
	}
	
	@JavascriptInterface
	public void writeJSON(String json, String path) {
		File filePath = new File(context.getExternalFilesDir(null).getParent() + "/" + path);
        filePath.getParentFile().mkdirs();
        
        boolean result = true;
		try {
			FileOutputStream os = new FileOutputStream(filePath, false);
			os.write(json.getBytes());
	        os.flush();
	        os.close();
		} catch (IOException e) {
			Log.d(TAG, "Error when writing base64 data to " + path, e);
			result = false;
		}
		view.evaluateJavaScript("window.ChromiumCallbacks[11](\"" + result + "\");");
	}
}
