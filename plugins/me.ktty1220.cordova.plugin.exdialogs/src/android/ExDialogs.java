package me.ktty1220.cordova.plugin.exdialogs;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import android.util.Log;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.AlertDialog.Builder;
import android.app.ProgressDialog;
import android.widget.EditText;
import android.view.Gravity;
import android.content.DialogInterface;
import java.util.ArrayList;
import android.widget.Toast;

public class ExDialogs extends CordovaPlugin {
  public JSONObject retVals = new JSONObject();
  public ProgressDialog spinnerDialog = null;
  public ProgressDialog progressDialog = null;

  @Override
  public boolean execute(String action, JSONArray args, final CallbackContext callbackContext) throws JSONException {
    if (action.startsWith("select")) {
      return showSelectDialog(action, args, callbackContext);
    }

    final Activity act = cordova.getActivity();
    final ExDialogs notification = this;

    if ("toast".equals(action)) {
      String message = args.getString(0);
      Toast.makeText(act, message, Toast.LENGTH_SHORT).show();
      return true;
    } else if ("textArea".equals(action)) {
      String message = args.getString(0);
      String title = args.getString(1);
      int line = args.getInt(2);

      final EditText editView = new EditText(act);
      editView.setSingleLine(false);
      editView.setLines(line);
      editView.setGravity(Gravity.LEFT | Gravity.TOP);

      new AlertDialog.Builder(act)
        .setTitle(title)
        .setMessage(message)
        .setView(editView)
        .setPositiveButton("OK", new DialogInterface.OnClickListener() {
          public void onClick(DialogInterface dialog, int which) {
            callbackContext.success(editView.getText().toString());
          }
        })
        .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
          public void onClick(DialogInterface dialog, int whichButton) {
          }
        }).show();
      return true;
    } else if ("progressStart".equals(action)) {
      final String message = args.getString(0);
      final String title = args.getString(1);
      final int max = args.getInt(2);

      if (progressDialog != null) {
        progressDialog.dismiss();
        progressDialog = null;
      }

      act.runOnUiThread(new Runnable() {
        public int cancel = 0;
        public void run() {
          notification.progressDialog = new ProgressDialog(act);
          notification.progressDialog.setProgressStyle(ProgressDialog.STYLE_HORIZONTAL);
          notification.progressDialog.setTitle(title);
          notification.progressDialog.setMessage(message);
          notification.progressDialog.setCancelable(true);
          notification.progressDialog.setMax(max);
          notification.progressDialog.setProgress(0);
          notification.progressDialog.setOnCancelListener(
            new DialogInterface.OnCancelListener() {
              public void onCancel(DialogInterface dialog) {
                Log.d("CordovaProgress", "cancel");
                cancel = 1;
              }
            }
          );
          notification.progressDialog.setOnDismissListener (
            new DialogInterface.OnDismissListener() {
              public void onDismiss(DialogInterface dialog) {
                Log.d("CordovaProgress", "dismiss");
                notification.progressDialog = null;
                callbackContext.success(cancel);
              }
            }
          );
          notification.progressDialog.show();
        }
      });
      return true;
    } else if ("progressValue".equals(action)) {
      if (progressDialog != null) {
        final int value = args.getInt(0);
        final String message = args.getString(1);
        act.runOnUiThread(new Runnable() {
          public void run() {
            progressDialog.setProgress(value);
            if (message != null) {
              notification.progressDialog.setMessage(message);
            }
          }
        });
      }
      callbackContext.success();
      return true;
    } else if ("progressStop".equals(action)) {
      if (progressDialog != null) {
        progressDialog.dismiss();
        progressDialog = null;
      }
      callbackContext.success();
      return true;
    }
    return false;
  }

  public boolean showSelectDialog(String action, JSONArray args, final CallbackContext callbackContext) throws JSONException { 
    JSONArray itemArray = args.getJSONArray(0);
    final String title = args.getString(1);
    final String icon = args.getString(2);
    final int init = args.getInt(3);
    JSONArray initArray = args.getJSONArray(4);

    final CharSequence[] items = new CharSequence[itemArray.length()];
    for (int i = 0; i < itemArray.length(); i++) {
      items[i] = itemArray.getString(i);
    }

    final boolean[] initBools = new boolean[initArray.length()];
    for (int i = 0; i < initArray.length(); i++) {
      initBools[i] = initArray.getBoolean(i);
      retVals.put(Integer.toString(i), initBools[i]);
    }

    final Activity act = cordova.getActivity();
    final AlertDialog.Builder dialog = new AlertDialog.Builder(act);
    if (! "".equals(title)) {
      dialog.setTitle(title);
    }
    if (! "".equals(icon)) {
      dialog.setIcon(act.getResources().getIdentifier(icon, "drawable", "android"));
    }

    if ("selectPlain".equals(action)) {
      act.runOnUiThread(new Runnable() {
        public void run() {
          dialog.setItems(items, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int which) {
              callbackContext.success(which);
            }
          })
          .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int whichButton) {
            }
          });
          dialog.show();
        }
      });
      return true;
    } else if ("selectSingle".equals(action)) {
      act.runOnUiThread(new Runnable() {
        public void run() {
          dialog.setSingleChoiceItems(items, init, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int which) {
              callbackContext.success(which);
              dialog.cancel();
            }
          })
          .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int whichButton) {
            }
          });
          dialog.show();
        }
      });
      return true;
    } else if ("selectMulti".equals(action)) {
      act.runOnUiThread(new Runnable() {
        public void run() {
          dialog.setMultiChoiceItems(items, initBools, new DialogInterface.OnMultiChoiceClickListener() {
            public void onClick(DialogInterface dialog, int which, boolean isChecked) {
              try {
                retVals.put(Integer.toString(which), isChecked);
              } catch (Exception e) {
                Log.e("CordovaSelectDialog", "Exception occurred: ".concat(e.getMessage()));
              }
            }
          })
          .setPositiveButton("OK", new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int whichButton) {
              callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, retVals));
            }
          })
          .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int whichButton) {
            }
          });
          dialog.show();
        }
      });
      return true;
    }
    return false;
  }
}
