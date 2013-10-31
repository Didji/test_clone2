package com.gismartware.mobile;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Enumeration;
import java.util.ResourceBundle;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import android.os.Environment;

/**
 * Classe utilitaire pour la phase d'installation de Gimap Mobile sur le terminal, contenant des constantes de chemin et des 
 * fonctions utilitaires.
 * Initialement, l'APK final contient chromium ET gimap mobile, zippé dans le répertoire assets. L'activité
 * principale copie le zip en local du terminal et l'extrait au lancement de l'application dans un répertoire dédié.
 * @author mbeudin
 */
public abstract class Install {
	
	private static final ResourceBundle MESSAGES = ResourceBundle.getBundle("com.gismartware.mobile.config");
	
	/**
	 * Nom du fichier zip des sources de l'application, dans le répertoire assets.
	 */
	public static final String INSTALL_ZIP_FILE = MESSAGES.getString("install.zip.file.name");
	
	/**
	 * Nom du répertoire d'installation des sources.
	 */
	public static final String LOCAL_INSTALL_DIR = MESSAGES.getString("install.dir.name");
	
	/**
	 * Chemin vers la page de lancement de l'application (index.html)
	 */
	public static final String DEFAULT_URL = Environment.getExternalStorageDirectory().toString() + File.separator 
			+ LOCAL_INSTALL_DIR + File.separator + MESSAGES.getString("install.page.default");
	
	
	/**
	 * Copie d'un flux vers un fichier spécifié.
	 * @param is le flux source à dupliquer
	 * @param dest le fichier destination
	 * @throws IOException
	 */
	public static final void copyTo(InputStream is, File dest) throws IOException {
		if (is == null) {
			throw new IllegalArgumentException("InputStream must not be null");
		}
		
		FileOutputStream fos = new FileOutputStream(dest);
		byte[] buf = new byte[1024];
		int len;
		while ((len = is.read(buf)) > 0) {
			fos.write(buf, 0, len);
		}
		if (is != null) {
			is.close();
		}
		if (fos != null) {
			fos.close();
		}
	}
	
	/**
	 * Dézippe un fichier dans un répertoire donné.
	 * @param zip le fichier zip à extraire
	 * @param destDir répertoire destination d'extraction
	 * @throws IOException
	 */
	public static final void unzip(File zip, File destDir) throws IOException {
		if (!zip.exists()) {
			throw new IllegalArgumentException("Zip file " + zip.getAbsolutePath() + " must exist");
		}
		if (!destDir.exists() || !destDir.isDirectory()) {
			throw new IllegalArgumentException(destDir.getAbsolutePath() + " must exist and be a directory");
		}
		
		ZipFile zipFile = new ZipFile(zip);
		Enumeration<?> enu = zipFile.entries();
		while (enu.hasMoreElements()) {
			ZipEntry zipEntry = (ZipEntry) enu.nextElement();

			String name = zipEntry.getName();
			File file = new File(destDir, name);
			if (name.endsWith(File.separator)) {
				file.mkdirs();
				continue;
			}

			File parent = file.getParentFile();
			if (parent != null) {
				parent.mkdirs();
			}

			InputStream is = zipFile.getInputStream(zipEntry);
			FileOutputStream fos = new FileOutputStream(file);
			byte[] bytes = new byte[1024];
			int length;
			while ((length = is.read(bytes)) >= 0) {
				fos.write(bytes, 0, length);
			}
			is.close();
			fos.close();
		}
		zipFile.close();
	}
}
