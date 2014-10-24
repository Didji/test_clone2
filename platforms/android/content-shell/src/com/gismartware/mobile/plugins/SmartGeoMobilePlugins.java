package com.gismartware.mobile.plugins;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.ResourceBundle;
import java.math.BigInteger;

import org.apache.http.HttpMessage;
import org.apache.http.HttpEntity;
import org.apache.http.Header;
import org.apache.http.HttpResponse;
import org.apache.http.HttpStatus;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.util.EntityUtils;
import org.chromium.content.browser.ContentView;
import org.chromium.content.browser.JavascriptInterface;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Bundle;
import android.os.Environment;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.provider.Settings.Secure;
import android.util.Base64;
import android.util.Log;

import com.gismartware.mobile.ActivityCode;
import com.gismartware.mobile.GimapMobileApplication;
import com.gismartware.mobile.GimapMobileMainActivity;

public class SmartGeoMobilePlugins {

    private static final String TAG = "GimapMobilePlugins";
    private static final String PICTURE_FILE_NAME_PATTERN = "yyyyMMdd_HHmmss";

    /**
     * User agent utilisé pour requêter des tuiles d'OpenStreetMap.
     * 403 si pas de user agent.
     */
    private static final String USER_AGENT = "Smartgeo Mobile";

    private static final int TWO_MINUTES = 1000 * 60 * 2;

    private Context context;
    private ContentView view;
    private LocationListener locationListener ;
    private LocationManager locationManager ;
    private Location lastLocation ;
    private SimpleDateFormat pictureFileNameFormater;

