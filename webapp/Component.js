/* global document */
sap.ui.define([
		"sap/ui/core/UIComponent",
		"sap/ui/Device",
		"zwf1/prozal02/model/models",
		"zwf1/prozal02/controller/ListSelector",
		"zwf1/prozal02/controller/ErrorHandler"
	], function (UIComponent, Device, models, ListSelector, ErrorHandler) {
		"use strict";

		return UIComponent.extend("zwf1.prozal02.Component", {

			metadata : {
				manifest : "json"
			},

			/**
			 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
			 * In this method, the FLP and device models are set and the router is initialized.
			 * @public
			 * @override
			 */
			init : function () {
				this.oListSelector = new ListSelector();
				this._oErrorHandler = new ErrorHandler(this);

				// set the device model
				this.setModel(models.createDeviceModel(), "device");
				// set the FLP model
				this.setModel(models.createFLPModel(), "FLP");
				// set data model
				this.setModel(models.createDataModel(), "Data");
				// set config model
				this.setModel(models.createComponentModel(), "component");

				// call the base component's init function and create the App view
				UIComponent.prototype.init.apply(this, arguments);

				// create the views based on the url/hash
				this.getRouter().initialize();

				try {
					this._urlParsingService = new sap.ushell.services.URLParsing();										
				} catch (err) {	
					console.log("running standalone");
				}

				//set initial application mode
				var sAction = this.getSemanticObjectAndAction();
				if (sAction.indexOf("-create")!==-1) {
					this.getModel("component").setProperty("/applicationMode", "MY_REQUESTS");
				} else if (sAction.indexOf("-approve")!==-1) {
					this.getModel("component").setProperty("/applicationMode", "MY_APPROVALS");
				} else if (sAction.indexOf("-monitor")!==-1) {
					this.getModel("component").setProperty("/applicationMode", "HISTORY");
				}
			},

			/**
			 * The component is destroyed by UI5 automatically.
			 * In this method, the ListSelector and ErrorHandler are destroyed.
			 * @public
			 * @override
			 */
			destroy : function () {
				this.oListSelector.destroy();
				this._oErrorHandler.destroy();
				// call the base component's destroy function
				UIComponent.prototype.destroy.apply(this, arguments);
			},

			/**
			 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
			 * design mode class should be set, which influences the size appearance of some controls.
			 * @public
			 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
			 */
			getContentDensityClass : function() {
				if (this._sContentDensityClass === undefined) {
					// check whether FLP has already set the content density class; do nothing in this case
					if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
						this._sContentDensityClass = "";
					} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
						this._sContentDensityClass = "sapUiSizeCompact";
					} else {
						// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
						this._sContentDensityClass = "sapUiSizeCozy";
					}
				}
				return this._sContentDensityClass;
			},
			
			refresh : function( ) {
				
			},

			getUrlParsingService: function() {
				return this._urlParsingService;
			},

			getSemanticObjectAndAction: function() {
				if (!this._urlParsingService) {
					return "";
				}
				return this._urlParsingService.getShellHash(window.location.href);
			},

			getApplicationMode: function() {
				return this.getModel("component").getProperty("/applicationMode");
			},

			isAppModeMyRequests: function() {
				return this.getModel("component").getProperty("/applicationMode") === "MY_REQUESTS";
			},			

			isAppModeMyApprovals: function() {
				return this.getModel("component").getProperty("/applicationMode") === "MY_APPROVALS";
			},			

			isAppModeDisplayForm: function() {
				return this.getModel("component").getProperty("/applicationMode") === "DISPLAY_FORM";
			},			

			isAppModeHistory: function() {
				return this.getModel("component").getProperty("/applicationMode") === "HISTORY";
			},			

			setApplicationMode: function(sMode) {
				this.getModel("component").setProperty("/applicationMode", sMode);
			},

			refreshMasterList: function() {
				this.fnMasterListRefresh();
			}
		

		});

	}
);