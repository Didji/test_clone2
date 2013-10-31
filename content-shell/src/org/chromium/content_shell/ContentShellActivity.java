// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium.content_shell;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.ResourceBundle;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.chromium.base.ChromiumActivity;
import org.chromium.base.MemoryPressureListener;
import org.chromium.base.PathUtils;
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
import org.chromium.ui.WindowAndroid;

import android.accounts.Account;
import android.accounts.AccountManager;
import android.accounts.AccountManagerCallback;
import android.accounts.AccountManagerFuture;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.SharedPreferences.Editor;
import android.database.Cursor;
import android.location.Location;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.text.TextUtils;
import android.util.Log;
import android.view.KeyEvent;
import android.widget.Toast;

import com.gismartware.mobile.Activities;
import com.gismartware.mobile.Install;

/**
 * Activity for managing the Content Shell.
 */
public class ContentShellActivity extends ChromiumActivity {
	
	private static final ResourceBundle MESSAGES = ResourceBundle.getBundle("com.gismartware.mobile.config");
	
	private static final String INTENT_DEST_URL_PREFIX = Install.DEFAULT_URL + MESSAGES.getString("intent.controler.url.prefix");

	/*
	 * Constantes oauth
	 */
	private static final String KEY_USER = "user";
	private static final String KEY_TOKEN = "token";
	private static final String SCOPE = MESSAGES.getString("auth.scope");
	private static final String GOOGLE_ACCOUNT_TYPE = MESSAGES.getString("auth.google.account.type");
	
    public static final String COMMAND_LINE_FILE = "/data/local/tmp/content-shell-command-line";
    private static final String[] CMD_OPTIONS = new String[] {"--allow-external-pages", "--allow-file-access", 
    	"--allow-file-access-from-files", "--disable-web-security", "--enable-strict-site-isolation", "--site-per-process", 
    	"--remote-debugging-raw-usb"};
    private static final String TAG = "GimapMobile";

    private static final String ACTIVE_SHELL_URL_KEY = "activeUrl";
    private static final String ACTION_START_TRACE = "org.chromium.content_shell.action.PROFILE_START";
    private static final String ACTION_STOP_TRACE = "org.chromium.content_shell.action.PROFILE_STOP";
    public static final String COMMAND_LINE_ARGS_KEY = "commandLineArgs";
    
    
    /**
     * Sending an intent with this action will simulate a memory pressure signal at a critical
     * level.
     */
    private static final String ACTION_LOW_MEMORY =
            "org.chromium.content_shell.action.ACTION_LOW_MEMORY";

    /**
     * Sending an intent with this action will simulate a memory pressure signal at a moderate
     * level.
     */
    private static final String ACTION_TRIM_MEMORY_MODERATE =
            "org.chromium.content_shell.action.ACTION_TRIM_MEMORY_MODERATE";


    private ShellManager mShellManager;
    private WindowAndroid mWindowAndroid;
    private BroadcastReceiver mReceiver;
    private SharedPreferences preferences;
    
    
    @Override
	public void onDestroy() {
    	//TODO : delete folder new File(Environment.getExternalStorageDirectory().toString() + File.separator + Install.LOCAL_INSTALL_DIR));
    	//impossible to make it work...
    	super.onDestroy();
	}
    
    private void install() {
        File zip = new File(Environment.getExternalStorageDirectory().getPath() + File.separator + Install.INSTALL_ZIP_FILE);
        if(zip.exists()) {
        	zip.delete();
        }
        try {
			InputStream is = this.getAssets().open(Install.INSTALL_ZIP_FILE);
			Install.copyTo(is, zip);
			Install.unzip(zip, new File(Environment.getExternalStorageDirectory().getPath() + File.separator + Install.LOCAL_INSTALL_DIR));
        	Log.i(TAG, "SmartGeo has been successfully installed!");
		} catch (IOException e) {
			Log.e(TAG, "Error while installing... ");
			e.printStackTrace();
			throw new RuntimeException(e);
		} finally {
			zip.delete();
		}
    }
    
    void list(File f) {
    	  if (f.isDirectory()) {
    	    for (File c : f.listFiles())
    	    	list(c);
    	  }
    	  Log.e(TAG, f.getAbsolutePath());
    	}
    
