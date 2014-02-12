/*!
 * classie - class helper functions
 * from bonzo https://github.com/ded/bonzo
 *
 * classie.has( elem, 'my-class' ) -> true/false
 * classie.add( elem, 'my-new-class' )
 * classie.remove( elem, 'my-unwanted-class' )
 * classie.toggle( elem, 'my-class' )
 */

/*jshint browser: true, strict: true, undef: true */
/*global define: false */

(function (window) {

    'use strict';

    // class helper functions from bonzo https://github.com/ded/bonzo

    function classReg(className) {
        return new RegExp("(^|\\s+)" + className + "(\\s+|$)");
    }

    // classList support for class management
    // altho to be fair, the api sucks because it won't accept multiple classes at once
    var hasClass, addClass, removeClass;

    if ('classList' in document.documentElement) {
        hasClass = function (elem, c) {
            return elem.classList.contains(c);
        };
        addClass = function (elem, c) {
            elem.classList.add(c);
        };
        removeClass = function (elem, c) {
            elem.classList.remove(c);
        };
    } else {
        hasClass = function (elem, c) {
            return classReg(c).test(elem.className);
        };
        addClass = function (elem, c) {
            if (!hasClass(elem, c)) {
                elem.className = elem.className + ' ' + c;
            }
        };
        removeClass = function (elem, c) {
            elem.className = elem.className.replace(classReg(c), ' ');
        };
    }

    function toggleClass(elem, c) {
        var fn = hasClass(elem, c) ? removeClass : addClass;
        fn(elem, c);
    }

    var classie = {
        // full names
        hasClass: hasClass,
        addClass: addClass,
        removeClass: removeClass,
        toggleClass: toggleClass,
        // short names
        has: hasClass,
        add: addClass,
        remove: removeClass,
        toggle: toggleClass
    };

    // transport
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(classie);
    } else {
        // browser global
        window.classie = classie;
    }

})(window);


/**
 * mlpushmenu.js v1.0.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright 2013, Codrops
 * http://www.codrops.com
 */
