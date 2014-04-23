// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package com.gismartware.mobile;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.ResourceBundle;

import org.chromium.base.PathUtils;
import org.chromium.content.browser.ResourceExtractor;

import android.app.Application;
import android.content.Context;
import android.os.Environment;
import android.util.Log;

import com.littlefluffytoys.littlefluffylocationlibrary.LocationLibrary;

/**
 * Entry point for the content shell application.  Handles initialization of information that needs
 * to be shared across the main activity and the child services created.
 */
public class GimapMobileApplication extends Application {
	private static final String[] MANDATORY_PAK_FILES = new String[] {"content_shell.pak"};
    private static final String PRIVATE_DATA_DIRECTORY_SUFFIX = "content_shell";
	
	/**
	 * Racine de l'application Web sur le terminal.
	 */
	public static String WEB_ROOT;
	
	/**
	 * Chemin vers la page de lancement de l'application.
	 */
	public static String DEFAULT_URL;
	
	public static File EXT_APP_DIR;
	
	/**
	 * Le contexte de l'application.
	 */
	public static Context context;

	private static final String TAG = "GimapMobileApplication";
	
	private GimapMobileMainActivity mCurrentActivity = null;

    @Override
    public void onCreate() {
        super.onCreate();
        initializeApplicationParameters();
        try {
            LocationLibrary.initialiseLibrary(getBaseContext(), 2000, 2000,"com.gismartware.mobile");
            LocationLibrary.useFineAccuracyForRequests(true);
        } catch (UnsupportedOperationException ex) {
            Log.e(TAG, "The device doesn't have any location providers");
        }

        context = getApplicationContext();
        //specific initialization for gimap mobile web app:
        ResourceBundle config = ResourceBundle.getBundle("com.gismartware.mobile.config");
        WEB_ROOT = getCacheDir().getAbsolutePath() + File.separator + config.getString("application.directory");
		DEFAULT_URL = WEB_ROOT + File.separator + config.getString("application.page.default");
		
		//initialise le chemin vers les tuiles stockées sur la carte SD externe si elle existe, interne sinon
		File extSdCardSlot = new File(getExtSdCard());
		if (extSdCardSlot.canWrite()) { //carte SD "montée" si on peut écrire ou lire dedans..
			Log.d(TAG, "External SD Card detected @ " + extSdCardSlot.getPath() + "...");
			//TODO: gérer plusieurs cartes SD
			EXT_APP_DIR = new File(extSdCardSlot, "Android/data/com.gismartware.mobile/");
			if (!EXT_APP_DIR.exists()) {
				EXT_APP_DIR.mkdirs();
			}
		} else {
			EXT_APP_DIR = context.getExternalFilesDir(null).getParentFile();
			Log.d(TAG, "No external SD Card detected, use internal @ " + EXT_APP_DIR.getPath() + "...");
		}
    }

    public static void initializeApplicationParameters() {
        ResourceExtractor.setMandatoryPaksToExtract(MANDATORY_PAK_FILES);
        PathUtils.setPrivateDataDirectorySuffix(PRIVATE_DATA_DIRECTORY_SUFFIX);
    }
    
    public GimapMobileMainActivity getCurrentActivity( ){
        return mCurrentActivity;
	}
  
    public void setCurrentActivity(GimapMobileMainActivity mCurrentActivity) {
    	this.mCurrentActivity = mCurrentActivity;
    }
    
    private String getExtSdCard() {
    	File file = new File("/system/etc/vold.fstab");
        FileReader fr = null;
        BufferedReader br = null;
        
        String path = null;
        try {
            fr = new FileReader(file);
            if (fr != null) {
                br = new BufferedReader(fr);
                String s = br.readLine();
                while (s != null) {
                    if (s.startsWith("dev_mount")) {
                        String[] tokens = s.split("\\s");                        
                        if (!Environment.getExternalStorageDirectory().getAbsolutePath().equals(tokens[2])) {
                        	path = tokens[2];
                        	break;
                        }
                    }
                    s = br.readLine();
                }
            } 
            if (fr != null) {
                fr.close();
            }            
            if (br != null) {
                br.close();
            }
        } catch (FileNotFoundException e) {
        	Log.e(TAG, e.getMessage(), e);
        } catch (IOException e) {
        	Log.e(TAG, e.getMessage(), e);
        }
        return path;
    }
}
