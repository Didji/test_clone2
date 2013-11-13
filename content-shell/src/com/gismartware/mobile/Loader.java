package com.gismartware.mobile;

import java.util.ResourceBundle;

import org.chromium.base.ChromiumActivity;

import android.accounts.Account;
import android.accounts.AccountManager;
import android.accounts.AccountManagerCallback;
import android.accounts.AccountManagerFuture;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

/**
 * Activité de chargement de l'application, responsable du chargement oauth (récupération du jeton).
 * Un splashscreen est affiché pendant ce chargement, et pendant un délai minimal configurable.
 * 
 * @author mbeudin
 */
public class Loader extends ChromiumActivity {
	
	private static final ResourceBundle MESSAGES 	= ResourceBundle.getBundle("com.gismartware.mobile.config");
	
	private static final String	TAG					= "Loader";
	
	private static final String SCOPE 				= MESSAGES.getString("auth.scope");
	private static final String GOOGLE_ACCOUNT_TYPE = MESSAGES.getString("auth.google.account.type");
	private static final int 	AUTHORIZATION_CODE 	= 1;
	private static final int 	ACCOUNT_CODE 		= 2;
	
	private AuthPreferences authPreferences;
	private AccountManager accountManager;
	
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		
		//TODO: splash
		
		accountManager = AccountManager.get(this);
		authPreferences = new AuthPreferences(this);
		if (authPreferences.getUser() != null && authPreferences.getToken() != null) {
			//launch main activity
			
		} else {
			Log.d(TAG, "[OAUTH] No token, no user, choose account...");
        	//choose account :
        	Intent intent = AccountManager.newChooseAccountIntent(null, null, new String[] { GOOGLE_ACCOUNT_TYPE }, false, null, null, null, null);
  			startActivityForResult(intent, ActivityCode.OAUTH_ACCOUNT.getCode());
		}
	}
	
	@Override
	public void onActivityResult(int requestCode, int resultCode, Intent data) {
		super.onActivityResult(requestCode, resultCode, data);
		if (resultCode == RESULT_OK) {
			if (requestCode == AUTHORIZATION_CODE) {
				requestToken();
			} else if (requestCode == ACCOUNT_CODE) {
				String accountName = data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
				authPreferences.setUser(accountName);
				// invalidate old tokens which might be cached. we want a fresh one, which is guaranteed to work
				invalidateToken();
				requestToken();
			}
		}
	}
	
	private void requestToken() {
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
					String token = bundle.getString(AccountManager.KEY_AUTHTOKEN);
					Log.d(TAG, "[OAUTH] Token received : " + token);
					authPreferences.setToken(token);
				}
			} catch (Exception e) {
				Log.e(TAG, "[OAUTH] Impossible to retreive token!");
				//app will be in local mode
			} finally {
				//TODO: launch main activity (qd fini, fermer splash screen et cette activité)
			}
		}
	}
}
