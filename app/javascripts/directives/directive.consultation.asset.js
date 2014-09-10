(function() {

	'use strict';

	angular
		.module('smartgeomobile')
		.directive('assetConsultation', assetConsultation);

	assetConsultation.$inject = ["$rootScope", "G3ME", "Asset"];

	function assetConsultation($rootScope, G3ME, Asset) {

		var directive = {
			link: link,
			templateUrl: 'javascripts/directives/template/consultation.asset.html',
			restrict: 'EA',
			scope: {
				'asset': '=',
				'noButton': '@',
			}
		};
		return directive;

		function link(scope, element, attrs) {
			scope.asset = !(scope.asset instanceof Asset) ? new Asset(scope.asset) : scope.asset ;
			scope.site = $rootScope.site;
			scope.rights = $rootScope.rights;
			scope.addToCurrentSelection = addToCurrentSelection;
			scope.$on('$destroy', destroy);
			function addToCurrentSelection() {
				console.log(scope.asset, 'to current selection from directive');
			}

			function openInApp(url, event) {
				event.preventDefault();
				if (window.SmartgeoChromium && window.SmartgeoChromium.redirect) {
					SmartgeoChromium.redirect(url);
				} else {
					window.open(url, '_system');
				}
			}

			function destroy() {
				scope.asset.hideFromMap();
			}

		}

	}

})();