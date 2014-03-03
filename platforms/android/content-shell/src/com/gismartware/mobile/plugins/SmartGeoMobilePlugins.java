 package com.gismartware.mobile.plugins;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.ResourceBundle;

import org.chromium.content.browser.ContentView;
import org.chromium.content.browser.JavascriptInterface;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.widget.Toast;

import com.gismartware.mobile.ActivityCode;
import com.gismartware.mobile.GimapMobileMainActivity;
import com.gismartware.mobile.util.FileUtils;
import com.littlefluffytoys.littlefluffylocationlibrary.LocationInfo;
import com.littlefluffytoys.littlefluffylocationlibrary.LocationLibrary;

 public class SmartGeoMobilePlugins {

	private static final String TAG = "GimapMobilePlugins";
	private static final String PICTURE_FILE_NAME_PATTERN = "yyyyMMdd_HHmmss";

	private Context context;
	private ContentView view;
	private SimpleDateFormat pictureFileNameFormater;

	public SmartGeoMobilePlugins(Context context, ContentView view) {
		this.context = context;
		this.view = view;
		pictureFileNameFormater = new SimpleDateFormat(PICTURE_FILE_NAME_PATTERN);
	}

	@JavascriptInterface
	public void launchCamera(int callbackId) throws IOException {
		Log.d(TAG, "Request camera");
		Activity act = (Activity)context;
		Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
		File photoFile = File.createTempFile(
				pictureFileNameFormater.format(new Date()),
		        ".jpg",
		        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES));
		intent.putExtra(MediaStore.EXTRA_OUTPUT, Uri.fromFile(photoFile));
		((GimapMobileMainActivity)context).setLastPicturePath(photoFile.getAbsolutePath());
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
        LocationLibrary.forceLocationUpdate(context);
        LocationInfo info = new LocationInfo(context);
        info.refresh(context);
        view.evaluateJavaScript("window.ChromiumCallbacks[0](" + info.lastLong + "," +  info.lastLat +");");
        //final LocationInfo locationInfo = new LocationInfo(context) ;
        //Toast.makeText(context, "locate#lat:" + Float.toString(locationInfo.lastLat) + ";lng:" + Float.toString(locationInfo.lastLong), Toast.LENGTH_SHORT).show();
        //view.evaluateJavaScript("window.ChromiumCallbacks[0](" + locationInfo.lastLong + "," +  locationInfo.lastLat +");");
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

    @JavascriptInterface
    public void vibrate(long ms) {
        Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (v.hasVibrator()) {
            v.vibrate(ms);
        }
    }

    @JavascriptInterface
    public void log(String message) {
        ResourceBundle config = ResourceBundle.getBundle("com.gismartware.mobile.config");
        String fileName = config.getString("logger.filename");
        String path = context.getExternalFilesDir(null).getParent() + "/" + fileName ;

        File file = new File(path);
        if(!file.exists()){
            Log.e("gismartware", "" + path + " does not exist");
            file.getParentFile().mkdirs();
            String header = config.getString("logger.header");
            try {
                FileOutputStream os = new FileOutputStream(path, true);
                os.write(header.getBytes());
                os.flush();
                os.close();
            } catch (IOException e) {
                Log.e("gismartware", "Error when writing '"+header+"' to " + path, e);
            }
        } else {
            Log.e("gismartware", "" + path + " does exist");
        }

        File filePath = new File(path);
        filePath.getParentFile().mkdirs();
        try {
            FileOutputStream os = new FileOutputStream(path, true);
            os.write(message.getBytes());
            os.write('\n');
            os.flush();
            os.close();
        } catch (IOException e) {
            Log.e(TAG, "Error when writing '"+message+"' to " + path, e);
        }
    }
}
