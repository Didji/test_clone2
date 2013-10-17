package com.gismartware.smartgeo.mobile;

import java.util.ResourceBundle;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.cordova.Config;
import org.apache.cordova.CordovaActivity;

import android.accounts.Account;
import android.accounts.AccountManager;
import android.accounts.AccountManagerCallback;
import android.accounts.AccountManagerFuture;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.SharedPreferences.Editor;
import android.os.Bundle;

/**
 * <p>Classe de gestion de l'activité correspondant à l'application SmartGeo Mobile.</p>
 * 
 * <p>
 * Celle-ci permet de gérer l'authentification oauth et la gestion des urls de type "gimap://".<br/>
 * Ces Urls sont réécrites pour correspondre au format attendu par l'application cliente, c'est-à-dire :
 * 
 * #/intent/controler?paramètres
 * 
 * <p>Exemple : #/intent/map?report_activity=12&report_mission=13&token=24g524ct4cqe7e</p>
 * 
 * Le token oauth est passé dans le paramètre token s'il existe.
 * </p>
 * 
 * @see <a href="https://github.com/gismartwaredev/smartgeomobile/wiki/Intents">https://github.com/gismartwaredev/smartgeomobile/wiki/Intents</a>
 * @author M. Beudin
 * @since 0.9.2
 */
public class Smartgeo extends CordovaActivity {
	
	private static final ResourceBundle MESSAGES = ResourceBundle.getBundle("com.gismartware.smartgeo.mobile.config");
	
	private static final String INTENT_DEST_URL_PREFIX = MESSAGES.getString("intent.controler.url.prefix");

	/*
	 * Constantes oauth
	 */
	private static final int AUTHORIZATION_CODE = 1993;
	private static final int ACCOUNT_CODE = 1601;
	private static final String KEY_USER = "user";
	private static final String KEY_TOKEN = "token";
	private static final String SCOPE = MESSAGES.getString("auth.scope");
	private static final String GOOGLE_ACCOUNT_TYPE = MESSAGES.getString("auth.google.account.type");
	
	private SharedPreferences preferences;
	
	
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		super.init();
		
		//gestion de l'authentification...
		preferences = this.getSharedPreferences("auth", Context.MODE_PRIVATE);
		if (preferences.getString(KEY_TOKEN, null) == null) {
			Intent intent = AccountManager.newChooseAccountIntent(null, null, new String[] { GOOGLE_ACCOUNT_TYPE }, false, null, null, null, null);
			startActivityForResult(intent, ACCOUNT_CODE);
		}
		
		//url de démarrage?
		String url = Config.getStartUrl(); //url de base de l'appli
		if (getIntent().getData() != null) { //lance depuis un intent ?
			url += getIntentUrl(getIntent());
		}
		super.loadUrl(url);
	}
	
	/**
	 * M�thode de mapping des urls des intents.
	 * 
	 * @param intent l'intent dont on veut mapper l'url
	 * @return l'url cible
	 */
	private String getIntentUrl(Intent intent) {
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
	
	@Override
	protected void onNewIntent(Intent intent) {
		super.loadUrl(getIntentUrl(intent));
		super.onNewIntent(intent);
	}
	
	@Override
	protected void onActivityResult(int requestCode, int resultCode, Intent data) {
		if (resultCode == RESULT_OK) {
			if (requestCode == AUTHORIZATION_CODE) {
				requestToken();
			} else if (requestCode == ACCOUNT_CODE) {
				String accountName = data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
				Editor editor = preferences.edit();
				editor.putString(KEY_USER, accountName);
				editor.commit();
				invalidateToken();
				requestToken();
			}
		}
	}
	
	private void requestToken() {
		AccountManager accountManager = AccountManager.get(this);
		Account userAccount = null;
		String user = preferences.getString(KEY_USER, null);
		for (Account account : accountManager.getAccountsByType(GOOGLE_ACCOUNT_TYPE)) {
			if (account.name.equals(user)) {
				userAccount = account;
				break;
			}
		}
		accountManager.getAuthToken(userAccount, "oauth2:" + SCOPE, null, this, new OnTokenAcquired(), null);
	}
	
	private void invalidateToken() {
		AccountManager accountManager = AccountManager.get(this);
		accountManager.invalidateAuthToken(GOOGLE_ACCOUNT_TYPE, preferences.getString(KEY_TOKEN, null));
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
					startActivityForResult(launch, AUTHORIZATION_CODE);
				} else {
					String token = bundle.getString(AccountManager.KEY_AUTHTOKEN);

					Editor editor = preferences.edit();
					editor.putString(KEY_TOKEN, token);
					editor.commit();
				}
			} catch (Exception e) {
				throw new RuntimeException(e);
			}
		}
	}
}
