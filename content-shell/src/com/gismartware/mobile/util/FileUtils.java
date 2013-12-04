package com.gismartware.mobile.util;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Enumeration;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

/**
 * Classe utilitaire sur la gestion de fichiers.
 * @author mbeudin
 */
public abstract class FileUtils {
	
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
	 * @param destDir répertoire destination d'extraction, créé s'il n'existe pas
	 * @throws IOException
	 */
	public static final void unzip(File zip, File destDir) throws IOException {
		if (!zip.exists()) {
			throw new IllegalArgumentException("Zip file " + zip.getAbsolutePath() + " must exist");
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
	
	/**
	 * Supprimer le fichier ou dossier passé en paramètre.
	 * @param file un fichier ou dossier
	 * @return true si suppression OK, false sinon
	 */
	public static boolean delete(File file) {
		if (!file.exists()) {
			return true;
		}
		if (!file.isDirectory()) {
			return file.delete();
		}
		String[] list = file.list();
		for (int i = 0; i < list.length; i++) {
			if (!delete(new File(file, list[i]))) {
				return false;
			}
		}
		return file.delete();
	}
}
