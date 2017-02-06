/**
 * A tabbed infomation panel - requires Bootstrap (3.x)
 *
 * Example usage:
 * <div id="mydiv"/>
 *
 * var panel = $('#mydiv').bpt_infopanel();
 * panel.addTab('A tab', '1', true);
 *
 * panel.addEntry(1, { 'data': 'value'});
 */
!function($){
  "use strict";

  if(!$.bpt){
    $.bpt = new Object();
  }

  $.bpt.InfoPanel = function(el, opts){
    var base = this;

    base.$el = $(el);
    base.el = el;

    // tab id => { name: 'Tab name', tabId: 'tab-group-id' }
    base._tabMapping = {};
    base._nextId = 0;
    base._prevTabId = null;

    base.$el.data('bpt.infopanel', base); // reverse reference on DOM el

    base._init = function(){
      console.log('init called');
      base.opts = $.extend({}, $.bpt.InfoPanel.defaultOptions, opts);

      base.$el.addClass('bpt-info-panel');
      base.$el.append(base.opts.baseTemplate.call(this));
      base.$tabGroup = base.$el.find('.bpt-tab-group').first();
      base.$itemGroup = base.$el.find('.bpt-list-group').first();

      base.addTab(base.opts.allTabTitle, '', true); // base tab

      if(!base.opts.showTabs){
        base.$tabGroup.addClass('hidden');
      }

      if(!base.opts.showHeader){
        base.$el.find('.panel-heading').addClass('hidden');
      }
    }

    // newCount is optional
    base.updateCountLabel = function(tabId, newCount){
      if(!this._tabMapping[tabId]){
        console.warn('tab with id ' + tabId + ' does not exist');
        return;
      }

      if(typeof newCount === 'undefined'){
        newCount = this._tabMapping[tabId].count + 1;
      }
      this._tabMapping[tabId].count = newCount;

      var id = this._tabMapping[tabId].id;
      var $span = this.$tabGroup.find('li[data-tab-group="'+id+'"] span.badge');
      $span.text(newCount);
    }

    // tabId is optional
    base.addEntry = function(data, tabId){
      //console.log('add entry called', this);

      var name = '';
      var id = ''; // TODO: is this right?

      if(this._tabMapping[tabId]){
        name = this._tabMapping[tabId].name;
        id = this._tabMapping[tabId].id;
      }

      var $tmpl = $(this.opts.entryTemplate(this, tabId, data));
      $tmpl.attr('data-tab-group', id);

      this.$itemGroup.prepend($tmpl);
      if(tabId){
        this.updateCountLabel(tabId);
      }

      this.updateCountLabel(''); // for the all tab
    }

    base.getTabName = function(tabId){
      return this._tabMapping[tabId].name;
    }

    /*
      Structure:
      <li role="presentation" class="active">
        <a href="#"> [Name] <span class="badge">42</span></a>
      </li>
     */
    // (id '' is reserved for to the all tab)
    base.addTab = function(name, tabId, selected){
      console.log('addDevice called', selected, arguments);

      if(typeof name === 'undefined' || typeof tabId === 'undefined'){
        throw '[infopanel] name and id argument is required';
      }

      if(this._tabMapping[id]){
        throw "[infopanel] tab with id " + id + " already exists";
      }

      var id = this._nextId++;
      this._tabMapping[tabId] = { name: name, id: id, count: 0 };

      var a = $('<a>', { href: '#' }).text(name);
      if(this.opts.showCountLabel){
        a.append($('<span>').addClass('badge').text(0));
      }

      a.on('click', null, tabId, function(event){
        event.preventDefault();
        this.selectTab(event.data, true);
      }.bind(this));

      var li = $('<li>', { role: 'presentation', 'data-tab-group': id });

      this.$tabGroup.append(li.append(a));
      if(selected){
        this.selectTab(tabId);
      }

    }

    base.selectTab = function(tabId, clearCount){
      if(!this._tabMapping[tabId]){
        console.warn('tab with id ' + tabId + ' does not exist');
        return;
      }

      var id = this._tabMapping[tabId].id;
      var $newTab = this.$tabGroup.find('li[data-tab-group="'+id+'"]');

      if($newTab.hasClass('active')){
        this.updateCountLabel(tabId, 0);
        return;
      }

      this.$tabGroup.find('li').removeClass('active');
      $newTab.addClass('active');

      if(clearCount && this.opts.showCountLabel){
        this.updateCountLabel(tabId, 0);
      }

      if(!tabId || tabId === ''){ // index tab
        this.$itemGroup.children().removeClass('hidden');
      }else{
        this.$itemGroup.children().addClass('hidden');
      }

      this.$itemGroup.children("[data-tab-group='" + id +"']")
        .removeClass('hidden');
    }

    base._init(); // run init
  };

  $.bpt.InfoPanel.defaultOptions = {

    showTabs: true,

    showHeader: true,

    allTabTitle: 'All',

    /**
     * @{cfg} height
     *
     * The height of the panel
     */
    //height: '200px', // NYI

    showCountLabel: true, // NYI

    panelCls: 'panel-primary', // NYI

    /**
     * the title of the panels
     * @type {String}
     */
    title: 'Info',

    // must contain bpt-tab-group and bpt-list-group class containers
    baseTemplate: function(){
      return '' +
        '<div class="panel panel-primary bpt-info-panel">' +
          '<div class="panel-heading">' + this.opts.title +
            ' <a class="pull-right" href="#"><span style="color:white;" ' +
              ' class="glyphicon glyphicon glyphicon-erase" aria-hidden="true"> ' +
              '</span></a>' +
          '</div>' +
          '<div class="panel-body">' +
            '<ul class="nav nav-pills bpt-tab-group">' +
              // tab content
            '</ul>' +
            '<div style="height:100%; overflow:auto;">' +
              '<div class="list-group bpt-list-group">' +
                // data content
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    },
    // data: coreid....
    entryTemplate: function(panel, tabId, data){
      var time = data.published_at.html;
      var name = data.name.html;
      var data = data.data.html;

      return '' +
        '<a href="#" class="list-group-item">' +
          '<span class="label label-default">' + panel.getTabName(tabId) + '</span>' +
          '<span class="pull-right" style="font-size:85%; color: #d8d8d8;">' +
            time + '</span>' +
          '<div class="list-group-item-heading">' +
            '<p class="list-group-item-text">' + name + ' - ' + data + '</p>' +
          '</div>' +
        '</a>';
    }
  };


  $.fn.bpt_infopanel = function(options){
    return new $.bpt.InfoPanel(this, options);
  }

  // NB: this breaks the chain but returns the EventsPanel
  // if it has been attached to the object
  $.fn.get_bpt_infopanel = function(){
    return this.data('bpt.infopanel');
  };
}(jQuery);
































/*
return this.each(function(){
  (new $.bpt.EventPanel(this, options));
});
*/


/**
 * Events widget
 * @param {Object} config Configuration object
 *                        ...
 *
 */
/*
bpt.widget.Events = function(config){
  var my = this;

  if(!config){
    config = {};
  }

  var el = $('#' + config.id);


  my.init = function(){
    console.log('init called');


  };


  my.init();


  return {
    el: this.el




  };
};
*/
