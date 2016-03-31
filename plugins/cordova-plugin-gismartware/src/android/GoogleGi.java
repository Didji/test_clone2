package com.gismartware.google;

import org.apache.cordova.*;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.R;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.os.Bundle;
import android.os.Environment;
import android.app.Activity;
import android.accounts.Account;
import android.accounts.AccountManager;
import android.accounts.AccountManagerCallback;
import android.accounts.AccountManagerFuture;
import android.accounts.AccountManagerFuture;
import android.accounts.AuthenticatorException;
import android.accounts.OperationCanceledException;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.text.TextUtils;
import android.util.Log;
import android.widget.ArrayAdapter;
import android.widget.Toast;
import android.view.KeyEvent;
import android.view.View;

import java.io.File;
import java.io.FileInputStream;
import java.io.BufferedInputStream;
import java.io.IOException;

import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

public class GoogleGi extends CordovaPlugin {

    private static final String GOOGLE_ACCOUNT_TYPE = "com.google";
    public static final int CHOOSE_ACCOUNT = 103;
    public String user;
    public String mToken;
    private String serverUrl;

    private static final String STATE_DIALOG = "state_dialog";
    private static final String STATE_INVALIDATE = "state_invalidate";
    private static final String SCOPE = "https://www.googleapis.com/auth/userinfo.email";

    private static final String OAUTH_CANCELED_ERROR = "OAUTH_CANCELED_ERROR";
    private static final String OAUTH_LOGIN_ERROR = "OAUTH_LOGIN_ERROR";
    private static final String OAUTH_NETWORK_ERROR = "OAUTH_NETWORK_ERROR";
    private static final String OAUTH_NO_SERVER_ERROR = "OAUTH_NO_SERVER_ERROR";
    private static final String OAUTH_NO_ACCOUNT_ERROR = "OAUTH_NO_ACCOUNT_ERROR";
    private static final String OAUTH_UNKNOWN_ERROR = "OAUTH_UNKNOWN_ERROR";

    private static final String ACTION_PICK = "pick";
    private static final String ACTION_CONNECTED = "isConnected";

    private String TAG = this.getClass().getSimpleName();
    private AccountManager mAccountManager;
    private AlertDialog mAlertDialog;
    private boolean mInvalidate;
    private CallbackContext mainCallback;
    public static Boolean isConnected;

