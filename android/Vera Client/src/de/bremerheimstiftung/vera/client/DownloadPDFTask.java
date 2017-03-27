package de.bremerheimstiftung.vera.client;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;

import android.app.ProgressDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Environment;
import android.util.Log;
import android.webkit.WebView;

class DownloadPDFTask extends AsyncTask<String, Integer, Boolean> {

	private final ProgressDialog progress;
	private final WebView view;
	private final String fileUrl = Environment.getExternalStorageDirectory()
			.getAbsolutePath() + "/download/view.pdf";

	DownloadPDFTask(WebView view, ProgressDialog progress) {
		this.progress = progress;
		this.view = view;
	}

	@Override
	protected Boolean doInBackground(String... params) {
		Log.d("PDF", "Downloading PDF");
    	try {
    		File file = new File(fileUrl);
    		URL url = new URL(params[0]);
    		URLConnection conn = url.openConnection();
    		this.progress.setMax(conn.getContentLength());

    		InputStream input = url.openStream();
    		FileOutputStream writer = new FileOutputStream(file);
    		byte[] buffer = new byte[65536];
    		int bytesRead = 0;
    		int overall = 0;
    		while ((bytesRead = input.read(buffer)) > 0) {
    			writer.write(buffer, 0, bytesRead);
    			overall += bytesRead;
    			publishProgress(overall);
    		}
    		writer.close();
    		input.close();
    		return true;
    	} catch (Exception ex) {
    		Log.e("Error: ", (ex.getMessage() != null ? ex.getMessage() : "Exception was null"));
    		return false;
    	}
	}

	@Override
	protected void onProgressUpdate(Integer... progress) {
		this.progress.setProgress(progress[0]);
	}

	@Override
	protected void onPostExecute(Boolean result) {
		if (result) {
			File file = new File(fileUrl);
			Intent intent = new Intent(Intent.ACTION_VIEW);
			intent.setDataAndType(Uri.fromFile(file), "application/pdf");
			intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);

			progress.dismiss();
			view.getContext().startActivity(intent);
		} else {
			Log.e("Error", "Something went wrong while downloading PDF");
		}
	}

}