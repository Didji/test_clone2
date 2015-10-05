package com.gismartware.mobile;

import java.io.File;
import java.io.FileInputStream;
import java.util.PropertyResourceBundle;
import java.util.ResourceBundle;

import android.content.Context;
import android.os.AsyncTask;
import android.util.Log;
import android.widget.Toast;

class SendEmailTask extends AsyncTask<String, Void, Void> {

    private Exception exception;
    private Context mContext;
    
    public SendEmailTask (Context context){
        mContext = context;
    }
    
    @Override
    protected Void doInBackground(String... strings) {
        ResourceBundle config = null;
        try {
            FileInputStream fis = new FileInputStream(mContext.getExternalFilesDir(null).getParent() + "/" + "config.properties");
            config = new PropertyResourceBundle(fis);
            fis.close();
        } catch(Exception e){
            Log.e("gismartware::MailSender/FileInputStream", e.getMessage(), e);
        }

        Log.i("com.gismartware.smartgeoLogger#GiAlarmService", "SendMail ");
        try {
            MailSender sender = new MailSender(mContext);
            sender.sendMail(config.getString("logger.subject"),
                    "",
                    config.getString("logger.sender"),
                    config.getString("logger.recipient"),
                    mContext.getExternalFilesDir(null).getParent() + "/" + "smartgeo-log.csv");
        } catch (Exception e) {
            this.exception = e;
            MailSender sender = new MailSender(mContext);
            Log.i("com.gismartware.smartgeoLogger#GiAlarmService", "attach " + mContext.getExternalFilesDir(null).getParent() + "/" + "smartgeo-log.csv");

            try {
                sender.sendMail(config.getString("logger.subject"),
                        ResourceBundle.getBundle("com.gismartware.mobile.config").getString("logger.nothing"),
                        config.getString("logger.sender"),
                        config.getString("logger.recipient"), null);
            } catch (Exception e1) {
                e1.printStackTrace();
            }
        }

        File file = new File(mContext.getExternalFilesDir(null).getParent() + "/" + "smartgeo-log.csv");
        file.delete();

        return null;
    }

    protected void onPostExecute() {
       if (this.exception == null) {
           Toast.makeText(mContext, "SendEmailTask#SendEmailTask error", Toast.LENGTH_LONG).show();
           Log.e("com.gismartware.smartgeoLogger#GiAlarmService", "SendMail error");
       } else {
           Toast.makeText(mContext, "SendEmailTask#SendEmailTask success", Toast.LENGTH_LONG).show();
           Log.i("com.gismartware.smartgeoLogger#GiAlarmService", "SendMail success ");
       }
    }
}
