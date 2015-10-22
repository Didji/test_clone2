package com.gismartware.mobile;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

/**
 * Created by gulian on 27/11/14.
 */
public class G3dbDatabaseHelper extends SQLiteOpenHelper {

    private static G3dbDatabaseHelper[] mInstances = {null,null,null,null,null,null,null,null,null,null} ;

    public static G3dbDatabaseHelper getInstance(Context ctx, String path, int i) {

        if (mInstances[i] == null) {
            mInstances[i] = new G3dbDatabaseHelper(ctx.getApplicationContext(), path);
        }
        return mInstances[i];
    }

    /**
     * Constructor should be private to prevent direct instantiation.
     * make call to static factory method "getInstance()" instead.
     */
    private G3dbDatabaseHelper(Context ctx, String path) {
        super(ctx, path , null, 1);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {

    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {

    }
}