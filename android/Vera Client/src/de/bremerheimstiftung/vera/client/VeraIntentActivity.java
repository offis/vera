package de.bremerheimstiftung.vera.client;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.Window;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

public class VeraIntentActivity extends Activity {
	public static final String LOGIN_URL
	= "http://server.bhs-vera.de:5984/vera_client/_design/html/login.html";

	private final VeraWebViewClient webViewClient = new VeraWebViewClient(this);
	private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setContentView(R.layout.activity_vera_fullscreen);

        this.webView = (WebView)findViewById(R.id.webview);
        this.webView.setWebViewClient(this.webViewClient);
        this.webView.setWebChromeClient(new WebChromeClient() {});

        // disable scroll on touch
       /* view.setOnTouchListener(new View.OnTouchListener() {

          public boolean onTouch(View v, MotionEvent event) {
            return (event.getAction() == MotionEvent.ACTION_MOVE);
          }
        });*/

        WebSettings settings = this.webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setGeolocationEnabled(false);
        settings.setBuiltInZoomControls(false);
        settings.setSupportZoom(false);
    }

    @Override
    public void onStart() {
    	super.onStart();
    	final Intent intent = getIntent();

    	if(intent != null && intent.getData() != null) {
    		Uri uri = intent.getData();
    		if(uri.toString().startsWith("vera://login/neuronation")) {
	    		String uid = uri.getQueryParameter("uid");
	    		this.webView.loadUrl(LOGIN_URL + "?neuronation&uid=" + uid);
	    	} else /*if(uri.toString().startsWith("vera://view/neuronation"))*/ {
	    		this.webView.loadUrl(VeraFullscreenActivity.VERA_URL);
	    	}
    	}
    }
}
