sap.ui.define([
    'sap/ui/base/Object',
    "zwf1/prozal02/model/formatter",
	"sap/ui/model/json/JSONModel",
	"zwf1/prozal02/controller/SelectSimpleODataDialog",
	"zwf1/prozal02/controller/SelectTableODataDialog"
], function (BaseObject, formatter, JSONModel, SelectSimpleODataDialog, SelectTableODataDialog) {
    "use strict";
    return BaseObject.extend("zwf1.prozal02.controller.FormSelectionDialog", {
        formatter: formatter,

		_getDialog : function () {
			// create dialog lazily
			if (!this._oDialog) {
                // create dialog via fragment factory
                this._sPrefix = Date.now().toString(16); //create unique hex prefix
                this._oDialog = sap.ui.xmlfragment(this.oView.createId(this._sPrefix), "zwf1.prozal02.view.FormSelectionDialog", this);
			}
			return this._oDialog;
		},        

		open : async function (_oView, _oCallerController) {            
            this.oView = _oView;
            this.oCallerController = _oCallerController;                    
            this._dialogPromise = new $.Deferred();

			//var oViewModel = this.getModel("masterView");

            var oDialog = this._getDialog();
            
			// connect dialog to view (models, lifecycle)
            this.oView.addDependent(oDialog);           
            
            try {
                oDialog.open();
            } catch (oError) {
                this._dialogPromise.reject(oError);
            }
            
            return this._dialogPromise;        
        },
        
		onCloseDialog : function () {
			var oDialog = this._getDialog();
            oDialog.close();
			this.oView.removeDependent(oDialog);               
            this._dialogPromise.reject();
		},        

        getView : function() {
            return this.oView;
        },

        getCallerController : function() {
            return this.oCallerController;
        },

        getOwnerComponent : function() {
            return this.oCallerController.getOwnerComponent();
        },
		
        byId: function(sId) {
            return this.getView().byId( this._sPrefix + "--" +sId);
        },

		onInputValueLiveChange: function(oEvent) {

		},

		onInputValueHelpRequest: function(oEvent) {
			var oSource = oEvent.getSource();
			var oModel = this.getView().getModel("masterView");
			const rb = this.getView().getModel("i18n").getResourceBundle();	
			if (oSource.getId().indexOf("idInputVyplatitPernr") !== -1) {
				if (!this._selectDialog) {
					this._selectDialog = new SelectTableODataDialog(this.getView(), rb.getText("Osoba"), "PERNR", [
						{header: rb.getText("Pernr"), width: "10em"},
						{header: rb.getText("Osoba")},
						{header: rb.getText("NS"), width: "10em"},
						{header: rb.getText("NS_text")}

					]);
				}
			} else if (oSource.getId().indexOf("idInputKostl") !== -1) {
				if (!this._selectDialog) {
					this._selectDialog = new SelectSimpleODataDialog(this.getView(), rb.getText("NS"), "KOSTL");
				}
			} else if (oSource.getId().indexOf("idInputAufnr") !== -1) {
				if (!this._selectDialog) {
					this._selectDialog = new SelectSimpleODataDialog(this.getView(), rb.getText("Zdroj"), "AUFNR");
				}
			} else if (oSource.getId().indexOf("idInputPspnr") !== -1) {
				if (!this._selectDialog) {
					this._selectDialog = new SelectSimpleODataDialog(this.getView(), rb.getText("Prvek"), "PSPNR");
				}
			} else if (oSource.getId().indexOf("idInputVyplatitUname") !== -1) {
				if (!this._selectDialog) {
					this._selectDialog = new SelectSimpleODataDialog(this.getView(), rb.getText("Příjemce"), "UNAME");
				}
			}

			this._selectDialog
				.setMultiSelect(false)
				.select()
				.done(oSelection => {  
					if (oSource.getId().indexOf("idInputVyplatitPernr") !== -1) {
						oModel.setProperty( "/filters/VYPLATIT_PERNR", oSelection.Value.replace(/^0+/,""));
						oModel.setProperty( "/filters/VYPLATIT_OSOBA", oSelection.Description);
					} else if (oSource.getId().indexOf("idInputKostl") !== -1) {
						oModel.setProperty("/filters/KOSTL", oSelection.Value.replace(/^0+/,""));
						oModel.setProperty("/filters/KOSTL_TEXT", oSelection.Description);
					} else if (oSource.getId().indexOf("idInputAufnr") !== -1) {
						oModel.setProperty("/filters/AUFNR", oSelection.Value.replace(/^0+/,""));
						oModel.setProperty("/filters/AUFNR_TEXT", oSelection.Description);							
					} else if (oSource.getId().indexOf("idInputPspnr") !== -1) {
						oModel.setProperty("/filters/PSPNR", oSelection.Title);
						oModel.setProperty("/filters/PSP_TEXT", oSelection.Description);							
					}  else if (oSource.getId().indexOf("idInputVyplatitUname") !== -1) {
						oModel.setProperty("/filters/VYPLATIT_UNAME", oSelection.Title);
						oModel.setProperty("/filters/VYPLATIT_OSOBA", oSelection.Description);							
					}
				 })
				.always(() => {
					this._selectDialog.destroy();
					delete this._selectDialog;                    
				});             	
		},

		onInputValueChanged: function(oEvent) {

		},

		onInputValueSubmit: function(oEvent) {

		},

		onStatusSelectionFinish: function(oEvent) {
			var selectedItems = oEvent.getParameter("selectedItems");
			var aStatus = [];			
			selectedItems.forEach(o => {
				aStatus.push(o.getKey());
			});
			this.getView().getModel("masterView").setProperty("/filters/STATUS", aStatus);
		},

		onStartSearch: function() {
			this.getCallerController().refreshForms(); //.onRefresh();
			this.onCloseDialog();
		}

    })
});
