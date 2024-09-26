import { mod } from "./settings.js";
import { TagItTagManager } from "./tagmanager.js";

export class RemoveForm extends FormApplication {
  constructor(object, options) {
    super(object, options);
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.template = `modules/${mod}/templates/remove.html`;
    options.width = "320";
    options.height = "157";
    options.title = game.i18n.localize("TagIt.Remove.title");
    options.resizable = false;
    options.editable = true;
    options.closeOnSubmit = true;
    options.submitOnClose = false;

    return options;
  }

  async getData() {
    const data = super.getData();

    return data;
  }

  activateListeners(html) {
    const _this = this;

    $("button[name=cancel]").focus();
  }

  async _updateObject(event, formData) {
    if ($(event.submitter).attr("name") === "delete") {
      // Remove it all!

      await TagItTagManager.removeAll();
    }
    return;
  }

  static getResults(tags, entities = []) {}
}
