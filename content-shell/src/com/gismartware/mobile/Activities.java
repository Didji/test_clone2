package com.gismartware.mobile;

public enum Activities {
	
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
	
	private int value;
	
	private Activities(int value) {
		this.value = value;
	}
	
	public int getValue() {
		return value;
	}
	
	public static Activities getActivitiesFromValue(int value) {
		for (Activities act : values()) {
			if(act.getValue() == value) {
				return act;
			}
		}
		return null;
	}
}
