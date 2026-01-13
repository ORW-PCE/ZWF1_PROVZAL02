/*global location */
sap.ui.define([
		"zwf1/prozal02/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"zwf1/prozal02/model/formatter",
		"zwf1/prozal02/controller/SelectSimpleDialog",
		"zwf1/prozal02/controller/SelectSimpleODataDialog",
		"zwf1/prozal02/controller/SelectTableODataDialog",
		"zwf1/prozal02/controller/MessageDialog",
		"zwf1/prozal02/controller/EditDokladDialog",
		"zwf1/prozal02/controller/EditPolozkaDialog",		
		"sap/ui/core/Fragment",
		"sap/m/MessageBox",
		"zwf1/prozal02/model/FormModel",
		"sap/m/Input",
		"sap/m/Button",
		"sap/m/Dialog",
		"sap/m/Label",
		'sap/ui/model/Sorter'		
	], function (BaseController, JSONModel, Filter, FilterOperator, formatter, SelectSimpleDialog, SelectSimpleODataDialog, SelectTableODataDialog, 
		MessageDialog, EditDokladDialog, EditPolozkaDialog, Fragment, MessageBox, FormModel, Input, Button, Dialog, Label, Sorter) {
		"use strict";

		return BaseController.extend("zwf1.prozal02.controller.Detail", {

			formatter: formatter,

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			onInit : function () {
				// Model used to manipulate control states. The chosen values make sure,
				// detail page is busy indication immediately so there is no break in
				// between the busy indication for loading the view's meta data
				var oViewModel = new JSONModel({
					busy : false,
					delay : 0,
					persno: null,
					paragraphVisible: false,
					editable: false,
					editVisible: true,
					saveVisible: false,
					buttonStartWFVisible: false,
					buttonEditVisible: false,
					buttonSaveVisible: false,
					buttonApproveVisible: false,
					buttonDenyVisible: false,
					buttonCheckVisible: false,
					buttonSaveEnabled: false,
					finishingEnabled: false
				});

				

				this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
				this.getRouter().getRoute("objectDisplay").attachPatternMatched(this._onObjectDisplayMatched, this);

				this.setModel(oViewModel, "detailView");
								

				//this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
				
			},

			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */

			/**
			 * Event handler when the share by E-Mail button has been clicked
			 * @public
			 */
			onShareEmailPress : function () {
				var oViewModel = this.getModel("detailView");

				sap.m.URLHelper.triggerEmail(
					null,
					oViewModel.getProperty("/shareSendEmailSubject"),
					oViewModel.getProperty("/shareSendEmailMessage")
				);
			},

			/**
			 * Event handler when the share in JAM button has been clicked
			 * @public
			 */
			onShareInJamPress : function () {
				var oViewModel = this.getModel("detailView"),
					oShareDialog = sap.ui.getCore().createComponent({
						name : "sap.collaboration.components.fiori.sharing.dialog",
						settings : {
							object :{
								id : location.href,
								share : oViewModel.getProperty("/shareOnJamTitle")
							}
						}
					});

				oShareDialog.open();
			},


			/* =========================================================== */
			/* begin: internal methods                                     */
			/* =========================================================== */

			/**
			 * Binds the view to the object path and expands the aggregated line items.
			 * @function
			 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
			 * @private
			 */
			_onObjectMatched : function (oEvent) {
				
				var sObjectId =  oEvent.getParameter("arguments").objectId;
				var oViewModel = this.getModel("detailView");

				var oQuery = oEvent.getParameter("arguments")["?query"];
				if (oQuery && oQuery.edit === "true") {
					oViewModel.setProperty("/editable", true);					
				} else {
					oViewModel.setProperty("/editable", false);
				}
		
				this.getOwnerComponent().oListSelector.oWhenListLoadingIsDone.then(() => {

					var aForms = this.getView().getModel("Data").getProperty("/Forms");
					if (aForms && aForms.length) {
						var formIndex = aForms.findIndex(o => o.FormGuid === sObjectId);

						if (formIndex === -1) {
							//this.getRouter().getTargets().display("detailObjectNotFound");
							this.getRouter().navTo("detailObjectNotFound", {}, true);
							return;							
						}

						this.setBusy(true);  //oViewModel.setProperty("/busy", true);

						this.getModel().metadataLoaded().then( () => {
													
							if (sObjectId !== FormModel.nullGuid) {
								FormModel.getExpandedForm( sObjectId ).then(oForm => {
									this.getView().getModel("Data").setProperty("/Forms/" + formIndex, oForm);
									
									// Fixing the loss of data of STANOVENI_UCTU //
									var FormSTANOVENI_UCTU = this.getView().getModel("Data").getProperty("/Forms/" + formIndex + "/FormData/STANOVENI_UCTU");
									console.log(FormSTANOVENI_UCTU);
									
									this._bindView("Data>/Forms/" + formIndex);
									// After that ↑, STANOVENI_UCTU data is lost //
									var oSelectedItem = this.getView().getModel("Data").getProperty("/Forms/" + formIndex + "/FormData");
									
									// Fixing the loss of data of STANOVENI_UCTU //
									this.getView().getModel("Data").setProperty("/Forms/" + formIndex + "/FormData/STANOVENI_UCTU", FormSTANOVENI_UCTU);

									var oSelectedItem = this.getView().getModel("Data").getProperty("/Forms/" + formIndex + "/FormData");
									var sItem = JSON.stringify(oSelectedItem);
									this.getView().getModel("Data").setProperty("/oldInfo", sItem);
									this.getView().getModel("Data").setProperty("/formIndex", formIndex);
								});
							}
							

						});		
					} else {
						//this.getRouter().getTargets().display("detailObjectNotFound");	
						this.getRouter().navTo("detailObjectNotFound", {}, true);				
					}
					
				}, () => {
					//this.getRouter().getTargets().display("detailObjectNotFound");		
					this.getRouter().navTo("detailObjectNotFound", {}, true);			
				});
				var that = this;
				//Pridanie eventu pri odideni z inputu waers
				var oWaersInput = this.getView().byId("idInputWaers");
				oWaersInput.addEventDelegate({
					onsapfocusleave: function() {
						var oCtx = that.getView().getBindingContext("Data");
						console.log(oWaersInput.getValue());
						that._changeWaersonDocs(oCtx, oWaersInput.getValue());
					}
				});
			},

			_onObjectDisplayMatched : function (oEvent) {
				
				var sObjectId =  oEvent.getParameter("arguments").objectId;
				var oViewModel = this.getModel("detailView");

				this.getOwnerComponent().setApplicationMode("DISPLAY_FORM");
				this.getOwnerComponent().getModel("component").setProperty("/displayFormGuid", sObjectId);

				this.setBusy(true);  //oViewModel.setProperty("/busy", true);
				this.getModel().metadataLoaded().then( () => {
					FormModel.getExpandedForm( sObjectId ).then(oForm => {
						this.getView().getModel("Data").setProperty("/Forms/0", oForm);
						this._bindView("Data>/Forms/0");	
					});
				});
							

			},			

			/**
			 * Binds the view to the object path. Makes sure that detail view displays
			 * a busy indicator while data for the corresponding element binding is loaded.
			 * @function
			 * @param {string} sObjectPath path to the object to be bound to the view.
			 * @private
			 */
			_bindView : function (sObjectPath) {
				// Set busy indicator during view binding
				var oViewModel = this.getModel("detailView");

				// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
				this.setBusy(false);  //oViewModel.setProperty("/busy", false);
				this.getView().byId("idSelectAccount").setSelectedKey(null);

				if (sObjectPath) {			 
					this.getView().bindElement({
						path : sObjectPath,			
						events: {
							change : this._onBindingChange.bind(this)
						}
					});
				} else {
					this.getView().unbindElement();
				}

				this._refreshButtons();				
				this.setSelectedApprover();
			},
			
			_refreshView: function() {
				var oCtx = this.getView().getBindingContext("Data");
				var sFormGuid = oCtx.getModel().getProperty( oCtx.getPath()+"/FormGuid");

				var action = FormModel.getExpandedForm( sFormGuid );

				action.then(oForm => {
					oCtx.getModel().setProperty(oCtx.getPath(), oForm);	
					this._refreshButtons();
				});

				return action;
			},

			_refreshViewFromData: function(oFormData) {
				var oCtx = this.getView().getBindingContext("Data"); 
				oCtx.getModel().setProperty(oCtx.getPath()+"/FormData", FormModel.mapFormData2UI(oFormData.FormDataSet.results));	
				oCtx.getModel().setProperty(oCtx.getPath()+"/ApproverSet", oFormData.ApproverSet.results);	
			},		
			
			_refreshButtons_old: function() {
				var oViewModel = this.getModel("detailView");
				var oCtx = this.getView().getBindingContext("Data");
				var oForm = {};
				
				if (oCtx) {
					oForm = oCtx.getModel().getProperty( oCtx.getPath());
				}

				var bEditable = oViewModel.getProperty("/editable");
				//var bMyRequests = sap.ui.getCore().getModel("masterView").getProperty("/filters/myRequestsSelected");
				var bMyRequests = this.getOwnerComponent().isAppModeMyRequests();
				var bMyApprovals = this.getOwnerComponent().isAppModeMyApprovals();

				switch (oForm.Status) {
					case "01": 
						oViewModel.setProperty("/buttonStartWFVisible", bMyRequests);
						oViewModel.setProperty("/buttonEditVisible", bMyRequests && !bEditable);
						oViewModel.setProperty("/buttonSaveVisible", bMyRequests && bEditable);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);
						oViewModel.setProperty("/buttonCheckVisible", bMyRequests);
						break;
					case "50": 
						oViewModel.setProperty("/buttonStartWFVisible", false);
						oViewModel.setProperty("/buttonEditVisible", false);
						oViewModel.setProperty("/buttonSaveVisible", false);
						oViewModel.setProperty("/buttonApproveVisible", bMyApprovals);
						oViewModel.setProperty("/buttonDenyVisible", bMyApprovals);
						oViewModel.setProperty("/buttonCheckVisible", false);
						break;	
					case "9A": 
						oViewModel.setProperty("/buttonStartWFVisible", false);
						oViewModel.setProperty("/buttonEditVisible", false);
						oViewModel.setProperty("/buttonSaveVisible", false);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);
						oViewModel.setProperty("/buttonCheckVisible", false);
						break;	
					case "9B": 
						oViewModel.setProperty("/buttonStartWFVisible", bMyRequests);
						oViewModel.setProperty("/buttonEditVisible", bMyRequests && !bEditable);
						oViewModel.setProperty("/buttonSaveVisible", bMyRequests && bEditable);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);
						oViewModel.setProperty("/buttonCheckVisible", bMyRequests);
						break;	
					case "9Y": 
						oViewModel.setProperty("/buttonStartWFVisible", false);
						oViewModel.setProperty("/buttonEditVisible", false);
						oViewModel.setProperty("/buttonSaveVisible", false);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);
						oViewModel.setProperty("/buttonCheckVisible", false);
						break;							
					case "9Z": 
						oViewModel.setProperty("/buttonStartWFVisible", false);
						oViewModel.setProperty("/buttonEditVisible", false);
						oViewModel.setProperty("/buttonSaveVisible", false);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);
						oViewModel.setProperty("/buttonCheckVisible", false);
						break;								
					default:
						oViewModel.setProperty("/buttonStartWFVisible", false);
						oViewModel.setProperty("/buttonEditVisible", false);
						oViewModel.setProperty("/buttonSaveVisible", false);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);		
						oViewModel.setProperty("/buttonCheckVisible", false);

				}
			},			

			_refreshButtons: function() {
				var oViewModel = this.getModel("detailView");
				var oCtx = this.getView().getBindingContext("Data");
				var oForm = {};
				var oPage = this.byId("page");
				
				if (oCtx) {
					oForm = oCtx.getModel().getProperty( oCtx.getPath());
				}

				var bEditable = oViewModel.getProperty("/editable");
				//var bMyRequests = sap.ui.getCore().getModel("masterView").getProperty("/filters/myRequestsSelected");
				var bMyRequests = this.getOwnerComponent().isAppModeMyRequests();
				var bMyApprovals = this.getOwnerComponent().isAppModeMyApprovals();

				var aActions = oForm.FormActionSet;
				const footer = oPage.getCustomFooterContent();

				footer.forEach(button => {
					if (button.getId().indexOf("actionButton_") !== -1) {
						button.setVisible(false);
					}
				})

				aActions.forEach(action => {
					let button = footer.find(button => button.getId().indexOf("actionButton_"+action.Action) !== -1);
					if (button && action.FormMode === this.getOwnerComponent().getApplicationMode() ) {
						button.setVisible(true);
						button.setText(action.ActionName);
					}
				});
				
				switch (oForm.Status) {
					case "01": 
						oViewModel.setProperty("/buttonStartWFVisible", bMyRequests);
						oViewModel.setProperty("/buttonEditVisible", bMyRequests && !bEditable);
						oViewModel.setProperty("/buttonSaveVisible", bMyRequests && bEditable);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);
						oViewModel.setProperty("/buttonCheckVisible", bMyRequests);
						break;
					case "83": 
						oViewModel.setProperty("/buttonStartWFVisible", bMyRequests);
						oViewModel.setProperty("/buttonEditVisible", bMyRequests && !bEditable);
						oViewModel.setProperty("/buttonSaveVisible", bMyRequests && bEditable);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);
						oViewModel.setProperty("/buttonCheckVisible", bMyRequests);
						break;		
					case "80": 
						oViewModel.setProperty("/buttonStartWFVisible", bMyRequests);
						oViewModel.setProperty("/buttonEditVisible", bMyRequests && !bEditable);
						oViewModel.setProperty("/buttonSaveVisible", bMyRequests && bEditable);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);
						oViewModel.setProperty("/buttonCheckVisible", bMyRequests);
						break;	
					case "81": 
						oViewModel.setProperty("/buttonStartWFVisible", bMyRequests);
						oViewModel.setProperty("/buttonEditVisible", bMyRequests && !bEditable);
						oViewModel.setProperty("/buttonSaveVisible", bMyRequests && bEditable);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);
						oViewModel.setProperty("/buttonCheckVisible", bMyRequests);
						break;																			
					case "50": 
						oViewModel.setProperty("/buttonStartWFVisible", false);
						oViewModel.setProperty("/buttonEditVisible", false);
						oViewModel.setProperty("/buttonSaveVisible", false);
						oViewModel.setProperty("/buttonApproveVisible", bMyApprovals);
						oViewModel.setProperty("/buttonDenyVisible", bMyApprovals);
						oViewModel.setProperty("/buttonCheckVisible", false);
						break;	
					case "9A": 
						oViewModel.setProperty("/buttonStartWFVisible", false);
						oViewModel.setProperty("/buttonEditVisible", false);
						oViewModel.setProperty("/buttonSaveVisible", false);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);
						oViewModel.setProperty("/buttonCheckVisible", false);
						break;	
					case "9B": 
						oViewModel.setProperty("/buttonStartWFVisible", bMyRequests);
						oViewModel.setProperty("/buttonEditVisible", bMyRequests && !bEditable);
						oViewModel.setProperty("/buttonSaveVisible", bMyRequests && bEditable);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);
						oViewModel.setProperty("/buttonCheckVisible", bMyRequests);
						break;	
					case "9Y": 
						oViewModel.setProperty("/buttonStartWFVisible", false);
						oViewModel.setProperty("/buttonEditVisible", false);
						oViewModel.setProperty("/buttonSaveVisible", bMyRequests && bEditable);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);
						oViewModel.setProperty("/buttonCheckVisible", false);
						break;							
					case "9Z": 
						oViewModel.setProperty("/buttonStartWFVisible", false);
						oViewModel.setProperty("/buttonEditVisible", false);
						oViewModel.setProperty("/buttonSaveVisible", false);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);
						oViewModel.setProperty("/buttonCheckVisible", false);
						break;								
					default:
						oViewModel.setProperty("/buttonStartWFVisible", false);
						oViewModel.setProperty("/buttonEditVisible", false);
						oViewModel.setProperty("/buttonSaveVisible", false);
						oViewModel.setProperty("/buttonApproveVisible", false);
						oViewModel.setProperty("/buttonDenyVisible", false);		
						oViewModel.setProperty("/buttonCheckVisible", false);

				}
				


			},

			_onBindingChange : function () {
				var oView = this.getView(),
					oElementBinding = oView.getElementBinding("Data");

				// No data for the binding
				if (!oElementBinding || !oElementBinding.getBoundContext()) {
					//this.getRouter().getTargets().display("detailObjectNotFound");
					this.getRouter().navTo("detailObjectNotFound", {}, true);
					// if object could not be found, the selection in the master list
					// does not make sense anymore.
					this.getOwnerComponent().oListSelector.clearMasterListSelection();
					return;
				}

				var sPath = oElementBinding.getPath(),
					oResourceBundle = this.getResourceBundle(),
					oObject = oElementBinding.getModel().getObject(sPath),

					sObjectId = oObject.FormGuid,
					sObjectName = oObject.Title,
					oViewModel = this.getModel("detailView");

				this.getOwnerComponent().oListSelector.selectAListItem(sPath);

				oViewModel.setProperty("/saveAsTileTitle",oResourceBundle.getText("shareSaveTileAppTitle", [sObjectName]));
				oViewModel.setProperty("/shareOnJamTitle", sObjectName);
				oViewModel.setProperty("/shareSendEmailSubject",
					oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
				oViewModel.setProperty("/shareSendEmailMessage",
					oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
				
				var aApprovers = oElementBinding.getModel().getObject(sPath + "/Approvers");
				if (!aApprovers || aApprovers.length === 0 ) {
					oElementBinding.getModel().setProperty("/paragraphVisible", true);
				} else {
					
				}

				
			},

			_onMetadataLoaded : function () {
				// Store original busy indicator delay for the detail view
				var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
					oViewModel = this.getModel("detailView");

				// Make sure busy indicator is displayed immediately when
				// detail view is displayed for the first time
				oViewModel.setProperty("/delay", 0);

				// Binding the view will set it to not busy - so the view is always busy if it is not bound
				this.setBusy(true);  //oViewModel.setProperty("/busy", true);
				// Restore original busy indicator delay for the detail view
				oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
			},
			
			_onTabSelect: function(oEvent) {
			},

			setBusy: function(bBusy) {
				//var oViewModel = this.getModel("detailView");
				//oViewModel.setProperty("/busy", bBusy);

				if (bBusy) {
					sap.ui.core.BusyIndicator.show(0);
				} else {
					sap.ui.core.BusyIndicator.hide();
				}				
			},

			onInputValueChanged: function(oEvent) {
				var oSource = oEvent.getSource();
				var newValue = oEvent.getParameter("newValue");
				var oModel = this.getView().getModel("Data");
				var sFormDataPath = oSource.getBindingContext("Data").getPath()+"/FormData";				
				var sId = oSource.getId();
				
				if (!newValue) {
					if (sId.indexOf("idInputZadatelPernr") !== -1) {
						oModel.setProperty(sFormDataPath+"/ZADATEL_OSOBA", "");						
					} else if (sId.indexOf("idInputGsber") !== -1) {
						oModel.setProperty(sFormDataPath+"/GSBER_TEXT", "");
					} else if (sId.indexOf("idInputParafistaPernr") !== -1) {
						oModel.setProperty(sFormDataPath+"/PARAFISTA_OSOBA", "");
					} else if (sId.indexOf("idInputParafistaUname") !== -1) {
						oModel.setProperty(sFormDataPath+"/PARAFISTA_OSOBA", "");
					}
				}

				if (sId.indexOf("idInputZadatelPernr") !== -1) {
					oModel.setProperty(sFormDataPath+"/ORGEH", "");					
				}

				if(oSource.getProperty("selectedKey") != "03"){
					oModel.setProperty(sFormDataPath+"/KARTA_VLASTNIK", "");	
				}

				//mod BMO 
				if(sId.indexOf("idInputParafistaPernr") == -1){
					oModel.setProperty(sFormDataPath+"/PARAFISTA_OSOBA", "");
					oModel.setProperty(sFormDataPath+"/PARAFISTA_UNAME", "");		
					oModel.setProperty(sFormDataPath+"/PARAFISTA_PERNR", "");	
				}
			},
			_changeWaersonDocs: function(oCtx, sInputValue) {
				var oDocs = oCtx.getModel().getProperty(oCtx.getPath()+"/FormData/DOKLADY");
				if (oDocs) {
					for (var i = 0; i < oDocs.length; i++){
						oDocs[i].WAERS = sInputValue;
					}
					oCtx.getModel().setProperty(oCtx.getPath()+"/FormData/DOKLADY", oDocs);
				}
				var oPolozky = oCtx.getModel().getProperty(oCtx.getPath()+"/FormData/POLOZKY");
				if (oPolozky) {
					for(var i = 0; i < oPolozky.length; i++) {
						oPolozky[i].WAERS = sInputValue;
					}
					oCtx.getModel().setProperty(oCtx.getPath()+"/FormData/POLOZKY", oPolozky);
				}
			},

			onInputValueSubmit: function(oEvent) {				
				var oCtx = this.getView().getBindingContext("Data");
				FormModel.validateFormInputs( oCtx.getModel().getProperty( oCtx.getPath())).then( (newData) => {
					oCtx.getModel().setProperty( oCtx.getPath()+"/FormData", newData.FormData);
					/*var oDocs = oCtx.getModel().getProperty( oCtx.getPath()+"/FormData/DOKLADY");
					if (oDocs) {
						for(var i = 0; i < oDocs.length; i++) {
							oDocs[i].WAERS = newData.FormData.WAERS;
						}
						oCtx.getModel().setProperty(oCtx.getPath()+"/FormData/DOKLADY", oDocs);
					}
					

					var oPolozky = oCtx.getModel().getProperty( oCtx.getPath()+"/FormData/POLOZKY");
					if (oPolozky) {
						for(var j = 0 ; j < oPolozky.length; j++){
							oPolozky[j].WAERS = newData.FormData.WAERS;
						}
						oCtx.getModel().setProperty(oCtx.getPath()+"/FormData/POLOZKY", oPolozky);
					}*/
				});

				
			},

			onPayDateCalendarPick: function(oEvent) {				
				var oCtx = this.getView().getBindingContext("Data");
				this.onInputValueSubmit(oEvent);
			},			

			onInputValueHelpRequest: function(oEvent) {

				var oSource = oEvent.getSource();
				var oModel = this.getView().getModel("Data");
				var sFormDataPath = oSource.getBindingContext("Data").getPath()+"/FormData/";
				const rb = this.getView().getModel("i18n").getResourceBundle();

				try {
					if (this._selectDialog) {
						this._selectDialog.destroy();
						delete this._selectDialog; 
					}
				} catch (err) {}

				if (oSource.getId().indexOf("idInputZadatelPernr") !== -1) {
					if (!this._selectDialog) {
						this._selectDialog = new SelectTableODataDialog(this.getView(), rb.getText("Osoba"), "PERNR", [
							{header: rb.getText("Pernr"), width: "10em"},
							{header: rb.getText("Osoba")},
							{header: rb.getText("NS"), width: "10em"},
							{header: rb.getText("NS_text")}

						]).setFilters([new Filter( 'Param2', FilterOperator.EQ, oModel.getProperty(sFormDataPath+"ZADATEL_UNAME"))]);
					}
				} else if (oSource.getId().indexOf("Pernr") !== -1) {
					if (!this._selectDialog) {
						this._selectDialog = new SelectTableODataDialog(this.getView(), rb.getText("Osoba"), "PERNR", [
							{header: rb.getText("Pernr"), width: "10em"},
							{header: rb.getText("Osoba")},
							{header: rb.getText("NS"), width: "10em"},
							{header: rb.getText("NS_text")}

						]);
					}
				} else if (oSource.getId().indexOf("idInputGsber") !== -1) {
					if (!this._selectDialog) {
						this._selectDialog = new SelectSimpleODataDialog(this.getView(), rb.getText("Pracovní_usek"), "GSBER");
					}
				} else if (oSource.getId().indexOf("idInputOrgeh") !== -1) {
					if (!this._selectDialog) {
						this._selectDialog = new SelectSimpleODataDialog(this.getView(), rb.getText("Č_org_NS"), "ORGEH");
					}					
				} else if (oSource.getId().indexOf("idInputWaers") !== -1) {
					if (!this._selectDialog) {
						this._selectDialog = new SelectSimpleODataDialog(this.getView(), rb.getText("Měna"), "WAERS");
					}
				} else if (oSource.getId().indexOf("idInputParafistaUname") !== -1) {
					if (!this._selectDialog) {
						this._selectDialog = new SelectSimpleODataDialog(this.getView(), rb.getText("User"), "UNAME");
					}
				}


				this._selectDialog
					.setMultiSelect(false)
					.select()
					.done(oSelection => {  
						let sPath = oSource.getBindingContext("Data").getPath();
						if (oSource.getId().indexOf("idInputZadatelPernr") !== -1) {
							oModel.setProperty( sPath+"/FormData/ZADATEL_PERNR", oSelection.Value);
							oModel.setProperty( sPath+"/FormData/ZADATEL_OSOBA", oSelection.Description);
							oModel.setProperty( sPath+"/FormData/ORGEH", "");

						} else if (oSource.getId().indexOf("idInputParafistaUname") !== -1) {
							oModel.setProperty( sPath+"/FormData/PARAFISTA_UNAME", oSelection.Value);
							oModel.setProperty( sPath+"/FormData/PARAFISTA_OSOBA", oSelection.Description);
						} else if (oSource.getId().indexOf("idInputParafistaPernr") !== -1) {
							oModel.setProperty( sPath+"/FormData/PARAFISTA_PERNR", oSelection.Value);
							oModel.setProperty( sPath+"/FormData/PARAFISTA_OSOBA", oSelection.Description);
						} else if (oSource.getId().indexOf("idInputGsber") !== -1) {
							oModel.setProperty( sPath+"/FormData/GSBER", oSelection.Value);
							oModel.setProperty( sPath+"/FormData/GSBER_TEXT", oSelection.Description);
						} else if (oSource.getId().indexOf("idInputOrgeh") !== -1) {
							oModel.setProperty( sPath+"/FormData/ORGEH", oSelection.Value);
							oModel.setProperty( sPath+"/FormData/ORGEH_TEXT", oSelection.Description);							
						} else if (oSource.getId().indexOf("idInputWaers") !== -1) {
							oModel.setProperty( sPath+"/FormData/WAERS", oSelection.Title);
						} else if (oSource.getId().indexOf("idInputPspnr")) {
							oModel.setProperty( sPath+"/FormData/PSPNR", oSelection.Title);
							oModel.setProperty( sPath+"/FormData/PSP_TEXT", oSelection.Description);
						}

						//oSource.fireLiveChange();
						this.onInputValueSubmit();
					 })
					.always(() => {
						this._selectDialog.destroy();
						delete this._selectDialog;                    
					});             
					

			},

			onCreateDocumentAttachment: function(oEvent) {
				var oCtx = this.getView().getBindingContext("Data");
				var sFormGuid = oCtx.getModel().getProperty( oCtx.getPath()+"/FormGuid");
				var oItemCtx = oEvent.getSource().getBindingContext("Data");
				var oDoc = oItemCtx.getModel().getProperty(oItemCtx.getPath());				

				let input = document.createElement('input');
				input.type = 'file';
				input.onchange = _ => {
			  		let files = Array.from(input.files);
					if (files.length>0) {

						/*
						var reader = new FileReader();
						reader.onload = (e) => {
							const dataUrl = e.target.result;
							const [_, base64] = dataUrl.split(','); 						  
							
							this.executePostDocFile(this.fromGuid(sFormGuid), {
								LineId: oDoc.LINE_ID,
								Filename: files[0].name,
								Content: base64
							}, (data) => {
								console.log(data);								
								oDoc.APPLICATION_ID =  data.d.ApplicationId;
								oDoc.FILE_ID = data.d.FileId;
								oDoc.DOCFILE = data.d.Title;
								oItemCtx.getModel().refresh(true);
							});

						}
						reader.readAsDataURL(files[0]);
						*/

						this.executePostDocFile(this.fromGuid(sFormGuid), {
							LineId: oDoc.LINE_ID,
							Filename: files[0].name,
							File: files[0]
						}, (data) => {
							console.log(data);								
							oDoc.APPLICATION_ID =  this.fromGuid(data.d.ApplicationId);
							oDoc.FILE_ID = this.fromGuid(data.d.FileId);
							oDoc.DOCFILE = data.d.Title;
							oItemCtx.getModel().refresh(true);
						});						
					}
				};
				input.click();				
			},

			onDownloadDocumentAttachment: function(oEvent) {
				var oCtx = this.getView().getBindingContext("Data");
				var sFormGuid = oCtx.getModel().getProperty( oCtx.getPath()+"/FormGuid");
				var sFormNumber = oCtx.getModel().getProperty( oCtx.getPath()+"/FormNumber");
				var oItemCtx = oEvent.getSource().getBindingContext("Data");
				var oDoc = oItemCtx.getModel().getProperty(oItemCtx.getPath());
				this.executeGetFile(sFormGuid, sFormNumber, {
					Title: oDoc.DOCFILE,
					FileId: this.toGuid(oDoc.FILE_ID),
					ApplicationId: this.toGuid(oDoc.APPLICATION_ID)
				});
			},

			onDeleteDocumentAttachment: async function(oEvent) {
				var oItemCtx = oEvent.getSource().getBindingContext("Data");
				return await this._deleteDocumentAttachment(oItemCtx);
			},

			_deleteDocumentAttachment: async function(oItemCtx) {
				var oViewModel = this.getView().getModel("detailView");
				var oCtx = this.getView().getBindingContext("Data");
				var sFormGuid = oCtx.getModel().getProperty( oCtx.getPath()+"/FormGuid");
				var sFormNumber = oCtx.getModel().getProperty( oCtx.getPath()+"/FormNumber");
				var oDoc = oItemCtx.getModel().getProperty(oItemCtx.getPath());
				var result = new $.Deferred();
				var that = this;

				function fSuccess(oData, response) {
					that.setBusy(false);  //oViewModel.setProperty("/busy", false);
					var sError = oData.ActionDeleteDocFile.Error;
					if (!sError) {
						oDoc.APPLICATION_ID  = null;
						oDoc.FILE_ID  = null;
						oDoc.DOCFILE = null;
						oItemCtx.getModel().refresh(true);
						result.resolve();
					} else {
						sap.m.MessageBox.error(sError);	
						result.reject(sError);
					}
				}
				
				function fError(oError) {
					that.setBusy(false);  //oViewModel.setProperty("/busy", false);
                	var sDetail = $(oError.response.body).find('message').first().text();
                	sap.m.MessageBox.error(sDetail);
					result.reject(sDetail);
				}

				this.setBusy(true);  //oViewModel.setProperty("/busy", true);
				this.getView().getModel().callFunction("/ActionDeleteDocFile", {
					method: "POST",
					success: fSuccess,
					error: fError,
					urlParameters: {
						FormGuid: sFormGuid,
						LineId: oDoc.LINE_ID
					}
				});

				return result;
			},			

			onAttachmentPress: function(oEvent) {
				//window.open("/res/sample.pdf");

				var oViewModel = this.getView().getModel("detailView");
				var oCtx = this.getView().getBindingContext("Data");
				var sFormGuid = oCtx.getModel().getProperty( oCtx.getPath()+"/FormGuid");
				var sFormNumber = oCtx.getModel().getProperty( oCtx.getPath()+"/FormNumber");

				var oItemCtx = oEvent.getSource().getBindingContext("Data");
				var oAtta = oItemCtx.getModel().getProperty(oItemCtx.getPath());

				if (oAtta.Generate) {
					this.executeGeneratePdf(sFormGuid, sFormNumber, oAtta);
				} else if (oAtta.FileId) {
					this.executeGetFile(sFormGuid, sFormNumber, oAtta);
				}
			},			
			
			executeGeneratePdf: function(sFormGuid, sFormNumber, oAtta) {
				var oViewModel = this.getView().getModel("detailView");
				var that = this;

				function fSuccess(oData, response) {
					that.setBusy(false);  //oViewModel.setProperty("/busy", false);
					var sError = oData.ActionGeneratePdf.Error;
					if (!sError) {
						var pdfWindow = window.open("");
						pdfWindow.document.write(
							"<title>PZ "+sFormNumber+"</title>" +
							"<iframe width='100%' height='100%' src='data:application/pdf;base64, " +
							encodeURI(oData.ActionGeneratePdf.Content) + "'></iframe>"
						)						

					} else {
						sap.m.MessageBox.error(sError);						
					}
				}
				
				function fError(oError) {
					that.setBusy(false);  //oViewModel.setProperty("/busy", false);
                	var sDetail = $(oError.response.body).find('message').first().text();
                	sap.m.MessageBox.error(sDetail);
				}

				this.setBusy(true);  //oViewModel.setProperty("/busy", true);
				this.getView().getModel().callFunction("/ActionGeneratePdf", {
					method: "GET",
					success: fSuccess,
					error: fError,
					urlParameters: {
						FormGuid: sFormGuid
					}
				});				
			},

			executeGetFile: function(sFormGuid, sFormNumber, oAtta) {
				var oViewModel = this.getView().getModel("detailView");
				var that = this;
								
				const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
				  const byteCharacters = atob(b64Data);
				  const byteArrays = [];
				
				  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
					const slice = byteCharacters.slice(offset, offset + sliceSize);
				
					const byteNumbers = new Array(slice.length);
					for (let i = 0; i < slice.length; i++) {
					  byteNumbers[i] = slice.charCodeAt(i);
					}
				
					const byteArray = new Uint8Array(byteNumbers);
					byteArrays.push(byteArray);
				  }
				
				  const blob = new Blob(byteArrays, {type: contentType});
				  return blob;
				}						

				function fSuccess(oData, response) {
					that.setBusy(false);  //oViewModel.setProperty("/busy", false);
					var sError = oData.ActionGetFile.Error;
					if (!sError) {

						if (oAtta.Title.indexOf(".pdf") !== -1) {
							//var pdfWindow = window.open("");
							/*
							pdfWindow.document.write(
								"<title>"+oAtta.Title+"</title>" +
								"<iframe width='100%' height='100%' src='data:application/pdf;base64, " +
								encodeURI(oData.ActionGetFile.Content) + "'></iframe>"
							);
							*/

							const blob = b64toBlob(oData.ActionGetFile.Content, "application/pdf");
							const url = URL.createObjectURL(blob);						  
							//pdfWindow.document.write("<title>"+oAtta.Title+"</title><iframe width='100%' height='100%' src='" + url + "'></iframe>");
							
							var a = document.createElement('A');
							a.href = url;
							a.download = oAtta.Title;
							document.body.appendChild(a);
							a.click();
							document.body.removeChild(a);							

						} else {
							const blob = b64toBlob(oData.ActionGetFile.Content, "application/octet-stream");
							const url = URL.createObjectURL(blob);						  
						
							var a = document.createElement('A');
							a.href = url;
							a.download = oAtta.Title;
							document.body.appendChild(a);
							a.click();
							document.body.removeChild(a);	
						
						}						

					} else {
						sap.m.MessageBox.error(sError);						
					}
				}
				
				function fError(oError) {
					that.setBusy(false);  //oViewModel.setProperty("/busy", false);
                	var sDetail = $(oError.response.body).find('message').first().text();
                	sap.m.MessageBox.error(sDetail);
				}

				this.setBusy(true);  //oViewModel.setProperty("/busy", true);
				this.getView().getModel().callFunction("/ActionGetFile", {
					method: "GET",
					success: fSuccess,
					error: fError,
					urlParameters: {
						FormGuid: sFormGuid,
						FileId: oAtta.FileId,
						ApplicationId: oAtta.ApplicationId
					}
				});				
			},			
			
			executePostDocFile: function(sFormGuid, oAtta, callback ) {
				var oViewModel = this.getView().getModel("detailView");
				const oModel = this.getView().getModel();
				var that = this;
				
				this.setBusy(true);  //oViewModel.setProperty("/busy", true);

				
				try {
					fetch(oModel.sServiceUrl + "/AttachmentSet", {
						method: "POST",						
						headers: {
							"Content-Type": "application/octet-stream;base64",
							"form-guid": sFormGuid,
							"doc-line-id" : oAtta.LineId,
							"doc-filename": encodeURIComponent(oAtta.Filename),
							"x-csrf-token": oModel.getSecurityToken(),
							"accept": "application/json"
						},

						body: oAtta.File

					}).then(r => r.json()).then(j => {
						that.setBusy(false);  //oViewModel.setProperty("/busy", false);
						callback(j);
					})
				} catch(e) {
					that.setBusy(false);  //oViewModel.setProperty("/busy", false);
					console.log(e);
				} 
				


			},	
			
			setSelectedApprover: function() {
				var oTable = this.getView().byId("tableApprove");
				var oTableItems = oTable.getItems();
				var oModel = this.getView().getModel("Data");
				var nMaxRound = "00";

				for (var i = 0; i < oTableItems.length; i++) {
					var oCrtx = oTableItems[i].getBindingContext("Data");
				    var oApprover = oModel.getProperty(oCrtx.getPath() + "/");
					if (Number(oApprover.RoundNumber) > Number(nMaxRound) ) {
						nMaxRound = oApprover.RoundNumber; 
					}	
			    }

				for (var i = 0; i < oTableItems.length; i++) {
 					var oCrtx = oTableItems[i].getBindingContext("Data");
					var oApprover = oModel.getProperty(oCrtx.getPath() + "/");
					if (oApprover.Status === "" && oApprover.DateReceived && oApprover.RoundNumber === nMaxRound) {
						oTableItems[i].setHighlight("Success");
						oTableItems[i].setSelected(true);
						//return; //11/16/2023 Moskalskyi
					} else {
						oTableItems[i].setHighlight("None");
						oTableItems[i].setSelected(false);
					}
				}

			},		

			onActionApprove: function() {
				var that = this;
				var oViewModel = this.getView().getModel("detailView");
				var i18n = this.getView().getModel("i18n").getResourceBundle();

				function fSuccess(oData, response) {					
					var sError = oData.ActionApprove.Error;

					window.setTimeout(()=> {
						that.setBusy(false);
						if (!sError) {					
							sap.m.MessageToast.show(i18n.getText("msg_approve_success"));
							that.getRouter().navTo("master");
						} else {
							sap.m.MessageBox.error(sError);						
						}
					}, 2000);

				}
				
				function fError(oError) {
					that.setBusy(false);
					that.getRouter().navTo("master");
					//sap.m.MessageBox.error(oError);
											

					//var sDetail = 
					//if (oError.response && oError.response.body) {
                	//	var sDetail = $(oError.response.body).find('message').first().text();
                	
				}
				
				function fAfterFunction(that, sTextAreaContent) {
					var oCtx = that.getView().getBindingContext("Data");
					var sFormGuid = oCtx.getModel().getProperty( oCtx.getPath()+"/FormGuid");

					that.setBusy(true);
					that.getView().getModel().callFunction("/ActionApprove", {
						method: "POST",
						success: fSuccess,
						error: fError,
						urlParameters: {
							FormGuid: sFormGuid,
							Comment: sTextAreaContent 
						}
					});
				}
				
				this.openCommentaryDialog(this, "title_approve", false, true, "msg_approve_confirmation1", "placeholder1", fAfterFunction);
				this.setSelectedApprover();
			},
			
			onActionReject: function() {
				var that = this;
				var oViewModel = this.getView().getModel("detailView");
				var i18n = this.getView().getModel("i18n").getResourceBundle();

				function fSuccess(oData, response) {
					var sError = oData.ActionDeny.Error;

					window.setTimeout(()=> {
						that.setBusy(false);
						if (!sError) {
							sap.m.MessageToast.show(i18n.getText("msg_reject_success"));
							that.getRouter().navTo("master");
						} else {
							sap.m.MessageBox.error(sError);						
						}
					}, 2000);
				}
				
				function fError(oError) {
					that.setBusy(false);
                	var sDetail = $(oError.response.body).find('message').first().text();
                	sap.m.MessageBox.error(sDetail);
				}
				
				function fAfterFunction(that, sTextAreaContent) {
					var oCtx = that.getView().getBindingContext("Data");
					var sFormGuid = oCtx.getModel().getProperty( oCtx.getPath()+"/FormGuid");

					that.setBusy(true);
					that.getView().getModel().callFunction("/ActionDeny", {
						method: "POST",
						success: fSuccess,
						error: fError,
						urlParameters: {
							FormGuid: sFormGuid,
							Comment: sTextAreaContent 
						}
					});
				}
				
				this.openCommentaryDialog(this, "title_reject", true, true, "msg_reject_confirmation1", "placeholder2", fAfterFunction);
				this.setSelectedApprover();			
			},
			
		    openCommentaryDialog: function(that, sTitleId, bMandatory, bComment, sQuestion, sPlaceh, fAfterFunction) {
		
		        var i18n = that.getView().getModel("i18n").getResourceBundle();
		        var sTitle = i18n.getText(sTitleId);
		        var sOk = i18n.getText("ok");
		        var sCancel = i18n.getText("cancel");
		        var sPlaceholder = i18n.getText(sPlaceh);
		        var sQuest = i18n.getText(sQuestion);
		
		        var oTextArea = new sap.m.TextArea(//"submitDialogTextarea",
		        {
		          liveChange: function(oEvent) {
		            var sTextAreaContent = oEvent.getParameter('value').trim();
		            var parent = oEvent.getSource().getParent();
		            if (bMandatory){
		              parent.getBeginButton().setEnabled(sTextAreaContent.length > 1); // Je pozadovano zadani alespon 2 znaku
		            }
		            else{
		              parent.getBeginButton().setEnabled(true);
		            }
		          },
		          width: '100%',
		          placeholder: sPlaceholder
		      });
		      var oText = new sap.m.Text(//"submitDialogText",
		      {
		          text: sQuest
		      });
		
		      if (bComment){
		      var dialog = new sap.m.Dialog({
		                title: sTitle,
		                type: "Message",
		                content: [ oText, oTextArea ],
		                beginButton: new sap.m.Button({
		                               text: sOk,
		                               enabled: !bMandatory,
		                               press: function () {
		                                          var sTextAreaContent = oTextArea.getValue();
		                                                  dialog.close();
		                                                  fAfterFunction(that, sTextAreaContent);
		                                          }
		                }),
		                endButton: new sap.m.Button({
		                               text: sCancel,
		                               press: function () {
		                                                  dialog.close();
		                                          }
		                }),
		                afterClose: function() {
		                              dialog.destroy();
		                             }
		        });
		        }else{
		          var dialog = new sap.m.Dialog({
		                title: sTitle,
		                type: "Message",
		                content: [ oText ],
		                beginButton: new sap.m.Button({
		                               text: sOk,
		                               enabled: !bMandatory,
		                               press: function () {
		                                          var sTextAreaContent = oTextArea.getValue();
		                                                  dialog.close();
		                                                  fAfterFunction(that, sTextAreaContent);
		                                          }
		                }),
		                endButton: new sap.m.Button({
		                               text: sCancel,
		                               press: function () {
		                                                  dialog.close();
		                                          }
		                }),
		                afterClose: function() {
		                              dialog.destroy();
		                             }
		        });
		        }
		        dialog.open();
		   },
		   
			changeEditing: function() {
				var editable = this.getView().getModel("detailView").getProperty("/editable");
				this.getView().getModel("detailView").setProperty("/editable", !editable);			
			},

			onActionEdit: function() {
				this.changeEditing();
				this._refreshButtons();
			},

			onDokladyNewRow: function(oEvent) {
				if (!this._editDokladDialog) {
					this._editDokladDialog = new EditDokladDialog();
				}
				console.log(oEvent.getSource().getParent());
				const oTable = oEvent.getSource().getParent().getParent();
				const oBindingCtx = oTable.getBindingContext("Data");
				const oItemsContext = oTable.getBinding("items");
				const oModel = oBindingCtx.getModel();
				const sPath = oBindingCtx.getPath() + "/" + oItemsContext.getPath();
				let aDoklady = oModel.getProperty(sPath);
				if (aDoklady === null || aDoklady === undefined) {
					aDoklady = [];
					oModel.setProperty(sPath, aDoklady);
					
				}
				
				this._editDokladDialog.open(this.getView(), this).then((oData) => {					
					oData.CISLO_DOKLADU = aDoklady.length + 1;
					aDoklady.push(oData);
					oModel.refresh(true);
					this._saveForm();					
				});
				console.log(oModel.getProperty(sPath));
			},

			onDokladyEditRow: function(oEvent) {
				const oTable = oEvent.getSource().getParent().getParent();
				const selectedItem = oTable.getSelectedItem();
				const selectedItems = oTable.getSelectedItems();	
							

				if (selectedItems && selectedItems.length>1) {
					MessageBox.alert("Vyberte pouze jeden řádek na úpravu.");
					return;						
				}
				
				if (!selectedItem) {
					MessageBox.alert("Nevybrali jste žádný řádek na úpravu.");
					return;
				}				

				const oContext = selectedItem.getBindingContext("Data");

				if (!this._editDokladDialog) {
					this._editDokladDialog = new EditDokladDialog();
				}
			
				this._editDokladDialog.open(this.getView(), this, oContext.getObject()).then((oData) => {
					for (const property in oData) {
						oContext.getModel().setProperty(oContext.getPath()+"/"+property, oData[property]);
					}
					oContext.getModel().refresh(true);					
				});
			},

			onPolozkyNewRow: function(oEvent) {
				if (!this._editPolozkaDialog) {
					this._editPolozkaDialog = new EditPolozkaDialog();
				}
				const oTable = oEvent.getSource().getParent().getParent();
				const oBindingCtx = oTable.getBindingContext("Data");
				const oItemsContext = oTable.getBinding("items");
				const oModel = oBindingCtx.getModel();
				const sPath = oBindingCtx.getPath() + "/" + oItemsContext.getPath();
				let aPolozky = oModel.getProperty(sPath);
				if (aPolozky === null || aPolozky === undefined) {
					aPolozky = [];
					oModel.setProperty(sPath, aPolozky);
				}
			
				this._editPolozkaDialog.open(this.getView(), this).then((oData) => {
					console.log(oData);
					aPolozky.push(oData);
					oModel.refresh(true);
				});
			},

			onPolozkyEditRow: function(oEvent) {
				const oTable = oEvent.getSource().getParent().getParent();
				const selectedItem = oTable.getSelectedItem();
				const selectedItems = oTable.getSelectedItems();				

				if (selectedItems && selectedItems.length>1) {
					MessageBox.alert("Vyberte pouze jeden řádek na úpravu.");
					return;						
				}
				
				if (!selectedItem) {
					MessageBox.alert("Nevybrali jste žádný řádek na úpravu.");
					return;
				}				

				const oContext = selectedItem.getBindingContext("Data");

				if (!this._editPolozkaDialog) {
					this._editPolozkaDialog = new EditPolozkaDialog();
				}
			
				this._editPolozkaDialog.open(this.getView(), this, oContext.getObject()).then((oData) => {
					for (const property in oData) {
						oContext.getModel().setProperty(oContext.getPath()+"/"+property, oData[property]);
					}
					oContext.getModel().refresh(true);					
				});
			},


			onCopyRow: function(oEvent) {
				const oTable = oEvent.getSource().getParent().getParent();
				const selectedItems = oTable.getSelectedItems();
				const oItemsContext = oTable.getBinding("items");
				const oModel = oItemsContext.getModel();
				const sItemsPath = this.getView().getBindingContext("Data").getPath() + "/" +oItemsContext.getPath();

				if (selectedItems !== null && selectedItems.length > 0) {
					var array =  oModel.getProperty(sItemsPath);
					selectedItems.forEach(item => {
						var oEntry = item.getBindingContext("Data").getObject();
						array.push(this.deepCopy(oEntry));
					});
					oModel.refresh(true);

				} else {
					MessageBox.alert("Nezvolili jste žádný řádek.");
				}			
			},				

			onDeleteRow: function(oEvent) {
				const oTable = oEvent.getSource().getParent().getParent();
				const selectedItems = oTable.getSelectedItems();
				const oItemsContext = oTable.getBinding("items");
				const oModel = oItemsContext.getModel();
				const sItemsPath = this.getView().getBindingContext("Data").getPath() + "/" +oItemsContext.getPath();

				if (selectedItems !== null && selectedItems.length > 0) {

					for (let i=selectedItems.length-1; i>=0; i--) {
						let selectedItem = selectedItems[i];
						var sPath = selectedItem.getBindingContext("Data").getPath();
						var substrIndex = sPath.lastIndexOf("/");
						var index = Number(sPath.substr(substrIndex + 1));
						var array = oModel.getProperty(sItemsPath);
						array.splice(index, 1);
						oModel.setProperty(sItemsPath, array);
					}
					oModel.refresh(true);
					oTable.removeSelections();
				} else {
					MessageBox.alert("Nezvolili jste žádný řádek.");
				}			
			},		

			onDokladyCopyRow: function(oEvent) {
				const oTable = oEvent.getSource().getParent().getParent();
				const selectedItems = oTable.getSelectedItems();
				const oItemsContext = oTable.getBinding("items");
				const oModel = oItemsContext.getModel();
				const sItemsPath = this.getView().getBindingContext("Data").getPath() + "/" +oItemsContext.getPath();

				if (selectedItems !== null && selectedItems.length > 0) {
					var array =  oModel.getProperty(sItemsPath);
					selectedItems.forEach(item => {
						var oEntry = item.getBindingContext("Data").getObject();
						var oNewEntry = this.deepCopy(oEntry);
						oNewEntry.CISLO_DOKLADU = array.length + 1;
						oNewEntry.LINE_ID = 0;
						array.push(oNewEntry);
					});
					oModel.refresh(true);
					this._saveForm();	
				} else {
					MessageBox.alert("Nezvolili jste žádný řádek.");
				}			
			},				

			onDokladyDeleteRow: async function(oEvent) {
				const oTable = oEvent.getSource().getParent().getParent();
				const selectedItems = oTable.getSelectedItems();
				const oItemsContext = oTable.getBinding("items");
				const oModel = oItemsContext.getModel();
				const sItemsPath = this.getView().getBindingContext("Data").getPath() + "/" +oItemsContext.getPath();

				try {
					if (selectedItems !== null && selectedItems.length > 0) {

						for (let i=selectedItems.length-1; i>=0; i--) {
							let selectedItem = selectedItems[i];
							var oItemCtx = selectedItem.getBindingContext("Data");

							await this._deleteDocumentAttachment(oItemCtx);

							var sPath = oItemCtx.getPath();
							var substrIndex = sPath.lastIndexOf("/");
							var index = Number(sPath.substr(substrIndex + 1));
							var array = oModel.getProperty(sItemsPath);
							array.splice(index, 1);
							array.forEach((o,i) => {
								o.CISLO_DOKLADU = i+1;
							});
							oModel.setProperty(sItemsPath, array);
						}
						oModel.refresh(true);
						oTable.removeSelections();
					} else {
						MessageBox.alert("Nezvolili jste žádný řádek.");
					}			
				} catch (oErr) {					
				}
			},	

			onEditRow: function(oEvent) {
				var editDialogModel = new JSONModel({
					WAERS: "CZK"
				});
				this.setModel(editDialogModel, "editDialog");
				var oDialogModel = this.getView().getModel("editDialog");
				var oDataModel =  this.getView().getModel("Data");
				var selectedItem = this.getView().byId("DataTable").getSelectedItem();
				var selectedItems = this.getView().byId("DataTable").getSelectedItems();
				var that = this;
				var pressedButton = oEvent.getSource().getId();
				var dialogButtons = [];
				if (pressedButton.includes("editButton")) {
					if (selectedItems && selectedItems.length>1) {
						MessageBox.alert("Vyberte pouze jeden řádek na úpravu.");
						return;						
					}
					
					if(selectedItem !== null) {
						var Entry = selectedItem.getBindingContext("Data").getObject();
						oDialogModel.setProperty("/PERNR", Entry.PERNR);
						oDialogModel.setProperty("/PERSON", Entry.PERSON);
						oDialogModel.setProperty("/KOSTL", Entry.KOSTL);
						oDialogModel.setProperty("/WRBTR", Entry.WRBTR);
						oDialogModel.setProperty("/REASON", Entry.REASON);
						oDialogModel.setProperty("/WAERS", Entry.WAERS);
						var sumbit = new Button({
							text: "Potvrdit",
							tap: [submitChanges, that],
							type: sap.m.ButtonType.Accept
						});
						dialogButtons.push(sumbit);
					}
					else{
						MessageBox.alert("Nevybrali jste žádný řádek na úpravu.");
						return;
					}
				} else if(pressedButton.includes("copyButton") && selectedItems !== null) {
					var pathToModel = this.getView().getBindingContext("Data").getPath();
					var array =  oDataModel.getProperty(pathToModel + "/FormData/PERSON_REWARDS");

					selectedItems.forEach(item => {
						var Entry = item.getBindingContext("Data").getObject();
						array.push(Entry);
						oDataModel.setProperty(pathToModel + "/FormData/PERSON_REWARDS", array);	
					});
					this.getView().getModel("Data").refresh(true);
					return;

				}
				
				else {
					var add = new Button({
						text: "Přidat",
						tap: [addRow, that],
						type: sap.m.ButtonType.Accept
					});
					dialogButtons.push(add);
				}
				
					
				var validateRow = function(oRow) {
					var oViewCtx = this.getView().getBindingContext("Data");
					var oFormData = oViewCtx.getModel().getProperty( oViewCtx.getPath());

					oRow.KOSTL = null; //odvodi SAP

					var oDataToValidate = {
						FormGuid: oFormData.FormGuid,
						FormData: {
							PERSON_REWARDS: [
								oRow					
							]	
						}
					}
					return FormModel.validateFormInputs( oDataToValidate ).then( (newData) => {
						this.getView().getModel("editDialog").setProperty("/", newData.FormData.PERSON_REWARDS[0]);
					});						
				}.bind(this);

				function onSubmitInputValue() {
					validateRow(oDialogModel.getProperty("/"));
				}
					
				function submitChanges() {							
					validateRow(oDialogModel.getProperty("/")).then(()=> {
						var sPath = selectedItem.getBindingContext("Data").getPath();  
						oDataModel.setProperty(sPath, oDialogModel.getProperty("/"));

						var sPath = selectedItem.getCells()[0].getBindingContext("Data").getPath();  
						oDataModel.setProperty(sPath, this.getView().getModel("editDialog").getProperty("/"));
						this.getView().getModel("Data").refresh(true);
						cancelDialog();
					});
				}

				function addRow() {				
					validateRow(oDialogModel.getProperty("/")).then(()=> {
						var newRow = oDialogModel.getProperty("/"); 						
						var sPathToDataModel = this.getView().getBindingContext("Data").getPath();				
						var array = oDataModel.getProperty(sPathToDataModel + "/FormData/PERSON_REWARDS");
						if (!array) {
							array = [];
						}
						array.push(newRow);					
						oDataModel.setProperty(sPathToDataModel + "/FormData/PERSON_REWARDS", array);  					
						this.getView().getModel("Data").refresh(true);
						cancelDialog();
					});					
				}

				function getDialog() {
					return sap.ui.getCore().getElementById('pw');
				}

				function cancelDialog() {
					getDialog().close();
				}
				function onInputValueHelpRequestDialog(oEvent) {

					var oSource = oEvent.getSource();
	
					if (oSource.getId().indexOf("PersonID") !== -1) {
	
						if (!that._selectDialog) {
							if (!that._selectDialog) {
								that._selectDialog = new SelectTableODataDialog(that.getView(), "Osoba", "PERNR", [
									{header: "Os.č.", width: "10em"},
									{header: "Osoba"},
									{header: "Nákl.středisko", width: "10em"},
									{header: "NS (text)"}
		
								]);
							}							
						}
					} 

					that._selectDialog
						.setMultiSelect(false)
						.select()
						.done(oSelection => {  
							that.getView().getModel("editDialog").setProperty( "/PERNR", oSelection.Value);
							that.getView().getModel("editDialog").setProperty( "/PERSON", oSelection.Description);
							that.getView().getModel("editDialog").setProperty( "/KOSTL", oSelection.Param1);
						})
						.always(() => {
							that._selectDialog.destroy();
							delete that._selectDialog;                    
						});             
						
	
				}
	
					var cancel = new Button("cancel", {
						text: "Zavřít",
						tap: [cancelDialog, that],
						type: sap.m.ButtonType.Reject
					});
					dialogButtons.push(cancel);

					var oDialogEdit = new Dialog("pw", {
						id: "DialogEdit",
						resizable: true,
						contentWidth:'50%',
						contentHeight: '50%',
						buttons: dialogButtons,
						content: [new sap.ui.layout.form.SimpleForm({
							layout:sap.ui.layout.form.SimpleFormLayout.ResponsiveGridLayout	,
							editable:true,
							adjustLabelSpan:false,
							labelSpanXL:2,
							labelSpanL:4,
							labelSpanM:2,
							labelSpanS:4,
							content: [
								new Label({text: "Os.č"}),
								new Input({value: "{editDialog>/PERNR}", showValueHelp: true, valueHelpRequest:onInputValueHelpRequestDialog, id:"PersonID", submit: onSubmitInputValue}),
								new Label({text: "Osoba"}),
								new Input({value: "{editDialog>/PERSON}", editable: false}),
								new Label({text: "Č org.j./NS"}),
								new Input({value: "{editDialog>/KOSTL}", editable: false}),
								new Label({text: "Zdůvodnění"}),
								new sap.m.TextArea({value: "{editDialog>/REASON}", rows: 5}),
								new Label({text: "Částka"}),
								new Input({value: "{parts: [{path:'editDialog>/WRBTR'}, {path:'editDialog>/WAERS'}], type:'sap.ui.model.type.Currency'}", textAlign: sap.ui.core.TextAlign.End}),
							]
						})
	
						],
						afterClose: function () {
							oDialogEdit.destroy();
						}
					});
					that.getView().addDependent(oDialogEdit);
					oDialogEdit.open();
				
			},

	
			onInputValueHelpRequestDialog: function(oEvent) {

				var oSource = oEvent.getSource();

				try {
					if (this._selectDialog) {
						this._selectDialog.destroy();
						delete this._selectDialog; 
					}
				} catch (err) {}

				if (oSource.getId().indexOf("PersonID") !== -1) {

					if (!this._selectDialog) {
						this._selectDialog = new SelectSimpleODataDialog(this.getView(), "Osoba", "PERNR");
					}
				} else {
					if (!this._selectDialog) {
						this._selectDialog = new SelectSimpleODataDialog(this.getView(), "Nákladové středisko", "KOSTL");
					}
				}

				this._selectDialog
					.setMultiSelect(false)
					.select()
					.done(oSelection => {  
						this.getView().getModel("editDialog").setProperty("/PERNR", oSelection.Value);
						this.getView().getModel("editDialog").setProperty("/PERSON", oSelection.Description);
						this.getView().getModel("editDialog").setProperty("/KOSTL", oSelection.Param1);
					 })
					.always(() => {
						this._selectDialog.destroy();
						delete this._selectDialog;                    
					});             
					

			},

			onDataTableItemPress: function(oEvent) {
			/*	let oItem = oEvent.getParameter("listItem");
				if (oItem) {
					oItem.setSelected(!oItem.getSelected());
				}*/
			},

			onActionSave: function() {
				var oCtx = this.getView().getBindingContext("Data");
  				var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
				//var sFormGuid = oCtx.getModel().getProperty( oCtx.getPath()+"/FormGuid");

				FormModel.modifyForm(oCtx.getModel().getProperty( oCtx.getPath()))
					.then(result => {
						sap.m.MessageBox.success(oBundle.getText("changesSaved"));	
						this._refreshView().then(() => {
							var oCtx = this.getView().getBindingContext("Data");						
							var oSelectedItem = oCtx.getModel().getProperty( oCtx.getPath()+ "/FormData");
							var sItem = JSON.stringify(oSelectedItem);
							this.getView().getModel("Data").setProperty("/oldInfo", sItem);
							
						});
					})
					.fail(err => console.log(err));
		   	},

			_saveForm: function() {
				var save_result = new $.Deferred();
				var oCtx = this.getView().getBindingContext("Data");
				FormModel.modifyForm(oCtx.getModel().getProperty( oCtx.getPath()))
					.then(result => {
						this._refreshView().then(() => {
							var oCtx = this.getView().getBindingContext("Data");						
							var oSelectedItem = oCtx.getModel().getProperty( oCtx.getPath()+ "/FormData");
							var sItem = JSON.stringify(oSelectedItem);
							this.getView().getModel("Data").setProperty("/oldInfo", sItem);		
							save_result.resolve();					
						});
					})
					.fail(err => {
						console.log(err);
						save_result.reject(err);
					});
				return save_result;
		   	},
			onActionCancelWorkflow: function(){
				var that = this;
				var oViewModel = this.getView().getModel("detailView");
				var i18n = this.getView().getModel("i18n").getResourceBundle();

				function fSuccess(oData, response) {
					var sError = oData.ActionGenericDecision.Error;

					window.setTimeout(()=> {
						that.setBusy(false);
						if (!sError) {
							sap.m.MessageToast.show(i18n.getText("msg_cancel_worflow_success"));
							that.getRouter().navTo("master");
						} else {
							sap.m.MessageBox.error(sError);						
						}
					}, 2000);
				}
				
				function fError(oError) {
					that.setBusy(false);
                	var sDetail = $(oError.response.body).find('message').first().text();
                	sap.m.MessageBox.error(sDetail);
				}
				
				function fAfterFunction(that, sTextAreaContent) {
					var oCtx = that.getView().getBindingContext("Data");
					var sFormGuid = oCtx.getModel().getProperty( oCtx.getPath()+"/FormGuid");

					that.setBusy(true);
					that.getView().getModel().callFunction("/ActionGenericDecision", {
						method: "POST",
						success: fSuccess,
						error: fError,
						urlParameters: {
							FormGuid: sFormGuid,
							Action: 'CANCEL_WF',
							Comment: sTextAreaContent							
						}
					});
				}
				
				this.openCommentaryDialog(this, "title_cancel", false, true, "msg_cancel_worflow_confirmation1", "placeholder5", fAfterFunction);
				
			},
			onActionStartWorkflow: function() {
				var that = this;
				var oViewModel = this.getView().getModel("detailView");
				var oDataModel = this.getView().getModel("Data");
				var i18n = this.getView().getModel("i18n").getResourceBundle();
				var oCtx = this.getView().getBindingContext("Data");

				function fSuccess(oData, response) {
					that.setBusy(false);  //oViewModel.setProperty("/busy", false);
					var sError = oData.ActionStartWorkflow.Error;
					if (!sError) {
						sap.m.MessageToast.show(i18n.getText("msg_approve_request_success"));
						oViewModel.setProperty("/editable", false);
						that._refreshView();
					} else {
						sap.m.MessageBox.error(sError);						
					}
				}
				
				function fError(oError) {
					that.setBusy(false);  //oViewModel.setProperty("/busy", false);
                	var sDetail = $(oError.response.body).find('message').first().text();
                	sap.m.MessageBox.error(sDetail);
				}
				
				function fAfterFunction(that, sTextAreaContent) {		
					var oCtx = that.getView().getBindingContext("Data");
					var sFormGuid = oCtx.getModel().getProperty( oCtx.getPath()+"/FormGuid");

					that.setBusy(true);  //oViewModel.setProperty("/busy", true);
					that.getView().getModel().callFunction("/ActionStartWorkflow", {
						method: "POST",
						success: fSuccess,
						error: fError,
						urlParameters: {
							FormGuid: sFormGuid,
							Comment: sTextAreaContent 
						}
					});
				}

				function fOpenCommentary(that) {
					that.openCommentaryDialog(that, "title_approve_request", false, true, "msg_approve_request_confirmation1", "placeholder3", fAfterFunction);						
				}
				
				
				const rb = this.getView().getModel("i18n").getResourceBundle();
				var fCheckForm = function() {
					FormModel.checkForm( oCtx.getModel().getProperty( oCtx.getPath())).then( (oFormData) => {
						var aMessages = oFormData.MessageSet.results;
						if (aMessages.find(o => o.Type === 'E' || o.Type === 'A' || o.Type === 'X' || o.Type === 'W')) {
							if (!this._messageDialog) {
								this._messageDialog = new MessageDialog(this.getView());
							};
							this._messageDialog.show(aMessages, rb.getText("Input_check")).then(() => {
								fOpenCommentary(this);
							});
						} else {
							fOpenCommentary(this);
						}
					});
				}.bind(this);

				if (this.formChanged()) {
					var oCtx = this.getView().getBindingContext("Data");
					var oNewData = oCtx.getModel().getProperty( oCtx.getPath());
					FormModel.modifyForm(oNewData).then( () => {
						this._refreshView().then(() => {												
							var oSelectedItem = oCtx.getModel().getProperty( oCtx.getPath()+ "/FormData");
							var sItem = JSON.stringify(oSelectedItem);
							this.getView().getModel("Data").setProperty("/oldInfo", sItem);		
							fCheckForm();					
						});						
					});
				} else {
					fCheckForm();
				}
				this.setSelectedApprover();
			},

			onActionCheck: function() {
				var oCtx = this.getView().getBindingContext("Data");
				const rb = this.getView().getModel("i18n").getResourceBundle();

				FormModel.checkForm( oCtx.getModel().getProperty( oCtx.getPath())).then( (oCheckedData) => {
				/*	if (!this._messageDialog) {
						this._messageDialog = new MessageDialog(this.getView());
					};
					this._messageDialog.show(aMessages, rb.getText("Input_check"), true);
					*/

					this._refreshViewFromData(oCheckedData);
					if (!this._messageDialog) {
						this._messageDialog = new MessageDialog(this.getView());
					};
					this._messageDialog.show(oCheckedData.MessageSet.results, rb.getText("Input_check"), true);							
				});
			},
			
			onAction_RETURN_ZADATEL: function() {
				var that = this;
				var oViewModel = this.getView().getModel("detailView");
				var i18n = this.getView().getModel("i18n").getResourceBundle();

				function fSuccess(oData, response) {
					var sError = oData.ActionGenericDecision.Error;

					window.setTimeout(()=> {
						that.setBusy(false);
						if (!sError) {
							sap.m.MessageToast.show(i18n.getText("msg_return_success"));
							that.getRouter().navTo("master");
						} else {
							sap.m.MessageBox.error(sError);						
						}
					}, 2000);
				}
				
				function fError(oError) {
					that.setBusy(false);
                	var sDetail = $(oError.response.body).find('message').first().text();
                	sap.m.MessageBox.error(sDetail);
				}
				
				function fAfterFunction(that, sTextAreaContent) {
					var oCtx = that.getView().getBindingContext("Data");
					var sFormGuid = oCtx.getModel().getProperty( oCtx.getPath()+"/FormGuid");

					that.setBusy(true);
					that.getView().getModel().callFunction("/ActionGenericDecision", {
						method: "POST",
						success: fSuccess,
						error: fError,
						urlParameters: {
							FormGuid: sFormGuid,
							Action: 'RETURN_ZADATEL',
							Comment: sTextAreaContent							
						}
					});
				}
				
				this.openCommentaryDialog(this, "title_return", true, true, "msg_return_confirmation1", "placeholder4", fAfterFunction);								
			},		
			
			onAction_RETURN_ONESTEP: function() {
				var that = this;
				var oViewModel = this.getView().getModel("detailView");
				var i18n = this.getView().getModel("i18n").getResourceBundle();

				function fSuccess(oData, response) {
					var sError = oData.ActionGenericDecision.Error;

					window.setTimeout(()=> {
						that.setBusy(false);
						if (!sError) {
							sap.m.MessageToast.show(i18n.getText("msg_return_success"));
							that.getRouter().navTo("master");
						} else {
							sap.m.MessageBox.error(sError);						
						}
					}, 2000);
				}
				
				function fError(oError) {
					that.setBusy(false);
                	var sDetail = $(oError.response.body).find('message').first().text();
                	sap.m.MessageBox.error(sDetail);
				}
				
				function fAfterFunction(that, sTextAreaContent) {
					var oCtx = that.getView().getBindingContext("Data");
					var sFormGuid = oCtx.getModel().getProperty( oCtx.getPath()+"/FormGuid");

					that.setBusy(true);
					that.getView().getModel().callFunction("/ActionGenericDecision", {
						method: "POST",
						success: fSuccess,
						error: fError,
						urlParameters: {
							FormGuid: sFormGuid,
							Action: 'RETURN_ONESTEP',
							Comment: sTextAreaContent							
						}
					});
				}
				
				this.openCommentaryDialog(this, "title_return", true, true, "msg_return_confirmation1", "placeholder4", fAfterFunction);
				this.setSelectedApprover();								
			},			

			onInfoChanged: function() {
				this.getView().getModel("detailView").setProperty("/buttonSaveEnabled", this.formChanged());
			},

			onWaersChange: function(oEvent) {
				this.onInfoChanged();
				var oCtx = this.getView().getBindingContext("Data");
				console.log(oCtx);
				var value = oEvent.getSource().getValue();
			},

			formChanged: function() {
				var oldInfo = this.getView().getModel("Data").getProperty("/oldInfo");
				var index = this.getView().getModel("Data").getProperty("/formIndex");
				var oCurrent = this.getView().getModel("Data").getProperty("/Forms/" + index + "/FormData");
				return oldInfo !== JSON.stringify(oCurrent);
			},

			onDataTableSort: function() {
				var pDialog = this._dataTableSortSettingsDialogs;

				if (!this._dataTableSortSettingsDialogs) {
					this._dataTableSortSettingsDialogs = Fragment.load({
						id: this.getView().getId(),
						name: "zwf1.prozal02.view.DataTableSortSettingsDialog",
						controller: this
					});
				}
				
				this._dataTableSortSettingsDialogs.then(oDialog => {
					oDialog.open();
				});
			},

			onDataTableSortDialogConfirm: function(oEvent) {
				var oTable = this.byId("DataTable"),
					mParams = oEvent.getParameters(),
					oBinding = oTable.getBinding("items"),
					sPath,
					bDescending,
					aSorters = [];

				oTable.getColumns().forEach(col => {
					col.setSortIndicator(sap.ui.core.SortOrder.None);
				});

				sPath = mParams.sortItem.getKey();

				if (sPath) {
					bDescending = mParams.sortDescending;
					aSorters.push(new Sorter(sPath, bDescending));
					// apply the selected sort and group settings
					oBinding.sort(aSorters);			
					
					if (bDescending) {
						this.byId("dataTableColumn_"+sPath).setSortIndicator(sap.ui.core.SortOrder.Descending);
					} else {
						this.byId("dataTableColumn_"+sPath).setSortIndicator(sap.ui.core.SortOrder.Ascending);
					}
					
				} else {
					oBinding.sort(null);					
				}
				
			},
				
			onDokladyTableSort: function() {
				var pDialog = this._dokladyTableSortSettingsDialogs;

				if (!this._dokladyTableSortSettingsDialogs) {
					this._dokladyTableSortSettingsDialogs = Fragment.load({
						id: this.getView().getId(),
						name: "zwf1.prozal02.view.DokladyTableSortSettingsDialog",
						controller: this
					});
				}
				
				this._dokladyTableSortSettingsDialogs.then(oDialog => {
					oDialog.open();
				});
			},

			onDokladyTableSortDialogConfirm: function(oEvent) {
				var oTable = this.byId("DokladyTable"),
					mParams = oEvent.getParameters(),
					oBinding = oTable.getBinding("items"),
					sPath,
					bDescending,
					aSorters = [];

				oTable.getColumns().forEach(col => {
					col.setSortIndicator(sap.ui.core.SortOrder.None);
				});

				sPath = mParams.sortItem.getKey();

				if (sPath) {
					bDescending = mParams.sortDescending;
					aSorters.push(new Sorter(sPath, bDescending));
					// apply the selected sort and group settings
					oBinding.sort(aSorters);			
					
					if (bDescending) {
						this.byId("dokladyTableColumn_"+sPath.replace("/value","")).setSortIndicator(sap.ui.core.SortOrder.Descending);
					} else {
						this.byId("dokladyTableColumn_"+sPath.replace("/value","")).setSortIndicator(sap.ui.core.SortOrder.Ascending);
					}
					
				} else {
					oBinding.sort(null);					
				}
				
			},
			
			onPolozkyTableSort: function() {
				var pDialog = this._polozkyTableSortSettingsDialogs;

				if (!this._polozkyTableSortSettingsDialogs) {
					this._polozkyTableSortSettingsDialogs = Fragment.load({
						id: this.getView().getId(),
						name: "zwf1.prozal02.view.PolozkyTableSortSettingsDialog",
						controller: this
					});
				}
				
				this._polozkyTableSortSettingsDialogs.then(oDialog => {
					oDialog.open();
				});
			},

			onPolozkyTableSortDialogConfirm: function(oEvent) {
				var oTable = this.byId("PolozkyTable"),
					mParams = oEvent.getParameters(),
					oBinding = oTable.getBinding("items"),
					sPath,
					bDescending,
					aSorters = [];

				oTable.getColumns().forEach(col => {
					col.setSortIndicator(sap.ui.core.SortOrder.None);
				});

				sPath = mParams.sortItem.getKey();

				if (sPath) {
					bDescending = mParams.sortDescending;
					aSorters.push(new Sorter(sPath, bDescending));
					// apply the selected sort and group settings
					oBinding.sort(aSorters);			
					
					if (bDescending) {
						this.byId("polozkyTableColumn_"+sPath.replace("/value","")).setSortIndicator(sap.ui.core.SortOrder.Descending);
					} else {
						this.byId("polozkyTableColumn_"+sPath.replace("/value","")).setSortIndicator(sap.ui.core.SortOrder.Ascending);
					}
					
				} else {
					oBinding.sort(null);					
				}
				
			}
			

		});

		
	},


	

	
); 