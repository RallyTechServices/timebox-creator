Ext.define('CA.agile.technicalservices.utils.bulkmenu.TimeboxBulkDelete', {
    alias: 'widget.timeboxbulkdelete',
    extend: 'Rally.ui.menu.bulk.MenuItem',

    config: {
        text: 'Delete',

        handler: function () {
           //delete all records
            Ext.create('Rally.ui.dialog.ConfirmDialog', {
                message: '<div style="text-align:center;">Are you sure you want to delete the selected <b>' + this.records.length + ' timeboxes</b> ?<br/><br/>Any associations will be removed.<br/>THERE IS NO UNDO for deleting objects of this type.</div>',
                title: 'Permanent Delete Warning',
                confirmLabel: 'Delete',
                listeners: {
                    confirm: function(){
                        var bulkUpdateStore = Ext.create('Rally.data.wsapi.batch.Store', {
                            data: this.records
                        });

                        bulkUpdateStore.removeAll();

                        Rally.getApp().setLoading("Deleting...");
                        bulkUpdateStore.sync().then({
                            success: function(batch) {
                                this.onSuccess(this.records, []);
                            },
                            failure: function(batch){
                                this.onSuccess(this.records, batch.exceptions);
                            },
                            scope: this
                        }).always(function(){
                            Rally.getApp().setLoading(false);
                            Rally.getApp()._buildGrid();
                        });
                    },
                    scope: this
                }
            });
        },
        onSuccess: function (successfulRecords, unsuccessfulRecords, args, errorMessage) {

            var message = successfulRecords.length + (successfulRecords.length === 1 ? ' timebox has been deleted' : ' timeboxes have been deleted');

            if(successfulRecords.length === this.records.length) {
                Rally.ui.notify.Notifier.show({
                    message: message + '.'
                });
            } else {
                Rally.ui.notify.Notifier.showWarning({
                    message: message + ', but ' + unsuccessfulRecords.length + ' failed: ' + errorMessage
                });
            }

            Ext.callback(this.onActionComplete, null, [successfulRecords, unsuccessfulRecords]);
        }
    }
});