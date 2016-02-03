package com.gismartware.google;

import org.apache.cordova.*;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.R;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.os.Bundle;
import android.app.Activity;
import android.accounts.Account;
import android.accounts.AccountManager;
import android.accounts.AccountManagerCallback;
import android.accounts.AccountManagerFuture;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.text.TextUtils;
import android.util.Log;
import android.widget.ArrayAdapter;
import android.widget.Toast;


import java.util.ArrayList;
import java.util.List;

public class GoogleGi extends CordovaPlugin {

    private static final String GOOGLE_ACCOUNT_TYPE = "com.google";
    public static final int CHOOSE_ACCOUNT = 103;
    public String user;
    public String mToken;

    public static final String DEFAULT_URL = "file:///android_asset/www/index.html";
    private static final String INTENT_DEST_URL_PREFIX = DEFAULT_URL + "#/intent/";
    private static final String STATE_DIALOG = "state_dialog";
    private static final String STATE_INVALIDATE = "state_invalidate";
    private static final String SCOPE = "https://www.googleapis.com/auth/userinfo.email";
    private static final String SERVER = "canopee.m-ve.com";

    private String TAG = this.getClass().getSimpleName();
    private AccountManager mAccountManager;
    private AlertDialog mAlertDialog;
    private boolean mInvalidate;

    @Override public boolean execute(String action, JSONArray args, final CallbackContext callbackContext) throws JSONException {
        cordova.getActivity().runOnUiThread(new Runnable() {
            public void run() {
                cordova.getActivity().setContentView(R.layout.activity_list_item);
                mAccountManager = AccountManager.get(cordova.getActivity());
                showAccountPicker(GOOGLE_ACCOUNT_TYPE, false);
                callbackContext.success();
            }
        });
        return true;
    }

    /**
     * Show all the accounts registered on the account manager. Request an auth token upon user select.
     * @param authTokenType
     */
    private void showAccountPicker(final String authTokenType, final boolean invalidate) {
        mInvalidate = invalidate;
        final Account availableAccounts[] = mAccountManager.getAccountsByType(authTokenType);

        if (availableAccounts.length == 0) {
            Toast.makeText(cordova.getActivity(), "No accounts", Toast.LENGTH_SHORT).show();
        } else {
            String name[] = new String[availableAccounts.length];
            for (int i = 0; i < availableAccounts.length; i++) {
                name[i] = availableAccounts[i].name;
            }

            // Account picker
            mAlertDialog = new AlertDialog.Builder(cordova.getActivity()).setTitle("Pick Account").setAdapter(new ArrayAdapter<String>(cordova.getActivity().getBaseContext(), android.R.layout.simple_list_item_1, name), new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {
                    getExistingAccountAuthToken(availableAccounts[which], authTokenType);
                }
            }).create();
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
                try {
                    Bundle bnd = future.getResult();

                    Intent launch = (Intent) bnd.get(AccountManager.KEY_INTENT);
                    String name = bnd.getString(AccountManager.KEY_ACCOUNT_NAME);
                    final String token = bnd.getString(AccountManager.KEY_AUTHTOKEN);
                    mToken = bnd.getString(AccountManager.KEY_AUTHTOKEN);

                    showMessage((token != null) ? "SUCCESS!\ntoken: " + token : "FAIL");
                    Log.d("GoogleGi", "GetToken Bundle is " + bnd);
                    finishActivityInit();
                } catch (Exception e) {
                    e.printStackTrace();
                    showMessage(e.getMessage());
                }
            }
        }).start();
    }

    private void finishActivityInit() {
        StringBuffer url = new StringBuffer(INTENT_DEST_URL_PREFIX);
        Log.d("GoogleGi", "url: " + url);
        url.append("oauth?token=").append(mToken).append("&url=").append(SERVER);
        final String redirect = url.toString();
        Log.d("GoogleGi", "url avec token: " + url);
        cordova.getActivity().runOnUiThread(new Runnable() {
            public void run() {
                // webView.loadUrl(getView());
                showMessage(redirect);
                webView.loadUrl(DEFAULT_URL);
            }
        });
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
