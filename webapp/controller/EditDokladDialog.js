sap.ui.define([
    'sap/ui/base/Object',
    "zwf1/prozal02/model/formatter",
	"sap/ui/model/json/JSONModel",
	"zwf1/prozal02/controller/SelectSimpleODataDialog",
	"zwf1/prozal02/controller/SelectTableODataDialog"
], function (BaseObject, formatter, JSONModel, SelectSimpleODataDialog, SelectTableODataDialog) {
    "use strict";
    return BaseObject.extend("zwf1.prozal02.controller.EditDokladDialog", {
        formatter: formatter,

		_getDialog : function () {
			// create dialog lazily
			if (!this._oDialog) {
                // create dialog via fragment factory
                this._sPrefix = Date.now().toString(16); //create unique hex prefix
                this._oDialog = sap.ui.xmlfragment(this.oView.createId(this._sPrefix), "zwf1.prozal02.view.EditDokladDialog", this);
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
                    data: {
                        DATUM: {
                            value: oOrigData.DATUM.value ? new Date(oOrigData.DATUM.value.getTime()) : null,
                            type: "sap.ui.model.type.Date"
                        },
                        CISLO_DOKLADU: oOrigData.CISLO_DOKLADU,
                        TEXT_DOKLADU: oOrigData.TEXT_DOKLADU,
                        WRBTR: oOrigData.WRBTR,
                        WAERS: oOrigData.WAERS
                    },
                    _mode: "edit",
                    maxDate: new Date()
                }  
            } else {
                oData = {
                    data: {
                        DATUM: {
                            value: null,
                            type: "sap.ui.model.type.Date"
                        },
                        CISLO_DOKLADU: null,
                        TEXT_DOKLADU:null,
                        WRBTR: 0,
                        WAERS: oViewCtx.getModel().getProperty( oViewCtx.getPath()+"/FormData/WAERS")
                    },
                    _mode: "create",
                    maxDate: new Date()
                }
            }
            let oModel = new JSONModel(oData);
            this.oView.setModel(oModel, "dokladEdit");
            
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
			var oModel = this.getView().getModel("dokladEdit");
            
            if (oSource.getId().indexOf("idInputWaers") !== -1) {
				if (!this._selectDialog) {
					this._selectDialog = new SelectSimpleODataDialog(this.getView(), "Měna", "WAERS");
				}
			}

			this._selectDialog
				.setMultiSelect(false)
				.select()
				.done(oSelection => {  
					if (oSource.getId().indexOf("idInputWaers") !== -1) {
						oModel.setProperty( "/data/WAERS", oSelection.Value);
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

        onAcceptDialog: function(oEvent) {
            let oModel = this.getView().getModel("dokladEdit");
            let oData = oModel.getData();
            
			var oDialog = this._getDialog();
            oDialog.close();
			this.oView.removeDependent(oDialog);     

            this._dialogPromise.resolve(oData.data);
        }

    })
});
