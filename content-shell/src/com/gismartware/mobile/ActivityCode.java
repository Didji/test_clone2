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
	 * Géolocalisation.
	 */
	GEOLOCATE(101),
	
	/**
	 * Demande d'autorisation oauth.
	 */
	OAUTH_AUTHORIZATION(1993),
	
	/**
	 * Demande de compte oauth.
	 */
	OAUTH_ACCOUNT(1601);
	
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