    private static Header[] COOKIES = null;

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
                        + lastLocation.getAccuracy()  + ")};";
                view.evaluateJavaScript(javascriptCode);
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
                Uri.parse(to)).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
        act.startActivity(intent);
    }

    @JavascriptInterface
    public void redirect(String url) {
        Log.d(TAG, "Redirect to URL " + url);
        Intent intent = new Intent(android.content.Intent.ACTION_VIEW,
                Uri.parse(url)).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
        Activity act = (Activity)context;
        act.startActivity(intent);
    }


    @JavascriptInterface
    public void getExtApplicationDirectory() {
        view.evaluateJavaScript("window.ChromiumCallbacks[13](\"" + GimapMobileApplication.EXT_APP_DIR.getPath() + "\");");
    }

    @JavascriptInterface
    public void writeJSON(final String json, final String path) {
    	Runnable runnable = new Runnable() {
    		@Override
    		public void run() {

    			android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_BACKGROUND);

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
    	};
        new Thread(runnable).start();
    }

    @JavascriptInterface
    public void getDeviceId() {
        String name = "Aucun nom trouvé";
        BluetoothAdapter mBluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
        if (mBluetoothAdapter == null) {
            name = "" ;
        } else {
            name = mBluetoothAdapter.getName();
        }
        view.evaluateJavaScript("window.ChromiumCallbacks[666]('" + name + "', '" +
        		Secure.getString(this.context.getContentResolver(), Secure.ANDROID_ID) + "');");
    }

    @JavascriptInterface
    public void vibrate(long ms) {
        Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (v.hasVibrator()) {
            v.vibrate(ms);
        }
    }

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
           file.getParentFile().mkdirs();
           String header = config.getString("logger.header");
           try {
               FileOutputStream os = new FileOutputStream(path, true);
               os.write(header.getBytes());
               os.flush();
               os.close();
           } catch (IOException e) {
               Log.e(TAG, "Error writing '" + header + "' to " + path, e);
           }
       } else {
           Log.d(TAG, path + " exists");
       }
   }

    /** Checks whether two providers are the same */
    private boolean isSameProvider(String provider1, String provider2) {
        if (provider1 == null) {
            return provider2 == null;
        }
        return provider1.equals(provider2);
    }

    @JavascriptInterface
    public void getTileURLFromDB(String url, int z, int x, int y) {
        String xS = String.valueOf(x), yS = String.valueOf(y), zS = String.valueOf(z);
        final int databaseIndex = y % 10;
        SQLiteDatabase tilesDatabase = SQLiteDatabase.openDatabase(
        		GimapMobileApplication.EXT_APP_DIR + "/g3tiles-" + databaseIndex, null, SQLiteDatabase.CREATE_IF_NECESSARY);
        tilesDatabase.execSQL("CREATE TABLE IF NOT EXISTS tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data text);");
        tilesDatabase.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS trinom ON tiles(zoom_level, tile_column, tile_row);");

        Log.d(TAG, "[G3DB] requesting zoom_level = " + z + " AND tile_column = " + x + " AND tile_row = " + y + " on database n°" + databaseIndex);

        Cursor cursor = tilesDatabase.rawQuery("SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?", new String[]{zS, xS, yS});

        if (cursor.getCount() > 0) {
            cursor.moveToFirst();
            String resultJavascript = "window.ChromiumCallbacks['15"
                    +"|" + z
                    +"|" + x
                    +"|" + y
                    +"'](\"data:image/png;base64," + cursor.getString(0) + "\");";
            view.evaluateJavaScript(resultJavascript);
        } else {
            try {
                Log.d(TAG, "[G3DB] NOT FOUND (local) zoom_level = " + z
                    + " AND tile_column = " + x
                    + " AND tile_row = " + y
                    + " on database n°" + databaseIndex);
                new GetTileFromURLAndSetItToDatabase().executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR, url, xS, yS, zS);
            } catch (Exception e){
                Log.e(TAG, "[G3DB] Error while downloading (" + z + ":" + x + ":" + y + ")");
            }
        }
        cursor.close();
        tilesDatabase.close();
    }

    private class GetTileFromURLAndSetItToDatabase extends AsyncTask<String, Void, String> {

        @Override
        protected String doInBackground(String... params) {
            return request(params);
        }

        protected String request(String... params) {
            String url = params[0], x = params[1], y = params[2], z = params[3];

            url = url.replace("{x}", x);
            url = url.replace("{y}", y);
            url = url.replace("{z}", z);

            final HttpGet request = new HttpGet(url);
            DefaultHttpClient client = new DefaultHttpClient();

            //quand on requête OSM, besoin user agent sinon 403
            request.setHeader("User-Agent", USER_AGENT);

            if (COOKIES != null) {
                request.setHeaders(COOKIES);
                for (int i=0; i<COOKIES.length ; i++) {
                    Log.i(TAG, "[G3DB::request] COOKIES["+i+"]->"+COOKIES[i].getName()+"="+COOKIES[i].getValue());
                }
            }
            try {
                HttpResponse  response = client.execute(request);
                final int statusCode = response.getStatusLine().getStatusCode();
                final HttpEntity image = response.getEntity();

                if (statusCode >= 300 ) {
                    Log.e(TAG, "[G3DB] Erreur HTTP " + statusCode);
                    Log.e(TAG, "[G3DB] When calling " + url);
                    return String.valueOf(statusCode);
                } else if (image == null) {
                    Log.i(TAG, "[G3DB] Tuile non trouvée sur le serveur (" + z + ":" + x + ":" + y + ")");
                    return null;
                }

                byte[] bytes = EntityUtils.toByteArray(image);
                Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, baos);

                String imageEncoded = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);

                final int databaseIndex = Integer.parseInt(y) % 10 ;
                final SQLiteDatabase tilesDatabase = SQLiteDatabase.openDatabase(
                		GimapMobileApplication.EXT_APP_DIR + "/g3tiles-" + databaseIndex, null, SQLiteDatabase.CREATE_IF_NECESSARY);

                tilesDatabase.execSQL("INSERT OR IGNORE INTO tiles VALUES (?, ?, ?, ?);", new String[]{z, x, y, imageEncoded});
                tilesDatabase.close();

                return "window.ChromiumCallbacks['15"
                    +"|" + z
                    +"|" + x
                    +"|" + y
                    +"'](\"data:image/png;base64," + imageEncoded + "\");";
            } catch(Exception e) {
                Log.e(TAG, "Error while downloading " + params[0], e);
                request.abort();
                return null;
            }
        }

        @Override
        protected void onPostExecute(String result) {
            view.evaluateJavaScript(result);
        }
    }

    @JavascriptInterface
    public void authenticate(String url, String user, String password, String site) {
        new Authenticate().execute(url, user, password, site);
    }

    private class Authenticate extends AsyncTask<String, Void, Boolean> {

        @Override
        protected Boolean doInBackground(String... params) {
            final DefaultHttpClient client = new DefaultHttpClient();

            StringBuffer url = new StringBuffer(params[0]);
            url.append("&login=").append(params[1]).append("&pwd=").append(params[2]).append("&forcegimaplogin=true");

            HttpPost req = new HttpPost(url.toString());
            try {
                HttpResponse response = client.execute(req);
                if(response.getStatusLine().getStatusCode() == HttpStatus.SC_OK) {
                    //auth OK, on recupere l'identifiant de session
                    COOKIES = response.getHeaders("Set-Cookie");
                    for (int i=0; i<COOKIES.length ; i++) {
                        Log.i(TAG, "[G3DB::Authenticate] COOKIES["+i+"]->"+COOKIES[i].getName()+"="+COOKIES[i].getValue());
                    }
                    //nouvelle requete  effectuer : slection du site
                    url = new StringBuffer(params[0]);
                    url.append("&app=mapcite").append("&site=").append(params[3]).append("&auto_load_map=true");
                    req = new HttpPost(url.toString());
                    response = client.execute(req);
                    if(response.getStatusLine().getStatusCode() == HttpStatus.SC_OK) {
                        Log.d(TAG, "User " + params[1] + " authenticated on " + params[0]);
                        return true;
                    } else {
                        Log.d(TAG, "Site " + params[3] + " unavailable for user " + params[1]);
                        return false;
                    }
                } else {
                    Log.d(TAG, "Bad supplied credentials!");
                    return false;
                }
            } catch (Exception e) {
                Log.d(TAG, "Unable to authenticate user " + params[1] + " on url " + params[0] + " and site " + params[3], e);
            }
            return false;
        }

        @Override
        protected void onPostExecute(Boolean result) {
            view.evaluateJavaScript("window.ChromiumCallbacks[16](\"" + result.booleanValue() + "\");");
        }
    }
}
