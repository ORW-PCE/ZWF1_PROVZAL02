sap.ui.define([
    'sap/ui/base/Object',
    "zwf1/prozal02/model/formatter",
	"sap/ui/model/json/JSONModel",
	"zwf1/prozal02/controller/SelectSimpleODataDialog",
	"zwf1/prozal02/controller/SelectTableODataDialog",
	"zwf1/prozal02/model/FormModel"
], function (BaseObject, formatter, JSONModel, SelectSimpleODataDialog, SelectTableODataDialog, FormModel) {
    "use strict";
    return BaseObject.extend("zwf1.prozal02.controller.EditPolozkaDialog", {
        formatter: formatter,

		_getDialog : function () {
			// create dialog lazily
			if (!this._oDialog) {
                // create dialog via fragment factory
                this._sPrefix = Date.now().toString(16); //create unique hex prefix
                this._oDialog = sap.ui.xmlfragment(this.oView.createId(this._sPrefix), "zwf1.prozal02.view.EditPolozkaDialog", this);
			}
			return this._oDialog;
		},        

		open : async function (_oView, _oCallerController, oOrigData) {            
            this.oView = _oView;
            this.oCallerController = _oCallerController;                    
            this._dialogPromise = new $.Deferred();

			//var oViewModel = this.getModel("masterView");

            var oDialog = this._getDialog();
            
			// connect dialog to view (models, lifecycle)
            this.oView.addDependent(oDialog);           
			
			var oViewCtx = this.oView.getBindingContext("Data");     
            
            let oData;            

            if (oOrigData) {
                oData = {
                    data: _oCallerController.deepCopy(oOrigData),
                    _mode: "edit"
                }  
            } else {
                oData = {
                    data: {
                        MATNR: null,
                        POLOZKA_TEXT: null,
                        WRBTR: 0,
                        WAERS: oViewCtx.getModel().getProperty( oViewCtx.getPath()+"/FormData/WAERS"),
                        KOSTL: null,
						KOSTL_TEXT: null,
                        PSPNR: null,
						PSPNR_TEXT: null,
                        AUFNR: null,
						AUFNR_TEXT: null,
						POLOZKA_TEXT: null

                    },
                    _mode: "create"
                }
            }
            let oModel = new JSONModel(oData);
            this.oView.setModel(oModel, "polozkaEdit");
            
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
			var oModel = this.getView().getModel("polozkaEdit");
            var rb = this.getView().getModel("i18n").getResourceBundle();

            if (oSource.getId().indexOf("idInputWaers") !== -1) {
				if (!this._selectDialog) {
					this._selectDialog = new SelectSimpleODataDialog(this.getView(), rb.getText("Měna"), "WAERS");
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
			} else if (oSource.getId().indexOf("idInputPolozkaText") !== -1) {
				if (!this._selectDialog) {
					this._selectDialog = new SelectSimpleODataDialog(this.getView(), rb.getText("Položka"), "ZWF1PZPOL");
				}
			}

			this._selectDialog
				.setMultiSelect(false)
				.select()
				.done(oSelection => {  
					if (oSource.getId().indexOf("idInputWaers") !== -1) {
						oModel.setProperty( "/data/WAERS", oSelection.Value);
					} else if (oSource.getId().indexOf("idInputKostl") !== -1) {
						oModel.setProperty( "/data/KOSTL", oSelection.Value);
					} else if (oSource.getId().indexOf("idInputAufnr") !== -1) {
						oModel.setProperty( "/data/AUFNR", oSelection.Value);
					} else if (oSource.getId().indexOf("idInputPspnr") !== -1) {
						oModel.setProperty( "/data/PSPNR", oSelection.Value);
					} else if (oSource.getId().indexOf("idInputPolozkaText") !== -1) {
						oModel.setProperty( "/data/MATNR", oSelection.Value);
						oModel.setProperty( "/data/POLOZKA_TEXT", oSelection.Description);
					} 
					this.onInputValueSubmit();
				 })
				.always(() => {
					this._selectDialog.destroy();
					delete this._selectDialog;                    
				});             	
		},

		onInputValueChanged: function(oEvent) {
		},

		onInputValueSubmit: function(oEvent) {				
			var oCtx = this.getView().getBindingContext("Data");
			var oData = oCtx.getProperty(oCtx.getPath());
			var oModel = this.getView().getModel("polozkaEdit");
			var oNewItem = oModel.getProperty("/data");

			//var oNewFormData = Object.assign({}, oData.FormData);
			var oNewFormData = {};
			oNewFormData.POLOZKY = [
				{
					WAERS: oNewItem.WAERS,
					WRBTR: oNewItem.WRBTR,
					KOSTL: oNewItem.KOSTL,
					PSPNR: oNewItem.PSPNR,
					AUFNR: oNewItem.AUFNR,
					MATNR: oNewItem.MATNR,
					TEXT_POLOZKY: oNewItem.TEXT_POLOZKY
				}
			];

			var oNewData = {
				FormGuid: oData.FormGuid,
				Status: oData.Status,
				FormData: oNewFormData
			}

			FormModel.validateFormInputs( oNewData ).then( (newData) => {
				oModel.setProperty( "/data", newData.FormData.POLOZKY[0]);
			});
		},		

        onAcceptDialog: function(oEvent) {
            let oModel = this.getView().getModel("polozkaEdit");
            let oData = oModel.getData();
            
			var oDialog = this._getDialog();
            oDialog.close();
			this.oView.removeDependent(oDialog);     

            this._dialogPromise.resolve(oData.data);
        }

    })
});
