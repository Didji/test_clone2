// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package com.gismartware.mobile;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.ResourceBundle;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.chromium.base.MemoryPressureListener;
import org.chromium.content.app.LibraryLoader;
import org.chromium.content.browser.ActivityContentVideoViewClient;
import org.chromium.content.browser.BrowserStartupController;
import org.chromium.content.browser.ContentVideoViewClient;
import org.chromium.content.browser.ContentView;
import org.chromium.content.browser.ContentViewClient;
import org.chromium.content.browser.DeviceUtils;
import org.chromium.content.browser.TracingIntentHandler;
import org.chromium.content.common.CommandLine;
import org.chromium.content.common.ProcessInitException;
import org.chromium.content_shell.Shell;
import org.chromium.content_shell.ShellManager;
import org.chromium.ui.WindowAndroid;

import android.accounts.Account;
import android.accounts.AccountManager;
import android.accounts.AccountManagerCallback;
import android.accounts.AccountManagerFuture;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.location.Location;
import android.media.ExifInterface;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Bundle;
import android.provider.MediaStore;
import android.text.TextUtils;
import android.util.Log;
import android.widget.Toast;

import com.gismartware.mobile.util.FileUtils;


/**
 * Activity for managing the Content Shell.
 */
public class GimapMobileMainActivity extends Activity {

	private static final ResourceBundle MESSAGES = ResourceBundle.getBundle("com.gismartware.mobile.config");
	private static final String INSTALL_ZIP_FILE = MESSAGES.getString("install.zip.file");
	private static final String INTENT_DEST_URL_PREFIX = GimapMobileApplication.DEFAULT_URL + MESSAGES.getString("intent.controler.url.prefix");

	/*
	 * Constantes oauth
	 */
	private static final String SCOPE = MESSAGES.getString("auth.scope");
	private static final String GOOGLE_ACCOUNT_TYPE = MESSAGES.getString("auth.google.account.type");
	private static final boolean NEED_OAUTH = Boolean.valueOf(MESSAGES.getString("auth.needed"));
	private static final boolean FILTER_ACCOUNT = Boolean.valueOf(MESSAGES.containsKey("auth.account.domain"));
	private static final String OAUTH_INCLUDE_DOMAIN = MESSAGES.getString("auth.account.domain");

    private static final boolean NEED_LOGGER = Boolean.valueOf(MESSAGES.getString("logger.needed"));
	private AuthPreferences authPreferences;

    public static final String COMMAND_LINE_FILE = "/data/local/tmp/content-shell-command-line";
    private static final String[] CMD_OPTIONS = new String[] {
        "--allow-file-access-from-files", "--disable-web-security", "--no-sandbox"};

    private static final String TAG = "GimapMobile";

    private static final String ACTIVE_SHELL_URL_KEY = "activeUrl";
    private static final String ACTION_START_TRACE = "org.chromium.content_shell.action.PROFILE_START";
    private static final String ACTION_STOP_TRACE = "org.chromium.content_shell.action.PROFILE_STOP";
    public static final String COMMAND_LINE_ARGS_KEY = "commandLineArgs";


    /**
     * Sending an intent with this action will simulate a memory pressure signal at a critical
     * level.
     */
    private static final String ACTION_LOW_MEMORY = "org.chromium.content_shell.action.ACTION_LOW_MEMORY";

    /**
     * Sending an intent with this action will simulate a memory pressure signal at a moderate
     * level.
     */
    private static final String ACTION_TRIM_MEMORY_MODERATE = "org.chromium.content_shell.action.ACTION_TRIM_MEMORY_MODERATE";


    private ShellManager mShellManager;
    private WindowAndroid mWindowAndroid;
    private BroadcastReceiver mReceiver;

    private boolean isConnected;
    private String lastPicturePath;


    @Override
	public void onDestroy() {
    	super.onDestroy();

    	if (networkChangeReceiver != null) {
    		unregisterReceiver(networkChangeReceiver);
    		networkChangeReceiver = null;
    	}
    	//TODO impossible to make deletion work...
    	if(FileUtils.delete(new File(GimapMobileApplication.WEB_ROOT))) {
    		Log.d(TAG, "Smartgeo has been successfully uninstalled!");
    	} else {
    		Log.w(TAG, "Impossible to uninstall Smartgeo.");
    	}
	}

