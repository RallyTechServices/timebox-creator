Ext.define("timebox-creator", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'selector_box', layout: 'hbox', dock: 'top'},
        {xtype:'container',itemId:'grid_box'}
    ],

    integrationHeaders : {
        name : "timebox-creator"
    },

    overflowX: 'hidden',
    overflowY: 'auto',
                        
    launch: function() {

        this.projectUtility = Ext.create('CA.agile.technicalservices.util.ProjectUtility', {
            listeners: {
                ready: this._updateProjectButtonStatus,
                fetcherror: this.showErrorNotification,
                scope: this
            }
        });
        this._addSelectors();

    },

    _addSelectors: function(){
        var selectorBox = this.down('#selector_box');

        selectorBox.removeAll();
        selectorBox.add({
            xtype: 'rallycombobox',
            itemId: 'timeboxType',
            fieldLabel: '<b>New</b>',
            labelWidth: 35,
            labelAlign: 'right',
            labelCls: 'timebox-label',
            margin: 5,
            store: Ext.create('Ext.data.Store', {
                data: [{
                    name: 'Iteration',
                    value: 'iteration'
                },{
                    name: 'Release',
                    value: 'release'
                }],
                fields: ['name','value']
            }),
            value: 'iteration',
            displayField: 'name',
            valueField: 'value',
            listeners: {
                change: this._updateAddStatus,
                scope: this,
                select: this._buildGrid
            }
        });

        selectorBox.add({
            xtype: 'rallytextfield',
            emptyText: 'Name',
            margin: 5,
            maxLength: 256,
            width: 200,
            height: 22,
            itemId: 'timeboxName',
            listeners: {
                change: this._updateAddStatus,
                scope: this
            }
        });

        selectorBox.add({
            xtype: 'rallydatefield',
            margin: 5,
            emptyText: 'Start Date',
            itemId: 'timeboxStart',
            listeners: {
                change: this._updateAddStatus,
                scope: this
            }
        });

        //todo: add validators to start and end date
        selectorBox.add({
            xtype: 'rallydatefield',
            emptyText: 'End Date',
            margin: 5,
            itemId: 'timeboxEnd',
            listeners: {
                change: this._updateAddStatus,
                scope: this
            }
        });

        selectorBox.add({
            xtype: 'rallybutton',
            margin: '5 0 5 5',
            text: 'Select Projects',
            itemId: 'projectButton',
            disabled: true,
            cls: 'secondary rly-small',
            listeners: {
                click: this._selectProjects,
                scope: this
            }
        });

        var clearButton = selectorBox.add({
            xtype: 'rallybutton',
            margin: '5 0 5 0',
            text: 'Clear',
            itemId: 'clearProjectButton',
            visible: false,
            cls: 'secondary rly-small clear-button',
            listeners: {
                click: this._updateSelectedProjects,
                scope: this
            }
        });
        clearButton.setVisible(false);

        selectorBox.add({
            xtype: 'rallybutton',
            itemId: 'addButton',
            margin: '5 10 5 10',
            text: 'Add',
            disabled: true,
            listeners: {
                click: this._addTimeboxes,
                scope: this
            }
        });

        this._buildGrid();

    },
    _updateProjectButtonStatus: function(){
        this.down('#projectButton').setDisabled(false);
    },
    _updateAddStatus: function(){
        this.logger.log('_updateAddStatus');

        var timeboxAttributes = this._getTimeboxAttributes(),
            type = this.getTimeboxType();

        var enabled = false;
        if (type === 'release'){
            enabled = timeboxAttributes.Name && timeboxAttributes.ReleaseStartDate && timeboxAttributes.ReleaseDate &&
                (timeboxAttributes.ReleaseStartDate < timeboxAttributes.ReleaseDate) || false;
        } else {
            enabled = timeboxAttributes.Name && timeboxAttributes.StartDate && timeboxAttributes.EndDate
                && (timeboxAttributes.StartDate < timeboxAttributes.EndDate) || false;
        }
        this.down('#addButton').setDisabled(!enabled);
    },
    _getTimeboxAttributes: function(){

        var obj = {
            Name: this.down('#timeboxName') && this.down('#timeboxName').getValue() || null
        };

        if (this.getTimeboxType() === 'release'){
            obj.ReleaseStartDate = this.down('#timeboxStart') && this.down('#timeboxStart').getValue() || null;
            obj.ReleaseDate = this.down('#timeboxEnd') && this.down('#timeboxEnd').getValue() || null;
        } else {
            obj.StartDate = this.down('#timeboxStart') && this.down('#timeboxStart').getValue() || null;
            obj.EndDate = this.down('#timeboxEnd') && this.down('#timeboxEnd').getValue() || null;
        }
        return obj;
    },
    getTimeboxProjects: function(){
        if (!this.selectedProjects || this.selectedProjects.length === 0){
            return this.projectUtility.getProjectsInHierarchy(this.getContext().getProject().ObjectID);
        }
        return this.selectedProjects;
    },
    _selectProjects: function(){
        this.logger.log('_selectProjects');

        var height = Ext.getBody().getViewSize().height,
            width = Ext.getBody().getViewSize().width;

        var dlg = Ext.create('CA.agile.technicalservices.util.dialog.ProjectPicker', {
            projectRoot: this.projectUtility.getProjectRoot(this.getContext().getProject().ObjectID),
            height: height,
            listeners: {
                projectsselected: this._updateSelectedProjects,
                scope: this
            }
        });
        dlg.alignTo(Ext.getBody(), "t-t");

    },
    _updateSelectedProjects: function(ctl, selectedProjects){
        this.logger.log('_updateSelectedProjects', selectedProjects);
        if (ctl.itemId === 'clearProjectButton'){
            selectedProjects = null;
        }

        this.selectedProjects = selectedProjects && selectedProjects.__include || [];

        if (this.selectedProjects.length > 0){
            this.down('#projectButton').setText(this.selectedProjects.length + ' Projects');
            this.down('#projectButton').removeCls('secondary');
            this.down('#projectButton').addCls('primary');
            this.down('#projectButton').addCls('selected-button');
            this.down('#clearProjectButton').setVisible(true);
        } else {
            this.down('#projectButton').setText('Select Projects');
            this.down('#projectButton').removeCls('primary');
            this.down('#projectButton').addCls('secondary');
            this.down('#projectButton').removeCls('selected-button');
            this.down('#clearProjectButton').setVisible(false);
        }
    },
    _addTimeboxes: function(){
        var timeboxAttributes = this._getTimeboxAttributes(),
            promises = [];

        var projects = Ext.Array.unique(this.getTimeboxProjects());
        this.logger.log('_addTimeboxes', projects, timeboxAttributes);

        this.setLoading('Creating timeboxes...');
        Rally.data.ModelFactory.getModel({
            type: this.getTimeboxType(),
            success: function(timeboxModel) {
                var field = timeboxModel.getField('Project');
                field.readOnly = false;
                field.persist = true;

                Ext.Array.each(projects, function(p){
                    promises.push(this._createTimebox(timeboxModel, p, timeboxAttributes));
                }, this);

                Deft.Promise.all(promises).then({
                    success: this.showSuccess,
                    failure: this.showErrorNotification,
                    scope: this
                }).always(function(){
                    this.setLoading(false);
                    this._buildGrid();
                }, this);
            },
            scope: this
        });
    },
    _createTimebox: function(timeboxModel, projectObjectID, attributes){
        var deferred = Ext.create('Deft.Deferred');

        var fields = Ext.clone(attributes);
        fields.Project = { _ref: '/project/' + projectObjectID };
        fields.State = "Planning";

        this.logger.log('_createTimebox', fields);
        var record = Ext.create(timeboxModel, fields);
        record.save({
            callback: function(result, operation){
                if (operation.wasSuccessful()){
                    deferred.resolve(result);
                } else {
                    deferred.resolve(operation.error.errors.join(','));
                }
            }
        });
        return deferred.promise;
    },
    showSuccess: function(results){
        this.logger.log('showSuccess', results);
        var failures = [],
            timeboxesCreated = 0;
        Ext.Array.each(results, function(r){
            if (Ext.isString(r)){
                if (!Ext.Array.contains(failures, r)){
                    failures.push(r);
                }
            } else {
                timeboxesCreated++;
            }
        });

        var msg = Ext.String.format("{0} of {1} timeboxes created successfully.", timeboxesCreated, results.length);
        if (timeboxesCreated < results.length){
            msg += Ext.String.format("<br/><br/>{0} timeboxes were not created for the following reason(s): <br/>", results.length - timeboxesCreated);
            msg += failures.join('<br/>');
            this.logger.log('ShowWarning ', msg);
            Rally.ui.notify.Notifier.showWarning({message: msg, allowHTML: true});
        } else {
            Rally.ui.notify.Notifier.show({message: msg});
        }
    },
    showErrorNotification: function(msg){
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    _buildGrid: function(){

        if (this.down('rallygridboard')){
            this.down('rallygridboard').destroy();
        }

        this.logger.log('_buildGrid timeboxType:', this.getTimeboxType());
        if (!this.getTimeboxType()){
            return;
        }

        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: [this.getTimeboxType()],
            autoLoad: true,
            enableHierarchy: false
        }).then({
            success: this._addGrid,
            scope: this
        });
    },
    _addGrid: function(store){

        var models = [this.getTimeboxType()];

        var selectorBoxHeight = this.down('#selector_box') && this.down('#selector_box').getHeight() || 0,
            height = this.getHeight(),
            gridHeight = height - selectorBoxHeight - 40; //subtract the paging toolbar height and margins

        this.logger.log('_addGrid height, timeboxType', height, models, selectorBoxHeight, gridHeight);

        var gridboardStateId=  models[0] + '-gbs';

        this.logger.log('gridboardStateId', gridboardStateId);
        this.add({
            xtype: 'rallygridboard',
            context: this.getContext(),
            modelNames: models,
            toggleState: 'grid',
            stateId: gridboardStateId,
            stateful: true,
            plugins: [{
                ptype: 'rallygridboardinlinefiltercontrol',
                inlineFilterButtonConfig: {
                    stateful: true,
                    stateId: models[0] + '-filter',
                    modelNames: models,
                    inlineFilterPanelConfig: {
                        quickFilterPanelConfig: {
                            defaultFields: [
                                'Name',
                                'Project'
                            ]
                        }
                    }
                }
            },{
                ptype: 'rallygridboardfieldpicker',
                headerPosition: 'left',
                modelNames: models,
                stateful: true,
                stateId: models[0] + '-column'
            }],
            gridConfig: {
                store: store,
                columnCfgs: [
                    'Name',
                    'Project'
                ],
                bulkEditConfig: {
                    items: [{
                        xtype: 'timeboxbulkdelete'
                    }]
                }
            },
            height: Math.max(gridHeight, 200),
            width: '95%'
        });
    },
    getTimeboxType: function(){
        return this.down('#timeboxType') && this.down('#timeboxType').getValue();
    },
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    }
    
});
