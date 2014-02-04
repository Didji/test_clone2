/**
 * AngularStrap - Twitter Bootstrap directives for AngularJS
 * @version v0.7.5 - 2013-07-21
 * @link http://mgcrea.github.com/angular-strap
 * @author Olivier Louvignes <olivier@mg-crea.com>
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
angular.module("$strap.config", []).value("$strapConfig", {}), angular.module("$strap.filters", ["$strap.config"]), angular.module("$strap.directives", ["$strap.config"]), angular.module("$strap", ["$strap.filters", "$strap.directives", "$strap.config"]), angular.module("$strap.directives").directive("bsAlert", ["$parse", "$timeout", "$compile",
    function (t, e, n) {
        return {
            restrict: "A",
            link: function (a, i, o) {
                var r = t(o.bsAlert),
                    s = (r.assign, r(a)),
                    l = function (t) {
                        e(function () {
                            i.alert("close")
                        }, 1 * t)
                    };
                o.bsAlert ? a.$watch(o.bsAlert, function (t, e) {
                    s = t, i.html((t.title ? "<strong>" + t.title + "</strong>&nbsp;" : "") + t.content || ""), t.closed && i.hide(), n(i.contents())(a), (t.type || e.type) && (e.type && i.removeClass("alert-" + e.type), t.type && i.addClass("alert-" + t.type)), angular.isDefined(t.closeAfter) ? l(t.closeAfter) : o.closeAfter && l(o.closeAfter), (angular.isUndefined(o.closeButton) || "0" !== o.closeButton && "false" !== o.closeButton) && i.prepend('<button type="button" class="close" data-dismiss="alert">&times;</button>')
                }, !0) : ((angular.isUndefined(o.closeButton) || "0" !== o.closeButton && "false" !== o.closeButton) && i.prepend('<button type="button" class="close" data-dismiss="alert">&times;</button>'), o.closeAfter && l(o.closeAfter)), i.addClass("alert").alert(), i.hasClass("fade") && (i.removeClass("in"), setTimeout(function () {
                    i.addClass("in")
                }));
                var u = o.ngRepeat && o.ngRepeat.split(" in ").pop();
                i.on("close", function (t) {
                    var e;
                    u ? (t.preventDefault(), i.removeClass("in"), e = function () {
                        i.trigger("closed"), a.$parent && a.$parent.$apply(function () {
                            for (var t = u.split("."), e = a.$parent, n = 0; t.length > n; ++n) e && (e = e[t[n]]);
                            e && e.splice(a.$index, 1)
                        })
                    }, $.support.transition && i.hasClass("fade") ? i.on($.support.transition.end, e) : e()) : s && (t.preventDefault(), i.removeClass("in"), e = function () {
                        i.trigger("closed"), a.$apply(function () {
                            s.closed = !0
                        })
                    }, $.support.transition && i.hasClass("fade") ? i.on($.support.transition.end, e) : e())
                })
            }
        }
    }
]), angular.module("$strap.directives").directive("bsButton", ["$parse", "$timeout",
    function (t) {
        return {
            restrict: "A",
            require: "?ngModel",
            link: function (e, n, a, i) {
                if (i) {
                    n.parent('[data-toggle="buttons-checkbox"], [data-toggle="buttons-radio"]').length || n.attr("data-toggle", "button");
                    var o = !! e.$eval(a.ngModel);
                    o && n.addClass("active"), e.$watch(a.ngModel, function (t, e) {
                        var a = !! t,
                            i = !! e;
                        a !== i ? $.fn.button.Constructor.prototype.toggle.call(r) : a && !o && n.addClass("active")
                    })
                }
                n.hasClass("btn") || n.on("click.button.data-api", function () {
                    n.button("toggle")
                }), n.button();
                var r = n.data("button");
                r.toggle = function () {
                    if (!i) return $.fn.button.Constructor.prototype.toggle.call(this);
                    var a = n.parent('[data-toggle="buttons-radio"]');
                    a.length ? (n.siblings("[ng-model]").each(function (n, a) {
                        t($(a).attr("ng-model")).assign(e, !1)
                    }), e.$digest(), i.$modelValue || (i.$setViewValue(!i.$modelValue), e.$digest())) : e.$apply(function () {
                        i.$setViewValue(!i.$modelValue)
                    })
                }
            }
        }
    }
]).directive("bsButtonsCheckbox", ["$parse",
    function () {
        return {
            restrict: "A",
            require: "?ngModel",
            compile: function (t) {
                t.attr("data-toggle", "buttons-checkbox").find("a, button").each(function (t, e) {
                    $(e).attr("bs-button", "")
                })
            }
        }
    }
]).directive("bsButtonsRadio", ["$timeout",
    function (t) {
        return {
            restrict: "A",
            require: "?ngModel",
            compile: function (e, n) {
                return e.attr("data-toggle", "buttons-radio"), n.ngModel || e.find("a, button").each(function (t, e) {
                    $(e).attr("bs-button", "")
                }),
                function (e, n, a, i) {
                    i && (t(function () {
                        n.find("[value]").button().filter('[value="' + i.$viewValue + '"]').addClass("active")
                    }), n.on("click.button.data-api", function (t) {
                        e.$apply(function () {
                            i.$setViewValue($(t.target).closest("button").attr("value"))
                        })
                    }), e.$watch(a.ngModel, function (t, i) {
                        if (t !== i) {
                            var o = n.find('[value="' + e.$eval(a.ngModel) + '"]');
                            o.length && o.button("toggle")
                        }
                    }))
                }
            }
        }
    }
]), angular.module("$strap.directives").directive("bsButtonSelect", ["$parse", "$timeout",
    function (t) {
        return {
            restrict: "A",
            require: "?ngModel",
            link: function (e, n, a, i) {
                var o = t(a.bsButtonSelect);
                o.assign, i && (n.text(e.$eval(a.ngModel)), e.$watch(a.ngModel, function (t) {
                    n.text(t)
                }));
                var r, s, l, u;
                n.bind("click", function () {
                    r = o(e), s = i ? e.$eval(a.ngModel) : n.text(), l = r.indexOf(s), u = l > r.length - 2 ? r[0] : r[l + 1], e.$apply(function () {
                        n.text(u), i && i.$setViewValue(u)
                    })
                })
            }
        }
    }
]), angular.module("$strap.directives").directive("bsDatepicker", ["$timeout", "$strapConfig",
    function (t, e) {
        var n = /(iP(a|o)d|iPhone)/g.test(navigator.userAgent),
            a = function a(t) {
                return t = t || "en", {
                    "/": "[\\/]",
                    "-": "[-]",
                    ".": "[.]",
                    " ": "[\\s]",
                    dd: "(?:(?:[0-2]?[0-9]{1})|(?:[3][01]{1}))",
                    d: "(?:(?:[0-2]?[0-9]{1})|(?:[3][01]{1}))",
                    mm: "(?:[0]?[1-9]|[1][012])",
                    m: "(?:[0]?[1-9]|[1][012])",
                    DD: "(?:" + $.fn.datepicker.dates[t].days.join("|") + ")",
                    D: "(?:" + $.fn.datepicker.dates[t].daysShort.join("|") + ")",
                    MM: "(?:" + $.fn.datepicker.dates[t].months.join("|") + ")",
                    M: "(?:" + $.fn.datepicker.dates[t].monthsShort.join("|") + ")",
                    yyyy: "(?:(?:[1]{1}[0-9]{1}[0-9]{1}[0-9]{1})|(?:[2]{1}[0-9]{3}))(?![[0-9]])",
                    yy: "(?:(?:[0-9]{1}[0-9]{1}))(?![[0-9]])"
                }
            }, i = function i(t, e) {
                var n, i = t,
                    o = a(e);
                return n = 0, angular.forEach(o, function (t, e) {
                    i = i.split(e).join("${" + n + "}"), n++
                }), n = 0, angular.forEach(o, function (t) {
                    i = i.split("${" + n + "}").join(t), n++
                }), RegExp("^" + i + "$", ["i"])
            };
        return {
            restrict: "A",
            require: "?ngModel",
            link: function (t, a, o, r) {
                var s = angular.extend({
                    autoclose: !0
                }, e.datepicker || {}),
                    l = o.dateType || s.type || "date";
                angular.forEach(["format", "weekStart", "calendarWeeks", "startDate", "endDate", "daysOfWeekDisabled", "autoclose", "startView", "minViewMode", "todayBtn", "todayHighlight", "keyboardNavigation", "language", "forceParse"], function (t) {
                    angular.isDefined(o[t]) && (s[t] = o[t])
                });
                var u = s.language || "en",
                    c = o.dateFormat || s.format || $.fn.datepicker.dates[u] && $.fn.datepicker.dates[u].format || "mm/dd/yyyy",
                    d = n ? "yyyy-mm-dd" : c,
                    p = i(d, u);
                r && (r.$formatters.unshift(function (t) {
                    return "date" === l && angular.isString(t) && t ? $.fn.datepicker.DPGlobal.parseDate(t, $.fn.datepicker.DPGlobal.parseFormat(c), u) : t
                }), r.$parsers.unshift(function (t) {
                    return t ? "date" === l && angular.isDate(t) ? (r.$setValidity("date", !0), t) : angular.isString(t) && p.test(t) ? (r.$setValidity("date", !0), n ? new Date(t) : "string" === l ? t : $.fn.datepicker.DPGlobal.parseDate(t, $.fn.datepicker.DPGlobal.parseFormat(d), u)) : (r.$setValidity("date", !1), void 0) : (r.$setValidity("date", !0), null)
                }), r.$render = function () {
                    if (n) {
                        var t = r.$viewValue ? $.fn.datepicker.DPGlobal.formatDate(r.$viewValue, $.fn.datepicker.DPGlobal.parseFormat(d), u) : "";
                        return a.val(t), t
                    }
                    return r.$viewValue || a.val(""), a.datepicker("update", r.$viewValue)
                }), n ? a.prop("type", "date").css("-webkit-appearance", "textfield") : (r && a.on("changeDate", function (e) {
                    t.$apply(function () {
                        r.$setViewValue("string" === l ? a.val() : e.date)
                    })
                }), a.datepicker(angular.extend(s, {
                    format: d,
                    language: u
                })), t.$on("$destroy", function () {
                    var t = a.data("datepicker");
                    t && (t.picker.remove(), a.data("datepicker", null))
                }), o.$observe("startDate", function (t) {
                    a.datepicker("setStartDate", t)
                }), o.$observe("endDate", function (t) {
                    a.datepicker("setEndDate", t)
                }));
                var f = a.siblings('[data-toggle="datepicker"]');
                f.length && f.on("click", function () {
                    a.prop("disabled") || a.trigger("focus")
                })
            }
        }
    }
]), angular.module("$strap.directives").directive("bsDropdown", ["$parse", "$compile", "$timeout",
    function (t, e, n) {
        var a = function (t, e) {
            return e || (e = ['<ul class="dropdown-menu" role="menu" aria-labelledby="drop1">', "</ul>"]), angular.forEach(t, function (t, n) {
                if (t.divider) return e.splice(n + 1, 0, '<li class="divider"></li>');
                var i = "<li" + (t.submenu && t.submenu.length ? ' class="dropdown-submenu"' : "") + ">" + '<a tabindex="-1" ng-href="' + (t.href || "") + '"' + (t.click ? '" ng-click="' + t.click + '"' : "") + (t.target ? '" target="' + t.target + '"' : "") + (t.method ? '" data-method="' + t.method + '"' : "") + ">" + (t.text || "") + "</a>";
                t.submenu && t.submenu.length && (i += a(t.submenu).join("\n")), i += "</li>", e.splice(n + 1, 0, i)
            }), e
        };
        return {
            restrict: "EA",
            scope: !0,
            link: function (i, o, r) {
                var s = t(r.bsDropdown),
                    l = s(i);
                n(function () {
                    !angular.isArray(l);
                    var t = angular.element(a(l).join(""));
                    t.insertAfter(o), e(o.next("ul.dropdown-menu"))(i)
                }), o.addClass("dropdown-toggle").attr("data-toggle", "dropdown")
            }
        }
    }
]), angular.module("$strap.directives").factory("$modal", ["$rootScope", "$compile", "$http", "$timeout", "$q", "$templateCache", "$strapConfig",
    function (t, e, n, a, i, o, r) {
        var s = function s(s) {
            function l(s) {
                var l = angular.extend({
                    show: !0
                }, r.modal, s),
                    u = l.scope ? l.scope : t.$new(),
                    c = l.template;
                return i.when(o.get(c) || n.get(c, {
                    cache: !0
                }).then(function (t) {
                    return t.data
                })).then(function (t) {
                    var n = c.replace(".html", "").replace(/[\/|\.|:]/g, "-") + "-" + u.$id,
                        i = $('<div class="modal hide" tabindex="-1"></div>').attr("id", n).addClass("fade").html(t);
                    return l.modalClass && i.addClass(l.modalClass), $("body").append(i), a(function () {
                        e(i)(u)
                    }), u.$modal = function (t) {
                        i.modal(t)
                    }, angular.forEach(["show", "hide"], function (t) {
                        u[t] = function () {
                            i.modal(t)
                        }
                    }), u.dismiss = u.hide, angular.forEach(["show", "shown", "hide", "hidden"], function (t) {
                        i.on(t, function (e) {
                            u.$emit("modal-" + t, e)
                        })
                    }), i.on("shown", function () {
                        $("input[autofocus], textarea[autofocus]", i).first().trigger("focus")
                    }), i.on("hidden", function () {
                        l.persist || u.$destroy()
                    }), u.$on("$destroy", function () {
                        i.remove()
                    }), i.modal(l), i
                })
            }
            return new l(s)
        };
        return s
    }
]).directive("bsModal", ["$q", "$modal",
    function (t, e) {
        return {
            restrict: "A",
            scope: !0,
            link: function (n, a, i) {
                var o = {
                    template: n.$eval(i.bsModal),
                    persist: !0,
                    show: !1,
                    scope: n
                };
                angular.forEach(["modalClass", "backdrop", "keyboard"], function (t) {
                    angular.isDefined(i[t]) && (o[t] = i[t])
                }), t.when(e(o)).then(function (t) {
                    a.attr("data-target", "#" + t.attr("id")).attr("data-toggle", "modal")
                })
            }
        }
    }
]), angular.module("$strap.directives").directive("bsNavbar", ["$location",
    function (t) {
        return {
            restrict: "A",
            link: function (e, n) {
                e.$watch(function () {
                    return t.path()
                }, function (t) {
                    $("li[data-match-route]", n).each(function (e, n) {
                        var a = angular.element(n),
                            i = a.attr("data-match-route"),
                            o = RegExp("^" + i + "$", ["i"]);
                        o.test(t) ? a.addClass("active").find(".collapse.in").collapse("hide") : a.removeClass("active")
                    })
                })
            }
        }
    }
]), angular.module("$strap.directives").directive("bsPopover", ["$parse", "$compile", "$http", "$timeout", "$q", "$templateCache",
    function (t, e, n, a, i, o) {
        return $("body").on("keyup", function (t) {
            27 === t.keyCode && $(".popover.in").each(function () {
                $(this).popover("hide")
            })
        }), {
            restrict: "A",
            scope: !0,
            link: function (r, s, l) {
                var u = t(l.bsPopover),
                    c = (u.assign, u(r)),
                    d = {};
                angular.isObject(c) && (d = c), i.when(d.content || o.get(c) || n.get(c, {
                    cache: !0
                })).then(function (t) {
                    angular.isObject(t) && (t = t.data), l.unique && s.on("show", function () {
                        $(".popover.in").each(function () {
                            var t = $(this),
                                e = t.data("popover");
                            e && !e.$element.is(s) && t.popover("hide")
                        })
                    }), l.hide && r.$watch(l.hide, function (t, e) {
                        t ? n.hide() : t !== e && n.show()
                    }), l.show && r.$watch(l.show, function (t, e) {
                        t ? a(function () {
                            n.show()
                        }) : t !== e && n.hide()
                    }), s.popover(angular.extend({}, d, {
                        content: t,
                        html: !0
                    }));
                    var n = s.data("popover");
                    n.hasContent = function () {
                        return this.getTitle() || t
                    }, n.getPosition = function () {
                        var t = $.fn.popover.Constructor.prototype.getPosition.apply(this, arguments);
                        return e(this.$tip)(r), r.$digest(), this.$tip.data("popover", this), t
                    }, r.$popover = function (t) {
                        n(t)
                    }, angular.forEach(["show", "hide"], function (t) {
                        r[t] = function () {
                            n[t]()
                        }
                    }), r.dismiss = r.hide, angular.forEach(["show", "shown", "hide", "hidden"], function (t) {
                        s.on(t, function (e) {
                            r.$emit("popover-" + t, e)
                        })
                    })
                })
            }
        }
    }
]), angular.module("$strap.directives").directive("bsSelect", ["$timeout",
    function (t) {
        return {
            restrict: "A",
            require: "?ngModel",
            link: function (e, n, a, i) {
                var o = e.$eval(a.bsSelect) || {};
                t(function () {
                    n.selectpicker(o), n.next().removeClass("ng-scope")
                }), i && e.$watch(a.ngModel, function (t, e) {
                    angular.equals(t, e) || n.selectpicker("refresh")
                })
            }
        }
    }
]), angular.module("$strap.directives").directive("bsTabs", ["$parse", "$compile", "$timeout",
    function (t, e, n) {
        var a = '<div class="tabs"><ul class="nav nav-tabs"><li ng-repeat="pane in panes" ng-class="{active:pane.active}"><a data-target="#{{pane.id}}" data-index="{{$index}}" data-toggle="tab">{{pane.title}}</a></li></ul><div class="tab-content" ng-transclude></div>';
        return {
            restrict: "A",
            require: "?ngModel",
            priority: 0,
            scope: !0,
            template: a,
            replace: !0,
            transclude: !0,
            compile: function () {
                return function (e, a, i, o) {
                    var r = t(i.bsTabs);
                    r.assign, r(e), e.panes = [];
                    var s, l, u, c = a.find("ul.nav-tabs"),
                        d = a.find("div.tab-content"),
                        p = 0;
                    n(function () {
                        d.find("[data-title], [data-tab]").each(function (t) {
                            var n = angular.element(this);
                            s = "tab-" + e.$id + "-" + t, l = n.data("title") || n.data("tab"), u = !u && n.hasClass("active"), n.attr("id", s).addClass("tab-pane"), i.fade && n.addClass("fade"), e.panes.push({
                                id: s,
                                title: l,
                                content: this.innerHTML,
                                active: u
                            })
                        }), e.panes.length && !u && (d.find(".tab-pane:first-child").addClass("active" + (i.fade ? " in" : "")), e.panes[0].active = !0)
                    }), o && (a.on("show", function (t) {
                        var n = $(t.target);
                        e.$apply(function () {
                            o.$setViewValue(n.data("index"))
                        })
                    }), e.$watch(i.ngModel, function (t) {
                        angular.isUndefined(t) || (p = t, setTimeout(function () {
                            var e = $(c[0].querySelectorAll("li")[1 * t]);
                            e.hasClass("active") || e.children("a").tab("show")
                        }))
                    }))
                }
            }
        }
    }
]), angular.module("$strap.directives").directive("bsTimepicker", ["$timeout", "$strapConfig",
    function (t, e) {
        var n = "((?:(?:[0-1][0-9])|(?:[2][0-3])|(?:[0-9])):(?:[0-5][0-9])(?::[0-5][0-9])?(?:\\s?(?:am|AM|pm|PM))?)";
        return {
            restrict: "A",
            require: "?ngModel",
            link: function (a, i, o, r) {
                if (r) {
                    i.on("changeTime.timepicker", function () {
                        t(function () {
                            r.$setViewValue(i.val())
                        })
                    });
                    var s = RegExp("^" + n + "$", ["i"]);
                    r.$parsers.unshift(function (t) {
                        return !t || s.test(t) ? (r.$setValidity("time", !0), t) : (r.$setValidity("time", !1), void 0)
                    })
                }
                i.attr("data-toggle", "timepicker"), i.parent().addClass("bootstrap-timepicker"), i.timepicker(e.timepicker || {});
                var l = i.data("timepicker"),
                    u = i.siblings('[data-toggle="timepicker"]');
                u.length && u.on("click", $.proxy(l.showWidget, l))
            }
        }
    }
]), angular.module("$strap.directives").directive("bsTooltip", ["$parse", "$compile",
    function (t) {
        return {
            restrict: "A",
            scope: !0,
            link: function (e, n, a) {
                var i = t(a.bsTooltip),
                    o = (i.assign, i(e));
                e.$watch(a.bsTooltip, function (t, e) {
                    t !== e && (o = t)
                }), a.unique && n.on("show", function () {
                    $(".tooltip.in").each(function () {
                        var t = $(this),
                            e = t.data("tooltip");
                        e && !e.$element.is(n) && t.tooltip("hide")
                    })
                }), n.tooltip({
                    title: function () {
                        return angular.isFunction(o) ? o.apply(null, arguments) : o
                    },
                    html: !0
                });
                var r = n.data("tooltip");
                r.show = function () {
                    var t = $.fn.tooltip.Constructor.prototype.show.apply(this, arguments);
                    return this.tip().data("tooltip", this), t
                }, e._tooltip = function (t) {
                    n.tooltip(t)
                }, e.hide = function () {
                    n.tooltip("hide")
                }, e.show = function () {
                    n.tooltip("show")
                }, e.dismiss = e.hide
            }
        }
    }
]), angular.module("$strap.directives").directive("bsTypeahead", ["$parse",
    function (t) {
        return {
            restrict: "A",
            require: "?ngModel",
            link: function (e, n, a, i) {
                var o = t(a.bsTypeahead),
                    r = (o.assign, o(e));
                e.$watch(a.bsTypeahead, function (t, e) {
                    t !== e && (r = t)
                }), n.attr("data-provide", "typeahead"), n.typeahead({
                    source: function () {
                        return angular.isFunction(r) ? r.apply(null, arguments) : r
                    },
                    minLength: a.minLength || 1,
                    items: a.items,
                    updater: function (t) {
                        return i && e.$apply(function () {
                            i.$setViewValue(t)
                        }), e.$emit("typeahead-updated", t), t
                    }
                });
                var s = n.data("typeahead");
                s.lookup = function () {
                    var t;
                    return this.query = this.$element.val() || "", this.query.length < this.options.minLength ? this.shown ? this.hide() : this : (t = $.isFunction(this.source) ? this.source(this.query, $.proxy(this.process, this)) : this.source, t ? this.process(t) : this)
                }, a.matchAll && (s.matcher = function () {
                    return !0
                }), "0" === a.minLength && setTimeout(function () {
                    n.on("focus", function () {
                        0 === n.val().length && setTimeout(n.typeahead.bind(n, "lookup"), 200)
                    })
                })
            }
        }
    }
]);
