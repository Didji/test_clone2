package nl.xservices.plugins;

import android.app.Activity;
import android.content.Intent;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaActivity;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CordovaResourceApi;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.net.Uri;
import android.text.Html;
import android.util.Log;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

import java.io.IOException;
import java.io.StringWriter;
import java.io.Writer;
import java.util.Locale;

public class LaunchMyApp extends CordovaPlugin {

    private static final String ACTION_CHECKINTENT = "checkIntent";
    private static final String ACTION_CLEARINTENT = "clearIntent";
    private static final String ACTION_GETLASTINTENT = "getLastIntent";
    private static final String ACTION_STARTACTIVITY = "startActivity";
    private static final String ACTION_FINISHACTIVITY = "finishActivity";
    private static final String ACTION_PREVACTIVITY = "returnToPreviousActitivy";
    private static final String ACTION_SETACTIVITY = "setActivity";

    private int GI_ACTIVITY;

    private String lastIntentString = null;

    /**
    * We don't want to interfere with other plugins requiring the intent data,
    * but in case of a multi-page app your app may receive the same intent data
    * multiple times, that's why you'll get an option to reset it (null it).
    *
    * Add this to config.xml to enable that behaviour (default false):
    *   <preference name="CustomURLSchemePluginClearsAndroidIntent" value="true"/>
    */
    private boolean resetIntent;