    private void installIfNeeded() {
    	//TODO: check it install needed (find a way)
    	//TODO: delete folder before install?
		File zip = new File(getCacheDir().getAbsolutePath() + File.separator + INSTALL_ZIP_FILE);
        if (zip.exists()) {
        	zip.delete();
        }
        try {
			InputStream is = getAssets().open(INSTALL_ZIP_FILE);
			FileUtils.copyTo(is, zip);
			FileUtils.unzip(zip, new File(GimapMobileApplication.WEB_ROOT));
        	Log.i(TAG, "Smartgeo has been successfully installed!");
		} catch (IOException e) {
			Log.e(TAG, "Error while installing... ");
			e.printStackTrace();
			throw new RuntimeException(e);
		} finally {
			zip.delete();
		}
    }

    @Override
    protected void onCreate(final Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        installIfNeeded();

        // Initializing the command line must occur before loading the library.
        if (!CommandLine.isInitialized()) {
            /*CommandLine.initFromFile(COMMAND_LINE_FILE);
            String[] commandLineParams = getCommandLineParamsFromIntent(getIntent());
            if (commandLineParams != null) {
                CommandLine.getInstance().appendSwitchesAndArguments(commandLineParams);
            }*/
        	CommandLine.initFromFile(COMMAND_LINE_FILE);
        	CommandLine.getInstance().appendSwitchesAndArguments(CMD_OPTIONS);
        }
        waitForDebuggerIfNeeded();

        DeviceUtils.addDeviceSpecificUserAgentSwitch(this);
        try {
            LibraryLoader.ensureInitialized();
        } catch (ProcessInitException e) {
            finish();
            return;
        }

        setContentView(R.layout.content_shell_activity);
        mShellManager = (ShellManager) findViewById(R.id.shell_container);
        mWindowAndroid = new WindowAndroid(this);
        mWindowAndroid.restoreInstanceState(savedInstanceState);
        mShellManager.setWindow(mWindowAndroid);

        //gestion de l'authentification...
        if (NEED_OAUTH) {
        	authPreferences = new AuthPreferences(this);
        	if (authPreferences.getUser() == null || authPreferences.getToken() == null) {
        		oauthRequestAccount();
            } else {
            	if (isTokenValid(authPreferences.getToken())) {
            		Log.d(TAG, "[OAUTH] Using user " + authPreferences.getUser() + " with token " + authPreferences.getToken());
                	finishActivityInit();
            	} else {
            		oauthRequestAccount();
            	}
            }
        } else {
        	finishActivityInit();
        }

        if (NEED_LOGGER) {
        	File logCfg = new File(getExternalFilesDir(null).getParent(), "config.properties");
        	if (logCfg.exists()) {
        		Log.d(TAG, "Fichier de configuration trouvé. Lancement service reporting...");
        		this.startService(new Intent(this, GiAlarmService.class));
        	} else {
        		Log.w(TAG, "Le log est activé mais le fichier de configuration est absent.");
        	}
        }
    }

    private void oauthRequestAccount() {
    	//y a t il un filtrage de compte  effectuer?
    	if (FILTER_ACCOUNT) {
			AccountManager manager = (AccountManager) getSystemService(ACCOUNT_SERVICE);
    		Account[] list = manager.getAccounts();
    		ArrayList<Account> accounts = new ArrayList<Account>();
    		for (Account account : list) {
    			if (account.name.endsWith(OAUTH_INCLUDE_DOMAIN)) {
    				accounts.add(account);
    			}
    		}
    		if (accounts.size() > 1) {
    			//plusieurs comptes, choisir...
    			Intent intent = AccountManager.newChooseAccountIntent(null, accounts, new String[] { GOOGLE_ACCOUNT_TYPE }, false, null, null, null, null);
    			startActivityForResult(intent, ActivityCode.ACCOUNT_CHOOSE.getCode());
    		} else if (accounts.size() == 1) {
    			authPreferences.setUser(accounts.get(0).name);
				requestToken();
    		} else {
    			Intent intent = AccountManager.newChooseAccountIntent(null, null, new String[] { GOOGLE_ACCOUNT_TYPE }, false, null, null, null, null);
    			startActivityForResult(intent, ActivityCode.ACCOUNT_CHOOSE.getCode());
    		}
		} else {
			Intent intent = AccountManager.newChooseAccountIntent(null, null, new String[] { GOOGLE_ACCOUNT_TYPE }, false, null, null, null, null);
			startActivityForResult(intent, ActivityCode.ACCOUNT_CHOOSE.getCode());
		}
    }