    @Override public boolean execute(String action, final JSONArray args, final CallbackContext callbackContext) throws JSONException {
        if (ACTION_PICK.equalsIgnoreCase(action)) {
            cordova.getActivity().runOnUiThread(new Runnable() {
                public void run() {
                    cordova.getActivity().setContentView(R.layout.activity_list_item);
                    mainCallback = callbackContext;
                    getServerUrlFromConfig();
                    mAccountManager = AccountManager.get(cordova.getActivity());
                    try {
                        showAccountPicker(GOOGLE_ACCOUNT_TYPE, false, args.getString(0), args.getString(1));
                    } catch (JSONException e) {
                        e.printStackTrace();
                        handleError(OAUTH_UNKNOWN_ERROR);
                    }
                }
            });
        } else if (ACTION_CONNECTED.equalsIgnoreCase(action)) {
            if (args.getString(0) == "true") {
                getSetConnected(true);
            } else if (args.getString(0) != "true" && isConnected != true) {
                getSetConnected(false);
            }
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, isConnected));
        }
        return true;
    }

    public synchronized void getSetConnected(Boolean Value){
        isConnected = Value;
    }

    private void getServerUrlFromConfig() {
        try {
            Properties properties = new Properties();
            String state = Environment.getExternalStorageState();
            File[] externalFilesDirs = cordova.getActivity().getExternalFilesDirs(null);
            File externalFilesDir;
            File configFile;
            String configFileName = "app.properties";
            String url;
            BufferedInputStream stream;

            if (Environment.MEDIA_MOUNTED.equals(state)) {
                if (externalFilesDirs.length > 1 && externalFilesDirs[1] != null) {
                    externalFilesDir = externalFilesDirs[1];
                } else {
                    externalFilesDir = externalFilesDirs[0];
                }
                configFile = new File(externalFilesDir, configFileName);
            } else {
                throw new Exception();
            }

            if (configFile.exists()) {
                stream = new BufferedInputStream(new FileInputStream(configFile));
                properties.load(stream);
                stream.close();
                serverUrl = properties.getProperty("server_url").trim();
                if ( serverUrl.length() < 1 ) {
                    throw new Exception();
                }
            } else {
                throw new Exception();
            }
        } catch( Exception e ) {
            e.printStackTrace();
            serverUrl = "";
        }
    }


    /**
     * Show all the accounts registered on the account manager. Request an auth token upon user select.
     * @param authTokenType
     */
    private void showAccountPicker(final String authTokenType, final boolean invalidate, final String title, final String domain) {

        mInvalidate = invalidate;
        final Account allAccounts[] = mAccountManager.getAccountsByType(authTokenType);
        final List<Account> availableAccounts = new ArrayList<Account>();

        for(int i = 0; i < allAccounts.length; i++){
            if(allAccounts[i].name.endsWith(domain)) {
                availableAccounts.add(allAccounts[i]);
            }
        }

        if (availableAccounts.isEmpty()) {
            handleError(OAUTH_NO_ACCOUNT_ERROR);
        } else if (availableAccounts.size() == 1) {
            getExistingAccountAuthToken(availableAccounts.get(0), authTokenType);
        } else {
            String name[] = new String[availableAccounts.size()];
            for (int i = 0; i < availableAccounts.size(); i++) {
                name[i] = availableAccounts.get(i).name;
            }
            AlertDialog.Builder alertDialogBuilder = new AlertDialog.Builder(cordova.getActivity(), AlertDialog.THEME_DEVICE_DEFAULT_DARK);
            ArrayAdapter adapter = new ArrayAdapter<String>(cordova.getActivity().getBaseContext(), android.R.layout.simple_list_item_1, name);
            DialogInterface.OnClickListener clickListener = new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {
                    getExistingAccountAuthToken(availableAccounts.get(which), authTokenType);
                }
            };
            DialogInterface.OnCancelListener cancelListener = new DialogInterface.OnCancelListener() {
                @Override
                public void onCancel(DialogInterface dialog)  {
                    handleError(OAUTH_CANCELED_ERROR);
                }
            };
            alertDialogBuilder.setTitle(title);
            alertDialogBuilder.setAdapter(adapter, clickListener);
            alertDialogBuilder.setOnCancelListener(cancelListener);
            mAlertDialog = alertDialogBuilder.create();
            mAlertDialog.show();
        }
    }

    /**
     * Get the auth token for an existing account on the AccountManager
     * @param account
     * @param authTokenType
     */
    private void getExistingAccountAuthToken(Account account, String authTokenType) {
        final AccountManagerFuture<Bundle> future = mAccountManager.getAuthToken(account, "oauth2:" + SCOPE, null, cordova.getActivity(), null, null);

        new Thread(new Runnable() {
            @Override
            public void run() {
                String error = "";
                try {
                    Bundle bnd = future.getResult();
                    Intent launch = (Intent) bnd.get(AccountManager.KEY_INTENT);
                    String name = bnd.getString(AccountManager.KEY_ACCOUNT_NAME);
                    final String token = bnd.getString(AccountManager.KEY_AUTHTOKEN);
                    mToken = bnd.getString(AccountManager.KEY_AUTHTOKEN);
                    finishActivityInit();
                } catch (IOException e) {
                    e.printStackTrace();
                    error = OAUTH_NETWORK_ERROR; // Authentification impossible
                } catch (AuthenticatorException e) {
                    e.printStackTrace();
                    error = OAUTH_LOGIN_ERROR; // Authentification incorrecte
                } catch (OperationCanceledException e) {
                    e.printStackTrace();
                    error = OAUTH_CANCELED_ERROR; // Authentification annulée
                } finally {
                    if ( error.length() > 0 ) {
                        handleError( error );
                    }
                }
            }
        }).start();
    }

    private void finishActivityInit() {
        final JSONObject result = new JSONObject();
        try {
            result.put("token", mToken);
            result.put("url", serverUrl);
            handleSuccess(result);
        } catch (JSONException e) {
            e.printStackTrace();
            handleError(OAUTH_UNKNOWN_ERROR);
        }
    }

    private void handleSuccess(final JSONObject result) {
        cordova.getActivity().runOnUiThread(new Runnable() {
            public void run() {
                mainCallback.success(result);
                cordova.getActivity().setContentView(getView());
            }
        });
    }

    private void handleError(final String msg) {
        cordova.getActivity().runOnUiThread(new Runnable() {
            public void run() {
                mainCallback.error( msg );
                cordova.getActivity().setContentView(getView());
            }
        });
    }

    private View getView() {
        try {
            return (View)webView.getClass().getMethod("getView").invoke(webView);
        } catch (Exception e) {
            return (View)webView;
        }
    }

    private void showMessage(final String msg) {
        if (TextUtils.isEmpty(msg))
            return;

        cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(cordova.getActivity().getBaseContext(), msg, Toast.LENGTH_SHORT).show();
            }
        });
    }
}