    @Override
    public void initialize(final CordovaInterface cordova, CordovaWebView webView){
    this.resetIntent = preferences.getBoolean("resetIntent", false) ||
        preferences.getBoolean("CustomURLSchemePluginClearsAndroidIntent", false);
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
    if (ACTION_CLEARINTENT.equalsIgnoreCase(action)) {
      final Intent intent = ((CordovaActivity) this.webView.getContext()).getIntent();
      if (resetIntent){
        intent.setData(null);
      }
      return true;
    } else if (ACTION_CHECKINTENT.equalsIgnoreCase(action)) {
      final Intent intent = ((CordovaActivity) this.webView.getContext()).getIntent();
      final String intentString = intent.getDataString();
      if (intentString != null && intent.getScheme() != null) {
        lastIntentString = intentString;
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, intent.getDataString()));
      } else {
        callbackContext.error("App was not started via the launchmyapp URL scheme. Ignoring this errorcallback is the best approach.");
      }
      return true;
    } else if (ACTION_SETACTIVITY.equalsIgnoreCase(action)) {
        GI_ACTIVITY = args.getInt(0);
    } else if (ACTION_PREVACTIVITY.equalsIgnoreCase(action)) {
        returnToPreviousActitivy();
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK));
    } else if (ACTION_GETLASTINTENT.equalsIgnoreCase(action)) {
      if(lastIntentString != null) {
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, lastIntentString));
      } else {
        callbackContext.error("No intent received so far.");
      }
      return true;
    } else if (ACTION_STARTACTIVITY.equalsIgnoreCase(action)) {
      if (args.length() != 1) {
          //return new PluginResult(PluginResult.Status.INVALID_ACTION);
          callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.INVALID_ACTION));
          return false;
      }

      // Parse the arguments
      final CordovaResourceApi resourceApi = webView.getResourceApi();
      JSONObject obj = args.getJSONObject(0);
      String type = obj.has("type") ? obj.getString("type") : null;
      Uri uri = obj.has("url") ? resourceApi.remapUri(Uri.parse(obj.getString("url"))) : null;
      JSONObject extras = obj.has("extras") ? obj.getJSONObject("extras") : null;
      Map<String, String> extrasMap = new HashMap<String, String>();

      // Populate the extras if any exist
      if (extras != null) {
          JSONArray extraNames = extras.names();
          for (int i = 0; i < extraNames.length(); i++) {
              String key = extraNames.getString(i);
              String value = extras.getString(key);
              extrasMap.put(key, value);
          }
      }

      startActivity(obj.getString("action"), uri, type, extrasMap);
      callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK));
      return true;
    } else if (ACTION_FINISHACTIVITY.equalsIgnoreCase(action)) {
      String result = args.getString(0);
      finishActivity(result);
    }else {
      callbackContext.error("This plugin only responds to the " + ACTION_CHECKINTENT + " action.");
      return false;
    }
    return true;
    }

    @Override
    public void onNewIntent(Intent intent) {
        final String intentString = intent.getDataString();
        if (intentString != null && intent.getScheme() != null) {
          if (resetIntent){
            intent.setData(null);
          }
          try {
            StringWriter writer = new StringWriter(intentString.length() * 2);
            escapeJavaStyleString(writer, intentString, true, false);
            webView.loadUrl("javascript:"
                            + "window.handleOpenUrl = function(url){"
                            +     "Smartgeo._onIntent(url);"
                            + "};"
                            + "window.handleOpenUrl('" + writer.toString() + "');");
          } catch (IOException ignore) {
          }
        }
        }

        // Taken from commons StringEscapeUtils
        private static void escapeJavaStyleString(Writer out, String str, boolean escapeSingleQuote,
                                                boolean escapeForwardSlash) throws IOException {
        if (out == null) {
          throw new IllegalArgumentException("The Writer must not be null");
        }
        if (str == null) {
          return;
        }
        int sz;
        sz = str.length();
        for (int i = 0; i < sz; i++) {
          char ch = str.charAt(i);

          // handle unicode
          if (ch > 0xfff) {
            out.write("\\u" + hex(ch));
          } else if (ch > 0xff) {
            out.write("\\u0" + hex(ch));
          } else if (ch > 0x7f) {
            out.write("\\u00" + hex(ch));
          } else if (ch < 32) {
            switch (ch) {
              case '\b':
                out.write('\\');
                out.write('b');
                break;
              case '\n':
                out.write('\\');
                out.write('n');
                break;
              case '\t':
                out.write('\\');
                out.write('t');
                break;
              case '\f':
                out.write('\\');
                out.write('f');
                break;
              case '\r':
                out.write('\\');
                out.write('r');
                break;
              default:
                if (ch > 0xf) {
                  out.write("\\u00" + hex(ch));
                } else {
                  out.write("\\u000" + hex(ch));
                }
                break;
            }
          } else {
            switch (ch) {
              case '\'':
                if (escapeSingleQuote) {
                  out.write('\\');
                }
                out.write('\'');
                break;
              case '"':
                out.write('\\');
                out.write('"');
                break;
              case '\\':
                out.write('\\');
                out.write('\\');
                break;
              case '/':
                if (escapeForwardSlash) {
                  out.write('\\');
                }
                out.write('/');
                break;
              default:
                out.write(ch);
                break;
            }
          }
        }
    }

    private static String hex(char ch) {
    return Integer.toHexString(ch).toUpperCase(Locale.ENGLISH);
    }

    void startActivity(String action, Uri uri, String type, Map<String, String> extras) {
        Intent i = (uri != null ? new Intent(action, uri) : new Intent(action));

        if (type != null && uri != null) {
            i.setDataAndType(uri, type); //Fix the crash problem with android 2.3.6
        } else {
            if (type != null) {
                i.setType(type);
            }
        }

        for (String key : extras.keySet()) {
            String value = extras.get(key);
            // If type is text html, the extra text must sent as HTML
            if (key.equals(Intent.EXTRA_TEXT) && type.equals("text/html")) {
                i.putExtra(key, Html.fromHtml(value));
            } else if (key.equals(Intent.EXTRA_STREAM)) {
                // allowes sharing of images as attachments.
                // value in this case should be a URI of a file
        final CordovaResourceApi resourceApi = webView.getResourceApi();
                i.putExtra(key, resourceApi.remapUri(Uri.parse(value)));
            } else if (key.equals(Intent.EXTRA_EMAIL)) {
                // allows to add the email address of the receiver
                i.putExtra(Intent.EXTRA_EMAIL, new String[] { value });
            } else {
                i.putExtra(key, value);
            }
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        ((CordovaActivity)this.cordova.getActivity()).startActivity(i);
    }

    void finishActivity(String result) {
        Intent intent = new Intent();
        intent.putExtra("report", result);
        ((CordovaActivity)this.cordova.getActivity()).setResult( GI_ACTIVITY, intent );
        ((CordovaActivity)this.cordova.getActivity()).finish();
    }

    void returnToPreviousActitivy() {
        ((CordovaActivity)this.cordova.getActivity()).moveTaskToBack(true);
    }
}
