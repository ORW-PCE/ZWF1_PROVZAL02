sap.ui.define([
	"zwf1/prozal02/controller/SelectSimpleDialog",
    "sap/ui/model/json/JSONModel",
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/model/Sorter',
    "sap/m/StandardListItem"
], function (SelectSimpleDialog, JSONModel, Filter, FilterOperator, Sorter, StandardListItem) {
	"use strict";

	return SelectSimpleDialog.extend("zwf1.prozal02.controller.SelectSimpleODataDialog", {

		constructor : function (oView, sTitle, sHelpId) {
            SelectSimpleDialog.prototype.constructor.call(this, oView, sTitle);
            this._sFragment = "zwf1.prozal02.view.SelectSimpleODataDialog";
            this._sHelpId = sHelpId;
            this._oItemTemplate = new StandardListItem({
                selected: "{selected}",
                title: "{Title}",
                description: "{Description}",
                type: "Active"                 
            });
		},


        onSearch: function(oEvent) {
            var oSource = oEvent.getSource();
            oSource.unbindAggregation("items");
            oSource.bindAggregation("items", {
                    path: '/ValueHelpSet',
                    filters: [new Filter( 'HelpId', FilterOperator.EQ, this._sHelpId)],
                    parameters: {
                        custom: {
                            search: oEvent.getParameter("value")
                        }
                    
                    },
                    template: this._oItemTemplate,
                    templateShareable: true                    
            });
        },

        _initModel: function(aData) {
            this._oDialog.setModel(this.getView().getModel());
        },

        getDefaultResultSet: function(aFilters, aFilterFunctions) {
            var aFiltersOdata = Object.assign([], aFilters);
            return this.getView().getModel().read("/ValueHelpSet", {
                filters: aFilters
            });
        },

		select : function () {
			var oView = this._oView;
            var promise = new $.Deferred();

            this._oPromise = promise;

            if (!this._oDialog) {
                this._oDialog = sap.ui.xmlfragment(oView.getId(), this._sFragment, this);
                oView.addDependent(this._oDialog);
                if (this._fnOnInit) {
                    this._fnOnInit();
                }
            }

            var oDialogModel = new JSONModel({
                title: this._sTitle,
                multiselect: this._bMultiSelect
            });              
            this._oDialog.setModel(oDialogModel, "dialogModel");            

            if (this._bMultiSelect) {
                this._oDialog.setMultiSelect(true);
            } else {
                this._oDialog.setMultiSelect(false);
            }

            var oList = this.getView().byId('idSelectSimpleDialog');
            oList.bindAggregation("items", {
                    path: '/ValueHelpSet',
                    filters: [new Filter( 'HelpId', FilterOperator.EQ, this._sHelpId)],
                    template: this._oItemTemplate,
                    templateShareable: true                    
            });

            this._oDialog.open();                        
                        
            return promise;
		},        

	});

});