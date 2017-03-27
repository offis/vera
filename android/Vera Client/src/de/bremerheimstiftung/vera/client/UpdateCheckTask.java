package de.bremerheimstiftung.vera.client;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URL;
import java.net.URLConnection;

import android.os.AsyncTask;
import android.util.Log;

/**
 * Class to provide the functionality to check for updates in the background
 *
 * @author mWasmann
 */
class UpdateCheckTask extends AsyncTask<String, String, String> {

	/**
	 *
	 */
	private final VeraFullscreenActivity veraFullscreenActivity;

	/**
	 * @param veraFullscreenActivity
	 */
	UpdateCheckTask(VeraFullscreenActivity veraFullscreenActivity) {
		this.veraFullscreenActivity = veraFullscreenActivity;
	}

	private int version = 0;

	@Override
	protected String doInBackground(String... fileUrl) {
		Log.d("Update", "Checking for updates");
		InputStream input = null;
		BufferedReader reader = null;
		try {
			// create the connection
			URL url = new URL(fileUrl[0]);
			URLConnection connection = url.openConnection();
			connection.connect();

			input = new BufferedInputStream(url.openStream());
			reader = new BufferedReader(new InputStreamReader(input));

			String line;
			while ((line = reader.readLine()) != null) {
				version = Integer.parseInt(line);
			}
		} catch (Exception ex) {
			Log.e("Error: ", ex.getMessage());
		} finally {
			if (reader != null) {
				try {
					reader.close();
				} catch (IOException ioEx) {
					Log.e("Error: ", ioEx.getMessage());
				}
			}
			if (input != null) {
				try {
					input.close();
				} catch (IOException ioEx) {
					Log.e("Error: ", ioEx.getMessage());
				}
			}
		}
		return null;
	}

	/* (non-Javadoc)
	 * @see android.os.AsyncTask#onPostExecute(java.lang.Object)
	 */
	@Override
	protected void onPostExecute(String result) {
		if (version > VeraFullscreenActivity.VERSION) {
			this.veraFullscreenActivity.askForUpdate();
		}
	}
}