/*global history */
sap.ui.define([
	"zwf1/prozal02/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/GroupHeaderListItem",
	"sap/ui/Device",
	"zwf1/prozal02/model/formatter",
	"zwf1/prozal02/model/FormModel",
	'sap/m/ViewSettingsItem',
	'sap/m/ViewSettingsFilterItem',		
	'sap/ui/core/CustomData',
	'sap/ui/core/Fragment',		
	'sap/m/MessageToast',
	"zwf1/prozal02/controller/FormSelectionDialog"
], function (BaseController, JSONModel, History, Filter, FilterOperator, GroupHeaderListItem, Device, formatter, FormModel, ViewSettingsItem, ViewSettingsFilterItem, CustomData, Fragment, MessageToast, FormSelectionDialog) {
	"use strict";

	return BaseController.extend("zwf1.prozal02.controller.Master", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit : function () {
			// Control state model
			var oList = this.byId("list"),
				oViewModel = this._createViewModel(),
				// Put down master list's original value for busy indicator delay,
				// so it can be restored later on. Busy handling on the master list is
				// taken care of by the master list itself.
				iOriginalBusyDelay = oList.getBusyIndicatorDelay();
			this._oList = oList;
			// keeps the filter and search state
			this._oListFilterState = {
				aFilter : [],
				aSearch : []
			};
			this._mDialogs = {};
			this._persDataReaded = new $.Deferred();

			this.setModel(oViewModel, "masterView");
			sap.ui.getCore().setModel(oViewModel, "masterView");
			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oList.attachEventOnce("updateFinished", function(){
				// Restore original busy indicator delay for the list
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});

			this.getView().addEventDelegate({
				onBeforeFirstShow: function () {
					this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
					this.getOwnerComponent().fnMasterListRefresh = this._loadListItems.bind(this);
					//this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));	
				}.bind(this)
			});
			
			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.getRouter().getRoute("objectDisplay").attachPatternMatched(this._onObjectDisplayMatched, this);

			//this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));				
			this.getRouter().attachBypassed(this.onBypassed, this);
			
			if (this.getOwnerComponent().isAppModeMyRequests() || this.getOwnerComponent().isAppModeMyApprovals()) {
				if (sap.ushell && sap.ushell.Container && sap.ushell.Container.getService) {
					this.oPersonalizationService = sap.ushell.Container.getService("Personalization");	
					var sContainer = "zwf1.prozal02.";

					if (this.getOwnerComponent().isAppModeMyRequests()) {
						sContainer+="MyRequests";
					} else if (this.getOwnerComponent().isAppModeMyApprovals()) {
						sContainer+="MyApprovals";
					}

					var oPersId = {
						container: sContainer, 			//any
						item: "MasterFilter"                	//any- I have used the table name 
						};
					// define scope 
					var oScope = {
						keyCategory: this.oPersonalizationService.constants.keyCategory.FIXED_KEY,
						writeFrequency: this.oPersonalizationService.constants.writeFrequency.LOW,
						clientStorageAllowed: true
					};
					// Get a Personalizer
					this.oPersonalizer = this.oPersonalizationService.getPersonalizer(oPersId, oScope, this.getOwnerComponent());	
					this._readPersonalizationData();							
				}
			} else {
				this._persDataReaded.resolve();
			}
			
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * After list data is available, this handler method updates the
		 * master list counter and hides the pull to refresh control, if
		 * necessary.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished : function (oEvent) {
			// update the master list object counter after new data is loaded
			this._updateListItemCount(oEvent.getParameter("total"));
			// hide pull to refresh if necessary
			this.byId("pullToRefresh").hide();
		},

		/**
		 * Event handler for the master search field. Applies current
		 * filter value and triggers a new search. If the search field's
		 * 'refresh' button has been pressed, no new search is triggered
		 * and the list binding is refresh instead.
		 * @param {sap.ui.base.Event} oEvent the search event
		 * @public
		 */
		onSearch : function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				//his.onRefresh();
				this.refreshForms();
				return;
			}

			var sQuery = oEvent.getParameter("query");

			if (sQuery) {
				this._oListFilterState.aSearch = [
					new Filter([
						new Filter("Title", FilterOperator.Contains, sQuery), 
						new Filter("FormNumber", FilterOperator.Contains, sQuery),
						new Filter("Attribute3", FilterOperator.Contains, sQuery)
					], false)]
			} else {
				this._oListFilterState.aSearch = [];
			}
			this._applyFilterSearch();

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh : function () {
			//this._oList.getBinding("items").refresh();

			//sap.ui.core.BusyIndicator.show(0);
			//this._loadListItems().done(() => {
			//	this.getOwnerComponent().oListSelector.clearMasterListSelection();
			//	var items = this._oList.getItems();		
				this._showMaster();																		
			//	window.setTimeout(() => { 
			//		this._showDetail(items[0]); 
			//		sap.ui.core.BusyIndicator.hide();
			//	}, 1000);
			//}).fail(() => {
			//	sap.ui.core.BusyIndicator.hide();
			//});
		},

		refreshForms : function () {
			this._oList.getBinding("items").refresh();

			sap.ui.core.BusyIndicator.show(0);
			this._loadListItems().done(() => {
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				var items = this._oList.getItems();		
				this._showMaster();																		
				window.setTimeout(() => { 
					if (items[0]) {
						this._showDetail(items[0]); 
					} else {
						this.getRouter().navTo("detailNoObjectsAvailable", {}, true);
					}
					sap.ui.core.BusyIndicator.hide();
				}, 1000);
			}).fail(() => {
				sap.ui.core.BusyIndicator.hide();
			});
		},

		onSave: function(oEvent) {	
			var index = this.getView().getModel("Data").getProperty("/formIndex");			
			var oNewData = this.getView().getModel("Data").getProperty("/Forms/" + index);
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			FormModel.modifyForm(oNewData)
			.then(oData => {
				sap.m.MessageBox.success(oBundle.getText("changesSaved"));					
			})
			.fail(err => console.log(err));	
			
		},

		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		onSelectionChange : function (oEvent) {				
			// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
			var that = this;
			var sOld = this.getView().getModel("Data").getProperty("/oldInfo");
			var index = this.getView().getModel("Data").getProperty("/formIndex");
			var sNow = JSON.stringify(this.getView().getModel("Data").getProperty("/Forms/" + index + "/FormData"));

			//nekontrolovat zmeny po odoslani do schval. a pod.
			var bDoCheck = this.getView().getModel("Data").getProperty("/Forms/" + index + "/Status") === "01" ? true : false;
			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

			var oNextItem = (oEvent.getParameter("listItem") || oEvent.getSource());
			if (bDoCheck && sOld && sOld !== sNow) {

				new sap.m.MessageBox.warning(oBundle.getText("unsavedChangesQuestion"), {
					actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
					emphasizedAction: sap.m.MessageBox.Action.YES,
					onClose: function(sAction) {
						that._showDetail(oNextItem);							
						if(sAction === sap.m.MessageBox.Action.YES) {
							that.onSave();
						}
					}
				})
			} else {
				//this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
				this._showDetail(oNextItem);
			}
			
		},

		/**
		 * Event handler for the bypassed event, which is fired when no routing pattern matched.
		 * If there was an object selected in the master list, that selection is removed.
		 * @public
		 */
		onBypassed : function () {
			this._oList.removeSelections(true);
		},

		/**
		 * Used to create GroupHeaders with non-capitalized caption.
		 * These headers are inserted into the master list to
		 * group the master list's items.
		 * @param {Object} oGroup group whose text is to be displayed
		 * @public
		 * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
		 */
		createGroupHeader : function (oGroup) {
			return new GroupHeaderListItem({
				title : oGroup.text,
				upperCase : false
			});
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
		 * If not, it will navigate to the shell home
		 * @public
		 */
		onNavBack : function() {
			var sPreviousHash = History.getInstance().getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				history.go(-1);
			} else {
				oCrossAppNavigator.toExternal({
					target: {shellHash: "#Shell-home"}
				});
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */


		_createViewModel : function() {
			//var sAction = this.getOwnerComponent().getSemanticObjectAndAction();
			//var bActionCreate = sAction.indexOf("-create")!==-1;
			//var bActionApprove = sAction.indexOf("-approve")!==-1;

			var bActionCreate = this.getOwnerComponent().isAppModeMyRequests();
			var bActionApprove = this.getOwnerComponent().isAppModeMyApprovals();
			var bActionHistory = this.getOwnerComponent().isAppModeHistory();

			var dateFrom = new Date();
			dateFrom.setDate(1);
			dateFrom.setMonth(dateFrom.getMonth()-3);				

			return new JSONModel({
				isFilterBarVisible: false,
				filterBarLabel: "",
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText"),
				sortBy: "Osoba",
				groupBy: "None",
				userRoles: [],					

				filters: {
					myRequestsSelected: bActionCreate,
					myApprovalsSelected: bActionApprove,
					myHistorySelected: bActionHistory,

					//pre viewfiltersettings dialog
					statusSelected: [bActionCreate, true, false, bActionCreate, false, bActionCreate],
					periodSelected: [false, bActionCreate, false, false, !bActionCreate],

					//pre formselection dialog
					KOSTL: null,
					FOND: null,
					PSPNR: null,
					PAYDATE: null,	
					PERNR: null,					
					DATE_FROM: dateFrom,
					DATE_TO: new Date(),
					STATUS: null,
					STATUS_LIST: [
						/*{ key: "01", description: "Založeno"},
						{ key: "50", description: "V běhu"},
						{ key: "80", description: "Vráceno žadateli"},
						{ key: "81", description: "Vráceno do schval.procesu"},
						{ key: "83", description: "Připomínkování"},
						{ key: "9A", description: "Schváleno"},
						{ key: "9B", description: "Zamítnuto"},
						{ key: "9C", description: "Vyplacení vyúčt. prov. zál"},							
						{ key: "9Z", description: "Zpracováno"},
						{ key: "9Y", description: "Zrušeno"}*/
					],
					FORM_NUMBER: null,
					MY_REQUESTS: false,
					MY_APPROVALS: true,
					ALL_REQUESTS: false	

				},

			});
		},


		/**
		 * If the master route was hit (empty hash) we have to set
		 * the hash to to the first item in the list as soon as the
		 * listLoading is done and the first item in the list is known
		 * @private
		 */
		_onMasterMatched :  function(oEvent) {
			let promise = null;

			if (!this.metadataLoaded) {
				this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));	
				this.metadataLoaded = true;
				promise = this.getOwnerComponent().oListSelector.oWhenListLoadingIsDone;

				promise.then(
					function (mParams) {
						if (mParams.list.getMode() === "None") {
							return;
						}
						if (mParams.firstListitem && mParams.firstListitem.getBindingContext("Data")) {
							var sObjectId = mParams.firstListitem.getBindingContext("Data").getProperty("FormGuid");
							if (sObjectId) {
								this.getRouter().navTo("object", {objectId : sObjectId}, true);
							} else {
								this.getRouter().navTo("detailObjectNotFound", {}, true);
								//this.getRouter().getTargets().display("detailObjectNotFound");
							}
						} else {
							//this.getRouter().getTargets().display("detailNoObjectsAvailable");
							this.getRouter().navTo("detailNoObjectsAvailable", {}, true);
						}
					}.bind(this),
					function (mParams) {
						if (mParams.error) {
							return;
						}
						//this.getRouter().getTargets().display("detailNoObjectsAvailable");
						this.getRouter().navTo("detailNoObjectsAvailable", {}, true);
					}.bind(this)
				);						
			} else {
				
				sap.ui.core.BusyIndicator.show(0);
				promise = this._loadListItems();		
				promise.then(()=> {
					sap.ui.core.BusyIndicator.hide();
					if (this.getModel("Data").getProperty("/Forms/length") > 0) {
						let sObjectId = this.getModel("Data").getProperty("/Forms/0/FormGuid");
						if (sObjectId) {
							this.getRouter().navTo("object", {objectId : sObjectId}, true);
						} else {
							this.getRouter().navTo("detailObjectNotFound", {}, true);
							//this.getRouter().getTargets().display("detailObjectNotFound");
						}
					} else {
						//this.getRouter().getTargets().display("detailNoObjectsAvailable");
						this.getRouter().navTo("detailNoObjectsAvailable", {}, true);
					}
				}, () => {
					sap.ui.core.BusyIndicator.hide();
					//this.getRouter().getTargets().display("detailNoObjectsAvailable");
					this.getRouter().navTo("detailNoObjectsAvailable", {}, true);
				});
				
			}
		},

		_onObjectDisplayMatched :  function(oEvent) {
			FormModel.setModel(this.getOwnerComponent().getModel());
			this.setModel(this.getOwnerComponent().getModel("Data"), "Data");
			var oViewModel = this.getModel("masterView");
			oViewModel.setProperty("/filters/myRequestsSelected", false);
			oViewModel.setProperty("/filters/myApprovalsSelected", false);
			oViewModel.setProperty("/filters/myHistorySelected", false);
			
		},

		_onObjectMatched :  function(oEvent) {
			if (!this.metadataLoaded) {
				this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));	
				this.metadataLoaded = true;
			}							
		},			

		_onMetadataLoaded: function() {
			this._persDataReaded.then(()=>{
				FormModel.setModel(this.getOwnerComponent().getModel());
				this.setModel(this.getOwnerComponent().getModel("Data"), "Data");				
				this._loadListItems().fail(err => console.log(err));	

				FormModel.getEntitySet('/UserRoleSet').then((roles) => {
					this.getView().getModel("masterView").setProperty("/userRoles", roles.results);
				})		
			});		
		},

		_buildServerFilters: function() {
			var oModel = this.getView().getModel("masterView");
			var filterPresets = oModel.getProperty("/filters");

			var actionFilter = null;
		
			var appMode = this.getOwnerComponent().getApplicationMode();
			actionFilter = new Filter("Action", FilterOperator.EQ, appMode);	

			var periodFilter = null;
			var statusFilter = null;	
			var formGuidFilter = null;		
			
			var aFilters = [];
			var aStatusFilters = [];

			if (this.getOwnerComponent().isAppModeDisplayForm()) {
				formGuidFilter = new Filter("FormGuid", FilterOperator.EQ, this.getOwnerComponent().getModel("component").getProperty("/displayFormGuid"));
			} else if (this.getOwnerComponent().isAppModeMyRequests() || this.getOwnerComponent().isAppModeMyApprovals()){
				
				/*if (filterPresets.statusSelected[0]) {
					aStatusFilters.push( new Filter("Status", FilterOperator.EQ, "01"));
				}
				if (filterPresets.statusSelected[1]) {
					aStatusFilters.push( new Filter("Status", FilterOperator.EQ, "50"));
				}
				if (filterPresets.statusSelected[2]) {
					aStatusFilters.push( new Filter("Status", FilterOperator.EQ, "9A"));
				}
				if (filterPresets.statusSelected[3]) {
					aStatusFilters.push( new Filter("Status", FilterOperator.EQ, "9B"));
				}
				if (filterPresets.statusSelected[4]) {
					aStatusFilters.push( new Filter("Status", FilterOperator.EQ, "9Z"));
				}
				if (filterPresets.statusSelected[5]) {
					aStatusFilters.push( new Filter("Status", FilterOperator.EQ, "9Y"));
				}
				if (filterPresets.statusSelected[6]) {
					aStatusFilters.push( new Filter("Status", FilterOperator.EQ, "9C"));
				}
				if (filterPresets.statusSelected[7]) {
					aStatusFilters.push( new Filter("Status", FilterOperator.EQ, "80"));
				}
				if (filterPresets.statusSelected[8]) {
					aStatusFilters.push( new Filter("Status", FilterOperator.EQ, "81"));
				}
				if (filterPresets.statusSelected[9]) {
					aStatusFilters.push( new Filter("Status", FilterOperator.EQ, "83"));
				}		*/
				
				var statusList = filterPresets.statusSelected;
				if (statusList)
				{  
					if (statusList[0] !== false && statusList[0] !== true) {
						for(var i = 0; i < statusList.length; i++) {
							aStatusFilters.push(new Filter("Status", FilterOperator.EQ, statusList[i]));
						}
					}
				}

				if (aStatusFilters.length > 0) {
					statusFilter = new Filter(aStatusFilters, false);
				}					

				var fromDate = new Date();
				//tyden
				if (filterPresets.periodSelected[0]) {
					fromDate.setDate(fromDate.getDate() - 7);
					periodFilter = new Filter("CrDate", FilterOperator.GE, fromDate);
				//mesiac
				} else if (filterPresets.periodSelected[1]) {
					fromDate.setMonth(fromDate.getMonth() - 1);
					periodFilter = new Filter("CrDate", FilterOperator.GE, fromDate);
				//3 mesiace
				} else if (filterPresets.periodSelected[2]) {
					fromDate.setMonth(fromDate.getMonth() - 3);
					periodFilter = new Filter("CrDate", FilterOperator.GE, fromDate);
				//rok
				} else if (filterPresets.periodSelected[3]) {
					fromDate.setFullYear(fromDate.getFullYear() - 1);
					periodFilter = new Filter("CrDate", FilterOperator.GE, fromDate);
				}																	
			} else if(this.getOwnerComponent().isAppModeHistory()) {
				//volba datumu
				//volba zdroja, SPP, nakl.str.
				
				if (filterPresets.MY_REQUESTS) {
					actionFilter = new Filter("Action", FilterOperator.EQ, "HISTORY_OWN");	
				} else if (filterPresets.MY_APPROVALS) {
					actionFilter = new Filter("Action", FilterOperator.EQ, "HISTORY_APPROVALS");	
				} else if (filterPresets.ALL_REQUESTS) {
					actionFilter = new Filter("Action", FilterOperator.EQ, "HISTORY_ALL");	
				}
				

				if (filterPresets.STATUS) {
					filterPresets.STATUS.forEach(s => {
						aStatusFilters.push( new Filter("Status", FilterOperator.EQ, s));
					});
					if (aStatusFilters.length > 0) {
						statusFilter = new Filter(aStatusFilters, false);
					}								
				}

				periodFilter = new Filter("CrDate", FilterOperator.BT, filterPresets.DATE_FROM, filterPresets.DATE_TO);

				if (filterPresets.FORM_NUMBER) {
					aFilters.push(new Filter("FormNumber", FilterOperator.EQ, filterPresets.FORM_NUMBER));
				}

				var customFilterName = [];
				var customFilterValues = [];

				if (filterPresets.KOSTL) {
					customFilterName.push(new Filter("FieldName", FilterOperator.EQ, "KOSTL"));
					customFilterValues.push(new Filter("FieldValue", FilterOperator.EQ, filterPresets.KOSTL));
				}
				if (filterPresets.PSPNR) {
					customFilterName.push(new Filter("FieldName", FilterOperator.EQ, "PSPNR"));
					customFilterValues.push(new Filter("FieldValue", FilterOperator.EQ, filterPresets.PSPNR));
				}
				if (filterPresets.AUFNR) {
					customFilterName.push(new Filter("FieldName", FilterOperator.EQ, "AUFNR"));
					customFilterValues.push(new Filter("FieldValue", FilterOperator.EQ, filterPresets.AUFNR));
				}
				if (filterPresets.VYPLATIT_PERNR) {
					customFilterName.push(new Filter("FieldName", FilterOperator.EQ, "VYPLATIT_PERNR"));
					customFilterValues.push(new Filter("FieldValue", FilterOperator.EQ, filterPresets.VYPLATIT_PERNR));
				}
				if (filterPresets.VYPLATIT_UNAME) {
					customFilterName.push(new Filter("FieldName", FilterOperator.EQ, "VYPLATIT_UNAME"));
					customFilterValues.push(new Filter("FieldValue", FilterOperator.EQ, filterPresets.VYPLATIT_UNAME));
				}

				if (customFilterName.length > 0) {
					aFilters.push(new Filter(customFilterName, false));
					aFilters.push(new Filter(customFilterValues, false));
				}
			
			}

			
			if (actionFilter) aFilters.push(actionFilter);
			if (statusFilter) aFilters.push(statusFilter);
			if (periodFilter) aFilters.push(periodFilter);
			if (formGuidFilter) aFilters.push(formGuidFilter);

			return new Filter(aFilters, true);
		},

		_loadListItems: function(oParams) {
			var actionStatus = FormModel.getFormStatusSet();
			actionStatus.then(oData => {
				var list = [];
				oData.results.forEach( item => {
					var newStatus = {
						key: item.Status,
						description: item.StatusText,
						selected: false
					}
					list.push(newStatus);
				});
				
				this.getModel("masterView").setProperty("/filters/STATUS_LIST", list);
				this._selectStatusItems();	
			});
	
			var oParams0 = Object.assign({
				filters: [this._buildServerFilters()]
			}, oParams);

			var action = FormModel.getFormHeaderSet(oParams0);
			action.then( oData => {
				this.getModel("Data").setProperty("/Forms", oData.results);
				console.log(this.getModel("Data").getProperty("/Forms"));
				this._oList.getBinding("items").fireDataReceived();
				this.getModel("Data").setProperty("/oldInfo", null);	
			});

			return action;
		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail : function (oItem) {
			var bReplace = !Device.system.phone;
			
			if (!oItem) {					
				this.getRouter().navTo("detailObjectNotFound", {}, bReplace);					
				return;
			}
			
			var sGuid = oItem.getBindingContext("Data").getProperty("FormGuid");
			this.getRouter().navTo("object", {
				objectId : sGuid
			}, bReplace);
		},

		_showMaster : function (oItem) {
			var bReplace = !Device.system.phone;
			this.getRouter().navTo("master", {}, bReplace);
		},			

		/**
		 * Sets the item count on the master list header
		 * @param {integer} iTotalItems the total number of items in the list
		 * @private
		 */
		_updateListItemCount : function (iTotalItems) {
			var sTitle;
			// only update the counter if the length is final
			if (this._oList.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
				this.getModel("masterView").setProperty("/title", sTitle);
			}
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @private
		 */
		_applyFilterSearch : function () {
			var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
				oViewModel = this.getModel("masterView");
			this._oList.getBinding("items").filter(aFilters, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aFilters.length !== 0) {
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
			} else if (this._oListFilterState.aSearch.length > 0) {
				// only reset the no data text to default when no new search was triggered
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
			}
		},

		/**
		 * Internal helper method to apply both group and sort state together on the list binding
		 * @param {sap.ui.model.Sorter[]} aSorters an array of sorters
		 * @private
		 */
		_applyGroupSort : function (aSorters) {
			this._oList.getBinding("items").sort(aSorters);
		},

		/**
		 * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
		 * @param {string} sFilterBarText the selected filter value
		 * @private
		 */
		_updateFilterBar : function (sFilterBarText) {
			var oViewModel = this.getModel("masterView");
			oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
			oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
		},

		// View Setting Dialog opener
		_openDialog : function (sName, sPage, fInit) {
			var oView = this.getView();

			// creates requested dialog if not yet created
			if (!this._mDialogs[sName]) {
				this._mDialogs[sName] = Fragment.load({
					id: oView.getId(),
					name: "zwf1.prozal02.view." + sName,
					controller: this
				}).then(function(oDialog){
					oView.addDependent(oDialog);
					if (fInit) {
						fInit(oDialog);
					}
					return oDialog;
				});
			}
			this._mDialogs[sName].then(function(oDialog){
				// opens the requested dialog
				oDialog.open(sPage);
			});
		},

		onFilterPress: function() {		
			if (this.getOwnerComponent().isAppModeHistory()) {
				if (!this._formSelectionDialog) {
					this._formSelectionDialog = new FormSelectionDialog();
				}
				this._formSelectionDialog.open(this.getView(), this);
			} else {
				this._openDialog("MasterViewSettingsDialog", "filter", (oDialog) => {});
			}
		},

		onFilterPropertyChanged: function(oEvent) {				
			console.log(oEvent);
			var sKey = oEvent.getSource().getKey();
			var oModel = this.getView().getModel("masterView");

			if (sKey === "1") {
				if (oModel.getProperty("/filters/myRequestsSelected") === true) {
					oModel.setProperty("/filters/statusSelected", [true, true, false, true, false, true]);
				} 
				if (oModel.getProperty("/filters/myApprovalsSelected") === true) {
					oModel.setProperty("/filters/statusSelected", [false, true, false, false, false, false]);
				} 
			} 
		},

		_getStatusSelected: function() {
			var items = this.getView().byId("statuslist").getItems();
			var list = [];
			for(var i = 0; i < items.length; i++) {
				if (items[i].getSelected()) {
					list.push(items[i].getKey());
				}
			}
			this.getView().getModel("masterView").setProperty("/filters/statusSelected", list);
		},

		_selectStatusItems: function() {
			var oModel = this.getView().getModel("masterView");
			var items = oModel.getProperty("/filters/STATUS_LIST");
			var statusList = oModel.getProperty("/filters/statusSelected");
			for (var i = 0; i < statusList.length; i++) {
				var found = items.find(element => element.key === statusList[i]);
				if (found) {
					found.selected = true;
				}
			}
			oModel.setProperty("/filters/STATUS_LIST", items);
		},

		onViewSettingsDialogConfirm: function(oEvent) {
			if (oEvent.getParameters().filterString) {
				console.log(oEvent.getParameters().filterString);
			}
			this._getStatusSelected();
			this._writePersonalizationData();

			//sap.ui.core.BusyIndicator.show(0);
			//this._loadListItems().done(() => {
			//	this.getOwnerComponent().oListSelector.clearMasterListSelection();
			//	var items = this._oList.getItems();		
				//this._showMaster();																	
			/*	window.setTimeout(() => { 
					this._showDetail(items[0]); 
					sap.ui.core.BusyIndicator.hide();
				}, 1000);
			}).fail(() => {
				sap.ui.core.BusyIndicator.hide();
			});*/

			sap.ui.core.BusyIndicator.show(0);
			this._loadListItems().done(() => {
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				var items = this._oList.getItems();		
				//this._showMaster();															
				window.setTimeout(() => { 
					if (items[0]) {	
						this._showDetail(items[0]); 
					} else {
						//this.getRouter().navTo("detailObjectNotFound");
						this._showMaster();
					}
					sap.ui.core.BusyIndicator.hide();
				}, 1000);
			}).fail(() => {
				sap.ui.core.BusyIndicator.hide();
			});
		},

		onCreateNewForm: function() {
			var oNewData = {
				FormGuid: FormModel.nullGuid
			};

			var oModel = this.getOwnerComponent().getModel("Data");
			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

			FormModel.modifyForm(oNewData)
				.then(oData => {
				MessageToast.show(oBundle.getText("formCreated", [oData.FormNumber]));
					this._loadListItems().done(() => {
						var bReplace = !Device.system.phone;
						this.getRouter().navTo("object", {
							objectId : oData.FormGuid,
							query: {
								edit: true
							}								
						}, bReplace);
					});							
				})
				.fail(err => console.log(err));							
		},

		onCopyForm: function() {
			var oModel = this.getOwnerComponent().getModel("Data");			
			var oSelectedItem = this._oList.getSelectedItem();	

			if (!oSelectedItem) {
				return;
			}

			var oForm = oModel.getProperty(oSelectedItem.getBindingContext("Data").getPath());
			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
		
			FormModel.copyForm(oForm)
				.then(oData => {
				MessageToast.show(oBundle.getText("formCopied", [oForm.FormNumber, oData.FormNumber]));
					this._loadListItems().done(() => {
						var bReplace = !Device.system.phone;
						this.getRouter().navTo("object", {
							objectId : oData.FormGuid,
							query: {
								edit: true
							}								
						}, bReplace);
					});					
				})
				.fail(err => console.log(err));							
		},

		onDeleteForm: function() {
			var that = this;
			var oModel = this.getOwnerComponent().getModel("Data");			
			var oSelectedItem = this._oList.getSelectedItem();	

			if (!oSelectedItem) {
				return;
			}

			var oForm = oModel.getProperty(oSelectedItem.getBindingContext("Data").getPath());	
			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();	
			if ((oForm.Status !== "01") && (oForm.Status !== "9Y")) {
				new sap.m.MessageBox.error(oBundle.getText("deleteBlockedByStatus", [oForm.StatusText]));
				return;
			}

			new sap.m.MessageBox.warning(oBundle.getText("deleteConfirmText"), {
				actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
				emphasizedAction: sap.m.MessageBox.Action.YES,
				onClose: function(sAction) {
					if(sAction === sap.m.MessageBox.Action.YES) {
						FormModel.deleteForm(oForm.FormGuid)
							.then(() => {
								MessageToast.show(oBundle.getText("formDeletedSuccess", [oForm.FormNumber]));									
								this._loadListItems().done(() => {		
									this.getOwnerComponent().oListSelector.clearMasterListSelection();
									var items = this._oList.getItems();		
									this._showMaster();																													
								});	
							})
							.fail(err => console.log(err));
							}
						}.bind(this)
			})	

		},

		_readPersonalizationData: function() {
			if (this.oPersonalizer) {
				this.oPersonalizer.getPersData().then(oPersData => {
					var oModel = this.getView().getModel("masterView");			

					console.log(oPersData);
					if (oPersData) {				
						oModel.setProperty("/filters/statusSelected", oPersData.statusSelected);
						oModel.setProperty("/filters/periodSelected", oPersData.periodSelected);
					}

					if (!oPersData || !oPersData.statusSelected || ( oPersData.statusSelected.length > 0 && (oPersData.statusSelected[0] === true || oPersData.statusSelected[0] === false))) {
						//old boolean values
						oModel.setProperty("/filters/statusSelected", []);
					}						

					this._persDataReaded.resolve();
				});
			} else {
				this._persDataReaded.resolve();
			}
		},

		_writePersonalizationData: function() {
			var oModel = this.getView().getModel("masterView");
			var filterPresets = oModel.getProperty("/filters");
			var oPersData = {
				statusSelected: filterPresets.statusSelected,
				periodSelected: filterPresets.periodSelected 					
			};
			if (this.oPersonalizer) {
				this.oPersonalizer.setPersData(oPersData);
			}
		}			


	});

}
);