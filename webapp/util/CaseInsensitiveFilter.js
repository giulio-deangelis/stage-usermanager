/* eslint-env es6 */

sap.ui.define(["sap/ui/model/Filter"], function (Filter) {
    return function (key, operator, value) {
        return new Filter(`tolower(${key})`, operator, `'${value.toLowerCase()}'`);
    };
});