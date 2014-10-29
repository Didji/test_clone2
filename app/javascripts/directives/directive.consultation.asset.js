(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .directive('assetConsultation', assetConsultation);

    assetConsultation.$inject = ["$rootScope", "Asset", "Site"];

    function assetConsultation($rootScope, Asset, Site) {

        var directive = {
            link: link,
            templateUrl: 'javascripts/directives/template/consultation.asset.html',
            restrict: 'EA',
            scope: {
                'asset': '=',
                'noButton': '@'
            }
        };
        return directive;

        function link(scope, element) {

            scope.asset = !(scope.asset instanceof Asset) ? new Asset(scope.asset) : scope.asset;

            scope.site = Site.current; //TODO(@gulian): faire mieux.
            scope.rights = $rootScope.rights; //TODO(@gulian): faire mieux.
            scope.missions = $rootScope.missions; //TODO(@gulian): faire mieux.

            scope.addToCurrentSelection = addToCurrentSelection;
            scope.dropFromCurrentSelection = dropFromCurrentSelection;
            scope.openInApp = openInApp;
            scope.$on('$destroy', destroy);


            /**
             * @name addToCurrentSelection
             * @param {Event} event
             */
            function addToCurrentSelection(event) {
                sendAssetToHeaven(event);
                $rootScope.$broadcast("UPDATE_CONSULTATION_MULTISELECTION", scope.asset);
            }

            /**
             * @name dropFromCurrentSelection
             * @desc
             */
            function dropFromCurrentSelection() {
                $rootScope.$broadcast("UPDATE_DROP_CONSULTATION_MULTISELECTION", scope.asset);
            }

            /**
             * @name openInApp
             * @desc
             * @param {String} url
             * @param {Event} event
             */
            function openInApp(url, event) {
                event.preventDefault();
                if (window.SmartgeoChromium && window.SmartgeoChromium.redirect) {
                    SmartgeoChromium.redirect(url);
                } else {
                    window.open(url, '_system');
                }
            }

            /**
             * @name sendAssetToHeaven
             * @desc
             * @param {Event} event
             */
            function sendAssetToHeaven(event) {
                var html = '' + scope.site.metamodel[scope.asset.okey].label + ':' + scope.asset.label + '';
                var x = event.pageX,
                    y = event.pageY;
                var angel = $('<div>').addClass('angel').appendTo(element).html(html).css({
                    position: 'fixed',
                    top: y,
                    left: x - 100
                });
                setTimeout(function () {
                    angel.addClass('ascending');
                }, 1000);
            }

            /**
             * @name destroy
             * @desc
             */
            function destroy() {
                scope.asset.hideFromMap();
            }

        }

    }

})();
