sap.ui.define([
	"zwf1/prozal02/controller/SelectAbstractDialog",
    "sap/ui/model/json/JSONModel",
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/model/Sorter'
], function (SelectAbstractDialog, JSONModel, Filter, FilterOperator, Sorter) {
	"use strict";

	return SelectAbstractDialog.extend("zwf1.prozal02.controller.SelectSimpleDialog", {

		constructor : function (oView, sTitle) {
            SelectAbstractDialog.prototype.constructor.call(this, oView, sTitle);
            this._sFragment = "zwf1.prozal02.view.SelectSimpleDialog";
		},


        onSearch: function(oEvent) {
            var oBinding = oEvent.getParameter("itemsBinding");
            oBinding.filter(
                new Filter([
                    new Filter( 'title', FilterOperator.Contains, oEvent.getParameter("value")),
                    new Filter( 'description', FilterOperator.Contains, oEvent.getParameter("value"))    
                ], false));
        },

        _initModel: function(aData) {
            var oDialogModel = new JSONModel({
                title: this._sTitle,
                items: aData
            });            
            this._oDialog.setModel(oDialogModel);
        }

	});

});