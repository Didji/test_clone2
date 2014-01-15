package com.gismartware.mobile;

import android.content.Context;
import android.os.AsyncTask;
import android.util.Log;
import android.widget.Toast;

import java.util.ResourceBundle;

class SendEmailTask extends AsyncTask<String, Void, Void> {

    private Exception exception;
    private Context mContext;
    public SendEmailTask (Context context){
        mContext = context;
    }
    @Override
    protected Void doInBackground(String... strings) {
        ResourceBundle config = ResourceBundle.getBundle("com.gismartware.mobile.config");

        Log.i("com.gismartware.smartgeoLogger#GiAlarmService", "SendMail ");
        try {
            MailSender sender = new MailSender();
            sender.sendMail(config.getString("logger.subject"),
                    "010213,177348838,1384348,8438349",
                    config.getString("logger.sender"),
                    config.getString("logger.recipient"));
        } catch (Exception e) {
            this.exception = e;
        }
        return null;
    }

    protected void onPostExecute() {
           if(this.exception == null){
               Toast.makeText(mContext, "SendEmailTask#SendEmailTask error", Toast.LENGTH_LONG).show();
               Log.e("com.gismartware.smartgeoLogger#GiAlarmService", "SendMail error");
           } else {
               Toast.makeText(mContext, "SendEmailTask#SendEmailTask success", Toast.LENGTH_LONG).show();
               Log.i("com.gismartware.smartgeoLogger#GiAlarmService", "SendMail success ");
           }
    }

}