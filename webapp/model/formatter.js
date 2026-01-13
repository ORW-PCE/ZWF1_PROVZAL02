sap.ui.define([
	], function () {
		"use strict";

		return {
			/**
			 * Rounds the currency value to 2 digits
			 *
			 * @public
			 * @param {string} sValue value to be formatted
			 * @returns {string} formatted currency value with 2 digits
			 */
			currencyValue : function (sValue) {
				if (!sValue) {
					return "";
				}

				return parseFloat(sValue).toFixed(2);
			},
			
			dataValue: function(sValue) {
				if (!sValue || sValue.length === 0) {
					return "_";
				}
				return sValue;
			},

			calculateSum: function( aItems ) {
				if (!aItems || !aItems.length) {
					return 0;
				}
				var sum = 0;
				for (var i=0; i<aItems.length; i++ ) {
					sum = sum + parseFloat( aItems[i].WRBTR );
				}

				var format = sap.ui.core.format.NumberFormat.getFloatInstance({
					"groupingEnabled": true,  // grouping is enabled					
					"groupingSize": 3,        // the amount of digits to be grouped (here: thousand)
					"decimalSeparator": ","});

				return format.format(sum.toFixed(2));
			},

			approveStatus :  function (sStatus) {
				if (sStatus === "01") {
					return "None";
				} else if (sStatus === "9A") {
					return "Success";
				} else if (sStatus === "9B"){
					return "Error";
				} else if (sStatus === "9Z") {
					return "Success";
				} else if (sStatus === "9D") {					
					return "Success";		
				} else if (sStatus === "82") {
					return "Warning";		
				} else if (sStatus === "80") {
					return "Warning";	
				} else if (sStatus === "83") {
					return "Warning";		
				} else if (sStatus === "81"){
					return "Error";																					
				} else if (sStatus === "9Y"){
					return "Error";					
				} else {
					return "None";
				}
			},

			formStatus :  function (sStatus) {
				if (sStatus === "01") {
					return "None";
				} else if (sStatus === "9A") {
					return "None";
				} else if (sStatus === "9B"){
					return "Error";
				} else if (sStatus === "9Z") {
					return "Success";
				} else if (sStatus === "9D") {					
					return "None";		
				} else if (sStatus === "82") {
					return "Warning";		
				} else if (sStatus === "80") {
					return "Warning";	
				} else if (sStatus === "83") {
					return "Warning";		
				} else if (sStatus === "81"){
					return "Error";																					
				} else if (sStatus === "9Y"){
					return "Error";					
				} else {
					return "None";
				}
			},			

			formatMessageIcon: function(sType) {
				switch( sType ) {
					case 'W':
						return 'sap-icon://message-warning';
					case 'E':
					case 'A':
					case 'X':
						return 'sap-icon://message-error';
					default:
						return 'sap-icon://message-information';
				}
			},

			formatMessageStatus: function(sType) {
				switch( sType ) {
					case 'W':
						return 'Warning';
					case 'E':
					case 'A':
					case 'X':
						return 'Error';
					default:
						return 'Information';
				}
			},

			showMessagesContinueButton: function(bHasError, bForceHide) {
				if (bForceHide || bHasError) return false;				
				return true;
			},

			formatDetailTitle: function(bEdit, sMode, sStatus, sFormNumber)  {
				var oBundle = this.getView().getModel("i18n").getResourceBundle();

				var sConstText = oBundle.getText("formTitleText");
				var sActionText;

				if (sMode === "MY_REQUESTS") {
					sActionText = oBundle.getText(bEdit ? "actionChange" : "actionDisplay");
				} else if (sMode === "MY_APPROVALS") {
					sActionText = oBundle.getText(sStatus === "50" ? "actionApproval" : "actionDisplay");
				} else {
					sActionText = oBundle.getText("actionDisplay");
				}

				return sActionText + " " + sConstText + " " + sFormNumber;
			},

			vlastnikKartyVisible: function(sAccount) {
				if (!sAccount) return false;
				
				let rule = this.getModel().getObject("/AccountRuleSet('"+sAccount+"')");
				let value = rule && rule.PoleFiori01 === "KARTA_VLASTNIK";
				return value;
			},

			allFormsEnabled: function(userRoles) {
				for (var i=0; i<userRoles.length; i++) {
					var role = userRoles[i].Role;
					if (role.indexOf("UCETNI") !== -1) return true;
					if (role.indexOf("POKLADNI") !== -1) return true;
					if (role.indexOf("ADMIN") !== -1) return true;
					if (role.indexOf("ZOBRAZ") !== -1) return true;
				}
				return false;
			}						
			
			
		};

	}
);