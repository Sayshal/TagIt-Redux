import { mod } from "./settings.js";
import { TagItTagManager } from "./tagmanager.js";
import { EditTag } from "./edittag.js";

export class SettingsForm extends FormApplication {
  tags = [];

  /**
   * Default Options for this FormApplication
   *
   * @readonly
   * @static
   * @memberof SettingsForm
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${mod}-settings-form`,
      title: game.i18n.localize("TagIt.SettingTitle"),
      template: `modules/${mod}/templates/settings.html`,
      classes: ["sheet"],
      width: 500,
      height: 500,
      closeOnSubmit: true,
      submitOnClose: false,
      resizable: true,
    });
  }

  /**
   * Construct an object of data to be passed to this froms HTML template.
   *
   * @return {object} The data being supplied to the template.
   * @memberof SettingsForm
   */
  async getData() {
    const data = super.getData();

    //this.tags = await TagItTagManager.getUsedTags2();

    //data.tags = this.tags;
    data.owner = game.user.id;
    data.isGM = game.user.isGM;
    data.appId = this.appId;

    return data;
  }

  /**
   * Load the tag into the form.
   *
   * @readonly
   * @static
   * @memberof SettingsForm
   */
  async loadTags() {
    const _this = this;
    //_this.tags = await TagItTagManager.getUsedTags();

    _this.tags = TagItTagManager.getUsedTagsWithMeta();

    const text = $(`#taginput${_this.appId}`, _this.element)
      .val()
      .toLowerCase()
      .trim();

    let tags = _this.tags;

    if (text.length > 0) {
      // Has filter in place
      tags = tags.filter((a) => a.tag.toLowerCase().includes(text));
    }

    _this.loadContainer(tags);
  }

  loadContainer(tags) {
    const _this = this;
    const container = $("div.tag.collection", _this.element).empty();

    for (const tag of tags) {
      const text = tag.meta ? `${tag.meta}:${tag.tag}` : `${tag.tag}`;
      const span = $("<span>")
        .addClass("tagit")
        .addClass("tag")
        .css("margin", "0.2em")
        .append(
          $("<a>")
            .css("cursor", "pointer")
            .text(text)
            .on("click", function () {
              const data = {
                tag: $(this).text(),
                onsubmit: function () {
                  _this.loadTags();
                },
              };
              const editApp = new EditTag(data).render(true);
            })
        );

      const color = tag.color ?? game.settings.get(mod, "defaultColor").tag;

      $(span).css({
        "background-color": color.tag,
        "border-color": color.tag,
        color: color.text,
      });

      container.append(span);
    }
  }

  activateListeners(html) {
    const _this = this;
    super.activateListeners(html);

    $("div.tag.collection", html).css("flex", "auto");

    _this.loadTags();

    $(`#taginput${_this.appId}`, html)
      .on("keyup", function (event) {
        let text = $(this).val().toLowerCase().trim();

        let tags = _this.tags;

        if (text.length > 0) {
          text = text.split(":");
          if (text.length == 1) {
            tags = tags.filter(
              (a) =>
                a.tag.toLowerCase().includes(text[0]) ||
                a.meta?.toLowerCase().includes(text[0])
            );
          } else if (text.length == 2) {
            tags = tags.filter(
              (a) =>
                a.tag.toLowerCase().includes(text[1]) &&
                a.meta?.toLowerCase().includes(text[0])
            );
          }
        }

        _this.loadContainer(tags);
      })
      .on("keypress", function (event) {
        if (event.keyCode === 13) {
          event.preventDefault();
        }
      })
      .focus();
  }

  /**
   * Executes on form submission.
   *
   * @param {Event} event - the form submission event
   * @param {object} data - the form data
   * @memberof SettingsForm
   */
  async _updateObject(event, data) {}
}
