'use strict';

System.register(['lodash'], function (_export, _context) {
    "use strict";

    var _, _createClass, CustomHover;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    return {
        setters: [function (_lodash) {
            _ = _lodash.default;
        }],
        execute: function () {
            _createClass = function () {
                function defineProperties(target, props) {
                    for (var i = 0; i < props.length; i++) {
                        var descriptor = props[i];
                        descriptor.enumerable = descriptor.enumerable || false;
                        descriptor.configurable = true;
                        if ("value" in descriptor) descriptor.writable = true;
                        Object.defineProperty(target, descriptor.key, descriptor);
                    }
                }

                return function (Constructor, protoProps, staticProps) {
                    if (protoProps) defineProperties(Constructor.prototype, protoProps);
                    if (staticProps) defineProperties(Constructor, staticProps);
                    return Constructor;
                };
            }();

            _export('CustomHover', CustomHover = function () {
                function CustomHover($scope, htmlContent) {
                    _classCallCheck(this, CustomHover);

                    this.htmlContent = htmlContent;
                }

                _createClass(CustomHover, [{
                    key: 'isHtml',
                    value: function isHtml(htmlContent) {
                        if (/<[a-z][\s\S]*>/i.test(htmlContent)) return true;
                        return false;
                    }
                }, {
                    key: 'parseHtml',
                    value: function parseHtml(htmlContent) {
                        if (this.isHtml(htmlContent)) return htmlContent;
                        return undefined;
                    }
                }]);

                return CustomHover;
            }());

            _export('CustomHover', CustomHover);
        }
    };
});
//# sourceMappingURL=CustomHover.js.map
