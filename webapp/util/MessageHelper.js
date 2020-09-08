/* eslint-env es6 */
/* eslint no-console: 0, no-warning-comments: 0 */

/** Utility class to show messages through i18n properties */
sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (MessageToast, MessageBox) {
		"use strict";

		return function (controller) {
		    
		    this.showToast = function (messageProp) {
		        MessageToast.show(this._i18n(messageProp));
		    };
		    
		    this.showError = function (titleProp, messageProp) {
                MessageBox.error(this._i18n(messageProp), {
                    title: this._i18n(titleProp)
                });
		    };
		    
		    this._i18n = function (prop) {
		        return controller.getView().getModel("i18n").getProperty(prop);
		    };
		};
	});