package de.bremerheimstiftung.vera.client;

import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.URL;

import android.os.AsyncTask;
import android.util.Log;

class DownloadUpdateTask extends AsyncTask<String, String, Boolean> {

	/**
	 * 
	 */
	private final VeraFullscreenActivity veraFullscreenActivity;

	/**
	 * @param veraFullscreenActivity
	 */
	DownloadUpdateTask(VeraFullscreenActivity veraFullscreenActivity) {
		this.veraFullscreenActivity = veraFullscreenActivity;
	}

	@Override
	protected Boolean doInBackground(String... params) {
		Log.d("Update", "Downloading updated apk");
    	try {
    		URL url = new URL(VeraFullscreenActivity.APK_URL);
    		url.openConnection();

    		InputStream input = url.openStream();
    		FileOutputStream writer = new FileOutputStream(VeraFullscreenActivity.FILE_URL);
    		byte[] buffer = new byte[4096];
    		int bytesRead = 0;
    		while ((bytesRead = input.read(buffer)) > 0) {
    			writer.write(buffer, 0, bytesRead);
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
	protected void onPostExecute(Boolean result) {
		if (result) {
			this.veraFullscreenActivity.installUpdate();
		} else {
			Log.e("Error", "Something went wrong while downloading update");
		}
	}

}