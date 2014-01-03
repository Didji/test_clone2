// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.chromium.content_shell;

import org.chromium.base.CalledByNative;
import org.chromium.base.JNINamespace;
import org.chromium.content.browser.ContentView;
import org.chromium.content.browser.ContentViewRenderView;
import org.chromium.content.browser.LoadUrlParams;
import org.chromium.ui.WindowAndroid;

import android.content.Context;
import android.text.TextUtils;
import android.util.AttributeSet;
import android.util.Log;
import android.widget.FrameLayout;
import android.widget.LinearLayout;

import com.gismartware.mobile.R;
import com.gismartware.mobile.plugins.SmartGeoMobilePlugins;

/**
 * Container for the various UI components that make up a shell window.
 */
@JNINamespace("content")
public class Shell extends LinearLayout {

    private static final String TAG = "GimapMobile";

    // TODO(jrg): a mContentView.destroy() call is needed, both upstream and downstream.
    private ContentView mContentView;

    private ContentViewRenderView mContentViewRenderView;
    private WindowAndroid mWindow;

    private boolean mLoading = false;

    /**
     * Constructor for inflating via XML.
     */
    public Shell(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    /**
     * Set the SurfaceView being renderered to as soon as it is available.
     */
    public void setContentViewRenderView(ContentViewRenderView contentViewRenderView) {
        FrameLayout contentViewHolder = (FrameLayout) findViewById(R.id.contentview_holder);
        if (contentViewRenderView == null) {
            if (mContentViewRenderView != null) {
                contentViewHolder.removeView(mContentViewRenderView);
            }
        } else {
            contentViewHolder.addView(contentViewRenderView,
                    new FrameLayout.LayoutParams(
                            FrameLayout.LayoutParams.MATCH_PARENT,
                            FrameLayout.LayoutParams.MATCH_PARENT));
        }
        mContentViewRenderView = contentViewRenderView;
    }

    /**
     * @param window The owning window for this shell.
     */
    public void setWindow(WindowAndroid window) {
        mWindow = window;
    }

    /**
     * @return Whether or not the Shell is loading content.
     */
    public boolean isLoading() {
        return mLoading;
    }

    @Override
    protected void onFinishInflate() {
        super.onFinishInflate();
    }

    /**
     * Loads an URL.  This will perform minimal amounts of sanitizing of the URL to attempt to
     * make it valid.
     *
     * @param url The URL to be loaded by the shell.
     */
    public void loadUrl(String url) {
    	Log.d(TAG, "[Shell] Load url=" + url);
        
    	if (url == null) return;

        if (TextUtils.equals(url, mContentView.getUrl())) {
            mContentView.reload();
        } else {
            //mContentView.loadUrl(new LoadUrlParams(sanitizeUrl(url)));
        	mContentView.loadUrl(new LoadUrlParams(url));
        }
        // TODO(aurimas): Remove this when crbug.com/174541 is fixed.
        mContentView.clearFocus();
        mContentView.requestFocus();
    }

    /**
     * Given an URL, this performs minimal sanitizing to ensure it will be valid.
     * @param url The url to be sanitized.
     * @return The sanitized URL.
     */
    public static String sanitizeUrl(String url) {
        if (url == null) return url;
        if (url.startsWith("www.") || url.indexOf(":") == -1) url = "http://" + url;
        Log.d(TAG, "[Shell] Sanitized url=" + url);
        return url;
    }

    @CalledByNative
    private void onUpdateUrl(String url) {}

    @CalledByNative
    private void onLoadProgressChanged(double progress) {}

    @CalledByNative
    private void toggleFullscreenModeForTab(boolean enterFullscreen) {
    }

    @CalledByNative
    private boolean isFullscreenForTabOrPending() {
        return false;
    }

    @CalledByNative
    private void setIsLoading(boolean loading) {
        mLoading = loading;
    }

    /**
     * Initializes the ContentView based on the native tab contents pointer passed in.
     * @param nativeTabContents The pointer to the native tab contents object.
     */
    @CalledByNative
    private void initFromNativeTabContents(int nativeTabContents) {
        mContentView = ContentView.newInstance(getContext(), nativeTabContents, mWindow);
        ((FrameLayout) findViewById(R.id.contentview_holder)).addView(mContentView,
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT));
        mContentView.requestFocus();
        mContentViewRenderView.setCurrentContentView(mContentView);   
        
        //ATTENTION
        //Doit etre ici sinon pas de photo sur un intent quand l appli existe deja... (inexplicable dans l'état actuel de mes connaissances)
        mContentView.getContentViewCore().addJavascriptInterface(new SmartGeoMobilePlugins(super.getContext(), mContentView), "SmartgeoChromium");
    }

    /**
     * @return The {@link ContentView} currently shown by this Shell.
     */
    public ContentView getContentView() {
        return mContentView;
    }
}
