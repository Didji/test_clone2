package com.gismartware.mobile;

/**
 * Liste des activités utilisées dans l'application avec leurs codes respectifs.
 * @author mbeudin
 */
public enum ActivityCode {
	
	/**
	 * Prise de photo. 
	 */
	CAPTURE_IMAGE(100),
	
	/**
	 * G�olocalisation.
	 */
	GEOLOCATE(101),
	
	/**
	 * Demande d'autorisation oauth.
	 */
	OAUTH_AUTHORIZATION(102),
	
	/**
	 * Demande de choix d'un compte du terminal.
	 */
	ACCOUNT_CHOOSE(103);
	
	private int code;
	
	private ActivityCode(int code) {
		this.code = code;
	}
	
	public int getCode() {
		return code;
	}
	
	public static ActivityCode getActivitiesFromValue(int code) {
		for (ActivityCode act : values()) {
			if(act.getCode() == code) {
				return act;
			}
		}
		return null;
	}
}