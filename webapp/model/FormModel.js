sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], function (JSONModel, Filter, FilterOperator) {
    "use strict";

    return {

        oModel: null,
        nullGuid: "00000000-0000-0000-0000-000000000000",
        sapDateFormat: sap.ui.core.format.DateFormat.getDateInstance({
            pattern: "yyyyMMdd"
        }),     
        sapTimeFormat: sap.ui.core.format.DateFormat.getTimeInstance({
            pattern: "HHmmss"
        }),
        formType: 'PZ02',

        setModel: function (oModel) {
            this.oModel = oModel;
            this.oModel.setUseBatch(false);
        },

        _addSlashBeforePath: function (sPath) {
            if (!sPath.startsWith("/")) {
                return "/" + sPath;
            }
            return sPath;
        },

        /**
         *
         * @param {string} sCollection - nazov EntitySet-u
         * @param {object} oParameters - volitelny parameter ak je potreba zadefinovat filter,sorter a pod
         * @returns {Deferred}
         */
        getEntitySet: function (sCollection, oParameters) {
            var deferr = $.Deferred();

            if (oParameters === undefined)
                oParameters = {};

            var sPath = this._addSlashBeforePath(sCollection);

            this.oModel.read(sPath, {
                urlParameters: oParameters.urlParameters,
                filters: oParameters.filters,
                sorters: oParameters.sorters,
                success: deferr.resolve,
                error: deferr.reject
            });
            return deferr;
        },

        /**
         * Vrati 1 entitu
         * @param {string} sCollection - nazov entity
         * @param {object} oKey - kluc entity
         * @returns {Deferred} - promise object
         */
        getEntity: function (sCollection, oKey, oParameters) {
            var deferr = $.Deferred();

            var sKey = this._addSlashBeforePath(this.oModel.createKey(sCollection, oKey));

            this.oModel.read(sKey, {
                urlParameters: oParameters.urlParameters,
                success: deferr.resolve,
                error: deferr.reject
            });
            return deferr;
        },

        createEntity: function (sCollection, oData, mParameters) {
            var deferr = $.Deferred();
            var sPath = this._addSlashBeforePath(sCollection);

            this.oModel.create(sPath, oData, {
                success: deferr.resolve,
                error: deferr.reject
            });
            return deferr;
        },

        deleteEntity: function (sCollection, oKey) {
            var deferr = $.Deferred();

            var sKey = this._addSlashBeforePath(this.oModel.createKey(sCollection, oKey));

            this.oModel.remove(sKey, {
                success: deferr.resolve,
                error: deferr.reject
            });
            return deferr;
        },

        callFunction: function (sName, mParameters) {
            var deferr = $.Deferred();
            var oParams = Object.assign({}, mParameters);

            if (!oParams.success) {
                oParams.success = deferr.resolve
            }
            if (!oParams.error) {
                oParams.error = deferr.reject
            }

            this.oModel.callFunction(this._addSlashBeforePath(sName), oParams);
            return deferr;
        },

        getStream: function (sCollection, oKey) {
            var sKey = this._addSlashBeforePath(this.oModel.createKey(sCollection, oKey)+"/$value");
            return fetch(this.oModel.sServiceUrl+sKey);
        },

        getStreamUrl: function (sCollection, oKey) {
            var sKey = this._addSlashBeforePath(this.oModel.createKey(sCollection, oKey)+"/$value");
            return this.oModel.sServiceUrl+sKey;
        },

        getFormHeader: function (sUUID) {
            return this.getEntity('FormHeaderSet', {
                FormGuid: sUUID
            }, {});
        },

        getFormHeaderSet: function(oParameters) {
            var oParam = Object.assign({ }, oParameters);

            var oFormTypeFlt = new Filter("FormType", FilterOperator.EQ, this.formType);
            if (oParam.filters) {
                oParam.filters.push(oFormTypeFlt);
            }  else {
                oParam.filters = [oFormTypeFlt];
            }       

            return this.getEntitySet('FormHeaderSet', oParam);
        },

        getFormStatusSet: function(oParameters) {
            var oParam = Object.assign({ }, oParameters);

            var oFormTypeFlt = new Filter("FormType", FilterOperator.EQ, this.formType);
            if (oParam.filters) {
                oParam.filters.push(oFormTypeFlt);
            }  else {
                oParam.filters = [oFormTypeFlt];
            }       

            return this.getEntitySet('FormStatusSet', oParam);
        },

        getExpandedForm: function(sUUID) {
            var oParam = {
                urlParameters: '$expand=FormDataSet,CommentSet,ApproverSet,AttachmentSet,FormActionSet'
            };
            var result = new $.Deferred();

            this.getEntity('FormHeaderSet', {
                FormGuid: sUUID
            }, oParam).done(oResult => {
                oResult.CommentSet = oResult.CommentSet.results;
                oResult.FormData = this.mapFormData2UI(oResult.FormDataSet.results);
                oResult.ApproverSet = oResult.ApproverSet.results;    
                oResult.AttachmentSet = oResult.AttachmentSet.results;
                oResult.FormActionSet = oResult.FormActionSet.results;                                   
                result.resolve(oResult);            
            }).fail(err => result.reject(err));

            return result;
        },

        getExpandedFormSet: function(oParameters) {
            var oParam = Object.assign({ urlParameters: '$expand=FormDataSet,CommentSet,ApproverSet,AttachmentSet,FormActionSet' }, oParameters);
            var result = new $.Deferred();

            var oFormTypeFlt = new Filter("FormType", FilterOperator.EQ, this.formType);
            if (oParam.filters) {
                oParam.filters.push(oFormTypeFlt);
            }  else {
                oParam.filters = [oFormTypeFlt];
            }
            
            this.getEntitySet('FormHeaderSet', oParam).done(oResult => {
                var aDataMapped = oResult.results;
                aDataMapped.forEach(o => {
                    o.CommentSet = o.CommentSet.results;
                    o.FormData = this.mapFormData2UI(o.FormDataSet.results);
                    o.ApproverSet = o.ApproverSet.results;
                    o.AttachmentSet = o.AttachmentSet.results;    
                    o.FormActionSet = o.FormActionSet.results;                          
                });
                result.resolve(aDataMapped);
            }).fail(err => result.reject(err));
            
            return result;
        },    

        modifyForm: function(oData) {
            var oCrData = {
                FormGuid: oData.FormGuid ? oData.FormGuid : this.nullGuid,
                Status: oData.Status,
                ActualApprover: oData.ActualApprover,
                OrderNumber: oData.OrderNumber,
                CommentSet: oData.CommentSet,
                FormType: this.formType,             
                Request: this.Request,   
                Action: oData.Action,
                FormDataSet: this.mapUI2FormData(oData.FormData)
            }

            return this.createEntity("FormHeaderSet", oCrData);
        },

        checkForm: function(oData) {
            var oCrData = {
                FormGuid: oData.FormGuid ? oData.FormGuid : this.nullGuid,
                Status: oData.Status,
                ActualApprover: oData.ActualApprover,
                OrderNumber: oData.OrderNumber,
                Action: 'CHECK',
                FormType: this.formType,   
                CommentSet: oData.CommentSet,
                FormDataSet: this.mapUI2FormData(oData.FormData),
                Request: oData.Request,
                MessageSet: [],
                ApproverSet: []                    
            }

            var d = new $.Deferred();
            this.createEntity("FormHeaderSet", oCrData).then(oCheckedData => {
                //d.resolve(oCheckedData.MessageSet.results);
                d.resolve(oCheckedData);
            });

            return d;
        },

        validateFormInputs: function(oData) {
            var oCrData = {
                FormGuid: oData.FormGuid ? oData.FormGuid : this.nullGuid,
                Status: oData.Status,
                ActualApprover: oData.ActualApprover,
                OrderNumber: oData.OrderNumber,
                Action: 'CHECK',
                FormType: this.formType,   
                CommentSet: oData.CommentSet,
                FormDataSet: this.mapUI2FormData(oData.FormData),
                MessageSet: []
            }

            var d = new $.Deferred();
            this.createEntity("FormHeaderSet", oCrData).then(oCheckedData => {
                oCheckedData.CommentSet = oCheckedData.CommentSet.results;
                oCheckedData.FormData = this.mapFormData2UI(oCheckedData.FormDataSet.results);
                oCheckedData.ApproverSet = oCheckedData.ApproverSet.results;
                oCheckedData.AttachmentSet = oCheckedData.AttachmentSet.results;                    
                d.resolve(oCheckedData);
            });

            return d;
        },

        copyForm: function(oForm) {
			var oNewData = {
	            FormGuid: this.nullGuid,
                FormType: this.formType,   
			    CommentSet: [],
			    ApproverSet: [],
                FormType: oForm.FormType,
                FormData: oForm.FormData,
                Action: 'COPY'
            };

			return this.modifyForm(oNewData);
        }, 

        deleteForm: function(sUUID) {
            return this.deleteEntity('/FormHeaderSet', {
                FormGuid: sUUID
            });
        },
                
        mapFormData2UI: function(aFormData) {
            var struct = {};
            var tab_re = /(.+)-(.+)\[(\d+)\]$/;
            for (var i=0; i<aFormData.length; i++) {
                var oTabMatch = aFormData[i].FieldName.match(tab_re);
                var oStruct =  null;
                var sField = null;

                if (oTabMatch) {
                    //table, TAB-FIELD[1]
                    var tabName = oTabMatch[1];
                    var tabField = oTabMatch[2];
                    var tabIndex = Number(oTabMatch[3]) - 1;

                    if (!struct[tabName]) {
                        struct[tabName] = [];
                    }

                    var aTable = struct[tabName];
                    if (!aTable[tabIndex]) {
                        aTable[tabIndex] = {};
                    }

                    oStruct = aTable[tabIndex];
                    sField = tabField;
                    
                } else {
                    //field, FIELD
                    oStruct = struct;
                    sField = aFormData[i].FieldName;
                }

                if (aFormData[i].FieldValue) {
                    switch( aFormData[i].FieldType ) {
                        case 'D': 
                            oStruct[sField] = {
                                value: aFormData[i].FieldValue === "00000000" ? null : this.sapDateFormat.parse(aFormData[i].FieldValue),
                                type: 'sap.ui.model.type.Date'
                            }; 
                            break;
                        case 'T': 
                            oStruct[sField] = {
                                value: this.sapTimeFormat.parse(aFormData[i].FieldValue),
                                type: 'sap.ui.model.type.Time'
                            }; 
                            break;
                        case 'I': 
                        case 'P':
                            oStruct[sField] = Number(aFormData[i].FieldValue);
                            break;                        
                        case 'B': 
                            oStruct[sField] = !!aFormData[i].FieldValue;
                            break;
                        default:                             
                            oStruct[sField] = aFormData[i].FieldValue;
                    }
                } else {
                    oStruct[sField] = null;
                }

            }

            return struct;

        },

        fillFormDataProperty: function(sUUID, sProp, oValue) {
            var oFormData = {
                FormGuid: sUUID,
                FieldName: sProp
            };

            var type = typeof oValue;

            switch (type) {
                case 'boolean':
                    oFormData.FieldValue =  oValue ? "X" : "";
                    break;
                case 'number':
                    oFormData.FieldValue = ""+oValue;           
                    break; 
                case 'object':
                    if (oValue && oValue.type) {
                        switch (oValue.type) {
                            case 'sap.ui.model.type.Date':
                                oFormData.FieldValue = this.sapDateFormat.format( oValue.value );
                                break;
                            case 'sap.ui.model.type.Time':
                                oFormData.FieldValue = this.sapTimeFormat.format( oValue.value );        
                                break;
                            default:                            
                        }
                    } 
                    break;
                default:
                    oFormData.FieldValue =  oValue;
            }

            return oFormData;
        },

        mapUI2FormData: function(oStruct) {
            var aFormData = [];

            function pad(num, size) {
                var s = "000000000" + num;
                return s.substr(s.length-size);
            }

            for (const property in oStruct) {
                const val = oStruct[property];
                if (Array.isArray(val)) {

                    for (var i=0; i<val.length; i++) {
                        for (const tabProp in val[i]) {
                            aFormData.push( this.fillFormDataProperty( this.nullGuid, property+"-"+tabProp+"["+(i+1)+"]", val[i][tabProp]));
                        }
                    }

                } else {
                    aFormData.push(this.fillFormDataProperty( this.nullGuid, property, val));
                }
            }
            return aFormData;
        },

        getFormDataTemplateObject: function(sFormType, bWithTables) {
            var d = new $.Deferred();
            this.callFunction('GetFormDataTemplate', {
                urlParameters: {
                    FormType: sFormType,
                    WithTables: bWithTables
                }
            }).fail(d.reject).done(
                r => {
                    d.resolve(this.mapFormData2UI(r.results));
                });          
            return d;  
        }



    };

}
);