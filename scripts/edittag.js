import { mod } from "./settings.js";
import { TagItPackCache } from "./packcache.js";
import { TagItIndex } from "./index.js";

export class EditTag extends FormApplication {
  original = "";
  data = null;

  /**
   * Default Options for this FormApplication
   *
   * @readonly
   * @static
   * @memberof EditTag
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${mod}-edit-tag-form`,
      title: game.i18n.localize("TagIt.EditTag.title"),
      template: `modules/${mod}/templates/edittag.html`,
      classes: ["sheet"],
      width: 400,
      height: 170,
      closeOnSubmit: true,
      submitOnClose: false,
      resizable: false,
    });
  }

  /**
   * Construct an object of data to be passed to this froms HTML template.
   *
   * @return {object} The data being supplied to the template.
   * @memberof EditTag
   */
  async getData() {
    const data = super.getData();

    const tag = data.object.tag.split(":");

    if (tag.length == 1) {
      this.original = TagItIndex.Index.find((a) =>
        a.tags.some((b) => b.tag == tag[0])
      ).tags.find((a) => a.tag == tag[0]);
    } else if (tag.length == 2) {
      this.original = TagItIndex.Index.find((a) =>
        a.tags.some((b) => b.meta == tag[0] && b.tag == tag[1])
      ).tags.find((a) => a.meta == tag[0] && a.tag == tag[1]);
    }

    if (this.original.color) {
      data.useDefaultColor = false;
      data.color = this.original.color;
    } else {
      data.useDefaultColor = true;
      data.color = game.settings.get(mod, "defaultColor").tag;
    }

    data.sort = this.original.sort ?? game.settings.get(mod, "defaultSort");

    data.displayMeta = this.original.displayMeta ?? true;

    data.owner = game.user.id;
    data.isGM = game.user.isGM;
    data.appId = this.appId;

    this.data = data;

    return data;
  }

  /**
   * After rendering, activate event listeners which provide interactivity for the Application. This is where user-defined Application subclasses should attach their event-handling logic.
   *
   * @memberof EditTag
   * @param {String} html - The rendered HTML of this form.
   */
  activateListeners(html) {
    const _this = this;
    super.activateListeners(html);

    $("button.delete", html).on("click", function () {
      new Dialog({
        title: "Delete Tag",
        content: `<p>Deleting this tag will remove it from all entities.</p><p>Are you sure?</p>`,
        buttons: {
          delete: {
            icon: '<i class="fas fa-trash"></i>',
            label: "Delete",
            callback: async () => {
              await _this.modifyTags(_this.original);
              _this.close();

              if (_this.data.object.onsubmit) {
                _this.data.object.onsubmit();
              }
            },
          },
          cancel: {
            icon: '<i class="fas fa-ban"></i>',
            label: "Cancel",
          },
        },
        default: "cancel",
      }).render(true);
    });

    _this.showHideColorPickers(
      $("input[name=defaultColor]", html).prop("checked"),
      html
    );

    $("input[name=defaultColor]", html).on("change", function (e) {
      _this.showHideColorPickers(this.checked, html);

      _this.updatePreview(html);
    });

    $("input[name=tagColor]", html).on("input", function (e) {
      const color = $(this).val();
      $("div.tag-preview span", html)
        .css("background-color", color)
        .css("border-color", color);
    });

    $("input[name=textColor]", html).on("input", function (e) {
      const color = $(this).val();
      $("div.tag-preview span", html).css("color", color);
    });

    _this.updatePreview(html);
  }

  updatePreview(html) {
    let tag = game.settings.get(mod, "defaultColor").tag.tag;
    let text = game.settings.get(mod, "defaultColor").tag.text;

    if (!$("input[name=defaultColor]", html).prop("checked")) {
      tag = $("input[name=tagColor]", html).val();
      text = $("input[name=textColor]", html).val();
    }

    $("div.tag-preview span", html).css({
      "background-color": tag,
      "border-color": tag,
      color: text,
    });
  }

  showHideColorPickers(hide, html) {
    if (hide) {
      $("input[name=tagColor]", html).hide();
      $("input[name=textColor]", html).hide();
      $("label[for=tagColor]", html).hide();
      $("label[for=textColor]", html).hide();
    } else {
      $("input[name=tagColor]", html).show();
      $("input[name=textColor]", html).show();
      $("label[for=tagColor]", html).show();
      $("label[for=textColor]", html).show();
    }
  }

