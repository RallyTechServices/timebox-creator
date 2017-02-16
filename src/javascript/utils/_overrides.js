Ext.override(Rally.ui.gridboard.GridBoard,{
    _applyGridFilters: function(grid, filterObj) {
        //kc - added this to deal with a race condition that wasn't filtering properly.
        if (grid.store.isLoading()){
            this.on('load', function(){ this._applyGridFilters(grid, filterObj); }, this, {single: true});
            return;
        }
        if (!_.isEmpty(filterObj.types) && !_.isEqual(grid.store.parentTypes, filterObj.types)) {
            this.fireEvent('filtertypeschange', filterObj.types);
            grid.store.parentTypes = filterObj.types;
        }
        grid.store.clearFilter(true);
        grid.store.filter(this._getConfiguredFilters(filterObj.filters || [], filterObj.types || []));
    }
});