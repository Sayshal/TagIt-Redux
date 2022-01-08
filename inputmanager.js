export class TagItInputManager {
    /**
     * Adds a tag to the current FormApplication
     *
     * @param {String} tag - The tag to be added
     * @param {Object.<string, Object>} [options={updateAutocomplete=true}] - Options
     */
     static addtag(tag, form, options) {
        const defaults = {
            updateAutocomplete: true,
            onUpdate: null
        };
        options = $.extend({}, defaults, options || {});

        if (!tag) {
            tag = $('#taginput' + form.appId, form.element).val();
        }
    
        tag = $.trim(tag);
    
        if (tag) {
            var items = $('.tagit.item', form.element).filter(function() {
                return $(this).text().toLocaleLowerCase() === tag.toLocaleLowerCase();
            });
    
            // Check if tag already in list.
            if (items.length == 0) {
                
                const ele = $('<div>')
                .addClass('tagit')
                .addClass('item')
                .text(tag)
                .append(
                    $('<i>')
                    .addClass('fas')
                    .addClass('fa-times-circle')
                    .on('click', function(e) {
                        $(this).parent().remove();
                        TagItInputManager.calculateAutocompleteList(form);
                        if (options.onUpdate) {
                            options.onUpdate();
                        }
                    })
                );
                
    
                $('.tagit.collection', form.element).append(ele);
    
                $('#taginput' + form.appId, form.element).val('');

                if (options.updateAutocomplete) {
                    TagItInputManager.calculateAutocompleteList(form);
                }
            }

            if (options.onUpdate) {
                options.onUpdate();
            }
        }
    }

    /**
     * Updates the autocomplete to only include unused tags.
     * 
     */
    static calculateAutocompleteList(form) {
        const items = $('.tagit.item', form.element).map(function() {
            return $(this).text();
        }).get();
    
        const autoList = $.grep(form.tagcache, function(item) {
            return items.indexOf(item) < 0;
        }).sort();
    
        const dataList = $('datalist#tagcache' + form.appId, form.element);
        dataList.empty();
    
        $.each(autoList, function (index, value) {
            let option = $('<option>').val(value);
            dataList.append(option);
        });
    }
}