;
(function (window) {

    'use strict';

    function extend(a, b) {
        for (var key in b) {
            if (b.hasOwnProperty(key)) {
                a[key] = b[key];
            }
        }
        return a;
    }

    // taken from https://github.com/inuyaksa/jquery.nicescroll/blob/master/jquery.nicescroll.js
    function hasParent(e, id) {
        if (!e) return false;
        var el = e.target || e.srcElement || e || false;
        while (el && el.id != id) {
            el = el.parentNode || false;
        }
        return (el !== false);
    }

    // returns the depth of the element "e" relative to element with id=id
    // for this calculation only parents with classname = waypoint are considered
    function getLevelDepth(e, id, waypoint, cnt) {
        cnt = cnt || 0;
        if (e.id.indexOf(id) >= 0) return cnt;
        if (classie.has(e, waypoint)) {
            ++cnt;
        }
        return e.parentNode && getLevelDepth(e.parentNode, id, waypoint, cnt);
    }

    // returns the closest element to 'e' that has class "classname"
    function closest(e, classname) {
        if (classie.has(e, classname)) {
            return e;
        }
        return e.parentNode && closest(e.parentNode, classname);
    }

    function mlPushMenu(el, trigger, options) {
        this.el = el;
        this.trigger = trigger;
        this.options = extend(this.defaults, options);
        // support 3d transforms
        this.support = true;
        if (this.support) {
            this._init();
        }
    }

    var classie = window.classie;

    mlPushMenu.prototype = {
        defaults: {
            type: 'overlap', // overlap || cover
            levelSpacing: 40,
            backClass: 'mp-back'
        },
        _init: function () {
            var self = this;
            this.open = false;
            this.level = 0;
            this.wrapper = document.getElementById('mp-pusher');
            this.levels = Array.prototype.slice.call(this.el.querySelectorAll('div.mp-level'));
            this.levels.forEach(function (el, i) {
                el.setAttribute('data-level', getLevelDepth(el, self.el.id, 'mp-level'));
            });
            this.menuItems = Array.prototype.slice.call(this.el.querySelectorAll('li'));
            this.levelBack = Array.prototype.slice.call(this.el.querySelectorAll('.' + this.options.backClass));
            this.eventtype = 'click';
            classie.add(this.el, 'mp-' + this.options.type);
            this._initEvents();
        },
        _initEvents: function () {
            var self = this;

            this.menuItems.forEach(function (el, i) {
                var subLevel = el.querySelector('div.mp-level');
                if (subLevel) {
                    el.querySelector('a').addEventListener(self.eventtype, function (ev) {
                        ev.preventDefault();
                        var level = closest(el, 'mp-level').getAttribute('data-level');
                        if (self.level <= level && level*1 > 1) {
                            ev.stopPropagation();
                            self._openMenu(subLevel);
                        }
                    });
                }
            });
            this.levels.forEach(function (el, i) {
                el.addEventListener(self.eventtype, function (ev) {
                    ev.stopPropagation();
                    var level = el.getAttribute('data-level');
                    if (self.level > level) {
                        self.level = level;
                        self._closeMenu();
                    }
                });
            });
        },

        _openMenu: function (subLevel) {
            // increment level depth
            this.menuState = 'opened';
            ++this.level;
            // move the main wrapper
            var levelFactor = (this.level - 1) * this.options.levelSpacing,
                translateVal = this.options.type === 'overlap' ? this.el.offsetWidth + levelFactor : this.el.offsetWidth;

            this._setTransform('translate3d(' + translateVal + 'px,0,0)');
            if (subLevel) {
                var openned = [];
                $('.mp-level').each(function (i) {
                    if ($(this).hasClass('mp-level-open')) {
                        openned.push(i);
                    }
                });
                Smartgeo.set('persitence.menu.open.level', openned);
                // reset transform for sublevel
                this._setTransform('', subLevel);
                // need to reset the translate value for the level menus that have the same level depth and are not open
                for (var i = 0, len = this.levels.length; i < len; ++i) {
                    var levelEl = this.levels[i];
                    if (levelEl != subLevel && !classie.has(levelEl, 'mp-level-open')) {
                        this._setTransform('translate3d(-100%,0,0) translate3d(' + -1 * levelFactor + 'px,0,0)', levelEl);
                    }
                }
            }
            // add class mp-pushed to main wrapper if opening the first time
            if (this.level === 1) {
                classie.add(this.wrapper, 'mp-pushed');
                this.open = true;
            }
            // add class mp-level-open to the opening level element
            classie.add(subLevel || this.levels[0], 'mp-level-open');
        },
        // close the menu
        _resetMenu: function () {
            this.menuState = 'closed';
            this._setTransform('translate3d(0,0,0)');
            this.level = 0;
            // remove class mp-pushed from main wrapper
            classie.remove(this.wrapper, 'mp-pushed');
            // this._toggleLevels();
            this.open = false;

        },
        // close sub menus
        _closeMenu: function () {
            var translateVal = this.options.type === 'overlap' ? this.el.offsetWidth + (this.level - 1) * this.options.levelSpacing : this.el.offsetWidth;
            this._setTransform('translate3d(' + translateVal + 'px,0,0)');
            this._toggleLevels();
            this._setTransform('translate3d(0,0,0)', document.getElementById('trigger'));

        },
        // translate the el
        _setTransform: function (val, el) {
            el = el || this.wrapper;
            el.style.WebkitTransform = val;
            el.style.MozTransform = val;
            el.style.transform = val;
        },
        // removes classes mp-level-open from closing levels
        _toggleLevels: function () {
            for (var i = 0, len = this.levels.length; i < len; ++i) {
                var levelEl = this.levels[i];
                if (levelEl.getAttribute('data-level') >= this.level + 1) {
                    classie.remove(levelEl, 'mp-level-open');
                }
            }
        }
    }

    // add to global namespace
    window.mlPushMenu = mlPushMenu;

})(window);
