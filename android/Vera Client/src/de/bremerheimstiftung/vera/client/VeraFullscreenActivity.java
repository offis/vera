package de.bremerheimstiftung.vera.client;


import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.util.Log;
import android.view.KeyEvent;
import android.view.Window;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;


@SuppressLint("SetJavaScriptEnabled")
public class VeraFullscreenActivity extends Activity {

	public static final String VERA_URL
		= "http://server.bhs-vera.de:5984/vera_client/_design/html/index.html";

	private static final String VERSION_URL = "http://www.bhs-vera.de/vera.apk.version";
	static final String APK_URL = "http://www.bhs-vera.de/vera.apk";
	private static final String FILE_NAME = "vera.apk";
	static final String FILE_URL = Environment
			.getExternalStorageDirectory().getAbsolutePath()
			+ "/download/"
			+ FILE_NAME;

	public static final int VERSION = 11;

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
        settings.setGeolocationEnabled(true);
        settings.setBuiltInZoomControls(true);
        settings.setSupportZoom(true);

        this.webView.loadUrl(VERA_URL);

        final UpdateCheckTask updateTask = new UpdateCheckTask(this);
        updateTask.execute(VERSION_URL);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Check if the key event was the Back button and if there's history
        if ((keyCode == KeyEvent.KEYCODE_BACK) && this.webView.canGoBack()) {
        	webView.goBack();
            return true;
        }
        // If it wasn't the Back key or there's no web page history, bubble up to the default
        // system behavior (probably exit the activity)
        return super.onKeyDown(keyCode, event);
    }

    void askForUpdate() {
    	Log.d("Update", "Showing update dialog");
    	AlertDialog.Builder builder = new AlertDialog.Builder(this);
		builder.setMessage(R.string.dialog_update_ask)
				.setPositiveButton(R.string.dialog_update_yes,
						new DialogInterface.OnClickListener() {
							@Override
							public void onClick(DialogInterface dialog, int id) {
								final DownloadUpdateTask task = new DownloadUpdateTask(VeraFullscreenActivity.this);
								task.execute(APK_URL);
							}
						})
				.setNegativeButton(R.string.dialog_update_no,
						new DialogInterface.OnClickListener() {
							@Override
							public void onClick(DialogInterface dialog, int id) {
								// nop
							}
						});
		builder.create().show();
	}

    void installUpdate() {
    	Log.d("Update", "Installing update");
		Intent intent = new Intent(Intent.ACTION_VIEW);
		intent.setDataAndType(Uri.parse("file://" + FILE_URL),
				"application/vnd.android.package-archive");
		startActivity(intent);
    }
}
