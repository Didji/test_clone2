package com.gismartware.mobile.activities;

import java.util.ResourceBundle;

import org.chromium.base.ChromiumActivity;

import android.os.Bundle;

/**
 * Activité de chargement de l'application, responsable de la vérification de la licence, si besoin du chargement oauth (récupération du jeton).
 * Un splashscreen est affiché pendant ce chargement, et pendant un délai minimal configurable.
 * 
 * @author mbeudin
 */
public class Loader extends ChromiumActivity {
	
	private static final ResourceBundle MESSAGES = ResourceBundle.getBundle("com.gismartware.mobile.config");
	private static final int SPLASH_SCREEN_DELAY_MIN = Integer.valueOf(MESSAGES.getString("splash.screen.delay.min"));
	
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		
		//TODO: splash, et pendant : check licence, recuperation oauth si besoin, update GPS/GSM (?)
	}
	
	@Override
	public void onBackPressed() {
		finish();
	}
}
