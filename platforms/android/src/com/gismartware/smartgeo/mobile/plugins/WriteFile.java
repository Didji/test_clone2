package com.gismartware.smartgeo.mobile.plugins;

import java.io.File;
import java.io.FileOutputStream;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;

import android.os.Environment;
import android.util.Base64;
import android.util.Log;

public class WriteFile extends CordovaPlugin {

	public WriteFile() {
	}

	@Override
	public boolean execute(String action, JSONArray arguments, final CallbackContext callbackContext) throws JSONException {
		try {
			if (action.equals("writeBase64toPNG")) {
				byte[] pngAsByte = Base64.decode(arguments.getString(0), 0);
				File filePath = new File(Environment.getExternalStorageDirectory() + "/" + arguments.getString(1));
				filePath.mkdirs();
				FileOutputStream os = new FileOutputStream(filePath, true);
				os.write(pngAsByte);
				os.flush();
				os.close();
				callbackContext.success();
				return true;
			} else if (action.equals("eraseAll")) {
				deleteRecursive(new File(Environment.getExternalStorageDirectory() + "/tiles/"));
				callbackContext.success();
				return true;
			} else {
				return false;
			}
		} catch (Exception e) {
			Log.e("WriteFilePlugin", e.getMessage());
			return false;
		}
	}

	public void deleteRecursive(File fileOrDirectory) {
		if (fileOrDirectory.isDirectory()) {
			for (File child : fileOrDirectory.listFiles()) {
				deleteRecursive(child);
			}
		}
		fileOrDirectory.delete();
	}
}
