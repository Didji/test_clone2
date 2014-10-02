(function() {

	'use strict';

	angular
		.module('smartgeomobile')
		.directive('assetConsultation', assetConsultation);

	assetConsultation.$inject = ["$rootScope", "G3ME", "Asset", "$timeout"];

	function assetConsultation($rootScope, G3ME, Asset, $timeout) {

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

			scope.site = window.SMARTGEO_CURRENT_SITE;			//TODO(@gulian): faire mieux.
			scope.rights = $rootScope.rights;		//TODO(@gulian): faire mieux.
			scope.missions = $rootScope.missions;	//TODO(@gulian): faire mieux.

			scope.addToCurrentSelection = addToCurrentSelection;
			scope.dropFromCurrentSelection = dropFromCurrentSelection;
			scope.$on('$destroy', destroy);

			function addToCurrentSelection(event) {
				sendAssetToHeaven(event);
			$rootScope.$broadcast("UPDATE_CONSULTATION_MULTISELECTION", scope.asset);
			}

			function dropFromCurrentSelection() {
				$rootScope.$broadcast("UPDATE_DROP_CONSULTATION_MULTISELECTION", scope.asset);
			}

			function openInApp(url, event) {
				event.preventDefault();
				if (window.SmartgeoChromium && window.SmartgeoChromium.redirect) {
					SmartgeoChromium.redirect(url);
				} else {
					window.open(url, '_system');
				}
			}

			function sendAssetToHeaven(event){
				var html = ''+scope.site.metamodel[scope.asset.okey].label +':'+ scope.asset.label+'';
				var x=event.pageX, y=event.pageY;
				var angel = $('<div>').addClass('angel').appendTo(element).html(html).css({
					position: 'fixed',
					top: y, left: x - 100
				});
				$timeout(function(){
					angel.addClass('ascending');
				}, 1000)
			}

			function destroy() {
				scope.asset.hideFromMap();
			}

		}

	}

})();