    @Override
    protected void onCreate(final Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        install();
        
        /*Log.i(TAG, "-------------------------------------------------------");
        Log.i(TAG, "files dir="+this.getFilesDir().getAbsolutePath() + " contains " + this.getFilesDir().listFiles().length + " files");
        for(File f : this.getFilesDir().listFiles()) {
        	Log.i(TAG, "File " + f.getAbsolutePath());
        }
        Log.i(TAG, "-------------------------------------------------------");
        File dir = this.getDir(Install.LOCAL_INSTALL_DIR, MODE_PRIVATE);
        Log.i(TAG, "getDir="+ dir.getAbsolutePath() + " contains " + dir.listFiles().length + " files");
        for(File f : dir.listFiles()) {
        	Log.i(TAG, "File " + f.getAbsolutePath());
        }
        Log.i(TAG, "-------------------------------------------------------");
        Log.i(TAG, "cache dir=" + getCacheDir());
        list(getCacheDir());
        Log.i(TAG, "-------------------------------------------------------");
        Log.i(TAG, "PathsUtils data dir="+PathUtils.getDataDirectory(this));
        list(new File(PathUtils.getDataDirectory(this)));
        Log.i(TAG, "-------------------------------------------------------");*/
        
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
            Log.e(TAG, "ContentView initialization failed.", e);
            finish();
            return;
        }

        setContentView(R.layout.content_shell_activity);
        mShellManager = (ShellManager) findViewById(R.id.shell_container);
        mWindowAndroid = new WindowAndroid(this);
        mWindowAndroid.restoreInstanceState(savedInstanceState);
        mShellManager.setWindow(mWindowAndroid);
        
      //gestion de l'authentification...
  		preferences = this.getSharedPreferences("auth", Context.MODE_PRIVATE);
  		if (preferences.getString(KEY_TOKEN, null) == null) {
  			Intent intent = AccountManager.newChooseAccountIntent(null, null, new String[] { GOOGLE_ACCOUNT_TYPE }, false, null, null, null, null);
  			startActivityForResult(intent, Activities.OAUTH_ACCOUNT.getValue());
  		}
  		
        String startupUrl = getIntentUrl(getIntent());
        if (startupUrl != null) {
        	Log.d(TAG, "Load intent url " + startupUrl);
        }
        
        if (!TextUtils.isEmpty(startupUrl)) {
            mShellManager.setStartupUrl(Shell.sanitizeUrl(startupUrl));
        }

