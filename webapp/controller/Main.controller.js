/* eslint-env es6 */
/* eslint no-console: 0, no-warning-comments: 0, no-unused-vars: 0 */

const dbg = {}; // debug object

sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/ColumnListItem",
	"sap/m/Text",
	"sap/m/Input",
	"sap/m/DatePicker",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/export/Spreadsheet",
    "../util/CaseInsensitiveFilter",
	"../model/Formatter",
	"../util/FragmentManager",
	"../util/MessageHelper"
], function (
	Controller,
	JSONModel,
	ColumnListItem,
	Text,
	Input,
	DatePicker,
	Filter,
	FilterOperator,
	Spreadsheet,
	CaseInsensitiveFilter,
	Formatter,
	FragmentManager,
	MessageHelper
) {
	"use strict";

	const addUserFragment = "training.usermanager.view.fragment.AddUser";
	var fragmentManager, message, model, table;
	const formatter = Formatter;
	const groupId = "batch";

	const userRegex = {
		key: /\d/,
		name: /^.{1,100}$/,
		surname: name
	};

	const readonlyColumns = new ColumnListItem({
		cells: [
			new Text({
				text: "{UserManager>Key}"
			}),
			new Text({
				text: "{UserManager>Name}"
			}),
			new Text({
				text: "{UserManager>Surname}"
			}),
			new Text({
				text: {
				    path: "UserManager>Birthday",
				    formatter: formatter.formatDate
				}
			})
		]
	});

	const editableColumns = new ColumnListItem({
		cells: [
			new Text({
				text: "{UserManager>Key}"
			}),
			new Input({
				value: "{UserManager>Name}"
			}),
			new Input({
				value: "{UserManager>Surname}"
			}),
			new DatePicker({
				value: {
				    path: "UserManager>Birthday",
				    formatter: formatter.formatDate
				},
				valueFormat: "dd/MM/yyyy",
				displayFormat: "dd/MM/yyyy"
			})
		]
	});

	var editing = false;

	return Controller.extend("training.usermanager.controller.Main", {

		formatter,

		onInit: function () {
			model = this.getView().getModel("UserManager");
			model.setDeferredGroups([groupId]);
			fragmentManager = new FragmentManager(this);
			message = new MessageHelper(this);
			table = this.byId("table");

			// console variables
			dbg.controller = this;
			dbg.model = model;
			dbg.fragmentManager = fragmentManager;
			dbg.table = table;
		},

		/** Called upon "editButton" press */
		onEditButtonPress: function () {
			this._toggleEditableTable();
		},

		/** Called upon "addButton" press */
		onAddButtonPress: function () {
			const fragment = fragmentManager.open(addUserFragment);
			fragment.setModel(new JSONModel());
		},

		/** Called upon "saveButton" press */
		onSaveButtonPress: function () {
		    const that = this;
		    
		    // get the users through the table cells
		    const users = table.getItems().map(row => {
		        const cells = row.getCells();
		        const property = (index) => cells[index].getProperty("value");
		        return {
		            Key: cells[0].getProperty("text"),
		            Name: property(1),
		            Surname: property(2),
		            Birthday: formatter.parseDate(property(3))
		        };
		    });   
		    
		    // TODO only update modified users
		    this._updateUsers(users);
		},
		
		/** Called upon "removeButton" press */
		onRemoveButtonPress: function () {
		    const selectedUsers = table
		        .getSelectedItems()
		        .map(it => it.getBindingContext("UserManager").getObject());

		    table.removeSelections(true);
            this._deleteUsers(selectedUsers);
		},

		/** Called upon "cancelButton" press */
		onCancelButtonPress: function () {
			this._toggleEditableTable();
		},

		/** Called upon "saveUserButton" press of the "AddUser" fragment */
		onSaveUserButtonPress: function () {
			const newUser = fragmentManager.get(addUserFragment).getModel().getData();
			this._validateUser(newUser);
			this._createUser(newUser);
		},

		/** Called upon "cancelUserButton" press of the "AddUser" fragment */
		onCancelUserButtonPress: function () {
			fragmentManager.closeAndDestroy(addUserFragment);
		},
		
		/** Called when the table selection changes */
		onSelectionChange: function () {
		    this.byId("removeButton").setVisible(table.getSelectedItems().length > 0);
		},
		
		/** Called when the user performs a search */
		onFilter: function () {
		    table.getBinding("items").filter(this._getFilters());
		},
		
		onExportButtonPress: function () {
		    this._export();
		},
		
		/** Creates filters based on the value of the search bar */
		_getFilters: function () {
		    const query = this.byId("searchBar").getValue().trim();
		    let filters = [];
		    let and = false;
		    
		    if (query) {
    		    const intQuery = parseInt(query, 0);
    	        if (intQuery) filters.push(new Filter("Key", FilterOperator.EQ, query));
		        filters.push(new CaseInsensitiveFilter("Name", FilterOperator.Contains, query));
		        filters.push(new CaseInsensitiveFilter("Surname", FilterOperator.Contains, query));
		    }
	        
		    return query ? new Filter({and, filters}) : [];
		},

		_toggleEditableTable: function () {
			editing = !editing;
			this._bindTable(editing);
			this.byId("editButton").setVisible(!editing);
			this.byId("saveButton").setVisible(editing);
			this.byId("cancelButton").setVisible(editing);
		},

		_bindTable: function (editable) {
			table.bindItems({
				path: "UserManager>/user",
				template: editable ? editableColumns : readonlyColumns,
				filters: this._getFilters()
			});
		},

		/** Adds a new user to the database */
		_createUser: function (user) {
			model.create("/user", user, {
				async: true,

				success: function () {
					fragmentManager.closeAndDestroy(addUserFragment);
					message.showToast("userCreated");
				},

				error: function () {
					message.showError("error", "userFailed");
				}
			});
		},
		
		/** Updates the given users in the database */
		_updateUsers: function (users) {
		    const that = this;
		    for (const user of users)
		        model.update(`/user(${user.Key})`, user, {groupId});
		        
	        model.submitChanges({
	            async: true,
	            groupId,
	            
	            success: function (data, res) {
	                message.showToast("usersUpdated");
	                that._toggleEditableTable();
	            },
	            
	            error: function () {
	                message.showError("usersUpdateFailed");
	            }
	        });
		},
		
		/** Deletes the given users from the database */
		_deleteUsers: function (users) {
	        for (const user of users)
	            model.remove(`/user(${user.Key})`, {groupId});
	            
            model.submitChanges({
                async: true,
                groupId,
                
                success: function (data, res) {
                    message.showToast("usersDeleted");
                },
                
                error: function () {
                    message.showError("usersDeleteFailed");
                }
            });
		},

		/** Validates the user inputs */
		_validateUser: function (user) {
			user.Birthday = formatter.parseDate(user.Birthday);
			// TODO
		},
		
		/** Exports the users to an XML file */
		_export: function () {
		    const spreadsheet = new Spreadsheet({
		        worker: true,
		        fileName: "users.xlsx",
		        workbook: {
		            columns: [{
		                label: "Key",
		                property: "Key"
		            }, {
		                label: "Name",
		                property: "Name"
		            }, {
		                label: "Surname",
		                property: "Surname"
		            }, {
		                label: "Birthday",
		                property: "Birthday",
		                type: sap.ui.export.EdmType.Date
		            }]
		        },
		        dataSource: {
		            type: "odata",
		            serviceUrl: model.sServiceUrl,
		            headers: model.getHeaders(),
		            dataUrl: table.getBinding("items").getDownloadUrl(),
    		        count: 10000
		        }
		    });
		    
		    spreadsheet.build()
		        .then(() => message.showToast("exported"))
		        .catch((err) => {
		            if (err.includes("Export cancelled")) return;
		            console.error(err);
		            message.showError("error", "exportFailed");
		        });
		}
	});
});