  /**
   * Modifies tags across the different entity collections.
   *
   * @memberof EditTag
   * @param {String} oldTag - The tag to change.
   * @param {String} newTag - The new tag name.  If null, deletes the tag.
   */
  async modifyTags(oldTag, newTag) {
    const promises = [];

    for (const index of TagItIndex.Index.filter((a) =>
      a.tags.some((b) => b.tag == oldTag.tag && b.meta == oldTag.meta)
    )) {
      promises.push(this.modifyTag(await index.document, oldTag, newTag));
    }

    // for (const entity of game.journal.filter(a => a.data.flags?.tagit?.tags?.some(a => a.tag === oldTag.tag))) {
    //     promises.push(this.modifyTag(entity, oldTag, newTag));
    // }

    // for (const entity of game.scenes.filter(a => a.data.flags?.tagit?.tags?.some(a => a.tag === oldTag.tag))) {
    //     promises.push(this.modifyTag(entity, oldTag, newTag));
    // }

    // for (const entity of game.actors.filter(a => a.data.flags?.tagit?.tags?.some(a => a.tag === oldTag.tag))) {
    //     promises.push(this.modifyTag(entity, oldTag, newTag));
    // }

    // for (const entity of game.items.filter(a => a.data.flags?.tagit?.tags?.some(a => a.tag === oldTag.tag))) {
    //     promises.push(this.modifyTag(entity, oldTag, newTag));
    // }

    for (const entity of canvas.tokens
      .getDocuments()
      .filter((a) =>
        a.data.flags?.tagit?.tags?.some(
          (b) => b.tag === oldTag.tag && b.meta == oldTag.meta
        )
      )) {
      promises.push(this.modifyTag(entity, oldTag, newTag));
    }

    // for (const pack of TagItPackCache.TagIndex) {
    //     for (const index of pack.items.filter(a => a.flags.tagit.tags.some(a => a.tag === oldTag.tag))) {
    //         const entity = await game.packs.get(`${pack.pack}.${pack.name}`).getDocument(index._id);

    //         promises.push(this.modifyTag(entity, oldTag, newTag));
    //     }
    // }

    await Promise.all(promises);
    await TagItPackCache.init();

    ui.notifications.info(
      `Updated ${promises.length} documents with tag ${oldTag.tag}`
    );
    console.log(
      `TagIt: Updated ${promises.length} documents with tag ${oldTag.tag}`
    );
  }

  /**
   * Modifies a tag
   *
   * @memberof EditTag
   * @param {Object} entity - The entity to modify the tags upon.
   * @param {String} oldTag - The tag to change.
   * @param {String} newTag - The new tag name.  If null, deletes the tag.
   */
  modifyTag(entity, oldTag, newTag) {
    let tags = entity.getFlag(mod, "tags");

    if (
      oldTag.sort === newTag?.sort &&
      oldTag.tag === newTag?.tag &&
      oldTag.color?.tag === newTag?.color?.tag &&
      oldTag.color?.text === newTag?.color?.text &&
      oldTag.meta === newTag?.meta &&
      oldTag.displayMeta === newTag?.displayMeta
    ) {
      // No change to tag
      return;
    }

    if (
      newTag &&
      !tags.some(
        (a) =>
          a.sort === newTag.sort &&
          a.tag === newTag.tag &&
          a.meta === newTag.meta &&
          a.color?.tag === newTag.color?.tag &&
          a.color?.text === newTag.color?.text &&
          a.displayMeta === newTag.displayMeta
      )
    ) {
      // New tag is not like an existing tag.
      for (const tag of tags.filter(
        (a) => a.tag === oldTag.tag && a.meta === oldTag.meta
      )) {
        tag.tag = newTag.tag;

        if (newTag.color) {
          tag.color = newTag.color;
        } else if (tag.color) {
          delete tag["color"];
        }

        if (newTag.sort) {
          tag.sort = newTag.sort;
        } else if (tag.sort) {
          delete tag["sort"];
        }

        if (newTag.meta) {
          tag.meta = newTag.meta;
        } else if (tag.meta) {
          delete tag["meta"];
        }

        if (newTag.displayMeta !== undefined) {
          tag.displayMeta = newTag.displayMeta;
        } else if (tag.displayMeta !== undefined) {
          delete tag["displayMeta"];
        }
      }
    } else {
      // Remove old tag
      tags = tags.filter(
        (a) => !(a.tag === oldTag.tag && a.meta === oldTag.meta)
      );
    }

    return entity.setFlag(mod, "tags", tags);
  }

  /**
   * Executes on form submission.
   *
   * @param {Event} event - the form submission event
   * @param {object} data - the form data
   * @memberof EditTag
   */
  async _updateObject(event, data) {
    const _this = this;

    const text = data.tag.split(":");
    const newTag = { tag: data.tag.trim() };

    if (text.length == 2) {
      newTag.meta = text[0].trim();
      newTag.tag = text[1].trim();
    }

    //const newTag = { tag: data.tag };

    if (!data.defaultColor) {
      newTag.color = { tag: data.tagColor, text: data.textColor };
    }

    try {
      const sort = parseInt(data.sort);
      if (!isNaN(sort) && sort != game.settings.get(mod, "defaultSort")) {
        newTag.sort = sort;
      }
    } catch (e) {}

    if (data["display-meta"] === false) {
      newTag.displayMeta = false;
    }

    await this.modifyTags(this.original, newTag);

    if (_this.data.object.onsubmit) {
      _this.data.object.onsubmit();
    }
  }
}