        if (CommandLine.getInstance().hasSwitch(CommandLine.DUMP_RENDER_TREE)) {
            if(BrowserStartupController.get(this).startBrowserProcessesSync(BrowserStartupController.MAX_RENDERERS_LIMIT)) {
                finishInitialization(savedInstanceState);
            } else {
                initializationFailed();
            }
        } else {
            BrowserStartupController.get(this).startBrowserProcessesAsync(new BrowserStartupController.StartupCallback() {
                @Override
                public void onSuccess(boolean alreadyStarted) {
                    finishInitialization(savedInstanceState);
                }

                @Override
                public void onFailure() {
                    initializationFailed();
                }
            });
        }
    }

    private void finishInitialization(Bundle savedInstanceState) {
        String shellUrl = mShellManager.getStartupUrl();
        if(shellUrl == null) {
        	shellUrl = ShellManager.DEFAULT_SHELL_URL;
        }
        
        if (savedInstanceState != null && savedInstanceState.containsKey(ACTIVE_SHELL_URL_KEY)) {
            shellUrl = savedInstanceState.getString(ACTIVE_SHELL_URL_KEY);
        }
        mShellManager.launchShell(shellUrl);
        getActiveContentView().setContentViewClient(new ContentViewClient() {
            @Override
            public ContentVideoViewClient getContentVideoViewClient() {
                return new ActivityContentVideoViewClient(ContentShellActivity.this);
            }
        });
    }

    private void initializationFailed() {
        Toast.makeText(ContentShellActivity.this, R.string.browser_process_initialization_failed, Toast.LENGTH_SHORT).show();
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
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (keyCode != KeyEvent.KEYCODE_BACK) {
        	return super.onKeyUp(keyCode, event);
        }

        Shell activeView = getActiveShell();
        if (activeView != null && activeView.getContentView().canGoBack()) {
            activeView.getContentView().goBack();
            return true;
        }

        return super.onKeyUp(keyCode, event);
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
        	url = getIntentUrl(intent);
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
    	Activities act = Activities.getActivitiesFromValue(requestCode);
    	Log.d(TAG, "[onActivityResult] resultCode=" + resultCode + " on requestCode=" + act.name());
    	if (resultCode == RESULT_OK) {
			if (requestCode == Activities.OAUTH_AUTHORIZATION.getValue()) {
				requestToken();
			} else if (requestCode == Activities.OAUTH_ACCOUNT.getValue()) {
				String accountName = intent.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
				Log.d(TAG, "Token renewal for user " + accountName);
				Editor editor = preferences.edit();
				editor.putString(KEY_USER, accountName);
				editor.commit();
				invalidateToken();
				requestToken();
			} else if (requestCode == Activities.CAPTURE_IMAGE.getValue()) {
				String path = getRealPathFromURI(Uri.parse(intent.getData().toString()));
				getActiveShell().getContentView().getContentViewCore().evaluateJavaScript("window.ChromiumCallbacks[1](\"" + path + "\");", null);
			} else if (requestCode == Activities.GEOLOCATE.getValue()) {
				Bundle extras = intent.getExtras();
				Location location = (Location) extras.get("location");
				Log.d(TAG, location.toString());
				getActiveShell().getContentView().getContentViewCore().evaluateJavaScript("window.ChromiumCallbacks[0](" + 
						location.getLongitude() + "," +  location.getLatitude() +", " + location.getAltitude() + ");", null);
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
	 * Méthode de mapping des urls des intents.
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
			//on recupere la query "à la main" (split), cad apres le "?"
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
					
					//un paramètre source peut etre positionné dans plusieurs paramètres cible :
					String[] destParams = MESSAGES.getString(paramName).split(",");
					for (int j = 0; j < destParams.length; j++) {
						url.append(destParams[j]);
						if (composite) {
							url.append(matcher.group(2));
						}
						url.append("=").append(param[1]);
						
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
		String token = preferences.getString(KEY_TOKEN, null);
		if (token != null) {
			if (appendedParams) {
				url.append("&token=");
			} else {
				url.append("?token=");
			}
			url.append(token);
		}
		return url.toString();
	}
	
	private void requestToken() {
		AccountManager accountManager = AccountManager.get(this);
		Account userAccount = null;
		String user = preferences.getString(KEY_USER, null);
		Log.d(TAG, "Request token for user " + user);
		for (Account account : accountManager.getAccountsByType(GOOGLE_ACCOUNT_TYPE)) {
			if (account.name.equals(user)) {
				userAccount = account;
				break;
			}
		}
		accountManager.getAuthToken(userAccount, "oauth2:" + SCOPE, null, this, new OnTokenAcquired(), null);
	}
	
	private void invalidateToken() {
		String token = preferences.getString(KEY_TOKEN, null);
		if( token != null) {
			Log.d(TAG, "Invalidate token " + token);
		}
		AccountManager accountManager = AccountManager.get(this);
		accountManager.invalidateAuthToken(GOOGLE_ACCOUNT_TYPE, token);
		Editor editor = preferences.edit();
		editor.putString(KEY_TOKEN, null);
		editor.commit();
	}
	
	private class OnTokenAcquired implements AccountManagerCallback<Bundle> {
		@Override
		public void run(AccountManagerFuture<Bundle> result) {
			try {
				Bundle bundle = result.getResult();

				Intent launch = (Intent) bundle.get(AccountManager.KEY_INTENT);
				if (launch != null) {
					startActivityForResult(launch, Activities.OAUTH_AUTHORIZATION.getValue());
				} else {
					String token = bundle.getString(AccountManager.KEY_AUTHTOKEN);
					Log.d(TAG, "Token recu : " + token);
					Editor editor = preferences.edit();
					editor.putString(KEY_TOKEN, token);
					editor.commit();
				}
			} catch (Exception e) {
				throw new RuntimeException(e);
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
}
