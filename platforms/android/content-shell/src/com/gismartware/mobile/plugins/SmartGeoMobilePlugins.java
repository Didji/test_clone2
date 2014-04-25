package com.gismartware.mobile.plugins;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.ResourceBundle;

import org.chromium.content.browser.ContentView;
import org.chromium.content.browser.JavascriptInterface;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;

import com.gismartware.mobile.ActivityCode;
import com.gismartware.mobile.GimapMobileApplication;
import com.gismartware.mobile.GimapMobileMainActivity;
import com.gismartware.mobile.util.FileUtils;

public class SmartGeoMobilePlugins {

    private static final String TAG = "GimapMobilePlugins";
    private static final String PICTURE_FILE_NAME_PATTERN = "yyyyMMdd_HHmmss";
    private static final String TILE_DIRECTORY_NAME = "tiles";

    private Context context;
    private ContentView view;
    private LocationListener locationListener ;
    private LocationManager locationManager ;
    private Location lastLocation ;
    private SimpleDateFormat pictureFileNameFormater;

    @SuppressLint("SimpleDateFormat")
	public SmartGeoMobilePlugins(Context mContext, ContentView mView) {
        this.context = mContext;

        this.view = mView;

        this.pictureFileNameFormater = new SimpleDateFormat(PICTURE_FILE_NAME_PATTERN);

        this.lastLocation = null ;

        this.locationListener = new LocationListener() {

            public void onLocationChanged(Location location) {
                if (!isBetterLocation(location, lastLocation)) {
                    return ;
                }
                lastLocation = location;
                String javascriptCode = "if(window.ChromiumCallbacks[0]){window.ChromiumCallbacks[0]("
                        + lastLocation.getLongitude() + ","
                        + lastLocation.getLatitude()  + ","
                        + lastLocation.getAltitude()  + ","
                        + lastLocation.getAccuracy()  + ")" +
                        "};";
                view.evaluateJavaScript(javascriptCode);
                Log.d(TAG, javascriptCode);
            }
            public void onStatusChanged(String provider, int status, Bundle extras) {}
            public void onProviderEnabled(String provider) {}
            public void onProviderDisabled(String provider) {}
        };

    }

    @JavascriptInterface
    public void startWatchingPosition() {

        this.locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);

        if (this.locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            this.locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 0, 0, this.locationListener);
        }
        if (this.locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
            this.locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 0, 0, this.locationListener);
        }
    }

    @JavascriptInterface
    public void stopWatchingPosition() {
        if (this.locationManager != null && this.locationListener != null) {
            this.locationManager.removeUpdates(this.locationListener);
        }
        this.locationManager = null;
        this.lastLocation = null;
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
        Intent intent = new Intent(android.content.Intent.ACTION_VIEW, 
        		Uri.parse(to)).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK|Intent.FLAG_ACTIVITY_NEW_TASK);
        act.startActivity(intent);
    }

    @JavascriptInterface
    public void redirect(String url) {
        Log.d(TAG, "Redirect to URL " + url);
        Intent intent = new Intent(android.content.Intent.ACTION_VIEW,  
        		Uri.parse(url)).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK|Intent.FLAG_ACTIVITY_NEW_TASK);
        Activity act = (Activity)context;
        act.startActivity(intent);
    }


    @JavascriptInterface
    public void getExtApplicationDirectory() {
        view.evaluateJavaScript("window.ChromiumCallbacks[13](\"" + GimapMobileApplication.EXT_APP_DIR.getPath() + "\");");
    }

    @JavascriptInterface
    public void eraseAllTiles() {
        File path = new File(GimapMobileApplication.EXT_APP_DIR, TILE_DIRECTORY_NAME);
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
        File filePath = new File(GimapMobileApplication.EXT_APP_DIR, path);
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
        File filePath = new File(GimapMobileApplication.EXT_APP_DIR, path);
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

    private static final int TWO_MINUTES = 1000 * 60 * 2;

    /** Determines whether one Location reading is better than the current Location fix
     * @param location  The new Location that you want to evaluate
     * @param currentBestLocation  The current Location fix, to which you want to compare the new one
     */
    protected boolean isBetterLocation(Location location, Location currentBestLocation) {
        if (currentBestLocation == null) {
            // A new location is always better than no location
            return true;
        }

        // Check whether the new location fix is newer or older
        long timeDelta = location.getTime() - currentBestLocation.getTime();
        boolean isSignificantlyNewer = timeDelta > TWO_MINUTES;
        boolean isSignificantlyOlder = timeDelta < -TWO_MINUTES;
        boolean isNewer = timeDelta > 0;

        // If it's been more than two minutes since the current location, use the new location
        // because the user has likely moved
        if (isSignificantlyNewer) {
            return true;
            // If the new location is more than two minutes older, it must be worse
        } else if (isSignificantlyOlder) {
            return false;
        }

        // Check whether the new location fix is more or less accurate
        int accuracyDelta = (int) (location.getAccuracy() - currentBestLocation.getAccuracy());
        boolean isLessAccurate = accuracyDelta > 0;
        boolean isMoreAccurate = accuracyDelta < 0;
        boolean isSignificantlyLessAccurate = accuracyDelta > 200;

        // Check if the old and new location are from the same provider
        boolean isFromSameProvider = isSameProvider(location.getProvider(),
                currentBestLocation.getProvider());

        // Determine location quality using a combination of timeliness and accuracy
        if (isMoreAccurate) {
            return true;
        } else if (isNewer && !isLessAccurate) {
            return true;
        } else if (isNewer && !isSignificantlyLessAccurate && isFromSameProvider) {
            return true;
        }
        return false;
    }

   @JavascriptInterface
   public void log(String message) {
       ResourceBundle config = ResourceBundle.getBundle("com.gismartware.mobile.config");
       String fileName = config.getString("logger.filename");
       String path = GimapMobileApplication.EXT_APP_DIR.getPath() + "/" + fileName ;
       File file = new File(path);
       if (!file.exists()) {
           Log.e(TAG, path + " does not exist");
           file.getParentFile().mkdirs();
           String header = config.getString("logger.header");
           try {
               FileOutputStream os = new FileOutputStream(path, true);
               os.write(header.getBytes());
               os.flush();
               os.close();
           } catch (IOException e) {
               Log.e(TAG, "Error when writing '" + header + "' to " + path, e);
           }
       } else {
           Log.e(TAG, path + " does exist");
       }
   }

    /** Checks whether two providers are the same */
    private boolean isSameProvider(String provider1, String provider2) {
        if (provider1 == null) {
            return provider2 == null;
        }
        return provider1.equals(provider2);
    }

}
