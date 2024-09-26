import { mod } from "./settings.js";

export class ColorsForm extends FormApplication {
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
      template: `modules/${mod}/templates/defaultColors.html`,
      classes: ["sheet"],
      width: 300,
      height: 175,
      closeOnSubmit: true,
      submitOnClose: true,
      resizable: false,
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

    data.owner = game.user.id;
    data.isGM = game.user.isGM;
    data.appId = this.appId;

    data.color = game.settings.get(mod, "defaultColor");

    return data;
  }

  activateListeners(html) {
    const _this = this;
    super.activateListeners(html);

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

    $("input[name=documentColor]", html).on("input", function (e) {
      _this.updatePreview(html);
    });

    $("input[name=documentTextColor]", html).on("input", function (e) {
      _this.updatePreview(html);
    });

    $("button[name=reset]").on("click", function (e) {
      $("input[name=tagColor]", html).val("#8c0000");
      $("input[name=textColor]", html).val("#ffffff");

      $("input[name=documentColor]", html).val("#ffff00");
      $("input[name=documentTextColor]", html).val("#000000");

      _this.updatePreview(html);
    });

    _this.updatePreview(html);
  }

  updatePreview(html) {
    const tag = $("input[name=tagColor]", html).val();
    const text = $("input[name=textColor]", html).val();

    const docTag = $("input[name=documentColor]", html).val();
    const docText = $("input[name=documentTextColor]", html).val();

    $("div.tag-preview span", html).css({
      "background-color": tag,
      "border-color": tag,
      color: text,
    });

    $("div.document-preview span", html).css({
      "background-color": docTag,
      "border-color": docTag,
      color: docText,
    });
  }

  /**
   * Executes on form submission.
   *
   * @param {Event} event - the form submission event
   * @param {object} data - the form data
   * @memberof SettingsForm
   */
  async _updateObject(data) {
    const color = {
      tag: {
        tag: data.tagColor,
        text: data.textColor,
      },
      document: {
        tag: data.documentColor,
        text: data.documentTextColor,
      },
    };

    game.settings.set(mod, "defaultColor", color);
  }
}
