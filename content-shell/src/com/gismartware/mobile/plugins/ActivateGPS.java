package com.gismartware.mobile.plugins;

import org.chromium.content_shell.R;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;

public class ActivateGPS extends Activity {

	public void onCreate(Bundle paramBundle) {
        super.onCreate(paramBundle);
        
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
		builder.setMessage(R.string.gps_disabled)
				.setCancelable(false)
				.setPositiveButton(R.string.gps_disabled_opt_yes,
						new DialogInterface.OnClickListener() {
							public void onClick(DialogInterface dialog, int id) {
								startActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS));
							}
						})
				.setNegativeButton(R.string.gps_disabled_opt_no,
						new DialogInterface.OnClickListener() {
							public void onClick(DialogInterface dialog, int id) {
								dialog.cancel();
								
								setResult(Activity.RESULT_CANCELED);
								finish();
							}
						});
		builder.create().show();
    }
}
