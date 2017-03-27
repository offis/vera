package de.bremerheimstiftung.vera.client;

import android.app.Activity;
import android.app.ProgressDialog;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.webkit.HttpAuthHandler;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class VeraWebViewClient extends WebViewClient {

	public static final String ERROR_TEXT =
			"<html>" +
		    "<body style='padding: 10%'>" +
		    "<h1>Problem mit der Internet-Verbindung</h1>" +
		    "<h2>Bitte stellen Sie sicher, dass Sie mit einem WLAN verbunden sind.</h2>" +
		    "<h2>M&ouml;glicherweise sind Sie au&szlig;er Reichweite?</h2>" +
		    "<font size='+2'><a href=\"javascript:window.location.replace('" + VeraFullscreenActivity.VERA_URL + "')\">Probieren Sie es erneut</a></font>" +
		    "</body>" +
			"</html>";

	private final Activity activity;

	public VeraWebViewClient(Activity activity) {
		this.activity = activity;
	}

	@Override
	public void onReceivedHttpAuthRequest(WebView view,
			HttpAuthHandler handler, String host, String realm) {
		// FIXME: Not really safe here
		handler.proceed("vera", "vera@bhs");
	}

	@Override
	public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
		if((errorCode == ERROR_CONNECT || errorCode == ERROR_HOST_LOOKUP) &&
				failingUrl.startsWith("http"))
		{
			view.loadData(ERROR_TEXT, "text/html", "UTF-8");
		} else {
			super.onReceivedError(view, errorCode, description, failingUrl);
		}
	}

	@Override
	public boolean shouldOverrideUrlLoading(WebView view, String url) {
		if(url.startsWith("chrome://")) {
			try {
				url = "http://" + url.substring(9);
			    Intent intent = new Intent(Intent.ACTION_VIEW);
		/*	    intent.setComponent(
			    		ComponentName.unflattenFromString(
			    				"com.android.chrome/com.android.chrome.Main"));*/
			    //intent.addCategory("android.intent.category.LAUNCHER");
		    	intent.setData(Uri.parse(url));
			    activity.startActivity(intent);
			    return true;
			}
			catch(ActivityNotFoundException e) {
			    // Chrome is probably not installed
				return false;
			}
		} else if(url.startsWith("neuronation://")) {
			Intent intent = new Intent(Intent.ACTION_VIEW);
			intent.setData(Uri.parse(url));
			activity.startActivity(intent);
			return true;
		} else if(url.endsWith(".mp4")) {
			Intent intent = new Intent(Intent.ACTION_VIEW);
			intent.setDataAndType(Uri.parse(url), "video/mp4");
			activity.startActivity(intent);
			return true;
		} else if(url.endsWith(".pdf")) {
			ProgressDialog progress = new ProgressDialog(view.getContext());
			progress.setTitle("Lade...");
			progress.setMessage("Das Dokument wird geladen. Bitte warten!");
			progress.show();
			DownloadPDFTask task = new DownloadPDFTask(view, progress);
			task.execute(url);
			return true;
		} else {
			return false;
		}
	}
}
