sap.ui.define([
	"sap/ui/base/ManagedObject",
    "sap/ui/model/json/JSONModel",
    "zwf1/prozal02/model/formatter",
], function (ManagedObject, JSONModel, formatter) {
	"use strict";

	return ManagedObject.extend("zwf1.prozal02.controller.MessageDialog", {

        formatter: formatter,

		constructor : function (oView) {
			this._oView = oView;
            this._sFragment = "zwf1.prozal02.view.MessageDialog";
		},

		exit : function () {
            if (this._oDialog) {
                this._oView.removeDependent(this._oDialog);
                this._oDialog.setModel(null, "MessageModel");
                this._oDialog.destroy(true);
            }
            delete this._oDialog;            
			delete this._oView;
		},

		show : function (aMessages, sTitle, bDontShowContinue) {
            this._oPromise = new $.Deferred();
            this._sTitle = sTitle;    
            this._bDontShowContinue = bDontShowContinue;            

            if (!this._oDialog) {
                this._oDialog = sap.ui.xmlfragment(this._oView.getId(), this._sFragment, this);
                this._oView.addDependent(this._oDialog);
                this._initModel(aMessages);
                this._oDialog.open();                                                
            } else {
                this._initModel(aMessages);
                this._oDialog.open();   
            }

            return this._oPromise;
		},

        _initModel: function(aMessages) {
            var oDialogModel = new JSONModel({
                title: this._sTitle,
                messages: aMessages,
                hasError: !!aMessages.find(o => o.Type === 'E' || o.Type === 'A' || o.Type === 'X'),
                hasWarning: !!aMessages.find(o => o.Type === 'W'),
                hideContinue: this._bDontShowContinue               
            });            
            this._oDialog.setModel(oDialogModel, "MessageModel");            
        },

        /**
         * Uzavretie dialogu
         */
        close: function(bConfirm) {
            if (this._oDialog) {
                this._oDialog.close();
                //var oData = this._oDialog.getModel("MessageModel").getProperty("/");
                if (bConfirm) {
                    this._oPromise.resolve();
                } else {
                    this._oPromise.reject();
                }
            }
        },

        getDialog: function() {
            return this._oDialog;
        },

        getView: function() {
            return this._oView;
        },
        
        onClose: function(oEvent) {
            this.close(false);
        },

        onConfirm: function(oEvent) {
            this.close(true);
        }        

	});

});