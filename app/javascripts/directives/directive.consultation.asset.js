(function(){

    'use strict';

	angular
		.module('smartgeomobile')
		.directive('assetConsultation', assetConsultation);

	assetConsultation.$inject = ["$rootScope", "G3ME", "Asset"];

	function assetConsultation ($rootScope, G3ME, Asset) {

		var directive = {
			link: link,
			templateUrl: 'javascripts/directives/template/consultation.asset.html',
			restrict: 'EA',
			scope : { 'asset' : '=' }
		};
		return directive;

		function link(scope, element, attrs) {

			scope.asset  = new Asset(scope.asset);
			scope.site   = $rootScope.site ;
			scope.rights = $rootScope.rights ;

			scope.toggleAsset = toggleAsset ;

			function toggleAsset(){
				scope.asset.open = !scope.asset.open;
		       	scope.asset.toggleMapVisibility() ;
			}

		}

	}

})();