    private void finishActivityInit() {
    	String startupUrl = getIntentUrl(getIntent());
        if (startupUrl != null) {
        	Log.d(TAG, "Load intent url " + startupUrl);
        	mShellManager.setStartupUrl("file://" + startupUrl);
        } else {
        	//on ne vient pas d'un intent
        	if (NEED_OAUTH) {
        		StringBuffer url = new StringBuffer(INTENT_DEST_URL_PREFIX);
            	url.append("oauth?token=").append(authPreferences.getToken()).append("&url=").append(MESSAGES.getString("auth.server"));
        		mShellManager.setStartupUrl("file://" + url.toString());
        	}
        }

        ConnectivityManager cm = (ConnectivityManager)this.getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNw = cm.getActiveNetworkInfo ();
        isConnected = (activeNw != null && activeNw.isConnected());
        registerReceiver(networkChangeReceiver, new IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION));

        /*if (!TextUtils.isEmpty(startupUrl)) {
            mShellManager.setStartupUrl(Shell.sanitizeUrl(startupUrl));
        }*/

        if (CommandLine.getInstance().hasSwitch(CommandLine.DUMP_RENDER_TREE)) {
            if(BrowserStartupController.get(this).startBrowserProcessesSync(BrowserStartupController.MAX_RENDERERS_LIMIT)) {
                finishInitialization(/*savedInstanceState*/);
            } else {
                initializationFailed();
            }
        } else {
            BrowserStartupController.get(this).startBrowserProcessesAsync(new BrowserStartupController.StartupCallback() {
                @Override
                public void onSuccess(boolean alreadyStarted) {
                    finishInitialization(/*savedInstanceState*/);
                }

                @Override
                public void onFailure() {
                    initializationFailed();
                }
            });
        }
    }

    private void finishInitialization(/*Bundle savedInstanceState*/) {
        String shellUrl = mShellManager.getStartupUrl();
        if (shellUrl == null) {
        	shellUrl = ShellManager.DEFAULT_SHELL_URL;
        }

        /*if (savedInstanceState != null && savedInstanceState.containsKey(ACTIVE_SHELL_URL_KEY)) {
            shellUrl = savedInstanceState.getString(ACTIVE_SHELL_URL_KEY);
        }*/
        mShellManager.launchShell(shellUrl);
        getActiveContentView().setContentViewClient(new ContentViewClient() {
            @Override
            public ContentVideoViewClient getContentVideoViewClient() {
                return new ActivityContentVideoViewClient(GimapMobileMainActivity.this);
            }
        });
    }

    private void initializationFailed() {
        Toast.makeText(GimapMobileMainActivity.this, R.string.browser_process_initialization_failed, Toast.LENGTH_SHORT).show();
        finish();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        Shell activeShell = getActiveShell();
        if (activeShell != null) {
            outState.putString(ACTIVE_SHELL_URL_KEY, activeShell.getContentView().getUrl());
        }

        mWindowAndroid.saveInstanceState(outState);
    }

    private void waitForDebuggerIfNeeded() {
        if (CommandLine.getInstance().hasSwitch(CommandLine.WAIT_FOR_JAVA_DEBUGGER)) {
            Log.e(TAG, "Waiting for Java debugger to connect...");
            android.os.Debug.waitForDebugger();
            Log.e(TAG, "Java debugger connected. Resuming execution.");
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        if (getCommandLineParamsFromIntent(intent) != null) {
            Log.i(TAG, "Ignoring command line params: can only be set when creating the activity.");
        }

        if (ACTION_LOW_MEMORY.equals(intent.getAction())) {
            MemoryPressureListener.simulateMemoryPressureSignal(TRIM_MEMORY_COMPLETE);
            return;
        } else if (ACTION_TRIM_MEMORY_MODERATE.equals(intent.getAction())) {
            MemoryPressureListener.simulateMemoryPressureSignal(TRIM_MEMORY_MODERATE);
            return;
        }

        String url;
        if (intent.getData() != null) {
        	url = "file://" + getIntentUrl(intent);
        } else {
        	url = getUrlFromIntent(intent);
        }

        if (!TextUtils.isEmpty(url)) {
            Shell activeView = getActiveShell();
            if (activeView != null) {
                activeView.loadUrl(url);
            }
        }
        super.onNewIntent(intent);
    }

    @Override
    protected void onPause() {
        ContentView view = getActiveContentView();
        if (view != null) {
        	view.onActivityPause();
        }

        super.onPause();
        unregisterReceiver(mReceiver);
    }

    @Override
    protected void onResume() {
        super.onResume();

        ContentView view = getActiveContentView();
        if (view != null) view.onActivityResume();
        IntentFilter intentFilter = new IntentFilter(ACTION_START_TRACE);
        intentFilter.addAction(ACTION_STOP_TRACE);
        mReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                String extra = intent.getStringExtra("file");
                if (ACTION_START_TRACE.equals(action)) {
                    if (extra.isEmpty()) {
                        Log.e(TAG, "Can not start tracing without specifing saving location");
                    } else {
                        TracingIntentHandler.beginTracing(extra);
                        Log.i(TAG, "start tracing");
                    }
                } else if (ACTION_STOP_TRACE.equals(action)) {
                    Log.i(TAG, "stop tracing");
                    TracingIntentHandler.endTracing();
                }
            }
        };
        registerReceiver(mReceiver, intentFilter);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent intent) {
    	ActivityCode act = ActivityCode.getActivitiesFromValue(requestCode);
    	if (act != null) {
    		Log.d(TAG, "[onActivityResult] resultCode=" + resultCode + " on requestCode=" + act.name());
    	} else {
    		Log.d(TAG, "[onActivityResult] resultCode=" + resultCode + " on requestCode=" + requestCode);
    	}

    	if (resultCode == RESULT_OK) {
			if (requestCode == ActivityCode.OAUTH_AUTHORIZATION.getCode()) {
				requestToken();
			} else if (requestCode == ActivityCode.ACCOUNT_CHOOSE.getCode()) {
				String accountName = intent.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
				Log.d(TAG, "[OAUTH] Token renewal for user " + accountName);
				authPreferences.setUser(accountName);
				invalidateToken();
				requestToken();
			} else if (requestCode == ActivityCode.CAPTURE_IMAGE.getCode()) {
				try {
                    if (intent != null) {
                        Uri selectedImageUri = intent.getData();
                        Cursor cursor = getContentResolver().query(selectedImageUri, new String[] { android.provider.MediaStore.Images.ImageColumns.DATA }, null, null, null);
                        cursor.moveToFirst();
                        lastPicturePath = cursor.getString(0);
                        cursor.close();
                    }
                    // On retourne la photo si jamais elle n'est pas dans le bon sens.
                    Bitmap bm = BitmapFactory.decodeFile(lastPicturePath);//, options);
                    ExifInterface exif = new ExifInterface(lastPicturePath);
                    String orientString = exif.getAttribute(ExifInterface.TAG_ORIENTATION);
                    int orientation = orientString != null ? Integer.parseInt(orientString) : ExifInterface.ORIENTATION_NORMAL;
                    int rotationAngle = 0;
                    if (orientation == ExifInterface.ORIENTATION_ROTATE_90) rotationAngle = 90;
                    if (orientation == ExifInterface.ORIENTATION_ROTATE_180) rotationAngle = 180;
                    if (orientation == ExifInterface.ORIENTATION_ROTATE_270) rotationAngle = 270;

                    Matrix matrix = new Matrix();
                    final int bmWidth = bm.getWidth();
                    final int bmHeight = bm.getHeight();
                    matrix.setRotate(rotationAngle, (float) bmWidth / 2, (float) bmHeight / 2);
                    Bitmap photo = Bitmap.createBitmap(bm, 0, 0, bmWidth, bmHeight, matrix, true);
					File file = new File(lastPicturePath);
                    OutputStream out = new FileOutputStream(file);
					photo.compress(Bitmap.CompressFormat.JPEG, 100, out);
					out.flush();
					out.close();
					getActiveShell().getContentView().evaluateJavaScript("window.ChromiumCallbacks[1](\"" + file.getAbsolutePath() + "\");");
				} catch (Exception e) {
					Log.e(TAG, "Erreur enregistrement photo");
				}
			} else if (requestCode == ActivityCode.GEOLOCATE.getCode()) {
				Bundle extras = intent.getExtras();
				Location location = (Location) extras.get("location");
				if (location == null) { // pas de position (gps désactivé par ex)
					Log.e(TAG, "Pas de geolocalisation trouvee!");
					getActiveShell().getContentView().evaluateJavaScript("window.ChromiumCallbacks[2]();");
				} else {
					Log.d(TAG, location.toString());
					getActiveShell().getContentView().evaluateJavaScript("window.ChromiumCallbacks[0](" +
							location.getLongitude() + "," +  location.getLatitude() +", " + location.getAltitude() + ");");
				}
			}
		} else {
			if (requestCode == ActivityCode.ACCOUNT_CHOOSE.getCode()) {
				finishActivityInit();
			} else if (requestCode == ActivityCode.CAPTURE_IMAGE.getCode()) {
				getActiveShell().getContentView().evaluateJavaScript("window.ChromiumCallbacks[3]();");
			}
		}

        super.onActivityResult(requestCode, resultCode, intent);
        mWindowAndroid.onActivityResult(requestCode, resultCode, intent);
    }

    private static String getUrlFromIntent(Intent intent) {
        return intent != null ? intent.getDataString() : null;
    }

    private static String[] getCommandLineParamsFromIntent(Intent intent) {
        return intent != null ? intent.getStringArrayExtra(COMMAND_LINE_ARGS_KEY) : null;
    }

    /**
     * @return The {@link ShellManager} configured for the activity or null if it has not been
     *         created yet.
     */
    public ShellManager getShellManager() {
        return mShellManager;
    }

    /**
     * @return The currently visible {@link Shell} or null if one is not showing.
     */
    public Shell getActiveShell() {
        return mShellManager != null ? mShellManager.getActiveShell() : null;
    }

    /**
     * @return The {@link ContentView} owned by the currently visible {@link Shell} or null if one
     *         is not showing.
     */
    public ContentView getActiveContentView() {
        Shell shell = getActiveShell();
        return shell != null ? shell.getContentView() : null;
    }

    /**
	 * Mthode de mapping des urls des intents.
	 *
	 * @param intent l'intent dont on veut mapper l'url
	 * @return l'url cible
	 */
	private String getIntentUrl(Intent intent) {
		if (intent == null || intent.getData() == null) {
			return null;
		}

		StringBuffer url = new StringBuffer(INTENT_DEST_URL_PREFIX);

		//controler en premier..
		url.append(intent.getData().getHost());

		//ATTENTION!! Récupérer dataString sinon des caractères sautent avec getData().getQuery() car les valeurs dans l'URL peuvent
		//contenir des #, ce qui fait partie des "fragments" dans la spec de la classe Uri, et non de la query...
		String[] urlParts = intent.getDataString().split("\\?");

		boolean appendedParams = false;

		if (urlParts.length > 1) {
			//on recupere la query " la main" (split), cad apres le "?"
			//il peut y avoir plusieurs parties (du au url redirect dans les parametres qui peuvent contenir des "?")
			StringBuffer intentUrl = new StringBuffer(urlParts[1]);
			for (int i = 2; i < urlParts.length; i++) {
				intentUrl.append("?").append(urlParts[i]);
			}

			String[] params = intentUrl.toString().split("&");
			if (params != null && params.length > 0) {
				url.append("?");
				appendedParams = true;

				Pattern hook = Pattern.compile(MESSAGES.getString("intent.controler.url.params.composite.regexp"));

				for (int i = 0; i < params.length; i++) {
					String[] param = params[i].split("=");

					String paramName = param[0];

					//Est ce un champ composé? (exemple : fields[###564654###]=250
					boolean composite = false;
					Matcher matcher = hook.matcher(paramName);
					if (matcher.matches()) {
						composite = true;
						paramName = matcher.group(1);
					}

					//un paramétre source peut etre positionné dans plusieurs paramètres cibles :
					String[] destParams = MESSAGES.getString(paramName).split(",");
					for (int j = 0; j < destParams.length; j++) {
						url.append(destParams[j]);
						if (composite) {
							url.append(matcher.group(2));
						}
						url.append("=");
						if (param.length > 1) {
							url.append(param[1]);
						}

						//ajout du "&" si plusieurs paramètres cible pour le paramètre source courant
						if (j < (destParams.length - 1)) {
							url.append("&");
						}
					}

					//ajout du "&" s'il reste des paramètres dans la query principale
					if (i < (params.length - 1)) {
						url.append("&");
					}
				}
			}
		}
		//ajout du token à la fin, rien si inexistant
		if (authPreferences != null && authPreferences.getToken() != null) {
			if (appendedParams) {
				url.append("&token=");
			} else {
				url.append("?token=");
			}
			url.append(authPreferences.getToken());
		}
		return url.toString();
	}

	private void requestToken() {
		AccountManager accountManager = AccountManager.get(this);
		Account userAccount = null;
		String user = authPreferences.getUser();
		Log.d(TAG, "[OAUTH] Request token for user " + user);
		for (Account account : accountManager.getAccountsByType(GOOGLE_ACCOUNT_TYPE)) {
			if (account.name.equals(user)) {
				userAccount = account;
				break;
			}
		}
		accountManager.getAuthToken(userAccount, "oauth2:" + SCOPE, null, this, new OnTokenAcquired(), null);
	}

	private void invalidateToken() {
		String user = authPreferences.getUser();
		if (user != null) {
			Log.d(TAG, "[OAUTH] Invalidate token " + authPreferences.getToken() + " for user " + user);
		} else {
			Log.d(TAG, "[OAUTH] Invalidate token " + authPreferences.getToken());
		}

		AccountManager accountManager = AccountManager.get(this);
		accountManager.invalidateAuthToken(GOOGLE_ACCOUNT_TYPE, authPreferences.getToken());
		authPreferences.setToken(null);
	}

	private class OnTokenAcquired implements AccountManagerCallback<Bundle> {
		@Override
		public void run(AccountManagerFuture<Bundle> result) {
			try {
				Bundle bundle = result.getResult();

				Intent launch = (Intent) bundle.get(AccountManager.KEY_INTENT);
				if (launch != null) {
					startActivityForResult(launch, ActivityCode.OAUTH_AUTHORIZATION.getCode());
				} else {
					String name = bundle.getString(AccountManager.KEY_ACCOUNT_NAME);
					String token = bundle.getString(AccountManager.KEY_AUTHTOKEN);
					Log.d(TAG, "[OAUTH] Token received : " + token + " for user " + name);
					authPreferences.setToken(token);

					finishActivityInit();
				}
			} catch (Exception e) {
				Log.e(TAG, "[OAUTH] Impossible to retreive token!");
                e.printStackTrace();
				finishActivityInit();
			}
		}
	}

	public String getRealPathFromURI(Uri contentUri) {
        String[] proj= { MediaStore.Images.Media.DATA };
        Cursor cursor = this.getContentResolver().query(contentUri,
                        proj, // Which columns to return
                        null, // WHERE clause; which rows to return (all rows)
                        null, // WHERE clause selection arguments (none)
                        null);// Order-by clause (ascending by name)
        int column_index = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA);
        cursor.moveToFirst();

        return cursor.getString(column_index);
	}

	private class IsTokenValidTask extends AsyncTask<String, Void, Boolean> {
		protected Boolean doInBackground(String... token) {
			try {
				URL url = new URL(MESSAGES.getString("auth.specific.url") + token[0]);
				HttpURLConnection con = (HttpURLConnection) url.openConnection();
				int serverCode = con.getResponseCode();

				if (serverCode != 200) { //token plus bon
					return false;
				}
				return true;
			} catch (IOException e) {
				Log.e(TAG, "Erreur de verification de token", e);
				return false;
			}
		}
	}

	private boolean isTokenValid(String token) {
		try {
			return new IsTokenValidTask().execute(token).get();
		} catch (Exception e) {
			return false;
		}
	}


	private BroadcastReceiver networkChangeReceiver = new BroadcastReceiver() {
	    @Override
	    public void onReceive(Context context, Intent intent) {
    		final ConnectivityManager connMgr = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);

			NetworkInfo activeNw = connMgr.getActiveNetworkInfo();

			if ((activeNw != null && activeNw.isConnected()) && !isConnected) {
				isConnected = true;

				if(getActiveShell() != null) {
					getActiveShell().getContentView().evaluateJavaScript("window.ChromiumCallbacks[20]();");
				}
			} else if((activeNw == null || !activeNw.isConnected()) && isConnected) {
				isConnected = false;
				if(getActiveShell() != null) {
					getActiveShell().getContentView().evaluateJavaScript("window.ChromiumCallbacks[21]();");
				}
			}
    	}
	};

	public String getLastPicturePath() {
		return lastPicturePath;
	}

	public void setLastPicturePath(String lastPicturePath) {
		this.lastPicturePath = lastPicturePath;
	}
}
